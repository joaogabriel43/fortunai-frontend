import React from 'react'
import { Alert, Box, Divider, Grid, Paper, Typography } from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ShowChartIcon from '@mui/icons-material/ShowChart'

import { useDashboardData } from '../hooks/useDashboardData'
import TransactionList from '../components/dashboard/TransactionList'
import PortfolioDonutChart from '../components/dashboard/PortfolioDonutChart'
import SaldoLineChart from '../components/dashboard/SaldoLineChart'
import EmptyState from '../components/dashboard/EmptyState'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart'
import DividendosCard from '../components/dashboard/DividendosCard'
import ScoreSaudeCard from '../components/dashboard/ScoreSaudeCard'

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

const paperStyle = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  boxShadow: 'none',
}

// Mini-stat exibido dentro da Hero section
// Mantém data-testid="kpi-card" para compatibilidade com os testes existentes
function MiniStat({ label, value }) {
  return (
    <Box
      data-testid="kpi-card"
      sx={{ textAlign: 'center', px: { xs: 1.5, md: 2 } }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          display: 'block',
        }}
      >
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
        {formatBRL(value)}
      </Typography>
    </Box>
  )
}

const Dashboard = () => {
  const {
    loading,
    error,
    saldoAtual,
    totalInvestido,
    totalReceitas,
    maiorGasto,
    transacoes,
    portfolioComposition,
    evolucaoSaldo,
  } = useDashboardData()

  if (loading) return <DashboardSkeleton />

  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>

  const hasAnyData =
    saldoAtual > 0 ||
    totalInvestido > 0 ||
    transacoes.length > 0 ||
    portfolioComposition.length > 0

  if (!hasAnyData) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <EmptyState
          mensagem="Comece registrando uma transação no chat"
          icone={ReceiptLongIcon}
        />
        <Paper sx={{ p: 3, mt: 3, overflow: 'hidden', ...paperStyle }}>
          <GastosPorCategoriaChart />
        </Paper>
      </Box>
    )
  }

  const patrimonioTotal = saldoAtual + totalInvestido

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, width: '100%', boxSizing: 'border-box' }}>

      {/* HERO SECTION — Patrimônio (md=8) + Score Saúde (md=4) */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            sx={{
              p: { xs: 2.5, md: 4 },
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid rgba(124,106,247,0.3)',
              borderRadius: '16px',
              boxShadow: 'none',
              height: '100%',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Patrimônio Total
            </Typography>

            <Typography
              variant="h3"
              fontWeight={700}
              sx={{ mt: 0.5, mb: 3, fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              {formatBRL(patrimonioTotal)}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: { xs: 1.5, md: 0 },
              }}
            >
              <MiniStat label="Saldo Atual" value={saldoAtual} />

              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 40, mx: { xs: 0, md: 1 }, display: { xs: 'none', md: 'block' } }}
              />

              <MiniStat label="Total Investido" value={totalInvestido} />

              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 40, mx: { xs: 0, md: 1 }, display: { xs: 'none', md: 'block' } }}
              />

              <MiniStat label="Total Receitas" value={totalReceitas} />

              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 40, mx: { xs: 0, md: 1 }, display: { xs: 'none', md: 'block' } }}
              />

              <MiniStat label="Maior Gasto" value={maiorGasto?.valor ?? 0} />
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: { xs: 2.5, md: 3 },
              ...paperStyle,
              height: '100%',
            }}
          >
            <ScoreSaudeCard />
          </Paper>
        </Grid>
      </Grid>

      {/* SEÇÃO TÁTICA — Evolução do Saldo (md=8) + Composição do Portfólio (md=4) */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: { xs: 1.5, md: 3 }, minHeight: 300, height: '100%', overflow: 'hidden', ...paperStyle }}>
            <Typography variant="h6" fontWeight={600} mb={1.5}>
              Evolução do Saldo
            </Typography>
            {evolucaoSaldo.length > 0
              ? <SaldoLineChart data={evolucaoSaldo} height={280} />
              : <EmptyState
                  compact
                  mensagem="Nenhuma movimentação registrada ainda"
                  icone={ShowChartIcon}
                />
            }
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, minHeight: 300, height: '100%', overflow: 'hidden', ...paperStyle }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Composição do Portfólio
            </Typography>
            {portfolioComposition.length > 0
              ? (
                <PortfolioDonutChart
                  data={portfolioComposition}
                  height={220}
                  totalInvestido={totalInvestido}
                />
              )
              : <EmptyState
                  compact
                  mensagem="Adicione ativos para ver sua composição"
                  icone={PieChartIcon}
                />
            }
          </Paper>
        </Grid>
      </Grid>

      {/* SEÇÃO OPERACIONAL — Últimas Transações (md=6) + Dividendos placeholder (md=6) */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, overflow: 'hidden', ...paperStyle }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Últimas Transações
            </Typography>
            {transacoes.length > 0
              ? <TransactionList transacoes={transacoes} />
              : <EmptyState
                  compact
                  mensagem="Comece registrando uma transação no chat"
                  icone={ReceiptLongIcon}
                />
            }
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, overflow: 'hidden', ...paperStyle }}>
            <DividendosCard />
          </Paper>
        </Grid>
      </Grid>

    </Box>
  )
}

export default Dashboard
