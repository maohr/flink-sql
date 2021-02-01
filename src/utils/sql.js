import { observable } from "@/utils/observable";
import { getResultSql } from "@/utils/index";

const SPECIAL_DOT = "℁";
const copyComp = JSON.stringify(observable.comp); // 初始关键字
const matchTableKey = /((from|desc|join|into|overwrite)\s*)$/;
const matchLetter = /^[a-zA-Z]*$/;
const matchCreateTable = /(create table )\s*/;
const matchTable = /create table ([\s\S]*?)\(/;
const matchColumn = /\(([\s\S]*?)\)/;
const matchCommentString = /(comment|string)/;
const matchDot = /(;|,|\()/g;
const currentTab = observable.tabList.find(t => t.name === observable.activeName);
const global = {
    tbToColumns: {},
    lineTextArr: []
};

/**
 * 何时提示
 * @param editor
 */
function whereHint(editor) {
    const cursor = editor.getCursor(); //光标位置
    const token = editor.getTokenAt(cursor); //光标处的token
    const line = editor.getLine(cursor.line); //光标所在行文本
    const selectionText = editor.getSelection(); //选中的文本
    const word = line.substring(0, token.end); //0 到光标处的文本
    const lastDotIndex = token.string.lastIndexOf("."); // 点的last index
    let beforeWord = word.substring(0, word.lastIndexOf(" ")); //from等关键字前的文本
    let afterWord = word.substring(beforeWord.length + 1, token.end); //表名关键字
    currentTab.content = currentTab.curContent = editor.getValue();
    currentTab.content = getResultSql(currentTab.content);
    currentTab.rangeContent = !!selectionText ? selectionText : editor.getRange({ line: 0, ch: 0 }, cursor);
    currentTab.rangeContent = getResultSql(currentTab.rangeContent);
    if (!currentTab.instance) currentTab.instance = editor;
    // 字符串或注释

    if (matchCommentString.test(token.type ? token.type : "") || lastDotIndex > 0) {
        observable.autoComplete = false;
        return;
    }
    observable.comp = JSON.parse(copyComp);
    observable.autoComplete = true;
    // 表名
    if (matchTableKey.test(beforeWord) && matchLetter.test(afterWord)) {
        showTableHint(afterWord);
    }
    // 字段
    if (lastDotIndex === 0) {
        showColumns(currentTab.content.split("\n"), cursor);
    }
    if (matchLetter.test(token.string) && token.string.trim().length > 0) {
        editor.execCommand("autocomplete");
    }
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
}
/**
 * 提示表名
 * @param afterword {string}
 */
function showTableHint(afterword) {
    collectAll();
    observable.comp.length = 0;
    const tableKeys = Object.keys(global.tbToColumns);
    tableKeys.forEach(table => {
        observable.comp.push(table);
    });
}

/**
 *
 * @param allLineText {string[]}
 * @param pos {{ line: number , ch: number }}
 */
function showColumns(allLineText, pos) {
    observable.comp.length = 0;
    collectAll();
    resetText(allLineText, pos);
    getAliasAndTable(allLineText, pos);
}

/**
 * 找表名
 */
function findTableName() {}

/**
 *
 * @param allLineText {string[]}
 * @param pos {{ line: number , ch: number }}
 */
function resetText(allLineText, pos) {
    global.lineTextArr = [];
    const formatTextData = formatText(allLineText, pos);
    for (let i = 0; i < formatTextData.formatTextArr.length; i++) {
        const formatTextItem = formatTextData.formatTextArr[i];
        let startLine;
        if (i < 1) {
            startLine = 0;
        } else {
            startLine = formatTextData.formatEndLine[i - 1] + 1;
        }
        const textItem = {
            startLine: startLine,
            endLine: formatTextData.formatEndLine[i] || allLineText.length - 1,
            text: formatTextItem
        };
        if (!!formatTextItem.trim()) {
            global.lineTextArr.push(textItem);
        }
    }
}

/**
 *
 * @param allLineText {string[]}
 * @param pos {{ line: number , ch: number }}
 */
function formatText(allLineText, pos) {
    const endLineArr = [];
    let allTextArr = [];
    let allTextStr = "";
    if (allLineText.length > 0) {
        let isSingleSql = false;
        for (let i = 0; i < allLineText.length; i++) {
            const text = allLineText[i].trim() + " ";
            if (text.includes(";")) isSingleSql = true;
            if (text.trim() !== "") {
                allTextStr += text;
                if (text.includes(";")) {
                    endLineArr.push(i);
                }
            }
        }
        if (!isSingleSql) endLineArr.unshift(allLineText.length - 1);
    }
    allTextStr = allTextStr.replace(/(;$)/g, SPECIAL_DOT).replace(/(;)/g, SPECIAL_DOT + ";");
    allTextArr = allTextStr.split(";");
    const newAllTextArr = [];
    for (let i = 0; i < allTextArr.length; i++) {
        let text = allTextArr[i];
        if (text.includes(SPECIAL_DOT)) text = text.replace(new RegExp(SPECIAL_DOT, "g"), ";");
        if (!!text.trim()) newAllTextArr.push(text);
    }
    return {
        formatTextArr: newAllTextArr,
        formatEndLine: endLineArr
    };
}

/**
 * 获取 别名以及表名
 * @param allLineText {string[]}
 * @param pos {{ line: number , ch: number }}
 */
function getAliasAndTable(allLineText, pos) {
    let beforeCursorText = "";
    let afterCursorText = "";
    for (let i = 0; i < global.lineTextArr.length; i++) {
        const lineTextItem = global.lineTextArr[i];
        if (pos.line >= lineTextItem.startLine && pos.line <= lineTextItem.endLine) {
            beforeCursorText = "";
            for (let j = lineTextItem.startLine; j < pos.line; j++) {
                beforeCursorText = beforeCursorText + allLineText[j] + " ";
            }
            beforeCursorText = beforeCursorText + allLineText[pos.line].substring(0, pos.ch).trim();
            beforeCursorText = beforeCursorText
                .replace(/\s+/g, " ")
                .replace(/(\w+)(\))/g, "$1 $2")
                .replace(/\s+as\s+/gi, " ")
                .replace(/(\()(\w+)/gi, "$1 $2")
                .replace(/\s*(,)\s*/g, "$1")
                .replace(/(\()(\()/g, "$1 $2")
                .replace(/(\))(\))/g, "$1 $2")
                .replace(/(where)\s+(\()/i, "$1$2")
                .trim();
            //
            afterCursorText = "";
            afterCursorText = `${afterCursorText}${allLineText[pos.line].substring(pos.ch)} `;
            for (let k = pos.line + 1; k <= lineTextItem.endLine; k++) {
                afterCursorText = `${afterCursorText}${allLineText[k]} `;
                if (allLineText[k].includes(";")) break;
            }
            afterCursorText = afterCursorText.trim();
            afterCursorText = afterCursorText
                .replace(/\s+/g, " ")
                .replace(/(\w+)(\))/g, "$1 $2")
                .replace(/\s+as\s+/gi, " ")
                .replace(/(\()(\w+)/gi, "$1 $2")
                .replace(/\s*(,)\s*/g, "$1")
                .replace(/(\()(\()/g, "$1 $2")
                .replace(/(\))(\))/g, "$1 $2")
                .replace(/(where)\s+(\()/i, "$1$2")
                .trim();
        }
    }
    // 别名
    const aliasName = getAliasName(beforeCursorText, beforeCursorText.length - 1, "");
    if (aliasName.trim() === "") return;
    const frontSqlArr = beforeCursorText.split(" ").reverse();
    const selectIndex = frontSqlArr.findIndex(s => s.toLocaleLowerCase() === "select");
    const fromIndex = frontSqlArr.findIndex(f => f.toLocaleLowerCase() === "from");
    if (fromIndex >= 0) {
        if (selectIndex < 0 || fromIndex < selectIndex) parseBeforeText(beforeCursorText, aliasName);
    }
    if (selectIndex >= 0) {
        if (fromIndex < 0 || selectIndex < fromIndex) parseAfterText(afterCursorText, aliasName);
    }
}

/**
 * 获取别名
 * @param query {string}
 * @param len {number}
 * @param str {string}
 */
function getAliasName(query, len, str) {
    query = query.trim();
    const be = query.substring(len, len - 1);
    if (len <= 0) return str;
    if (be === " " || be === "," || be === "=" || be === "(") {
        const docIndex = str.lastIndexOf(".");
        if (docIndex > -1) str = str.substring(0, docIndex);
        return str.replace(".", "");
    } else {
        str = be + str;
        return getAliasName(query, len - 1, str);
    }
}

/**
 *
 * @param beforeCursorText {string}
 * @param aliasName {string}
 */
function parseBeforeText(beforeCursorText, aliasName) {
    const textArr = beforeCursorText.split(" ");
    let tempNum = 0;
    for (let i = textArr.length - 1; i >= 0; i--) {
        const text = textArr[i];
        if (text === "having" || text === "where") {
            if (text === "(") tempNum++;
            if (tempNum <= 0) tempNum = 0;
            break;
        }
        if (text === "select" && tempNum <= 0) {
            tempNum = 0;
            break;
        }
        if (text === "(") tempNum++;
        if (text === ")") tempNum--;
    }

    let n = tempNum;
    for (let j = textArr.length - 1; j >= 0; j--) {
        const text = textArr[j];
        if (text.lastIndexOf(";") > -1 && text.lastIndexOf(";") !== text.length - 1) return;
        if (text.replace(matchDot, "") === aliasName && n === 0) {
            let str = "";
            if (textArr[j - 1] && textArr[j - 1] === ")") {
                for (let k = 0; k < textArr.length; k++) {
                    if (k <= j) str = str + " " + textArr[k];
                    else break;
                }
                const subText = extractSubQuery(str, 0, true);
                if (subText) parseSubText(subText);
            } else {
                const table = textArr[j - 1];
                const keys = global.tbToColumns[table] || [];
                displayColumns(keys);
                break;
            }
        }
        if (text === ")") n++;
        if (text === "(") n--;
        if (n === -1) break;
    }
}

/**
 *
 * @param afterCursorText {string}
 * @param aliasName {string}
 */
function parseAfterText(afterCursorText, aliasName) {
    const textArr = afterCursorText.split(" ");
    let tempNum = 0;
    for (let i = 0; i < textArr.length; i++) {
        const text = textArr[i];
        if (text === "(") tempNum--;
        if (text === ")") tempNum++;
        if (text === "from") break;
    }
    let n = tempNum;
    for (let i = 0; i < textArr.length; i++) {
        const text = textArr[i];
        if (n === 0 && aliasName === text.replace(matchDot, "")) {
            const prevText = textArr[i - 1];
            if (prevText === ")") {
                let str = "";
                for (let j = 0; j < textArr.length; j++) {
                    const textJ = textArr[j];
                    if (j <= i) str = str + " " + textJ;
                    else break;
                }
                const subText = extractSubQuery(str, 0, true);
                if (subText) parseSubText(subText);
                break;
            } else {
                const table = textArr[i - 1];
                const keys = global.tbToColumns[table] || [];
                displayColumns(keys);
            }
        }
        if (text === "(") n++;
        if (text === ")") n--;
    }
}

/**
 *
 * @param subText {string}
 * @param pos {number}
 * @param isReverse {boolean}
 */
function extractSubQuery(subText, pos, isReverse) {
    let curText = subText.substring(pos);
    let textArr = curText.split("");
    let n = 0;

    let leftBrackets = null,
        rightBrackets = null,
        leftBracketsArr = [],
        rightBracketsArr = [],
        subTextStr = "";
    if (!isReverse) {
        for (let i = 0; i < textArr.length; i++) {
            const text = textArr[i];
            if (text === "(") {
                if (leftBrackets === null) leftBrackets = i;
                n++;
            }
            if (text === ")") {
                n--;
                rightBracketsArr.push(i);
                if (n === 0) {
                    rightBrackets = rightBracketsArr[rightBracketsArr.length - 1];
                    if (leftBrackets || leftBrackets === 0) subTextStr = curText.substring(leftBrackets, rightBrackets + 1);
                    return subTextStr;
                }
            }
        }
        if (leftBrackets) subTextStr = curText.substring(leftBrackets);
    } else {
        for (let k = textArr.length - 1; k >= 0; k--) {
            const text = textArr[k];
            if (text === ")") {
                if (rightBrackets === null) rightBrackets = k;
                n++;
            }
            if (text === "(") {
                n = n - 1;
                leftBracketsArr.push(k);
                if (n === 0) {
                    leftBrackets = leftBracketsArr[leftBracketsArr.length - 1];
                    if (rightBrackets || rightBrackets === 0) subTextStr = curText.substring(leftBrackets, rightBrackets + 1);
                    return subTextStr;
                }
            }
        }
    }
    return subTextStr;
}

/**
 *
 * @param text {string}
 */
function parseSubText(text) {
    text = text
        .replace(/^\(/, "")
        .replace(/\)$/, "")
        .trim();
    let newText = text.trim(),
        newTextArr = newText.split(""),
        n = 0,
        startCh = 0,
        keys = [],
        apartTextArr = [],
        beforeKeyTextArr = text.match(/select\s+(.*?)\s+from/gi),
        beforeKey = [];
    if (!beforeKeyTextArr) return;
    for (let i = 0; i < beforeKeyTextArr.length; i++) {
        const keyText = beforeKeyTextArr[i];
        const textArr = keyText.match(/select\s+(.*?)\s+from/i);
        if (!textArr) return;
        beforeKey = [...beforeKey, ...textArr[1].split(",")];
    }
    for (let k = 0; k < newTextArr.length; k++) {
        const textStr = newTextArr[k];
        if (textStr === "(") {
            n++;
        }
        if (textStr === ")") {
            n--;
        }
        if (n === 0 && textStr === ",") {
            const apartText = text.substring(startCh, k).trim();
            const apartTextSp = apartText.split(",");
            if (apartTextSp.length > 1) {
                if (beforeKey.indexOf(apartTextSp[apartTextSp.length - 1]) === -1) {
                    startCh = k + 1;
                    apartTextArr.push(apartText);
                }
            } else {
                if (beforeKey.indexOf(apartTextSp[0].replace(/^select\s+/i, "")) === -1) {
                    startCh = k + 1;
                    apartTextArr.push(apartText);
                }
            }
        }
    }
    apartTextArr.push(text.substring(startCh).trim());
    let num = 0;
    for (let i = 0; i < apartTextArr.length; i++) {
        const apartText = apartTextArr[i];
        extractKeys(apartText, function(data, type) {
            num++;
            keys = [...keys, ...data];
            keys = Array.from(new Set(keys));
            if (num === apartTextArr.length) {
                console.log(keys, "all key");
                displayColumns(keys);
            }
        });
    }
}

/**
 *
 * @param keys {string[]}
 */
function displayColumns(keys) {
    observable.comp = keys.map(t => t.trim());
}

/**
 *
 * @param text {string}
 * @param fn {function}
 */
function extractKeys(text, fn) {
    text = text
        .trim()
        .replace(/^\(/, "")
        .replace(/\)$/, "");
    let obj = {
        table: [],
        addKey: []
    };
    obj = getEffectiveKey(text, obj);
    let keys = [];
    if (obj.table.length > 0) {
        const len = obj.table.length - 1;
        for (let i = 0; i < obj.table.length; i++) {
            const table = obj.table[i];
            const curKeys = global.tbToColumns[table] || [];
            keys = [...keys, ...curKeys];
            if (i === len) {
                fn(keys);
            }
        }
    } else {
        const len = obj.addKey.length - 1;
        for (let i = 0; i < obj.addKey.length; i++) {
            keys.push(obj.addKey[i]);
            if (i === len) {
                fn(keys);
            }
        }
    }
}

/**
 * 获取当前sql有效的所有key，从左到右、从外向内查找符合条件的sql，并处理匹配出第一条
 * @param sql {string}
 * @param keyObj {{addKey: string[], table: string[]}}
 * @returns {{addKey: string[], table: string[]}|*}
 */
function getEffectiveKey(sql, keyObj) {
    const keyReg = /select\s+(.*?)\s+from\s+(.*)/i;
    const keyRegMatch = sql.match(keyReg);
    if (keyRegMatch) {
        // 判断当前子查询第一层是否有联查
        const allKeySqlArr = parseAllKeySql(sql);
        if (allKeySqlArr.length > 1) {
            for (let i = 0; i < allKeySqlArr.length; i++) {
                getEffectiveKey(allKeySqlArr[i], keyObj);
            }
        } else {
            const itemArr = keyRegMatch[1].replace(/\(\s+(.*?)\s+\)/g, SPECIAL_DOT).split(",");
            const result = itemArr.map(t => {
                const lastSpaceIndex = t.lastIndexOf(" ");
                return t.substring(lastSpaceIndex + 1, t.length);
            });
            for (let i = 0; i < result.length; i++) {
                const text = result[i];
                if (text.includes(")") || text.includes("case ")) {
                    // 判断是否为基础函数条件
                    const getKeyFromRight = getSqlFromRight(text, text.length, "");
                    keyObj.addKey.push(getKeyFromRight);
                } else if (text.includes(".")) {
                    const at = text.split(".");
                    if (at[1].trim() === "*") {
                        // 从当前位置向后查找，匹配出对应的table或者子查询
                        const behindStr = sql.substring(keyRegMatch ? (keyRegMatch.index ? keyRegMatch.index : 0) : 0);
                        keyObj = getSqlFromLeft(behindStr, at[0].trim(), keyObj);
                    } else {
                        const obj = text.match(/\w+\s+(\w+)/);
                        if (obj) keyObj.addKey.push(obj[1]);
                        else keyObj.addKey.push(at[1]);
                    }
                } else {
                    if (text.includes("*")) {
                        const index = keyRegMatch.index;
                        if (index && index > 1) {
                            return { table: [], addKey: [] }; // 如果当前不是最左边的匹配项，则不给予提示123
                        }
                        const allKeySql = parseAllKeySql(sql);
                        for (let j = 0; j < allKeySql.length; j++) {
                            const itemTrimJ = allKeySql[j].trim();
                            const innerKeyReg = itemTrimJ.match(keyReg);
                            if (innerKeyReg) {
                                if (innerKeyReg[2].indexOf("(") === 0) {
                                    const subSql = extractSubQuery(sql, 0, false)
                                        .replace(/^\(/, "")
                                        .replace(/\)$/, "")
                                        .trim();
                                    getEffectiveKey(subSql, keyObj);
                                } else {
                                    const regTableMatch = itemTrimJ.match(/select\s+(.*?)\s+from\s+(\w*)/i);
                                    // /select\s+(.*?)\s+from\s+(\w)/i  /select\s+(.*?)\s+from\s+(\w+\.\w+)/g
                                    if (regTableMatch) {
                                        if (regTableMatch[1].includes("*")) keyObj.table.push(regTableMatch[2]);
                                        else keyObj.addKey = keyObj.addKey.concat(regTableMatch[1].split(","));
                                    }
                                    // const regTableSingleMatch = itemTrimJ.match(/^(\w+\.\w+)/i);
                                    // debugger;
                                    // if (regTableSingleMatch) keyObj.table.push(regTableSingleMatch[1]);
                                }
                            }
                        }
                    } else {
                        const obj = text.match(/\w+\s+(\w+)/);
                        if (obj) keyObj.addKey.push(obj[1]);
                        else keyObj.addKey.push(text.trim());
                    }
                }
            }
        }
    }
    const sqlPreCheck = sql.match(/^(\w+\.\w+)/i);
    if (sqlPreCheck) keyObj.table.push(sqlPreCheck[1]);
    return keyObj;
}

/**
 * 解析 * 条件
 * @param sql {string}
 * @returns {[]}
 */
function parseAllKeySql(sql) {
    const repSql = sql.replace(/(union|(union\s+all)|(left\s+join)|(right\s+join)|(inner\s+join))/gi, SPECIAL_DOT);
    let repSqlArr = repSql.split(" ");
    let n = 0;
    let endIndex = 0; //记录最后一次截取字符串的索引位置
    let eSqlArr = [];
    let repSqlStr = "";
    for (let i = repSqlArr.length - 1; i >= 0; i--) {
        const text = repSqlArr[i];
        if (n === 0 && text === SPECIAL_DOT) {
            for (let j = 0; j < repSqlArr.length; j++) {
                if (j < i && j >= endIndex) {
                    repSqlStr += " " + repSqlArr[j];
                }
            }
            eSqlArr.push(repSqlStr);
            endIndex = i + 1;
        }
        if (text.includes(")")) n++;
        if (text.includes("(")) n--;
    }
    let repSqlStrLast = "";
    for (let i = 0; i < repSqlArr.length; i++) {
        if (i >= endIndex) repSqlStrLast += " " + repSqlArr[i];
    }
    eSqlArr.push(repSqlStrLast);
    return eSqlArr;
}

/**
 * 从右向左找出key
 * @param query {string}
 * @param pos {number}
 * @param res {string}
 * @returns {*}
 */
function getSqlFromRight(query, pos, res) {
    const reg = /((\)|end)\s*)(\w+)/i;
    const be = query.substring(pos, pos - 1);
    const regMatch = res.match(reg);
    if (regMatch) return regMatch[3];
    else {
        res = be + res;
        return getSqlFromRight(query, pos - 1, res);
    }
}

/**
 *
 * @param query {string}
 * @param aliasName {string}
 * @param keyObj {{addKey: string[], table: string[]}}
 * @returns {{addKey: string[], table: string[]}|*}
 */
function getSqlFromLeft(query, aliasName, keyObj) {
    query = query.replace(/\s+/g, " ");
    const queryArr = query.split(" ");
    let n = 0;
    const temSqlArr = [];
    for (let i = 0; i < queryArr.length; i++) {
        const text = queryArr[i];
        temSqlArr.push(text);
        if (aliasName === text.replace(/([;,(])/g, "") && n === 0) {
            // 如果前面为子查询，提取子查询再次处理
            if (queryArr[i - 1].includes(")")) {
                const temSqlStr = temSqlArr.join(" ");
                let subSql = extractSubQuery(temSqlStr, 0, true);
                if (subSql) {
                    subSql = subSql.replace(/^\(/, "").replace(/\)$/, "");
                    keyObj = getEffectiveKey(subSql, keyObj);
                    return keyObj;
                }
            } else {
                keyObj.table.push(queryArr[i - 1]);
                return keyObj;
            }
        }
        if (text.includes("(")) n++;
        if (text.includes(")")) n--;
    }
    return keyObj;
}

function definedCursor(editor) {
    const cursor = editor.getCursor();
    const token = editor.getTokenAt(cursor);
    console.log(token);
}
export { whereHint, definedCursor, global };
