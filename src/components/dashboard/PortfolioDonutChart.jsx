import React from 'react'
import { Box, Typography } from '@mui/material'
import {
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts'

const COLORS = ['#7C6AF7', '#00D4AA', '#FF4D6A', '#FFB547', '#4FC3F7']

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Error boundary para capturar erros do recharts em ambientes sem canvas/SVG completo (ex: jsdom)
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function PortfolioDonutChart({ data }) {
  if (!data || data.length === 0) return null

  return (
    <Box>
      {/* Recharts envolvido em error boundary: em jsdom pode falhar sem afetar a legenda */}
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#1A1A24',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
              }}
              formatter={(value) => [formatBRL(value), '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>

      {/* Legenda MUI — renderiza independente de erros no recharts */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: 'center',
          pt: 1,
        }}
      >
        {data.map((item, index) => (
          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: COLORS[index % COLORS.length],
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontSize: 12 }}>
              {item.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
