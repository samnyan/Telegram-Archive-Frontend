import type { GlobalStats, ChatStats } from '../types'

const BASE: RequestInit = { credentials: 'include' }

export async function fetchGlobalStats(): Promise<GlobalStats> {
  const res = await fetch('/api/stats', BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchChatStats(chatId: number): Promise<ChatStats> {
  const res = await fetch(`/api/chats/${chatId}/stats`, BASE)
  if (!res.ok) throw res
  return res.json()
}
