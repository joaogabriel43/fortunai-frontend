import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockGet = vi.fn()
vi.mock('../../services/api', () => ({ default: { get: (...a) => mockGet(...a) } }))

const mockMes = vi.fn()
vi.mock('../../contexts/MesOrcamentoContext', () => ({ useMesOrcamento: () => mockMes() }))

import { useComparativoMensal } from '../useComparativoMensal'

describe('regressão: useComparativoMensal segue o mês de referência do Orçamento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: { ok: true } })
  })

  it('usa o mês do contexto e o mês imediatamente anterior', async () => {
    mockMes.mockReturnValue({ ano: 2026, mes: 3 })
    const { result } = renderHook(() => useComparativoMensal())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockGet).toHaveBeenCalledWith('/comparativo-mensal?mesAtual=2026-03&mesAnterior=2026-02')
    expect(result.current.data).toEqual({ ok: true })
  })

  it('em janeiro, o mês anterior é dezembro do ano anterior', async () => {
    mockMes.mockReturnValue({ ano: 2026, mes: 1 })
    const { result } = renderHook(() => useComparativoMensal())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockGet).toHaveBeenCalledWith('/comparativo-mensal?mesAtual=2026-01&mesAnterior=2025-12')
  })

  it('refaz a consulta quando o mês de referência muda', async () => {
    mockMes.mockReturnValue({ ano: 2026, mes: 3 })
    const { result, rerender } = renderHook(() => useComparativoMensal())
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockMes.mockReturnValue({ ano: 2026, mes: 4 })
    rerender()
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
    expect(mockGet).toHaveBeenLastCalledWith('/comparativo-mensal?mesAtual=2026-04&mesAnterior=2026-03')
  })
})
