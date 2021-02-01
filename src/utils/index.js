/**
 * 唯一name
 * @returns {string}
 */
function guid() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
}

/**
 * 获取最终sql string
 */
const STR_SPLIT = "↕";
function getResultSql(sql) {
    let sqlArr = (sql || "").split("");
    let isSingleBegin = false;
    let isDoubleBegin = false;
    for (let i = 0; i < sqlArr.length; i++) {
        const str = sqlArr[i];
        const prevStr = sqlArr[i - 1];
        if (str === "'" && prevStr !== "\\" && !isDoubleBegin) {
            isSingleBegin = !isSingleBegin;
        }
        if (str === '"' && prevStr !== "\\" && !isSingleBegin) {
            isDoubleBegin = !isDoubleBegin;
        }
        if (str === ";") {
            if (isSingleBegin || isDoubleBegin) {
                sqlArr[i] = STR_SPLIT;
            }
        }
    }
    return sqlArr.join("");
}
export { guid, STR_SPLIT, getResultSql };
