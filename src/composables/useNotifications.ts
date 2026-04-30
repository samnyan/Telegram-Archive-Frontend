import { ref } from 'vue'

export function useNotifications() {
  const enabled = ref(false)
  const permission = ref(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const pushEnabled = ref(false)
  const pushSubscribed = ref(false)
  const pushVapidKey = ref<string | null>(null)
  const notificationsBlocked = ref(false)

  let pushSubscription: PushSubscription | null = null

  async function init() {
    // Fetch push config
    try {
      const res = await fetch('/api/push/config', { credentials: 'include' })
      if (res.ok) {
        const cfg = await res.json()
        pushEnabled.value = cfg.enabled
        pushVapidKey.value = cfg.vapid_public_key
      }
    } catch { /* ignore */ }

    // Fetch notification settings
    try {
      const res = await fetch('/api/notifications/settings', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        enabled.value = data.enabled
      }
    } catch {
      if (pushEnabled.value) enabled.value = true
    }

    // Register service worker
    if ('serviceWorker' in navigator && (enabled.value || pushEnabled.value)) {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        if (pushEnabled.value && 'PushManager' in window) {
          const reg = await navigator.serviceWorker.ready
          pushSubscription = await reg.pushManager.getSubscription()
          if (pushSubscription) {
            pushSubscribed.value = true
            await syncToServer(pushSubscription)
            if (permission.value === 'denied') {
              notificationsBlocked.value = true
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  async function requestPermission() {
    try {
      const p = await Notification.requestPermission()
      permission.value = p
      if (p === 'granted' && pushEnabled.value && !pushSubscribed.value) {
        await subscribeToPush()
      }
    } catch { /* ignore */ }
  }

  function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - base64.length % 4) % 4)
    const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding)
    return Uint8Array.from(raw, c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
  }

  async function subscribeToPush() {
    if (!pushEnabled.value || !pushVapidKey.value) return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    try {
      const reg = await navigator.serviceWorker.ready
      pushSubscription = await reg.pushManager.getSubscription()
      if (!pushSubscription) {
        pushSubscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushVapidKey.value),
        })
      }
      await syncToServer(pushSubscription)
      localStorage.setItem('push_enabled', 'true')
      return true
    } catch {
      return false
    }
  }

  async function syncToServer(sub: PushSubscription) {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      pushSubscribed.value = true
    } catch { /* ignore */ }
  }

  async function unsubscribeFromPush() {
    if (!pushSubscription) return
    try {
      await pushSubscription.unsubscribe()
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: pushSubscription.endpoint }),
      })
      pushSubscription = null
      pushSubscribed.value = false
      localStorage.removeItem('push_enabled')
    } catch { /* ignore */ }
  }

  function showDesktopNotification(data: {
    chat_name: string
    body: string
    chat_id: number
  }) {
    if (permission.value !== 'granted') return
    if (pushEnabled.value && pushSubscribed.value) return
    new Notification(data.chat_name, {
      body: data.body,
      icon: '/static/favicon.ico',
      tag: `chat-${data.chat_id}`,
    })
  }

  return {
    enabled, permission, pushEnabled, pushSubscribed, notificationsBlocked,
    init, requestPermission, subscribeToPush, unsubscribeFromPush,
    showDesktopNotification,
  }
}
