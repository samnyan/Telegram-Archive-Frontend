<script setup lang="ts">
import { ref } from 'vue'
import type { Chat, ChatStats } from '../../types'
import { getChatName } from '../../stores/chat'
import { getInitials } from '../../utils/text'
import { formatNumber, formatSize } from '../../utils/format'

const props = defineProps<{
  chat: Chat | null
  topicTitle?: string
  chatStats: ChatStats | null
  loadingStats: boolean
  noDownload: boolean
  inDetail?: boolean
}>()

const emit = defineEmits<{
  back: []
  closeDetail: []
  search: [query: string]
  export: []
  openDetail: []
  toggleSidebar: []
}>()

const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', searchQuery.value), 300)
}

function isDeletedChat(chat: Chat) {
  return getChatName(chat) === 'Deleted Account'
}

function avatarOf(chat: Chat) {
  return getInitials(getChatName(chat))
}
</script>

<template>
  <div
    v-if="chat"
    class="px-2 sm:px-4 py-2 sm:py-3 bg-tg-sidebar border-b border-gray-700 flex items-center justify-between shadow-md z-10"
  >
    <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
      <!-- Sidebar toggle (desktop only) -->
      <button @click="emit('toggleSidebar')" class="hidden md:block p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition" title="Toggle sidebar">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Detail view: close/back button (always visible) -->
      <button v-if="inDetail" @click="emit('closeDetail')" class="p-2 -ml-2 text-gray-400 hover:text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Mobile back button (only when NOT in detail) -->
      <button v-else @click="emit('back')" class="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Avatar + Name (clickable → opens detail, but not in detail mode) -->
      <div
        @click="inDetail ? null : emit('openDetail')"
        :class="inDetail ? '' : 'cursor-pointer hover:opacity-80 transition'"
        class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
      >
        <div class="w-10 h-10 min-w-[2.5rem] aspect-square rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
          <img
            v-if="chat.avatar_url" :src="chat.avatar_url" class="w-full h-full object-cover"
            @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }"
          />
          <svg
            v-else-if="isDeletedChat(chat)" class="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14c2.21 0 4-1.343 4-3s-1.79-3-4-3-4 1.343-4 3 1.79 3 4 3z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 21a7 7 0 0114 0" />
          </svg>
          <template v-else>{{ avatarOf(chat) }}</template>
        </div>

        <div class="min-w-0 flex-1 max-w-[180px] sm:max-w-xs">
          <h2 class="font-bold text-base sm:text-lg truncate">{{ getChatName(chat) }}</h2>
          <p class="text-xs text-tg-muted truncate">
            <template v-if="topicTitle"># {{ topicTitle }}</template>
            <template v-else>{{ chat.type }}</template>
          </p>
        </div>
      </div>

      <!-- Per-Chat Stats -->
      <div v-if="chatStats" class="hidden sm:flex items-center gap-3 ml-4 px-3 py-1 bg-gray-800/50 rounded-lg text-xs text-tg-muted">
        <span title="Messages">{{ formatNumber(chatStats.messages) }} msgs</span>
        <span v-if="chatStats.media_files > 0" title="Media files">{{ formatNumber(chatStats.media_files) }} media</span>
        <span v-if="chatStats.total_size_mb > 0" title="Storage">{{ formatSize(chatStats.total_size_mb) }}</span>
      </div>
      <div v-else-if="loadingStats" class="hidden sm:flex items-center ml-4 text-xs text-tg-muted opacity-50">
        <svg class="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    </div>

    <div class="flex items-center gap-1 sm:gap-2 shrink-0">
      <!-- Search Bar -->
      <div class="relative w-28 sm:w-48 md:w-64">
        <input
          v-model="searchQuery" @input="onSearchInput" type="text" placeholder="Search..."
          class="w-full bg-gray-900 text-white rounded-lg pl-8 sm:pl-10 pr-2 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-3 top-2 sm:top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Export Button -->
      <button @click="emit('export')" class="p-1.5 sm:p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition shrink-0" title="Export Chat">
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Fallback: no chat selected -->
  <div v-else class="flex-1 flex items-center justify-center text-tg-muted flex-col">
    <div class="bg-tg-sidebar p-6 rounded-full mb-4">
      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
    <p>Select a chat to view history</p>
  </div>
</template>
