
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
    getUserMaxFiddleSize,
    mapFiddleIds,
    isSuperUser
};
