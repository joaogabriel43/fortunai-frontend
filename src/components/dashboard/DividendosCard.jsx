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

const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')
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
        <Typography variant="body2" color="error" mt={1}>
          {error}
        </Typography>
      </Box>
    )
  }

  const hoje = new Date()
  const mesAtual = hoje.getMonth()
  const anoAtual = hoje.getFullYear()

  const recebidosMes = proventos.filter((p) => {
    if (!p.pago || !p.dataPagamento) return false
    const d = new Date(p.dataPagamento + 'T00:00:00')
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
  })

  const provisionados = proventos.filter((p) => !p.pago)

  const totalMes = recebidosMes.reduce((sum, p) => sum + Number(p.valorPorCota ?? 0), 0)

  const isEmpty = recebidosMes.length === 0 && provisionados.length === 0

  return (
    <Box>
      {/* Cabeçalho com total do mês */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Dividendos e Proventos
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Recebido este mês
          </Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">
            {formatBRL(totalMes)}
          </Typography>
        </Box>
      </Box>

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
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total recebido
            </Typography>
            <Typography variant="body2" fontWeight={600} color="success.main">
              {formatBRL(resumo.totalPago)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              A receber
            </Typography>
            <Typography variant="body2" fontWeight={600} color="warning.main">
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
      <Typography variant="body2" fontWeight={600} sx={{ ml: 1, whiteSpace: 'nowrap' }}>
        {formatBRL(provento.valorPorCota)}
      </Typography>
    </ListItem>
  )
}
