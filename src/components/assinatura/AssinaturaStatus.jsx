import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, Skeleton, Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { assinaturaService, CICLOS, STATUS } from '../../services/assinaturaService'
import { formatarDataLocal, hojeLocal } from '../../utils/dateUtils'

const ROTULO_STATUS = {
  [STATUS.PENDENTE]: { texto: 'Aguardando pagamento', cor: 'warning' },
  [STATUS.ATIVA]: { texto: 'Ativa', cor: 'success' },
  [STATUS.EM_ATRASO]: { texto: 'Pagamento em atraso', cor: 'warning' },
  [STATUS.CANCELADA]: { texto: 'Cancelada', cor: 'default' },
  [STATUS.EXPIRADA]: { texto: 'Expirada', cor: 'default' },
  [STATUS.REEMBOLSADA]: { texto: 'Reembolsada', cor: 'default' },
}

// TODO(ADR-073 B5): confirmar se as datas chegam como LocalDate ("YYYY-MM-DD") ou com hora;
// o corte em 10 caracteres cobre os dois formatos ISO.
const dia = (valor) => (valor ? String(valor).slice(0, 10) : null)
const formatar = (valor) => formatarDataLocal(dia(valor), { day: '2-digit', month: 'long', year: 'numeric' })

function Linha({ rotulo, valor }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '16px', py: '8px' }}>
      <Typography variant="body2" color="text.secondary">{rotulo}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{valor}</Typography>
    </Box>
  )
}

/** Corpo da seção "Assinatura" de Configurações > Conta (ADR-073, Fase C). */
export default function AssinaturaStatus({ onSuccess }) {
  const [assinatura, setAssinatura] = useState(undefined)
  const [erro, setErro] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [reembolso, setReembolso] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [erroCancelar, setErroCancelar] = useState(null)

  const carregar = useCallback(async () => {
    setErro(false)
    try {
      setAssinatura(await assinaturaService.status())
    } catch {
      setErro(true)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (erro) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={carregar}>Tentar de novo</Button>}>
        Não foi possível carregar sua assinatura.
      </Alert>
    )
  }

  if (assinatura === undefined) {
    return <Skeleton variant="rounded" height={96} aria-label="Carregando assinatura" />
  }

  if (!assinatura) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: '16px' }}>
          Você está no plano Gratuito. Assine o Premium para liberar todos os recursos.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/plano" sx={{ textTransform: 'none' }}>
          Ver planos
        </Button>
      </Box>
    )
  }

  const { status, ciclo, acessoAte, proximaCobrancaEm, reembolsoDisponivelAte, cancelavel } = assinatura
  const rotulo = ROTULO_STATUS[status] ?? { texto: status, cor: 'default' }
  const podeReembolsar = Boolean(dia(reembolsoDisponivelAte)) && dia(reembolsoDisponivelAte) >= hojeLocal()
  const mensal = ciclo === CICLOS.MENSAL

  const abrirDialog = () => {
    setReembolso(false)
    setErroCancelar(null)
    setDialogAberto(true)
  }

  const confirmarCancelamento = async () => {
    setCancelando(true)
    setErroCancelar(null)
    try {
      const comReembolso = podeReembolsar && reembolso
      await assinaturaService.cancelar(comReembolso)
      setDialogAberto(false)
      onSuccess?.(comReembolso ?'Assinatura cancelada. O reembolso foi solicitado.' : 'Assinatura cancelada.')
      await carregar()
    } catch {
      setErroCancelar('Não foi possível cancelar agora. Tente novamente.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', mb: '8px' }}>
        <Typography sx={{ fontWeight: 700 }}>Premium {mensal ? 'mensal' : 'anual'}</Typography>
        <Chip size="small" label={rotulo.texto} color={rotulo.cor} variant="outlined" />
      </Box>

      <Box sx={(t) => ({ borderTop: `1px solid ${t.palette.lines.subtle}`, mt: '8px' })}>
        {proximaCobrancaEm && <Linha rotulo="Próxima cobrança" valor={formatar(proximaCobrancaEm)} />}
        {acessoAte && <Linha rotulo="Acesso até" valor={formatar(acessoAte)} />}
      </Box>

      {/* TODO(ADR-073 B5): confirmar o nome do campo de reembolso pendente. */}
      {assinatura.reembolsoEmProcessamento && (
        <Alert severity="info" sx={{ mt: '12px' }}>
          Reembolso em processamento. O valor volta pelo mesmo meio de pagamento.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: '16px', maxWidth: 620 }}>
        Direito de arrependimento: em até 7 dias da contratação você pode cancelar e receber
        o valor de volta (Código de Defesa do Consumidor, art. 49). Nesse caso o acesso
        Premium termina na hora.
      </Typography>

      {cancelavel && (
        <Button variant="outlined" color="error" onClick={abrirDialog} sx={{ mt: '16px', textTransform: 'none' }}>
          Cancelar assinatura
        </Button>
      )}

      <Dialog open={dialogAberto} onClose={() => !cancelando && setDialogAberto(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="span">Cancelar assinatura?</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {mensal
              ? `As cobranças param. Você mantém o Premium até ${formatar(acessoAte)}.`
              : `A assinatura não será renovada. Você mantém o Premium até ${formatar(acessoAte)}.`}
          </Typography>
          {podeReembolsar && (
            <FormControlLabel
              sx={{ mt: '12px', alignItems: 'flex-start' }}
              control={<Checkbox checked={reembolso} onChange={(e) => setReembolso(e.target.checked)} sx={{ mt: '-6px' }} />}
              label={
                <Typography variant="body2">
                  Quero exercer o direito de arrependimento e receber o reembolso
                  (disponível até {formatar(reembolsoDisponivelAte)}). O acesso Premium termina agora.
                </Typography>
              }
            />
          )}
          {erroCancelar && <Alert severity="error" role="alert" sx={{ mt: '12px' }}>{erroCancelar}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAberto(false)} disabled={cancelando} sx={{ textTransform: 'none' }}>
            Manter assinatura
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmarCancelamento}
            disabled={cancelando}
            startIcon={cancelando ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            Confirmar cancelamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
