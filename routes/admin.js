var express = require('express');

const { isSuperUser } = require("../src/utils");

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

router.get('/admin', GetAdminPage);
router.post('/admin/delete/fiddle', DeleteFiddle);
router.post('/admin/delete/user', DeleteUser);
router.post('/admin/enable/signup', EnableSignups);
router.post('/admin/disable/signup', DisableSignups);

module.exports = router;
