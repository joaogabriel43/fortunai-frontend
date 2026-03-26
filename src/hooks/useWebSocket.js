import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '../services/authService'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333/api'
const WS_URL = BASE_URL.replace('/api', '') + '/ws'
const HEARTBEAT_INTERVAL_MS = 20_000
const MAX_RECONNECT_DELAY_MS = 30_000

/**
 * Hook para conexão WebSocket STOMP com o backend.
 *
 * @param {Object} options
 * @param {Function} options.onNotificacao  callback chamado com cada nova notificação recebida
 */
export function useWebSocket({ onNotificacao }) {
  const clientRef = useRef(null)
  const reconnectDelayRef = useRef(1000)
  const heartbeatTimerRef = useRef(null)
  const subscriptionRef = useRef(null)

  useEffect(() => {
    const token = getToken()

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: reconnectDelayRef.current,
      onConnect: () => {
        // Backoff reset ao conectar com sucesso
        reconnectDelayRef.current = 1000

        subscriptionRef.current = client.subscribe(
          '/user/queue/notificacoes',
          (message) => {
            try {
              const notificacao = JSON.parse(message.body)
              onNotificacao?.(notificacao)
            } catch {
              // mensagem malformada — ignora
            }
          }
        )

        // Heartbeat: publica ping a cada 20s para manter conexão ativa
        heartbeatTimerRef.current = setInterval(() => {
          if (client.connected) {
            client.publish({ destination: '/app/ping', body: '' })
          }
        }, HEARTBEAT_INTERVAL_MS)
      },
      onDisconnect: () => {
        clearInterval(heartbeatTimerRef.current)
        // Backoff exponencial: 1s → 2s → 4s → 8s → max 30s
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY_MS
        )
      },
      onStompError: () => {
        clearInterval(heartbeatTimerRef.current)
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      clearInterval(heartbeatTimerRef.current)
      subscriptionRef.current?.unsubscribe()
      client.deactivate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
