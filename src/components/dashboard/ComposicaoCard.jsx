import React from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { Donut, formatBRLShort } from '../ui'

const mono = (t) => t.typography.fontFamilyMono

/**
 * Card de composição do portfólio — usa o primitivo Donut (SVG D4) + legenda.
 * Cores vêm de theme.palette.series (sem hardcode). Valores em fonte mono.
 *
 * @param {{name: string, value: number}[]} data  composição vinda do backend
 * @param {number} [totalInvestido]               total para o centro do donut
 */
export default function ComposicaoCard({ data, totalInvestido }) {
  const theme = useTheme()
  const series = theme.palette.series

  if (!data || data.length === 0) return null

  const total = totalInvestido ?? data.reduce((acc, item) => acc + (item.value ?? 0), 0)
  const segments = data.map((item, i) => ({
    pct: total > 0 ? (item.value / total) * 100 : 0,
    color: series[i % series.length],
  }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Donut segments={segments} size={140} thickness={18}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
            Total
          </Typography>
          <Typography sx={{ fontFamily: mono, fontSize: 15, fontWeight: 600 }}>
            {formatBRLShort(total)}
          </Typography>
        </Donut>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.map((item, i) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0
          return (
            <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  bgcolor: series[i % series.length],
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {item.name}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: mono, color: 'text.secondary' }}>
                {pct.toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: mono, minWidth: 64, textAlign: 'right' }}>
                {formatBRLShort(item.value)}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
