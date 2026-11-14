import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Link as RouterLink } from 'react-router-dom'
import { assinaturaService, STATUS } from '../services/assinaturaService'

// Retorno do Mercado Pago (back_url). Os query params que o MP anexa à URL
// (`status`, `collection_status`...) são ignorados de propósito: qualquer um pode
// digitá-los. Quem diz se o pagamento entrou é o backend (ADR-073).
// TODO(ADR-073 B5): confirmar o caminho do back_url configurado no backend (aqui /plano/retorno).

export const INTERVALO_CONSULTA_MS = 5000
export const MAX_CONSULTAS_AUTOMATICAS = 6

const fase = (assinatura) => {
  if (assinatura?.status === STATUS.ATIVA) return 'aprovado'
  if (assinatura?.status === STATUS.PENDENTE) return 'pendente'
  return 'recusado'
}

const CONTEUDO = {
  aprovado: {
    Icone: CheckCircleOutlineIcon,
    cor: 'success.main',
    titulo: 'Pagamento aprovado',
    texto: 'Seu Premium está ativo. Bom proveito!',
  },
  pendente: {
    Icone: HourglassTopIcon,
    cor: 'statusText.warning',
    titulo: 'Estamos confirmando seu pagamento',
    texto: 'Isso costuma levar poucos instantes (Pix e cartão podem demorar um pouco mais). Esta página consulta de novo sozinha.',
  },
  recusado: {
    Icone: ErrorOutlineIcon,
    cor: 'statusText.negative',
    titulo: 'Pagamento não aprovado',
    texto: 'Não identificamos um pagamento aprovado. Nenhum valor foi liberado para o Premium; você pode tentar de novo.',
  },
}

export default function CheckoutRetorno() {
  const [assinatura, setAssinatura] = useState(undefined)
  const [erro, setErro] = useState(false)
  const [consultando, setConsultando] = useState(true)
  const [tentativas, setTentativas] = useState(0)
  const ativo = useRef(true)

  const consultar = useCallback(async () => {
    setConsultando(true)
    try {
      const dados = await assinaturaService.status()
      if (!ativo.current) return
      setAssinatura(dados)
      setErro(false)
    } catch {
      if (ativo.current) setErro(true)
    } finally {
      if (ativo.current) {
        setConsultando(false)
        setTentativas((n) => n + 1)
      }
    }
  }, [])

  useEffect(() => {
    ativo.current = true
    consultar()
    return () => { ativo.current = false }
  }, [consultar])

  const atual = erro ? null : fase(assinatura)
  const esgotou = tentativas >= MAX_CONSULTAS_AUTOMATICAS

  // Pendente: nova consulta a cada INTERVALO_CONSULTA_MS, até o limite.
  // `tentativas` nas dependências: com resposta rápida o React junta
  // consultando true→false num render só e o efeito não rodaria de novo.
  useEffect(() => {
    if (atual !== 'pendente' || consultando || esgotou) return undefined
    const id = setTimeout(consultar, INTERVALO_CONSULTA_MS)
    return () => clearTimeout(id)
  }, [atual, consultando, esgotou, tentativas, consultar])

  const carregandoPrimeira = assinatura === undefined && !erro

  return (
    <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto', px: '16px', py: { xs: '40px', md: '72px' } }}>
      <Box
        aria-live="polite"
        aria-busy={consultando}
        sx={(t) => ({
          textAlign: 'center',
          borderRadius: `${t.radius.lg}px`,
          border: `1px solid ${t.palette.lines.subtle}`,
          backgroundColor: t.palette.surfaces.surface,
          px: { xs: '20px', md: '36px' },
          py: { xs: '28px', md: '40px' },
        })}
      >
        {carregandoPrimeira ? (
          <>
            <CircularProgress size={32} />
            <Typography sx={{ mt: '16px', color: 'text.secondary' }}>Consultando seu pagamento…</Typography>
          </>
        ) : erro ? (
          <>
            <ErrorOutlineIcon sx={{ fontSize: 44, color: 'statusText.negative' }} />
            <Typography component="h1" sx={{ mt: '12px', fontSize: 22, fontWeight: 700 }}>
              Não conseguimos consultar o pagamento
            </Typography>
            <Typography sx={{ mt: '8px', color: 'text.secondary' }}>
              Verifique sua conexão e consulte de novo. Se o pagamento foi feito, ele não se perde.
            </Typography>
            <Button variant="contained" onClick={consultar} disabled={consultando} sx={{ mt: '24px', textTransform: 'none' }}>
              Consultar novamente
            </Button>
          </>
        ) : (
          <Conteudo
            fase={atual}
            consultando={consultando}
            esgotou={esgotou}
            onConsultar={consultar}
          />
        )}
      </Box>
    </Box>
  )
}

function Conteudo({ fase: f, consultando, esgotou, onConsultar }) {
  const { Icone, cor, titulo, texto } = CONTEUDO[f]
  return (
    <>
      <Icone sx={{ fontSize: 44, color: cor }} />
      <Typography component="h1" sx={{ mt: '12px', fontSize: 22, fontWeight: 700 }}>{titulo}</Typography>
      <Typography sx={{ mt: '8px', color: 'text.secondary' }}>
        {f === 'pendente' && esgotou
          ? 'A confirmação está demorando mais que o normal. Você pode consultar de novo agora ou voltar mais tarde: assim que o pagamento for confirmado, o Premium é liberado.'
          : texto}
      </Typography>
      <Box sx={{ mt: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {f === 'aprovado' && (
          <Button variant="contained" component={RouterLink} to="/dashboard" sx={{ textTransform: 'none' }}>
            Ir para o painel
          </Button>
        )}
        {f === 'pendente' && (
          <Button
            variant="contained"
            onClick={onConsultar}
            disabled={consultando}
            startIcon={consultando ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            Consultar novamente
          </Button>
        )}
        {f === 'recusado' && (
          <Button variant="contained" component={RouterLink} to="/plano" sx={{ textTransform: 'none' }}>
            Tentar novamente
          </Button>
        )}
        {f !== 'aprovado' && (
          <Button variant="text" component={RouterLink} to="/configuracoes" sx={{ textTransform: 'none' }}>
            Ver minha assinatura
          </Button>
        )}
      </Box>
    </>
  )
}
