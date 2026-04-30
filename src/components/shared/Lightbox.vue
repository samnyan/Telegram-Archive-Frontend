<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { Message } from '../../types'
import { getMediaUrl } from '../../utils/media'
import { formatDateFull, formatTime } from '../../utils/format'

const props = defineProps<{
  media: Message
  index: number
  total: number
  noDownload: boolean
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

function isImage(msg: Message): boolean {
  const t = msg.media?.type
  return t === 'photo' || (t === 'document' && isImageDoc(msg))
}

function isVideo(msg: Message): boolean {
  const t = msg.media?.type
  return t === 'video' || t === 'animation'
}

function isImageDoc(msg: Message): boolean {
  const name = (msg.media?.file_name || msg.media?.file_path || '').toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => name.endsWith(ext))
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') emit('prev')
  else if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" @click.self="emit('close')">
      <!-- Close -->
      <button @click="emit('close')" class="absolute top-4 right-4 z-60 p-2 text-white/70 hover:text-white transition">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Download -->
      <a
        v-if="!noDownload"
        :href="getMediaUrl(media) + '?download=1'" download
        class="absolute top-4 right-16 z-60 p-2 text-white/70 hover:text-white transition"
      >
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>

      <!-- Previous -->
      <button
        v-if="index > 0"
        @click.stop="emit('prev')"
        class="absolute left-4 top-1/2 -translate-y-1/2 z-60 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Next -->
      <button
        v-if="index < total - 1"
        @click.stop="emit('next')"
        class="absolute right-4 top-1/2 -translate-y-1/2 z-60 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Image -->
      <img
        v-if="isImage(media)"
        :src="getMediaUrl(media)"
        class="max-h-[90vh] max-w-[90vw] object-contain"
        @click.stop
      />

      <!-- Video -->
      <video
        v-else-if="isVideo(media)"
        :src="getMediaUrl(media)"
        class="max-h-[90vh] max-w-[90vw] object-contain"
        controls autoplay
        @click.stop
      />

      <!-- Info bar -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full">
        {{ formatDateFull(media.date) }} {{ formatTime(media.date) }}
        <span v-if="total > 1" class="ml-2 opacity-70">{{ index + 1 }} / {{ total }}</span>
      </div>
    </div>
  </Teleport>
</template>
