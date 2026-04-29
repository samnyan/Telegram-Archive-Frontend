<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useMessageStore } from './stores/messages'
import LoginForm from './components/auth/LoginForm.vue'

const auth = useAuthStore()
const chatStore = useChatStore()
const messageStore = useMessageStore()

onMounted(async () => {
  await auth.initialize()
  if (auth.isAuthenticated) {
    await chatStore.loadChats()
    await chatStore.loadFolders()
    await chatStore.loadArchivedCount()
  }
})
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
    <!-- Sidebar placeholder — componentized in Phase 3 -->
    <aside class="bg-tg-sidebar w-full md:w-1/4 md:min-w-[300px] flex flex-col border-r border-gray-700">
      <div class="flex-1 flex items-center justify-center text-tg-muted text-sm">
        <p>Chat list coming in Phase 3</p>
      </div>
    </aside>

    <!-- Main Area placeholder -->
    <main class="flex-1 flex flex-col bg-tg-bg items-center justify-center text-tg-muted">
      <div class="bg-tg-sidebar p-6 rounded-full mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p>Select a chat to view history</p>
    </main>
  </div>
</template>
