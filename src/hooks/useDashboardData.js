import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { prefixoMesCorrente } from '../utils/dateUtils'

/**
 * Normaliza valor monetário vindo do backend.
 * O contrato tem duas formas em uso: objeto Dinheiro (`{ quantia }`) e número
 * puro. Ler só uma das duas silenciosamente vira R$ 0,00 — um valor inventado.
 */
export function normalizarValor(valor) {
  const bruto = valor?.quantia ?? valor ?? 0
  const numero = Number(bruto)
  return Number.isFinite(numero) ? numero : 0
}

/**
 * Compara pelo prefixo da string ISO em vez de instanciar Date: `new Date`
 * sobre 'YYYY-MM-DD' assume UTC e joga a transação para o mês anterior em
 * fusos negativos (o nosso).
 */
function ehDoMesCorrente(transacao, prefixoMes) {
  return typeof transacao?.data === 'string' && transacao.data.startsWith(prefixoMes)
}

const SEM_ERRO = { summary: false, transacoes: false, portfolio: false, evolucao: false }

const estadoInicial = {
  loading: true,
  erros: SEM_ERRO,
  falhaTotal: false,
  // null = fonte indisponível (diferente de zero financeiro real)
  saldoAtual: null,
  totalInvestido: null,
  patrimonioTotal: null,
  entradasDoMes: null,
  despesasDoMes: null,
  maiorGastoDoMes: null,
  transacoes: [],
  portfolioComposition: null,
  evolucaoSaldo: null,
  usuarioId: null,
}

export function useDashboardData() {
  const { user } = useAuth()
  const [state, setState] = useState(estadoInicial)

  const fetchData = useCallback(async (usuarioId) => {
    setState((prev) => ({ ...prev, loading: true }))

    const [summaryRes, transacoesRes, portfolioRes, evolucaoRes] = await Promise.allSettled([
      api.get('/dashboard/summary'),
      api.get(`/orcamento/transacoes/${usuarioId}`),
      api.get('/dashboard/portfolio-composition'),
      api.get(`/orcamento/evolucao-saldo/${usuarioId}`),
    ])

    const erros = {
      summary: summaryRes.status === 'rejected',
      // 200 com corpo nao-array tambem e fonte indisponivel (como a carteira)
      transacoes: transacoesRes.status === 'rejected' || !Array.isArray(transacoesRes.value?.data),
      portfolio: portfolioRes.status === 'rejected',
      evolucao: evolucaoRes.status === 'rejected',
    }

    const summary = summaryRes.status === 'fulfilled' ? summaryRes.value?.data : null
    // Corpo 200 fora do contrato (nao-array) -> null:
    // `[]` aqui viraria o estado "vazio" e afirmaria que nao ha transacoes.
    const transacoesBrutas = transacoesRes.status === 'fulfilled' && Array.isArray(transacoesRes.value?.data)
      ? transacoesRes.value.data
      : null
    const transacoes = transacoesBrutas ?? []
    const portfolioComposition = portfolioRes.status === 'fulfilled' && Array.isArray(portfolioRes.value?.data)
      ? portfolioRes.value.data.map((item) => ({ ...item, value: normalizarValor(item?.value) }))
      : null
    const evolucaoSaldo = evolucaoRes.status === 'fulfilled' && Array.isArray(evolucaoRes.value?.data)
      ? evolucaoRes.value.data
      : null

    // O backend responde 200 com `contas: []` para quem ainda nao tem
    // ContaFinanceira. Isso e AUSENCIA de conta, nao saldo zero real: sem a
    // guarda, `?.[0]?.saldoAtual` vira undefined e o normalizador devolve 0 —
    // o painel afirmaria "Saldo em conta: R$ 0,00" como fato.
    const contaPrincipal = summary?.contas?.[0]
    const saldoAtual = erros.summary || !contaPrincipal
      ? null
      : normalizarValor(contaPrincipal.saldoAtual)

    const totalInvestido = portfolioComposition === null
      ? null
      : portfolioComposition.reduce((acc, item) => acc + item.value, 0)

    // Patrimônio só existe se as DUAS parcelas existem — somar com uma fonte
    // ausente produziria um número menor que o real, apresentado como verdade.
    const patrimonioTotal = saldoAtual === null || totalInvestido === null
      ? null
      : saldoAtual + totalInvestido

    const prefixoMes = prefixoMesCorrente()
    const doMes = transacoes.filter((t) => ehDoMesCorrente(t, prefixoMes))
    const debitosDoMes = doMes.filter((t) => t.tipo === 'DEBIT')

    const entradasDoMes = erros.transacoes
      ? null
      : doMes.filter((t) => t.tipo === 'CREDIT').reduce((soma, t) => soma + normalizarValor(t.valor), 0)
    const despesasDoMes = erros.transacoes
      ? null
      : debitosDoMes.reduce((soma, t) => soma + normalizarValor(t.valor), 0)

    const maiorDebito = debitosDoMes.reduce((maior, t) => {
      if (!maior) return t
      return normalizarValor(t.valor) > normalizarValor(maior.valor) ? t : maior
    }, null)
    const maiorGastoDoMes = maiorDebito
      ? {
          categoria: maiorDebito.categoria,
          descricao: maiorDebito.descricao,
          valor: normalizarValor(maiorDebito.valor),
        }
      : null

    // Nomes dos tickers do portfólio — usados para evitar duplicatas no DOM
    const portfolioNames = new Set((portfolioComposition ?? []).map((p) => p.name))

    // Últimas 5 transações ordenadas por data desc (sem recorte de mês:
    // "recentes" é cronológico, não do mês corrente)
    const ordenadas = [...transacoes].sort((a, b) => String(b.data).localeCompare(String(a.data)))
    const ultimas = ordenadas.slice(0, 5).map((t) => ({
      ...t,
      // Sinaliza que a descrição é um ticker do portfólio (tratamento de acessibilidade)
      _isPortfolioTicker: portfolioNames.has(t.descricao),
    }))

    setState({
      loading: false,
      erros,
      falhaTotal: Object.values(erros).every(Boolean),
      saldoAtual,
      totalInvestido,
      patrimonioTotal,
      entradasDoMes,
      despesasDoMes,
      maiorGastoDoMes,
      transacoes: transacoesBrutas === null ? null : ultimas,
      portfolioComposition,
      evolucaoSaldo,
      usuarioId,
    })
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetchData(user.id)
  }, [user, fetchData])

  const recarregar = useCallback(() => {
    if (user?.id) fetchData(user.id)
  }, [user, fetchData])

  return { ...state, recarregar }
}
