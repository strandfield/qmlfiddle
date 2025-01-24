
function resizeWasmScreen() {
    if (qtInstance) {
        let elem = document.getElementById("screen");
        qtInstance.qtResizeContainerElement(elem);
        //qtInstance.qtResizeAllScreens(0);
    }
}

function onDragCallback() {
    resizeWasmScreen();
}

window.Split(['#code', '#screen'], {
    onDrag: onDragCallback
});

var devtoolsSplit = null;

function showDevTools() {
    if (devtoolsSplit) {
        return;
    }

    devtoolsSplit = window.Split(['#maincontent', '#devtools'], {
        onDrag: onDragCallback,
        direction: 'vertical',
        sizes: [75, 25],
        gutterSize: 4,
        cursor: "ns-resize"
    });

    let element = document.getElementById("devtools");
    element.style.display = 'block';

    resizeWasmScreen();
    disableTerminalActivityIndicator();
}

function hideDevTools() {
    let element = document.getElementById("devtools");
    element.style.display = 'none';

    if (devtoolsSplit) {
        devtoolsSplit.destroy();
        devtoolsSplit = null;
    }

    element = document.getElementById("maincontent");
    element.style.height = '100%';

    resizeWasmScreen();
}

function devToolsVisible() {
    return devtoolsSplit != null;
}

function writeConsole(text, ghost=false) {
    let out = document.getElementById("console-output");
    let entry = document.createElement("DIV");
    entry.classList.add("log-entry");
    entry.innerText = text;
    out.appendChild(entry);

    if (!ghost && !devToolsVisible()) {
        enableTerminalActivityIndicator();
    }
}

function clearConsole() {
    let out = document.getElementById("console-output");
    out.innerHTML = '';
}

function toggleDevTools() {
    let element = document.getElementById("devtools");
    if (element.style.display == 'none') {
        showDevTools();
    } else {
        hideDevTools();
    }
}

var terminalActivityIndicatorInterval = null;

function setTerminalActivityIndicatorVisible(visible=true) {
    if (visible) {
        document.getElementById("terminalActivityIndicator").style.display = 'block';
    } else {
        document.getElementById("terminalActivityIndicator").style.display = 'none';
    }
}

function toggleTerminalActivityIndicatorVisible() {
    const hidden = document.getElementById("terminalActivityIndicator").style.display == 'none';
    setTerminalActivityIndicatorVisible(hidden);
}

function disableTerminalActivityIndicator() {
    setTerminalActivityIndicatorVisible(false);

    if (terminalActivityIndicatorInterval) {
        clearInterval(terminalActivityIndicatorInterval);
        terminalActivityIndicatorInterval = null;
    }
}

function enableTerminalActivityIndicator() {
    if (!terminalActivityIndicatorInterval) {
        terminalActivityIndicatorInterval = setInterval(toggleTerminalActivityIndicatorVisible, 750);
    }
}

/* WASM event handlers */

function onCurrentItemChanged() {
    console.log("new item mounted");
}

function onLintComponentIsReady() {
  setTimeout(function() {
    qtInstance.qmlfiddle_UseLastLintAsSource();
  }, 16);
}

function recvMssg(text) {
    //console.log(`message received: ${text}`);
    writeConsole(text);
}

/* end */

var gFiddleEditKey = "";
{
    let search_params = new URLSearchParams(window.location.search);
    gFiddleEditKey = search_params.get("editKey") ?? "";
}

var qtInstance = null;
var gCodeEditor = CodeEditor.createEditor(document.getElementById("code"));

function SetDefaultDocument() {
    const code = document.getElementById("code");
    if (code.firstElementChild && code.firstElementChild.tagName == "PRE") {
        const text = code.firstElementChild.innerHTML;

        gCodeEditor.dispatch({
            changes: {
                from: 0,
                to: undefined,
                insert: text
            }
        });

        code.firstElementChild.remove();
    }
}

function SetActionButtonVisible(btn, visible = true) {
    btn.parentElement.style.display = visible ? 'inline' : 'none';
}

function GetSaveButton() {
    return document.getElementById("saveButton");
}

function GetForkButton() {
    return document.getElementById("forkButton");
}

function SaveFiddle() {
    const title = document.getElementById("titleInput").value;
    const text = gCodeEditor.state.doc.toString();
    let data = {
        content: text,
        title: title,
        hash: qtInstance.qmlfiddle_sign(text)
    };

    if (gFiddleId != "") {
        data.id = gFiddleId;
        data.editKey = gFiddleEditKey;
    }

    $.post("/api/fiddle", data, function(result) {
        console.log(result);
        if (!result.accepted) {
            return;
        }
        if (result.fiddleId != gFiddleId) {
            gFiddleId = result.fiddleId;
            window.history.pushState({}, "", "/" + gFiddleId);
        }

        gFiddleEditKey = result.editKey ?? "";
    });
}

function ForkFiddle() {
    gFiddleId = "";
    gFiddleEditKey = "";
    window.history.pushState({}, "", "/");
    SetActionButtonVisible(GetForkButton(), false);
    SetActionButtonVisible(GetSaveButton(), true);
}

async function init()
{
    hideDevTools();
    document.getElementById("devtoolsButton").onclick = toggleDevTools;
    document.getElementById("clearConsoleButton").onclick = clearConsole;
    disableTerminalActivityIndicator();

    SetDefaultDocument();

    if (!gUploadEnabled) 
    {
        document.getElementById("titleInput").style.display = 'none';
        SetActionButtonVisible(GetSaveButton(), false);
        SetActionButtonVisible(GetForkButton(), false);
    }
    else
    {
        if (gFiddleId != "" && gFiddleEditKey == "") {
            SetActionButtonVisible(GetSaveButton(), false);
            SetActionButtonVisible(GetForkButton(), true);
        } else {
            SetActionButtonVisible(GetForkButton(), false);
        }
    }

    const overlay = document.querySelector('#screen-overlay');
    const spinner = document.querySelector('#qtspinner');
    const screen = document.querySelector('#screen');
    const status = document.querySelector('#qtstatus');

    const showUi = (ui) => {
        if (ui == screen) {
            overlay.remove();
        } 
        
        ui.style.display = 'block';
    }

    try {
        showUi(spinner);
        status.innerHTML = 'Loading...';

        const instance = await qtLoad({
            qt: {
                onLoaded: () => showUi(screen),
                onExit: exitData =>
                {
                    let message = "[error] Application exit"; 
                    if (exitData.code !== undefined) {
                        message += ` with code ${exitData.code}`;
                    }
                    if (exitData.text !== undefined) {
                        message += ` (${exitData.text})`;
                    }
                    writeConsole(message);

                    status.innerHTML = message;
                    showUi(spinner);
                },
                entryFunction: window.qmlfiddle_entry,
                containerElements: [screen],
                
            }
        });
        
        qtInstance = instance;

        if (qtInstance) {
            qtInstance.qmlfiddle_setMessageHandler(recvMssg);
            qtInstance.qmlfiddle_onCurrentItemChanged(onCurrentItemChanged);
            qtInstance.qmlfiddle_onLintReady(onLintComponentIsReady);
    
            // enable qml linter, which will show the resulting QML item if compilation
            // succeeds (see onLintComponentIsReady()).
            CodeEditor.enableQmlLinter(gCodeEditor, qtInstance);

            const dont_notify = true;
            writeConsole("[info] QML engine is ready.", dont_notify);
        }

        GetSaveButton().onclick = SaveFiddle;
        GetForkButton().onclick = ForkFiddle;

        resizeWasmScreen();
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
}
