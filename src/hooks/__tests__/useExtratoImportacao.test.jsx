import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../services/api', () => ({
  default: { post: vi.fn() },
}))

import api from '../../services/api'
import { useExtratoImportacao } from '../useExtratoImportacao'

const PREVIEW = {
  transacoes: [{ data: '2026-03-01', descricao: 'Mercado', valor: 10, tipo: 'DEBIT', previewId: 'p1' }],
  totalTransacoes: 1,
  totalDuplicatas: 0,
  totalValidas: 1,
}

const erroApi = (status, erro, mensagem = 'msg do backend') =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { status, erro, mensagem } },
  })

// Deixa o hook com um preview carregado e tenta confirmar; devolve o resultado do hook.
const confirmarComFalha = async (err) => {
  api.post.mockResolvedValueOnce({ data: PREVIEW })
  const { result } = renderHook(() => useExtratoImportacao())
  await act(async () => {
    await result.current.analisarExtrato(new File(['x'], 'e.csv'))
  })
  expect(result.current.preview).not.toBeNull()
  api.post.mockRejectedValueOnce(err)
  await act(async () => {
    await result.current.confirmarImportacao(PREVIEW.transacoes)
  })
  return result
}

describe('useExtratoImportacao — erros de confirmação (backend F5 / F1)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('410 PREVIEW_EXPIRADO: descarta o preview e pede novo upload', async () => {
    const result = await confirmarComFalha(erroApi(410, 'PREVIEW_EXPIRADO'))
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toMatch(/expirou/i)
    expect(result.current.error).toMatch(/envie o arquivo novamente/i)
  })

  it('410 PREVIEW_JA_CONFIRMADO: descarta o preview e avisa que já foi importado', async () => {
    const result = await confirmarComFalha(erroApi(410, 'PREVIEW_JA_CONFIRMADO'))
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toMatch(/já foi importad/i)
    expect(result.current.error).toMatch(/envie o arquivo novamente/i)
  })

  it('409 PREVIEW_EM_PROCESSAMENTO: mantém o preview e pede para aguardar', async () => {
    const result = await confirmarComFalha(erroApi(409, 'PREVIEW_EM_PROCESSAMENTO'))
    expect(result.current.preview).not.toBeNull()
    expect(result.current.error).toMatch(/em andamento/i)
    expect(result.current.error).toMatch(/aguarde/i)
  })

  it('409 Conflito (saldo mudou): mantém o preview e pede para recarregar e tentar de novo', async () => {
    const result = await confirmarComFalha(erroApi(409, 'Conflito'))
    expect(result.current.preview).not.toBeNull()
    expect(result.current.error).toMatch(/saldo/i)
    expect(result.current.error).toMatch(/recarregue/i)
    expect(result.current.error).toMatch(/tente novamente/i)
  })

  it('outros erros mantêm a mensagem genérica', async () => {
    const result = await confirmarComFalha(erroApi(500, 'Internal Server Error'))
    expect(result.current.error).toBe('Erro ao importar transações.')
    expect(result.current.preview).not.toBeNull()
  })
})
