

class FiddleManager
{
    constructor(db) {
        this.database = db;

        this.projects = {};
    }

    getDatabase() {
        return this.database;
    }

    #unwrap(fiddleId) {
        if (typeof fiddleId == 'string') {
            return Number.parseInt(fiddleId, 16);
        } else {
            return fiddleId;
        }
    }

    getFiddleById(fiddleId) {
        fiddleId = this.#unwrap(fiddleId);
        let stmt = this.database.prepare(`SELECT id, title, content FROM fiddle WHERE id = ?`);
        return stmt.get(fiddleId);
    }

    getFiddleByIdEx(fiddleId, fields) {
        fiddleId = this.#unwrap(fiddleId);
        let stmt = this.database.prepare(`SELECT ${fields.join(",")} FROM fiddle WHERE id = ?`);
        return stmt.get(fiddleId);
    }

    getAllFiddles(fields = ['id', 'title']) {
        let stmt = this.database.prepare(`SELECT ${fields.join(",")} FROM fiddle`);
        return stmt.all();
    }

    #generateFiddleId() {
        // note: we may increase the maxid as we go along
        const maxid = 10000000; // TODO: put that value into conf
        return 1 + Math.trunc(Math.random() * maxid);
    }

    #generatePepper() {
        const maxvalue = 2000000000;
        return 1 + Math.trunc(Math.random() * maxvalue);
    }

    createFiddle(title, content) {
        let id = this.#generateFiddleId();
        while (id < 4096 || this.getFiddleById(id) != undefined) {
            id = this.#generateFiddleId();
        }

        const pepper = this.#generatePepper();
        let stmt = this.database.prepare(`INSERT INTO fiddle(id, title, content, pepper) VALUES(?,?,?,?)`);
        const info = stmt.run(id, title, content, pepper);
        return {
            id: info.lastInsertRowid,
            pepper: pepper,
            title: title,
            content: content
        };
    }

    #computeEditKey(fiddleObject) {
        console.assert(typeof fiddleObject == 'object' && fiddleObject != null);
        const crypto = require('crypto')
        let shasum = crypto.createHash('sha1');
        shasum.update(fiddleObject.title);
        shasum.update(fiddleObject.content);
        // TODO: add salt? (note: does not need to be shared with wasm)
        shasum.update(fiddleObject.pepper.toString());
        const sha1 = shasum.digest('hex');
        return sha1;
    }

    getFiddleEditKey(fiddleIdOrObject) {
        if (typeof fiddleIdOrObject == 'object') {
            let fiddle = fiddleIdOrObject;
            if (fiddle.pepper == undefined) {
                fiddle = this.getFiddleByIdEx(fiddle.id, ["title", "content", "pepper"]);
                console.assert(fiddle != undefined);
            }
            return this.#computeEditKey(fiddle);
        } else {
            const fiddle = this.getFiddleByIdEx(fiddleIdOrObject, ["title", "content", "pepper"]);
            if (fiddle == undefined) {
                return undefined;
            }
            return this.getFiddleEditKey(fiddle);
        }
    }

    updateFiddle(id, title, content) {
        id = this.#unwrap(id);
        const pepper = this.#generatePepper();
        let stmt = this.database.prepare(`UPDATE fiddle SET title = ?, content = ?, pepper = ? WHERE id = ?`);
        const info = stmt.run(title, content, pepper, id);

        if (info.changes != 1) {
            return null;
        }

        return {
            id: id,
            title: title,
            content: content,
            pepper: pepper
        };
    }

    insertOrUpdateFiddle(id, title, content) {
        id = this.#unwrap(id);
        const pepper = this.#generatePepper();
        let stmt = this.database.prepare(`INSERT OR REPLACE INTO fiddle(id, title, content, pepper) VALUES(?,?,?,?)`);
        stmt.run(id, title, content, pepper);
    }

    loadFiddlesFromDirectory(dirPath) {
        const path = require('path');
        const fs = require('node:fs');

        const entries = fs.readdirSync(dirPath);

        for (const fileName of entries) {
            if (!fileName.endsWith(".qml") || fileName == "default.qml") {
                continue;
            }

            const name_wo_ext = path.basename(fileName, ".qml");
            const id = Number.parseInt(name_wo_ext, 16);

            if (id === NaN) {
                console.error(`could not parse fiddle id ${name_wo_ext}`);
                continue;
            }

            const filepath = path.join(dirPath, fileName);
            let content = fs.readFileSync(filepath, 'utf-8');
            let title = "";
            if (content.startsWith("//")) {
                let i = content.indexOf("\n");
                title = content.substring(2, i).trim();
                content = content.substring(i+1);
            }

            this.insertOrUpdateFiddle(id, title, content);
        }
    }
};

module.exports = FiddleManager;
