<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useMessageStore } from './stores/messages'
import { useStatsStore } from './stores/stats'
import { setDefaultTimezone } from './utils/format'
import LoginForm from './components/auth/LoginForm.vue'
import SidebarHeader from './components/chat/SidebarHeader.vue'
import ChatList from './components/chat/ChatList.vue'
import ChatHeader from './components/messages/ChatHeader.vue'
import MessageList from './components/messages/MessageList.vue'
import StatsPopup from './components/shared/StatsPopup.vue'

const auth = useAuthStore()
const chat = useChatStore()
const messages = useMessageStore()
const stats = useStatsStore()

// Timezone from stats
watch(() => stats.viewerTimezone, (tz) => {
  if (tz) setDefaultTimezone(tz)
})

// Selected chat computed from store
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

onMounted(async () => {
  await auth.initialize()
  if (auth.isAuthenticated) {
    await Promise.all([
      chat.loadChats(),
      stats.fetchStats(),
      chat.loadFolders(),
      chat.loadArchivedCount(),
    ])
  }
})

function onLoginSuccess() {
  Promise.all([
    chat.loadChats(),
    stats.fetchStats(),
    chat.loadFolders(),
    chat.loadArchivedCount(),
  ])
}

// Handle chat selection from ChatList
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
  // Pop navigation if needed
  if (chat.currentNav.type === 'chat') {
    chat.navigateBack()
  }
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
    <LoginForm @loginSuccess="onLoginSuccess" />
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
      <!-- Error Banner -->
      <div v-if="chat.chatsError" class="px-3 py-2 bg-amber-900/80 border-b border-amber-700">
        <div class="flex items-center gap-2 text-amber-200 text-sm">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ chat.chatsError }}</span>
          <button @click="chat.loadChats()" class="ml-auto text-amber-300 hover:text-white text-xs underline">Retry</button>
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
        :chat="selectedChatForView"
        :topicTitle="currentTopicTitle"
        :chatStats="messages.chatStats"
        :loadingStats="messages.loading"
        :noDownload="auth.noDownload"
        @back="handleBackFromChat"
        @search="handleMessageSearch"
        @export="handleExport"
      />

      <MessageList
        v-if="selectedChatForView"
        :chat="selectedChatForView"
        :topicId="currentTopicId"
        :topicTitle="currentTopicTitle"
      />
    </main>

    <!-- Stats Popup -->
    <StatsPopup
      v-if="stats.statsPopupOpen"
      @close="stats.statsPopupOpen = false"
    />
  </div>
</template>
