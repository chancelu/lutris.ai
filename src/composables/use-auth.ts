import { ref, computed } from 'vue'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const currentUser = ref<User | null>(null)
const currentSession = ref<Session | null>(null)
const loading = ref(true)
const authError = ref('')
let authUnsub: (() => void) | null = null

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)
  const userEmail = computed(() => currentUser.value?.email ?? '')

  async function init() {
    loading.value = true
    if (!hasSupabaseConfig) {
      loading.value = false
      return
    }
    try {
      authUnsub?.()
      const { data } = await supabase.auth.getSession()
      currentSession.value = data.session
      currentUser.value = data.session?.user ?? null

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        currentSession.value = session
        currentUser.value = session?.user ?? null
      })
      authUnsub = () => subscription.unsubscribe()
    } catch (e) {
      console.warn('[Auth] init failed, continuing without auth:', e)
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string) {
    if (!hasSupabaseConfig) { authError.value = 'Auth not configured'; return false }
    authError.value = ''
    const { error } = await supabase.auth.signUp({
      email,
      password: crypto.randomUUID(),
    })
    if (error) { authError.value = error.message; return false }
    return true
  }

  async function sendOtp(email: string) {
    if (!hasSupabaseConfig) { authError.value = 'Auth not configured'; return false }
    authError.value = ''
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) { authError.value = error.message; return false }
    return true
  }

  async function verifyOtp(email: string, token: string) {
    if (!hasSupabaseConfig) { authError.value = 'Auth not configured'; return false }
    authError.value = ''
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) { authError.value = error.message; return false }
    return true
  }

  async function signOut() {
    if (hasSupabaseConfig) {
      await supabase.auth.signOut()
    }
    currentUser.value = null
    currentSession.value = null
  }

  function getAccessToken() {
    return currentSession.value?.access_token ?? ''
  }

  return {
    currentUser,
    currentSession,
    loading,
    authError,
    isLoggedIn,
    userEmail,
    init,
    signUp,
    sendOtp,
    verifyOtp,
    signOut,
    getAccessToken,
  }
}
