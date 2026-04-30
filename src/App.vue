<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useMessageStore } from './stores/messages'
import { useStatsStore } from './stores/stats'
import LoginForm from './components/auth/LoginForm.vue'
import SidebarHeader from './components/chat/SidebarHeader.vue'
import ChatList from './components/chat/ChatList.vue'
import StatsPopup from './components/shared/StatsPopup.vue'

const auth = useAuthStore()
const chat = useChatStore()
const messages = useMessageStore()
const stats = useStatsStore()

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
    <!-- Sidebar — hidden on mobile when chat is selected -->
    <aside
      class="bg-tg-sidebar flex flex-col border-r border-gray-700"
      :class="{
        'hidden md:flex': messages.selectedChatId,
        'w-full md:w-1/4 md:min-w-[300px]': true,
      }"
    >
      <!-- Database Busy Error Banner -->
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

      <ChatList ref="chatListRef" />
    </aside>

    <!-- Main Chat Area placeholder -->
    <main
      class="flex-1 flex flex-col bg-tg-bg relative"
      :class="{
        'hidden md:flex': !messages.selectedChatId,
        flex: messages.selectedChatId,
      }"
    >
      <div class="flex-1 flex items-center justify-center text-tg-muted flex-col">
        <div class="bg-tg-sidebar p-6 rounded-full mb-4">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p>Select a chat to view history</p>
      </div>
    </main>

    <!-- Stats Popup (teleported, rendered conditionally) -->
    <StatsPopup
      v-if="stats.statsPopupOpen && stats.showStatsUI"
      @close="stats.statsPopupOpen = false"
    />
  </div>
</template>
