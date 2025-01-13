// Visual Studio code icons pack

import QtQuick

#pragma resource vscode-icons
  
Column {
    anchors.centerIn: parent

    function __getIconPath(name, theme = "light") {
      return `qrc:/vscode-icons/icons/${theme}/${name}.svg`;
    }

    spacing: 16

    Image {
        source: __getIconPath("symbol-file")
    }

    Image {
        source:  __getIconPath("symbol-class")
    }

}
