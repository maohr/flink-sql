// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
    if (typeof exports == "object" && typeof module == "object")
        // CommonJS
        mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd)
        // AMD
        define(["../../lib/codemirror"], mod);
    // Plain browser env
    else mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    CodeMirror.registerHelper("fold", "flink-sql", function(cm, start) {
        var line = start.line,
            lineText = cm.getLine(line);
        var tokenType;

        function findOpening(openCh) {
            for (var at = start.ch, pass = 0; ; ) {
                var found = at <= 0 ? -1 : lineText.lastIndexOf(openCh, at - 1);
                if (found == -1) {
                    if (pass == 1) break;
                    pass = 1;
                    at = lineText.length;
                    continue;
                }
                if (pass == 1 && found < start.ch) break;
                tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1));
                if (!/^(comment|string)/.test(tokenType)) return found + 1;
                at = found - 1;
            }
        }

        var startToken = "(",
            endToken = ")",
            startCh = findOpening("(");
        if (startCh == null) {
            (startToken = "["), (endToken = "]");
            startCh = findOpening("[");
        }

        if (startCh == null) return;
        var count = 1,
            lastLine = cm.lastLine(),
            end,
            endCh;
        outer: for (var i = line; i <= lastLine; ++i) {
            var text = cm.getLine(i),
                pos = i == line ? startCh : 0;
            for (;;) {
                var nextOpen = text.indexOf(startToken, pos),
                    nextClose = text.indexOf(endToken, pos);
                if (nextOpen < 0) nextOpen = text.length;
                if (nextClose < 0) nextClose = text.length;
                pos = Math.min(nextOpen, nextClose);
                if (pos == text.length) break;
                if (cm.getTokenTypeAt(CodeMirror.Pos(i, pos + 1)) == tokenType) {
                    if (pos == nextOpen) ++count;
                    else if (!--count) {
                        end = i;
                        endCh = pos;
                        break outer;
                    }
                }
                ++pos;
            }
        }
        if (end == null || line == end) return;
        return {
            from: CodeMirror.Pos(line, startCh),
            to: CodeMirror.Pos(end, endCh)
        };
    });
});
