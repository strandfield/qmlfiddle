

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

    #generateFiddleId() {
        const maxid = 10000000;
        return Math.trunc(Math.random() * maxid);
    }

    createFiddle(title, content) {
        let id = this.#generateFiddleId();
        while (this.getFiddleById(id) != undefined) {
            id = this.#generateFiddleId();
        }

        let stmt = this.database.prepare(`INSERT INTO fiddle(id, title, content) VALUES(?,?,?)`);
        const info = stmt.run(id, title, content);
        return info.lastInsertRowid;
    }

    updateFiddle(id, title, content) {
        id = this.#unwrap(id);
        let stmt = this.database.prepare(`UPDATE fiddle SET title = ?, content = ? WHERE id = ?`);
        const info = stmt.run(title, content, id);
        return info.changes == 1;
    }
};

module.exports = FiddleManager;
