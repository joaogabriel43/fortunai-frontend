import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@stomp/stompjs', () => {
  const activate = vi.fn()
  const deactivate = vi.fn()
  const publish = vi.fn()
  const subscribe = vi.fn()

  class Client {
    constructor(config) {
      this.connectHeaders = config.connectHeaders
      this.activate = activate
      this.deactivate = deactivate
      this.publish = publish
      this.subscribe = subscribe
      this.connected = true
      Client._lastConfig = config
      Client._instance = this
      Client._instancias += 1
    }
  }

  // Exponha as funções mock via propriedades estáticas
  Client._instancias = 0
  Client._activate = activate
  Client._deactivate = deactivate
  Client._publish = publish
  Client._subscribe = subscribe

  return {
    Client,
    ReconnectionTimeMode: { LINEAR: 'LINEAR', EXPONENTIAL: 'EXPONENTIAL' },
  }
})

vi.mock('sockjs-client', () => ({
  default: vi.fn(() => ({})),
}))

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }))
vi.mock('../../services/authService', () => ({ getToken }))

// O hook guarda UM cliente por sessão em estado de módulo; cada teste precisa
// de um módulo novo (e do mock de stompjs correspondente a ele).
let useWebSocket
let Client

function conectar() {
  Client._subscribe.mockReturnValue({ unsubscribe: vi.fn() })
  act(() => { Client._lastConfig.onConnect({ headers: {} }) })
}

function entregarMensagem(payload) {
  const [, callback] = Client._subscribe.mock.calls.at(-1)
  act(() => { callback({ body: JSON.stringify(payload) }) })
}

describe('useWebSocket', () => {
  beforeEach(async () => {
    vi.resetModules()
    getToken.mockReset().mockReturnValue('mock-jwt-token')
    ;({ Client } = await import('@stomp/stompjs'))
    Client._instancias = 0
    Client._lastConfig = null
    Client._instance = null
    ;[Client._activate, Client._deactivate, Client._publish, Client._subscribe].forEach((fn) => fn.mockReset())
    ;({ useWebSocket } = await import('../useWebSocket'))
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
    expect(Client._activate).toHaveBeenCalledTimes(1)
  })

  it('ao receber mensagem no canal /user/queue/notificacoes, chama onNotificacao', () => {
    const onNotificacao = vi.fn()

    renderHook(() => useWebSocket({ onNotificacao }))
    conectar()
    expect(Client._subscribe).toHaveBeenCalledWith('/user/queue/notificacoes', expect.any(Function))

    entregarMensagem({ id: '1', titulo: 'Alerta!', mensagem: 'PETR4 abaixou' })

    expect(onNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Alerta!' })
    )
  })

  it('varios componentes montados compartilham UM unico Client (uma conexao por sessao)', () => {
    const primeiro = vi.fn()
    const segundo = vi.fn()
    const terceiro = vi.fn()

    const a = renderHook(() => useWebSocket({ onNotificacao: primeiro }))
    const b = renderHook(() => useWebSocket({ onNotificacao: segundo }))
    const c = renderHook(() => useWebSocket({ onNotificacao: terceiro }))

    expect(Client._instancias).toBe(1)
    expect(Client._activate).toHaveBeenCalledTimes(1)

    conectar()
    expect(Client._subscribe).toHaveBeenCalledTimes(1)

    entregarMensagem({ id: '7', titulo: 'Digest' })
    expect(primeiro).toHaveBeenCalledTimes(1)
    expect(segundo).toHaveBeenCalledTimes(1)
    expect(terceiro).toHaveBeenCalledTimes(1)

    // Só o último consumidor a sair derruba a conexão.
    a.unmount()
    b.unmount()
    expect(Client._deactivate).not.toHaveBeenCalled()
    c.unmount()
    expect(Client._deactivate).toHaveBeenCalledTimes(1)
  })

  it('componente desmontado deixa de receber notificacoes, os demais continuam', () => {
    const fica = vi.fn()
    const sai = vi.fn()

    renderHook(() => useWebSocket({ onNotificacao: fica }))
    const { unmount } = renderHook(() => useWebSocket({ onNotificacao: sai }))
    conectar()
    unmount()

    entregarMensagem({ id: '2', titulo: 'Meta' })

    expect(fica).toHaveBeenCalledTimes(1)
    expect(sai).not.toHaveBeenCalled()
  })

  it('reconecta com backoff exponencial a partir de 1s com teto de 30s', () => {
    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))

    expect(Client._lastConfig).toMatchObject({
      reconnectDelay: 1000,
      reconnectTimeMode: 'EXPONENTIAL',
      maxReconnectDelay: 30_000,
    })
  })

  it('renova o JWT no header a cada tentativa de conexao', async () => {
    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))
    getToken.mockReturnValue('token-renovado')

    await Client._lastConfig.beforeConnect(Client._instance)

    expect(Client._instance.connectHeaders.Authorization).toBe('Bearer token-renovado')
  })

  it('sem JWT na sessao nao abre conexao nenhuma', () => {
    getToken.mockReturnValue(null)

    const { unmount } = renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))

    expect(Client._instancias).toBe(0)
    expect(Client._activate).not.toHaveBeenCalled()
    unmount()
    expect(Client._deactivate).not.toHaveBeenCalled()
  })

  it('STOMP ERROR com token presente (access expirado, refresh válido) deixa o backoff nativo reconectar', () => {
    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))

    act(() => {
      Client._lastConfig.onStompError({ headers: { message: 'JWT expirado' }, body: '' })
    })

    // o beforeConnect pega o token renovado pelo api.js na próxima tentativa
    expect(Client._deactivate).not.toHaveBeenCalled()
    expect(Client._instancias).toBe(1)
  })

  it('STOMP ERROR sem token (sessão encerrada) desativa e a próxima montagem cria um cliente novo', () => {
    const { unmount } = renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))
    getToken.mockReturnValue(null)

    act(() => {
      Client._lastConfig.onStompError({ headers: { message: 'JWT invalido' }, body: '' })
    })

    expect(Client._deactivate).toHaveBeenCalledTimes(1)
    unmount()

    // o cliente morto não pode ser reaproveitado: um novo login reabre do zero
    getToken.mockReturnValue('mock-jwt-token')
    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))
    expect(Client._instancias).toBe(2)
    expect(Client._activate).toHaveBeenCalledTimes(2)
  })

  it('chama client.deactivate no cleanup do useEffect', () => {
    const { unmount } = renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))
    unmount()
    expect(Client._deactivate).toHaveBeenCalled()
  })

  it('usa o heartbeat STOMP sem publicar keep-alive no destino de aplicacao', () => {
    renderHook(() => useWebSocket({ onNotificacao: vi.fn() }))
    conectar()

    act(() => { vi.advanceTimersByTime(60000) })

    expect(Client._publish).not.toHaveBeenCalled()
  })
})
