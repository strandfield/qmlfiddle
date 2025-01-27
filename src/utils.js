
function parseMaxFiddleSize(value) {
    if (typeof value == 'number') {
        return value;
    }

    if (value.endsWith('kb')) {
        return parseInt(value.substring(0, value.length - 2)) * 1024;
    } else if (value.endsWith('b')) {
        return parseInt(value.substring(0, value.length - 1));
    } else {
        const r = parseInt(value);
        console.assert(r != NaN, "invalid value for conf 'fiddle size' field");
        return r;
    }
}

function getUserMaxFiddleSize(user, conf) {
    if (user) {
        if (user.emailVerified) {
            return conf.fiddles.maxFiddleSizeVerified;
        } else {
            return conf.fiddles.maxFiddleSizeUnverified;
        }
    }

    return conf.fiddles.maxFiddleSizeUnregistered;
}

function mapFiddleIds(list) {
    for (let e of list) {
        e.id = e.id.toString(16);
    }
}

function isSuperUser(user) {
    return user != null && user.superUser;
}

module.exports = { 
    parseMaxFiddleSize,
    getUserMaxFiddleSize,
    mapFiddleIds,
    isSuperUser
};
