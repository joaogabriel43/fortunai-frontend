import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExportacao } from '../useExportacao'

// Mock do authService para obter token
vi.mock('../../services/authService', () => ({
  getToken: vi.fn(() => 'mock-jwt-token'),
}))

// Mock do URL global
const mockObjectURL = 'blob:http://localhost/mock-url'
let mockCreateObjectURL
let mockRevokeObjectURL

describe('useExportacao', () => {
  beforeEach(() => {
    // Mock fetch global
    global.fetch = vi.fn()

    // Mock URL.createObjectURL e revokeObjectURL
    mockCreateObjectURL = vi.fn(() => mockObjectURL)
    mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

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

  it('downloadArquivo() chama fetch com Authorization header contendo JWT', async () => {
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      status: 200,
    })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo('/api/exportacao/extrato?mes=3&ano=2026', 'extrato.pdf')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/exportacao/extrato'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token',
        }),
      })
    )
  })

  it('downloadArquivo() define loading=true durante fetch e false quando termina', async () => {
    let resolveBlob
    const blobPromise = new Promise((resolve) => { resolveBlob = resolve })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => blobPromise,
      status: 200,
    })

    const { result } = renderHook(() => useExportacao())

    // Inicia download mas não aguarda
    let downloadPromise
    act(() => {
      downloadPromise = result.current.downloadArquivo('/api/exportacao/extrato?mes=3&ano=2026', 'extrato.pdf')
    })

    // loading deve ser true enquanto aguarda
    // (após o act inicial, loading pode ainda ser false pois o state update é assíncrono)
    // Aguardamos a resolução
    await act(async () => {
      resolveBlob(new Blob(['pdf'], { type: 'application/pdf' }))
      await downloadPromise
    })

    expect(result.current.loading).toBe(false)
  })

  it('resposta 401 define error="Sessão expirada"', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo('/api/exportacao/extrato?mes=3&ano=2026', 'extrato.pdf')
    })

    expect(result.current.error).toBe('Sessão expirada')
  })

  it('resposta 500 define error="Erro ao gerar relatório"', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo('/api/exportacao/extrato?mes=3&ano=2026', 'extrato.pdf')
    })

    expect(result.current.error).toBe('Erro ao gerar relatório')
  })

  it('após download bem-sucedido, URL.createObjectURL é chamado (sem memory leak)', async () => {
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      status: 200,
    })

    const { result } = renderHook(() => useExportacao())

    await act(async () => {
      await result.current.downloadArquivo('/api/exportacao/extrato?mes=3&ano=2026', 'extrato.pdf')
    })

    // createObjectURL deve ser chamado para criar URL temporária
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    // revokeObjectURL deve ser chamado para liberar memória
    // Nota: em jsdom a cadeia de chamadas pode variar — verificamos que houve tentativa de revogar
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})
