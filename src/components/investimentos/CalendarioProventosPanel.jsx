import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { formatBRL } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';

// Rótulos curtos dos meses (índice = mês 1..12 → posição mes-1)
const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const rotuloMes = (item) =>
  item ? `${NOMES_MES[item.mes - 1]} de ${item.ano}` : '—';

// Formata "2026-07-15" → "15/07" sem depender de timezone (evita off-by-one).
const formatDataPagamento = (iso) => {
  if (!iso) return '—';
  const partes = String(iso).split('-');
  if (partes.length !== 3) return iso;
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
};

/**
 * Painel de Calendário de Proventos com Projeção Futura.
 *
 * Consome GET /api/investimentos/calendario-proventos (via investimentoService)
 * e apresenta uma visão mensal dos proventos que o usuário vai receber dos
 * ativos que possui, distinguindo claramente eventos CONFIRMADOS (data-com
 * anunciada) de PROJETADOS (estimativa baseada em histórico).
 *
 * Toda a projeção vem do backend — o front apenas consome e formata
 * (regra do projeto: zero lógica de negócio no cliente).
 */
const CalendarioProventosPanel = () => {
  const theme = useTheme();
  const mono = theme.typography.fontFamilyMono;

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resposta = await investimentoService.getCalendarioProventos();
      setDados(resposta);
    } catch (_) {
      setError('Não foi possível carregar o calendário de proventos.');
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const meses = dados?.meses ?? [];
  const isEmpty = !loading && !error && meses.length === 0;

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box>
        <Cabecalho theme={theme} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 220,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      </Box>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box>
        <Cabecalho theme={theme} />
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <EventIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.5 }} />
          <Typography variant="body2" color="statusText.negative" mt={1}>
            {error}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Estado vazio ─────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <Box>
        <Cabecalho theme={theme} />
        <Box
          data-testid="calendario-proventos-empty"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1,
            py: 5,
            px: 3,
          }}
        >
          <EventIcon sx={{ fontSize: 40, color: theme.palette.text.secondary, opacity: 0.4 }} />
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, lineHeight: 1.5, maxWidth: 360 }}
          >
            Nenhum provento previsto no momento — adicione ativos pagadores de
            dividendos, JCP ou rendimentos para visualizar quando você vai
            receber.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Conteúdo principal ──────────────────────────────────────────────────
  return (
    <Box>
      <Cabecalho theme={theme} />

      {/* Legenda explicando os dois estados — transparência com o usuário */}
      <Legenda theme={theme} />

      <Box
        data-testid="calendario-proventos-meses"
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {meses.map((mes) => (
          <MesCard key={`${mes.ano}-${mes.mes}`} mes={mes} theme={theme} mono={mono} />
        ))}
      </Box>

      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2, color: theme.palette.text.secondary, lineHeight: 1.5 }}
      >
        Valores projetados são estimativas baseadas no histórico de pagamentos e
        não representam uma garantia de recebimento.
      </Typography>
    </Box>
  );
};

/** Cabeçalho com título. */
function Cabecalho({ theme }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <EventIcon sx={{ color: theme.palette.primary.main }} />
      <Typography variant="h6" fontWeight={600}>
        Calendário de Proventos
      </Typography>
    </Box>
  );
}

/** Legenda dos dois estados (confirmado x projetado). */
function Legenda({ theme }) {
  return (
    <Box
      data-testid="calendario-proventos-legenda"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Confirmado — data-com já anunciada
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <HelpOutlineIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Projetado — estimativa baseada no histórico
        </Typography>
      </Box>
    </Box>
  );
}

/** Chip distinguindo confirmado x projetado. */
function StatusChip({ confirmado, theme }) {
  if (confirmado) {
    return (
      <Chip
        data-testid="status-confirmado"
        size="small"
        icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
        label="Confirmado"
        sx={{
          height: 22,
          fontSize: 11,
          fontWeight: 600,
          color: theme.palette.statusText.positive,
          bgcolor: 'transparent',
          border: `1px solid ${theme.palette.success.main}`,
          '& .MuiChip-icon': { color: theme.palette.success.main },
        }}
      />
    );
  }
  return (
    <Chip
      data-testid="status-projetado"
      size="small"
      icon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
      label="Projetado"
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 600,
        color: theme.palette.statusText.warning,
        bgcolor: 'transparent',
        // estilo de incerteza: borda tracejada
        border: `1px dashed ${theme.palette.warning.main}`,
        '& .MuiChip-icon': { color: theme.palette.warning.main },
      }}
    />
  );
}

/** Card de um mês: cabeçalho (mês/ano + total estimado) + lista de eventos. */
function MesCard({ mes, theme, mono }) {
  const eventos = mes.eventos ?? [];
  // Se há ao menos um evento não confirmado, o total inclui projeções.
  const totalComProjecao = eventos.some((e) => !e.confirmado);

  return (
    <Box
      data-testid="calendario-mes-card"
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        p: 2,
        bgcolor: theme.palette.surfaces.surface,
      }}
    >
      {/* Cabeçalho do mês */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          {rotuloMes(mes)}
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Total estimado{totalComProjecao ? ' (com projeções)' : ''}
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            data-testid="calendario-mes-total"
            sx={{ color: theme.palette.statusText.positive, fontFamily: mono }}
          >
            {formatBRL(mes.totalEstimado)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Lista de eventos do mês */}
      <List dense disablePadding>
        {eventos.map((ev, i) => (
          <ListItem
            key={`${ev.ticker}-${ev.tipo}-${ev.dataPagamento}-${i}`}
            data-testid="calendario-evento"
            disableGutters
            sx={{
              py: 0.75,
              // projeções ficam levemente atenuadas (estilo de incerteza)
              opacity: ev.confirmado ? 1 : 0.85,
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {ev.ticker}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ev.tipo}
                  </Typography>
                  <StatusChip confirmado={ev.confirmado} theme={theme} />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  Pagamento em {formatDataPagamento(ev.dataPagamento)}
                </Typography>
              }
            />
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ ml: 1, whiteSpace: 'nowrap', fontFamily: mono }}
            >
              {formatBRL(ev.valorEstimadoTotal)}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default CalendarioProventosPanel;
