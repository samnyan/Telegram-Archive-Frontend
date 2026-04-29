<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'
import { useChatStore } from '../../stores/chat'

const auth = useAuthStore()
const chat = useChatStore()
const emit = defineEmits<{ loginSuccess: [] }>()
</script>

<template>
  <div
    class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-10 w-full max-w-md border border-white/20"
  >
    <!-- Telegram Logo -->
    <div class="flex justify-center mb-6">
      <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
        <i class="fab fa-telegram-plane text-5xl text-blue-500"></i>
      </div>
    </div>

    <h1 class="text-3xl font-bold mb-2 text-center text-white">Telegram Archive</h1>

    <p class="text-sm text-blue-100 mb-8 text-center" v-if="auth.authRequired">
      Sign in to access your backup
    </p>
    <p class="text-sm text-amber-200 mb-8 text-center" v-else-if="auth.authCheckFailed">
      ⚠️ Could not verify authentication. Try opening in your browser instead of in-app.
    </p>
    <p class="text-sm text-blue-100 mb-8 text-center" v-else>
      Authentication is disabled
    </p>

    <form
      v-if="auth.authRequired || auth.authCheckFailed"
      @submit.prevent="auth.performLogin().then(() => { if (auth.isAuthenticated) emit('loginSuccess') })"
      class="space-y-5"
    >
      <!-- Login mode toggle -->
      <div class="flex rounded-xl overflow-hidden border border-white/30">
        <button
          type="button"
          @click="auth.loginMode = 'password'"
          :class="auth.loginMode === 'password' ? 'bg-white/30 text-white' : 'text-blue-200 hover:text-white'"
          class="flex-1 py-2 text-sm font-medium transition"
        >Password</button>
        <button
          type="button"
          @click="auth.loginMode = 'token'"
          :class="auth.loginMode === 'token' ? 'bg-white/30 text-white' : 'text-blue-200 hover:text-white'"
          class="flex-1 py-2 text-sm font-medium transition"
        >Share Token</button>
      </div>

      <!-- Password fields -->
      <template v-if="auth.loginMode === 'password'">
        <div>
          <label class="block text-sm font-medium mb-2 text-blue-100">Username</label>
          <input
            v-model="auth.loginUsername" type="text" autocomplete="username"
            placeholder="Enter your username"
            class="w-full bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 rounded-xl px-4 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2 text-blue-100">Password</label>
          <input
            v-model="auth.loginPassword" type="password" autocomplete="current-password"
            placeholder="Enter your password"
            class="w-full bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 rounded-xl px-4 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition"
          />
        </div>
      </template>

      <!-- Token field -->
      <template v-else>
        <div>
          <label class="block text-sm font-medium mb-2 text-blue-100">Share Token</label>
          <input
            v-model="auth.tokenInput" type="text" autocomplete="off"
            placeholder="Paste your share token"
            class="w-full bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 rounded-xl px-4 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition font-mono text-sm"
          />
        </div>
      </template>

      <p v-if="auth.loginError" class="text-sm text-red-200 bg-red-500/20 rounded-lg p-2 text-center">
        {{ auth.loginError }}
      </p>

      <button
        type="submit"
        :disabled="auth.loadingAuth"
        class="w-full bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl py-3 font-semibold transition shadow-lg hover:shadow-xl"
      >
        {{ auth.loadingAuth ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
