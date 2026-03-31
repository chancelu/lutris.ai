import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './composables/use-auth'
import { hasSupabaseConfig } from './lib/supabase'

import EditorView from './views/EditorView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/LandingPage.vue') },
    { path: '/login', component: () => import('./views/LoginView.vue') },
    { path: '/editor', component: EditorView },
    { path: '/editor/:projectId', component: EditorView },
    { path: '/demo', component: EditorView, meta: { demo: true } },
    { path: '/share/:roomId', component: EditorView },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && hasSupabaseConfig) {
    const { isLoggedIn, loading } = useAuth()
    if (!loading.value && !isLoggedIn.value) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
  return undefined
})

export default router
