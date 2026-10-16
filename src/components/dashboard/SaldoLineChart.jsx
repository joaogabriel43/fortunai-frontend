import React from 'react'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { formatarDataLocal } from '../../utils/dateUtils'
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const formatDate = (val) =>
  formatarDataLocal(val, { day: '2-digit', month: '2-digit' })

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    currency: 'BRL',
    style: 'currency',
  }).format(val)

const formatDateLong = (val) =>
  formatarDataLocal(val, { day: '2-digit', month: 'long' })

const formatBRL = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export default function SaldoLineChart({ data, height = 240 }) {
  const theme = useTheme()

  if (!data || data.length === 0) return null

  const corLinha = theme.palette.primary.main
  const corEixo = theme.palette.text.secondary
  const corFundoTooltip = theme.palette.background.paper
  const corBorda = theme.palette.divider
  const corFundoGrafico = theme.palette.background.default

  return (
    <Box data-testid="evolucao-saldo-chart">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
          <defs>
            <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={corLinha} stopOpacity={0.3} />
              <stop offset="95%" stopColor={corLinha} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={corBorda}
            vertical={false}
          />
          <XAxis
            dataKey="data"
            tickFormatter={formatDate}
            tick={{ fill: corEixo, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: corEixo, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: corFundoTooltip,
              border: `1px solid ${corBorda}`,
              borderRadius: 8,
              fontSize: 12,
              fontFamily: theme.typography.fontFamilyMono,
            }}
            labelFormatter={formatDateLong}
            formatter={(val) => [formatBRL(val), 'Saldo']}
          />
          <Area
            type="monotone"
            dataKey="saldo"
            stroke={corLinha}
            strokeWidth={2}
            fill="url(#saldoGradient)"
            dot={{ fill: corLinha, r: 4 }}
            activeDot={{ r: 6, fill: corLinha, stroke: corFundoGrafico, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}
