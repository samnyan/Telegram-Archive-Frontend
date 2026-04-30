<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Message, Chat } from '../../types'
import { useMessageStore } from '../../stores/messages'
import { useChatStore, getChatName } from '../../stores/chat'
import { useAuthStore } from '../../stores/auth'
import { dateKeyInTz } from '../../utils/format'
import { useScrollToBottom } from '../../composables/useScrollToBottom'
import { useInfiniteScroll } from '../../composables/useInfiniteScroll'
import MessageBubble from './MessageBubble.vue'
import { isLightboxMedia, isLightboxImage } from '../../utils/media'

const props = defineProps<{
  chat: Chat | null
  topicId?: number
  topicTitle?: string
}>()

const emit = defineEmits<{
  openLightbox: [msg: Message, index: number]
  openDatePicker: [date: string]
}>()

const store = useMessageStore()
const chatStore = useChatStore()
const auth = useAuthStore()

const messagesContainer = ref<HTMLElement | null>(null)
const loadMoreSentinel = ref<HTMLElement | null>(null)

const { showScrollBtn, handleScroll, scrollToBottom } = useScrollToBottom(messagesContainer)
const infiniteScroll = useInfiniteScroll(messagesContainer, loadMoreSentinel, () => {
  if (store.hasMore && !store.loading && props.chat) {
    store.loadMessages(props.chat.id, props.topicId)
  }
})

// ── 3-second polling auto-refresh ──────────────────────────
let refreshTimer: ReturnType<typeof setInterval> | null = null
let isRefreshing = false

async function checkForNewMessages() {
  if (!props.chat || isRefreshing || store.loading) return
  isRefreshing = true
  try {
    const url = `/api/chats/${props.chat.id}/messages?limit=50&offset=0` +
      (props.topicId ? `&topic_id=${props.topicId}` : '')
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return

    const latestMessages: Message[] = await res.json()
    const latestIds = new Set(latestMessages.map(m => m.id))
    const existingIds = new Set(store.messages.map(m => m.id))

    // New messages
    const newMsgs = latestMessages.filter(m => !existingIds.has(m.id))
    if (newMsgs.length > 0) {
      store.messages.push(...newMsgs)
    }

    // Deleted messages (only within our newest messages that overlap with server's response)
    const sorted = [...store.messages].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const ourNewest = sorted.slice(0, latestMessages.length)
    const deletedIds = ourNewest.filter(m => !latestIds.has(m.id)).map(m => m.id)

    if (deletedIds.length > 0) {
      const set = new Set(deletedIds)
      store.messages = store.messages.filter(m => !set.has(m.id))
    }

    // Auto-scroll if near bottom
    if (newMsgs.length > 0 || deletedIds.length > 0) {
      await nextTick()
      const container = messagesContainer.value
      if (container && container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
        scrollToBottom()
      }
    }
  } catch { /* ignore */ }
  finally { isRefreshing = false }
}

function startRefresh() {
  stopRefresh()
  refreshTimer = setInterval(checkForNewMessages, 3000)
}

function stopRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

onUnmounted(stopRefresh)

// ── GIF Autoplay (IntersectionObserver) ────────────────────
let gifObserver: IntersectionObserver | null = null

function setupGifObserver() {
  if (gifObserver) gifObserver.disconnect()
  gifObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) {
        if (!video.src && video.dataset.src) video.src = video.dataset.src
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, { threshold: 0.1 })
}

function observeGifs() {
  nextTick(() => {
    if (!gifObserver) setupGifObserver()
    document.querySelectorAll('.gif-video').forEach(v => gifObserver?.observe(v))
  })
}

watch(() => store.messages.length, observeGifs, { deep: false })

// ── Album grouping ────────────────────────────────────────
function getGroupedId(msg: Message): string | null {
  const gid = msg.raw_data?.grouped_id
  return gid != null ? String(gid) : null
}

function getAlbumFor(msg: Message): Message[] | null {
  const gid = getGroupedId(msg)
  if (!gid) return null
  return store.sortedMessages.filter(m => getGroupedId(m) === gid)
}

function isFirstInAlbum(msg: Message, index: number): boolean {
  const gid = getGroupedId(msg)
  if (!gid) return false
  if (index > 0) {
    const prev = store.sortedMessages[index - 1]
    if (getGroupedId(prev) === gid) return false
  }
  return true
}

function isHiddenAlbumMsg(msg: Message, index: number): boolean {
  return !!getGroupedId(msg) && !isFirstInAlbum(msg, index)
}

// ── Date separators ──────────────────────────────────────
function showDateSep(index: number): boolean {
  const curr = store.sortedMessages[index]
  const next = store.sortedMessages[index + 1]
  if (!next) return true
  return dateKeyInTz(curr.date) !== dateKeyInTz(next.date)
}

// ── Sender name visibility ───────────────────────────────
function showSenderName(index: number): boolean {
  const curr = store.sortedMessages[index]
  const older = store.sortedMessages[index + 1]
  if (!older) return true
  return older.sender_id !== curr.sender_id
}

// ── Open lightbox ────────────────────────────────────────
function openMedia(msg: Message) {
  if (!isLightboxMedia(msg)) {
    window.open(`/media/${msg.media?.file_path?.split(/[/\\]/).slice(-2).join('/')}`, '_blank')
    return
  }
  const mediaMsgs = store.messages
    .filter(m => isLightboxMedia(m))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const idx = mediaMsgs.findIndex(m => m.id === msg.id)
  emit('openLightbox', msg, idx >= 0 ? idx : 0)
}

// ── Image/media error handling ────────────────────────────
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.onerror = null
  img.src = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="#374151" width="200" height="150"/><text x="100" y="75" text-anchor="middle" fill="#9CA3AF" font-size="12">Media not found</text></svg>`
  )
  img.style.cursor = 'default'
}

function handleMediaError(event: Event) {
  const media = event.target as HTMLElement
  const parent = media.parentElement
  if (parent) {
    parent.innerHTML = `<div class="flex items-center gap-2 text-gray-400 text-sm py-2"><span>Media not found</span></div>`
  }
}

// ── Scroll to message ────────────────────────────────────
function scrollToMessage(msgId: number) {
  const idx = store.sortedMessages.findIndex(m => m.id === msgId)
  if (idx === -1) return
  nextTick(() => {
    const container = messagesContainer.value
    if (!container) return
    const bubbles = container.querySelectorAll('.message-bubble')
    const el = bubbles[idx % bubbles.length]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ;(el as HTMLElement).style.backgroundColor = '#1e40af'
      setTimeout(() => { (el as HTMLElement).style.backgroundColor = '' }, 1000)
    }
  })
}

// ── Load messages when chat changes ──────────────────────
watch(() => props.chat?.id, (newId) => {
  if (newId) {
    store.reset()
    store.setSelectedChatId(newId)
    store.loadMessages(newId, props.topicId)
    store.loadPinnedMessages(newId)
    store.loadChatStats(newId)
    nextTick(() => {
      scrollToBottom()
      infiniteScroll.setup()
    })
    startRefresh()
  }
  const container = messagesContainer.value
  if (container) {
    // scrollTop=0 means bottom (flex-col-reverse)
    container.scrollTop = 0
  }
}, { immediate: false })

// ── Pinned message banner ────────────────────────────────
const pinnedBanner = computed(() =>
  store.pinnedMessages.length > 0 ? store.pinnedMessages[store.currentPinnedIndex] : null
)

function handlePinnedClick() {
  if (pinnedBanner.value) {
    scrollToMessage(pinnedBanner.value.id)
    if (store.pinnedMessages.length > 1) {
      store.currentPinnedIndex = (store.currentPinnedIndex + 1) % store.pinnedMessages.length
    }
  }
}

function closePinnedView() {
  store.showPinnedOnly = false
}
</script>

<template>
  <div class="flex-1 relative min-h-0">
    <!-- Pinned Messages View Header (shown when in pinned-only mode) -->
    <div v-if="store.showPinnedOnly"
      class="px-4 py-3 bg-tg-sidebar border-b border-gray-700 flex items-center gap-3"
    >
      <button @click="closePinnedView"
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1">
        <div class="text-base font-semibold text-white">Pinned Messages</div>
        <div class="text-xs text-tg-muted">{{ store.pinnedMessages.length }} messages</div>
      </div>
    </div>

    <div
      ref="messagesContainer"
      class="h-full overflow-y-auto p-4 flex flex-col-reverse gap-1 messages-scroll"
      @scroll="handleScroll"
    >
      <!-- Loading -->
      <div v-if="store.loading && store.messages.length === 0" class="text-center py-4 text-tg-muted">
        Loading messages...
      </div>

      <!-- Messages loop -->
      <template v-for="(msg, index) in store.sortedMessages" :key="msg.id">
        <MessageBubble
          :message="msg"
          :index="index"
          :chat="chat"
          :album="getAlbumFor(msg)"
          :isFirstInAlbum="isFirstInAlbum(msg, index)"
          :isHiddenAlbum="isHiddenAlbumMsg(msg, index)"
          :showDateSep="showDateSep(index)"
          :showSender="showSenderName(index)"
          :noDownload="auth.noDownload"
          @replyClick="scrollToMessage"
          @openMedia="openMedia"
          @imageError="handleImageError"
          @mediaError="handleMediaError"
          @jumpToDate="emit('openDatePicker', $event)"
        />
      </template>

      <!-- Loading older messages -->
      <div v-if="store.loading && store.messages.length > 0" class="flex justify-center py-4">
        <div class="loading-spinner" />
      </div>

      <!-- Scroll sentinel -->
      <div v-if="store.hasMore && !store.loading && store.messages.length > 0" ref="loadMoreSentinel" class="h-1" />

      <!-- End of history -->
      <div v-if="!store.hasMore && store.messages.length > 0" class="text-center py-3 text-tg-muted text-xs opacity-50">
        Beginning of chat history
      </div>
    </div>

    <!-- Pinned Message Banner (not in pinned-only view) -->
    <div
      v-if="pinnedBanner && !store.showPinnedOnly"
      class="px-4 py-2 bg-tg-sidebar/80 backdrop-blur-sm border-b border-gray-700 flex items-center gap-3"
    >
      <div class="text-blue-400">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0 cursor-pointer hover:bg-white/5 -my-1 py-1 px-1 rounded transition" @click="handlePinnedClick">
        <div class="text-xs text-blue-400 font-semibold mb-0.5 flex items-center gap-2">
          <span>Pinned Message</span>
          <span v-if="store.pinnedMessages.length > 1" class="text-tg-muted font-normal">
            ({{ store.currentPinnedIndex + 1 }} of {{ store.pinnedMessages.length }})
          </span>
        </div>
        <div class="text-sm text-gray-300 truncate">
          {{ pinnedBanner.text || (pinnedBanner.media?.type ? `[${pinnedBanner.media.type}]` : 'Message') }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-tg-muted">{{ new Date(pinnedBanner.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}</span>
        <button @click.stop="store.showPinnedOnly = true" class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Scroll to Bottom Button -->
    <button
      v-if="showScrollBtn"
      @click="scrollToBottom(true); showScrollBtn = false"
      class="scroll-to-bottom-btn"
      title="Scroll to latest"
    >
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:24px;height:24px">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  </div>
</template>
