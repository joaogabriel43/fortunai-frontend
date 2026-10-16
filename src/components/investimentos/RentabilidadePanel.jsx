import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { formatBRL, Sparkline } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';

// Rótulos curtos dos meses (índice = mês 1..12 → posição mes-1)
const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const formatPercent = (value) =>
  value === undefined || value === null
    ? '–'
    : `${Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

/**
 * Painel de Rentabilidade da Carteira.
 *
 * Consome GET /api/investimentos/rentabilidade (via investimentoService) e
 * apresenta: cards consolidados (valor investido, valor atual, ganho R$/%,
 * retorno total com proventos), tabela por ativo, e um gráfico de evolução
 * temporal (linha SVG via primitivo Sparkline).
 *
 * Toda a agregação/cálculo vem do backend — o front apenas consome e formata
 * (regra do projeto: zero lógica de negócio no cliente). Ganhos/retornos podem
 * ser negativos (prejuízo) e recebem distinção visual success/error.
 */
const RentabilidadePanel = () => {
  const theme = useTheme();
  const mono = theme.typography.fontFamilyMono;

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resposta = await investimentoService.getRentabilidade();
      setDados(resposta);
    } catch (_) {
      setError('Não foi possível carregar a rentabilidade da carteira.');
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const ativos = dados?.ativos ?? [];
  const evolucao = dados?.evolucao ?? [];

  // Carteira vazia: sem ativos e sem valor investido.
  const isEmpty =
    !loading &&
    !error &&
    dados &&
    ativos.length === 0 &&
    Number(dados.valorInvestidoTotal ?? 0) === 0;

  // Cor de acordo com o sinal do valor (≥ 0 lucro, < 0 prejuízo).
  const corPorSinal = useCallback(
    (valor) =>
      Number(valor) >= 0 ? theme.palette.statusText.positive : theme.palette.statusText.negative,
    [theme],
  );

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

  // ── Estado vazio (padrão ícone + texto) ─────────────────────────────────
  if (isEmpty) {
    return (
      <Box>
        <Cabecalho />
        <Box
          data-testid="rentabilidade-empty"
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
            Sua carteira ainda não tem ativos — adicione investimentos para
            acompanhar a rentabilidade, o ganho com proventos e a evolução ao
            longo do tempo.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Conteúdo principal ──────────────────────────────────────────────────
  return (
    <Box>
      <Cabecalho />

      {/* Cards consolidados */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 2, sm: 3 },
          mb: 3,
        }}
      >
        <CardConsolidado
          label="Valor investido"
          valor={formatBRL(dados?.valorInvestidoTotal)}
          mono={mono}
          cor={theme.palette.text.primary}
        />
        <CardConsolidado
          label="Valor atual"
          valor={formatBRL(dados?.valorAtualTotal)}
          mono={mono}
          cor={theme.palette.text.primary}
        />
        <CardConsolidado
          data-testid="card-ganho-total"
          label="Ganho"
          valor={formatBRL(dados?.ganhoAbsolutoTotal)}
          sublabel={formatPercent(dados?.ganhoPercentualTotal)}
          mono={mono}
          cor={corPorSinal(dados?.ganhoAbsolutoTotal)}
          mostrarSeta
          positivo={Number(dados?.ganhoAbsolutoTotal) >= 0}
        />
        <CardConsolidado
          data-testid="card-retorno-total"
          label="Retorno total"
          valor={formatBRL(dados?.retornoTotalAbsoluto)}
          sublabel={`${formatPercent(dados?.retornoTotalPercentual)} · inclui proventos`}
          mono={mono}
          cor={corPorSinal(dados?.retornoTotalAbsoluto)}
          mostrarSeta
          positivo={Number(dados?.retornoTotalAbsoluto) >= 0}
        />
      </Box>

      {/* Carteira vs inflação (ADR-044): comparação lado a lado com o IPCA 12m oficial */}
      {dados?.ipcaAcumulado12mPct != null && (
        <Box data-testid="chip-ipca-12m" sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            IPCA acumulado 12m: <b style={{ fontFamily: theme.typography.fontFamilyMono }}>
              {Number(dados.ipcaAcumulado12mPct).toFixed(2)}%</b>
          </Typography>
          <Typography variant="caption" sx={{
            fontWeight: 700,
            color: Number(dados?.retornoTotalPercentual) >= Number(dados.ipcaAcumulado12mPct)
              ? theme.palette.statusText.positive : theme.palette.statusText.negative,
          }}>
            {Number(dados?.retornoTotalPercentual) >= Number(dados.ipcaAcumulado12mPct)
              ? '· sua carteira supera a inflação' : '· sua carteira está abaixo da inflação'}
          </Typography>
        </Box>
      )}

      {/* Gráfico de evolução temporal (linha) */}
      <GraficoEvolucao evolucao={evolucao} theme={theme} />

      {/* Tabela por ativo */}
      {ativos.length > 0 && (
        <Box data-testid="rentabilidade-por-ativo" sx={{ mt: 3 }}>
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
            Rentabilidade por ativo
          </Typography>

          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Ativo</TableCell>
                <TableCell align="right">Preço médio</TableCell>
                <TableCell align="right">Preço atual</TableCell>
                <TableCell align="right">Ganho (R$)</TableCell>
                <TableCell align="right">Ganho (%)</TableCell>
                <TableCell align="right">Retorno total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ativos.map((a) => {
                const corGanho = corPorSinal(a.ganhoAbsoluto);
                const corRetorno = corPorSinal(a.retornoTotalAbsoluto);
                return (
                  <TableRow
                    key={a.ticker}
                    data-testid={`rentabilidade-ativo-${a.ticker}`}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{a.ticker}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: mono }}>
                      {formatBRL(a.precoMedio)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: mono }}>
                      {formatBRL(a.precoAtual)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: mono, color: corGanho, fontWeight: 600 }}
                    >
                      {formatBRL(a.ganhoAbsoluto)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: mono, color: corGanho, fontWeight: 600 }}
                    >
                      {formatPercent(a.ganhoPercentual)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: mono, color: corRetorno, fontWeight: 600 }}
                    >
                      {formatBRL(a.retornoTotalAbsoluto)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

/** Cabeçalho com título do painel. */
function Cabecalho() {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" fontWeight={600}>
        Rentabilidade da Carteira
      </Typography>
    </Box>
  );
}

/**
 * Card consolidado. Quando `mostrarSeta`, exibe uma seta para cima (lucro) ou
 * para baixo (prejuízo) colorida pelo mesmo tom do valor.
 */
function CardConsolidado({
  label,
  valor,
  sublabel,
  mono,
  cor,
  mostrarSeta = false,
  positivo = true,
  'data-testid': testId,
}) {
  const Seta = positivo ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Box data-testid={testId}>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {mostrarSeta && (
          <Seta
            data-testid={testId ? `${testId}-seta` : undefined}
            sx={{ fontSize: 18, color: cor }}
          />
        )}
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ color: cor, fontFamily: mono }}
        >
          {valor}
        </Typography>
      </Box>
      {sublabel && (
        <Typography
          variant="caption"
          sx={{ color: cor, fontFamily: mono, display: 'block', mt: 0.25 }}
        >
          {sublabel}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Gráfico de evolução temporal (linha) construído sobre o primitivo Sparkline
 * do design system. A cor segue a tendência final: ≥ 0 → success, < 0 → error.
 * Eixo de rótulos (primeiro/último mês) renderizado abaixo do gráfico.
 */
function GraficoEvolucao({ evolucao, theme }) {
  const serie = useMemo(
    () => evolucao.map((p) => Number(p.rentabilidadePercentual) || 0),
    [evolucao],
  );

  // Tendência pelo último ponto da série (rentabilidade acumulada/pontual).
  const ultimo = serie.length > 0 ? serie[serie.length - 1] : 0;
  const corLinha =
    ultimo >= 0 ? theme.palette.success.main : theme.palette.error.main;

  const rotulo = (p) =>
    p ? `${NOMES_MES[p.mes - 1]}/${String(p.ano).slice(-2)}` : '';

  // Sparkline precisa de pelo menos 2 pontos; com menos, mostra placeholder.
  if (serie.length < 2) {
    return (
      <Box data-testid="rentabilidade-evolucao">
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Sem histórico suficiente para o gráfico de evolução.
        </Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="rentabilidade-evolucao">
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
        Evolução da rentabilidade (% ao longo do tempo)
      </Typography>

      <Box data-testid="rentabilidade-evolucao-chart">
        <Sparkline data={serie} color={corLinha} height={120} grid />
      </Box>

      {/* Eixo de rótulos: primeiro e último ponto */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 0.5,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {rotulo(evolucao[0])}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {rotulo(evolucao[evolucao.length - 1])}
        </Typography>
      </Box>
    </Box>
  );
}

export default RentabilidadePanel;
