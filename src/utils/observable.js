import Vue from "vue";
import { guid } from "@/utils/index";
const uid = guid();

const observable = Vue.observable({
    activeName: uid,
    tabList: [
        {
            label: "Run#0",
            name: uid,
            content: "",
            curContent: `CREATE TABLE user_log (                      

    user_id VARCHAR,

    item_id VARCHAR,

    category_id VARCHAR,

    behavior VARCHAR

) WITH (

    connector.type = '',

);
select * from user_log as t where;

CREATE TABLE pvuv_sink1 (

    user_id VARCHAR,

    pv BIGINT,

    uv BIGINT

) WITH (

    connector.type = '',

);
select * from (select * from user_log as t where t.user_id) as m where m
`,
            rangeContent: "",
            instance: null
        }
    ],
    comp: [
        "connector.type = '',",
        "add ",
        "add jar ",
        "after ",
        "all ",
        "alter table ",
        "and ",
        "as ",
        "between ",
        "case ",
        "change ",
        "clustered by ",
        "column ",
        "columns ",
        "comment ",
        "create table ",
        "create temporary function ",
        "desc ",
        "distinct ",
        "drop table ",
        "else ",
        "end ",
        "exists ",
        "fields ",
        "fileformat ",
        "format ",
        "formatted ",
        "from ",
        "function ",
        "functions ",
        "group by ",
        "having ",
        "if not exists ",
        "insert into ",
        "insert overwrite ",
        "left join ",
        "limit ",
        "like ",
        "on ",
        "or ",
        "orcfile ",
        "order by ",
        "partition ",
        "partitions ",
        "rename to ",
        "right join ",
        "select ",
        "sequencefile ",
        "set ",
        "show ",
        "sort by ",
        "stored as ",
        "table ",
        "terminated by ",
        "textfile ",
        "then ",
        "union ",
        "union all ",
        "where ",
        "when ",
        "with ",
        "length() #简介",
        "reverse() ",
        "concat(,) ",
        "concat_ws(,) ",
        "substr(,) ",
        "substring(,) ",
        "cast(as) ",
        "lower() ",
        "upper() ",
        "trim() ",
        "ltrim() ",
        "rtrim() ",
        "regexp_replace(,) ",
        "regexp_extract(,) ",
        "get_json_object(,) ",
        "parse_url(,) ",
        "parse_url_tuple(,) ",
        "find_in_set(,) ",
        "to_date() ",
        "date_add(,) ",
        "date_sub(,) ",
        "count() ",
        "sum() ",
        "max() ",
        "min() ",
        "avg() "
    ], // 关键字提示，核心= > 切换不同的关键字来达到提示不同数据的目的
    autoComplete: true //是否开启自动提示
});

const action = {
    addOneToTabList(tab) {
        observable.tabList.push(tab);
    },
    updateActiveName(name) {
        observable.activeName = name;
    }
};

export { observable, action };
