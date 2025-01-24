
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

function writeConsole(text) {
    let out = document.getElementById("console-output");
    let entry = document.createElement("DIV");
    entry.classList.add("log-entry");
    entry.innerText = text;
    out.appendChild(entry);
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
    showDevTools();
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
    GetForkButton().style.display = 'none';
    GetSaveButton().style.display = 'inline';
}

function testAsyncGet() {
    qtInstance.qmlfiddle_asyncGet();
}

async function init()
{
    showDevTools();
    document.getElementById("devtoolsButton").onclick = toggleDevTools;
    document.getElementById("clearConsoleButton").onclick = clearConsole;

    SetDefaultDocument();

    if (!gUploadEnabled) 
    {
        document.getElementById("titleInput").style.display = 'none';
        GetSaveButton().style.display = 'none';
        GetForkButton().style.display = 'none';
    }
    else
    {
        if (gFiddleId != "" && gFiddleEditKey == "") {
            GetSaveButton().style.display = 'none';
            GetForkButton().style.display = 'inline';
        } else {
            GetForkButton().style.display = 'none';
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

            writeConsole("[info] QML engine is ready.");
        }

        GetSaveButton().onclick = SaveFiddle;
        GetForkButton().onclick = ForkFiddle;

        resizeWasmScreen();
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
}
