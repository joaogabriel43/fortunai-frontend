import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Dashboard from '../Dashboard'

// --- MOCK: AuthContext ---
const mockUser = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  email: 'test@fortunai.com',
  perfilInvestidor: 'ARROJADO',
  questionarioRespondido: true,
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// --- MOCK: api (axios instance) ---
vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

// --- MOCK: recharts (ResponsiveContainer precisa de dimensões reais em jsdom) ---
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  }
})

// Dados mockados
const mockSummary = {
  contas: [{ id: 'uuid-1', nome: 'Conta Principal', saldoAtual: 5759.35 }],
}

const mockTransacoes = [
  { id: 't1', descricao: 'Mercado',  valor: { quantia: 150.75 }, categoria: 'Alimentação', data: '2026-03-18', tipo: 'DEBIT' },
  { id: 't2', descricao: 'Salário',  valor: { quantia: 5000.00 }, categoria: 'Receita',     data: '2026-03-16', tipo: 'CREDIT' },
  { id: 't3', descricao: 'iFood',    valor: { quantia: 89.90  }, categoria: 'Alimentação', data: '2026-03-15', tipo: 'DEBIT' },
  { id: 't4', descricao: 'PETR4',    valor: { quantia: 605.00 }, categoria: 'Investimento', data: '2026-03-14', tipo: 'DEBIT' },
  { id: 't5', descricao: 'Uber',     valor: { quantia: 32.00  }, categoria: 'Transporte',  data: '2026-03-13', tipo: 'DEBIT' },
]

const mockPortfolioComposition = [
  { name: 'PETR4',  value: 605.00 },
  { name: 'ITSA4',  value: 234.80 },
  { name: 'HSML11', value: 169.90 },
]

const mockEvolucaoSaldo = [
  { data: '2026-02-18', saldo: 4200.00 },
  { data: '2026-02-25', saldo: 4800.00 },
  { data: '2026-03-04', saldo: 4500.00 },
  { data: '2026-03-11', saldo: 5200.00 },
  { data: '2026-03-18', saldo: 5759.35 },
]

// Helper: monta o mock de api.get para resolver com os dados completos
function setupApiMocks(api, overrides = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/dashboard/summary')
      return Promise.resolve({ data: overrides.summary ?? mockSummary })
    if (url.startsWith('/orcamento/transacoes/'))
      return Promise.resolve({ data: overrides.transacoes ?? mockTransacoes })
    if (url === '/dashboard/portfolio-composition')
      return Promise.resolve({ data: overrides.portfolio ?? mockPortfolioComposition })
    if (url.startsWith('/orcamento/evolucao-saldo/'))
      return Promise.resolve({ data: overrides.evolucao ?? mockEvolucaoSaldo })
    return Promise.resolve({ data: {} })
  })
}

describe('Dashboard', () => {
  let api
  let useAuth

  beforeEach(async () => {
    api = (await import('../../services/api')).default
    useAuth = (await import('../../contexts/AuthContext')).useAuth
    useAuth.mockReturnValue({ user: mockUser, loading: false })
    vi.clearAllMocks()
    // Restaurar mock depois de limpar
    useAuth.mockReturnValue({ user: mockUser, loading: false })
  })

  // --- Teste 1 --- KPI Cards renderizam com dados mockados
  it('renderiza KPI cards com valores formatados em R$', async () => {
    setupApiMocks(api)
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Saldo Atual')).toBeInTheDocument()
    })

    expect(screen.getByText(/R\$\s*5\.759,35/)).toBeInTheDocument()
    expect(screen.getByText('Total Investido')).toBeInTheDocument()
    // 605 + 234.80 + 169.90 = 1009.70
    expect(screen.getByText(/R\$\s*1\.009,70/)).toBeInTheDocument()
    expect(screen.getAllByTestId('kpi-card').length).toBeGreaterThanOrEqual(1)
  })

  // --- Teste 2 --- Lista de transações
  it('renderiza lista com 5 transações e tipos corretos', async () => {
    setupApiMocks(api)
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })

    // 5 itens na lista
    const debits = screen.getAllByTestId ? [] : []
    const listItems = document.querySelectorAll('[data-type]')
    expect(listItems.length).toBe(5)

    const debitItems = document.querySelectorAll('[data-type="DEBIT"]')
    expect(debitItems.length).toBe(4)

    const creditItems = document.querySelectorAll('[data-type="CREDIT"]')
    expect(creditItems.length).toBe(1)

    // Data formatada do item t1 (2026-03-18 → 18/03/2026)
    expect(screen.getByText('18/03/2026')).toBeInTheDocument()
  })

  // --- Teste 3 --- Estado vazio
  it('exibe empty-state quando não há dados', async () => {
    setupApiMocks(api, {
      summary: { contas: [] },
      transacoes: [],
      portfolio: [],
    })
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getAllByTestId('empty-state').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('Comece registrando uma transação no chat')).toBeInTheDocument()
    expect(screen.queryAllByTestId('kpi-card').length).toBe(0)
  })

  // --- Teste 4 --- Loading skeleton
  it('exibe skeleton durante carregamento', async () => {
    // Promessas que nunca resolvem = loading infinito
    api.get = vi.fn(() => new Promise(() => {}))
    render(<Dashboard />)

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId('kpi-card')).toBeNull()
  })

  // --- Teste 5 --- Gráfico donut com dados de portfólio
  it('renderiza nomes dos ativos no gráfico de portfólio', async () => {
    setupApiMocks(api)
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
    })

    expect(screen.getByText('ITSA4')).toBeInTheDocument()
    expect(screen.getByText('HSML11')).toBeInTheDocument()
  })

  it('exibe empty-state de portfólio quando não há ativos', async () => {
    setupApiMocks(api, { portfolio: [] })
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Adicione ativos para ver sua composição')).toBeInTheDocument()
    })
  })

  // --- Teste 6 --- Gráfico de evolução de saldo
  it('renderiza gráfico de evolução do saldo com dados mockados', async () => {
    setupApiMocks(api)
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('evolucao-saldo-chart')).toBeInTheDocument()
    })

    expect(screen.getByText('Evolução do Saldo')).toBeInTheDocument()
  })

  // --- Teste 7 --- Gráfico de evolução em estado vazio
  it('exibe empty-state de evolução quando não há movimentações', async () => {
    setupApiMocks(api, { evolucao: [] })
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Nenhuma movimentação registrada ainda')).toBeInTheDocument()
    })

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})
