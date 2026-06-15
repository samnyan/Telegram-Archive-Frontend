<script setup lang="ts">
import type { MediaGalleryItem } from '../../types'

const props = defineProps<{
  items: MediaGalleryItem[]
  tab: 'video' | 'image' | 'voice' | 'files'
  loading: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  openLightbox: [item: MediaGalleryItem, index: number]
}>()

function thumbnailUrl(item: MediaGalleryItem): string {
  return item.thumb_url || item.media_url || ''
}

function mediaIcon(item: MediaGalleryItem): string {
  switch (item.type) {
    case 'video': case 'animation': return '▶'
    case 'voice': case 'audio': return '🎵'
    case 'document': return '📄'
    default: return ''
  }
}

function isVoiceType(): boolean {
  return props.tab === 'voice'
}

function canOpenLightbox(item: MediaGalleryItem): boolean {
  return ['photo', 'video', 'animation'].includes(item.type) && Boolean(item.media_url || item.file_path)
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function onThumbError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<template>
  <div class="p-2">
    <div v-if="loading && items.length === 0" class="media-grid">
      <div v-for="i in 12" :key="i" class="media-grid-item animate-pulse" />
    </div>

    <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-16 text-tg-muted">
      <span class="text-3xl mb-2">📭</span>
      <span class="text-sm">No {{ tab }} media found</span>
    </div>

    <div v-else class="media-grid">
      <div
        v-for="(item, index) in items" :key="item.id"
        class="media-grid-item"
        :class="{ 'is-voice': isVoiceType(), 'is-static': !canOpenLightbox(item) && !isVoiceType() }"
        :data-msg-id="item.message_id"
        :data-media-id="item.id"
        @click="canOpenLightbox(item) ? emit('openLightbox', item, index) : null"
      >
        <template v-if="!isVoiceType()">
          <img
            v-if="thumbnailUrl(item)"
            :src="thumbnailUrl(item)"
            :alt="item.file_name || item.type"
            loading="lazy"
            decoding="async"
            class="w-full h-full object-cover"
            @error="onThumbError"
          />

          <div class="media-fallback">
            <span class="text-2xl opacity-50">{{ mediaIcon(item) }}</span>
          </div>

          <div v-if="item.type === 'video' || item.type === 'animation'" class="media-play-overlay">
            <div class="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span v-if="formatDuration(item.duration)" class="media-duration">{{ formatDuration(item.duration) }}</span>
          </div>
        </template>

        <template v-else>
          <div class="w-full p-2 bg-gray-800/50 rounded-lg flex items-center gap-2">
            <span class="text-lg">🎵</span>
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-300 truncate">{{ item.file_name || item.sender_name || 'Audio' }}</div>
              <div class="text-[10px] text-tg-muted">
                <span>{{ formatDate(item.message_date) }}</span>
                <span v-if="formatDuration(item.duration)"> · {{ formatDuration(item.duration) }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-if="tab === 'files'" class="media-file-meta">
          <span class="truncate">{{ item.file_name || 'Document' }}</span>
          <span v-if="formatFileSize(item.file_size)" class="opacity-70">{{ formatFileSize(item.file_size) }}</span>
        </div>
      </div>
    </div>

    <div v-if="loading && items.length > 0" class="flex justify-center py-6">
      <div class="loading-spinner" />
      <span class="ml-2 text-sm text-tg-muted">Loading more...</span>
    </div>

    <div v-else-if="!hasMore && items.length > 0" class="text-center py-6 text-tg-muted text-xs opacity-50">
      No more {{ tab }} media
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

.media-grid-item.is-static {
  cursor: default;
}

.media-grid-item.is-static:hover,
.media-grid-item.is-voice:hover {
  transform: none;
}

.media-grid-item.is-voice {
  aspect-ratio: auto;
  cursor: default;
}

.media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f2937;
  z-index: 0;
}

.media-grid-item img {
  position: relative;
  z-index: 1;
}

.media-play-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.15);
  opacity: 0.85;
  transition: opacity 0.15s;
}

.media-grid-item:hover .media-play-overlay {
  opacity: 1;
}

.media-duration {
  position: absolute;
  left: 6px;
  bottom: 5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0,0,0,0.65);
  color: white;
  font-size: 11px;
}

.media-file-meta {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px;
  background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
  color: white;
  font-size: 11px;
}
</style>
