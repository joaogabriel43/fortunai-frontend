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
import { useFluxoCaixa } from '../hooks/useFluxoCaixa';

const cardStyle = {
    p: 3,
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    boxShadow: 'none',
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

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
                <WaterfallChartIcon sx={{ color: '#7C6AF7', fontSize: 28 }} />
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
                    '& .Mui-selected': { color: '#7C6AF7' },
                    '& .MuiTabs-indicator': { backgroundColor: '#7C6AF7' },
                }}
            >
                {TABS.map(({ label }) => (
                    <Tab key={label} label={label} />
                ))}
            </Tabs>

            {/* LOADING */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: '#7C6AF7' }} />
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
                                                ? '#81C784'
                                                : '#EF5350',
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
                            <Card sx={{ ...cardStyle, borderColor: 'rgba(129,199,132,0.3)' }}>
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <TrendingUpIcon sx={{ color: '#81C784', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Receitas Esperadas
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={800} sx={{ color: '#81C784' }}>
                                        {formatCurrency(projecaoAtiva.receitasEsperadas)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Despesas Esperadas */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={{ ...cardStyle, borderColor: 'rgba(239,83,80,0.3)' }}>
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <TrendingDownIcon sx={{ color: '#EF5350', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Despesas Esperadas
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={800} sx={{ color: '#EF5350' }}>
                                        {formatCurrency(projecaoAtiva.despesasEsperadas)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* LINHA 2 — Gráfico AreaChart */}
                    <Card sx={{ ...cardStyle, mb: 2 }}>
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
                                                <stop offset="5%" stopColor="#7C6AF7" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#7C6AF7" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis
                                            dataKey="data"
                                            tickFormatter={formatDate}
                                            tick={{ fill: '#8B8BA8', fontSize: 11 }}
                                        />
                                        <YAxis
                                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                            tick={{ fill: '#8B8BA8', fontSize: 11 }}
                                            width={65}
                                        />
                                        <Tooltip
                                            formatter={(value) => [formatCurrency(value), 'Saldo Projetado']}
                                            labelFormatter={(label) => label}
                                            contentStyle={{
                                                backgroundColor: '#1A1A2E',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 8,
                                            }}
                                            labelStyle={{ color: '#8B8BA8' }}
                                        />
                                        <ReferenceLine
                                            y={projecaoAtiva.saldoAtual}
                                            stroke="rgba(255,255,255,0.25)"
                                            strokeDasharray="6 3"
                                            label={{
                                                value: 'Saldo atual',
                                                fill: '#8B8BA8',
                                                fontSize: 10,
                                                position: 'right',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="saldoProjetado"
                                            stroke="#7C6AF7"
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
                                            <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.08)' }}>
                                                Categoria
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.08)' }}>
                                                Tipo
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.08)' }}>
                                                Valor Médio
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.08)' }}>
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
                                                    '& td': { borderColor: 'rgba(255,255,255,0.06)' },
                                                }}
                                            >
                                                <TableCell>{t.categoria}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={t.tipo === 'CREDIT' ? 'RECEITA' : 'DESPESA'}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: t.tipo === 'CREDIT'
                                                                ? 'rgba(129,199,132,0.15)'
                                                                : 'rgba(239,83,80,0.15)',
                                                            color: t.tipo === 'CREDIT' ? '#81C784' : '#EF5350',
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
