import { createHead } from '@unhead/vue/client'
import { createApp } from 'vue'

import './app.css'
import '@/composables/use-theme'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'

import App from './App.vue'
import router from './router'
import { useAuth } from './composables/use-auth'

preloadFonts()

// Init auth before mounting so route guards have session state
const { init: initAuth } = useAuth()
void initAuth()
  .catch((e) => console.warn('[Auth] init failed, continuing without auth:', e))
  .then(() => {
    const head = createHead()
    createApp(App).use(router).use(head).mount('#app')
  })

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
