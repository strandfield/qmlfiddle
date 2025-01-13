// Visual Studio code icons pack

#pragma resource vscode-icons

import QtQuick
import QtQuick.Layouts
import QtQuick.Controls

import FileUtils
import QmlFiddle

ColumnLayout {
    anchors.fill: parent
    anchors.margins: 48
    spacing: 48


    property string theme: "light"

    function __getIconPath(name) {
        return `qrc:/vscode-icons/icons/${theme}/${name}`;
    }

    function __updateBgColor() {
        QmlFiddle.backgroundColor = (theme == "light" ? "white" : "black");
    }

    Button {
        Layout.alignment: Qt.AlignHCenter
        text: "Switch to " + (theme == "light" ? "Dark" : "Light")

        onClicked: {
            theme = (theme == "light" ? "dark" : "light")
            __updateBgColor();
        }
    }

    Flow {
        Layout.fillWidth: true
        spacing: 10


        Repeater {
            model: FileUtils.readdir(`:/vscode-icons/icons/${theme}`)

            delegate: Image {
                source: __getIconPath(modelData)
            }
        }
    }

    Item {
        id: stretchItem
        Layout.fillHeight: true
    }

    Component.onCompleted: {
        __updateBgColor();
    }
}
