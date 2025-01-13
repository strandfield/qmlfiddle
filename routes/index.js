var express = require('express');

var router = express.Router();

const path = require('path');
const fs = require('node:fs');

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
    defaultDocument: fiddle 
  });
}

function GetAllFiddles(req, res, next) {
  const manager = req.app.locals.fiddleManager;
  const fiddles = manager.getAllFiddles();

  res.render('list', { 
    title: 'QML Fiddle',
    fiddles: fiddles
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
    defaultDocument: {
      id: "",
      title: "",
      content: defaultDocument
    } 
  });
});

router.get('/list', GetAllFiddles);
router.get('/rawusercontent/:fiddleId', GetFiddleRaw);
router.get('/:fiddleId', GetFiddle);

module.exports = router;
