import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    Typography,
} from '@mui/material';
import WaterfallChartIcon from '@mui/icons-material/WaterfallChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useTheme, alpha } from '@mui/material/styles';
import { useFluxoCaixa } from '../hooks/useFluxoCaixa';
import { formatCurrency } from '../utils/formatCurrency';

// Funcao do tema: a hairline muda entre claro e escuro. O `sx` do MUI
// aceita callback, entao `sx={cardStyle}` continua valido.
const cardStyle = (t) => ({
    p: 3,
    border: `1px solid ${t.palette.lines.subtle}`,
    borderRadius: '16px',
    boxShadow: 'none',
});

const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}`;
};

// Reduz pontos do gráfico para evitar excesso de labels no eixo X
function amostrarPontos(pontos, maxPontos = 15) {
    if (!pontos || pontos.length <= maxPontos) return pontos;
    const step = Math.ceil(pontos.length / maxPontos);
    return pontos.filter((_, i) => i % step === 0 || i === pontos.length - 1);
}

const TABS = [
    { label: '30 dias', dataKey: 'data30' },
    { label: '60 dias', dataKey: 'data60' },
    { label: '90 dias', dataKey: 'data90' },
];

const FluxoCaixa = () => {
    const theme = useTheme();
    const { loading, error, data30, data60, data90, buscar } = useFluxoCaixa();
    const [tabAtiva, setTabAtiva] = useState(0);

    // Carrega os dados ao montar
    useEffect(() => {
        buscar();
    }, [buscar]);

    const dadosPorTab = { data30, data60, data90 };
    const projecaoAtiva = dadosPorTab[TABS[tabAtiva].dataKey];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* HEADER */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <WaterfallChartIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Fluxo de Caixa
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Projeção de receitas e despesas recorrentes para os próximos meses
                    </Typography>
                </Box>
            </Box>

            {/* TABS */}
            <Tabs
                value={tabAtiva}
                onChange={(_, v) => setTabAtiva(v)}
                sx={{
                    mb: 3,
                    '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 500 },
                    '& .Mui-selected': { color: 'primary.main' },
                    '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
                }}
            >
                {TABS.map(({ label }) => (
                    <Tab key={label} label={label} />
                ))}
            </Tabs>

            {/* LOADING */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
            )}

            {/* ERROR */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* CONTEÚDO */}
            {!loading && projecaoAtiva && (
                <>
                    {/* LINHA 1 — 3 KPI cards */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {/* Saldo Projetado */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={cardStyle}>
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                        Saldo Projetado
                                    </Typography>
                                    <Typography
                                        variant="h5"
                                        fontWeight={800}
                                        sx={{
                                            color: projecaoAtiva.saldoProjetado >= projecaoAtiva.saldoAtual
                                                ? theme.palette.statusText.positive
                                                : theme.palette.statusText.negative,
                                            letterSpacing: '-0.5px',
                                        }}
                                    >
                                        {formatCurrency(projecaoAtiva.saldoProjetado)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Saldo atual: {formatCurrency(projecaoAtiva.saldoAtual)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Receitas Esperadas */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={{ ...cardStyle(theme), borderColor: alpha(theme.palette.success.main, 0.3) }}>
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <TrendingUpIcon sx={{ color: 'success.main', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Receitas Esperadas
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={800} sx={{ color: 'statusText.positive' }}>
                                        {formatCurrency(projecaoAtiva.receitasEsperadas)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Despesas Esperadas */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={{ ...cardStyle(theme), borderColor: alpha(theme.palette.error.main, 0.3) }}>
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <TrendingDownIcon sx={{ color: 'error.main', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Despesas Esperadas
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={800} sx={{ color: 'statusText.negative' }}>
                                        {formatCurrency(projecaoAtiva.despesasEsperadas)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* LINHA 2 — Gráfico AreaChart */}
                    <Card sx={{ ...cardStyle(theme), mb: 2 }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Evolução do saldo projetado dia a dia
                            </Typography>
                            <Box sx={{ width: '100%', height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={amostrarPontos(projecaoAtiva.pontosGrafico)}
                                        margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                                    >
                                        <defs>
                                            <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.chart.grid} />
                                        <XAxis
                                            dataKey="data"
                                            tickFormatter={formatDate}
                                            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                        />
                                        <YAxis
                                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                            width={65}
                                        />
                                        <Tooltip
                                            formatter={(value) => [formatCurrency(value), 'Saldo Projetado']}
                                            labelFormatter={(label) => label}
                                            contentStyle={{
                                                backgroundColor: theme.palette.surfaces.raised,
                                                border: `1px solid ${theme.palette.lines.subtle}`,
                                                borderRadius: 8,
                                            }}
                                            labelStyle={{ color: theme.palette.text.secondary }}
                                        />
                                        <ReferenceLine
                                            y={projecaoAtiva.saldoAtual}
                                            stroke={theme.palette.lines.strong}
                                            strokeDasharray="6 3"
                                            label={{
                                                value: 'Saldo atual',
                                                fill: theme.palette.text.secondary,
                                                fontSize: 10,
                                                position: 'right',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="saldoProjetado"
                                            stroke={theme.palette.primary.main}
                                            strokeWidth={2}
                                            fill="url(#gradientSaldo)"
                                            dot={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* LINHA 3 — Tabela de recorrentes */}
                    <Card sx={cardStyle}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Transações Identificadas como Recorrentes
                            </Typography>
                            {projecaoAtiva.transacoesRecorrentes.length === 0 ? (
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Nenhuma transação recorrente identificada nos últimos 90 dias.
                                </Typography>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ color: 'text.secondary', borderColor: theme.palette.lines.subtle }}>
                                                Categoria
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.secondary', borderColor: theme.palette.lines.subtle }}>
                                                Tipo
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary', borderColor: theme.palette.lines.subtle }}>
                                                Valor Médio
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary', borderColor: theme.palette.lines.subtle }}>
                                                Frequência
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {projecaoAtiva.transacoesRecorrentes.map((t, idx) => (
                                            <TableRow
                                                key={idx}
                                                sx={{
                                                    opacity: t.recorrente ? 1 : 0.5,
                                                    '& td': { borderColor: theme.palette.lines.subtle },
                                                }}
                                            >
                                                <TableCell>{t.categoria}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={t.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA'}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: t.tipo === 'CREDIT'
                                                                ? alpha(theme.palette.success.main, 0.15)
                                                                : alpha(theme.palette.error.main, 0.15),
                                                            color: t.tipo === 'CREDIT'
                                                                ? theme.palette.statusText.positive
                                                                : theme.palette.statusText.negative,
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(t.valorMedio)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                                                    {t.mesesDistintos >= 3
                                                        ? 'Mensal'
                                                        : t.mesesDistintos >= 2
                                                            ? 'Bimestral'
                                                            : 'Pontual'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </Box>
    );
};

export default FluxoCaixa;
