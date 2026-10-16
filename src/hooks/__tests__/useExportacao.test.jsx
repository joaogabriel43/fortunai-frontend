import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExportacao } from '../useExportacao'
import api from '../../services/api'
import { BACKEND_ORIGIN } from '../../config/apiUrl'

// F7 (continuação): o download passa pelo cliente central (api.js), que injeta o JWT
// e renova a sessão em 401/403 expirado. Por isso o mock é do cliente, não do fetch.
vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

const mockObjectURL = 'blob:http://localhost/mock-url'
let mockCreateObjectURL
let mockRevokeObjectURL

const ENDPOINT = '/api/exportacao/extrato?mes=3&ano=2026'

describe('useExportacao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn()

    mockCreateObjectURL = vi.fn(() => mockObjectURL)
    mockRevokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = mockCreateObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL

    // Usa um anchor element REAL para que document.body.appendChild funcione normalmente
    // no jsdom — mas espia o click para evitar navegação real.
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const realAnchor = originalCreateElement('a')
        vi.spyOn(realAnchor, 'click').mockImplementation(() => {})
        return realAnchor
      }
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('regressão: download fora do interceptor de sessão não renova token expirado', () => {
    it('downloadArquivo() usa o cliente central com responseType blob e baseURL de origin para /api', async () => {
      const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
      api.get.mockResolvedValueOnce({ data: mockBlob, status: 200 })

      const { result } = renderHook(() => useExportacao())

      await act(async () => {
        await result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
      })

      expect(api.get).toHaveBeenCalledTimes(1)
      expect(api.get).toHaveBeenCalledWith(ENDPOINT, {
        responseType: 'blob',
        baseURL: BACKEND_ORIGIN,
      })
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('endpoint relativo (sem /api) parte da baseURL padrão do cliente', async () => {
      api.get.mockResolvedValueOnce({ data: new Blob(['x']), status: 200 })

      const { result } = renderHook(() => useExportacao())

      await act(async () => {
        await result.current.downloadArquivo('/exportacao/extrato?mes=3&ano=2026', 'extrato.csv')
      })

      expect(api.get).toHaveBeenCalledWith('/exportacao/extrato?mes=3&ano=2026', {
        responseType: 'blob',
      })
    })

    it('não monta o header Authorization à mão (quem injeta o JWT é o interceptor)', async () => {
      api.get.mockResolvedValueOnce({ data: new Blob(['x']), status: 200 })

      const { result } = renderHook(() => useExportacao())

      await act(async () => {
        await result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
      })

      const config = api.get.mock.calls[0][1]
      expect(config.headers).toBeUndefined()
    })
  })

  it('downloadArquivo() define loading=false quando termina', async () => {
    let resolveGet
    api.get.mockReturnValueOnce(new Promise((resolve) => { resolveGet = resolve }))

    const { result } = renderHook(() => useExportacao())

    let downloadPromise
    act(() => {
      downloadPromise = result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
    })

    await act(async () => {
      resolveGet({ data: new Blob(['pdf'], { type: 'application/pdf' }), status: 200 })
      await downloadPromise
    })

    expect(result.current.loading).toBe(false)
  })

  it('erro 401 (após o interceptor desistir de renovar) define error="Sessão expirada"', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 401 } })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
    })

    expect(result.current.error).toBe('Sessão expirada')
  })

  it('erro 500 define error="Erro ao gerar relatório"', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
    })

    expect(result.current.error).toBe('Erro ao gerar relatório')
  })

  it('falha de rede (sem response) define error="Erro ao gerar relatório"', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
    })

    expect(result.current.error).toBe('Erro ao gerar relatório')
  })

  it('após download bem-sucedido, o blob da resposta vira object URL e é revogado (sem memory leak)', async () => {
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
    api.get.mockResolvedValueOnce({ data: mockBlob, status: 200 })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo(ENDPOINT, 'extrato.pdf')
    })

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectURL)
  })
})
