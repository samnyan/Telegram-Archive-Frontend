import type { AuthCheckResponse, LoginResponse, PushConfig, NotificationSettings } from '../types'

const BASE_HEADERS: RequestInit = { credentials: 'include' }

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    ...BASE_HEADERS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw res
  return res.json()
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, BASE_HEADERS)
  if (!res.ok) throw res
  return res.json()
}

export async function checkAuth(): Promise<AuthCheckResponse> {
  return get<AuthCheckResponse>('/api/auth/check')
}

export async function loginWithPassword(username: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>('/api/login', { username, password })
}

export async function loginWithToken(token: string): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/token', { token })
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { ...BASE_HEADERS, method: 'POST' })
}

export async function getPushConfig(): Promise<PushConfig> {
  return get<PushConfig>('/api/push/config')
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return get<NotificationSettings>('/api/notifications/settings')
}
