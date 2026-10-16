import React from 'react'
import { Box, Typography, LinearProgress, Skeleton, useTheme } from '@mui/material'
import { useScoreSaude } from '../../hooks/useScoreSaude'
import { RingGauge } from '../ui'

// Fonte mono para valores numéricos (token D4) — usada via callback sx.
const mono = (t) => t.typography.fontFamilyMono

/**
 * Mapeia a classificação de saúde financeira para uma cor do tema (tokens D4).
 * Sem cores hardcoded — sempre theme.palette.*
 */
function corPorClassificacao(theme) {
  return {
    EXCELENTE: theme.palette.success.main,
    BOM: theme.palette.primary.main,
    REGULAR: theme.palette.warning.main,
    CRITICO: theme.palette.error.main,
  }
}

// Mesma classificacao, tom legivel como TEXTO (WCAG 1.4.3). Anel/barra seguem em `cor`.
// Caminhos de paleta resolvidos pelo sx (nao le theme em JS: seguro sem o tema do app).
const CORES_TEXTO_CLASSIFICACAO = {
  EXCELENTE: 'statusText.positive',
  BOM: 'primary.main',
  REGULAR: 'statusText.warning',
  CRITICO: 'statusText.negative',
}

function ComponenteBar({ nome, pontos, descricao, cor }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" sx={{ fontSize: 11 }}>{nome}</Typography>
        <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11, fontFamily: mono }}>
          {pontos}/25
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(pontos / 25) * 100}
        sx={{
          height: 6,
          borderRadius: 3,
          '& .MuiLinearProgress-bar': { backgroundColor: cor },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
        {descricao}
      </Typography>
    </Box>
  )
}

const ScoreSaudeCard = () => {
  const theme = useTheme()
  const { data, loading, error } = useScoreSaude()

  if (loading) {
    return (
      <Box data-testid="score-loading">
        <Skeleton variant="circular" width={118} height={118} sx={{ mx: 'auto', mb: 2 }} />
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

  const cores = corPorClassificacao(theme)
  const cor = cores[data.classificacao] || cores.REGULAR
  const corTexto = CORES_TEXTO_CLASSIFICACAO[data.classificacao] || CORES_TEXTO_CLASSIFICACAO.REGULAR

  const componentes = [
    data.taxaPoupanca,
    data.coberturaEmergencia,
    data.diversificacao,
    data.tendencia,
  ].filter(Boolean)

  return (
    <Box>
      {/* Sem rotulo interno: a secao do dashboard ja titula "Saude financeira"
          logo acima do painel — repetir aqui seria ruido visual. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
        <RingGauge value={data.score} size={118} stroke={10} color={cor}>
          <Typography sx={{ fontFamily: mono, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
            {data.score}
          </Typography>
          <Typography variant="caption" sx={{ color: corTexto, fontWeight: 600, fontSize: 10, mt: 0.25 }}>
            {data.classificacao}
          </Typography>
        </RingGauge>
      </Box>

      <Box>
        {componentes.map((c) => (
          <ComponenteBar key={c.nome} nome={c.nome} pontos={c.pontos} descricao={c.descricao} cor={cor} />
        ))}
      </Box>
    </Box>
  )
}

export default ScoreSaudeCard
