import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const authRequired = ref(false)
  const authCheckFailed = ref(false)
  const loadingAuth = ref(true)
  const loginError = ref('')
  const userRole = ref('')
  const currentUsername = ref('')
  const noDownload = ref(false)
  const loginMode = ref<'password' | 'token'>('password')
  const tokenInput = ref('')
  const loginUsername = ref('')
  const loginPassword = ref('')

  const isMaster = computed(() => userRole.value === 'master')

  async function initialize() {
    try {
      const data = await authApi.checkAuth()
      authRequired.value = data.auth_required
      isAuthenticated.value = data.authenticated
      userRole.value = data.role || ''
      currentUsername.value = data.username || ''
      noDownload.value = data.no_download

      // Auto-login via hash token
      if (!isAuthenticated.value && authRequired.value) {
        const hashParams = window.location.hash.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams()
        const urlParams = new URLSearchParams(window.location.search)
        const urlToken = hashParams.get('token') || urlParams.get('token')
        if (urlToken) {
          try {
            const tokenRes = await authApi.loginWithToken(urlToken)
            if (tokenRes.success) {
              isAuthenticated.value = true
              userRole.value = tokenRes.role || 'token'
              currentUsername.value = tokenRes.username || ''
              noDownload.value = !!tokenRes.no_download
            }
          } catch { /* token expired or invalid */ }
          // Clean URL
          const cleanUrl = new URL(window.location.href)
          cleanUrl.searchParams.delete('token')
          cleanUrl.hash = ''
          window.history.replaceState({}, '', cleanUrl)
        }
      }
    } catch {
      authCheckFailed.value = true
    } finally {
      loadingAuth.value = false
    }
  }

  async function performLogin() {
    loginError.value = ''
    loadingAuth.value = true
    try {
      let res
      if (loginMode.value === 'token') {
        res = await authApi.loginWithToken(tokenInput.value)
      } else {
        res = await authApi.loginWithPassword(loginUsername.value, loginPassword.value)
      }
      if (res.success) {
        isAuthenticated.value = true
        userRole.value = res.role || 'master'
        currentUsername.value = res.username || ''
        noDownload.value = !!res.no_download
      } else {
        loginError.value = 'Login failed'
      }
    } catch (e: any) {
      if (e?.status === 401) {
        loginError.value = loginMode.value === 'token' ? 'Invalid or expired token' : 'Invalid username or password'
      } else if (e?.status === 429) {
        loginError.value = 'Too many attempts. Try again later.'
      } else {
        loginError.value = 'Unexpected error, please try again'
      }
    } finally {
      loadingAuth.value = false
    }
  }

  async function performLogout() {
    try {
      await authApi.logout()
    } catch { /* ignore */ }
    isAuthenticated.value = false
    userRole.value = ''
    currentUsername.value = ''
  }

  return {
    isAuthenticated, authRequired, authCheckFailed, loadingAuth,
    loginError, userRole, currentUsername, noDownload,
    loginMode, tokenInput, loginUsername, loginPassword,
    isMaster,
    initialize, performLogin, performLogout,
  }
})
