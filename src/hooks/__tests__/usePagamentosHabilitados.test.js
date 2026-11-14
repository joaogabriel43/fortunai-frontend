import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const pagamentosLiberados = vi.hoisted(() => vi.fn())
vi.mock('../../services/assinaturaService', () => ({ assinaturaService: { pagamentosLiberados } }))

/** Importa o hook com a constante do frontend no valor pedido. */
const carregarHook = async (constante) => {
  vi.resetModules()
  vi.doMock('../../config/features', () => ({ PAGAMENTOS_HABILITADOS: constante }))
  return (await import('../usePagamentosHabilitados')).default
}

beforeEach(() => vi.clearAllMocks())

describe('usePagamentosHabilitados (constante + /api/features)', () => {
  it('constante false: false na hora, sem consultar o backend', async () => {
    const usePagamentosHabilitados = await carregarHook(false)
    const { result } = renderHook(() => usePagamentosHabilitados())
    expect(result.current).toBe(false)
    expect(pagamentosLiberados).not.toHaveBeenCalled()
  })

  it('constante true + backend true: null enquanto consulta, depois true', async () => {
    pagamentosLiberados.mockResolvedValue(true)
    const usePagamentosHabilitados = await carregarHook(true)
    const { result } = renderHook(() => usePagamentosHabilitados())
    expect(result.current).toBe(null)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('constante true + backend false: false', async () => {
    pagamentosLiberados.mockResolvedValue(false)
    const usePagamentosHabilitados = await carregarHook(true)
    const { result } = renderHook(() => usePagamentosHabilitados())
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('constante true + /api/features falhando: false', async () => {
    pagamentosLiberados.mockRejectedValue(new Error('rede'))
    const usePagamentosHabilitados = await carregarHook(true)
    const { result } = renderHook(() => usePagamentosHabilitados())
    await waitFor(() => expect(result.current).toBe(false))
  })
})
