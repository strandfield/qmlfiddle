var express = require('express');

var router = express.Router();

const path = require('path');
const fs = require('node:fs');

const { getUserMaxFiddleSize, mapFiddleIds, isSuperUser } = require("../src/utils")

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

  let fields = ["id", "title"];

  if (isSuperUser(req.user)) {
    fields.push("authorId");
  }

  let fiddles = manager.getAllFiddles(fields);

  if (isSuperUser(req.user)) {
    const users = req.app.locals.userManager;
    let usermap = new Map();
    for(let f of fiddles) {
      let author = usermap.get(f.authorId);
      if (author == undefined && f.authorId != null) {
        author = users.getUserById(f.authorId);
        usermap.set(f.authorId, author);
      }
      f.author = author;
    }
  }

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

function GetUserPage(req, res, next) {
  const username = req.params.username;
  const users = req.app.locals.userManager;
  const user = users.getUserByUsername(username);

  if (!user) {
    return next();
  }

  const fiddles = req.app.locals.fiddleManager;
  let user_fiddles = fiddles.getFiddlesByAuthorId(user.id);
  mapFiddleIds(user_fiddles);
  
  res.render('user', { 
    title: `${user.username} - QML Fiddle`,
    user: req.user,
    targetUser: user,
    targetUserFiddles: user_fiddles
  });
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
router.get('/u/:username', GetUserPage);
router.get('/:fiddleId', GetFiddle);
router.get('/:fiddleId/edit', RedirectToFiddleEdit);
router.post('/:fiddleId/delete', DeleteFiddle);

module.exports = router;
