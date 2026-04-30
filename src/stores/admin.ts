import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AdminViewer, AdminToken, AuditLogEntry } from '../types'
import * as adminApi from '../api/admin'

export const useAdminStore = defineStore('admin', () => {
  const showPanel = ref(false)
  const activeTab = ref<'viewers' | 'tokens' | 'audit'>('viewers')

  // ── Viewers ─────────────────────────────────────────────
  const viewers = ref<AdminViewer[]>([])
  const adminChats = ref<{ id: number; title: string }[]>([])
  const viewerForm = ref({
    username: '', password: '', allowed_chat_ids: [] as number[],
    is_active: true, no_download: false,
  })
  const editingId = ref<number | null>(null)
  const viewerError = ref('')

  // ── Tokens ──────────────────────────────────────────────
  const tokens = ref<AdminToken[]>([])
  const tokenForm = ref({
    label: '', allowed_chat_ids: [] as number[],
    no_download: false, expires_at: '',
  })
  const tokenError = ref('')
  const newToken = ref('')
  const newTokenUrl = computed(() => {
    if (!newToken.value) return ''
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = `token=${encodeURIComponent(newToken.value)}`
    return url.toString()
  })

  // ── Audit ───────────────────────────────────────────────
  const auditLogs = ref<AuditLogEntry[]>([])
  const auditAction = ref('')

  // ── Actions ─────────────────────────────────────────────
  async function openPanel() {
    showPanel.value = true
    await Promise.all([
      loadViewers(),
      loadAdminChats(),
      loadAuditLogs(),
      loadTokens(),
    ])
  }

  async function loadViewers() {
    try {
      const data = await adminApi.fetchViewers()
      viewers.value = data.viewers
    } catch { /* ignore */ }
  }

  async function loadAdminChats() {
    try {
      const data = await adminApi.fetchAdminChats()
      adminChats.value = data.chats
    } catch { /* ignore */ }
  }

  async function saveViewer() {
    viewerError.value = ''
    const body = {
      username: viewerForm.value.username,
      password: viewerForm.value.password,
      allowed_chat_ids: viewerForm.value.allowed_chat_ids.length > 0 ? viewerForm.value.allowed_chat_ids : [],
      is_active: viewerForm.value.is_active ? 1 : 0,
      no_download: viewerForm.value.no_download ? 1 : 0,
    }
    try {
      if (editingId.value) {
        await adminApi.updateViewer(editingId.value, body)
      } else {
        await adminApi.createViewer(body)
      }
      resetViewerForm()
      await loadViewers()
    } catch (e: any) {
      const err = await e.json?.().catch(() => ({}))
      viewerError.value = err.detail || 'Failed to save'
    }
  }

  function editViewer(v: AdminViewer) {
    editingId.value = v.id
    viewerForm.value = {
      username: v.username,
      password: '',
      allowed_chat_ids: v.allowed_chat_ids ? [...v.allowed_chat_ids] : [],
      is_active: !!v.is_active,
      no_download: !!v.no_download,
    }
  }

  async function deleteViewer(v: AdminViewer) {
    if (!confirm(`Delete viewer "${v.username}"?`)) return
    await adminApi.deleteViewer(v.id)
    await loadViewers()
  }

  function cancelEdit() {
    resetViewerForm()
  }

  function resetViewerForm() {
    editingId.value = null
    viewerForm.value = { username: '', password: '', allowed_chat_ids: [], is_active: true, no_download: false }
    viewerError.value = ''
  }

  // ── Tokens ──────────────────────────────────────────────
  async function loadTokens() {
    try {
      const data = await adminApi.fetchTokens()
      tokens.value = data.tokens
    } catch { /* ignore */ }
  }

  async function createToken() {
    tokenError.value = ''
    if (tokenForm.value.allowed_chat_ids.length === 0) {
      tokenError.value = 'Select at least one chat'
      return
    }
    const expiresUtc = tokenForm.value.expires_at
      ? new Date(tokenForm.value.expires_at).toISOString()
      : null
    try {
      const data = await adminApi.createToken({
        label: tokenForm.value.label || null,
        allowed_chat_ids: tokenForm.value.allowed_chat_ids,
        no_download: tokenForm.value.no_download,
        expires_at: expiresUtc,
      })
      newToken.value = data.token
      tokenForm.value = { label: '', allowed_chat_ids: [], no_download: false, expires_at: '' }
      await loadTokens()
    } catch (e: any) {
      const err = await e.json?.().catch(() => ({}))
      tokenError.value = err.detail || 'Failed to create token'
    }
  }

  async function revokeToken(t: AdminToken) {
    if (!confirm(`Revoke token "${t.label || t.id}"?`)) return
    await adminApi.revokeToken(t.id)
    await loadTokens()
  }

  async function deleteToken(t: AdminToken) {
    if (!confirm(`Delete token "${t.label || t.id}"?`)) return
    await adminApi.deleteToken(t.id)
    await loadTokens()
  }

  // ── Audit ───────────────────────────────────────────────
  async function loadAuditLogs() {
    try {
      const data = await adminApi.fetchAuditLogs({
        limit: 50,
        action: auditAction.value || undefined,
      })
      auditLogs.value = data.logs
    } catch { /* ignore */ }
  }

  return {
    showPanel, activeTab,
    viewers, adminChats, viewerForm, editingId, viewerError,
    tokens, tokenForm, tokenError, newToken, newTokenUrl,
    auditLogs, auditAction,
    openPanel, loadViewers, saveViewer, editViewer, deleteViewer, cancelEdit,
    loadTokens, createToken, revokeToken, deleteToken,
    loadAuditLogs,
  }
})
