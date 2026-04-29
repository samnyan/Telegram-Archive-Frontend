// ── Chat / Dialog ──────────────────────────────────────────
export interface Chat {
  id: number
  title: string | null
  first_name: string | null
  last_name: string | null
  username: string | null
  type: 'private' | 'group' | 'channel'
  is_forum: boolean
  last_message_date: string | null
  avatar_url: string | null
  participants_count: number | null
}

// ── Message ────────────────────────────────────────────────
export interface MediaRecord {
  type: string
  file_path: string | null
  file_name: string | null
  mime_type: string | null
}

export interface PollResult {
  option: string
  voters: number
}

export interface PollResults {
  total_voters: number
  results: PollResult[] | null
}

export interface PollAnswer {
  option: string
  text: string
}

export interface Poll {
  question: string
  answers: PollAnswer[]
  quiz: boolean
  results?: PollResults
}

export interface RawData {
  service_type?: 'service'
  post_author?: string
  forward_from_name?: string
  grouped_id?: string | number
  poll?: Poll
}

export interface Reaction {
  emoji: string
  count: number
}

export interface Message {
  id: number
  chat_id: number
  date: string
  text: string
  edit_date: string | null
  is_outgoing: number | null
  sender_id: number | null
  first_name: string | null
  last_name: string | null
  username: string | null
  reply_to_msg_id: number | null
  reply_to_text: string | null
  forward_from_id: number | null
  media: MediaRecord | null
  raw_data: RawData | null
  reactions: Reaction[] | null
}

// ── Folder ─────────────────────────────────────────────────
export interface Folder {
  id: number
  title: string
  emoticon: string | null
  chat_count: number
}

// ── Topic (Forum) ──────────────────────────────────────────
export interface Topic {
  id: number
  title: string
  chat_id: number
  icon_emoji: string | null
  icon_color: number | null
  is_pinned: boolean
  is_closed: boolean
  last_message_date: string | null
  message_count: number
}

// ── Stats ──────────────────────────────────────────────────
export interface GlobalStats {
  chats: number
  messages: number
  media_files: number
  total_size_mb: number
  stats_calculated_at: string | null
  show_stats?: boolean
  timezone?: string
  last_backup_time?: string
  last_backup_time_source?: 'metadata' | 'sync_status'
  listener_active?: boolean
}

export interface ChatStats {
  messages: number
  media_files: number
  total_size_mb: number
}

// ── Auth ───────────────────────────────────────────────────
export interface AuthCheckResponse {
  auth_required: boolean
  authenticated: boolean
  role: string
  username: string
  no_download: boolean
}

export interface LoginResponse {
  success: boolean
  role: string
  username: string
  no_download: boolean
}

// ── Admin ──────────────────────────────────────────────────
export interface AdminViewer {
  id: number
  username: string
  allowed_chat_ids: number[] | null
  is_active: boolean
  no_download: boolean
}

export interface AdminToken {
  id: number
  label: string | null
  allowed_chat_ids: number[] | null
  use_count: number
  last_used_at: string | null
  expires_at: string | null
  no_download: boolean
  is_revoked: boolean
}

export interface AuditLogEntry {
  id: number
  created_at: string
  role: string
  username: string
  action: string
  ip_address: string
}

// ── Push / Notifications ───────────────────────────────────
export interface PushConfig {
  enabled: boolean
  vapid_public_key: string
}

export interface NotificationSettings {
  enabled: boolean
  reason?: string
}

// ── Navigation ─────────────────────────────────────────────
export interface NavStateChatList {
  type: 'chatList'
  filter: 'all' | 'archived' | { folderId: number }
}

export interface NavStateTopics {
  type: 'topics'
  chatId: number
  chatName: string
  chat: Chat
}

export interface NavStateChat {
  type: 'chat'
  chatId: number
  topicId?: number
  topicTitle?: string
}

export type NavState = NavStateChatList | NavStateTopics | NavStateChat

// ── Pagination ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  chats?: T[]
  messages?: T[]
  total: number
  has_more: boolean
}
