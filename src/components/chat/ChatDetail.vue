<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import type { Chat, Message } from '../../types'
import { useMessageStore } from '../../stores/messages'
import { getChatName } from '../../stores/chat'
import { getInitials } from '../../utils/text'
import { getMediaUrl } from '../../utils/media'
import { isLightboxMedia } from '../../utils/media'
import MediaGallery from '../media/MediaGallery.vue'

const props = defineProps<{
  chat: Chat
}>()

const emit = defineEmits<{
  back: []
  openLightbox: [msg: Message, index: number]
}>()

const store = useMessageStore()

type MediaTab = 'video' | 'image' | 'voice' | 'files'
const activeTab = ref<MediaTab>(
  (new URLSearchParams(window.location.hash.slice(1)).get('detail') as MediaTab) || 'video'
)

const tabs: { key: MediaTab; label: string; icon: string }[] = [
  { key: 'video', label: 'Video', icon: '▶' },
  { key: 'image', label: 'Images', icon: '🖼' },
  { key: 'voice', label: 'Voice', icon: '🎵' },
  { key: 'files', label: 'Files', icon: '📄' },
]

// Filter messages by active tab
const mediaMessages = computed(() => {
  const all = store.messages.filter(m => m.media?.type)
  switch (activeTab.value) {
    case 'video':
      return all.filter(m => m.media!.type === 'video' || m.media!.type === 'animation')
    case 'image':
      return all.filter(m => m.media!.type === 'photo')
    case 'voice':
      return all.filter(m => m.media!.type === 'voice' || m.media!.type === 'audio')
    case 'files':
      return all.filter(m => m.media!.type === 'document')
  }
})

// Sort by date (newest first)
const sortedMedia = computed(() =>
  [...mediaMessages.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
)

function selectTab(tab: MediaTab) {
  activeTab.value = tab
  // Update URL hash
  const hash = `#chat=${props.chat.id}&detail=${tab}`
  if (window.location.hash !== hash) {
    window.history.replaceState({}, '', hash)
  }
}

function onMediaClick(msg: Message, index: number) {
  emit('openLightbox', msg, index)
}

function isDeletedChat(chat: Chat) {
  return getChatName(chat) === 'Deleted Account'
}

function avatarOf(chat: Chat) {
  return getInitials(getChatName(chat))
}

function formatMemberCount(count: number | null | undefined): string {
  if (!count) return ''
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k members` : `${count} members`
}

const containerRef = ref<HTMLElement | null>(null)
let scrollRAF = 0

function handleDetailScroll() {
  if (scrollRAF) return
  scrollRAF = requestAnimationFrame(() => {
    scrollRAF = 0
    const el = containerRef.value
    if (!el) return

    // Infinite scroll: load more messages when near bottom
    const { scrollTop, scrollHeight, clientHeight } = el
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    if (distanceFromBottom < 500 && store.hasMore && !store.loading && props.chat) {
      store.loadMessages(props.chat.id)
    }

    // Update URL hash with scroll position
    const items = el.querySelectorAll('.media-grid-item')
    let topMsgId: number | null = null
    const containerTop = el.getBoundingClientRect().top
    for (const item of items) {
      const rect = item.getBoundingClientRect()
      // Find first item that's at least partially in viewport
      if (rect.bottom > containerTop + 50) {
        // Try to find data attribute
        const msgEl = item.querySelector('[data-msg-id]') || item
        const msgId = (msgEl as HTMLElement).dataset?.msgId
        if (msgId) { topMsgId = Number(msgId); break }
      }
    }

    const hash = `#chat=${props.chat.id}&detail=${activeTab.value}${topMsgId ? `&msg=${topMsgId}` : ''}`
    if (window.location.hash !== hash) {
      window.history.replaceState({}, '', hash)
    }
  })
}

let detailScrollRestored = false

async function restoreDetailPosition(msgId: number) {
  // Load more messages until target is found
  let idx = store.sortedMessages.findIndex(m => m.id === msgId)
  while (idx === -1 && store.hasMore && props.chat) {
    await store.loadMessages(props.chat.id)
    idx = store.sortedMessages.findIndex(m => m.id === msgId)
  }
  if (idx >= 0) {
    nextTick(() => {
      const el = containerRef.value?.querySelector(`[data-msg-id="${msgId}"]`)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        detailScrollRestored = true
      }
    })
  }
  return idx >= 0
}

// Restore scroll position after media grid renders
watch(() => sortedMedia.value.length, (len) => {
  if (len === 0 || detailScrollRestored) return
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const hashMsgId = hashParams.get('msg')
  if (hashMsgId) {
    restoreDetailPosition(parseInt(hashMsgId))
  } else {
    detailScrollRestored = true
  }
})

onUnmounted(() => { if (scrollRAF) cancelAnimationFrame(scrollRAF) })
</script>

<template>
  <div ref="containerRef" @scroll="handleDetailScroll" class="flex-1 flex flex-col min-h-0 bg-tg-bg overflow-y-auto">
    <!-- Chat Info Header -->
    <div class="px-4 py-6 flex flex-col items-center gap-3 border-b border-gray-700/50 text-center">
      <!-- Avatar (larger) -->
      <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-2xl overflow-hidden shrink-0 shadow-lg">
        <img
          v-if="chat.avatar_url" :src="chat.avatar_url" class="w-full h-full object-cover"
          @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }"
        />
        <svg v-else-if="isDeletedChat(chat)" class="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14c2.21 0 4-1.343 4-3s-1.79-3-4-3-4 1.343-4 3 1.79 3 4 3z" />
        </svg>
        <template v-else>{{ avatarOf(chat) }}</template>
      </div>

      <!-- Name & type -->
      <div>
        <h2 class="text-xl font-bold text-white">{{ getChatName(chat) }}</h2>
        <p class="text-sm text-tg-muted mt-0.5">
          {{ chat.type === 'channel' ? 'Channel' : chat.type === 'group' ? 'Group' : 'Private' }}
          <span v-if="chat.participants_count">{{ formatMemberCount(chat.participants_count) }}</span>
        </p>
      </div>

      <!-- Username -->
      <p v-if="chat.username" class="text-xs text-blue-400">@{{ chat.username }}</p>
    </div>

    <!-- Media Type Tabs -->
    <div class="flex border-b border-gray-700 bg-tg-sidebar sticky top-0 z-10">
      <button
        v-for="tab in tabs" :key="tab.key"
        @click="selectTab(tab.key)"
        class="flex-1 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2"
        :class="activeTab === tab.key
          ? 'text-blue-400 border-blue-400'
          : 'text-tg-muted border-transparent hover:text-gray-300'"
      >
        <span class="mr-1">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- Media Gallery -->
    <MediaGallery
      :messages="sortedMedia"
      :tab="activeTab"
      @openLightbox="onMediaClick"
    />
  </div>
</template>
