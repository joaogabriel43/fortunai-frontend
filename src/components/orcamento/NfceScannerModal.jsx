import React, { useState } from 'react'
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle, FormControlLabel,
  IconButton, LinearProgress, Switch, TextField, Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import { useTheme, alpha } from '@mui/material/styles'
import api from '../../services/api'
import { formatarDataLocal } from '../../utils/dateUtils'

// ── Cores por categoria de item NFC-e ────────────────────────────────────────

// Taxonomia fixa do parser de NFC-e (nao e dado do usuario). As 9 categorias
// precisam continuar DISTINGUIVEIS entre si, entao o mapa usa as 5 cores da
// serie do tema mais 4 hues semanticas — nenhuma se repete.
const corCategoria = (t) => ({
  Alimentação: t.palette.series[0],
  Higiene:     t.palette.series[1],
  Limpeza:     t.palette.warning.main,
  Pet:         t.palette.series[4],
  Bebidas:     t.palette.error.main,
  Eletrônicos: t.palette.info.main,
  Vestuário:   t.palette.secondary.main,
  Saúde:       t.palette.series[3],
  Outros:      t.palette.text.secondary,
})

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Modal de escaneamento de NFC-e em 3 steps:
 *   Step 1: URL input → POST /api/orcamento/nfce/preview
 *   Step 2: Preview dos itens com seleção + toggle
 *   Step 3: Confirmação após POST /api/orcamento/nfce/importar
 *
 * @param {boolean}  open      - controla visibilidade do Dialog
 * @param {function} onClose   - callback ao fechar
 * @param {function} onSuccess - callback após importação bem-sucedida
 */
const NfceScannerModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme()
  const COR_CATEGORIA = corCategoria(theme)
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)
  const [erro, setErro] = useState(null)
  const [nfce, setNfce] = useState(null)
  const [selecionados, setSelecionados] = useState([])
  const [importarSeparados, setImportarSeparados] = useState(false)
  const [totalImportado, setTotalImportado] = useState(0)

  const resetar = () => {
    setStep(1); setUrl(''); setLoading(false); setLoadingImport(false)
    setErro(null); setNfce(null); setSelecionados([])
    setImportarSeparados(false); setTotalImportado(0)
  }

  const handleClose = () => {
    resetar()
    onClose()
  }

  // ── STEP 1: Analisar URL ─────────────────────────────────────────────────

  const handleAnalisar = async () => {
    setErro(null)
    setLoading(true)
    try {
      const res = await api.post('/orcamento/nfce/preview', { url })
      const dto = res.data
      setNfce(dto)
      // Pré-selecionar todos os itens
      setSelecionados(dto.itens.map((_, i) => i))
      setStep(2)
    } catch (e) {
      const msg =
        e?.response?.data?.mensagem ||
        e?.response?.data?.message ||
        (e?.response?.status === 503
          ? 'Serviço da Receita Federal temporariamente indisponível. Tente novamente.'
          : 'URL não reconhecida como NF-e válida. Verifique o link e tente novamente.')
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2: Importar seleção ──────────────────────────────────────────────

  const toggleItem = (idx) => {
    setSelecionados((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  const totalSelecionado = nfce?.itens
    .filter((_, i) => selecionados.includes(i))
    .reduce((sum, item) => sum + (item.valorTotal ?? 0), 0) ?? 0

  const handleImportar = async () => {
    setErro(null)
    setLoadingImport(true)
    try {
      const res = await api.post('/orcamento/nfce/importar', {
        url,
        importarItensSeparados: importarSeparados,
        indicesItensSelecionados: selecionados,
      })
      const transacoes = res.data ?? []
      setTotalImportado(transacoes.length)
      setStep(3)
    } catch (e) {
      const msg =
        e?.response?.data?.mensagem ||
        e?.response?.data?.message ||
        'Não foi possível importar as transações. Tente novamente.'
      setErro(msg)
    } finally {
      setLoadingImport(false)
    }
  }

  // ── Render por Step ───────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}
    >
      {/* Cabeçalho */}
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScannerIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700}>
            {step === 1 && 'Escanear NF-e'}
            {step === 2 && 'Itens da Nota Fiscal'}
            {step === 3 && 'Importação concluída'}
          </Typography>
        </Box>
        <IconButton size="small" aria-label="fechar" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>

        {/* ── STEP 1 ──────────────────────────────────────────────────────── */}
        {step === 1 && (
          <Box>
            <TextField
              label="URL da Nota Fiscal Eletrônica"
              fullWidth
              value={url}
              onChange={(e) => { setUrl(e.target.value); setErro(null) }}
              placeholder="Cole a URL da NF-e aqui..."
              helperText="Aponte a câmera para o QR code da nota, copie o link e cole aqui"
              size="small"
              sx={{ mb: 2 }}
              inputProps={{ 'aria-label': 'URL da Nota Fiscal Eletrônica' }}
            />

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {erro && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {erro}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" onClick={handleClose} color="inherit">
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleAnalisar}
                disabled={!url.trim() || loading}
                sx={{ fontWeight: 700 }}
              >
                Analisar NF-e
              </Button>
            </Box>
          </Box>
        )}

        {/* ── STEP 2 ──────────────────────────────────────────────────────── */}
        {step === 2 && nfce && (
          <Box>
            {/* Header da nota */}
            <Box sx={(t) => ({ mb: 2, p: 1.5, borderRadius: 2, bgcolor: t.palette.surfaces.surfaceSoft })}>
              <Typography variant="subtitle1" fontWeight={700}>{nfce.estabelecimento}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatarDataLocal(nfce.dataEmissao)} · Total: {formatBRL(nfce.valorTotal)}
              </Typography>
            </Box>

            {/* Lista de itens */}
            <Box sx={{ maxHeight: 280, overflowY: 'auto', mb: 2 }}>
              {nfce.itens.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.75,
                    borderBottom: `1px solid ${theme.palette.lines.subtle}`,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selecionados.includes(idx)}
                        onChange={() => toggleItem(idx)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {item.descricao}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.quantidade}× {formatBRL(item.valorUnitario)}
                        </Typography>
                      </Box>
                    }
                    sx={{ mr: 0, flex: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Chip
                      label={item.categoria}
                      size="small"
                      sx={{
                        bgcolor: alpha(COR_CATEGORIA[item.categoria] ?? theme.palette.text.secondary, 0.13),
                        color: COR_CATEGORIA[item.categoria] ?? theme.palette.text.secondary,
                        fontWeight: 600,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 60, textAlign: 'right' }}>
                      {formatBRL(item.valorTotal)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Toggle + resumo */}
            <FormControlLabel
              control={
                <Switch
                  checked={importarSeparados}
                  onChange={(e) => setImportarSeparados(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">Importar como itens separados</Typography>
              }
              sx={{ mb: 1.5 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selecionados.length} {selecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}{' '}
              · {formatBRL(totalSelecionado)}
            </Typography>

            {erro && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{erro}</Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Button variant="outlined" onClick={() => { setStep(1); setErro(null) }} color="inherit">
                Voltar
              </Button>
              <Button
                variant="contained"
                onClick={handleImportar}
                disabled={selecionados.length === 0 || loadingImport}
                sx={{ fontWeight: 700 }}
                startIcon={loadingImport ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {loadingImport ? 'Importando...' : 'Importar'}
              </Button>
            </Box>
          </Box>
        )}

        {/* ── STEP 3 ──────────────────────────────────────────────────────── */}
        {step === 3 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              {totalImportado === 1
                ? '1 transação importada com sucesso!'
                : `${totalImportado} transações importadas com sucesso!`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              As transações já aparecem no seu orçamento.
            </Typography>
            <Button
              variant="contained"
              onClick={() => { onSuccess?.(); handleClose() }}
              sx={{ fontWeight: 700 }}
            >
              Ver no orçamento
            </Button>
          </Box>
        )}

      </DialogContent>
    </Dialog>
  )
}

export default NfceScannerModal
