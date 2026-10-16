import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PaidIcon from '@mui/icons-material/Paid';
import { formatBRL } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';

// Rótulos curtos dos meses (índice = mês 1..12 → posição mes-1)
const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

// Filtros disponíveis. value=null → "Todos" (sem query param).
const FILTROS = [
  { value: null, label: 'Todos' },
  { value: 'DIVIDENDO', label: 'Dividendo' },
  { value: 'JCP', label: 'JCP' },
  { value: 'RENDIMENTO', label: 'Rendimento' },
];

const formatPercent = (value) =>
  value === undefined || value === null
    ? '–'
    : `${Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

const rotuloMes = (item) =>
  item ? `${NOMES_MES[item.mes - 1]}/${String(item.ano).slice(-2)}` : '—';

/**
 * Painel de Renda Passiva mês a mês.
 *
 * Consome GET /api/investimentos/renda-passiva (via investimentoService) e
 * apresenta um gráfico de barras SVG (12 meses) do total recebido por mês,
 * métricas agregadas e um breakdown por ativo do mês selecionado.
 *
 * Toda a agregação vem do backend — o front apenas consome e formata
 * (regra do projeto: zero lógica de negócio no cliente).
 */
const RendaPassivaPanel = () => {
  const theme = useTheme();
  const series = theme.palette.series;
  const mono = theme.typography.fontFamilyMono;

  const [filtro, setFiltro] = useState(null);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Mês selecionado para exibir o breakdown (índice no array meses) ou null.
  const [mesSelecionado, setMesSelecionado] = useState(null);

  const carregar = useCallback(async (tipo) => {
    setLoading(true);
    setError(null);
    try {
      const resposta = await investimentoService.getRendaPassiva(tipo);
      setDados(resposta);
    } catch (_) {
      setError('Não foi possível carregar a renda passiva.');
      setDados(null);
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
    setMesSelecionado(null);
    setFiltro(novoValor);
  };

  const meses = dados?.meses ?? [];
  const maxTotal = useMemo(
    () => meses.reduce((max, m) => Math.max(max, Number(m.total) || 0), 0),
    [meses],
  );

  const isEmpty =
    !loading &&
    !error &&
    dados &&
    Number(dados.totalRecebidoNoAno ?? 0) === 0;

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
          <PaidIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.5 }} />
          <Typography variant="body2" color="statusText.negative" mt={1}>
            {error}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Estado vazio (padrão InsightEducacionalCard: ícone + texto) ─────────
  if (isEmpty) {
    return (
      <Box>
        <Cabecalho theme={theme} filtro={filtro} onFiltro={handleFiltro} />
        <Box
          data-testid="renda-passiva-empty"
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
          <PaidIcon sx={{ fontSize: 40, color: theme.palette.text.secondary, opacity: 0.4 }} />
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, lineHeight: 1.5, maxWidth: 360 }}
          >
            Nenhum provento recebido no período ainda — registre dividendos,
            JCP e rendimentos para acompanhar sua renda passiva mês a mês.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Conteúdo principal ──────────────────────────────────────────────────
  const mesMaior = dados?.mesComMaiorRecebimento;
  const detalheMes = mesSelecionado !== null ? meses[mesSelecionado] : null;

  return (
    <Box>
      <Cabecalho theme={theme} filtro={filtro} onFiltro={handleFiltro} />

      {/* Métricas agregadas */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 2, sm: 4 },
          mb: 3,
        }}
      >
        <Metrica
          label="Total no ano"
          valor={formatBRL(dados?.totalRecebidoNoAno)}
          mono={mono}
          cor={theme.palette.statusText.positive}
        />
        <Metrica
          label="Média mensal"
          valor={formatBRL(dados?.mediaMensal)}
          mono={mono}
          cor={theme.palette.text.primary}
        />
        <Metrica
          label="Maior recebimento"
          valor={mesMaior ? `${rotuloMes(mesMaior)} · ${formatBRL(mesMaior.total)}` : '—'}
          mono={mono}
          cor={theme.palette.text.primary}
        />
        <Metrica
          label="Yield on cost"
          valor={formatPercent(dados?.yieldOnCostAgregado)}
          mono={mono}
          cor={series[1]}
        />
      </Box>

      {/* Gráfico de barras SVG (12 meses) */}
      <GraficoBarras
        meses={meses}
        maxTotal={maxTotal}
        corBarra={theme.palette.primary.main}
        corSelecionada={series[1]}
        corEixo={theme.palette.text.secondary}
        mesSelecionado={mesSelecionado}
        onSelecionarMes={(idx) =>
          setMesSelecionado((atual) => (atual === idx ? null : idx))
        }
        rotuloMes={rotuloMes}
      />

      {/* Breakdown por ativo do mês selecionado */}
      {detalheMes && (
        <Box data-testid="renda-passiva-breakdown" sx={{ mt: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            {rotuloMes(detalheMes)} — proventos por ativo
          </Typography>

          {detalheMes.breakdown && detalheMes.breakdown.length > 0 ? (
            <List dense disablePadding>
              {detalheMes.breakdown.map((b, i) => (
                <ListItem key={`${b.ticker}-${b.tipo}-${i}`} disableGutters sx={{ py: 0.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: series[i % series.length],
                      flexShrink: 0,
                      mr: 1.5,
                    }}
                  />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {b.ticker}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.tipo}
                        </Typography>
                      </Box>
                    }
                  />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ ml: 1, whiteSpace: 'nowrap', fontFamily: mono }}
                  >
                    {formatBRL(b.valor)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Nenhum provento neste mês.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

/** Cabeçalho com título + filtro por tipo de provento. */
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
      <Typography variant="h6" fontWeight={600}>
        Renda Passiva mês a mês
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={filtro}
        onChange={onFiltro}
        aria-label="Filtrar por tipo de provento"
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

/** Bloco de métrica agregada. */
function Metrica({ label, valor, mono, cor }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700} sx={{ color: cor, fontFamily: mono }}>
        {valor}
      </Typography>
    </Box>
  );
}

/**
 * Gráfico de barras puro em SVG (sem lib de chart), seguindo a abordagem dos
 * primitivos do design system (viewBox fixo + responsivo). Cada barra é
 * focável e clicável: foco/hover mostra o total via <title> (tooltip nativo);
 * clique seleciona o mês para exibir o breakdown.
 */
function GraficoBarras({
  meses,
  maxTotal,
  corBarra,
  corSelecionada,
  corEixo,
  mesSelecionado,
  onSelecionarMes,
  rotuloMes,
}) {
  const W = 720;
  const H = 220;
  const padX = 8;
  const padTop = 12;
  const padBottom = 28; // espaço para os rótulos dos meses
  const n = meses.length || 12;
  const slot = (W - padX * 2) / n;
  const barW = slot * 0.6;
  const plotH = H - padTop - padBottom;
  // escala: maxTotal=0 evita divisão por zero (todas as barras com altura mínima)
  const escala = maxTotal > 0 ? plotH / maxTotal : 0;

  return (
    <Box sx={{ width: '100%' }}>
      <svg
        data-testid="renda-passiva-chart"
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Gráfico de barras da renda passiva mensal"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* linha de base do eixo X */}
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={W - padX}
          y2={padTop + plotH}
          stroke={corEixo}
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {meses.map((m, i) => {
          const total = Number(m.total) || 0;
          const altura = total > 0 ? Math.max(total * escala, 2) : 0;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = padTop + plotH - altura;
          const selecionado = mesSelecionado === i;
          const fill = selecionado ? corSelecionada : corBarra;

          return (
            <g key={`${m.ano}-${m.mes}`}>
              {/* área clicável de todo o slot (facilita meses com total 0) */}
              <rect
                data-testid={`renda-passiva-bar-${i}`}
                x={padX + i * slot}
                y={padTop}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-pressed={selecionado}
                aria-label={`${rotuloMes(m)}: ${total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}`}
                style={{ cursor: 'pointer', outline: 'none' }}
                onClick={() => onSelecionarMes(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelecionarMes(i);
                  }
                }}
              >
                <title>
                  {`${rotuloMes(m)}: ${total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}`}
                </title>
              </rect>

              {/* barra visível */}
              {altura > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={altura}
                  rx={3}
                  fill={fill}
                  fillOpacity={selecionado ? 1 : 0.82}
                  pointerEvents="none"
                />
              )}

              {/* rótulo do mês */}
              <text
                x={padX + i * slot + slot / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill={corEixo}
                fillOpacity="0.7"
                pointerEvents="none"
              >
                {rotuloMes(m).split('/')[0]}
              </text>
            </g>
          );
        })}
      </svg>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}
      >
        Selecione um mês para ver o detalhamento por ativo
      </Typography>
    </Box>
  );
}

export default RendaPassivaPanel;
