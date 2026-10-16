import React, { useState } from 'react'
import {
  Box, Button, Checkbox, CircularProgress, Dialog, DialogContent,
  DialogTitle, FormControlLabel, Link, Typography,
} from '@mui/material'
import GavelIcon from '@mui/icons-material/Gavel'
import api from '../services/api'
import { alpha } from '@mui/material/styles'

const VERSAO_TERMOS = '1.0'
const VERSAO_PRIVACIDADE = '1.0'

/**
 * Modal obrigatório de consentimento LGPD (Art. 8°).
 * Exibido quando o usuário não consentiu com a versão vigente dos Termos.
 * NÃO pode ser fechado sem aceitar — sem botão X.
 *
 * @param {boolean}  open      - controlado pelo pai (App ou AuthContext)
 * @param {function} onAceitar - chamado após POST /api/conta/consentimento com sucesso
 */
const ConsentimentoModal = ({ open, onAceitar }) => {
  const [aceito, setAceito] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  // Renderização condicional antes do Dialog — garante que conteúdo esteja
  // diretamente no React tree do teste (sem depender de Portal+jsdom)
  if (!open) return null

  const handleAceitar = async () => {
    if (!aceito) return
    setLoading(true)
    setErro(null)
    try {
      await api.post('/conta/consentimento', {
        versaoTermos: VERSAO_TERMOS,
        versaoPrivacidade: VERSAO_PRIVACIDADE,
      })
      onAceitar?.()
    } catch {
      setErro('Não foi possível registrar seu consentimento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      // Sem onClose — modal obrigatório, não pode ser fechado sem aceitar
      PaperProps={{
        sx: (t) => ({
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: `1px solid ${alpha(t.palette.primary.main, 0.3)}`,
        }),
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <GavelIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" component="span" fontWeight={700} data-testid="consentimento-titulo">
          Termos e Política atualizados
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          Atualizamos nossos <strong>Termos de Uso</strong> e{' '}
          <strong>Política de Privacidade</strong>. Para continuar usando o Pondero, leia e
          aceite os documentos atualizados.
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          <Link href="/termos" target="_blank" rel="noopener" sx={{ display: 'block', mb: 0.5 }}>
            📄 Termos de Uso — versão {VERSAO_TERMOS}
          </Link>
          <Link href="/privacidade" target="_blank" rel="noopener">
            🔒 Política de Privacidade — versão {VERSAO_PRIVACIDADE}
          </Link>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
            />
          }
          label={
            <Typography variant="body2">
              Li e aceito os{' '}
              <Link href="/termos" target="_blank" rel="noopener">Termos de Uso</Link>
              {' '}e a{' '}
              <Link href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</Link>
            </Typography>
          }
          sx={{ mb: 2, alignItems: 'flex-start' }}
        />

        {erro && (
          <Typography variant="body2" color="statusText.negative" sx={{ mb: 1.5 }}>
            {erro}
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          disabled={!aceito || loading}
          onClick={handleAceitar}
          sx={{ fontWeight: 700, py: 1.25 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Aceitar e continuar'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default ConsentimentoModal
