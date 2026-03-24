import React from 'react'
import { Alert, AlertTitle, Box, Chip, CircularProgress, Collapse, Typography } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useAnomalias } from '../../hooks/useAnomalias'

const AnomaliaAlert = () => {
  const { anomalias, loading, error } = useAnomalias()

  if (loading) return <CircularProgress size={20} data-testid="anomalia-loading" />
  if (error || anomalias.length === 0) return null

  return (
    <Box data-testid="anomalia-alert" sx={{ mb: 2 }}>
      {anomalias.map((a, i) => (
        <Alert
          key={i}
          severity="warning"
          icon={<TrendingUpIcon />}
          sx={{ mb: 1, borderRadius: '12px' }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>
            Anomalia detectada: {a.categoria}
            <Chip
              label={`+${a.percentualDesvio?.toFixed(0)}%`}
              color="warning"
              size="small"
              sx={{ ml: 1 }}
            />
          </AlertTitle>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Gasto atual: R$ {a.valorAtual?.toFixed(2)} | Media 3 meses: R$ {a.media3Meses?.toFixed(2)}
          </Typography>
          {a.explicacaoGemini && (
            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
              {a.explicacaoGemini}
            </Typography>
          )}
        </Alert>
      ))}
    </Box>
  )
}

export default AnomaliaAlert
