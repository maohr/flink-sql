<template>
    <div id="app">
        <el-tabs v-model="activeName" type="border-card">
            <el-tab-pane v-for="pane in tabList" :key="pane.name" :label="pane.label" :name="pane.name" :closable="tabList.length > 1">
                <code-area :content="pane.content" :key="pane.name" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import codeArea from "@/components/codeArea/main.vue";
import { observable, action } from "@/utils/observable";

export default {
    name: "App",
    components: {
        codeArea
    },
    computed: {
        activeName: {
            set(name) {
                action.updateActiveName(name);
            },
            get() {
                return observable.activeName;
            }
        },
        tabList() {
            return observable.tabList;
        }
    }
};
</script>
