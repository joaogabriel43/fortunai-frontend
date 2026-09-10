import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '../services/authService'
import { BACKEND_ORIGIN } from '../config/apiUrl'

const WS_URL = `${BACKEND_ORIGIN}/ws`
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
      },
      onDisconnect: () => {
        // Backoff exponencial: 1s → 2s → 4s → 8s → max 30s
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY_MS
        )
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      subscriptionRef.current?.unsubscribe()
      client.deactivate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
