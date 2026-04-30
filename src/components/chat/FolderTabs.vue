<script setup lang="ts">
import type { Folder } from '../../types'

defineProps<{
  folders: Folder[]
  activeTab: string
}>()

const emit = defineEmits<{
  selectAll: []
  selectFolder: [folderId: number]
}>()
</script>

<template>
  <div v-if="folders.length > 0" class="flex gap-1 mb-3 overflow-x-auto pb-1">
    <button
      @click="emit('selectAll')"
      :class="activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-tg-muted hover:bg-gray-700'"
      class="px-3 py-1 text-xs rounded-full whitespace-nowrap transition shrink-0"
    >
      All Chats
    </button>
    <button
      v-for="folder in folders" :key="folder.id"
      @click="emit('selectFolder', folder.id)"
      :class="activeTab === 'folder_' + folder.id ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-tg-muted hover:bg-gray-700'"
      class="px-3 py-1 text-xs rounded-full whitespace-nowrap transition shrink-0"
    >
      {{ folder.emoticon || '📁' }} {{ folder.title }}
      <span class="opacity-70 ml-0.5">({{ folder.chat_count }})</span>
    </button>
  </div>
</template>
