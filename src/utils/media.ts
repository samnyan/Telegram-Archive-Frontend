import type { Message } from '../types'

/** Build media serve URL from stored file_path */
export function getMediaUrl(msg: Message): string {
  const path = msg.media?.file_path
  if (!path) return ''
  const parts = path.split(/[/\\]/)
  const filename = parts.pop()!
  const folder = parts.pop()!
  return `/media/${folder}/${filename}`
}

/** Extract display name for documents */
export function getDocumentDisplayName(msg: Message): string {
  let name = msg.media?.file_name || ''
  if (!name && msg.media?.file_path) {
    name = msg.media.file_path.split(/[/\\]/).pop()!
  }
  if (!name) return 'document'
  return name.replace(/^[0-9]+_/, '') || name
}

/** Check if document is actually an image */
export function isImageDocument(msg: Message): boolean {
  const name = (msg.media?.file_name || msg.media?.file_path || '').toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => name.endsWith(ext))) return true
  const mime = (msg.media?.mime_type || '').toLowerCase()
  return mime.startsWith('image/')
}

/** Check if media is audio/voice */
export function isAudioFile(msg: Message): boolean {
  if (msg.media?.type === 'audio' || msg.media?.type === 'voice') return true
  const mime = (msg.media?.mime_type || '').toLowerCase()
  if (mime.startsWith('audio/')) return true
  const name = getDocumentDisplayName(msg).toLowerCase()
  return ['.ogg', '.mp3', '.wav', '.m4a', '.opus', '.flac'].some(ext => name.endsWith(ext))
}

/** Check if media is lightbox-compatible (image or video) */
export function isLightboxMedia(msg: Message): boolean {
  const type = msg.media?.type
  if (!type) return false
  if (['photo', 'video', 'animation'].includes(type)) return true
  if (type === 'document' && isImageDocument(msg)) return true
  return false
}

/** Is this media shown as image in lightbox? */
export function isLightboxImage(msg: Message): boolean {
  const type = msg.media?.type
  return type === 'photo' || (type === 'document' && isImageDocument(msg))
}
