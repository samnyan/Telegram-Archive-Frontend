<script setup lang="ts">
import type { Reaction } from '../../types'

defineProps<{
  reactions: Reaction[]
  isOwn: boolean
}>()

function formatEmoji(emoji: string): string {
  if (emoji.startsWith('custom_')) return '🎭'
  return emoji || '👍'
}
</script>

<template>
  <div class="mt-2 flex flex-wrap gap-1.5">
    <div
      v-for="reaction in reactions"
      :key="reaction.emoji"
      class="inline-flex items-center gap-1 px-2 py-1 rounded-full transition cursor-default"
      :class="isOwn ? 'bg-blue-500/20' : 'bg-black/20'"
      :title="reaction.count > 1 ? `${reaction.count} reactions` : '1 reaction'"
    >
      <span class="text-sm">{{ formatEmoji(reaction.emoji) }}</span>
      <span v-if="reaction.count > 1" class="text-[11px] font-medium opacity-80">{{ reaction.count }}</span>
    </div>
  </div>
</template>
