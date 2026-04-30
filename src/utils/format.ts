/**
 * Timezone-aware date/time formatting.
 * Uses Intl APIs — no moment.js dependency.
 */

let _timezone = 'Europe/Madrid'

export function setDefaultTimezone(tz: string) {
  _timezone = tz
  DATE_FMT_CACHE.clear()
}

export function getDefaultTimezone() {
  return _timezone
}

const DATE_FMT_CACHE = new Map<string, Intl.DateTimeFormat>()

function dateFmt(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options)
  if (!DATE_FMT_CACHE.has(key)) {
    DATE_FMT_CACHE.set(key, new Intl.DateTimeFormat('en-US', { ...options, timeZone: _timezone }))
  }
  return DATE_FMT_CACHE.get(key)!
}

/** Parse a UTC ISO/DB string into a Date, respecting timezone */
function parseUTC(dateStr: string): Date {
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  return d
}

/** "HH:mm" in viewer timezone */
export function formatTime(dateStr: string): string {
  const d = parseUTC(dateStr)
  return dateFmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}

/** "Mon D" or "Today"/"Yesterday" */
export function formatDate(dateStr: string): string {
  const d = parseUTC(dateStr)
  const now = new Date()
  const fmt = dateFmt({ month: 'short', day: 'numeric' })
  const dStr = dateFmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const nStr = dateFmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

  if (dStr === nStr) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = dateFmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(yesterday)
  if (dStr === yStr) return 'Yesterday'
  return fmt.format(d)
}

/** "MMMM D, YYYY" */
export function formatDateFull(dateStr: string): string {
  const d = parseUTC(dateStr)
  return dateFmt({ month: 'long', day: 'numeric', year: 'numeric' }).format(d)
}

/** K/M suffix for large numbers */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return num.toLocaleString()
}

/** MB → GB/TB */
export function formatSize(sizeMB: number): string {
  if (!sizeMB) return '0 MB'
  if (sizeMB >= 1024 * 1024) return (sizeMB / (1024 * 1024)).toFixed(2) + ' TB'
  if (sizeMB >= 1024) return (sizeMB / 1024).toFixed(1) + ' GB'
  return sizeMB.toFixed(0) + ' MB'
}

/** Relative time for stats */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffH = diffMs / 3600000
  if (diffH < 1) return 'moments ago'
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Get YYYY-MM-DD string in viewer timezone for date comparison */
export function dateKeyInTz(dateStr: string): string {
  const d = parseUTC(dateStr)
  return dateFmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
