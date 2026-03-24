import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, TextField, Button, MenuItem,
  LinearProgress, IconButton, Chip, CircularProgress, Alert,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useMetas } from '../hooks/useMetas'

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const TIPO_OPTIONS = [
  { value: 'POUPANCA', label: 'Poupanca' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
  { value: 'LIVRE', label: 'Livre' },
]

const TIPO_COLORS = {
  POUPANCA: 'primary',
  INVESTIMENTO: 'secondary',
  EMERGENCIA: 'error',
  LIVRE: 'default',
}

const Metas = () => {
  const { metas, loading, error, criarMeta, excluirMeta } = useMetas()
  const [form, setForm] = useState({ titulo: '', valorAlvo: '', prazo: '', tipo: 'LIVRE' })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo || !form.valorAlvo || !form.prazo) return
    setSubmitting(true)
    try {
      await criarMeta({
        titulo: form.titulo,
        valorAlvo: parseFloat(form.valorAlvo),
        prazo: form.prazo,
        tipo: form.tipo,
      })
      setForm({ titulo: '', valorAlvo: '', prazo: '', tipo: 'LIVRE' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (metaId) => {
    await excluirMeta(metaId)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Metas Financeiras
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Nova Meta
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField
              label="Titulo"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              size="small"
              required
              sx={{ minWidth: 200, flex: 1 }}
            />
            <TextField
              label="Valor Alvo (R$)"
              name="valorAlvo"
              type="number"
              value={form.valorAlvo}
              onChange={handleChange}
              size="small"
              required
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Prazo"
              name="prazo"
              type="date"
              value={form.prazo}
              onChange={handleChange}
              size="small"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Tipo"
              name="tipo"
              select
              value={form.tipo}
              onChange={handleChange}
              size="small"
              sx={{ minWidth: 140 }}
            >
              {TIPO_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar Meta'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {metas.map((meta) => (
          <Grid key={meta.id} size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>{meta.titulo}</Typography>
                    <Chip label={meta.tipo} size="small" color={TIPO_COLORS[meta.tipo] || 'default'} sx={{ mt: 0.5 }} />
                  </Box>
                  <IconButton onClick={() => handleDelete(meta.id)} size="small" aria-label="excluir meta">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                  {formatBRL(meta.valorAlvo)}
                </Typography>

                <Box sx={{ mt: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">Progresso</Typography>
                    <Typography variant="caption" fontWeight={600}>{meta.progresso}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(meta.progresso, 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Faltam: {formatBRL(meta.valorFaltante)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prazo: {meta.prazo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Previsao: {meta.previsaoConclusao}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {metas.length === 0 && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          Nenhuma meta cadastrada. Crie sua primeira meta acima!
        </Typography>
      )}
    </Box>
  )
}

export default Metas
