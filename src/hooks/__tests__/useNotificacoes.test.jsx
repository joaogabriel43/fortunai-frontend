import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(({ onNotificacao }) => {
    // Store for testing — exposed via global for test manipulation
    global.__testOnNotificacao = onNotificacao
    return {}
  }),
}))

import { useNotificacoes } from '../useNotificacoes'
import api from '../../services/api'

describe('useNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.__testOnNotificacao = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.__testOnNotificacao
  })

  it('busca contagem inicial via GET /api/notificacoes/count', async () => {
    api.get.mockResolvedValueOnce({ data: { naoLidas: 7 } })

    const { result } = renderHook(() => useNotificacoes())

    await waitFor(() => {
      expect(result.current.naoLidas).toBe(7)
    })

    expect(api.get).toHaveBeenCalledWith('/notificacoes/count')
  })

  it('marcarComoLida() chama PATCH e decrementa contador', async () => {
    api.get.mockResolvedValueOnce({ data: { naoLidas: 3 } })
    api.patch.mockResolvedValueOnce({ data: {} })

    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.naoLidas).toBe(3))

    await act(async () => {
      await result.current.marcarComoLida('abc-123')
    })

    expect(api.patch).toHaveBeenCalledWith('/notificacoes/abc-123/lida')
    expect(result.current.naoLidas).toBe(2)
  })

  it('novaNotificacao() via WebSocket incrementa contador', async () => {
    api.get.mockResolvedValueOnce({ data: { naoLidas: 0 } })

    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.naoLidas).toBe(0))

    act(() => {
      global.__testOnNotificacao?.({ id: '1', titulo: 'Alerta!', mensagem: 'msg' })
    })

    expect(result.current.naoLidas).toBe(1)
  })
})
