<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore, getChatName } from '../../stores/chat'
import { useMessageStore } from '../../stores/messages'
import type { NavStateTopics, NavStateChatList } from '../../types'
import ChatItem from './ChatItem.vue'
import LoadingSpinner from '../shared/LoadingSpinner.vue'

const chat = useChatStore()
const messages = useMessageStore()

// Narrowed computed helpers for type safety in template
const topicsEntry = computed(() =>
  chat.topicsNavEntry?.type === 'topics' ? (chat.topicsNavEntry as NavStateTopics) : null
)
const chatListNav = computed(() =>
  chat.currentNav.type === 'chatList' ? (chat.currentNav as NavStateChatList) : null
)

// Infinite scroll — sentinel ref and observer
const infiniteScrollSentinel = ref<HTMLElement | null>(null)

let observer: IntersectionObserver | null = null

function setupInfiniteScroll() {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && chat.hasMoreChats && !chat.loadingMoreChats && !chat.searchQuery) {
        chat.loadChats(true)
      }
    },
    { rootMargin: '100px' }
  )
  requestAnimationFrame(() => {
    if (infiniteScrollSentinel.value) observer!.observe(infiniteScrollSentinel.value)
  })
}

// Re-setup when chat list changes
import { watch, nextTick } from 'vue'
watch(() => chat.chats, () => nextTick(setupInfiniteScroll), { deep: true })

defineExpose({ setupInfiniteScroll })

// Topic colors
const TOPIC_COLORS: Record<number, string> = {
  7322096: '#6FB9F0',
  16766590: '#FFD67E',
  13338331: '#CB86DB',
  9367192: '#8EEE98',
  16749490: '#FF93B2',
  16478047: '#FB6F5F',
}

function getTopicColor(iconColor: number | null) {
  return TOPIC_COLORS[iconColor ?? 7322096] || '#6FB9F0'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Navigate to forum topics
async function selectChat(selected: Parameters<typeof chat.openForumTopics>[0]) {
  if (selected.is_forum) {
    await chat.openForumTopics(selected)
    await chat.loadTopics(selected.id)
  } else {
    // Phase 3 will handle message loading
    messages.setSelectedChatId(selected.id)
  }
}

function selectTopic(chatObj: Parameters<typeof chat.openForumTopics>[0], topic: { id: number; title: string }) {
  chat.navigateTo({
    type: 'chat',
    chatId: chatObj.id,
    topicId: topic.id,
    topicTitle: topic.title,
  })
}
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <!-- Topics View (when navigated into a forum) -->
    <template v-if="topicsEntry">
      <!-- Back button + header -->
      <div class="p-3 border-b border-gray-700/50 flex items-center gap-2 sticky top-0 bg-tg-sidebar z-10">
        <button @click="chat.navigateBackToChats()" class="p-1.5 hover:bg-gray-700 rounded-full transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-white truncate">{{ topicsEntry.chatName }}</h3>
          <p class="text-xs text-tg-muted">{{ chat.topics.length }} topics</p>
        </div>
      </div>

      <LoadingSpinner v-if="chat.loadingTopics" text="Loading topics..." />

      <div v-else-if="chat.topics.length === 0" class="flex flex-col items-center justify-center py-12 text-tg-muted">
        <span class="text-sm">No topics found</span>
      </div>

      <div
        v-else
        v-for="topic in chat.topics" :key="topic.id"
        @click="selectTopic(topicsEntry.chat, topic)"
        class="p-3 cursor-pointer hover:bg-tg-hover transition-colors flex items-center gap-3 border-b border-gray-700/30"
        :class="{ 'bg-tg-active': chat.currentNav.type === 'chat' && chat.currentNav.topicId === topic.id }"
      >
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
          :style="{ backgroundColor: getTopicColor(topic.icon_color) }"
        >
          <span v-if="topic.icon_emoji" class="text-xl">{{ topic.icon_emoji }}</span>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-baseline">
            <h3 class="font-semibold truncate text-white text-sm">
              <span v-if="topic.is_pinned" class="text-blue-400 mr-1">📌</span>
              <span v-if="topic.is_closed" class="text-gray-500 mr-1">🔒</span>
              {{ topic.title }}
            </h3>
            <span class="text-xs text-tg-muted shrink-0 ml-2">{{ formatDate(topic.last_message_date) }}</span>
          </div>
          <p class="text-xs text-tg-muted">{{ topic.message_count }} messages</p>
        </div>
      </div>
    </template>

    <!-- Regular Chat List -->
    <template v-else>
      <!-- Back button for archived/folder views -->
      <div
        v-if="chat.canGoBack && chat.currentNav.type === 'chatList'"
        class="p-3 border-b border-gray-700/50 flex items-center gap-2 sticky top-0 bg-tg-sidebar z-10"
      >
        <button @click="chat.navigateBack()" class="p-1.5 hover:bg-gray-700 rounded-full transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 class="font-semibold text-white">
          {{ chatListNav?.filter === 'archived' ? 'Archived Chats' : 'Back' }}
        </h3>
      </div>

      <LoadingSpinner v-if="chat.loadingChats" text="Loading chats..." />

      <div
        v-else-if="chat.filteredChats.length === 0 && !chat.chatsError"
        class="flex flex-col items-center justify-center py-12 text-tg-muted"
      >
        <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span class="text-sm">{{ chat.searchQuery ? 'No chats found' : 'No chats yet' }}</span>
      </div>

      <template v-else>
        <!-- Archived Chats Row (only in "All Chats" view) -->
        <div
          v-if="chat.archivedCount > 0 && chatListNav?.filter === 'all' && !chat.searchQuery"
          @click="chat.showArchived()"
          class="p-3 cursor-pointer hover:bg-tg-hover transition-colors flex items-center gap-3 border-b border-gray-700/50"
        >
          <div class="w-12 h-12 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-blue-400">Archived Chats</h3>
            <p class="text-xs text-tg-muted">{{ chat.archivedCount }} chats</p>
          </div>
          <svg class="w-5 h-5 text-tg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <!-- Chat items -->
        <ChatItem
          v-for="c in chat.filteredChats"
          :key="c.id"
          :chat="c"
          :isActive="messages.selectedChatId === c.id"
          @select="selectChat(c)"
        />

        <!-- Infinite Scroll Sentinel -->
        <div v-if="chat.hasMoreChats && !chat.searchQuery" ref="infiniteScrollSentinel" class="p-3 flex justify-center">
          <LoadingSpinner v-if="chat.loadingMoreChats" text="Loading more..." />
          <div v-else class="text-xs text-tg-muted opacity-50">
            {{ chat.chatTotal - chat.chats.length }} more chats
          </div>
        </div>

        <!-- Search results info -->
        <div v-if="chat.searchQuery && !chat.loadingChats" class="p-3 text-center text-xs text-tg-muted border-t border-gray-700/50">
          <span v-if="chat.searchResults.length > 0">Found {{ chat.searchResults.length }} chats matching "{{ chat.searchQuery }}"</span>
          <span v-else>No chats found</span>
        </div>
      </template>
    </template>
  </div>
</template>
