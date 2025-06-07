import { createRouter, createWebHistory } from "vue-router";
import FileView from "./components/file.vue";
import TabView from "./components/tab.vue";

const routes = [
    {
        path: "/file",
        name: "File",
        component: FileView,
    },
    {
        path: "/",
        name: "Tab",
        component: TabView,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;