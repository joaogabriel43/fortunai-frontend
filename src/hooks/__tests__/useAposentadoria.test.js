import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAposentadoria } from '../useAposentadoria'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('useAposentadoria', () => {
  let api

  beforeEach(async () => {
    vi.clearAllMocks()
    api = (await import('../../services/api')).default
  })

  it('estado inicial: loading=false, error=null, resultado=null', () => {
    const { result } = renderHook(() => useAposentadoria())
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.resultado).toBeNull()
  })

  it('define resultado após chamada bem-sucedida', async () => {
    const mockData = {
      cenarios: [],
      patrimonioAtual: 50000,
      despesaMediaMensal: 3000,
      ipca: 4.8,
    }
    api.post.mockResolvedValueOnce({ data: mockData })

    const { result } = renderHook(() => useAposentadoria())

    await act(async () => {
      await result.current.calcular({
        idadeAtual: 30,
        idadeAposentadoria: 60,
        rendaMensalDesejada: 5000,
        aporteMensal: 2000,
        usarDadosReais: false,
      })
    })

    expect(api.post).toHaveBeenCalledWith('/calculadoras/aposentadoria/calcular', {
      idadeAtual: 30,
      idadeAposentadoria: 60,
      rendaMensalDesejada: 5000,
      aporteMensal: 2000,
      usarDadosReais: false,
    })
    expect(result.current.resultado).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('define error quando API retorna erro com message', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Idade inválida' } } })

    const { result } = renderHook(() => useAposentadoria())

    await act(async () => {
      await result.current.calcular({ idadeAtual: 90 })
    })

    expect(result.current.error).toBe('Idade inválida')
    expect(result.current.resultado).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('usa mensagem padrão quando erro não tem response', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAposentadoria())

    await act(async () => {
      await result.current.calcular({})
    })

    expect(result.current.error).toBe('Erro ao calcular aposentadoria.')
  })
})
