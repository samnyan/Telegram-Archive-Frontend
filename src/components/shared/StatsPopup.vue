<script setup lang="ts">
import { useStatsStore } from '../../stores/stats'

const stats = useStatsStore()
const emit = defineEmits<{ close: [] }>()

function formatStatsTime(iso: string | null) {
  if (!iso) return 'Never calculated'
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3600000
  if (diffH < 1) return 'Updated moments ago'
  if (diffH < 24) return `Updated ${Math.floor(diffH)}h ago`
  return `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
</script>

<template>
  <Teleport to="body">
    <div @click="emit('close')" class="fixed inset-0 z-40" />
    <div class="absolute left-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 min-w-[220px]">
      <div class="text-xs text-tg-muted space-y-2">
        <div class="font-semibold text-white mb-3 pb-2 border-b border-gray-700">Backup Statistics</div>
        <div class="flex justify-between"><span>Chats:</span><span class="text-white">{{ stats.formatNumber(stats.statsData.chats) }}</span></div>
        <div class="flex justify-between"><span>Messages:</span><span class="text-white">{{ stats.formatNumber(stats.statsData.messages) }}</span></div>
        <div class="flex justify-between"><span>Media files:</span><span class="text-white">{{ stats.formatNumber(stats.statsData.media_files) }}</span></div>
        <div class="flex justify-between"><span>Storage:</span><span class="text-white">{{ stats.formatSize(stats.statsData.total_size_mb) }}</span></div>
        <div class="pt-2 mt-2 border-t border-gray-700 text-[10px] opacity-70">
          {{ formatStatsTime(stats.statsData.stats_calculated_at) }}
        </div>
      </div>
    </div>
  </Teleport>
</template>
