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

router.get('/account', GetAccountPage);
router.get('/account/delete', GetAccountDeletePage);
router.get('/account/fiddles', GetAccountFiddlesPage);

module.exports = router;
