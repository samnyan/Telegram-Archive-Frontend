/** Escape HTML entities */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/** Convert plain URLs into clickable <a> links */
export function linkifyText(text: string | null | undefined): string {
  if (!text) return ''
  const escaped = escapeHtml(text)
  // Exclude quotes from URL match to prevent attribute breakout in href
  const urlRegex = /(https?:\/\/[^\s<"']+)/g
  return escaped.replace(urlRegex, (match) => {
    const href = match
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '%3C')
      .replace(/&gt;/g, '%3E')
      .replace(/&quot;/g, '%22')
      .replace(/"/g, '%22')
      .replace(/'/g, '%27')
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`
  })
}

/** Extract first 2 initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

/** Simple hash for color generation */
export function hashColor(id: number): number {
  let hash = 0
  const str = String(id)
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash) % 360
}
