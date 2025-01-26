
class FiddleManager
{
    constructor(db) {
        this.database = db;

        this.projects = {};

        this.maxFiddleId = 10000000;
        this.userMinFiddleId = 4096;
        this.editKeySalt = Math.random().toString();
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
        const maxid = this.maxFiddleId;
        return 1 + Math.trunc(Math.random() * maxid);
    }

    getCurrentTimestamp() {
        return Math.floor(Date.now() / 1000);
    }

    createFiddle(title, content) {
        let id = this.#generateFiddleId();
        while (id < this.userMinFiddleId || this.getFiddleById(id) != undefined) {
            id = this.#generateFiddleId();
        }

        const ts = this.getCurrentTimestamp();
        let stmt = this.database.prepare(`INSERT INTO fiddle(id, title, content, dateCreated) VALUES(?,?,?,?)`);
        const info = stmt.run(id, title, content, ts);
        return {
            id: info.lastInsertRowid,
            title: title,
            content: content,
            dateCreated: ts
        };
    }

    #computeEditKey(fiddleObject) {
        console.assert(typeof fiddleObject == 'object' && fiddleObject != null);
        const crypto = require('crypto')
        let shasum = crypto.createHash('sha1');
        shasum.update(fiddleObject.id.toString());
        shasum.update(fiddleObject.title);
        if (fiddleObject.dateModified) {
            shasum.update(fiddleObject.dateModified.toString());
        } else {
            shasum.update(fiddleObject.dateCreated.toString());
        }
        shasum.update(fiddleObject.title);
        shasum.update(this.editKeySalt);
        const sha1 = shasum.digest('hex');
        return sha1;
    }

    getFiddleEditKey(fiddleIdOrObject) {
        if (typeof fiddleIdOrObject == 'object') {
            return this.#computeEditKey(fiddleIdOrObject);
        } else {
            const fiddle = this.getFiddleByIdEx(fiddleIdOrObject, ["id", "title", "dateCreated", "dateModified"]);
            if (fiddle == undefined) {
                return undefined;
            }
            return this.getFiddleEditKey(fiddle);
        }
    }
    
    updateFiddle(id, title, content) {
        id = this.#unwrap(id);
        const timestamp = this.getCurrentTimestamp();
        let stmt = this.database.prepare(`UPDATE fiddle SET title = ?, content = ?, dateModified = ? WHERE id = ?`);
        const info = stmt.run(title, content, timestamp, id);

        if (info.changes != 1) {
            return null;
        }

        return {
            id: id,
            title: title,
            content: content,
            dateModified: timestamp
        };
    }

    insertOrUpdateFiddle(id, title, content) {
        id = this.#unwrap(id);
        let stmt = this.database.prepare(`INSERT OR IGNORE INTO fiddle(id, title, content, dateCreated) VALUES(?,?,?,?)`);
        let info = stmt.run(id, title, content, this.getCurrentTimestamp());

        if (!info.lastInsertRowid) {
            this.updateFiddle(id, title, content);
        }
    }

    deleteFiddle(id) {
        id = this.#unwrap(id);
        let stmt = this.database.prepare(`DELETE FROM fiddle WHERE id = ?`);
        stmt.run(id);
    }

    setFiddleAuthorId(id, authorId) {
        let stmt = this.database.prepare(`UPDATE fiddle SET authorId = ? WHERE id = ?`);
        const info = stmt.run(authorId, id);
        return info.changes == 1;
    }

    getFiddlesByAuthorId(authorId) {
        let stmt = this.database.prepare(`SELECT id, title, dateCreated FROM fiddle WHERE authorId = ? ORDER BY dateCreated DESC`);
        return stmt.all(authorId);
    }

    loadFiddlesFromDirectory(dirPath, userId = null) {
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

            if (userId) {
                this.setFiddleAuthorId(id, userId);
            }
        }
    }
};

module.exports = FiddleManager;
