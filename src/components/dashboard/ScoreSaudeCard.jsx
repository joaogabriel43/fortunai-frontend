import React from 'react'
import { Box, Typography, CircularProgress, LinearProgress, Skeleton } from '@mui/material'
import { useScoreSaude } from '../../hooks/useScoreSaude'

const COLORS = {
  EXCELENTE: '#4caf50',
  BOM: '#2196f3',
  REGULAR: '#ff9800',
  CRITICO: '#f44336',
}

function ScoreGauge({ score, classificacao }) {
  const color = COLORS[classificacao] || COLORS.REGULAR
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={100}
        thickness={6}
        sx={{ color }}
      />
      <Box
        sx={{
          position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Typography variant="h5" fontWeight={700}>{score}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600, fontSize: 10 }}>
          {classificacao}
        </Typography>
      </Box>
    </Box>
  )
}

function ComponenteBar({ nome, pontos, descricao }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" sx={{ fontSize: 11 }}>{nome}</Typography>
        <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11 }}>{pontos}/25</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(pontos / 25) * 100}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
        {descricao}
      </Typography>
    </Box>
  )
}

const ScoreSaudeCard = () => {
  const { data, loading, error } = useScoreSaude()

  if (loading) {
    return (
      <Box data-testid="score-loading">
        <Skeleton variant="circular" width={100} height={100} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
        {error || 'Score indisponivel'}
      </Typography>
    )
  }

  const componentes = [
    data.taxaPoupanca,
    data.coberturaEmergencia,
    data.diversificacao,
    data.tendencia,
  ].filter(Boolean)

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        Saude Financeira
      </Typography>
      <Box sx={{ mt: 1 }}>
        <ScoreGauge score={data.score} classificacao={data.classificacao} />
      </Box>
      <Box sx={{ textAlign: 'left', mt: 1 }}>
        {componentes.map((c) => (
          <ComponenteBar key={c.nome} nome={c.nome} pontos={c.pontos} descricao={c.descricao} />
        ))}
      </Box>
    </Box>
  )
}

export default ScoreSaudeCard
