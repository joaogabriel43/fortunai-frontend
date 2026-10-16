import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { investimentoService } from '../../services/investimentoService';

// Filtros disponíveis. value=null → "Todos" (sem query param).
// Os 8 tipos do contrato com rótulos legíveis em PT-BR.
const FILTROS = [
  { value: null, label: 'Todos' },
  { value: 'DATA_COM', label: 'Data com' },
  { value: 'DATA_EX', label: 'Data ex' },
  { value: 'DESDOBRAMENTO', label: 'Desdobramento' },
  { value: 'GRUPAMENTO', label: 'Grupamento' },
  { value: 'AMORTIZACAO', label: 'Amortização' },
  { value: 'JCP', label: 'JCP' },
  { value: 'BONIFICACAO', label: 'Bonificação' },
  { value: 'SUBSCRICAO', label: 'Subscrição' },
];

// Mapeamento enum → rótulo PT-BR (mesma fonte dos filtros, sem o "Todos").
const ROTULOS_TIPO = FILTROS.reduce((acc, { value, label }) => {
  if (value) acc[value] = label;
  return acc;
}, {});

const rotuloTipo = (tipo) => ROTULOS_TIPO[tipo] ?? tipo;

// Formata "2026-06-18" → "18/06/2026" sem depender de timezone (evita
// off-by-one que o new Date(iso) causaria em fusos negativos).
const formatData = (iso) => {
  if (!iso) return '—';
  const partes = String(iso).split('-');
  if (partes.length !== 3) return iso;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
};

/**
 * Painel de Agenda de Eventos Corporativos.
 *
 * Consome GET /api/investimentos/eventos-corporativos (via investimentoService)
 * e apresenta uma linha do tempo (timeline) dos eventos corporativos dos ativos
 * que o usuário possui — data-com, data-ex, desdobramento, JCP, etc. — em ordem
 * cronológica crescente, com destaque para eventos próximos (próximos 7 dias).
 *
 * A ordenação e o flag `proximo` vêm do backend — o front apenas consome,
 * mapeia enum→rótulo e formata (regra do projeto: zero lógica de negócio no
 * cliente). A timeline é construída com MUI base (sem @mui/lab) para não
 * adicionar dependência nova.
 */
const EventosCorporativosPanel = () => {
  const theme = useTheme();

  const [filtro, setFiltro] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async (tipo) => {
    setLoading(true);
    setError(null);
    try {
      const resposta = await investimentoService.getEventosCorporativos(tipo);
      setEventos(resposta?.eventos ?? []);
    } catch (_) {
      setError('Não foi possível carregar a agenda de eventos corporativos.');
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar(filtro);
  }, [filtro, carregar]);

  const handleFiltro = (_event, novoValor) => {
    // novoValor === undefined quando o usuário re-clica o botão já ativo —
    // mantém a seleção atual (não permite estado "nenhum filtro selecionado").
    if (novoValor === undefined) return;
    setFiltro(novoValor);
  };

  const isEmpty = !loading && !error && eventos.length === 0;

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box>
        <Cabecalho theme={theme} filtro={filtro} onFiltro={handleFiltro} />
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
        <Cabecalho theme={theme} filtro={filtro} onFiltro={handleFiltro} />
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <EventNoteIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.5 }} />
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
        <Cabecalho theme={theme} filtro={filtro} onFiltro={handleFiltro} />
        <Box
          data-testid="eventos-corporativos-empty"
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
          <EventNoteIcon sx={{ fontSize: 40, color: theme.palette.text.secondary, opacity: 0.4 }} />
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, lineHeight: 1.5, maxWidth: 360 }}
          >
            Nenhum evento corporativo na agenda no momento — adicione ativos à
            sua carteira para acompanhar datas-com, desdobramentos, JCP e outros
            eventos.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Conteúdo principal: linha do tempo ──────────────────────────────────
  return (
    <Box>
      <Cabecalho theme={theme} filtro={filtro} onFiltro={handleFiltro} />

      <Box
        data-testid="eventos-corporativos-timeline"
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        {eventos.map((ev, i) => (
          <TimelineItem
            key={`${ev.ticker}-${ev.tipo}-${ev.data}-${i}`}
            evento={ev}
            theme={theme}
            ultimo={i === eventos.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};

/** Cabeçalho com título + filtro por tipo de evento. */
function Cabecalho({ theme, filtro, onFiltro }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventNoteIcon sx={{ color: theme.palette.primary.main }} />
        <Typography variant="h6" fontWeight={600}>
          Agenda de Eventos Corporativos
        </Typography>
      </Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={filtro}
        onChange={onFiltro}
        aria-label="Filtrar por tipo de evento"
        sx={{ flexWrap: 'wrap' }}
      >
        {FILTROS.map(({ value, label }) => (
          <ToggleButton
            key={label}
            value={value}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: theme.palette.accent.primarySoft,
                color: theme.palette.primary.main,
              },
            }}
          >
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

/**
 * Item de uma linha do tempo construída com MUI base: uma coluna fixa à
 * esquerda com o conector vertical + dot, e o conteúdo do evento à direita.
 * Eventos próximos (`proximo: true`) recebem destaque (dot/borda em warning +
 * chip "Em breve").
 */
function TimelineItem({ evento, theme, ultimo }) {
  const proximo = evento.proximo === true;
  const corDestaque = theme.palette.warning.main;
  const corNeutra = theme.palette.primary.main;
  const corDot = proximo ? corDestaque : corNeutra;

  return (
    <Box
      data-testid="evento-corporativo-item"
      data-proximo={proximo ? 'true' : 'false'}
      sx={{ display: 'flex', gap: 1.5 }}
    >
      {/* Coluna do conector vertical + dot */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 24,
          flexShrink: 0,
        }}
      >
        <Box
          data-testid="evento-dot"
          sx={{
            mt: 0.75,
            width: 14,
            height: 14,
            borderRadius: '50%',
            bgcolor: proximo ? corDestaque : 'transparent',
            border: `2px solid ${corDot}`,
            flexShrink: 0,
          }}
        />
        {/* conector vertical (omitido no último item) */}
        {!ultimo && (
          <Box
            sx={{
              flexGrow: 1,
              width: 2,
              minHeight: 24,
              my: 0.5,
              bgcolor: theme.palette.divider,
            }}
          />
        )}
      </Box>

      {/* Conteúdo do evento */}
      <Box
        sx={{
          pb: ultimo ? 0 : 2.5,
          flexGrow: 1,
          // eventos próximos recebem uma borda lateral de destaque
          borderLeft: proximo ? `2px solid ${corDestaque}` : 'none',
          pl: proximo ? 1.5 : 0,
          ml: proximo ? -0.5 : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
          >
            {formatData(evento.data)}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {evento.ticker}
          </Typography>
          <Chip
            data-testid="evento-tipo-chip"
            size="small"
            label={rotuloTipo(evento.tipo)}
            sx={{
              height: 20,
              fontSize: 11,
              fontWeight: 600,
              color: theme.palette.primary.main,
              bgcolor: 'transparent',
              border: `1px solid ${theme.palette.primary.main}`,
            }}
          />
          {proximo && (
            <Chip
              data-testid="evento-proximo-chip"
              size="small"
              label="Em breve"
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                color: theme.palette.statusText.warning,
                bgcolor: 'transparent',
                border: `1px solid ${theme.palette.warning.main}`,
              }}
            />
          )}
        </Box>
        {evento.descricao && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, mt: 0.25 }}
          >
            {evento.descricao}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default EventosCorporativosPanel;
