
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

    createSuperUser(email, password) {
        const salt = crypto.randomBytes(saltLength);
        const hashed_password = crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, pbkdf2Keylen, pbkdf2Algorithm);
        let stmt = this.database.prepare(`INSERT INTO user(email, hashedPassword, salt, superUser) VALUES(?,?,?,1)`);
        const info = stmt.run(email, hashed_password, salt);
    }

    getUser(email) {
        let stmt = this.database.prepare(`SELECT id, email, superUser, maxFiddleSize, maxFiddles FROM user WHERE email = ?`);
        return stmt.get(email);
    }

    hasUser(email) {
        return this.getUser(email) != undefined;
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

    updateUserRights(userId, name, value) {
        let stmt = this.database.prepare(`UPDATE user SET ${name} = ? WHERE id = ?`);
        const info = stmt.run(value, userId);
        return info.changes == 1;
    }

    updateUserMaxFiddleSize(userId, value) {
        return this.updateUserRights(userId, "maxFiddleSize", value);
    }

    updateUserMaxFiddles(userId, value) {
        return this.updateUserRights(userId, "maxFiddles", value);
    }
};

module.exports = UserManager;
