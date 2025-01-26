var express = require('express');

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

router.get('/account', GetAccountPage);
router.get('/account/delete', GetAccountDeletePage);

module.exports = router;
