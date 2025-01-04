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

router.get('/:fiddleId', GetFiddle);

module.exports = router;
