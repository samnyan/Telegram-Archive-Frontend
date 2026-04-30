<script setup lang="ts">
import type { Message } from '../../types'
import { getMediaUrl, getDocumentDisplayName, isImageDocument, isAudioFile } from '../../utils/media'
import AlbumGrid from './AlbumGrid.vue'

const props = defineProps<{
  message: Message
  album?: Message[] | null
  isFirstInAlbum?: boolean
  noDownload: boolean
}>()

const emit = defineEmits<{
  openMedia: [msg: Message]
  imageError: [event: Event, msg: Message]
  mediaError: [event: Event, msg: Message]
}>()

const defaultImageSvg = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">` +
  `<rect fill="#374151" width="200" height="150"/>` +
  `<text x="100" y="70" text-anchor="middle" fill="#9CA3AF" font-family="system-ui" font-size="12">Media not found</text>` +
  `<text x="100" y="90" text-anchor="middle" fill="#6B7280" font-family="system-ui" font-size="10">(file may be missing from disk)</text>` +
  `</svg>`
)

function isAlbum(msg: Message) {
  return !!msg.raw_data?.grouped_id && (props.isFirstInAlbum ?? false)
}

function albumPhotos(): Message[] {
  return props.album?.filter(m =>
    m.media?.type === 'photo' || m.media?.type === 'video'
  ) ?? []
}
</script>

<template>
  <!-- Pending download placeholder -->
  <div
    v-if="message.media?.type && !message.media?.file_path"
    class="bg-gray-700/50 rounded-lg p-4 flex items-center gap-3 max-w-md"
  >
    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <div>
      <div class="text-sm text-gray-300">{{ message.media?.type }}</div>
      <div class="text-xs text-gray-500">Will download on next backup</div>
    </div>
  </div>

  <!-- Album Grid -->
  <AlbumGrid v-else-if="isAlbum(message) && album" :count="album.length">
    <div
      v-for="albumMsg in album" :key="albumMsg.id"
      class="album-item relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition"
      @click="emit('openMedia', albumMsg)"
    >
      <img
        v-if="albumMsg.media?.type === 'photo'"
        :src="getMediaUrl(albumMsg)" loading="lazy"
        class="w-full h-full object-cover"
        @error="emit('imageError', $event, albumMsg)"
      />
      <video
        v-else-if="albumMsg.media?.type === 'video'"
        class="w-full h-full object-cover lazy-video"
        :data-src="getMediaUrl(albumMsg)"
      />
      <div v-if="albumMsg.media?.type === 'video'" class="absolute inset-0 flex items-center justify-center bg-black/20">
        <svg class="w-10 h-10 text-white/90" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  </AlbumGrid>

  <!-- Regular photo -->
  <img
    v-else-if="message.media?.type === 'photo' && !message.raw_data?.grouped_id"
    :src="getMediaUrl(message)" loading="lazy"
    class="rounded-lg max-h-64 max-w-full object-cover cursor-pointer hover:opacity-90 transition"
    @click="emit('openMedia', message)"
    @error="emit('imageError', $event, message)"
  />

  <!-- Audio / Voice -->
  <div
    v-else-if="isAudioFile(message)"
    class="w-full min-w-[250px] max-w-md bg-gradient-to-r from-gray-800 to-gray-700 p-3 rounded-xl shadow-lg"
  >
    <audio controls preload="metadata" class="w-full" style="height:40px;min-height:40px" :src="getMediaUrl(message)" />
    <div class="flex items-center gap-2 mt-2 text-xs text-gray-400">
      <span>🎵</span>
      <span class="truncate">{{ getDocumentDisplayName(message) }}</span>
    </div>
  </div>

  <!-- GIF / Animation -->
  <video
    v-else-if="message.media?.type === 'animation'"
    :data-src="getMediaUrl(message)"
    class="rounded-lg max-h-64 w-auto max-w-full gif-video lazy-video" loop muted playsinline
    @click="emit('openMedia', message)"
  />

  <!-- Video -->
  <div
    v-else-if="message.media?.type === 'video'"
    class="relative cursor-pointer group" @click="emit('openMedia', message)"
  >
    <video
      class="rounded-lg max-h-64 w-full pointer-events-none lazy-video"
      :data-src="getMediaUrl(message)"
      @error="emit('mediaError', $event, message)"
    />
    <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition rounded-lg">
      <div class="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
        <svg class="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Sticker -->
  <div v-else-if="message.media?.type === 'sticker'" class="max-w-[200px]">
    <img
      v-if="getDocumentDisplayName(message).endsWith('.webp')"
      :src="getMediaUrl(message)" loading="lazy"
      class="max-h-48 max-w-full object-contain"
      @error="emit('imageError', $event, message)"
    />
    <div v-else class="text-xs text-tg-muted p-2 bg-black/20 rounded">🎭 Animated Sticker</div>
  </div>

  <!-- Image document -->
  <div v-else-if="message.media?.type === 'document' && isImageDocument(message)" class="space-y-1">
    <img
      :src="getMediaUrl(message)" loading="lazy"
      class="rounded-lg max-h-48 max-w-full object-cover cursor-pointer hover:opacity-90 transition"
      @click="emit('openMedia', message)"
      @error="emit('imageError', $event, message)"
    />
    <div class="flex items-center justify-between text-[11px] opacity-80">
      <span class="truncate mr-2">{{ getDocumentDisplayName(message) }}</span>
      <a
        v-if="!noDownload"
        :href="getMediaUrl(message) + '?download=1'" download
        class="text-blue-400 hover:text-blue-300 whitespace-nowrap"
      >Download</a>
    </div>
  </div>

  <!-- Other documents -->
  <a
    v-else-if="message.media?.type === 'document'"
    :href="noDownload ? '#' : getMediaUrl(message) + '?download=1'"
    :download="!noDownload"
    :class="{ 'pointer-events-none opacity-60': noDownload }"
    class="flex items-center gap-2 bg-black/20 p-2 rounded hover:bg-black/30 transition"
  >
    <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <div class="flex flex-col text-xs">
      <span class="font-medium truncate">{{ getDocumentDisplayName(message) }}</span>
      <span v-if="message.media?.type" class="text-[10px] text-tg-muted">{{ message.media.type }} file</span>
    </div>
  </a>
</template>
