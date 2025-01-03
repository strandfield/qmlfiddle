import { EditorView, basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { keymap } from "@codemirror/view"
import { linter, lintGutter } from "@codemirror/lint"
import { indentWithTab } from "@codemirror/commands"

// Indent with tabs: https://codemirror.net/examples/tab/
// Lint: https://codemirror.net/examples/lint/

function parseDiagnostics(text) {
	let diagnostics = JSON.parse(text);
	return diagnostics;
}

// TODO: remove use of global variable "qtInstance"
const qmlLinter = linter(view => {
	if (!qtInstance) {
		return [];
	}
	let src = view.state.doc.toString();
	let result = new Promise((resolve, reject) => {
		let f = function (text) {
			resolve(parseDiagnostics(text));
		};
		qtInstance.qmlfiddle_lintSource(f, src);
	});
	return result;
});

function createEditor(parentElement) {
	return new EditorView({
		extensions: [basicSetup, keymap.of([indentWithTab]), javascript(), qmlLinter, lintGutter()],
		parent: parentElement
	});
}

export {
    createEditor
};