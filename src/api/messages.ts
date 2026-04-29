import type { Message } from '../types'

const BASE: RequestInit = { credentials: 'include' }

interface FetchMessagesParams {
  chatId: number
  limit: number
  topicId?: number
  beforeDate?: string
  beforeId?: number
  search?: string
  offset?: number
}

export async function fetchMessages(params: FetchMessagesParams): Promise<Message[]> {
  const query = new URLSearchParams()
  query.set('limit', String(params.limit))

  if (params.topicId) query.set('topic_id', String(params.topicId))
  if (params.beforeDate) query.set('before_date', params.beforeDate)
  if (params.beforeId) query.set('before_id', String(params.beforeId))
  if (params.search) {
    query.set('search', params.search)
    query.set('offset', String(params.offset ?? 0))
  }

  const url = `/api/chats/${params.chatId}/messages?${query}`
  const res = await fetch(url, BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchMessageByDate(
  chatId: number,
  date: string,
  timezone: string
): Promise<Message> {
  const query = new URLSearchParams({ date, timezone })
  const url = `/api/chats/${chatId}/messages/by-date?${query}`
  const res = await fetch(url, BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchPinnedMessages(chatId: number): Promise<Message[]> {
  const res = await fetch(`/api/chats/${chatId}/pinned`, BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function exportChat(chatId: number): Promise<void> {
  window.open(`/api/chats/${chatId}/export`, '_blank')
}
