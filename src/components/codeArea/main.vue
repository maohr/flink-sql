<template>
    <textarea id="codeContainer" />
</template>

<script>
import "@/plugins/codemirror/lib/codemirror.css";
import "@/plugins/codemirror/addon/hint/show-hint.css";
import "@/plugins/codemirror/addon/scroll/simplescrollbars.css";
import "@/plugins/codemirror/addon/fold/foldgutter.css";
import CodeMirror from "@/plugins/codemirror/lib/codemirror";
import "@/plugins/codemirror/mode/sql/sql";
import "@/plugins/codemirror/addon/hint/show-hint";
import "@/plugins/codemirror/addon/hint/sql-hint";
import "@/plugins/codemirror/addon/edit/closebrackets";
import "@/plugins/codemirror/addon/edit/matchbrackets";
import "@/plugins/codemirror/addon/scroll/simplescrollbars";
import "@/plugins/codemirror/addon/fold/foldcode";
import "@/plugins/codemirror/addon/fold/foldgutter";
import "@/plugins/codemirror/addon/fold/brace-flink";

import { whereHint, definedCursor } from "@/utils/sql";
import { observable } from "@/utils/observable";

function synonyms(cm) {
    if (!observable.autoComplete) return;
    return new Promise(function(accept) {
        const cursor = cm.getCursor(),
            line = cm.getLine(cursor.line);
        //const token = cm.getTokenAt(cursor);
        let start = cursor.ch,
            end = cursor.ch;
        while (start && /\w/.test(line.charAt(start - 1))) --start;
        while (end < line.length && /\w/.test(line.charAt(end))) ++end;
        const word = line.slice(start, end).toLowerCase();
        // if (token.string.includes(".") || !word.trim()) return accept(null);
        let list = observable.comp.filter(t => t.toLowerCase().substring(0, word.length) === word);
        return accept({ list: list, from: CodeMirror.Pos(cursor.line, start), to: CodeMirror.Pos(cursor.line, end) });
    });
}

export default {
    name: "codeArea",
    props: {
        content: String
    },
    methods: {
        initEditor() {
            const container = document.querySelector("#codeContainer");
            const editorInstance = CodeMirror.fromTextArea(container, {
                mode: "text/x-sql",
                indentWithTabs: true,
                smartIndent: true,
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                autofocus: true,
                scrollbarStyle: "simple",
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                extraKeys: {},
                hintOptions: {
                    hint: synonyms,
                    completeSingle: false
                }
            });
            editorInstance.setSize({ width: "100%", height: "100%" });
            editorInstance.setValue(this.$props.content || "");
            editorInstance.on("cursorActivity", editor => {
                whereHint(editor);
            });
            editorInstance.on("keydown", (editor, ev) => {
                if (ev.code === "Enter" || ev.code === "Tab") {
                    definedCursor(editor);
                }
            });
        }
    },
    mounted() {
        setTimeout(() => {
            this.initEditor();
        }, 50);
    }
};
</script>
