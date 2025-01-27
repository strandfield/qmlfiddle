import { EditorView, basicSetup } from "codemirror"
import { qml } from "codemirror-lang-qml"
import { keymap } from "@codemirror/view"
import { linter, lintGutter } from "@codemirror/lint"
import { indentUnit, HighlightStyle, syntaxHighlighting,  defaultHighlightStyle } from "@codemirror/language"
import { indentWithTab } from "@codemirror/commands"
import { Compartment } from "@codemirror/state"
import {tags} from "@lezer/highlight"

const myHighlightStyle = HighlightStyle.define( defaultHighlightStyle.specs.concat([
	{ tag: tags.keyword, color: "#808000"},
	{ tag: tags.number, color: "#000080"},
	{ tag: tags.string, color: "#008000"},
	{ tag: tags.typeName, color: "#800080"},
	{ tag: tags.attributeName, color: "#800000"}
]));


// Indent with tabs: https://codemirror.net/examples/tab/
// Lint: https://codemirror.net/examples/lint/

function parseDiagnostics(text) {
	let diagnostics = JSON.parse(text);
	return diagnostics;
}

let sourceLinter = new Compartment;

const nullLinter = linter(view => []);

function createEditor(parentElement, updateListener = ()=>{}) {
	return new EditorView({
		extensions: [
			basicSetup, 
			syntaxHighlighting(myHighlightStyle), 
			indentUnit.of("    "), 
			keymap.of([indentWithTab]), 
			qml(), 
			sourceLinter.of(nullLinter), 
			lintGutter(),
			EditorView.updateListener.of(updateListener)
		],
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