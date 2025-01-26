
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

module.exports = { 
    getUserMaxFiddleSize
};
