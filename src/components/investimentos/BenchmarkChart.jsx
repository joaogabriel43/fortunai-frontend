import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { useBenchmarks } from '../../hooks/useBenchmarks';

const formatPercent = (value) =>
    value === undefined || value === null
        ? '–'
        : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const AlphaChip = ({ label, value }) => {
    const positive = value >= 0;
    return (
        <Chip
            label={`${label}: ${positive ? '+' : ''}${formatPercent(value)}`}
            size="small"
            sx={{
                fontWeight: 600,
                bgcolor: positive ? 'rgba(56,217,137,0.12)' : 'rgba(255,99,99,0.12)',
                color: positive ? '#38D989' : '#FF6363',
                border: `1px solid ${positive ? 'rgba(56,217,137,0.3)' : 'rgba(255,99,99,0.3)'}`,
            }}
        />
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <Box
                sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 1,
                    p: 1.5,
                }}
            >
                <Typography variant="body2" fontWeight={600}>
                    {payload[0].payload.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {formatPercent(payload[0].value)}
                </Typography>
            </Box>
        );
    }
    return null;
};

const BenchmarkChart = () => {
    const { loading, error, dados } = useBenchmarks();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="error" variant="body2">
                {error}
            </Typography>
        );
    }

    if (!dados) return null;

    const chartData = [
        { name: 'Carteira', value: dados.rentabilidadeCarteira },
        { name: 'CDI', value: dados.cdi },
        { name: 'IBOV', value: dados.ibov },
        { name: 'IPCA', value: dados.ipca },
    ];

    const carteiraColor = dados.rentabilidadeCarteira >= dados.cdi ? '#38D989' : '#FF6363';

    const barColors = [carteiraColor, '#7C6AF7', '#7C6AF7', '#7C6AF7'];

    return (
        <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Rentabilidade vs Benchmarks
            </Typography>

            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, index) => (
                            <Cell key={index} fill={barColors[index]} fillOpacity={0.85} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Benchmark reference values */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2, mb: 1.5 }}>
                {[
                    { label: 'CDI', value: dados.cdi },
                    { label: 'IBOV', value: dados.ibov },
                    { label: 'IPCA', value: dados.ipca },
                ].map(({ label, value }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatPercent(value)}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Alpha chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <AlphaChip label="Alpha vs CDI" value={dados.alphaCDI} />
                <AlphaChip label="Alpha vs IBOV" value={dados.alphaIBOV} />
                <AlphaChip label="Alpha vs IPCA" value={dados.alphaIPCA} />
            </Box>
        </Box>
    );
};

export default BenchmarkChart;
