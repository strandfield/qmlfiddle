var express = require('express');

const { isSuperUser, parseMaxFiddleSize } = require("../src/utils");

var router = express.Router();

function GetAdminPage(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  res.render('admin', { 
    title: 'Administration - QML Fiddle',
    user: req.user
  });
}

// TODO: merge with DeleteFiddle() from index.js ?
function DeleteFiddle(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  let fiddles = req.app.locals.fiddleManager;
  fiddles.deleteFiddle(req.body.fiddleId);

  res.redirect("/admin");
}

function DeleteUser(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  let users = req.app.locals.userManager;
  let user = users.getUserByUsernameOrEmail(req.body.username);
  if (user == undefined || user.id == req.user.id) {
    return res.redirect("/admin?status=failure");
  }
  users.deleteUser(user.id);

  res.redirect("/admin");
}

function EnableSignups(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  req.app.locals.conf.features.signup = true;

  res.redirect("/admin");
}

function DisableSignups(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  req.app.locals.conf.features.signup = false;

  res.redirect("/admin");
}

function UpdateFiddleSizeLimits(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  if (req.body.unregistered) {
    req.app.locals.conf.fiddles.maxFiddleSizeUnregistered = parseMaxFiddleSize(req.body.unregistered);
  }

  if (req.body.unverified) {
    req.app.locals.conf.fiddles.maxFiddleSizeUnverified = parseMaxFiddleSize(req.body.unverified);
  }

  if (req.body.verified) {
    req.app.locals.conf.fiddles.maxFiddleSizeVerified = parseMaxFiddleSize(req.body.verified);
  }

  res.redirect("/admin");
}

function GetAllUsersPage(req, res, next) {
  if (!isSuperUser(req.user)) {
    return res.redirect("/");
  }

  const users = req.app.locals.userManager;
  const allusers = users.getAllUsers();

  res.render('allusers', { 
    title: 'All users - QML Fiddle',
    user: req.user,
    allusers: allusers
  });
}

router.get('/admin', GetAdminPage);
router.get("/allusers", GetAllUsersPage);
router.post('/admin/delete/fiddle', DeleteFiddle);
router.post('/admin/delete/user', DeleteUser);
router.post('/admin/enable/signup', EnableSignups);
router.post('/admin/disable/signup', DisableSignups);
router.post("/admin/update/limits/fiddle", UpdateFiddleSizeLimits);

module.exports = router;
