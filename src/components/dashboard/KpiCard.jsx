import React from 'react'
import { Box, Card, Typography } from '@mui/material'

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

export default function KpiCard({ titulo, valor, icone: Icone, cor, subtitulo }) {
  return (
    <Card
      data-testid="kpi-card"
      sx={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        p: 2.5,
        boxShadow: 'none',
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

        {/* Lado esquerdo: dados */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {titulo}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mt: 0.5, lineHeight: 1.2, fontSize: { xs: '1.25rem', md: '1.5rem' } }}
          >
            {formatBRL(valor)}
          </Typography>
          {subtitulo && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', mt: 0.5, display: 'block', fontSize: 11 }}
            >
              {subtitulo}
            </Typography>
          )}
        </Box>

        {/* Lado direito: ícone */}
        <Box
          sx={{
            background: `${cor}18`,
            borderRadius: '10px',
            p: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            ml: 1,
          }}
        >
          {Icone && <Icone sx={{ color: cor, fontSize: 20 }} />}
        </Box>

      </Box>
    </Card>
  )
}
