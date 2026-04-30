import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GlobalStats } from '../types'
import * as statsApi from '../api/stats'

export const useStatsStore = defineStore('stats', () => {
  const statsData = ref<GlobalStats>({
    chats: 0,
    messages: 0,
    media_files: 0,
    total_size_mb: 0,
    stats_calculated_at: null,
  })
  const showStatsUI = ref(true)
  const viewerTimezone = ref('Europe/Madrid')
  const lastBackupTime = ref<string | null>(null)
  const lastBackupTimeSource = ref<'metadata' | 'sync_status'>('metadata')
  const listenerActive = ref(false)
  const loading = ref(true)
  const statsPopupOpen = ref(false)

  async function fetchStats() {
    try {
      const stats = await statsApi.fetchGlobalStats()
      statsData.value = {
        chats: stats.chats || 0,
        messages: stats.messages || 0,
        media_files: stats.media_files || 0,
        total_size_mb: stats.total_size_mb || 0,
        stats_calculated_at: stats.stats_calculated_at,
      }
      showStatsUI.value = stats.show_stats !== false
      if (stats.timezone) viewerTimezone.value = stats.timezone
      if (stats.last_backup_time) {
        lastBackupTime.value = stats.last_backup_time
        lastBackupTimeSource.value = stats.last_backup_time_source || 'metadata'
      }
      listenerActive.value = !!stats.listener_active
    } catch {
      // silently fail
    } finally {
      loading.value = false
    }
  }

  function formatNumber(num: number) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
    return num.toLocaleString()
  }

  function formatSize(sizeMB: number) {
    if (!sizeMB) return '0 MB'
    if (sizeMB >= 1024 * 1024) return (sizeMB / (1024 * 1024)).toFixed(2) + ' TB'
    if (sizeMB >= 1024) return (sizeMB / 1024).toFixed(1) + ' GB'
    return sizeMB.toFixed(0) + ' MB'
  }

  return {
    statsData, showStatsUI, viewerTimezone,
    lastBackupTime, lastBackupTimeSource, listenerActive,
    loading, statsPopupOpen,
    fetchStats, formatNumber, formatSize,
  }
})
