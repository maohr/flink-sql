import { observable } from "@/utils/observable";

const COMP_LENGTH = observable.comp.length;
const copyComp = observable.comp;
const matchTableKey = /((from|desc|join|into|overwrite)\s*)$/;
const matchLetter = /^[a-zA-Z]*$/;
const matchCreateTable = /(create table )\s*/;
const matchTable = /create table ([\s\S]*?)\(/;
const matchColumn = /\(([\s\S]*?)\)/;
const matchCommentString = /(comment|string)/;
const currentTab = observable.tabList.find(t => t.name === observable.activeName);
const global = {
    tbToColumns: {}
};

function whereHint(editor) {
    const cursor = editor.getCursor();
    const token = editor.getTokenAt(cursor);
    const line = editor.getLine(cursor.line);
    const word = line.substring(0, token.end);
    let beforeWord = word.substring(0, word.lastIndexOf(" "));
    let afterWord = word.substring(beforeWord.length + 1, token.end);
    currentTab.content = editor.getValue();
    currentTab.rangeContent = editor.getRange({ line: 0, ch: 0 }, cursor);
    if (!currentTab.instance) currentTab.instance = editor;
    if (matchCommentString.test(token.type ? token.type : "")) {
        observable.autoComplete = false;
        return;
    }
    observable.autoComplete = true;
    if (matchTableKey.test(beforeWord)) {
        showTableHint(afterWord);
    }
    editor.execCommand("autocomplete");
}

/**
 * 收集表名和字段
 */
function collectAll() {
    global.tbToColumns = {};
    let rangeLineText = currentTab.rangeContent.toLocaleLowerCase();
    rangeLineText = rangeLineText.split("\n").join("");
    rangeLineText = rangeLineText
        .split(" ")
        .filter(t => !!t.trim())
        .map(t => t.trim())
        .join(" ");
    const rangeLineArr = rangeLineText.split(";");
    rangeLineArr.forEach(line => {
        if (matchCreateTable.test(line)) {
            const tableArr = line.match(matchTable);
            const columnArr = line.match(matchColumn);
            if (tableArr) {
                const key = tableArr[1].trim();
                global.tbToColumns[key] = "";
                if (columnArr) {
                    let columnStr = columnArr[1].trim();
                    global.tbToColumns[key] = columnStr.split(",").map(t => {
                        t = t.trim();
                        const spaceIndex = t.trim().indexOf(" ");
                        return t.substring(0, spaceIndex);
                    });
                }
            }
        }
    });
    console.log(global.tbToColumns, "rangeLineText");
}
/**
 * 提示表名
 * @param afterword
 */
function showTableHint(afterword) {
    collectAll();
    observable.comp.length = 0;
    const tableKeys = Object.keys(global.tbToColumns);
    tableKeys.forEach(table => {
        observable.comp.push(table);
    });
}

export { whereHint, global };
