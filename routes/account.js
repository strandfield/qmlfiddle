var express = require('express');

const { mapFiddleIds } = require("../src/utils");

var router = express.Router();

function GetAccountPage(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  res.render('account', { 
    title: 'My account - QML Fiddle',
    user: req.user
  });
}

function GetAccountDeletePage(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  res.render('account-delete', { 
    title: 'Delete my account - QML Fiddle',
    user: req.user
  });
}

function GetAccountFiddlesPage(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  const fiddles = req.app.locals.fiddleManager;
  let user_fiddles = fiddles.getFiddlesByAuthorId(req.user.id);
  mapFiddleIds(user_fiddles);

  res.render('account-fiddles', { 
    title: 'My fiddles - QML Fiddle',
    user: req.user,
    fiddles: user_fiddles
  });
}

function GetAccountCredentialsPage(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  res.render('account-credentials', { 
    title: 'My account - QML Fiddle',
    user: req.user,
    query: req.query
  });
}

function UpdateAccountCredentials(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  let users = req.app.locals.userManager;

  if (req.user.username != req.body.username) {
    if (users.getUserByUsername(req.body.username) != undefined) {
      return res.redirect("/account/credentials?status=failure&reason=username");
    }
  }

  if (req.user.email != req.body.email) {
    if (users.getUserByEmail(req.body.email) != undefined) {
      return res.redirect("/account/credentials?status=failure&reason=email");
    }
  }

  if (!users.authenticate(req.user.username, req.body.password)) {
    return res.redirect("/account/credentials?status=failure&reason=password");
  }

  let password = req.body.password;
  if (req.body.password && req.body.newpassword.length > 0) {
    password = req.body.newpassword;
  }

  users.updateUser(req.user.id, req.body.username, req.body.email, password);
  req.session.passport.user.username = req.body.username;
  req.session.passport.user.email = req.body.email;

  res.redirect("/account/credentials?status=success");
}

router.get('/account', GetAccountPage);
router.get('/account/delete', GetAccountDeletePage);
router.get('/account/fiddles', GetAccountFiddlesPage);
router.get('/account/credentials', GetAccountCredentialsPage);
router.post('/account/update', UpdateAccountCredentials);

module.exports = router;
