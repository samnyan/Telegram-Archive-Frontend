<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Message } from '../../types'
import { getMediaUrl } from '../../utils/media'
import { isLightboxMedia } from '../../utils/media'

const props = defineProps<{
  messages: Message[]
  tab: 'video' | 'image' | 'voice' | 'files'
}>()

const emit = defineEmits<{
  openLightbox: [msg: Message, index: number]
}>()

function thumbnailUrl(msg: Message): string {
  return getMediaUrl(msg)
}

function mediaIcon(msg: Message): string {
  switch (msg.media?.type) {
    case 'video': case 'animation': return '▶'
    case 'voice': case 'audio': return '🎵'
    case 'document': return '📄'
    default: return ''
  }
}

// For voice tab, show a small audio player instead of thumbnail
function isVoiceType(): boolean {
  return props.tab === 'voice'
}

function isLightboxCompatible(msg: Message): boolean {
  return isLightboxMedia(msg)
}

function formatFileSize(msg: Message): string {
  // Just show file name as proxy for size info
  const name = msg.media?.file_name || ''
  return name
}

let galleryVideoObserver: IntersectionObserver | null = null

function setupGalleryObserver() {
  if (galleryVideoObserver) galleryVideoObserver.disconnect()
  galleryVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) {
        if (!video.src && video.dataset.src) video.src = video.dataset.src
      }
    })
  }, { threshold: 0.1 })
  nextTick(() => {
    document.querySelectorAll('.media-grid-item .lazy-video').forEach(v => galleryVideoObserver?.observe(v))
  })
}

onMounted(setupGalleryObserver)
onUnmounted(() => galleryVideoObserver?.disconnect())

// Re-observe when messages change
watch(() => props.messages.length, () => nextTick(setupGalleryObserver))
</script>

<template>
  <div class="p-2">
    <div v-if="messages.length === 0" class="flex flex-col items-center justify-center py-16 text-tg-muted">
      <span class="text-3xl mb-2">📭</span>
      <span class="text-sm">No {{ tab }} media found</span>
      <span class="text-xs opacity-50 mt-1">Scroll further in chat to load more</span>
    </div>

    <!-- Media Grid -->
    <div v-else class="media-grid">
      <div
        v-for="(msg, index) in messages" :key="msg.id"
        class="media-grid-item"
        :class="{ 'is-voice': isVoiceType() }"
        :data-msg-id="msg.id"
        @click="isLightboxCompatible(msg) ? emit('openLightbox', msg, index) : null"
      >
        <!-- Image / Video thumbnail -->
        <template v-if="!isVoiceType()">
          <!-- Image thumbnail -->
          <img
            v-if="msg.media?.type === 'photo'"
            :src="thumbnailUrl(msg)"
            loading="lazy"
            class="w-full h-full object-cover"
            @error="(e: Event) => {
              const img = e.target as HTMLImageElement
              img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23374151%22 width=%22200%22 height=%22200%22/></svg>')
            }"
          />

          <!-- Video thumbnail (use video tag, not img) -->
          <video
            v-else-if="msg.media?.type === 'video' || msg.media?.type === 'animation'"
            :data-src="thumbnailUrl(msg)"
            class="w-full h-full object-cover lazy-video"
            muted
          />

          <!-- Document thumbnail fallback -->
          <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
            <span class="text-2xl opacity-50">{{ mediaIcon(msg) }}</span>
          </div>

          <!-- Play icon overlay for videos -->
          <div v-if="msg.media?.type === 'video' || msg.media?.type === 'animation'" class="media-play-overlay">
            <div class="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </template>

        <!-- Voice / Audio item -->
        <template v-else>
          <div class="w-full p-2 bg-gray-800/50 rounded-lg flex items-center gap-2">
            <span class="text-lg">🎵</span>
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-300 truncate">{{ formatFileSize(msg) }}</div>
              <div class="text-[10px] text-tg-muted">{{ msg.date?.slice(0, 10) }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 2px;
}

@media (width >= 640px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 3px;
  }
}

@media (width >= 1024px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 4px;
  }
}

.media-grid-item {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  cursor: pointer;
  border-radius: 4px;
  transition: transform 0.15s, opacity 0.15s;
  background: #1f2937;
}

.media-grid-item:hover {
  transform: scale(0.97);
  opacity: 0.9;
}

.media-grid-item.is-voice {
  aspect-ratio: auto;
  cursor: default;
}

.media-play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.15);
  opacity: 0.8;
  transition: opacity 0.15s;
}

.media-grid-item:hover .media-play-overlay {
  opacity: 1;
}
</style>
