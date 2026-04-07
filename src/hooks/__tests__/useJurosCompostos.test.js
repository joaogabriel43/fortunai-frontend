import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useJurosCompostos } from '../useJurosCompostos'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('useJurosCompostos', () => {
  let api

  beforeEach(async () => {
    vi.clearAllMocks()
    api = (await import('../../services/api')).default
  })

  it('estado inicial: loading=false, error=null, resultado=null', () => {
    const { result } = renderHook(() => useJurosCompostos())
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.resultado).toBeNull()
  })

  it('define resultado após chamada bem-sucedida', async () => {
    const mockData = { cenarios: [], totalInvestido: 10000, dadosReaisUsados: false }
    api.post.mockResolvedValueOnce({ data: mockData })

    const { result } = renderHook(() => useJurosCompostos())

    await act(async () => {
      await result.current.calcular({ patrimonioInicial: 0, aporteMensal: 1000, prazoMeses: 12 })
    })

    expect(api.post).toHaveBeenCalledWith('/calculadoras/juros-compostos/calcular', {
      patrimonioInicial: 0,
      aporteMensal: 1000,
      prazoMeses: 12,
    })
    expect(result.current.resultado).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('define error quando API retorna erro com message', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Prazo inválido' } } })

    const { result } = renderHook(() => useJurosCompostos())

    await act(async () => {
      await result.current.calcular({ prazoMeses: -1 })
    })

    expect(result.current.error).toBe('Prazo inválido')
    expect(result.current.resultado).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('usa mensagem padrão quando erro não tem response', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useJurosCompostos())

    await act(async () => {
      await result.current.calcular({})
    })

    expect(result.current.error).toBe('Erro ao calcular juros compostos.')
  })
})
