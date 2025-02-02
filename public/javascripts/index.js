
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

function GetRunButton() {
    return document.getElementById("runButton");
}

function setRunButtonEnabled(enabled = true) {
    let btn = GetRunButton();
    btn.disabled = !enabled;
    btn = btn.nextElementSibling;
    btn.disabled = !enabled;
}

function disableRunButton() {
    setRunButtonEnabled(false);
}

function enableRunButton() {
    setRunButtonEnabled(true);
}

var autoRunActivated = true;

function setAutorunActivated(active = true) {
    GetRunButton().innerText = active ? "Auto Run" : "Run";
    autoRunActivated = active;
}

function compileAndRun() {
    const src = gCodeEditor.state.doc.toString();
    qtInstance.qmlfiddle_CompileAndRun(src);
}

/* WASM event handlers */

function onCurrentItemChanged() {
    console.log("new item mounted");
}

function onLintComponentIsReady() {
    if (!autoRunActivated) {
        return;
    }

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
    search_params.delete("editKey");
    if (gFiddleEditKey != "") {
        window.history.pushState({}, document.title, window.location.pathname);
    }
}

var qtInstance = null;

var gNumberOfChanges = 0;
const gMinChangesForSave = 7;
function onEditorViewUpdate(viewUpdate) {
    if (viewUpdate.docChanged) {
        gNumberOfChanges += 1;
        UpdateCodeEditorLimitIndicator();
        UpdateSaveButtonState();
    }
}

var gCodeEditor = CodeEditor.createEditor(document.getElementById("code"), onEditorViewUpdate);

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

var gCodeEditorLimitIndicator = null;
function GetOrCreateCodeEditorLimitIndicator() {
    if (!gCodeEditorLimitIndicator && gUploadEnabled) {
        const code = document.getElementById("code");
        gCodeEditorLimitIndicator = document.createElement('DIV');
        gCodeEditorLimitIndicator.id = "editor-char-limit-indicator";
        gCodeEditorLimitIndicator.innerText = "hello";
        code.appendChild(gCodeEditorLimitIndicator);
    }

    return gCodeEditorLimitIndicator;
}

function UpdateCodeEditorLimitIndicator() {
    let elem = GetOrCreateCodeEditorLimitIndicator();
    if (!elem) {
        return;
    }

    const n = gCodeEditor.state.doc.length;
    elem.innerText = `${n} / ${gMaxFiddleSize}`;

    if (n > gMaxFiddleSize) {
        gCodeEditorLimitIndicator.classList.add("char-limit-exceeded")
    } else if(GetSaveButton().disabled) {
        gCodeEditorLimitIndicator.classList.remove("char-limit-exceeded")
    }
}

function UpdateSaveButtonState() {
    const n = gCodeEditor.state.doc.length;
    if (n > gMaxFiddleSize) {
        GetSaveButton().disabled = true;
    } else if(GetSaveButton().disabled) {
        GetSaveButton().disabled = gNumberOfChanges < gMinChangesForSave || !qtInstance;
    }
}

function FreezeSaveButton(message) {
    let btn = GetSaveButton();
    btn.disabled = true;
    btn.classList.replace("btn-light", "btn-danger");
    btn.value = `Error: ${message}`;
}

function UnfreezeSaveButton() {
    let btn = GetSaveButton();
    btn.classList.replace("btn-danger", "btn-light");
    btn.value = "Save";
    UpdateSaveButtonState();
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

    GetSaveButton().disabled = true;

    $.post("/api/fiddle", data, function(result) {
        console.log(result);
        if (!result.accepted) {
            FreezeSaveButton(result.message);
            setTimeout(UnfreezeSaveButton, 1750);
            return;
        }
        if (result.fiddleId != gFiddleId) {
            gFiddleId = result.fiddleId;
            window.history.pushState({}, "", "/" + gFiddleId);
        }

        gFiddleEditKey = result.editKey ?? "";

        setTimeout(UpdateSaveButtonState, 450);
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
    disableRunButton();
    GetRunButton().onclick = compileAndRun;
    document.getElementById("activateAutorunLink").onclick = (event) => {
        event.preventDefault();
        setAutorunActivated(true);
    };
    document.getElementById("deactivateAutorunLink").onclick = (event) => {
        event.preventDefault();
        setAutorunActivated(false);
    };
    document.getElementById("clearConsoleButton").onclick = clearConsole;
    disableTerminalActivityIndicator();

    GetSaveButton().disabled = true;
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

            UpdateCodeEditorLimitIndicator();

            enableRunButton();
        }

        GetSaveButton().onclick = SaveFiddle;
        GetForkButton().onclick = ForkFiddle;

        resizeWasmScreen();
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
}
