import { ref, onUnmounted } from 'vue'

type WsMessageHandler = (data: any) => void

export function useWebSocket() {
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  const handlers = new Map<string, WsMessageHandler>()
  let onConnectCallback: (() => void) | null = null

  function onConnect(cb: () => void) {
    onConnectCallback = cb
  }

  function connect() {
    if (ws) ws.close()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/updates`

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        connected.value = true
        if (onConnectCallback) onConnectCallback()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const handler = handlers.get(data.type)
          if (handler) handler(data)
        } catch { /* parse error */ }
      }

      ws.onclose = () => {
        connected.value = false
        reconnectTimer = setTimeout(connect, 5000)
      }

      ws.onerror = () => {
        // onclose will handle reconnection
      }
    } catch {
      connected.value = false
    }
  }

  function subscribe(chatId: number) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'subscribe', chat_id: chatId }))
    }
  }

  function unsubscribe(chatId: number) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'unsubscribe', chat_id: chatId }))
    }
  }

  function on(type: string, handler: WsMessageHandler) {
    handlers.set(type, handler)
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  onUnmounted(disconnect)

  return { connected, connect, subscribe, unsubscribe, on, onConnect, disconnect }
}
