import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ComparativoCard from '../ComparativoCard'

vi.mock('../../../hooks/useComparativoMensal', () => ({
  useComparativoMensal: vi.fn(),
}))

import { useComparativoMensal } from '../../../hooks/useComparativoMensal'

const mockData = {
  mesAtual: '2026-03',
  mesAnterior: '2026-02',
  variacaoTotalDespesas: 15.5,
  variacaoTotalReceitas: 0.0,
  categorias: [
    { categoria: 'Alimentacao', valorMesAtual: 1200, valorMesAnterior: 1000, variacao: 20.0 },
    { categoria: 'Transporte', valorMesAtual: 300, valorMesAnterior: 350, variacao: -14.29 },
  ],
  maiorAlta: 'Alimentacao',
  maiorQueda: 'Transporte',
  alertas: [],
}

describe('ComparativoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar variacao total de despesas e receitas', () => {
    useComparativoMensal.mockReturnValue({ data: mockData, loading: false, error: null })

    render(<ComparativoCard />)

    expect(screen.getByText('Comparativo Mensal')).toBeInTheDocument()
    expect(screen.getByText('+15.5%')).toBeInTheDocument()
  })

  it('deve renderizar categorias com variacao', () => {
    useComparativoMensal.mockReturnValue({ data: mockData, loading: false, error: null })

    render(<ComparativoCard />)

    expect(screen.getByText('Alimentacao')).toBeInTheDocument()
    expect(screen.getByText('Transporte')).toBeInTheDocument()
    expect(screen.getByText('+20%')).toBeInTheDocument()
    expect(screen.getByText('-14.29%')).toBeInTheDocument()
  })

  it('deve exibir loading enquanto carrega', () => {
    useComparativoMensal.mockReturnValue({ data: null, loading: true, error: null })

    render(<ComparativoCard />)

    expect(screen.getByTestId('comparativo-loading')).toBeInTheDocument()
  })
})
