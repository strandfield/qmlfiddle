// Inline component

import QtQuick

Item {
    anchors.fill: parent
    anchors.margins: 48

    component MyRect : Rectangle {
        color: "blue"
        width: 100
        height: 100
        radius: 16
    }

    MyRect {
        anchors.centerIn: parent
    }
}
