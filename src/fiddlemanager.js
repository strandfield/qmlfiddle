

class FiddleManager
{
    constructor(db) {
        this.database = db;

        this.projects = {};
    }

    getDatabase() {
        return this.database;
    }

    getFiddleById(fiddleId) {
        if (typeof fiddleId == 'string') {
            fiddleId = Number.parseInt(fiddleId, 16);
        }

        let stmt = this.database.prepare(`SELECT id, title, content FROM fiddle WHERE id = ?`);
        return stmt.get(fiddleId);
    }

};

module.exports = FiddleManager;
