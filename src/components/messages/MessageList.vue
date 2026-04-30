<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Message, Chat } from '../../types'
import { useMessageStore } from '../../stores/messages'
import { useChatStore, getChatName } from '../../stores/chat'
import { useAuthStore } from '../../stores/auth'
import { dateKeyInTz } from '../../utils/format'
import { useScrollToBottom } from '../../composables/useScrollToBottom'
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

const { showScrollBtn, scrollToBottom } = useScrollToBottom(messagesContainer)

// ── Render window (virtual scrolling) ──────────────────────
const RENDER_SIZE = 80
const renderStart = ref(0)
const renderEnd = ref(0)

const visibleMessages = computed(() => {
  const end = Math.min(renderEnd.value, store.sortedMessages.length)
  return store.sortedMessages.slice(renderStart.value, end)
})

function initRenderWindow() {
  renderStart.value = 0
  renderEnd.value = Math.min(RENDER_SIZE, store.sortedMessages.length)
}

function expandRenderWindow() {
  const currentEnd = renderEnd.value
  const total = store.sortedMessages.length
  const newEnd = Math.min(currentEnd + RENDER_SIZE, total)
  if (newEnd > currentEnd) {
    renderEnd.value = newEnd
  }
  // Trim from start if window too large (keep max 2x RENDER_SIZE visible)
  const windowSize = renderEnd.value - renderStart.value
  if (windowSize > RENDER_SIZE * 2) {
    renderStart.value = renderEnd.value - RENDER_SIZE * 2
  }
}

// ── ResizeObserver-based scroll anchoring ──────────────────
let scrollAnchorObserver: ResizeObserver | null = null
let anchorLastHeight = 0

function setupScrollAnchor() {
  if (scrollAnchorObserver) scrollAnchorObserver.disconnect()
  const el = messagesContainer.value
  if (!el) return
  anchorLastHeight = el.scrollHeight
  scrollAnchorObserver = new ResizeObserver(() => {
    const newHeight = el.scrollHeight
    if (newHeight !== anchorLastHeight && anchorLastHeight !== 0) {
      const delta = newHeight - anchorLastHeight
      // flex-col-reverse: when content grows above (older msgs),
      // shift scrollTop by -delta to keep same visual position
      el.scrollTop -= delta
      // Clamp to valid range (safety net)
      const minTop = -(el.scrollHeight - el.clientHeight)
      if (el.scrollTop < minTop) el.scrollTop = minTop
    }
    anchorLastHeight = newHeight
  })
  scrollAnchorObserver.observe(el)
}

function teardownScrollAnchor() {
  if (scrollAnchorObserver) {
    scrollAnchorObserver.disconnect()
    scrollAnchorObserver = null
    anchorLastHeight = 0
  }
}

// ── Scroll RAF throttle ────────────────────────────────────
let scrollRAF = 0
const isAdjustingScroll = ref(false)

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  showScrollBtn.value = target.scrollTop < -300

  if (scrollRAF) return
  scrollRAF = requestAnimationFrame(() => {
    scrollRAF = 0

    const container = messagesContainer.value
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromTop = scrollHeight - Math.abs(scrollTop) - clientHeight

    // When near bottom, reset render window to show newest messages
    if (Math.abs(scrollTop) <= 300 && renderStart.value > 0) {
      const keepSize = renderEnd.value - renderStart.value
      renderStart.value = 0
      renderEnd.value = Math.min(keepSize, store.sortedMessages.length)
    }

    if (distanceFromTop < 1000) {
      expandRenderWindow()
    }

    if (distanceFromTop < 500 && store.hasMore && !store.loading && !isAdjustingScroll.value && props.chat) {
      isAdjustingScroll.value = true
      const chatIdAtCall = props.chat.id
      const prevScrollHeight = container.scrollHeight
      store.loadMessages(props.chat.id, props.topicId).then(() => {
        if (props.chat?.id !== chatIdAtCall) return
        expandRenderWindow()
        // ResizeObserver handles anchoring
        // Clear flag after browser processes everything
        requestAnimationFrame(() => {
          isAdjustingScroll.value = false
        })
      })
    }

    updateUrlHash()
  })
}

// ── URL hash persistence ───────────────────────────────────
function updateUrlHash() {
  if (suppressHashUpdate.value) return
  const container = messagesContainer.value
  if (!container || !props.chat) return
  // Find the message closest to the bottom of the viewport (where user reads)
  const bubbles = container.querySelectorAll('.message-bubble')
  let bottomMsgId: number | null = null
  const containerRect = container.getBoundingClientRect()
  const bottomEdge = containerRect.bottom

  for (const bubble of bubbles) {
    const rect = bubble.getBoundingClientRect()
    // Find the message that intersects the bottom ~30% of the viewport
    if (rect.bottom > bottomEdge - containerRect.height * 0.3 && rect.top < bottomEdge) {
      const msgId = Number((bubble as HTMLElement).dataset.msgId)
      if (msgId) bottomMsgId = msgId
      // Keep going — we want the LAST matching message (closest to bottom)
    }
  }

  const hash = `#chat=${props.chat.id}${bottomMsgId ? `&msg=${bottomMsgId}` : ''}`
  if (window.location.hash !== hash) {
    window.history.replaceState({}, '', hash)
  }
}

const initialScrollDone = ref(false)
const chatReady = ref(false)
const suppressHashUpdate = ref(false)

// ── 3-second polling auto-refresh ──────────────────────────
let refreshTimer: ReturnType<typeof setInterval> | null = null
let isRefreshing = false

async function checkForNewMessages() {
  if (!props.chat || isRefreshing || store.loading) return
  const chatIdAtStart = props.chat.id
  const topicIdAtStart = props.topicId
  isRefreshing = true
  try {
    const url = `/api/chats/${chatIdAtStart}/messages?limit=50&offset=0` +
      (topicIdAtStart ? `&topic_id=${topicIdAtStart}` : '')
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return
    // Discard if chat or topic changed during fetch
    if (props.chat?.id !== chatIdAtStart || props.topicId !== topicIdAtStart) return

    const latestMessages: Message[] = await res.json()
    const latestIds = new Set(latestMessages.map(m => m.id))
    const existingIds = new Set(store.messages.map(m => m.id))

    // New messages (in server response but not in our view)
    const newMsgs = latestMessages.filter(m => !existingIds.has(m.id))
    if (newMsgs.length > 0) {
      store.messages.push(...newMsgs)
    }

    // Deleted messages: only check overlap when we have enough messages
    // to match the server's window. Sort only IDs+dates (lighter than full objects).
    let deletedCount = 0
    if (store.messages.length >= latestMessages.length) {
      const sortedIds = [...store.messages.map(m => [m.id, m.date] as const)]
        .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      const ourNewestIds = new Set(sortedIds.slice(0, latestMessages.length).map(([id]) => id))
      const deletedIds = Array.from(ourNewestIds).filter(id => !latestIds.has(id))

      if (deletedIds.length > 0) {
        deletedCount = deletedIds.length
        const set = new Set(deletedIds)
        store.messages = store.messages.filter(m => !set.has(m.id))
      }
    }

    // Auto-scroll if near bottom
    if (newMsgs.length > 0 || deletedCount > 0) {
      await nextTick()
      const container = messagesContainer.value
      if (container && Math.abs(container.scrollTop) <= 200) {
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

// ── Lazy Video Observer (IntersectionObserver) ─────────────
let lazyVideoObserver: IntersectionObserver | null = null

function setupLazyVideoObserver() {
  if (lazyVideoObserver) lazyVideoObserver.disconnect()
  lazyVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) {
        // Load video source if not yet loaded
        if (!video.src && video.dataset.src) {
          video.src = video.dataset.src
        }
        // Autoplay GIFs
        if (video.classList.contains('gif-video')) {
          video.play().catch(() => {})
        }
      } else {
        // Pause GIFs when out of viewport (regular videos stay loaded)
        if (video.classList.contains('gif-video')) {
          video.pause()
        }
      }
    })
  }, { threshold: 0.1 })
}

function observeLazyVideos() {
  nextTick(() => {
    if (!lazyVideoObserver) setupLazyVideoObserver()
    document.querySelectorAll('.lazy-video').forEach(v => lazyVideoObserver?.observe(v))
  })
}

// Watch messages.length changes to re-observe new lazy videos
watch(() => store.messages.length, observeLazyVideos, { deep: false })

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
  if (idx < renderStart.value || idx >= renderEnd.value) {
    renderStart.value = Math.max(0, idx - Math.floor(RENDER_SIZE / 2))
    renderEnd.value = Math.min(store.sortedMessages.length, idx + Math.ceil(RENDER_SIZE / 2))
  }
  nextTick(() => {
    const container = messagesContainer.value
    if (!container) return
    const bubbles = container.querySelectorAll('.message-bubble')
    const el = bubbles[idx - renderStart.value]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ;(el as HTMLElement).style.backgroundColor = '#1e40af'
      setTimeout(() => { (el as HTMLElement).style.backgroundColor = '' }, 1000)
    }
  })
}

// ── Scroll position restoration ──────────────────────────
async function restorePosition(hashMsgId: number) {
  // Check if target message exists in loaded messages
  let idx = store.sortedMessages.findIndex(m => m.id === hashMsgId)

  // Keep loading older messages until we find the target or run out
  while (idx === -1 && store.hasMore && props.chat) {
    await store.loadMessages(props.chat.id, props.topicId)
    idx = store.sortedMessages.findIndex(m => m.id === hashMsgId)
  }

  if (idx >= 0) {
    renderStart.value = Math.max(0, idx - Math.floor(RENDER_SIZE / 2))
    renderEnd.value = Math.min(store.sortedMessages.length, idx + Math.ceil(RENDER_SIZE / 2))
    nextTick(() => {
      const el = messagesContainer.value?.querySelector(`[data-msg-id="${hashMsgId}"]`)
      if (el) el.scrollIntoView({ block: 'center' })
    })
  }
  return idx >= 0
}

// ── Load messages when chat changes ──────────────────────
// NOTE: Data loading (reset + loadMessages) is handled by App.vue's watcher on
// selectedChatId. This watcher only handles UI lifecycle: polling, scroll, infinite scroll.
watch(() => props.chat?.id, (newId, oldId) => {
  const container = messagesContainer.value
  if (container) {
    container.scrollTop = 0 // scrollTop=0 means bottom (flex-col-reverse)
  }
  if (newId) {
    chatReady.value = false
    setupScrollAnchor()
    initialScrollDone.value = false
    startRefresh()
  } else if (oldId) {
    stopRefresh()
  }
})

watch(() => store.messages.length, (len) => {
  if (len > 0 && renderEnd.value === 0) {
    initRenderWindow()
  }
  // Restore scroll position from URL hash on initial load
  if (len > 0 && !initialScrollDone.value) {
    initialScrollDone.value = true
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const hashMsgId = hashParams.get('msg')
    if (hashMsgId) {
      // Position restore mode: suppress hash updates until restore completes
      suppressHashUpdate.value = true
      restorePosition(parseInt(hashMsgId)).then((found) => {
        nextTick(() => {
          chatReady.value = true
          // Re-enable hash updates after restore scroll position settles
          setTimeout(() => { suppressHashUpdate.value = false }, 300)
        })
      })
    } else {
      // No target message: scroll to bottom then reveal
      nextTick(() => {
        scrollToBottom()
        setTimeout(() => { chatReady.value = true }, 50)
      })
    }
  }
})

onUnmounted(() => {
  teardownScrollAnchor()
  stopRefresh()
  if (scrollRAF) cancelAnimationFrame(scrollRAF)
  if (lazyVideoObserver) lazyVideoObserver.disconnect()
})

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
      class="h-full overflow-y-auto p-4 flex flex-col-reverse gap-1 messages-scroll relative"
      :class="{ 'opacity-0': !chatReady }"
      @scroll="handleScroll"
    >
      <!-- Loading overlay shown during chatReady=false -->
      <div v-if="!chatReady" class="absolute inset-0 flex items-center justify-center bg-tg-bg z-10">
        <div class="flex flex-col items-center gap-3">
          <div class="loading-spinner" />
          <span class="text-sm text-tg-muted">Loading messages...</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && store.messages.length === 0" class="text-center py-4 text-tg-muted">
        Loading messages...
      </div>

      <!-- Messages loop -->
      <template v-for="(msg, index) in visibleMessages" :key="msg.id">
        <div class="message-bubble" :data-msg-id="msg.id">
          <MessageBubble
            :message="msg"
            :index="index + renderStart"
            :chat="chat"
            :album="getAlbumFor(msg)"
            :isFirstInAlbum="isFirstInAlbum(msg, index + renderStart)"
            :isHiddenAlbum="isHiddenAlbumMsg(msg, index + renderStart)"
            :showDateSep="showDateSep(index + renderStart)"
            :showSender="showSenderName(index + renderStart)"
            :noDownload="auth.noDownload"
            @replyClick="scrollToMessage"
            @openMedia="openMedia"
            @imageError="handleImageError"
            @mediaError="handleMediaError"
            @jumpToDate="emit('openDatePicker', $event)"
          />
        </div>
      </template>

      <!-- Loading older messages -->
      <div v-if="store.loading && store.messages.length > 0" class="flex justify-center py-4">
        <div class="loading-spinner" />
      </div>

      <!-- Load more indicator -->
      <div v-if="store.hasMore && !store.loading && store.messages.length > 0" class="h-1" />

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
