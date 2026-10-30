import { useEffect, useRef } from 'react'
import { Client, ReconnectionTimeMode } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '../services/authService'
import { BACKEND_ORIGIN } from '../config/apiUrl'

const WS_URL = `${BACKEND_ORIGIN}/ws`
const RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30_000

// UM cliente STOMP por sessão (aba), compartilhado por todas as instâncias do hook.
// Antes era um cliente por componente montado (o Layout monta 3 badges) com reconexão
// fixa de 1s, o que estourava o limite de handshake do backend (30/min/IP) e entrava
// em loop de 429 no /ws/info. O backoff exponencial é o nativo do stompjs 7.
let sharedClient = null
const listeners = new Set()

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

function getOrCreateClient() {
  if (sharedClient) return sharedClient
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: authHeaders(),
    // O access token pode ter sido renovado (ADR-029) entre uma tentativa e outra.
    beforeConnect: (c) => { c.connectHeaders = authHeaders() },
    reconnectDelay: RECONNECT_DELAY_MS,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    maxReconnectDelay: MAX_RECONNECT_DELAY_MS,
    onConnect: () => {
      client.subscribe('/user/queue/notificacoes', (message) => {
        let payload
        try {
          payload = JSON.parse(message.body)
        } catch {
          return // payload malformado — ignora
        }
        listeners.forEach((listener) => listener(payload))
      })
    },
    // CONNECT rejeitado pelo WebSocketAuthInterceptor (JWT ausente/inválido/expirado).
    // Com token presente, deixa o backoff nativo seguir: o beforeConnect pega o token
    // renovado pelo api.js (ADR-029) na próxima tentativa (≤2 handshakes/min no teto).
    // Sem token, não há o que tentar — para, e a próxima montagem reabre. Compara com
    // `client` (não `sharedClient`) para um ERROR atrasado não matar um cliente mais novo.
    onStompError: () => {
      if (getToken()) return
      if (sharedClient === client) sharedClient = null
      client.deactivate()
    },
  })
  sharedClient = client
  client.activate()
  return client
}

function destroyClient() {
  const client = sharedClient
  sharedClient = null
  client?.deactivate()
}

/**
 * Assina as notificações em tempo real do usuário autenticado.
 * @param {{ onNotificacao: (payload: object) => void }} options
 */
export function useWebSocket({ onNotificacao }) {
  const onNotificacaoRef = useRef(onNotificacao)
  onNotificacaoRef.current = onNotificacao

  useEffect(() => {
    if (!getToken()) return undefined
    const listener = (payload) => onNotificacaoRef.current?.(payload)
    listeners.add(listener)
    getOrCreateClient()
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) destroyClient()
    }
  }, [])
}
