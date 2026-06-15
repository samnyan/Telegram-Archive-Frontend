import type { MediaCounts, MediaGalleryResponse } from '../types'

const BASE: RequestInit = { credentials: 'include' }

export async function fetchChatMedia(params: {
  chatId: number
  types?: string[]
  limit?: number
  beforeId?: string
}): Promise<MediaGalleryResponse> {
  const query = new URLSearchParams()
  query.set('limit', String(params.limit ?? 50))
  if (params.types?.length) query.set('types', params.types.join(','))
  if (params.beforeId) query.set('before_id', params.beforeId)

  const res = await fetch(`/api/chats/${params.chatId}/media?${query}`, BASE)
  if (!res.ok) throw res
  return res.json()
}

export async function fetchChatMediaCounts(chatId: number): Promise<MediaCounts> {
  const res = await fetch(`/api/chats/${chatId}/media/counts`, BASE)
  if (!res.ok) throw res
  return res.json()
}
