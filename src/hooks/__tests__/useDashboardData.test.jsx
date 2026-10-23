import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useDashboardData } from '../useDashboardData'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }))

const USUARIO = { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }

// Mês corrente em formato YYYY-MM, calculado no fuso local — o mesmo critério
// que o hook usa para recortar entradas e saídas "do mês".
function mesCorrente() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

function respostaDe(mapa) {
  return (url) => {
    if (url === '/dashboard/summary') return resolverOuRejeitar(mapa.summary)
    if (url.startsWith('/orcamento/transacoes/')) return resolverOuRejeitar(mapa.transacoes)
    if (url === '/dashboard/portfolio-composition') return resolverOuRejeitar(mapa.portfolio)
    if (url.startsWith('/orcamento/evolucao-saldo/')) return resolverOuRejeitar(mapa.evolucao)
    return Promise.resolve({ data: {} })
  }
}

function resolverOuRejeitar(valor) {
  if (valor instanceof Error) return Promise.reject(valor)
  return Promise.resolve({ data: valor ?? [] })
}

describe('useDashboardData', () => {
  let api
  let useAuth

  beforeEach(async () => {
    api = (await import('../../services/api')).default
    useAuth = (await import('../../contexts/AuthContext')).useAuth
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: USUARIO, loading: false })
  })

  // --- Teste 1 --- Falha de uma fonte não derruba as demais
  it('mantém as fontes que carregaram quando o portfólio falha', async () => {
    api.get.mockImplementation(respostaDe({
      summary: { contas: [{ saldoAtual: 1500 }] },
      transacoes: [],
      portfolio: new Error('502'),
      evolucao: [{ data: '2026-08-01', saldo: 1500 }],
    }))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.saldoAtual).toBe(1500)
    expect(result.current.evolucaoSaldo).toHaveLength(1)
    expect(result.current.erros.portfolio).toBe(true)
    expect(result.current.erros.summary).toBe(false)
    // Portfólio indisponível não vira R$ 0,00 inventado
    expect(result.current.totalInvestido).toBeNull()
  })

  // --- Teste 2 --- Ausência de dado não é zero financeiro
  it('reporta saldo como indisponível (null) quando o summary falha', async () => {
    api.get.mockImplementation(respostaDe({
      summary: new Error('500'),
      transacoes: [],
      portfolio: [{ name: 'PETR4', value: 605 }],
      evolucao: [],
    }))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.saldoAtual).toBeNull()
    expect(result.current.erros.summary).toBe(true)
    expect(result.current.totalInvestido).toBe(605)
    // Sem saldo não há como somar patrimônio sem inventar número
    expect(result.current.patrimonioTotal).toBeNull()
  })

  // --- Teste 3 --- Normalização monetária dos dois formatos de contrato
  it('normaliza valor monetário tanto em objeto {quantia} quanto em número puro', async () => {
    const mes = mesCorrente()
    api.get.mockImplementation(respostaDe({
      summary: { contas: [{ saldoAtual: { quantia: 2000 } }] },
      transacoes: [
        { id: 'a', tipo: 'CREDIT', valor: { quantia: 100 }, data: `${mes}-02`, descricao: 'Salário' },
        { id: 'b', tipo: 'CREDIT', valor: 50, data: `${mes}-03`, descricao: 'Freela' },
        { id: 'c', tipo: 'DEBIT', valor: 30, data: `${mes}-04`, descricao: 'Padaria', categoria: 'Alimentação' },
      ],
      portfolio: [{ name: 'ITSA4', value: { quantia: 10 } }],
      evolucao: [],
    }))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.saldoAtual).toBe(2000)
    expect(result.current.entradasDoMes).toBe(150)
    expect(result.current.despesasDoMes).toBe(30)
    expect(result.current.totalInvestido).toBe(10)
  })

  // --- Teste 4 --- Recorte do mês corrente
  it('considera apenas transações do mês corrente em entradas e despesas', async () => {
    const mes = mesCorrente()
    api.get.mockImplementation(respostaDe({
      summary: { contas: [{ saldoAtual: 0 }] },
      transacoes: [
        { id: 'a', tipo: 'CREDIT', valor: { quantia: 900 }, data: `${mes}-05`, descricao: 'Salário' },
        { id: 'b', tipo: 'DEBIT', valor: { quantia: 40 }, data: `${mes}-06`, descricao: 'Uber', categoria: 'Transporte' },
        // Fora do mês corrente — não pode entrar na conta do mês
        { id: 'c', tipo: 'CREDIT', valor: { quantia: 5000 }, data: '2020-01-10', descricao: 'Antigo' },
        { id: 'd', tipo: 'DEBIT', valor: { quantia: 999 }, data: '2020-01-11', descricao: 'Antigo', categoria: 'Outros' },
      ],
      portfolio: [],
      evolucao: [],
    }))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.entradasDoMes).toBe(900)
    expect(result.current.despesasDoMes).toBe(40)
    expect(result.current.maiorGastoDoMes).toEqual(
      expect.objectContaining({ categoria: 'Transporte', valor: 40 })
    )
    // A lista de últimas transações continua sendo cronológica, sem recorte de mês
    expect(result.current.transacoes).toHaveLength(4)
  })

  // --- Teste 5 --- Todas as fontes falharam
  it('sinaliza falha total quando nenhuma fonte responde', async () => {
    api.get.mockImplementation(respostaDe({
      summary: new Error('x'),
      transacoes: new Error('x'),
      portfolio: new Error('x'),
      evolucao: new Error('x'),
    }))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.falhaTotal).toBe(true)
    expect(result.current.erros.transacoes).toBe(true)
  })

  // --- Teste 6 --- Conta ausente é indisponibilidade, não saldo zero
  it('reporta saldo como indisponível quando o summary responde 200 sem contas', async () => {
    api.get.mockImplementation(respostaDe({
      summary: { contas: [] },
      transacoes: [],
      portfolio: [{ name: 'PETR4', value: 605 }],
      evolucao: [],
    }))

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // 200 com contas vazias é ausência de conta financeira, não R$ 0,00 real
    expect(result.current.saldoAtual).toBeNull()
    expect(result.current.erros.summary).toBe(false)
    expect(result.current.patrimonioTotal).toBeNull()
  })

  describe('regressão: transações 200 fora do contrato viravam estado vazio', () => {
    it('trata corpo não-array como indisponível (null/erro), nunca como lista vazia', async () => {
      api.get.mockImplementation(respostaDe({
        summary: { contas: [{ saldoAtual: 1500 }] },
        transacoes: { mensagem: 'ok' },
        portfolio: [{ name: 'PETR4', value: 605 }],
        evolucao: [],
      }))

      const { result } = renderHook(() => useDashboardData())
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.transacoes).toBeNull()
      expect(result.current.erros.transacoes).toBe(true)
      // Sem a fonte, entradas/despesas são desconhecidas — não R$ 0,00
      expect(result.current.entradasDoMes).toBeNull()
      expect(result.current.despesasDoMes).toBeNull()
      expect(result.current.maiorGastoDoMes).toBeNull()
    })
  })
})
