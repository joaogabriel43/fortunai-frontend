import React from 'react'
import { Box } from '@mui/material'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const formatDate = (val) =>
  new Date(`${val}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    currency: 'BRL',
    style: 'currency',
  }).format(val)

const formatDateLong = (val) =>
  new Date(`${val}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  })

const formatBRL = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export default function SaldoLineChart({ data, height = 240 }) {
  if (!data || data.length === 0) return null

  return (
    <Box data-testid="evolucao-saldo-chart">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="data"
            tickFormatter={formatDate}
            tick={{ fill: '#8B8BA8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: '#8B8BA8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={formatDateLong}
            formatter={(val) => [formatBRL(val), 'Saldo']}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#7C6AF7"
            strokeWidth={2}
            dot={{ fill: '#7C6AF7', r: 4 }}
            activeDot={{ r: 6, fill: '#7C6AF7', stroke: '#0A0A0F', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
