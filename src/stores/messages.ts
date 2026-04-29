import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, ChatStats } from '../types'
import * as messagesApi from '../api/messages'
import * as statsApi from '../api/stats'

export const useMessageStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(0)

  const messageSearchQuery = ref('')

  // ── Pinned ──────────────────────────────────────────────
  const pinnedMessages = ref<Message[]>([])
  const currentPinnedIndex = ref(0)
  const showPinnedOnly = ref(false)

  const pinnedMessage = computed(() => {
    if (pinnedMessages.value.length === 0) return null
    return pinnedMessages.value[currentPinnedIndex.value] || pinnedMessages.value[0]
  })

  // ── Chat stats ──────────────────────────────────────────
  const chatStats = ref<ChatStats | null>(null)

  // ── Selected chat ID (stored in message store for WS) ──
  const selectedChatId = ref<number | null>(null)

  // ── Computed ────────────────────────────────────────────
  const sortedMessages = computed(() => {
    if (showPinnedOnly.value) return pinnedMessages.value
    return [...messages.value].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  })

  // ── Actions ─────────────────────────────────────────────
  let chatVersion = 0

  async function loadMessages(chatId: number, topicId?: number) {
    if (loading.value || !hasMore.value) return

    const myVersion = ++chatVersion
    loading.value = true
    try {
      const limit = 50
      let beforeDate: string | undefined
      let beforeId: number | undefined

      if (messages.value.length > 0 && !messageSearchQuery.value) {
        const oldest = messages.value.reduce((a, b) =>
          new Date(a.date) < new Date(b.date) ? a : b
        )
        beforeDate = oldest.date
        beforeId = oldest.id
      }

      const result = await messagesApi.fetchMessages({
        chatId,
        limit,
        topicId,
        beforeDate,
        beforeId,
        search: messageSearchQuery.value || undefined,
        offset: messageSearchQuery.value ? page.value * limit : undefined,
      })

      if (chatVersion !== myVersion) return

      if (result.length < limit) hasMore.value = false

      const byId = new Map(messages.value.map(m => [m.id, m]))
      for (const m of result) byId.set(m.id, m)
      messages.value = Array.from(byId.values())
      page.value++
    } finally {
      if (chatVersion === myVersion) loading.value = false
    }
  }

  async function loadPinnedMessages(chatId: number) {
    try {
      pinnedMessages.value = await messagesApi.fetchPinnedMessages(chatId)
      currentPinnedIndex.value = 0
    } catch {
      pinnedMessages.value = []
    }
  }

  async function loadChatStats(chatId: number) {
    try {
      chatStats.value = await statsApi.fetchChatStats(chatId)
    } catch {
      chatStats.value = null
    }
  }

  function reset() {
    messages.value = []
    page.value = 0
    hasMore.value = true
    messageSearchQuery.value = ''
    chatStats.value = null
    pinnedMessages.value = []
    currentPinnedIndex.value = 0
    showPinnedOnly.value = false
    chatVersion++
  }

  function setSelectedChatId(chatId: number | null) {
    selectedChatId.value = chatId
  }

  // ── Real-time updates (called from WS composable) ──────
  function handleNewMessage(msg: Message) {
    if (!messages.value.some(m => m.id === msg.id)) {
      messages.value.push(msg)
    }
  }

  function handleEditMessage(messageId: number, newText: string, editDate: string) {
    const msg = messages.value.find(m => m.id === messageId)
    if (msg) {
      msg.text = newText
      msg.edit_date = editDate
    }
  }

  function handleDeleteMessage(messageId: number) {
    const idx = messages.value.findIndex(m => m.id === messageId)
    if (idx !== -1) messages.value.splice(idx, 1)
  }

  // ── Pinned cycling ─────────────────────────────────────
  function cyclePinned() {
    if (pinnedMessages.value.length > 1) {
      currentPinnedIndex.value = (currentPinnedIndex.value + 1) % pinnedMessages.value.length
    }
  }

  function openPinnedView() {
    showPinnedOnly.value = true
  }

  function closePinnedView() {
    showPinnedOnly.value = false
  }

  return {
    messages, sortedMessages, loading, hasMore, page,
    messageSearchQuery, chatStats,
    pinnedMessages, pinnedMessage, currentPinnedIndex, showPinnedOnly, selectedChatId,
    loadMessages, loadPinnedMessages, loadChatStats, reset, setSelectedChatId,
    handleNewMessage, handleEditMessage, handleDeleteMessage,
    cyclePinned, openPinnedView, closePinnedView,
  }
})
