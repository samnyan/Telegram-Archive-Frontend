import type { AdminViewer, AdminToken, AuditLogEntry } from '../types'

const BASE: RequestInit = { credentials: 'include' }

// ── Viewers ───────────────────────────────────────────────
export async function fetchViewers(): Promise<{ viewers: AdminViewer[] }> {
  const res = await fetch('/api/admin/viewers', BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchAdminChats(): Promise<{ chats: { id: number; title: string }[] }> {
  const res = await fetch('/api/admin/chats', BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function createViewer(body: {
  username: string
  password: string
  allowed_chat_ids: number[] | null
  is_active: number
  no_download: number
}): Promise<void> {
  const res = await fetch('/api/admin/viewers', {
    ...BASE,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw res
}

export async function updateViewer(
  id: number,
  body: {
    username: string
    password: string
    allowed_chat_ids: number[] | null
    is_active: number
    no_download: number
  }
): Promise<void> {
  const res = await fetch(`/api/admin/viewers/${id}`, {
    ...BASE,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw res
}

export async function deleteViewer(id: number): Promise<void> {
  await fetch(`/api/admin/viewers/${id}`, { ...BASE, method: 'DELETE' })
}

// ── Tokens ────────────────────────────────────────────────
export async function fetchTokens(): Promise<{ tokens: AdminToken[] }> {
  const res = await fetch('/api/admin/tokens', BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function createToken(body: {
  label: string | null
  allowed_chat_ids: number[]
  no_download: boolean
  expires_at: string | null
}): Promise<{ token: string }> {
  const res = await fetch('/api/admin/tokens', {
    ...BASE,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw res
  return res.json()
}

export async function revokeToken(id: number): Promise<void> {
  await fetch(`/api/admin/tokens/${id}`, {
    ...BASE,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_revoked: true }),
  })
}

export async function deleteToken(id: number): Promise<void> {
  await fetch(`/api/admin/tokens/${id}`, { ...BASE, method: 'DELETE' })
}

// ── Audit ─────────────────────────────────────────────────
export async function fetchAuditLogs(params: {
  limit?: number
  action?: string
}): Promise<{ logs: AuditLogEntry[] }> {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', String(params.limit))
  if (params.action) query.set('action', params.action)

  const url = `/api/admin/audit?${query}`
  const res = await fetch(url, BASE)
  if (!res.ok) throw res
  return res.json()
}
