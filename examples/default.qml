import QtQuick
  
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
