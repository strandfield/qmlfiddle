
const Database = require('better-sqlite3');

function checkTableExists(db, tableName) {
    let stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?");
    return stmt.get(tableName) != undefined;
}

function createUserTable(db) {
	db.exec(`CREATE TABLE IF NOT EXISTS "user" ( 
    	"id"              INTEGER NOT NULL PRIMARY KEY UNIQUE, 
		"username"        TEXT NOT NULL UNIQUE, 
    	"email"           TEXT UNIQUE, 
		"emailVerified"   INTEGER NOT NULL DEFAULT 0, 
    	"hashedPassword"  BLOB, 
    	"salt"            BLOB,
		"superUser"       INTEGER NOT NULL DEFAULT 0
    )`);
}

function initDatabase(db) {
	createUserTable(db);

	db.exec(`CREATE TABLE "fiddle" (
		"id"                    INTEGER NOT NULL PRIMARY KEY UNIQUE,
		"title"                 TEXT NOT NULL,
		"content"               TEXT NOT NULL,
		"authorId"              INTEGER,
		"dateCreated"           INTEGER NOT NULL,
		"dateModified"          INTEGER,
		FOREIGN KEY(authorId) REFERENCES user(id)
	)`);
}

function updateSchema1(db) {
	createUserTable(db);

	db.exec(`ALTER TABLE "fiddle" DROP COLUMN "pepper"`);

	db.exec(`ALTER TABLE "fiddle" ADD COLUMN
		"authorId" INTEGER DEFAULT NULL
		REFERENCES user(id)
	`);

	const now = Math.floor(Date.now() / 1000);

	db.exec(`ALTER TABLE "fiddle" ADD COLUMN
		"dateCreated" INTEGER NOT NULL DEFAULT ${now}
	`);

	db.exec(`ALTER TABLE "fiddle" ADD COLUMN
		"dateModified" INTEGER
	`);
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
	} else if (!checkTableExists(db, "user")) {
		updateSchema1(db);
	}

	return db;
}

module.exports = { 
    getOrCreateFiddleDatabase
};
