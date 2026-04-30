import { ref, nextTick, type Ref } from 'vue'

export function useScrollToBottom(containerRef: Ref<HTMLElement | null>) {
  const showScrollBtn = ref(false)

  function scrollToBottom(immediate = false) {
    const el = containerRef.value
    if (!el) return

    const doScroll = () => {
      if (containerRef.value) containerRef.value.scrollTop = 0
    }

    if (immediate) {
      doScroll()
    } else {
      doScroll()
      requestAnimationFrame(doScroll)
      setTimeout(doScroll, 100)
      setTimeout(() => {
        doScroll()
        // Prime mobile scroll
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop = -1
          requestAnimationFrame(() => { if (el) el.scrollTop = 0 })
        }
      }, 300)
    }
  }

  function scrollToLatest() {
    scrollToBottom(true)
    showScrollBtn.value = false
  }

  return { showScrollBtn, scrollToBottom, scrollToLatest }
}
