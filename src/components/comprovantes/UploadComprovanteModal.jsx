import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Alert, Chip,
} from '@mui/material'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const UploadComprovanteModal = ({ open, onClose, file }) => {
  const { user } = useAuth()
  const [extractedData, setExtractedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const isImage = file && file.type.startsWith('image/')

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/comprovantes/extrair', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setExtractedData(res.data)
    } catch {
      setError('Falha ao extrair dados do comprovante.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!extractedData || !user?.id) return
    setSaving(true)
    setError(null)
    try {
      await api.post(`/orcamento/transacao/${user.id}`, {
        descricao: extractedData.descricao,
        valor: extractedData.valor,
        categoria: extractedData.categoria,
        tipo: extractedData.tipo,
        data: extractedData.dataTransacao,
      })
      setSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch {
      setError('Falha ao salvar transacao.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setExtractedData(null)
    setLoading(false)
    setSaving(false)
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Extrair Comprovante</DialogTitle>
      <DialogContent>
        {file && (
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            {isImage ? (
              <Box
                component="img"
                src={URL.createObjectURL(file)}
                alt="Preview"
                sx={{ maxHeight: 200, maxWidth: '100%', borderRadius: 1 }}
              />
            ) : (
              <PictureAsPdfIcon sx={{ fontSize: 64, color: 'error.main' }} />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {file.name}
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Transacao salva com sucesso!</Alert>}

        {loading && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>Extraindo dados...</Typography>
          </Box>
        )}

        {extractedData && !loading && (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Dados extraidos:</Typography>
            <Typography variant="body2">Valor: {formatBRL(extractedData.valor)}</Typography>
            <Typography variant="body2">Descricao: {extractedData.descricao}</Typography>
            <Typography variant="body2">Categoria: {extractedData.categoria}</Typography>
            <Typography variant="body2">Tipo: {extractedData.tipo}</Typography>
            <Typography variant="body2">Data: {extractedData.dataTransacao}</Typography>
            <Chip
              label={`Confianca: ${extractedData.confianca}`}
              size="small"
              color={extractedData.confianca === 'ALTA' ? 'success' : extractedData.confianca === 'MEDIA' ? 'warning' : 'error'}
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        {!extractedData && !loading && (
          <Button variant="contained" onClick={handleExtract} disabled={!file}>
            Extrair Dados
          </Button>
        )}
        {extractedData && !loading && !success && (
          <Button variant="contained" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Salvando...' : 'Confirmar e Salvar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default UploadComprovanteModal
