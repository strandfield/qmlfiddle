
const crypto = require('crypto');

const saltLength = 16;
const pbkdf2Algorithm = 'sha256';
const pbkdf2Keylen = 32;
const pbkdf2DefaultIterations = 310000;

class UserManager
{
    constructor(db) {
        this.database = db;
        this.pbkdf2Iterations = pbkdf2DefaultIterations;
    }

    getDatabase() {
        return this.database;
    }

    createUser(email, password) {
        const salt = crypto.randomBytes(saltLength);
        const hashed_password = crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, pbkdf2Keylen, pbkdf2Algorithm);
        let stmt = this.database.prepare(`INSERT INTO user(email, hashedPassword, salt) VALUES(?,?,?)`);
        const info = stmt.run(email, hashed_password, salt);
    }

    hasUser(email) {
        let stmt = this.database.prepare(`SELECT * FROM user WHERE email = ?`);
        const row = stmt.get(email);
        return row != undefined;
    }

    authenticate(email, password) {
        let stmt = this.database.prepare(`SELECT email, hashedPassword, salt FROM user WHERE email = ?`);
        const row = stmt.get(email);
        if (row == undefined) {
            return false;
        }
        const hashed_password = crypto.pbkdf2Sync(password, row.salt, this.pbkdf2Iterations, pbkdf2Keylen, pbkdf2Algorithm);
        return crypto.timingSafeEqual(row.hashedPassword, hashed_password);
    }

    updateUserEmail(currentEmail, newEmail) {
        let stmt = this.database.prepare(`UPDATE user SET email = ? WHERE email = ?`);
        const info = stmt.run(newEmail, currentEmail);
        return info.changes == 1;
    }

    updateUserPassword(email, newPassword) {
        const salt = crypto.randomBytes(saltLength);
        const hashed_password = crypto.pbkdf2Sync(newPassword, salt, this.pbkdf2Iterations, pbkdf2Keylen, pbkdf2Algorithm);
        let stmt = this.database.prepare(`UPDATE user SET hashedPassword = ?, salt = ? WHERE email = ?`);
        const info = stmt.run(hashed_password, salt, email);
        return info.changes == 1;
    }
};

module.exports = UserManager;
