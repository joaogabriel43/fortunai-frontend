import React, { useEffect, useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import api from '../services/api'

import { useAuth } from '../contexts/AuthContext'
import { useDashboardData } from '../hooks/useDashboardData'
import { formatBRL } from '../components/ui'
import TransactionList from '../components/dashboard/TransactionList'
import ComposicaoCard from '../components/dashboard/ComposicaoCard'
import SaldoLineChart from '../components/dashboard/SaldoLineChart'
import EmptyState from '../components/dashboard/EmptyState'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart'
import DividendosCard from '../components/dashboard/DividendosCard'
import ScoreSaudeCard from '../components/dashboard/ScoreSaudeCard'
import ExportarRelatorioButton from '../components/dashboard/ExportarRelatorioButton'
import InsightEducacionalCard from '../components/InsightEducacionalCard'
import PanoramaFinanceiro from '../components/dashboard/pondero/PanoramaFinanceiro'
import SectionHead from '../components/dashboard/pondero/SectionHead'
import ModuloIndisponivel from '../components/dashboard/pondero/ModuloIndisponivel'
import { definirProximaAcao, estadoDaFonte } from '../components/dashboard/pondero/proximaAcao'

const mono = (t) => t.typography.fontFamilyMono

// Ritmo vertical entre seções (protótipo Pondero: 58px desktop / 42px mobile).
const secaoSx = { mt: { xs: '42px', md: '58px' } }

// Painel de módulo: superfície de papel, sem virar "mais um cartão igual".
const painelSx = { p: { xs: '20px', md: 'clamp(22px, 2.4vw, 30px)' }, height: '100%' }

function saudacaoPorHora(hora) {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Data por extenso do cabeçalho operacional.
function dataPorExtenso(agora) {
  const texto = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Par rótulo/valor do sumário do mês. `null` = fonte indisponível; 0 = zero real.
function ValorDoMes({ rotulo, valor, detalhe }) {
  const indisponivel = valor === null || valor === undefined
  return (
    <Box
      sx={(t) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        py: '10px',
        borderBottom: `1px solid ${t.palette.lines.subtle}`,
        '&:last-of-type': { borderBottom: 'none' },
      })}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {rotulo}
      </Typography>
      <Typography sx={{ fontFamily: mono, fontSize: '1.05rem', fontWeight: 700, color: 'text.primary' }}>
        {indisponivel ? '—' : formatBRL(valor)}
      </Typography>
      {detalhe && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{detalhe}</Typography>
      )}
    </Box>
  )
}

const Dashboard = () => {
  const { user } = useAuth()
  const {
    loading,
    erros,
    falhaTotal,
    saldoAtual,
    totalInvestido,
    patrimonioTotal,
    entradasDoMes,
    despesasDoMes,
    maiorGastoDoMes,
    transacoes,
    portfolioComposition,
    evolucaoSaldo,
    recarregar,
  } = useDashboardData()

  // Insight educacional — undefined = carregando (não renderiza), null = sem insight elegível.
  const [insight, setInsight] = useState(undefined)

  useEffect(() => {
    // A baseURL do axios já contém /api — prefixar de novo geraria /api/api.
    api.get('/insights/atual')
      .then((res) => setInsight(res.data ?? null))
      .catch(() => setInsight(null))
  }, [])

  const handleDismissInsight = () => setInsight(null)

  if (loading) return <DashboardSkeleton />

  const agora = new Date()
  const primeiroNome = typeof user?.nome === 'string' ? user.nome.trim().split(' ')[0] : ''

  const listaTransacoes = transacoes ?? []
  const listaComposicao = portfolioComposition ?? []
  const listaEvolucao = evolucaoSaldo ?? []

  // Alguma fonte quebrou? Entao a tela NAO pode ser substituida pelo vazio de
  // onboarding — isso afirmaria ausencia de dados onde ha apenas uma falha de
  // leitura, e ainda tiraria do usuario a chance de tentar de novo.
  const algumaFalha = Object.values(erros).some(Boolean)

  // `null` = fonte indisponivel; `0` = zero financeiro real. Saldo NEGATIVO
  // tambem e dado — a versao anterior (`(saldoAtual ?? 0) > 0`) tratava conta
  // no vermelho como "usuario sem nada".
  const temDado =
    (saldoAtual !== null && saldoAtual !== 0) ||
    (totalInvestido !== null && totalInvestido !== 0) ||
    listaTransacoes.length > 0 ||
    listaComposicao.length > 0

  // Nada carregou de nenhuma fonte: erro total, com nova tentativa.
  if (falhaTotal) {
    return (
      <Box sx={{ p: { xs: '12px', md: '24px' } }}>
        <ModuloIndisponivel
          mensagem="Não foi possível carregar seus dados agora. Verifique sua conexão e tente de novo."
          onTentarNovamente={recarregar}
        />
      </Box>
    )
  }

  if (!algumaFalha && !temDado) {
    return (
      <Box sx={{ p: { xs: '12px', md: '24px' } }}>
        <EmptyState mensagem="Comece registrando uma transação no chat" icone={ReceiptLongIcon} />
        <Paper sx={{ p: '24px', mt: '24px', overflow: 'hidden' }}>
          <GastosPorCategoriaChart />
        </Paper>
      </Box>
    )
  }

  // `listaTransacoes`/`listaComposicao` já viraram [] em caso de erro; o estado
  // da fonte vem dos dados crus + flag de erro para não confundir
  // "indisponível" com "vazio confirmado".
  const proximaAcao = definirProximaAcao({
    transacoes: estadoDaFonte({ erro: erros.transacoes, itens: transacoes }),
    investimentos: estadoDaFonte({ erro: erros.portfolio, itens: portfolioComposition }),
  })

  return (
    <Box sx={{ p: { xs: '12px', md: '24px 28px 48px' }, width: '100%', boxSizing: 'border-box' }}>
      {/* 1. Cabeçalho operacional ---------------------------------------- */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'flex-end' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: '14px',
          mb: { xs: '22px', md: '30px' },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            {dataPorExtenso(agora)}
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: 'clamp(21px, 2.2vw, 27px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'text.primary',
              mt: '4px',
            }}
          >
            {saudacaoPorHora(agora.getHours())}{primeiroNome ? `, ${primeiroNome}` : ''}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Não existe filtro global de período no backend: este é um RÓTULO
              de escopo, não um controle que finja filtrar. */}
          <Typography
            component="span"
            sx={(t) => ({
              px: '12px',
              py: '6px',
              borderRadius: `${t.radius.pill}px`,
              border: `1px solid ${t.palette.lines.subtle}`,
              backgroundColor: t.palette.surfaces.surfaceSoft,
              fontSize: 12,
              fontWeight: 600,
              color: 'text.secondary',
            })}
          >
            Visão atual
          </Typography>
          <ExportarRelatorioButton />
        </Box>
      </Box>

      {/* 2. Panorama financeiro G3-A -------------------------------------- */}
      <PanoramaFinanceiro
        patrimonioTotal={patrimonioTotal}
        saldoAtual={saldoAtual}
        totalInvestido={totalInvestido}
        proximaAcao={proximaAcao}
        onProximaAcao={recarregar}
        parcial={patrimonioTotal === null}
        onTentarNovamente={erros.summary || erros.portfolio ? recarregar : undefined}
      />

      {/* 3. Evolução do saldo nos últimos 30 dias -------------------------- */}
      <Box component="section" aria-labelledby="secao-evolucao" sx={secaoSx}>
        <SectionHead
          id="secao-evolucao"
          titulo="Evolução do Saldo"
          descricao="Saldo em conta nos últimos 30 dias"
        />
        {erros.evolucao ? (
          <ModuloIndisponivel
            mensagem="Não foi possível carregar a evolução do saldo."
            onTentarNovamente={recarregar}
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 240px' },
              gap: { xs: '18px', md: '26px' },
              alignItems: 'stretch',
            }}
          >
            <Paper sx={{ ...painelSx, minHeight: 300 }}>
              {listaEvolucao.length > 0 ? (
                <SaldoLineChart data={listaEvolucao} height={260} />
              ) : (
                <EmptyState compact mensagem="Nenhuma movimentação registrada ainda" icone={ShowChartIcon} />
              )}
            </Paper>

            <Box
              component="aside"
              aria-label="Resumo do mês corrente"
              sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              {erros.transacoes ? (
                <ModuloIndisponivel
                  mensagem="Não foi possível carregar os totais do mês."
                  onTentarNovamente={recarregar}
                />
              ) : (
                <>
                  <ValorDoMes rotulo="Entradas do mês" valor={entradasDoMes} />
                  <ValorDoMes rotulo="Despesas do mês" valor={despesasDoMes} />
                  <ValorDoMes
                    rotulo="Maior gasto do mês"
                    valor={maiorGastoDoMes ? maiorGastoDoMes.valor : null}
                    detalhe={maiorGastoDoMes ? maiorGastoDoMes.descricao : 'Nenhuma despesa neste mês'}
                  />
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* 4. Composição por ativo + saúde financeira ------------------------ */}
      <Box
        sx={{
          ...secaoSx,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.36fr) minmax(300px, 0.64fr)' },
          gap: { xs: '32px', md: '26px' },
          alignItems: 'start',
        }}
      >
        <Box component="section" aria-labelledby="secao-composicao">
          <SectionHead
            id="secao-composicao"
            titulo="Composição por ativo"
            descricao="Distribuição da carteira por ticker, posição a posição"
          />
          <Paper sx={painelSx}>
            {erros.portfolio ? (
              <ModuloIndisponivel
                mensagem="Não foi possível carregar a composição da carteira."
                onTentarNovamente={recarregar}
              />
            ) : listaComposicao.length > 0 ? (
              <ComposicaoCard data={listaComposicao} totalInvestido={totalInvestido ?? undefined} />
            ) : (
              <EmptyState compact mensagem="Adicione ativos para ver sua composição" icone={PieChartIcon} />
            )}
          </Paper>
        </Box>

        <Box component="section" aria-labelledby="secao-saude">
          <SectionHead
            id="secao-saude"
            titulo="Saúde financeira"
            descricao="Indicador calculado pelo backend a partir do seu histórico"
          />
          <Paper sx={painelSx}>
            <ScoreSaudeCard />
          </Paper>
        </Box>
      </Box>

      {/* 5. Transações recentes ------------------------------------------- */}
      <Box component="section" aria-labelledby="secao-transacoes" sx={secaoSx}>
        <SectionHead
          id="secao-transacoes"
          titulo="Transações recentes"
          descricao="As últimas movimentações registradas na sua conta"
        />
        <Paper sx={painelSx}>
          {erros.transacoes ? (
            <ModuloIndisponivel
              mensagem="Não foi possível carregar suas transações."
              onTentarNovamente={recarregar}
            />
          ) : listaTransacoes.length > 0 ? (
            <TransactionList transacoes={listaTransacoes} />
          ) : (
            <EmptyState compact mensagem="Comece registrando uma transação no chat" icone={ReceiptLongIcon} />
          )}
        </Paper>
      </Box>

      {/* 6. Dividendos / proventos ---------------------------------------- */}
      <Box component="section" aria-labelledby="secao-dividendos" sx={secaoSx}>
        <SectionHead
          id="secao-dividendos"
          titulo="Proventos"
          descricao="Dividendos e proventos vindos da sua carteira"
        />
        <Paper sx={{ ...painelSx, overflow: 'hidden' }}>
          <DividendosCard />
        </Paper>
      </Box>

      {/* 7. Insight educacional ------------------------------------------- */}
      {insight !== undefined && insight !== null && (
        // Unica secao sem SectionHead visivel (o titulo do insight faz esse
        // papel) — o nome do landmark vem por aria-label, para que a
        // navegacao por regioes nao encontre uma secao anonima.
        <Box component="section" aria-label="Insight educacional" sx={secaoSx}>
          <InsightEducacionalCard insight={insight} onDismiss={handleDismissInsight} />
        </Box>
      )}
    </Box>
  )
}

export default Dashboard
