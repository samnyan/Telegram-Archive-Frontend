<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore, getChatName } from './stores/chat'
import { useMessageStore } from './stores/messages'
import { useStatsStore } from './stores/stats'
import { useAdminStore } from './stores/admin'
import { setDefaultTimezone, getDefaultTimezone } from './utils/format'
import { isLightboxMedia } from './utils/media'
import * as messagesApi from './api/messages'
import { useWebSocket } from './composables/useWebSocket'
import { useNotifications } from './composables/useNotifications'
import type { Message } from './types'
import LoginForm from './components/auth/LoginForm.vue'
import SidebarHeader from './components/chat/SidebarHeader.vue'
import ChatList from './components/chat/ChatList.vue'
import ChatHeader from './components/messages/ChatHeader.vue'
import MessageList from './components/messages/MessageList.vue'
import StatsPopup from './components/shared/StatsPopup.vue'
import Lightbox from './components/shared/Lightbox.vue'
import DatePickerModal from './components/shared/DatePickerModal.vue'
import AdminPanel from './components/admin/AdminPanel.vue'
import ChatDetail from './components/chat/ChatDetail.vue'

const auth = useAuthStore()
const chat = useChatStore()
const messages = useMessageStore()
const stats = useStatsStore()
const admin = useAdminStore()
const ws = useWebSocket()
const notify = useNotifications()

// ── WebSocket setup ───────────────────────────────────────
ws.on('new_message', (data: any) => {
  if (messages.selectedChatId === data.chat_id && data.message?.id != null) {
    messages.handleNewMessage(data.message)
  }
  if (notify.permission.value === 'granted' && document.hidden) {
    const chatName = chat.chats.find(c => c.id === data.chat_id)
    notify.showDesktopNotification({
      chat_name: getChatName(chatName ?? { title: 'New Message', first_name: null, last_name: null, username: null }),
      body: data.message?.text?.substring(0, 100) || 'New message received',
      chat_id: data.chat_id,
    })
  }
})

ws.on('edit', (data: any) => {
  messages.handleEditMessage(data.message_id, data.new_text, data.edit_date)
})

ws.on('delete', (data: any) => {
  messages.handleDeleteMessage(data.message_id)
})

ws.on('pin', (data: any) => {
  if (messages.selectedChatId === data.chat_id) {
    messages.loadPinnedMessages(data.chat_id)
  }
})

// Subscribe/unsubscribe when selected chat changes
watch(() => messages.selectedChatId, (newId, oldId) => {
  if (newId) ws.subscribe(newId)
  if (oldId) ws.unsubscribe(oldId)
})

// Re-subscribe to current chat on WS reconnect
ws.onConnect(() => {
  if (messages.selectedChatId) ws.subscribe(messages.selectedChatId)
})

// ── Lightbox ──────────────────────────────────────────────
const lightboxOpen = ref(false)
const lightboxMedia = ref<Message | null>(null)
const lightboxIndex = ref(0)

const mediaMessages = computed(() =>
  messages.messages
    .filter(m => isLightboxMedia(m))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
)

function handleOpenLightbox(msg: Message, index: number) {
  lightboxMedia.value = msg
  lightboxIndex.value = index >= 0 ? index : mediaMessages.value.findIndex(m => m.id === msg.id)
  lightboxOpen.value = true
}

function lightboxPrev() {
  if (lightboxIndex.value > 0) {
    lightboxIndex.value--
    lightboxMedia.value = mediaMessages.value[lightboxIndex.value]
  }
}

function lightboxNext() {
  if (lightboxIndex.value < mediaMessages.value.length - 1) {
    lightboxIndex.value++
    lightboxMedia.value = mediaMessages.value[lightboxIndex.value]
  }
}

function closeLightbox() {
  lightboxOpen.value = false
  lightboxMedia.value = null
}

// ── Date Picker ───────────────────────────────────────────
const showDatePicker = ref(false)
const jumpDatePickerRef = ref<InstanceType<typeof DatePickerModal> | null>(null)

function handleOpenDatePicker(dateStr: string) {
  // Convert to YYYY-MM-DD for the native date input
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  const formatted = d.toISOString().split('T')[0]
  showDatePicker.value = true
  setTimeout(() => jumpDatePickerRef.value?.open(formatted), 50)
}

async function handleJumpToDate(date: string) {
  const chatId = chat.selectedChat?.id
  if (!chatId) return

  try {
    const msg = await messagesApi.fetchMessageByDate(chatId, date, getDefaultTimezone())

    // Check if already loaded
    const exists = messages.messages.find(m => m.id === msg.id)
    if (!exists) {
      messages.messages.push(msg)
    }
    // Scroll to it will happen via the MessageList's scrollToMessage
    showDatePicker.value = false
  } catch {
    alert('No messages found for this date')
    showDatePicker.value = false
  }
}

// ── Timezone ──────────────────────────────────────────────
watch(() => stats.viewerTimezone, (tz) => {
  if (tz) setDefaultTimezone(tz)
})

const selectedChatForView = computed(() => chat.selectedChat)

const currentTopicId = computed(() => {
  const nav = chat.currentNav
  if (nav.type === 'chat' && nav.topicId) return nav.topicId
  return undefined
})

const currentTopicTitle = computed(() => {
  const nav = chat.currentNav
  if (nav.type === 'chat' && nav.topicTitle) return nav.topicTitle
  return undefined
})

// ── Chat Detail View ────────────────────────────────────────
const showDetail = ref(false)
const detailTab = ref<string>('video')

function handleOpenDetail() {
  showDetail.value = true
  detailTab.value = 'video'
  const hash = `#chat=${chat.selectedChat?.id}&detail=video`
  window.history.replaceState({}, '', hash)
}

function handleBackFromDetail() {
  showDetail.value = false
  if (messages.selectedChatId) {
    const hash = `#chat=${messages.selectedChatId}`
    window.history.replaceState({}, '', hash)
  }
}

// ── Load all data on authentication ───────────────────────
// Uses a watcher on isAuthenticated (like the original code's performLogin
// which loaded data immediately after setting isAuthenticated = true).
// This avoids the race condition where emit('loginSuccess') fires after
// the LoginForm is already unmounted by Vue's reactivity flush.
const dataLoaded = ref(false)

async function loadAppData() {
  dataLoaded.value = true
  try {
    await Promise.all([
      chat.loadChats(),
      stats.fetchStats(),
      chat.loadFolders(),
      chat.loadArchivedCount(),
    ])
  } catch { /* errors handled per-store */ }
  ws.connect()
  notify.init()

  // Deep link: parse hash (#chat=123&msg=456) or query (?chat=123&msg=456)
  const hashParams = window.location.hash.startsWith('#')
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams()
  const queryParams = new URLSearchParams(window.location.search)
  const chatIdParam = hashParams.get('chat') || queryParams.get('chat')
  const msgIdParam = hashParams.get('msg') || queryParams.get('msg')
  if (chatIdParam) {
    const cid = parseInt(chatIdParam)
    const targetChat = chat.chats.find(c => c.id === cid)
    if (targetChat) {
      chat.selectedChat = targetChat
      messages.setSelectedChatId(cid)
      // Don't clear hash — MessageList uses it for scroll restoration
    }
  }

  // Restore detail view state from hash
  const hashParams2 = new URLSearchParams(window.location.hash.slice(1))
  const detailParam = hashParams2.get('detail')
  if (detailParam && chat.selectedChat) {
    showDetail.value = true
    detailTab.value = detailParam
  }

  // Listen for notification clicks when app is already open
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const { chat_id, message_id } = event.data.data || {}
        if (chat_id) {
          const tc = chat.chats.find(c => c.id === chat_id)
          if (tc) {
            chat.selectedChat = tc
            messages.setSelectedChatId(chat_id)
          }
        }
      }
    })
  }
}

watch(() => auth.isAuthenticated, (newVal) => {
  if (newVal && !dataLoaded.value) {
    loadAppData()
  } else if (!newVal) {
    dataLoaded.value = false
  }
})

onMounted(async () => {
  await auth.initialize()
  // loadAppData is triggered by the watcher above when isAuthenticated becomes true
})

watch(
  () => messages.selectedChatId,
  (chatId) => {
    if (chatId && chat.selectedChat) {
      messages.reset()
      messages.loadMessages(chat.selectedChat.id, currentTopicId.value)
      messages.loadPinnedMessages(chat.selectedChat.id)
      messages.loadChatStats(chat.selectedChat.id)
    }
  }
)

function handleBackFromChat() {
  chat.selectedChat = null
  messages.reset()
  messages.setSelectedChatId(null)
  showDetail.value = false
  if (chat.currentNav.type === 'chat') chat.navigateBack()
}

function handleExport() {
  if (chat.selectedChat) {
    window.open(`/api/chats/${chat.selectedChat.id}/export`, '_blank')
  }
}

function handleMessageSearch(query: string) {
  if (chat.selectedChat) {
    messages.messageSearchQuery = query
    messages.reset()
    messages.loadMessages(chat.selectedChat.id, currentTopicId.value)
  }
}
</script>

<template>
  <!-- Login Screen -->
  <div
    v-if="!auth.isAuthenticated"
    class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800"
  >
    <LoginForm />
  </div>

  <!-- Main App Shell -->
  <div v-else class="flex w-full h-full bg-tg-bg">
    <!-- Sidebar -->
    <aside
      class="bg-tg-sidebar flex flex-col border-r border-gray-700"
      :class="{
        'hidden md:flex': messages.selectedChatId,
        'w-full md:w-1/4 md:min-w-[300px]': true,
      }"
    >
      <div v-if="chat.chatsError" class="px-3 py-2 bg-amber-900/80 border-b border-amber-700">
        <div class="flex items-center gap-2 text-amber-200 text-sm">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ chat.chatsError }}</span>
          <button @click="chat.loadChats()" class="ml-auto text-amber-300 hover:text-white text-xs underline">Retry</button>
        </div>
      </div>

      <!-- Notification Permission Banner -->
      <div
        v-if="(notify.enabled.value || notify.pushEnabled.value) && notify.permission.value === 'default'"
        class="px-3 py-2 bg-blue-900/80 border-b border-blue-700"
      >
        <div class="flex items-center gap-2 text-blue-200 text-sm">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span>Enable notifications for new messages</span>
          <button @click="notify.requestPermission()" class="ml-auto px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition">Enable</button>
        </div>
      </div>

      <!-- Notification Blocked Banner -->
      <div
        v-if="notify.notificationsBlocked.value && notify.pushSubscribed.value"
        class="px-3 py-2 bg-amber-900/80 border-b border-amber-700"
      >
        <div class="flex items-center gap-2 text-amber-200 text-sm">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Notifications blocked. Enable in browser settings.</span>
          <button @click="notify.unsubscribeFromPush()" class="ml-auto px-2 py-1 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded transition">Unsubscribe</button>
        </div>
      </div>

      <SidebarHeader />
      <ChatList />
    </aside>

    <!-- Main Chat Area -->
    <main
      class="flex-1 flex flex-col bg-tg-bg relative"
      :class="{
        'hidden md:flex': !messages.selectedChatId,
        flex: messages.selectedChatId,
      }"
    >
      <ChatHeader
        v-if="selectedChatForView"
        :chat="selectedChatForView"
        :topicTitle="currentTopicTitle"
        :chatStats="messages.chatStats"
        :loadingStats="messages.loading"
        :noDownload="auth.noDownload"
        @back="handleBackFromChat"
        @search="handleMessageSearch"
        @export="handleExport"
        @openDetail="handleOpenDetail"
      />

      <!-- Detail View (media gallery) -->
      <ChatDetail
        v-if="selectedChatForView && showDetail"
        :chat="selectedChatForView"
        @back="handleBackFromDetail"
        @openLightbox="handleOpenLightbox"
      />

      <!-- Normal Message View -->
      <MessageList
        v-else-if="selectedChatForView"
        :chat="selectedChatForView"
        :topicId="currentTopicId"
        :topicTitle="currentTopicTitle"
        @openLightbox="handleOpenLightbox"
        @openDatePicker="handleOpenDatePicker"
      />
    </main>

    <!-- Stats Popup -->
    <StatsPopup
      v-if="stats.statsPopupOpen"
      @close="stats.statsPopupOpen = false"
    />
  </div>

  <!-- Lightbox -->
  <Lightbox
    v-if="lightboxOpen && lightboxMedia"
    :media="lightboxMedia"
    :index="lightboxIndex"
    :total="mediaMessages.length"
    :noDownload="auth.noDownload"
    @close="closeLightbox"
    @prev="lightboxPrev"
    @next="lightboxNext"
  />

  <!-- Date Picker -->
  <DatePickerModal
    v-if="showDatePicker"
    ref="jumpDatePickerRef"
    @close="showDatePicker = false"
    @jump="handleJumpToDate"
  />

  <!-- Admin Panel -->
  <AdminPanel v-if="admin.showPanel" />
</template>
