import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ScoreSaudeCard from '../ScoreSaudeCard'

vi.mock('../../../hooks/useScoreSaude', () => ({
  useScoreSaude: vi.fn(),
}))

import { useScoreSaude } from '../../../hooks/useScoreSaude'

const mockData = {
  score: 63,
  classificacao: 'BOM',
  taxaPoupanca: { nome: 'Taxa de Poupanca', pontos: 25, valor: 0.35, descricao: '35% da renda poupada' },
  coberturaEmergencia: { nome: 'Cobertura Emergencia', pontos: 15, valor: 0.65, descricao: '65% do fundo coberto' },
  diversificacao: { nome: 'Diversificacao', pontos: 15, valor: 2.0, descricao: '2 tipos de ativos' },
  tendencia: { nome: 'Tendencia', pontos: 8, valor: 0.03, descricao: 'Patrimonio estavel' },
}

describe('ScoreSaudeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar score e classificacao', () => {
    useScoreSaude.mockReturnValue({ data: mockData, loading: false, error: null })

    render(<ScoreSaudeCard />)

    expect(screen.getByText('63')).toBeInTheDocument()
    expect(screen.getByText('BOM')).toBeInTheDocument()
  })

  it('deve renderizar componentes detalhados', () => {
    useScoreSaude.mockReturnValue({ data: mockData, loading: false, error: null })

    render(<ScoreSaudeCard />)

    expect(screen.getByText('Taxa de Poupanca')).toBeInTheDocument()
    expect(screen.getByText('Cobertura Emergencia')).toBeInTheDocument()
    expect(screen.getByText('Diversificacao')).toBeInTheDocument()
    expect(screen.getByText('Tendencia')).toBeInTheDocument()
  })

  it('deve exibir loading enquanto carrega', () => {
    useScoreSaude.mockReturnValue({ data: null, loading: true, error: null })

    render(<ScoreSaudeCard />)

    expect(screen.getByTestId('score-loading')).toBeInTheDocument()
  })
})
