import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Chat, Topic, Folder, NavState } from '../types'
import * as chatsApi from '../api/chats'

export const useChatStore = defineStore('chat', () => {
  // ── Chat list ───────────────────────────────────────────
  const chats = ref<Chat[]>([])
  const chatTotal = ref(0)
  const hasMoreChats = ref(true)
  const loadingChats = ref(true)
  const loadingMoreChats = ref(false)
  const chatOffset = ref(0)
  const chatsError = ref('')

  // ── Search ──────────────────────────────────────────────
  const searchQuery = ref('')
  const searchResults = ref<Chat[]>([])
  const searchLoading = ref(false)

  // ── Folders / Archive ───────────────────────────────────
  const folders = ref<Folder[]>([])
  const archivedCount = ref(0)

  // ── Forum Topics ────────────────────────────────────────
  const topics = ref<Topic[]>([])
  const loadingTopics = ref(false)

  // ── Selected chat ──────────────────────────────────────
  const selectedChat = ref<Chat | null>(null)

  // ── Navigation ──────────────────────────────────────────
  const navStack = ref<NavState[]>([{ type: 'chatList', filter: 'all' }])

  const currentNav = computed(() => navStack.value[navStack.value.length - 1])
  const canGoBack = computed(() => navStack.value.length > 1)

  const topicsNavEntry = computed(() => {
    const nav = currentNav.value
    if (nav.type === 'topics') return nav
    if (nav.type === 'chat' && nav.topicId) {
      for (let i = navStack.value.length - 2; i >= 0; i--) {
        if (navStack.value[i].type === 'topics') return navStack.value[i]
      }
    }
    return null
  })

  const activeTab = computed(() => {
    const nav = currentNav.value
    if (nav.type === 'chatList') {
      if (nav.filter === 'all') return 'all'
      if (nav.filter === 'archived') return 'archived'
      if (typeof nav.filter === 'object' && nav.filter.folderId) {
        return `folder_${nav.filter.folderId}`
      }
    }
    return 'all'
  })

  const filteredChats = computed(() => {
    if (searchQuery.value.trim()) return searchResults.value
    return chats.value
  })

  // ── Actions ─────────────────────────────────────────────
  async function loadChats(append = false) {
    if (!append) {
      loadingChats.value = true
      chatOffset.value = 0
      hasMoreChats.value = false
    } else {
      loadingMoreChats.value = true
    }
    try {
      const limit = 50
      const offset = append ? chatOffset.value : 0

      const nav = currentNav.value
      let archived: boolean | undefined = nav.type === 'chatList' ? (nav.filter === 'archived' ? true : nav.filter === 'all' ? false : undefined) : undefined
      let folderId: number | undefined = nav.type === 'chatList' && typeof nav.filter === 'object' ? nav.filter.folderId : undefined

      const data = await chatsApi.fetchChats({ limit, offset, archived, folderId })

      if (append) {
        chats.value.push(...data.chats)
      } else {
        chats.value = data.chats
      }
      chatTotal.value = data.total
      hasMoreChats.value = data.has_more
      chatOffset.value = offset + data.chats.length
      chatsError.value = ''
    } catch (e: any) {
      if (e?.status === 401) {
        // handled by auth store
      } else if (e?.status === 503) {
        const body = await e.json?.().catch(() => ({}))
        chatsError.value = body.detail || 'Database is busy.'
      } else {
        chatsError.value = 'Failed to load chats.'
      }
    } finally {
      loadingChats.value = false
      loadingMoreChats.value = false
    }
  }

  async function searchChats(query: string) {
    searchLoading.value = true
    try {
      const data = await chatsApi.fetchChats({ limit: 1000, offset: 0, search: query })
      searchResults.value = data.chats
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }

  async function loadFolders() {
    try {
      const data = await chatsApi.fetchFolders()
      folders.value = data.folders || []
    } catch { /* ignore */ }
  }

  async function loadArchivedCount() {
    try {
      const data = await chatsApi.fetchArchivedCount()
      archivedCount.value = data.count || 0
    } catch { /* ignore */ }
  }

  async function loadTopics(chatId: number) {
    loadingTopics.value = true
    try {
      const data = await chatsApi.fetchTopics(chatId)
      topics.value = data.topics || []
    } catch { /* ignore */ }
    finally { loadingTopics.value = false }
  }

  // ── Navigation ──────────────────────────────────────────
  function navigateTo(state: NavState) {
    navStack.value.push(state)
    if (state.type === 'chatList') loadChats()
  }

  function navigateBack() {
    if (navStack.value.length <= 1) return
    navStack.value.pop()
    const current = currentNav.value
    if (current.type === 'chatList') loadChats()
  }

  function navigateBackToChats() {
    while (navStack.value.length > 1) {
      const top = navStack.value[navStack.value.length - 1]
      if (top.type === 'topics' || (top.type === 'chat' && top.topicId)) {
        navStack.value.pop()
      } else break
    }
    const current = currentNav.value
    if (current.type === 'chatList') loadChats()
  }

  function showAllChats() {
    navStack.value = [{ type: 'chatList', filter: 'all' }]
    loadChats()
  }

  function selectFolder(folderId: number) {
    navigateTo({ type: 'chatList', filter: { folderId } })
  }

  function showArchived() {
    navigateTo({ type: 'chatList', filter: 'archived' })
  }

  function openForumTopics(chat: Chat) {
    navigateTo({ type: 'topics', chatId: chat.id, chatName: getChatName(chat), chat })
  }

  return {
    chats, chatTotal, hasMoreChats, loadingChats, loadingMoreChats, chatOffset, chatsError,
    searchQuery, searchResults, searchLoading,
    folders, archivedCount,
    topics, loadingTopics,
    selectedChat,
    navStack, currentNav, canGoBack, topicsNavEntry, activeTab, filteredChats,
    loadChats, searchChats, loadFolders, loadArchivedCount, loadTopics,
    navigateTo, navigateBack, navigateBackToChats, showAllChats, selectFolder, showArchived, openForumTopics,
  }
})

/** Shared helper (extracted from original) */
export function getChatName(chat: { title?: string | null; first_name?: string | null; last_name?: string | null; username?: string | null }) {
  if (chat.title) return chat.title
  const name = `${chat.first_name || ''} ${chat.last_name || ''}`.trim()
  return name || chat.username || 'Deleted Account'
}
