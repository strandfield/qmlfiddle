var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local');

function setupPassport(userManager) {
  let strategy = new LocalStrategy(function verify(usernameOrEmail, password, cb) {
    if (!userManager.authenticate(usernameOrEmail, password)) {
      return cb(null, false, { message: 'Incorrect username or password.' });
    } else {
      return cb(null, userManager.getUserByUsernameOrEmail(usernameOrEmail));
    }
  });

  passport.use(strategy);
  
  passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, user);
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
}

var router = express.Router();

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.get('/signup', function(req, res, next) {
  res.render('signup', { 
    title: 'Sign up - QML Fiddle',
    query: req.query
  });
});

router.post('/login/password', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

router.post('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.post('/signup', function(req, res, next) {
  let users = req.app.locals.userManager;
  let u = users.createUser(req.body.username, req.body.email, req.body.password);
  if (!u) {
    return res.redirect("/signup?status=failure");
  }

  req.login(u, function(err) {
    if (err) { 
      return next(err);
    }
    res.redirect('/');
  });
});

function deleteUserAccount(userManager, user, reqBody) {
  if (!user || reqBody.username != user.username) {
    return false;
  }
  if (!userManager.authenticate(reqBody.username, reqBody.password)) {
    return false;
  }

  userManager.deleteUser(user.id);
  return true;
}

router.post('/account/delete', function(req, res, next) {
  if (!deleteUserAccount(req.app.locals.userManager, req.user, req.body)) {
    return res.redirect("/account/delete");
  }

  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

function getAuthRouter() {
  return router;
}

module.exports = {
  setupPassport,
  getAuthRouter
};