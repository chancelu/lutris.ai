<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/use-auth'

const router = useRouter()
const { signUp, sendOtp, verifyOtp, authError } = useAuth()

type Mode = 'login' | 'signup'
type Step = 'email' | 'otp' | 'signup-done'

const mode = ref<Mode>('login')
const step = ref<Step>('email')
const email = ref('')
const otpCode = ref('')
const submitting = ref(false)

async function handleEmail() {
  if (!email.value.trim()) return
  submitting.value = true
  authError.value = ''

  if (mode.value === 'signup') {
    const ok = await signUp(email.value.trim())
    submitting.value = false
    if (ok) step.value = 'signup-done'
  } else {
    const ok = await sendOtp(email.value.trim())
    submitting.value = false
    if (ok) step.value = 'otp'
  }
}

async function handleOtp() {
  if (otpCode.value.length !== 6) return
  submitting.value = true
  const ok = await verifyOtp(email.value.trim(), otpCode.value)
  submitting.value = false
  if (ok) router.push('/editor')
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  step.value = 'email'
  authError.value = ''
  otpCode.value = ''
}

function backToEmail() {
  step.value = 'email'
  otpCode.value = ''
  authError.value = ''
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#FBF8F3] px-4">
    <!-- Warm decorative blobs -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute left-1/4 top-1/3 size-[400px] rounded-full bg-[#F0D9B5]/30 blur-[100px]" />
      <div class="absolute right-1/3 bottom-1/4 size-[350px] rounded-full bg-[#B5D8D0]/25 blur-[100px]" />
    </div>

    <div class="relative z-10 w-full max-w-sm">
      <!-- Mascot -->
      <div class="mb-6 text-center">
        <img src="/lutris-otter.png" alt="Lutris.ai" class="mx-auto mb-3 h-16 w-auto object-contain drop-shadow-md" style="animation: bounce 2.5s ease-in-out infinite" />
        <h1 class="text-2xl font-bold text-[#2D2A26]" style="font-family: Georgia, serif">Lutris.ai</h1>
        <p class="mt-1 text-sm text-[#8B7E6A]">AI-native design tool</p>
      </div>

      <!-- Card -->
      <div class="rounded-2xl border border-[#E8E0D4] bg-white/80 p-8 shadow-lg shadow-[#D4C4A8]/10 backdrop-blur-sm">

        <!-- Email step -->
        <template v-if="step === 'email'">
          <h2 class="mb-1 text-lg font-semibold text-[#2D2A26]">
            {{ mode === 'login' ? '欢迎回来 👋' : '创建账号 🦦' }}
          </h2>
          <p class="mb-6 text-sm text-[#8B7E6A]">
            {{ mode === 'login' ? '输入邮箱，我们会发送验证码' : '输入邮箱，我们会发送确认链接' }}
          </p>
          <form @submit.prevent="handleEmail">
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              required
              autofocus
              class="mb-4 w-full rounded-xl border border-[#E8E0D4] bg-[#FDFBF8] px-4 py-3 text-sm text-[#2D2A26] outline-none transition placeholder:text-[#C4B9A8] focus:border-[#3B7A6B] focus:ring-2 focus:ring-[#3B7A6B]/20"
            />
            <p v-if="authError" class="mb-3 text-xs text-red-500">{{ authError }}</p>
            <button
              type="submit"
              :disabled="submitting"
              class="w-full rounded-xl bg-[#3B7A6B] py-3 text-sm font-medium text-white transition hover:bg-[#2E6355] disabled:opacity-50"
            >
              {{ submitting ? '发送中...' : mode === 'login' ? '发送验证码' : '发送确认邮件' }}
            </button>
          </form>
          <p class="mt-5 text-center text-xs text-[#8B7E6A]">
            {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
            <button class="ml-1 font-medium text-[#3B7A6B] hover:underline" @click="switchMode">
              {{ mode === 'login' ? '注册' : '登录' }}
            </button>
          </p>
        </template>

        <!-- OTP step (login) -->
        <template v-else-if="step === 'otp'">
          <h2 class="mb-1 text-lg font-semibold text-[#2D2A26]">输入验证码</h2>
          <p class="mb-6 text-sm text-[#8B7E6A]">
            6 位验证码已发送到 <span class="font-medium text-[#2D2A26]">{{ email }}</span>
          </p>
          <form @submit.prevent="handleOtp">
            <input
              v-model="otpCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              required
              autofocus
              class="mb-4 w-full rounded-xl border border-[#E8E0D4] bg-[#FDFBF8] px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-[#2D2A26] outline-none transition placeholder:text-[#D4C4A8] focus:border-[#3B7A6B] focus:ring-2 focus:ring-[#3B7A6B]/20"
            />
            <p v-if="authError" class="mb-3 text-xs text-red-500">{{ authError }}</p>
            <button
              type="submit"
              :disabled="submitting || otpCode.length !== 6"
              class="w-full rounded-xl bg-[#3B7A6B] py-3 text-sm font-medium text-white transition hover:bg-[#2E6355] disabled:opacity-50"
            >
              {{ submitting ? '验证中...' : '验证登录' }}
            </button>
          </form>
          <button class="mt-4 w-full text-center text-xs text-[#8B7E6A] hover:text-[#3B7A6B]" @click="backToEmail">
            ← 返回
          </button>
        </template>

        <!-- Signup done -->
        <template v-else-if="step === 'signup-done'">
          <div class="text-center">
            <div class="mb-3 text-3xl">📬</div>
            <h2 class="mb-2 text-lg font-semibold text-[#2D2A26]">确认邮件已发送</h2>
            <p class="mb-6 text-sm text-[#8B7E6A]">
              请查看 <span class="font-medium text-[#2D2A26]">{{ email }}</span> 的收件箱，点击确认链接完成注册。
            </p>
            <button
              class="w-full rounded-xl bg-[#3B7A6B] py-3 text-sm font-medium text-white transition hover:bg-[#2E6355]"
              @click="mode = 'login'; step = 'email'"
            >
              已确认，去登录
            </button>
          </div>
        </template>
      </div>

      <p class="mt-6 text-center text-xs text-[#B0A898]">
        Open source · Free forever · No credit card
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
</style>
