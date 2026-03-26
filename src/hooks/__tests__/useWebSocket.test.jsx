import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@stomp/stompjs', () => {
  const activate = vi.fn()
  const deactivate = vi.fn()
  const publish = vi.fn()
  const subscribe = vi.fn()

  class Client {
    constructor(config) {
      this.activate = activate
      this.deactivate = deactivate
      this.publish = publish
      this.subscribe = subscribe
      this.connected = true
      Client._lastConfig = config
      Client._instance = this
    }
  }

  // Exponha as funções mock via propriedades estáticas
  Client._activate = activate
  Client._deactivate = deactivate
  Client._publish = publish
  Client._subscribe = subscribe

  return { Client }
})

vi.mock('sockjs-client', () => ({
  default: vi.fn(() => ({})),
}))

vi.mock('../../services/authService', () => ({
  getToken: vi.fn(() => 'mock-jwt-token'),
}))

import { useWebSocket } from '../useWebSocket'
import { Client } from '@stomp/stompjs'

describe('useWebSocket', () => {
  beforeEach(() => {
    Client._activate.mockClear()
    Client._deactivate.mockClear()
    Client._publish.mockClear()
    Client._subscribe.mockClear()
    Client._lastConfig = null
    Client._instance = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('cria Client STOMP com URL /ws e JWT no connectHeaders', () => {
    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))

    expect(Client._lastConfig).toMatchObject({
      connectHeaders: expect.objectContaining({
        Authorization: expect.stringContaining('mock-jwt-token'),
      }),
    })
  })

  it('ao receber mensagem no canal /user/queue/notificacoes, chama onNotificacao', () => {
    const onNotificacao = vi.fn()

    Client._activate.mockImplementationOnce(function() {
      const config = Client._lastConfig
      if (config?.onConnect) {
        Client._subscribe.mockImplementationOnce((_dest, cb) => {
          cb({ body: JSON.stringify({ id: '1', titulo: 'Alerta!', mensagem: 'PETR4 abaixou' }) })
          return { unsubscribe: vi.fn() }
        })
        config.onConnect({ headers: {} })
      }
    })

    renderHook(() => useWebSocket({ onNotificacao }))

    expect(onNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Alerta!' })
    )
  })

  it('chama client.deactivate no cleanup do useEffect', () => {
    const { unmount } = renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))
    unmount()
    expect(Client._deactivate).toHaveBeenCalled()
  })

  it('publica heartbeat ping a cada 20s', () => {
    Client._activate.mockImplementationOnce(function() {
      const config = Client._lastConfig
      if (config?.onConnect) {
        Client._subscribe.mockReturnValue({ unsubscribe: vi.fn() })
        config.onConnect({ headers: {} })
      }
    })

    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))

    act(() => { vi.advanceTimersByTime(20000) })

    expect(Client._publish).toHaveBeenCalledWith(
      expect.objectContaining({ destination: '/app/ping' })
    )
  })
})
