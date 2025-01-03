function onDragCallback() {
    if (qtInstance) {
        let elem = document.getElementById("screen");
        qtInstance.qtResizeContainerElement(elem);
        //qtInstance.qtResizeAllScreens(0);
    }
}

window.Split(['#code', '#output'], {
    onDrag: onDragCallback
});

window.Split(['#screen', '#console'], {
    onDrag: onDragCallback,
    direction: 'vertical',
    sizes: [75, 25],
});

/* WASM event handlers (called from C++) */

function onCurrentItemChanged() {
    console.log("current item changed");
}

function onLintComponentIsReady() {
  setTimeout(function() {
    clearConsole();
    qtInstance.qmlfiddle_UseLastLintAsSource();
  }, 16);
}

/* end */

function recvMssg(text) {
    console.log(`message received: ${text}`);
    let out = document.getElementById("console");
    let entry = document.createElement("DIV");
    entry.innerText = text;
    out.appendChild(entry);
}
  
function clearConsole() {
    let out = document.getElementById("console");
    out.innerHTML = '';
}

var qtInstance = null;
var gCodeEditor = null;

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

async function init()
{
    const overlay = document.querySelector('#home-overlay');
    const spinner = document.querySelector('#qtspinner');
    const screen = document.querySelector('#screen');
    const status = document.querySelector('#qtstatus');

    const showUi = (ui) => {
        [spinner, screen].forEach(element => element.style.display = 'none');
        if (screen === ui) {
            screen.style.position = 'default';
            overlay.style.display = 'none';
            SetDefaultDocument();
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
        qtInstance.qmlfiddle_setMessageHandler(recvMssg);
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
}
