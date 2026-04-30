<script setup lang="ts">
import type { Chat } from '../../types'
import { getChatName } from '../../stores/chat'

const props = defineProps<{
  chat: Chat
  isActive: boolean
}>()

const emit = defineEmits<{
  select: [chat: Chat]
}>()

function getInitials(chat: Chat) {
  const name = getChatName(chat)
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function isDeletedChat(chat: Chat) {
  return getChatName(chat) === 'Deleted Account'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div
    @click="emit('select', chat)"
    class="p-3 cursor-pointer hover:bg-tg-hover transition-colors flex items-center gap-3"
    :class="{ 'bg-tg-active': isActive }"
  >
    <!-- Avatar -->
    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden">
      <img
        v-if="chat.avatar_url"
        :src="chat.avatar_url"
        class="w-full h-full object-cover"
        @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }"
        :alt="getChatName(chat)"
      />
      <!-- Deleted account icon -->
      <svg
        v-else-if="isDeletedChat(chat)"
        class="w-7 h-7 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14c2.21 0 4-1.343 4-3s-1.79-3-4-3-4 1.343-4 3 1.79 3 4 3z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 21a7 7 0 0114 0" />
      </svg>
      <template v-else>{{ getInitials(chat) }}</template>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-baseline">
        <h3 class="font-semibold truncate text-white">
          <span v-if="chat.is_forum" class="text-blue-400 mr-1 text-xs" title="Forum">#</span>
          {{ getChatName(chat) }}
        </h3>
        <span class="text-xs text-tg-muted">{{ formatDate(chat.last_message_date) }}</span>
      </div>
      <p class="text-sm text-tg-muted truncate">
        <span v-if="chat.username" class="text-blue-400 font-mono">@{{ chat.username }}</span>
        <span v-if="chat.username"> • </span>
        {{ chat.type }}
        <span v-if="chat.is_forum" class="text-blue-400/70"> • Forum</span>
        <span v-if="chat.type !== 'private' && chat.participants_count"> • {{ chat.participants_count }} participants</span>
        <span class="text-tg-muted/70 text-xs font-mono ml-1"> • ID: {{ chat.id }}</span>
      </p>
    </div>
  </div>
</template>
