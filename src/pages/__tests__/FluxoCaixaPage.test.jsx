import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import FluxoCaixa from '../FluxoCaixa'

// --- MOCK: AuthContext ---
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// --- MOCK: useFluxoCaixa hook ---
vi.mock('../../hooks/useFluxoCaixa', () => ({
  useFluxoCaixa: vi.fn(),
}))

// --- MOCK: recharts (ResponsiveContainer precisa de dimensões reais em jsdom) ---
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
        {children}
      </div>
    ),
    AreaChart: ({ children }) => (
      <div data-testid="area-chart">{children}</div>
    ),
    Area: () => <div data-testid="area" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ReferenceLine: () => null,
  }
})

// Dados mock de projeção para 30 dias
const mockProjecao30 = {
  periodo: 30,
  saldoAtual: 5000.0,
  saldoProjetado: 6800.0,
  receitasEsperadas: 3000.0,
  despesasEsperadas: 1200.0,
  transacoesRecorrentes: [
    { categoria: 'Salário', tipo: 'CREDIT', valorMedio: 3000.0, frequenciaMensal: 1.0, recorrente: true, mesesDistintos: 3 },
    { categoria: 'Aluguel', tipo: 'DEBIT', valorMedio: 1200.0, frequenciaMensal: 1.0, recorrente: true, mesesDistintos: 3 },
  ],
  pontosGrafico: [
    { data: '2026-03-23', saldoProjetado: 5000.0 },
    { data: '2026-04-22', saldoProjetado: 6800.0 },
  ],
}

const mockProjecao60 = { ...mockProjecao30, periodo: 60, saldoProjetado: 8600.0, receitasEsperadas: 6000.0, despesasEsperadas: 2400.0 }
const mockProjecao90 = { ...mockProjecao30, periodo: 90, saldoProjetado: 10400.0, receitasEsperadas: 9000.0, despesasEsperadas: 3600.0 }

describe('FluxoCaixaPage', () => {
  let useAuth
  let useFluxoCaixa

  beforeEach(async () => {
    vi.clearAllMocks()
    useAuth = (await import('../../contexts/AuthContext')).useAuth
    useFluxoCaixa = (await import('../../hooks/useFluxoCaixa')).useFluxoCaixa

    useAuth.mockReturnValue({
      user: { id: 'abc-123', email: 'test@fortunai.com' },
    })
  })

  // --- Teste 1: renderiza tabs 30/60/90 dias ---
  it('renderiza tabs 30, 60 e 90 dias', () => {
    useFluxoCaixa.mockReturnValue({
      data30: mockProjecao30,
      data60: mockProjecao60,
      data90: mockProjecao90,
      loading: false,
      error: null,
      buscar: vi.fn(),
    })

    render(<FluxoCaixa />)

    expect(screen.getByRole('tab', { name: /30 dias/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /60 dias/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /90 dias/i })).toBeInTheDocument()
  })

  // --- Teste 2: renderiza saldo projetado em destaque ---
  it('renderiza saldo projetado em destaque', () => {
    useFluxoCaixa.mockReturnValue({
      data30: mockProjecao30,
      data60: mockProjecao60,
      data90: mockProjecao90,
      loading: false,
      error: null,
      buscar: vi.fn(),
    })

    render(<FluxoCaixa />)

    // R$ 6.800,00 ou variação pt-BR
    expect(screen.getByText(/6[.,]800/)).toBeInTheDocument()
  })

  // --- Teste 3: exibe receitas esperadas (valor) ---
  it('exibe receitas esperadas', () => {
    useFluxoCaixa.mockReturnValue({
      data30: mockProjecao30,
      data60: mockProjecao60,
      data90: mockProjecao90,
      loading: false,
      error: null,
      buscar: vi.fn(),
    })

    render(<FluxoCaixa />)

    // R$ 3.000,00 aparece no KPI e na tabela — verifica que ao menos um existe
    expect(screen.getAllByText(/3[.,]000/).length).toBeGreaterThan(0)
    // Label do card
    expect(screen.getByText(/receitas esperadas/i)).toBeInTheDocument()
  })

  // --- Teste 4: exibe despesas esperadas (valor) ---
  it('exibe despesas esperadas', () => {
    useFluxoCaixa.mockReturnValue({
      data30: mockProjecao30,
      data60: mockProjecao60,
      data90: mockProjecao90,
      loading: false,
      error: null,
      buscar: vi.fn(),
    })

    render(<FluxoCaixa />)

    // R$ 1.200,00 aparece no KPI e na tabela — verifica que ao menos um existe
    expect(screen.getAllByText(/1[.,]200/).length).toBeGreaterThan(0)
    // Label do card
    expect(screen.getByText(/despesas esperadas/i)).toBeInTheDocument()
  })

  // --- Teste 5: renderiza gráfico de área com projeção ---
  it('renderiza gráfico de área com projeção', () => {
    useFluxoCaixa.mockReturnValue({
      data30: mockProjecao30,
      data60: mockProjecao60,
      data90: mockProjecao90,
      loading: false,
      error: null,
      buscar: vi.fn(),
    })

    render(<FluxoCaixa />)

    // O gráfico AreaChart deve estar presente
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })
})
