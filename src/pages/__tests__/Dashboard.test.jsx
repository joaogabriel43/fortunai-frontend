import React from 'react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import theme from '../../theme'
import Dashboard from '../Dashboard'

// Dashboard usa tokens customizados do tema (palette.lines/surfaces/accent/
// panorama/series) e, desde o Panorama Pondero, links de navegação — por isso
// precisa de ThemeProvider + Router, como em produção.
const renderDash = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </ThemeProvider>
  )

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
    if (url.startsWith('/orcamento/transacoes/')) {
      // `falhaTransacoes` simula a fonte de transações fora do ar sem derrubar
      // as outras três — o outro lado do cenário de erro PARCIAL.
      return overrides.falhaTransacoes
        ? Promise.reject(new Error('transacoes fora do ar'))
        : Promise.resolve({ data: overrides.transacoes ?? mockTransacoes })
    }
    if (url === '/dashboard/portfolio-composition') {
      // `falhaPortfolio` simula a fonte de portfólio indisponível sem derrubar
      // as outras três — cenário de erro PARCIAL.
      return overrides.falhaPortfolio
        ? Promise.reject(new Error('portfolio fora do ar'))
        : Promise.resolve({ data: overrides.portfolio ?? mockPortfolioComposition })
    }
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
    renderDash()

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
    renderDash()

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
    renderDash()

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
    renderDash()

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId('kpi-card')).toBeNull()
  })

  // --- Teste 5 --- Gráfico donut com dados de portfólio
  it('renderiza nomes dos ativos no gráfico de portfólio', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
    })

    expect(screen.getByText('ITSA4')).toBeInTheDocument()
    expect(screen.getByText('HSML11')).toBeInTheDocument()
  })

  it('exibe empty-state de portfólio quando não há ativos', async () => {
    setupApiMocks(api, { portfolio: [] })
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('Adicione ativos para ver sua composição')).toBeInTheDocument()
    })
  })

  // --- Teste 6 --- Gráfico de evolução de saldo
  it('renderiza gráfico de evolução do saldo com dados mockados', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(screen.getByTestId('evolucao-saldo-chart')).toBeInTheDocument()
    })

    expect(screen.getByText('Evolução do Saldo')).toBeInTheDocument()
  })

  // --- Teste 7 --- Gráfico de evolução em estado vazio
  it('exibe empty-state de evolução quando não há movimentações', async () => {
    setupApiMocks(api, { evolucao: [] })
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('Nenhuma movimentação registrada ainda')).toBeInTheDocument()
    })

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
  // --- Teste 8 --- Rótulo de escopo, sem controle que finja filtrar
  it('exibe o rótulo "Visão atual" como texto, não como controle de filtro', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('Visão atual')).toBeInTheDocument()
    })

    // Não existe filtro global real no backend: o rótulo não pode ser
    // clicável nem parecer um seletor de período.
    expect(screen.queryByRole('button', { name: /visão atual/i })).toBeNull()
    expect(screen.queryByRole('combobox', { name: /visão atual/i })).toBeNull()
  })

  // --- Teste 9 --- Sem fonte factível de variação, nenhuma porcentagem inventada
  it('não exibe variação percentual no panorama', async () => {
    setupApiMocks(api)
    renderDash()

    const panorama = await screen.findByTestId('panorama')
    expect(within(panorama).queryByText(/%/)).toBeNull()
  })

  // --- Teste 10 --- Próxima ação navegacional: com transações e ativos
  it('próxima ação aponta para o resumo mensal quando há transações e ativos', async () => {
    setupApiMocks(api)
    renderDash()

    const acao = await screen.findByTestId('proxima-acao')
    expect(acao).toHaveAttribute('href', '/resumo')
  })

  // --- Teste 11 --- Próxima ação navegacional: sem transações
  it('próxima ação aponta para o orçamento quando não há transações', async () => {
    setupApiMocks(api, { transacoes: [] })
    renderDash()

    const acao = await screen.findByTestId('proxima-acao')
    expect(acao).toHaveAttribute('href', '/orcamento')
  })

  // --- Teste 12 --- Próxima ação navegacional: sem investimentos
  it('próxima ação aponta para investimentos quando não há ativos', async () => {
    setupApiMocks(api, { portfolio: [] })
    renderDash()

    const acao = await screen.findByTestId('proxima-acao')
    expect(acao).toHaveAttribute('href', '/investimentos')
  })

  // --- Teste 13 --- Erro parcial não derruba os módulos que carregaram
  it('mantém os demais módulos quando apenas a fonte de portfólio falha', async () => {
    setupApiMocks(api, { falhaPortfolio: true })
    renderDash()

    // Saldo e evolução continuam de pé...
    await waitFor(() => {
      expect(screen.getByText('Saldo Atual')).toBeInTheDocument()
    })
    expect(screen.getByText(/R\$\s*5\.759,35/)).toBeInTheDocument()
    expect(screen.getByTestId('evolucao-saldo-chart')).toBeInTheDocument()

    // ...e o módulo que falhou oferece nova tentativa (o panorama também
    // perdeu uma parcela, então há mais de um botão de retry na tela).
    expect(screen.getAllByRole('button', { name: /tentar novamente/i }).length).toBeGreaterThanOrEqual(1)

    // Total investido indisponível não pode virar R$ 0,00 nem soma parcial.
    expect(screen.queryByText(/R\$\s*1\.009,70/)).toBeNull()
  })

  // --- Teste 14 --- Insight sem prefixo /api duplicado (baseURL já contém /api)
  it('busca o insight educacional em /insights/atual', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/insights/atual')
    })
    expect(api.get).not.toHaveBeenCalledWith('/api/insights/atual')
  })

  // --- Teste 15 --- Evolução rotulada pelo que o contrato realmente entrega
  it('rotula a evolução como saldo dos últimos 30 dias', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(screen.getByText(/últimos 30 dias/i)).toBeInTheDocument()
    })
  })

  // --- Teste 16 --- Composição é por ativo/ticker, nunca por classe de ativo
  it('rotula a composição como distribuição por ativo', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(screen.getByText(/por ativo/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/classe de ativo/i)).toBeNull()
  })

  // --- Teste 17 --- Erro parcial nunca pode virar tela de "comece do zero"
  it('não substitui a tela pelo empty-state quando uma única fonte falha', async () => {
    // Saldo real NEGATIVO + transações fora do ar: o usuário tem dados,
    // mas a fonte que os lista quebrou. Mostrar "comece registrando" aqui
    // seria afirmar uma ausência que não existe.
    setupApiMocks(api, {
      summary: { contas: [{ id: 'uuid-1', nome: 'Conta Principal', saldoAtual: -450 }] },
      falhaTransacoes: true,
      portfolio: [],
      evolucao: [],
    })
    renderDash()

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /tentar novamente/i }).length).toBeGreaterThanOrEqual(1)
    })

    // A tela inteira NÃO virou o vazio de onboarding: o panorama continua lá.
    expect(screen.getByTestId('panorama')).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*-?450,00/).length).toBeGreaterThanOrEqual(1)
  })

  // --- Teste 18 --- Saldo negativo é dado, não ausência de dado
  it('não exibe o empty-state global quando o saldo é negativo', async () => {
    setupApiMocks(api, {
      summary: { contas: [{ id: 'uuid-1', nome: 'Conta Principal', saldoAtual: -450 }] },
      transacoes: [],
      portfolio: [],
      evolucao: [],
    })
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('Saldo Atual')).toBeInTheDocument()
    })

    // O vazio global substitui a tela inteira e não renderiza o panorama;
    // se ele está aqui, o saldo negativo foi reconhecido como dado.
    expect(screen.getByTestId('panorama')).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*-?450,00/).length).toBeGreaterThanOrEqual(1)
  })

  // --- Teste 19 --- Falha do summary também oferece nova tentativa
  it('oferece nova tentativa quando apenas a fonte de summary falha', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard/summary') return Promise.reject(new Error('summary fora do ar'))
      if (url.startsWith('/orcamento/transacoes/')) return Promise.resolve({ data: mockTransacoes })
      if (url === '/dashboard/portfolio-composition') return Promise.resolve({ data: mockPortfolioComposition })
      if (url.startsWith('/orcamento/evolucao-saldo/')) return Promise.resolve({ data: mockEvolucaoSaldo })
      return Promise.resolve({ data: {} })
    })
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })

    // O panorama perdeu a fonte: precisa dizer isso e permitir recarregar.
    expect(screen.getAllByRole('button', { name: /tentar novamente/i }).length).toBeGreaterThanOrEqual(1)
    // E nunca inventar R$ 0,00 no lugar do saldo indisponível.
    expect(screen.queryByText(/Saldo em conta[\s\S]*R\$\s*0,00/)).toBeNull()
  })
  // --- Teste 20 --- A seção do insight precisa ter nome acessível
  it('dá nome acessível à seção do insight educacional', async () => {
    setupApiMocks(api)
    renderDash()

    await waitFor(() => {
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })

    // Todas as demais seções são landmarks nomeados via SectionHead; esta
    // era a única <section> anônima da tela.
    expect(
      screen.getByRole('region', { name: /insight educacional/i })
    ).toBeInTheDocument()
  })

  // --- Regressão: fonte indisponível NUNCA pode virar "vazio confirmado" ---
  describe('regressão: próxima ação trata fonte indisponível como vazia', () => {
    const chamadasPortfolio = () =>
      api.get.mock.calls.filter(([url]) => url === '/dashboard/portfolio-composition').length

    it('falha na carteira não sugere "Cadastre seus ativos" e oferece nova tentativa que recarrega', async () => {
      setupApiMocks(api, { falhaPortfolio: true })
      renderDash()

      const acao = await screen.findByTestId('proxima-acao')
      expect(screen.getByText('Não foi possível verificar seus ativos')).toBeInTheDocument()
      expect(screen.queryByText('Cadastre seus ativos')).toBeNull()
      expect(acao).toHaveTextContent('Tentar novamente')
      expect(acao).not.toHaveAttribute('href')
      expect(chamadasPortfolio()).toBe(1)

      fireEvent.click(acao)

      await waitFor(() => expect(chamadasPortfolio()).toBe(2))
      // Voltou a renderizar a ação de recuperação depois do recarregamento.
      expect(await screen.findByTestId('proxima-acao')).toHaveTextContent('Tentar novamente')
    })

    it('falha nas transações não sugere "Registre seus gastos do mês"', async () => {
      setupApiMocks(api, { falhaTransacoes: true })
      renderDash()

      const acao = await screen.findByTestId('proxima-acao')
      expect(screen.getByText('Não foi possível verificar seus registros')).toBeInTheDocument()
      expect(screen.queryByText('Registre seus gastos do mês')).toBeNull()
      expect(acao).toHaveTextContent('Tentar novamente')
      expect(acao).not.toHaveAttribute('href')
    })

    it('mostra um único "Tentar novamente" no panorama quando a ação já é de recuperação', async () => {
      setupApiMocks(api, { falhaPortfolio: true })
      renderDash()

      const panorama = await screen.findByTestId('panorama')
      expect(within(panorama).getAllByRole('button', { name: 'Tentar novamente' })).toHaveLength(1)
    })

    it('vazio confirmado (200 com lista vazia) continua sugerindo "Cadastre seus ativos"', async () => {
      setupApiMocks(api, { portfolio: [] })
      renderDash()

      const acao = await screen.findByTestId('proxima-acao')
      expect(screen.getByText('Cadastre seus ativos')).toBeInTheDocument()
      expect(acao).toHaveAttribute('href', '/investimentos')
    })
  })
})
