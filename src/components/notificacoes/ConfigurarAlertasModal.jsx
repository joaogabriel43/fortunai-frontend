import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Slider, Typography, Box, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Divider, Tab, Tabs,
  CircularProgress, Alert
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import api from '../../services/api'

/**
 * Modal para criar e gerenciar alertas configuráveis.
 * Suporta AlertaPreco e AlertaGasto.
 */
export default function ConfigurarAlertasModal({ open, onClose }) {
  const [tab, setTab] = useState(0)
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Formulário AlertaPreco
  const [ticker, setTicker] = useState('')
  const [precoAlvo, setPrecoAlvo] = useState('')
  const [direcao, setDirecao] = useState('ABAIXO')

  // Formulário AlertaGasto
  const [percentualLimite, setPercentualLimite] = useState(80)
  const [categoria, setCategoria] = useState('')
  const [mesReferencia, setMesReferencia] = useState('')

  const carregarAlertas = useCallback(async () => {
    try {
      const res = await api.get('/alertas')
      setAlertas(res.data ?? [])
    } catch {
      // ignora falha de carregamento
    }
  }, [])

  useEffect(() => {
    if (open) carregarAlertas()
  }, [open, carregarAlertas])

  const criarAlertaPreco = async () => {
    setError(null)
    if (!ticker.trim() || !precoAlvo) {
      setError('Ticker e preço alvo são obrigatórios.')
      return
    }
    setLoading(true)
    try {
      await api.post('/alertas/preco', {
        ticker: ticker.toUpperCase().trim(),
        precoAlvo: parseFloat(precoAlvo),
        direcao,
      })
      setSuccess('Alerta de preço criado!')
      setTicker('')
      setPrecoAlvo('')
      setDirecao('ABAIXO')
      await carregarAlertas()
    } catch (e) {
      setError(e.response?.data?.fields?.ticker || e.response?.data?.fields?.precoAlvo || 'Erro ao criar alerta.')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const criarAlertaGasto = async () => {
    setError(null)
    if (!categoria.trim()) {
      setError('Categoria é obrigatória.')
      return
    }
    setLoading(true)
    try {
      await api.post('/alertas/gasto', {
        percentualLimite,
        categoria: categoria.trim(),
        mesReferencia: mesReferencia || null,
      })
      setSuccess('Alerta de gasto criado!')
      setCategoria('')
      setMesReferencia('')
      await carregarAlertas()
    } catch {
      setError('Erro ao criar alerta de gasto.')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const deletarAlerta = async (id) => {
    try {
      await api.delete(`/alertas/${id}`)
      setAlertas(prev => prev.filter(a => a.id !== id))
    } catch {
      setError('Erro ao deletar alerta.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a1a24', color: 'text.primary' } }}>
      <DialogTitle>Configurar Alertas</DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Alerta de Preço" />
          <Tab label="Alerta de Gasto" />
          <Tab label="Meus Alertas" />
        </Tabs>

        {/* ── Alerta de Preço ── */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Ticker" value={ticker}
              onChange={e => setTicker(e.target.value)}
              placeholder="Ex: PETR4"
              fullWidth size="small"
            />
            <TextField
              label="Preço Alvo (R$)" value={precoAlvo}
              onChange={e => setPrecoAlvo(e.target.value)}
              type="number" inputProps={{ min: 0, step: '0.01' }}
              fullWidth size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Direção</InputLabel>
              <Select value={direcao} label="Direção" onChange={e => setDirecao(e.target.value)}>
                <MenuItem value="ABAIXO">Abaixo ou igual</MenuItem>
                <MenuItem value="ACIMA">Acima ou igual</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={criarAlertaPreco} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Criar Alerta de Preço'}
            </Button>
          </Box>
        )}

        {/* ── Alerta de Gasto ── */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" gutterBottom>
                Percentual limite: <strong>{percentualLimite}%</strong>
              </Typography>
              <Slider
                value={percentualLimite}
                onChange={(_, v) => setPercentualLimite(v)}
                min={10} max={100} step={5}
                marks={[{ value: 50, label: '50%' }, { value: 80, label: '80%' }]}
              />
            </Box>
            <TextField
              label="Categoria" value={categoria}
              onChange={e => setCategoria(e.target.value)}
              placeholder="Ex: Alimentação"
              fullWidth size="small"
            />
            <TextField
              label="Mês de referência (opcional)" value={mesReferencia}
              onChange={e => setMesReferencia(e.target.value)}
              placeholder="YYYY-MM  (vazio = mês atual)"
              fullWidth size="small"
            />
            <Button variant="contained" onClick={criarAlertaGasto} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Criar Alerta de Gasto'}
            </Button>
          </Box>
        )}

        {/* ── Lista de alertas ativos ── */}
        {tab === 2 && (
          alertas.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Nenhum alerta ativo.
            </Typography>
          ) : (
            <List dense>
              {alertas.map((a) => (
                <React.Fragment key={a.id}>
                  <ListItem>
                    <ListItemText
                      primary={a.titulo}
                      secondary={`${a.tipo} — ${a.status}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => deletarAlerta(a.id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
