
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

window.Split(['#code', '#output'], {
    onDrag: onDragCallback
});

var consoleSplit = null;

function showConsole() {
    if (consoleSplit) {
        return;
    }

    let element = document.getElementById("console");
    element.style.display = 'block';

    consoleSplit = window.Split(['#screen', '#console'], {
        onDrag: onDragCallback,
        direction: 'vertical',
        sizes: [75, 25],
    });

    resizeWasmScreen();
}

function hideConsole() {
    let element = document.getElementById("console");
    element.style.display = 'none';

    element = document.getElementById("screen");
    element.style.height = '100%';
    resizeWasmScreen();

    if (!consoleSplit) {
        return;
    }

    consoleSplit.destroy();
    consoleSplit = null;
}

function writeConsole(text) {
    let out = document.getElementById("console");
    let entry = document.createElement("DIV");
    entry.innerText = text;
    out.appendChild(entry);
}

function clearConsole() {
    let out = document.getElementById("console");
    out.innerHTML = '';
}

/* WASM event handlers */

function onCurrentItemChanged() {
    //console.log("current item changed");
}

function onLintComponentIsReady() {
  setTimeout(function() {
    clearConsole();
    qtInstance.qmlfiddle_UseLastLintAsSource();
  }, 16);
}

function recvMssg(text) {
    //console.log(`message received: ${text}`);
    showConsole();
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

async function init()
{
    hideConsole();
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
                    status.innerHTML = 'Application exit';
                    status.innerHTML +=
                        exitData.code !== undefined ? ` with code ${exitData.code}` : '';
                    status.innerHTML +=
                        exitData.text !== undefined ? ` (${exitData.text})` : '';
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
        }

        GetSaveButton().onclick = SaveFiddle;
        GetForkButton().onclick = ForkFiddle;

        resizeWasmScreen();
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
}
