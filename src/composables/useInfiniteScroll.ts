import { ref, nextTick, onUnmounted, type Ref } from 'vue'

/**
 * IntersectionObserver that fires when a sentinel element becomes visible,
 * used for loading older messages (scroll up in flex-col-reverse container).
 */
export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  sentinelRef: Ref<HTMLElement | null>,
  onVisible: () => void,
  options: { rootMargin?: string } = {}
) {
  let observer: IntersectionObserver | null = null

  function setup() {
    if (observer) observer.disconnect()

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible()
      },
      {
        root: containerRef.value,
        rootMargin: options.rootMargin ?? '200px',
      }
    )

    nextTick(() => {
      if (sentinelRef.value) observer!.observe(sentinelRef.value)
    })
  }

  function reset() {
    if (observer) observer.disconnect()
    observer = null
  }

  onUnmounted(reset)

  return { setup, reset }
}
