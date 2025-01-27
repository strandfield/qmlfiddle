var express = require('express');

var router = express.Router();

const path = require('path');
const fs = require('node:fs');

const { getUserMaxFiddleSize } = require("../src/utils")

let defaultDocument = "";

fs.readFile(path.join(__dirname, "../examples/default.qml"), 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  defaultDocument = data;
});

function GetFiddle(req, res, next) {
  const id = req.params.fiddleId;
  const manager = req.app.locals.fiddleManager;
  const fiddle = manager.getFiddleById(id);

  if (!fiddle) {
    return next();
  }

  res.render('index', { 
    title: 'QML Fiddle',
    user: req.user,
    maxFiddleSize: getUserMaxFiddleSize(req.user, req.app.locals.conf),
    defaultDocument: fiddle 
  });
}

function RedirectToFiddleEdit(req, res, next) {
  const id = req.params.fiddleId;

  if (!req.user) {
    return res.redirect("/" + id);
  }

  const manager = req.app.locals.fiddleManager;
  const fiddle = manager.getFiddleByIdEx(id, ["authorId"]);

  if (!fiddle) {
    return next();
  }

  if (!req.user.superUser) {
    if (fiddle.authorId != req.user.id) {
      return res.redirect("/" + id);
    }
  }
  
  const edit_key = manager.getFiddleEditKey(id);
  return res.redirect("/" + id + "?editKey=" + edit_key);
}

function DeleteFiddle(req, res, next) {
  const id = req.params.fiddleId;

  if (!req.user) {
    return res.redirect("/" + id);
  }

  const manager = req.app.locals.fiddleManager;
  const fiddle = manager.getFiddleByIdEx(id, ["authorId"]);

  if (!fiddle) {
    return next();
  }

  if (fiddle.authorId != req.user.id) {
    return res.redirect("/" + id);
  }

  manager.deleteFiddle(id);

  return res.redirect("/account/fiddles");
}


function GetAllFiddles(req, res, next) {
  const manager = req.app.locals.fiddleManager;
  const fiddles = manager.getAllFiddles();

  res.render('list', { 
    title: 'QML Fiddle',
    user: req.user,
    fiddles: fiddles
  });
}

function GetPrivacyPolicyPage(req, res, next) {
  res.render('privacy', { 
    title: 'Privacy Policy - QML Fiddle'
  });
}

function GetDocumentationPage(req, res, next) {
  res.render('documentation', { 
    title: 'Documentation - QML Fiddle'
  });
}

function GetFiddleRaw(req, res, next) {
  const id = req.params.fiddleId;
  const manager = req.app.locals.fiddleManager;
  const fiddle = manager.getFiddleById(id);

  if (!fiddle) {
    return next();
  }

  res.set('Content-Type', 'text/plain')
  res.send(fiddle.content);
}


/* GET home page. */
router.get('/', function(req, res, next) {

  res.render('index', { 
    title: 'QML Fiddle',
    user: req.user,
    maxFiddleSize: getUserMaxFiddleSize(req.user, req.app.locals.conf),
    defaultDocument: {
      id: "",
      title: "",
      content: defaultDocument
    } 
  });
});

router.get('/list', GetAllFiddles);
router.get('/privacy.html', GetPrivacyPolicyPage);
router.get('/documentation.html', GetDocumentationPage);
router.get('/rawusercontent/:fiddleId', GetFiddleRaw);
router.get('/:fiddleId', GetFiddle);
router.get('/:fiddleId/edit', RedirectToFiddleEdit);
router.post('/:fiddleId/delete', DeleteFiddle);

module.exports = router;
