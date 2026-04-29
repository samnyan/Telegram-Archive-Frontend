import type { Chat, Topic } from '../types'

const BASE: RequestInit = { credentials: 'include' }

export async function fetchChats(params: {
  limit: number
  offset: number
  archived?: boolean
  folderId?: number
  search?: string
}): Promise<{ chats: Chat[]; total: number; has_more: boolean }> {
  const query = new URLSearchParams()
  query.set('limit', String(params.limit))
  query.set('offset', String(params.offset))
  if (params.archived !== undefined) query.set('archived', String(params.archived))
  if (params.folderId) query.set('folder_id', String(params.folderId))
  if (params.search) query.set('search', params.search)

  const url = `/api/chats?${query}`
  const res = await fetch(url, BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchFolders(): Promise<{ folders: { id: number; title: string; emoticon: string | null; chat_count: number }[] }> {
  const res = await fetch('/api/folders', BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchArchivedCount(): Promise<{ count: number }> {
  const res = await fetch('/api/archived/count', BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchTopics(chatId: number): Promise<{ topics: Topic[] }> {
  const res = await fetch(`/api/chats/${chatId}/topics`, BASE)
  if (!res.ok) throw res
  return res.json()
}
