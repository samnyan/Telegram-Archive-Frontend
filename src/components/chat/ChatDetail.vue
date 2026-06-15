<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick, watch } from 'vue'
import type { Chat, MediaGalleryItem, Message } from '../../types'
import * as mediaApi from '../../api/media'
import { getChatName } from '../../stores/chat'
import { getInitials } from '../../utils/text'
import MediaGallery from '../media/MediaGallery.vue'

const props = defineProps<{
  chat: Chat
}>()

const emit = defineEmits<{
  back: []
  openLightbox: [msg: Message, index: number, list?: Message[]]
}>()

type MediaTab = 'video' | 'image' | 'voice' | 'files'
const validTabs: MediaTab[] = ['video', 'image', 'voice', 'files']
const hashTab = new URLSearchParams(window.location.hash.slice(1)).get('detail') as MediaTab
const activeTab = ref<MediaTab>(validTabs.includes(hashTab) ? hashTab : 'video')

const tabs: { key: MediaTab; label: string; icon: string; types: string[] }[] = [
  { key: 'video', label: 'Video', icon: '▶', types: ['video', 'animation'] },
  { key: 'image', label: 'Images', icon: '🖼', types: ['photo'] },
  { key: 'voice', label: 'Voice', icon: '🎵', types: ['voice', 'audio'] },
  { key: 'files', label: 'Files', icon: '📄', types: ['document'] },
]

const galleryItems = ref<MediaGalleryItem[]>([])
const galleryLoading = ref(false)
const galleryHasMore = ref(true)
const galleryCounts = ref<Record<MediaTab, number>>({
  video: 0,
  image: 0,
  voice: 0,
  files: 0,
})

const activeTypes = computed(() => tabs.find(tab => tab.key === activeTab.value)?.types ?? [])

function selectTab(tab: MediaTab) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  resetGallery()
  loadGallery()
  // Update URL hash
  const hash = `#chat=${props.chat.id}&detail=${tab}`
  if (window.location.hash !== hash) {
    window.history.replaceState({}, '', hash)
  }
}

function mediaItemToMessage(item: MediaGalleryItem): Message {
  return {
    id: item.message_id,
    chat_id: item.chat_id,
    date: item.message_date || '',
    text: '',
    edit_date: null,
    is_outgoing: null,
    sender_id: null,
    first_name: item.sender_name,
    last_name: null,
    username: null,
    reply_to_msg_id: null,
    reply_to_text: null,
    forward_from_id: null,
    media: {
      type: item.type,
      file_path: item.file_path ?? null,
      file_name: item.file_name,
      mime_type: item.mime_type,
      media_url: item.media_url ?? null,
      thumb_url: item.thumb_url,
    },
    raw_data: null,
    reactions: null,
  }
}

function lightboxMessages(): Message[] {
  return galleryItems.value
    .filter(item => ['photo', 'video', 'animation'].includes(item.type) && (item.media_url || item.file_path))
    .map(mediaItemToMessage)
}

function onMediaClick(item: MediaGalleryItem) {
  const list = lightboxMessages()
  const msgIndex = list.findIndex(msg => msg.id === item.message_id)
  if (msgIndex >= 0) emit('openLightbox', list[msgIndex], msgIndex, list)
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
let galleryVersion = 0

function resetGallery() {
  galleryItems.value = []
  galleryLoading.value = false
  galleryHasMore.value = true
  detailScrollRestored = false
  galleryVersion++
}

async function loadGallery(append = false) {
  if (galleryLoading.value || (!galleryHasMore.value && append)) return

  const myVersion = galleryVersion
  galleryLoading.value = true
  try {
    const lastItem = append ? galleryItems.value[galleryItems.value.length - 1] : null
    const result = await mediaApi.fetchChatMedia({
      chatId: props.chat.id,
      types: activeTypes.value,
      limit: 50,
      beforeId: lastItem?.id,
    })
    if (galleryVersion !== myVersion) return
    galleryItems.value = append ? [...galleryItems.value, ...result.items] : result.items
    galleryHasMore.value = result.has_more
  } finally {
    if (galleryVersion === myVersion) galleryLoading.value = false
  }
}

async function loadGalleryCounts() {
  try {
    const counts = await mediaApi.fetchChatMediaCounts(props.chat.id)
    galleryCounts.value = {
      video: (counts.video || 0) + (counts.animation || 0),
      image: counts.photo || 0,
      voice: (counts.voice || 0) + (counts.audio || 0),
      files: counts.document || 0,
    }
  } catch {
    galleryCounts.value = { video: 0, image: 0, voice: 0, files: 0 }
  }
}

function handleDetailScroll() {
  if (scrollRAF) return
  scrollRAF = requestAnimationFrame(() => {
    scrollRAF = 0
    const el = containerRef.value
    if (!el) return

    // Infinite scroll: load more media when near bottom
    const { scrollTop, scrollHeight, clientHeight } = el
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    if (distanceFromBottom < 500 && !autoLoadGuard && galleryHasMore.value && !galleryLoading.value) {
      autoLoadGuard = true
      loadGallery(true).then(() => {
        autoLoadGuard = false
      })
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

let autoLoadGuard = false

watch(() => [galleryItems.value.length, galleryLoading.value] as const, ([len, loading]) => {
  if (len > 0 && !loading && !autoLoadGuard) {
    autoLoadGuard = true
    nextTick(() => tryLoadMore())
  }
})

function tryLoadMore() {
  const el = containerRef.value
  if (!el || galleryLoading.value || !galleryHasMore.value) {
    autoLoadGuard = false
    return
  }
  // If content fits viewport (no scrollbar), load more
  if (el.scrollHeight <= el.clientHeight + 100) {
    loadGallery(true).then(() => {
      autoLoadGuard = false
    })
  } else {
    autoLoadGuard = false
  }
}

let detailScrollRestored = false

async function restoreDetailPosition(msgId: number) {
  let idx = galleryItems.value.findIndex(item => item.message_id === msgId)
  while (idx === -1 && galleryHasMore.value) {
    if (galleryLoading.value) {
      await new Promise(r => setTimeout(r, 100))
      idx = galleryItems.value.findIndex(item => item.message_id === msgId)
      continue
    }
    await loadGallery(true)
    idx = galleryItems.value.findIndex(item => item.message_id === msgId)
  }
  if (idx >= 0) {
    nextTick(() => {
      const el = containerRef.value?.querySelector(`[data-msg-id="${msgId}"]`)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        // detailScrollRestored set below after async work
      }
    })
  }
  return idx >= 0
}

// Restore scroll position after media grid renders
watch(() => galleryItems.value.length, (len) => {
  if (len === 0 || detailScrollRestored) return
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const hashMsgId = hashParams.get('msg')
  if (hashMsgId) {
    // Prevent re-entry before async work starts
    detailScrollRestored = true
    restoreDetailPosition(parseInt(hashMsgId))
  } else {
    detailScrollRestored = true
  }
})

watch(() => props.chat.id, () => {
  resetGallery()
  loadGallery()
  loadGalleryCounts()
}, { immediate: true })

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
        <span v-if="galleryCounts[tab.key]" class="ml-1 text-[11px] opacity-70">({{ galleryCounts[tab.key] }})</span>
      </button>
    </div>

    <!-- Media Gallery -->
    <MediaGallery
      :items="galleryItems"
      :tab="activeTab"
      :loading="galleryLoading"
      :hasMore="galleryHasMore"
      @openLightbox="onMediaClick"
    />
  </div>
</template>
