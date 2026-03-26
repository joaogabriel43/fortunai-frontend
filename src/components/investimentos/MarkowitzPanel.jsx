import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import {
    Box,
    Button,
    CircularProgress,
    Typography,
    Alert,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useMarkowitz } from '../../hooks/useMarkowitz';

const COLORS_ATUAL = '#7C6AF7';
const COLORS_OTIMA = '#00D4AA';

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const MarkowitzPanel = () => {
    const { loading, error, resultado, otimizar } = useMarkowitz();

    // Transforma os dados para o BarChart comparativo
    // Filtra resultados inválidos: se todos os pesos ótimos são 0, não renderiza gráfico
    const chartData = React.useMemo(() => {
        if (!resultado || !resultado.alocacaoOtima) return [];
        const otima = resultado.alocacaoOtima;
        const somaPesosOtimos = Object.values(otima).reduce((s, v) => s + v, 0);
        if (somaPesosOtimos < 0.01) return []; // pesos zerados = resultado inválido
        const tickers = new Set([
            ...Object.keys(resultado.alocacaoAtual || {}),
            ...Object.keys(otima),
        ]);
        return Array.from(tickers)
            .map((ticker) => ({
                ticker: ticker.replace('.SA', ''),
                atual: resultado.alocacaoAtual?.[ticker] || 0,
                otima: otima[ticker] || 0,
            }))
            .sort((a, b) => b.otima - a.otima);
    }, [resultado]);

    const hasData = chartData.length > 0;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                    Otimizador Markowitz
                </Typography>
                <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                    disabled={loading}
                    onClick={otimizar}
                    sx={{
                        bgcolor: '#7C6AF7',
                        '&:hover': { bgcolor: '#6B5CE7' },
                        textTransform: 'none',
                        fontWeight: 600,
                    }}
                >
                    {loading ? 'Otimizando...' : 'Otimizar Portfólio'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {!hasData && !loading && !error && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        Clique em "Otimizar Portfólio" para calcular a alocação ótima
                        usando o modelo Markowitz (Monte Carlo + Sharpe).
                    </Typography>
                </Box>
            )}

            {hasData && (
                <>
                    <Box sx={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barGap={4}>
                                <XAxis
                                    dataKey="ticker"
                                    tick={{ fill: '#aaa', fontSize: 12 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tickFormatter={formatPercent}
                                    tick={{ fill: '#aaa', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={50}
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        formatPercent(value),
                                        name === 'atual' ? 'Alocação Atual' : 'Alocação Ótima',
                                    ]}
                                    contentStyle={{
                                        background: '#1a1a2e',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 8,
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend
                                    formatter={(value) =>
                                        value === 'atual' ? 'Alocação Atual' : 'Alocação Ótima (Markowitz)'
                                    }
                                    wrapperStyle={{ color: '#aaa', fontSize: 12 }}
                                />
                                <Bar dataKey="atual" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {chartData.map((_, idx) => (
                                        <Cell key={`atual-${idx}`} fill={COLORS_ATUAL} opacity={0.6} />
                                    ))}
                                </Bar>
                                <Bar dataKey="otima" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {chartData.map((_, idx) => (
                                        <Cell key={`otima-${idx}`} fill={COLORS_OTIMA} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>

                    {resultado?.taxaLivreDeRisco > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Taxa livre de risco (Selic): {formatPercent(resultado.taxaLivreDeRisco)} a.a.
                            &nbsp;|&nbsp; Simulação: 10.000 portfólios aleatórios (Monte Carlo)
                        </Typography>
                    )}
                </>
            )}
        </Box>
    );
};

export default MarkowitzPanel;
