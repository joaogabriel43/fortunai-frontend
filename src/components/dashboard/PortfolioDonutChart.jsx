import React from 'react'
import { Box, Typography } from '@mui/material'
import {
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts'

const COLORS = ['#7C6AF7', '#00D4AA', '#FF4D6A', '#FFB547', '#4FC3F7']

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatCompact = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value ?? 0)

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

export default function PortfolioDonutChart({ data, height = 220, totalInvestido }) {
  if (!data || data.length === 0) return null

  const total = totalInvestido ?? data.reduce((acc, item) => acc + (item.value ?? 0), 0)

  return (
    <Box>
      {/* Chart + label central via overlay CSS — evita dependência da API Label do Recharts */}
      <Box sx={{ position: 'relative' }}>
        <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
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
        {/* Label central posicionado via CSS — não depende do recharts */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <Typography variant="caption" sx={{ color: '#8B8BA8', fontSize: 11, display: 'block', lineHeight: 1.2 }}>
            Total
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13, lineHeight: 1.2 }}>
            {formatCompact(total)}
          </Typography>
        </Box>
      </Box>

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
