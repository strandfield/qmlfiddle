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

/* GET home page. */
router.get('/', function(req, res, next) {

  res.render('index', { 
    title: 'QML Fiddle',
    defaultDocument: defaultDocument 
  });
});

module.exports = router;
