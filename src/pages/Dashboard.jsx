import React from 'react'
import { Alert, Box, Grid, Paper, Typography } from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PieChartIcon from '@mui/icons-material/PieChart'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ShowChartIcon from '@mui/icons-material/ShowChart'

import { useDashboardData } from '../hooks/useDashboardData'
import KpiCard from '../components/dashboard/KpiCard'
import TransactionList from '../components/dashboard/TransactionList'
import PortfolioDonutChart from '../components/dashboard/PortfolioDonutChart'
import SaldoLineChart from '../components/dashboard/SaldoLineChart'
import EmptyState from '../components/dashboard/EmptyState'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart'

const paperStyle = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  boxShadow: 'none',
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
        <Paper sx={{ p: 2, mt: 3, overflow: 'hidden', ...paperStyle }}>
          <GastosPorCategoriaChart />
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>

      {/* LINHA 1 — 4 KPI Cards */}
      <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            titulo="Saldo Atual"
            valor={saldoAtual}
            icone={AccountBalanceWalletIcon}
            cor="#7C6AF7"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            titulo="Total Investido"
            valor={totalInvestido}
            icone={TrendingUpIcon}
            cor="#00D4AA"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            titulo="Total Receitas"
            valor={totalReceitas}
            icone={AttachMoneyIcon}
            cor="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            titulo="Maior Gasto"
            valor={maiorGasto?.valor ?? 0}
            icone={ShoppingCartIcon}
            cor="#FF4D6A"
            subtitulo={maiorGasto?.categoria ?? 'Nenhum gasto registrado'}
          />
        </Grid>
      </Grid>

      {/* LINHA 2 — Evolução do Saldo (larga) + Composição do Portfólio (compacto) */}
      <Grid container spacing={2} sx={{ mb: 3, width: '100%', mx: 0 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: { xs: 1.5, md: 2.5 }, height: '100%', overflow: 'hidden', ...paperStyle }}>
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
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, height: '100%', overflow: 'hidden', ...paperStyle }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Composição do Portfólio
            </Typography>
            {portfolioComposition.length > 0
              ? <PortfolioDonutChart data={portfolioComposition} height={240} />
              : <EmptyState
                  compact
                  mensagem="Adicione ativos para ver sua composição"
                  icone={PieChartIcon}
                />
            }
          </Paper>
        </Grid>
      </Grid>

      {/* LINHA 3 — Últimas Transações (largura total) */}
      <Grid container spacing={2} sx={{ mb: 3, width: '100%', mx: 0 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, overflow: 'hidden', ...paperStyle }}>
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
      </Grid>

      {/* LINHA 4 — Despesas por Categoria (largura total) */}
      <Grid container spacing={2} sx={{ width: '100%', mx: 0 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, overflow: 'hidden', ...paperStyle }}>
            <Typography variant="h6" fontWeight={600} mb={1.5}>
              Despesas por Categoria
            </Typography>
            <GastosPorCategoriaChart showTitle={false} />
          </Paper>
        </Grid>
      </Grid>

    </Box>
  )
}

export default Dashboard
