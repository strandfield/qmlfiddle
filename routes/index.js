var express = require('express');

var router = express.Router();

const defaultDocument = `import QtQuick
  
Column {
    anchors.centerIn: parent

    spacing: 16

    Image {
        source: "qrc:/assets/qtlogo.svg"
    }

    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: "❤️ You are cute! ❤️"
        font.pointSize: 18
    }
}
`;

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
