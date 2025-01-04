
const Database = require('better-sqlite3');

function checkTableExists(db, tableName) {
    let stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?");
    return stmt.get(tableName) != undefined;
}

function initDatabase(db) {
    // TODO: add dateCreated, dateModified, pepper
	db.exec(`CREATE TABLE "fiddle" (
		"id"                    INTEGER NOT NULL PRIMARY KEY UNIQUE,
		"title"                 TEXT NOT NULL,
		"content"               TEXT NOT NULL,
		"pepper"                INTEGER NOT NULL DEFAULT 3
	)`);
}

function getOrCreateFiddleDatabase(dataDir) {
	let options = {
        readonly: false,
        fileMustExist: false
      };   

	const filepath = dataDir + "/fiddles.db";
    let db = new Database(filepath, options);

	if (!checkTableExists(db, "fiddle")) {
		initDatabase(db);
	}

	return db;
}

module.exports = { 
    getOrCreateFiddleDatabase
};
