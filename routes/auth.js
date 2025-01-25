var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var crypto = require('crypto');

function setupPassport(userManager) {
  const opts = {
    usernameField: "email"
  };
  let strategy = new LocalStrategy(opts, function verify(email, password, cb) {
    if (!userManager.authenticate(email, password)) {
      return cb(null, false, { message: 'Incorrect username or password.' });
    } else {
      return cb(null, userManager.getUser(email));
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
  res.render('signup');
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
  let u = users.createUser(req.body.email, req.body.password);
  if (!u) {
    return next("could not create user");
  }

  req.login(u, function(err) {
    if (err) { 
      return next(err);
    }
    res.redirect('/');
  });
});

module.exports = {
  setupPassport,
  router
};