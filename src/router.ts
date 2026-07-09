import { createRouter, createWebHistory } from 'vue-router'

import EditorView from './views/EditorView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/LandingPage.vue') },
    { path: '/editor', component: EditorView },
    { path: '/editor/:projectId', component: EditorView },
    { path: '/demo', component: EditorView, meta: { demo: true } },
    { path: '/share/:roomId', component: EditorView },
    { path: '/figma-callback', component: () => import('./views/FigmaCallbackView.vue') },
  ],
})

export default router
