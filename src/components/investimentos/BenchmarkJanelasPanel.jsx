import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { investimentoService } from '../../services/investimentoService';

// Rótulos curtos dos meses (índice = mês 1..12 → posição mes-1).
const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

// Ordem e rótulos das janelas (ToggleButtonGroup).
const JANELAS = [
  { id: 'MES', label: 'Mês' },
  { id: 'ANO', label: 'Ano' },
  { id: 'DOZE_MESES', label: '12 meses' },
  { id: 'DESDE_INICIO', label: 'Desde o início' },
];

const formatPercent = (value) =>
  value === undefined || value === null
    ? '–'
    : `${Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

const formatPercentSigned = (value) => {
  if (value === undefined || value === null) return '–';
  const n = Number(value);
  const sinal = n >= 0 ? '+' : '';
  return `${sinal}${formatPercent(n)}`;
};

/**
 * Painel de comparação vs benchmarks com JANELAS TEMPORAIS e gráfico
 * multi-série sobreposto.
 *
 * Consome GET /api/benchmarks/janelas (via investimentoService) e apresenta:
 * - Seletor de janela (Mês / Ano / 12 meses / Desde o início) que controla os
 *   números exibidos (carteira/cdi/ibov/ipca + alpha).
 * - Cards de alpha explícito por benchmark (out/underperformance via cor).
 * - Gráfico de linha multi-série sobreposto (carteira vs CDI vs IBOV vs IPCA)
 *   construído em SVG inline no estilo do design system (sem lib de chart).
 *
 * Toda a agregação vem do backend — o front apenas consome e formata.
 */
const BenchmarkJanelasPanel = () => {
  const theme = useTheme();

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [janelaSel, setJanelaSel] = useState('MES');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resposta = await investimentoService.getBenchmarkJanelas();
      setDados(resposta);
    } catch {
      setError('Não foi possível carregar a comparação vs benchmarks.');
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const janelas = useMemo(() => dados?.janelas ?? [], [dados]);

  // Janelas efetivamente presentes no payload (preserva a ordem canônica).
  const janelasDisponiveis = useMemo(
    () => JANELAS.filter((j) => janelas.some((w) => w.janela === j.id)),
    [janelas],
  );

  // Linha de resumo da janela selecionada (com fallback para a primeira
  // disponível, evitando "nada selecionado" após carregar).
  const resumo = useMemo(() => {
    if (janelas.length === 0) return null;
    return (
      janelas.find((w) => w.janela === janelaSel) ??
      janelas.find((w) => w.janela === janelasDisponiveis[0]?.id) ??
      janelas[0]
    );
  }, [janelas, janelaSel, janelasDisponiveis]);

  // Séries de 12 pontos (podem vir vazias se a carteira estiver vazia).
  const serieCarteira = dados?.serieCarteira ?? [];
  const serieCdi = dados?.serieCdi ?? [];
  const serieIbov = dados?.serieIbov ?? [];
  const serieIpca = dados?.serieIpca ?? [];

  // Estado vazio: nenhuma janela e nenhuma série de carteira.
  const isEmpty =
    !loading &&
    !error &&
    dados &&
    janelas.length === 0 &&
    serieCarteira.length === 0;

  const corPorSinal = useCallback(
    (superou) =>
      superou ? theme.palette.success.main : theme.palette.error.main,
    [theme],
  );

  const handleJanela = (_e, valor) => {
    if (valor !== null) setJanelaSel(valor);
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box>
        <Cabecalho />
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
        <Cabecalho />
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <ShowChartIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.5 }} />
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
        <Cabecalho />
        <Box
          data-testid="benchmark-janelas-empty"
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
          <ShowChartIcon
            sx={{ fontSize: 40, color: theme.palette.text.secondary, opacity: 0.4 }}
          />
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, lineHeight: 1.5, maxWidth: 360 }}
          >
            Sua carteira ainda não tem histórico para comparar com os
            benchmarks — adicione investimentos para acompanhar a evolução
            frente a CDI, IBOV e IPCA ao longo do tempo.
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!resumo) return null;

  // Definição das séries do gráfico (cor estável via palette.series).
  // Carteira usa o primary; os índices seguem a paleta de séries.
  const series = [
    { id: 'carteira', label: 'Carteira', pontos: serieCarteira, cor: theme.palette.primary.main },
    { id: 'cdi', label: 'CDI', pontos: serieCdi, cor: theme.palette.series[1] },
    { id: 'ibov', label: 'IBOV', pontos: serieIbov, cor: theme.palette.series[2] },
    { id: 'ipca', label: 'IPCA', pontos: serieIpca, cor: theme.palette.series[3] },
  ];

  return (
    <Box data-testid="benchmark-janelas">
      <Cabecalho />

      {/* Seletor de janela temporal */}
      <ToggleButtonGroup
        value={resumo.janela}
        exclusive
        onChange={handleJanela}
        size="small"
        aria-label="Janela de tempo"
        data-testid="benchmark-janela-toggle"
        sx={{ mb: 2.5, flexWrap: 'wrap' }}
      >
        {janelasDisponiveis.map((j) => (
          <ToggleButton key={j.id} value={j.id} data-testid={`janela-${j.id}`}>
            {j.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Linha de resumo: rentabilidade da carteira na janela escolhida */}
      <Box data-testid="benchmark-resumo-carteira" sx={{ mb: 2.5 }}>
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
          Rentabilidade da carteira
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ fontFamily: theme.typography.fontFamilyMono }}
        >
          {formatPercent(resumo.carteira)}
        </Typography>
      </Box>

      {/* Cards de alpha por benchmark (out/underperformance) */}
      <Box
        data-testid="benchmark-alpha-cards"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <AlphaCard
          benchmark="CDI"
          valorBenchmark={resumo.cdi}
          alpha={resumo.alphaCdi}
          superou={resumo.superouCdi}
          mono={theme.typography.fontFamilyMono}
          cor={corPorSinal(resumo.superouCdi)}
        />
        <AlphaCard
          benchmark="IBOV"
          valorBenchmark={resumo.ibov}
          alpha={resumo.alphaIbov}
          superou={resumo.superouIbov}
          mono={theme.typography.fontFamilyMono}
          cor={corPorSinal(resumo.superouIbov)}
        />
        <AlphaCard
          benchmark="IPCA"
          valorBenchmark={resumo.ipca}
          alpha={resumo.alphaIpca}
          superou={resumo.superouIpca}
          mono={theme.typography.fontFamilyMono}
          cor={corPorSinal(resumo.superouIpca)}
        />
      </Box>

      {/* Gráfico multi-série sobreposto + legenda */}
      <GraficoMultiSerie series={series} theme={theme} />
    </Box>
  );
};

/** Cabeçalho com título do painel. */
function Cabecalho() {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" fontWeight={600}>
        Carteira vs Benchmarks no tempo
      </Typography>
    </Box>
  );
}

/**
 * Card de alpha de um benchmark na janela selecionada. A cor (success/error) e
 * a seta indicam OUTperformance (carteira bateu o índice) vs UNDERperformance.
 */
function AlphaCard({ benchmark, valorBenchmark, alpha, superou, mono, cor }) {
  const Seta = superou ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Box
      data-testid={`alpha-card-${benchmark}`}
      sx={{
        p: 1.5,
        border: `1px solid ${cor}`,
        borderRadius: 2,
        bgcolor: 'transparent',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          mb: 0.5,
        }}
      >
        Alpha vs {benchmark}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Seta data-testid={`alpha-card-${benchmark}-seta`} sx={{ fontSize: 18, color: cor }} />
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={(t) => ({
            color: superou ? t.palette.statusText.positive : t.palette.statusText.negative,
            fontFamily: mono,
          })}
          data-testid={`alpha-card-${benchmark}-valor`}
        >
          {formatPercentSigned(alpha)}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontFamily: mono, display: 'block', mt: 0.25 }}
      >
        {benchmark}: {formatPercent(valorBenchmark)}
      </Typography>
    </Box>
  );
}

/**
 * Gráfico de linha multi-série sobreposto (carteira vs CDI vs IBOV vs IPCA).
 *
 * SVG inline no estilo do primitivo Sparkline (sem dependência de chart). As 4
 * séries compartilham a MESMA escala (min/max global) para que a comparação
 * visual seja honesta — diferente do Sparkline, que auto-escala cada série.
 */
function GraficoMultiSerie({ series, theme }) {
  const w = 600;
  const h = 160;
  const pad = 8;

  // Séries com ao menos 2 pontos são plotáveis.
  const plotaveis = series.filter((s) => (s.pontos?.length ?? 0) >= 2);

  // Eixo de rótulos: usa a série mais longa disponível como referência.
  const refSerie = plotaveis.reduce(
    (acc, s) => (s.pontos.length > (acc?.pontos.length ?? 0) ? s : acc),
    null,
  );

  const rotulo = (p) =>
    p ? `${NOMES_MES[p.mes - 1]}/${String(p.ano).slice(-2)}` : '';

  if (plotaveis.length === 0) {
    return (
      <Box data-testid="benchmark-grafico">
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Sem histórico suficiente para o gráfico de comparação.
        </Typography>
      </Box>
    );
  }

  // Escala global compartilhada por todas as séries.
  const todosValores = plotaveis.flatMap((s) =>
    s.pontos.map((p) => Number(p.valor) || 0),
  );
  const max = Math.max(...todosValores);
  const min = Math.min(...todosValores);
  const span = max - min || 1;

  const yDe = (val) => h - pad - ((val - min) / span) * (h - pad * 2);
  const pathDe = (pontos) =>
    pontos
      .map((p, i) => {
        const x = (i / (pontos.length - 1)) * w;
        const y = yDe(Number(p.valor) || 0);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <Box data-testid="benchmark-grafico">
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: 600,
          display: 'block',
          mb: 1,
        }}
      >
        Evolução comparada (% mês a mês)
      </Typography>

      <Box data-testid="benchmark-grafico-chart">
        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible', color: theme.palette.text.primary }}
        >
          {/* gridlines sutis */}
          {[0.33, 0.66].map((g, i) => (
            <line
              key={i}
              x1="0"
              y1={h * g}
              x2={w}
              y2={h * g}
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="1"
            />
          ))}

          {/* uma linha por série (sobrepostas, mesma escala) */}
          {plotaveis.map((s) => (
            <path
              key={s.id}
              data-testid={`benchmark-serie-${s.id}`}
              d={pathDe(s.pontos)}
              fill="none"
              stroke={s.cor}
              strokeWidth={s.id === 'carteira' ? 2.75 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </Box>

      {/* Eixo de rótulos: primeiro e último ponto da série de referência */}
      {refSerie && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {rotulo(refSerie.pontos[0])}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rotulo(refSerie.pontos[refSerie.pontos.length - 1])}
          </Typography>
        </Box>
      )}

      {/* Legenda cor ↔ série */}
      <Box
        data-testid="benchmark-legenda"
        sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}
      >
        {series.map((s) => (
          <Box
            key={s.id}
            data-testid={`benchmark-legenda-${s.id}`}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            <Box
              sx={{
                width: 14,
                height: 3,
                borderRadius: 2,
                bgcolor: s.cor,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default BenchmarkJanelasPanel;
