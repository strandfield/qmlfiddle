import { EditorView, basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { keymap } from "@codemirror/view"
import { linter, lintGutter } from "@codemirror/lint"
import { indentWithTab } from "@codemirror/commands"
import { Compartment } from "@codemirror/state"

// Indent with tabs: https://codemirror.net/examples/tab/
// Lint: https://codemirror.net/examples/lint/

function parseDiagnostics(text) {
	let diagnostics = JSON.parse(text);
	return diagnostics;
}

let sourceLinter = new Compartment;

const nullLinter = linter(view => []);

function createEditor(parentElement) {
	return new EditorView({
		extensions: [basicSetup, keymap.of([indentWithTab]), javascript(), sourceLinter.of(nullLinter), lintGutter()],
		parent: parentElement
	});
}

function enableQmlLinter(codeEditor, qtInstance) {
	if (!qtInstance.qmlfiddle_lintSource) {
		console.error("qtInstance.qmlfiddle_lintSource is null");
	}

	const qmlLinter = linter(view => {
		let src = view.state.doc.toString();
		let result = new Promise((resolve, reject) => {
			let f = function (text) {
				resolve(parseDiagnostics(text));
			};
			qtInstance.qmlfiddle_lintSource(f, src);
		});
		return result;
	});

	// https://codemirror.net/examples/config/#dynamic-configuration
	codeEditor.dispatch({
	  effects: sourceLinter.reconfigure(qmlLinter)
	});
}
  
export {
    createEditor, enableQmlLinter
};