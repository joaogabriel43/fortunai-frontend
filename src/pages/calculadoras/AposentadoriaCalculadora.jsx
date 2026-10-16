import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    FormControlLabel,
    Grid,
    Slider,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useTheme, alpha } from '@mui/material/styles';
import { useAposentadoria } from '../../hooks/useAposentadoria';
import { formatCurrency } from '../../utils/formatCurrency';

// Funcao do tema: a hairline precisa mudar entre claro e escuro. Como o `sx`
// do MUI aceita callback com o tema, `sx={cardStyle}` continua valido.
const cardStyle = (t) => ({
    p: 3,
    border: `1px solid ${t.palette.lines.subtle}`,
    borderRadius: '16px',
    boxShadow: 'none',
});

// Perfis de risco = serie de dados comparaveis, entao saem de palette.series
// (ordem estavel, uma versao por tema).
const perfis = (t) => ([
    { key: 'Conservador', color: t.palette.series[1] },
    { key: 'Moderado',    color: t.palette.series[3] },
    { key: 'Arrojado',    color: t.palette.series[4] },
]);

const applyMask = (value) =>
    value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const stripMask = (value) =>
    Number(String(value).replace(/\./g, '')) || 0;

const AposentadoriaCalculadora = () => {
    const theme = useTheme();
    const PERFIS = perfis(theme);
    const { loading, error, resultado, calcular } = useAposentadoria();

    const [idadeAtual, setIdadeAtual] = useState(30);
    const [idadeAposentadoria, setIdadeAposentadoria] = useState(60);
    const [rendaMensalDesejada, setRendaMensalDesejada] = useState('');
    const [aporteMensal, setAporteMensal] = useState('');
    const [usarDadosReais, setUsarDadosReais] = useState(false);

    const handleSubmit = () => {
        calcular({
            idadeAtual,
            idadeAposentadoria,
            rendaMensalDesejada: stripMask(rendaMensalDesejada),
            aporteMensal:        stripMask(aporteMensal),
            usarDadosReais,
        });
    };

    // Gráfico: projeção anual do cenário Moderado
    const cenarioGrafico = resultado?.cenarios?.find((c) => c.perfil === 'Moderado')
        || resultado?.cenarios?.[0];
    const dadosGrafico = cenarioGrafico?.projecaoAnual ?? [];

    return (
        <Box>
            {/* Formulário */}
            <Card sx={cardStyle}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Planejamento de aposentadoria
                        </Typography>
                        <Chip
                            label={`IPCA referência: ${resultado ? resultado.ipca : 4.8}% aa`}
                            size="small"
                            sx={(t) => ({ bgcolor: alpha(t.palette.warning.main, 0.15), color: 'statusText.warning', fontSize: 11 })}
                        />
                    </Box>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                Idade atual: <strong>{idadeAtual} anos</strong>
                            </Typography>
                            <Slider
                                value={idadeAtual}
                                onChange={(_, v) => setIdadeAtual(v)}
                                min={18}
                                max={79}
                                step={1}
                                marks={[
                                    { value: 18, label: '18' },
                                    { value: 30, label: '30' },
                                    { value: 50, label: '50' },
                                    { value: 79, label: '79' },
                                ]}
                                sx={{ color: 'primary.main' }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                Aposentadoria: <strong>{idadeAposentadoria} anos</strong>
                            </Typography>
                            <Slider
                                value={idadeAposentadoria}
                                onChange={(_, v) => setIdadeAposentadoria(v)}
                                min={Math.max(30, idadeAtual + 1)}
                                max={90}
                                step={1}
                                marks={[
                                    { value: 45, label: '45' },
                                    { value: 60, label: '60' },
                                    { value: 75, label: '75' },
                                    { value: 90, label: '90' },
                                ]}
                                sx={{ color: 'primary.main' }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                id="rendaMensalDesejada"
                                name="rendaMensalDesejada"
                                label="Renda Mensal Desejada"
                                type="text"
                                inputMode="numeric"
                                size="small"
                                value={rendaMensalDesejada}
                                onChange={(e) => setRendaMensalDesejada(applyMask(e.target.value))}
                                helperText="Quanto quer receber por mês na aposentadoria (R$)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                id="aporteMensal"
                                name="aporteMensal"
                                label="Aporte Mensal"
                                type="text"
                                inputMode="numeric"
                                size="small"
                                value={aporteMensal}
                                onChange={(e) => setAporteMensal(applyMask(e.target.value))}
                                helperText={usarDadosReais ? 'Pré-preenchido com sua média real' : 'Quanto você investe por mês (R$)'}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={usarDadosReais}
                                        onChange={(e) => setUsarDadosReais(e.target.checked)}
                                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' } }}
                                    />
                                }
                                label={
                                    <Typography variant="body2">
                                        Usar dados reais{' '}
                                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                                            (usa seu patrimônio atual e aporte médio real)
                                        </Typography>
                                    </Typography>
                                }
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            disabled={loading || (!rendaMensalDesejada && !usarDadosReais)}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SavingsIcon />}
                            sx={{ borderRadius: '10px', px: 4 }}
                        >
                            {loading ? 'Calculando...' : 'Calcular aposentadoria'}
                        </Button>
                    </Box>

                    {error && (
                        <Typography variant="body2" color="statusText.negative" sx={{ mt: 1.5 }}>
                            {error}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Resultados */}
            {resultado && (
                <Box sx={{ mt: 3 }}>
                    {/* IPCA real usado */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                            label={`IPCA usado: ${resultado.ipca}% aa`}
                            size="small"
                            sx={(t) => ({ bgcolor: alpha(t.palette.warning.main, 0.15), color: 'statusText.warning' })}
                        />
                        {resultado.patrimonioAtual > 0 && (
                            <Chip
                                label={`Patrimônio atual: ${formatCurrency(resultado.patrimonioAtual)}`}
                                size="small"
                                sx={(t) => ({ bgcolor: t.palette.accent.primarySoft, color: 'primary.main' })}
                            />
                        )}
                    </Box>

                    {/* 3 cards de cenário */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {resultado.cenarios.map((cenario) => {
                            const perfil = PERFIS.find((p) => p.key === cenario.perfil) || {};
                            return (
                                <Grid key={cenario.perfil} size={{ xs: 12, md: 4 }}>
                                    <Card
                                        sx={{
                                            ...cardStyle(theme),
                                            borderColor: `${perfil.color}33`,
                                            background: `linear-gradient(135deg, ${perfil.color}12, ${perfil.color}06)`,
                                        }}
                                    >
                                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    sx={{ color: perfil.color, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.72rem' }}
                                                >
                                                    {cenario.perfil}
                                                </Typography>
                                                {cenario.suficiente
                                                    ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                    : <CancelIcon sx={{ color: 'error.main', fontSize: 16 }} />
                                                }
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {cenario.taxaRetornoAnual}% aa nominal · {cenario.taxaRetornoReal?.toFixed(2)}% aa real
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5 }}>
                                                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Meta:{' '}
                                                </Typography>
                                                <strong>{formatCurrency(cenario.patrimonioNecessario)}</strong>
                                            </Typography>
                                            <Typography variant="body2">
                                                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Projetado:{' '}
                                                </Typography>
                                                <strong style={{ color: cenario.suficiente ? theme.palette.statusText.positive : theme.palette.statusText.negative }}>
                                                    {formatCurrency(cenario.patrimonioProjetado)}
                                                </strong>
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                                                Aos {cenario.idadeNaAposentadoria} anos ({cenario.anosParaAposentadoria} anos de acumulação)
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Gráfico de projeção anual */}
                    {dadosGrafico.length > 0 && (
                        <Card sx={cardStyle}>
                            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                    Projeção patrimonial anual (cenário {cenarioGrafico.perfil})
                                </Typography>
                                <Box sx={{ width: '100%', height: 280 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dadosGrafico} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.chart.grid} />
                                            <XAxis
                                                dataKey="idade"
                                                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                                label={{ value: 'Idade', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary, fontSize: 11 }}
                                            />
                                            <YAxis
                                                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                                width={70}
                                            />
                                            <Tooltip
                                                formatter={(value) => [formatCurrency(value), 'Patrimônio']}
                                                labelFormatter={(label) => `Idade: ${label}`}
                                                contentStyle={{ backgroundColor: theme.palette.surfaces.raised, border: `1px solid ${theme.palette.lines.subtle}`, borderRadius: 8 }}
                                            />
                                            <ReferenceLine
                                                y={cenarioGrafico.patrimonioNecessario}
                                                stroke={theme.palette.warning.main}
                                                strokeDasharray="6 3"
                                                label={{ value: 'Meta', fill: theme.palette.statusText.warning, fontSize: 11, position: 'right' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="patrimonio"
                                                stroke={theme.palette.success.main}
                                                strokeWidth={2}
                                                dot={false}
                                                name="Patrimônio"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default AposentadoriaCalculadora;
