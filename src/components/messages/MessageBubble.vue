<script setup lang="ts">
import { computed } from 'vue'
import type { Message, Chat } from '../../types'
import { formatTime } from '../../utils/format'
import { linkifyText, hashColor, getInitials } from '../../utils/text'
import PollRenderer from './PollRenderer.vue'
import MediaRenderer from './MediaRenderer.vue'
import Reactions from './Reactions.vue'

const props = defineProps<{
  message: Message
  index: number
  chat: Chat | null
  // Album support
  album?: Message[] | null
  isFirstInAlbum?: boolean
  isHiddenAlbum?: boolean
  // Date separator
  showDateSep: boolean
  // Context
  noDownload: boolean
  // Sender
  showSender: boolean
}>()

const emit = defineEmits<{
  replyClick: [msgId: number]
  openMedia: [msg: Message]
  imageError: [event: Event, msg: Message]
  mediaError: [event: Event, msg: Message]
  jumpToDate: [date: string]
}>()

const isGroup = computed(() =>
  props.chat && (props.chat.type === 'group' || props.chat.type === 'channel')
)

function isOwn(): boolean {
  if (props.message.is_outgoing !== undefined && props.message.is_outgoing !== null) {
    return props.message.is_outgoing === 1
  }
  if (props.chat?.type === 'private') {
    return props.message.sender_id !== props.chat.id
  }
  return false
}

function senderName(): string {
  const m = props.message
  if (m.raw_data?.post_author) return m.raw_data.post_author
  if (m.first_name || m.last_name) return `${m.first_name || ''} ${m.last_name || ''}`.trim()
  if (m.username) return m.username
  if (m.sender_id) return `User ${m.sender_id}`
  return 'Deleted Account'
}

function senderNameColor(): string {
  const id = props.message.sender_id ?? props.message.chat_id ?? 0
  return `hsl(${hashColor(id)}, 70%, 65%)`
}

function forwardName(): string | null {
  const m = props.message
  if (m.raw_data?.forward_from_name) return m.raw_data.forward_from_name
  if (m.forward_from_id) return `ID: ${m.forward_from_id}`
  return null
}

function bubbleBg(): string {
  return isOwn()
    ? 'hsla(210, 60%, 28%, 0.95)'
    : 'hsla(220, 20%, 25%, 0.80)'
}

function onOpenMedia(msg: Message) {
  emit('openMedia', msg)
}

function onImageError(event: Event, msg: Message) {
  emit('imageError', event, msg)
}

function onMediaError(event: Event, msg: Message) {
  emit('mediaError', event, msg)
}
const albumCaption = computed(() => {
  if (!props.album) return null
  const m = props.album.find(m => m.text && m.text.trim())
  return m?.text ?? null
})

const displayText = computed(() => albumCaption.value || props.message.text)
</script>

<template>
  <!-- Service Message -->
  <div v-if="message.raw_data?.service_type === 'service'" class="flex justify-center my-2">
    <div class="px-4 py-1.5 rounded-full text-xs text-center max-w-[80%]" style="background:rgba(0,0,0,0.3);color:rgba(255,255,255,0.8)">
      {{ message.text }}
    </div>
  </div>

  <!-- Regular Message -->
  <div v-else class="flex" :class="isOwn() ? 'justify-end' : 'justify-start'">
    <div class="message-bubble p-3 text-sm shadow-sm text-gray-100" :style="{ backgroundColor: bubbleBg() }">
      <!-- Sender Name (group, not own, first in sequence) -->
      <div v-if="!isOwn() && isGroup && showSender" class="text-xs font-bold mb-1" :style="{ color: senderNameColor() }">
        {{ senderName() }}
      </div>

      <!-- Reply Context -->
      <div
        v-if="message.reply_to_msg_id"
        @click="emit('replyClick', message.reply_to_msg_id!)"
        class="border-l-2 border-blue-400/50 pl-2 mb-2 text-xs bg-black/20 rounded p-2 cursor-pointer hover:bg-black/30 transition"
      >
        <div class="font-semibold text-blue-400 mb-0.5">Reply to</div>
        <div class="truncate opacity-70">{{ message.reply_to_text || 'Message' }}</div>
      </div>

      <!-- Forwarded Info -->
      <div v-if="forwardName()" class="border-l-2 border-green-400/50 pl-2 mb-2 text-xs bg-black/20 rounded p-2">
        <div class="font-semibold text-green-400 mb-0.5">Forwarded from</div>
        <div class="truncate opacity-90">{{ forwardName() }}</div>
      </div>

      <!-- Poll -->
      <PollRenderer v-if="message.raw_data?.poll" :poll="message.raw_data.poll" />

      <!-- Media -->
      <div v-if="message.media?.file_path || message.media?.type" class="mb-2 space-y-1">
        <MediaRenderer
          :message="message"
          :album="album"
          :isFirstInAlbum="isFirstInAlbum"
          :noDownload="noDownload"
          @openMedia="onOpenMedia"
          @imageError="onImageError"
          @mediaError="onMediaError"
        />
      </div>

      <!-- Text -->
      <div class="whitespace-pre-wrap break-words message-text" v-html="linkifyText(displayText)" />

      <!-- Reactions -->
      <Reactions v-if="message.reactions?.length" :reactions="message.reactions" :isOwn="isOwn()" />

      <!-- Metadata -->
      <div class="text-[10px] opacity-60 text-right mt-1 flex justify-end items-center gap-1">
        <span v-if="message.edit_date">edited</span>
        {{ formatTime(message.date) }}
      </div>
    </div>
  </div>

  <!-- Date Separator (rendered AFTER message for flex-col-reverse) -->
  <div v-if="showDateSep" class="date-separator">
    <span @click="emit('jumpToDate', message.date)">{{ $props.message.date }}</span>
  </div>
</template>
