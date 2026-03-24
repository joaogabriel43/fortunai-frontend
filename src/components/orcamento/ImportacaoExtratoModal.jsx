import React, { useState, useRef } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Checkbox, FormControlLabel, Paper,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useExtratoImportacao } from '../../hooks/useExtratoImportacao'

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const ImportacaoExtratoModal = ({ open, onClose, onImported }) => {
  const { preview, loading, confirming, error, resultado, analisarExtrato, confirmarImportacao, resetar } = useExtratoImportacao()
  const [file, setFile] = useState(null)
  const [ignorarDuplicatas, setIgnorarDuplicatas] = useState(true)
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleClose = () => {
    setFile(null)
    setIgnorarDuplicatas(true)
    setDragOver(false)
    resetar()
    onClose()
  }

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return
    const name = selectedFile.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.ofx')) {
      return
    }
    setFile(selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    handleFileSelect(droppedFile)
  }

  const handleAnalisar = () => {
    if (file) analisarExtrato(file)
  }

  const handleConfirmar = () => {
    if (!preview) return
    const transacoes = ignorarDuplicatas
      ? preview.transacoes.filter(t => !t.isDuplicata)
      : preview.transacoes
    confirmarImportacao(transacoes)
  }

  const handleVerOrcamento = () => {
    handleClose()
    if (onImported) onImported()
  }

  const transacoesParaImportar = preview
    ? (ignorarDuplicatas ? preview.transacoes.filter(t => !t.isDuplicata) : preview.transacoes)
    : []

  // STEP 3: Sucesso
  if (resultado) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Importação Concluída</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6">
              {resultado.totalImportadas} transações importadas com sucesso!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Fechar</Button>
          <Button variant="contained" onClick={handleVerOrcamento}>
            Ver no Orçamento
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // STEP 2: Preview
  if (preview) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Preview do Extrato</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`${preview.totalTransacoes} transações encontradas`} color="primary" />
            <Chip label={`${preview.totalDuplicatas} duplicatas`}
                  color={preview.totalDuplicatas > 0 ? 'warning' : 'default'} />
            <Chip label={`${preview.totalValidas} novas`} color="success" />
          </Box>

          {preview.totalDuplicatas > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={ignorarDuplicatas}
                  onChange={(e) => setIgnorarDuplicatas(e.target.checked)}
                />
              }
              label="Ignorar duplicatas"
              sx={{ mb: 2 }}
            />
          )}

          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.transacoes.map((t, i) => (
                  <TableRow
                    key={i}
                    sx={t.isDuplicata ? { bgcolor: 'rgba(255, 167, 38, 0.12)' } : {}}
                  >
                    <TableCell>{t.data}</TableCell>
                    <TableCell>{t.descricao}</TableCell>
                    <TableCell align="right">{formatBRL(t.valor)}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.tipo === 'CREDIT' ? 'Entrada' : 'Saída'}
                        size="small"
                        color={t.tipo === 'CREDIT' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      {t.isDuplicata && <Chip label="Duplicata" size="small" color="warning" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmar}
            disabled={confirming || transacoesParaImportar.length === 0}
          >
            {confirming ? 'Importando...' : `Importar ${transacoesParaImportar.length} transações`}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // STEP 1: Upload
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar Extrato Bancário</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>Analisando arquivo...</Typography>
          </Box>
        ) : (
          <Box
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragOver ? 'rgba(124, 106, 247, 0.08)' : 'transparent',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(124, 106, 247, 0.04)' },
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.ofx"
              hidden
              data-testid="file-input"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
            <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1">
              {file ? file.name : 'Arraste um arquivo CSV ou OFX aqui'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ou clique para selecionar
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleAnalisar}
          disabled={!file || loading}
        >
          Analisar Extrato
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportacaoExtratoModal
