import React from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { useDividendos } from '../../hooks/useDividendos'
import { formatarDataLocal, prefixoMesCorrente } from '../../utils/dateUtils'

// `?? 0` aqui afirmaria "R$ 0,00 recebido" quando na verdade a fonte nao
// informou o agregado. Ausencia de dado e travessao; zero financeiro real
// continua sendo zero.
const formatBRL = (value) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

// Todo valor monetario comparavel usa a mono do design system.
const mono = (t) => t.typography.fontFamilyMono

const formatDate = (dateStr) =>
  dateStr
    ? formatarDataLocal(dateStr)
    : '—'

/** Cores e labels dos tipos de provento. */
const TIPO_CONFIG = {
  DIVIDENDO: { label: 'Dividendo', color: 'success' },
  JCP: { label: 'JCP', color: 'info' },
  RENDIMENTO: { label: 'Rendimento', color: 'warning' },
}

/**
 * Card de Dividendos e Proventos para o Dashboard.
 *
 * - Seção "Recebidos este mês": proventos com pago=true e dataPagamento no mês atual
 * - Seção "Provisionados": proventos com pago=false
 * - Destaque do total do mês no topo
 * - Chip colorido por tipo (DIVIDENDO=verde, JCP=azul, RENDIMENTO=amarelo)
 */
export default function DividendosCard() {
  const { loading, error, proventos, resumo } = useDividendos()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <CalendarMonthIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.5 }} />
        <Typography variant="body2" color="statusText.negative" mt={1}>
          {error}
        </Typography>
      </Box>
    )
  }

  const prefixoMes = prefixoMesCorrente()

  const recebidosMes = proventos.filter(
    (p) => p.pago && p.dataPagamento?.startsWith(prefixoMes),
  )

  const provisionados = proventos.filter((p) => !p.pago)

  const isEmpty = recebidosMes.length === 0 && provisionados.length === 0

  return (
    <Box>
      {/* Sem agregado próprio no cabeçalho, de propósito: o único valor por
          provento no contrato é `valorPorCota`, e somar valor POR COTA de
          tickers diferentes não produz um total em reais — seria inventar um
          número. Os únicos agregados exibidos são os do backend, no rodapé.
          O título da seção também vive no Dashboard (SectionHead "Proventos"). */}
      {isEmpty ? (
        <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
          <CalendarMonthIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2" mt={1}>
            Nenhum provento registrado ainda
          </Typography>
          <Typography variant="caption">
            Registre dividendos e rendimentos via chat
          </Typography>
        </Box>
      ) : (
        <>
          {/* Provisionados */}
          {provisionados.length > 0 && (
            <Box mb={2}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}
              >
                Provisionados
              </Typography>
              <List dense disablePadding>
                {provisionados.map((p) => (
                  <ProventoItem key={p.id} provento={p} />
                ))}
              </List>
            </Box>
          )}

          {provisionados.length > 0 && recebidosMes.length > 0 && (
            <Divider sx={{ my: 1.5 }} />
          )}

          {/* Recebidos este mês */}
          {recebidosMes.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}
              >
                Recebidos este mês
              </Typography>
              <List dense disablePadding>
                {recebidosMes.map((p) => (
                  <ProventoItem key={p.id} provento={p} />
                ))}
              </List>
            </Box>
          )}
        </>
      )}

      {/* Rodapé: totais gerais */}
      {!isEmpty && (
        <Box
          sx={{
            mt: 2,
            pt: 1.5,
            borderTop: (t) => `1px solid ${t.palette.lines.subtle}`,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total recebido
            </Typography>
            <Typography variant="body2" fontWeight={600} color="statusText.positive" sx={(t) => ({ fontFamily: mono(t) })}>
              {formatBRL(resumo.totalPago)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              A receber
            </Typography>
            <Typography variant="body2" fontWeight={600} color="statusText.warning" sx={(t) => ({ fontFamily: mono(t) })}>
              {formatBRL(resumo.totalProvisionado)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}

/** Item individual de provento na lista. */
function ProventoItem({ provento }) {
  const config = TIPO_CONFIG[provento.tipo] ?? { label: provento.tipo, color: 'default' }
  return (
    <ListItem disableGutters sx={{ py: 0.5 }}>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {provento.ticker}
            </Typography>
            <Chip
              label={config.label}
              color={config.color}
              size="small"
              sx={{ height: 18, fontSize: 10, fontWeight: 600 }}
            />
          </Box>
        }
        secondary={`Pgto: ${formatDate(provento.dataPagamento)}`}
      />
      {/* Rotulado explicitamente: o contrato entrega valor POR COTA, nao o
          total recebido. Sem a unidade o numero seria lido como reais totais. */}
      <Box sx={{ ml: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Typography variant="body2" fontWeight={600} sx={(t) => ({ fontFamily: mono(t) })}>
          {formatBRL(provento.valorPorCota)}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.secondary', fontSize: 10, lineHeight: 1.2 }}
        >
          por cota
        </Typography>
      </Box>
    </ListItem>
  )
}
