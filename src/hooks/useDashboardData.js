import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const initialState = {
  loading: true,
  error: null,
  saldoAtual: 0,
  totalInvestido: 0,
  totalReceitas: 0,
  maiorGasto: null,
  transacoes: [],
  portfolioComposition: [],
  evolucaoSaldo: [],
  usuarioId: null,
}

export function useDashboardData() {
  const { user } = useAuth()
  const [state, setState] = useState(initialState)

  const fetchData = useCallback(async (usuarioId) => {
    try {
      const [summaryRes, transacoesRes, portfolioRes, evolucaoRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get(`/orcamento/transacoes/${usuarioId}`),
        api.get('/dashboard/portfolio-composition'),
        api.get(`/orcamento/evolucao-saldo/${usuarioId}`),
      ])

      const summary = summaryRes.data
      const transacoes = Array.isArray(transacoesRes.data) ? transacoesRes.data : []
      const portfolioComposition = Array.isArray(portfolioRes.data) ? portfolioRes.data : []
      const evolucaoSaldo = Array.isArray(evolucaoRes.data) ? evolucaoRes.data : []

      const saldoAtual = summary?.contas?.[0]?.saldoAtual ?? 0
      const totalInvestido = portfolioComposition.reduce((acc, item) => acc + (item.value ?? 0), 0)

      // Maior gasto e total de receitas
      const debits = transacoes.filter((t) => t.tipo === 'DEBIT')
      const credits = transacoes.filter((t) => t.tipo === 'CREDIT')
      const totalReceitas = credits.reduce((sum, t) => sum + (t.valor?.quantia ?? 0), 0)
      const maiorGasto = debits.length > 0
        ? debits.reduce((max, t) => {
            const val = t.valor?.quantia ?? 0
            return val > (max.valor?.quantia ?? 0) ? t : max
          })
        : null

      // Nomes dos tickers do portfólio — usados para evitar duplicatas no DOM
      const portfolioNames = new Set(portfolioComposition.map((p) => p.name))

      // Últimas 5 transações ordenadas por data desc
      const sorted = [...transacoes].sort((a, b) => new Date(b.data) - new Date(a.data))
      const top5 = sorted.slice(0, 5).map((t) => ({
        ...t,
        // Sinaliza que a descrição é um ticker do portfólio (tratamento de acessibilidade)
        _isPortfolioTicker: portfolioNames.has(t.descricao),
      }))

      setState({
        loading: false,
        error: null,
        saldoAtual,
        totalInvestido,
        totalReceitas,
        maiorGasto: maiorGasto
          ? { categoria: maiorGasto.categoria, valor: maiorGasto.valor?.quantia ?? 0 }
          : null,
        transacoes: top5,
        portfolioComposition,
        evolucaoSaldo,
        usuarioId,
      })
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Não foi possível carregar os dados do dashboard.',
      }))
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetchData(user.id)
  }, [user, fetchData])

  return state
}
