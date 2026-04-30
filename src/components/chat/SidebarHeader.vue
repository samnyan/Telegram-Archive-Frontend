<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'
import { useChatStore } from '../../stores/chat'
import { useStatsStore } from '../../stores/stats'
import { useAdminStore } from '../../stores/admin'
import FolderTabs from './FolderTabs.vue'

const auth = useAuthStore()
const chat = useChatStore()
const stats = useStatsStore()
const admin = useAdminStore()

let searchDebounce: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  const query = chat.searchQuery.trim()
  if (!query) {
    chat.searchResults = []
    return
  }
  searchDebounce = setTimeout(() => chat.searchChats(query), 300)
}

function formatLastBackup(timeStr: string | null) {
  if (!timeStr) return 'Never'
  const d = new Date(timeStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Today at ${time}`
  if (isYesterday) return `Yesterday at ${time}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` at ${time}`
}
</script>

<template>
  <div class="p-4 border-b border-gray-700">
    <!-- User bar row -->
    <div v-if="auth.authRequired && auth.isAuthenticated" class="flex items-center gap-2 px-3 py-1 border-b border-gray-700 -mx-4 -mt-4 mb-3">
      <span class="text-xs text-gray-400 truncate flex-1">{{ auth.currentUsername }}</span>
      <button v-if="auth.isMaster" @click="admin.openPanel()" class="text-gray-400 hover:text-white p-1" title="Admin Settings">
        <i class="fas fa-cog"></i>
      </button>
      <button @click="auth.performLogout()" class="text-gray-400 hover:text-red-400 p-1" title="Logout">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>

    <!-- Header with Stats -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">Telegram Archive</h1>
        <!-- Stats Button -->
        <div class="relative" v-if="stats.showStatsUI && stats.statsData.stats_calculated_at">
          <button
            @click="stats.statsPopupOpen = !stats.statsPopupOpen"
            class="flex items-center gap-1.5 px-2 py-1 text-xs text-tg-muted hover:text-white hover:bg-gray-700/50 rounded transition"
          >
            <span>📊</span> Stats
            <svg :class="{ 'rotate-180': stats.statsPopupOpen }" class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      <!-- Syncing indicator -->
      <div v-if="stats.loading" class="flex items-center gap-1.5 text-xs text-tg-muted">
        <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Syncing...</span>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative mb-3">
      <input
        v-model="chat.searchQuery"
        @input="onSearchInput"
        type="text"
        placeholder="Search all chats..."
        class="w-full bg-gray-900 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <!-- Folder Tabs -->
    <FolderTabs
      :folders="chat.folders"
      :activeTab="chat.activeTab"
      @selectAll="chat.showAllChats()"
      @selectFolder="chat.selectFolder($event)"
    />

    <!-- Last Backup / Real-time status -->
    <div class="text-xs text-tg-muted">
      <div class="flex items-center gap-1.5">
        <template v-if="stats.listenerActive">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span class="text-green-400">Real-time sync</span>
          <span class="text-gray-500">•</span>
          <span>Last backup: {{ formatLastBackup(stats.lastBackupTime) }}</span>
        </template>
        <template v-else>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last backup: {{ formatLastBackup(stats.lastBackupTime) }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
