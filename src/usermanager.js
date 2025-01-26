
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

    createUser(username, email, password) {
        const salt = crypto.randomBytes(saltLength);
        const hashed_password = crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, pbkdf2Keylen, pbkdf2Algorithm);
        let stmt = this.database.prepare(`INSERT INTO user(username, email, hashedPassword, salt) VALUES(?,?,?,?)`);
        const info = stmt.run(username, email, hashed_password, salt);
        if (!info.lastInsertRowid) {
            return undefined;
        } else {
            return this.getUserById(info.lastInsertRowid);
        }
    }

    createSuperUser(username, email, password) {
        const salt = crypto.randomBytes(saltLength);
        const hashed_password = crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, pbkdf2Keylen, pbkdf2Algorithm);
        let stmt = this.database.prepare(`INSERT INTO user(username, email, hashedPassword, salt, superUser) VALUES(?,?,?,?,1)`);
        const info = stmt.run(username, email, hashed_password, salt);
        return info.lastInsertRowid;
    }

    createFakeUser(username) {
        const email = username + "@qmlfiddle.net";
        let stmt = this.database.prepare(`INSERT INTO user(username, email) VALUES(?,?)`);
        const info = stmt.run(username, email);
        return info.lastInsertRowid;
    }

    getUserByUsername(username) {
        let stmt = this.database.prepare(`SELECT id, username, email, emailVerified, superUser FROM user WHERE username = ?`);
        return stmt.get(username);
    }

    getUserByEmail(email) {
        let stmt = this.database.prepare(`SELECT id, username, email, emailVerified, superUser FROM user WHERE email = ?`);
        return stmt.get(email);
    }

    getUserByUsernameOrEmail(usernameOrEmail) {
        let stmt = this.database.prepare(`SELECT id, username, email, emailVerified, superUser FROM user WHERE username = ? OR email = ?`);
        return stmt.get(usernameOrEmail, usernameOrEmail);
    }

    getUserById(userId) {
        let stmt = this.database.prepare(`SELECT id, username, email, emailVerified, superUser FROM user WHERE id = ?`);
        return stmt.get(userId);
    }

    hasUser(emailOrUsername) {
        if (emailOrUsername.includes("@")) {
            return this.getUserByEmail(emailOrUsername) != undefined;
        } else {
            return this.getUserByUsername(emailOrUsername) != undefined;
        }
    }

    authenticate(emailOrUsername, password) {
        const column = emailOrUsername.includes("@") ? "email" : "username";
        let stmt = this.database.prepare(`SELECT hashedPassword, salt FROM user WHERE ${column} = ?`);
        const row = stmt.get(emailOrUsername);
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

    deleteUser(userId) {
        let stmt = this.database.prepare(`DELETE FROM fiddle WHERE authorId = ?`);
        stmt.run(userId);
        stmt = this.database.prepare(`DELETE FROM user WHERE id = ?`);
        stmt.run(userId);
    }
};

module.exports = UserManager;
