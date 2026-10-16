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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { useJurosCompostos } from '../../hooks/useJurosCompostos';
import { formatCurrency } from '../../utils/formatCurrency';

// Funcao do tema: a hairline precisa mudar entre claro e escuro. Como o `sx`
// do MUI aceita callback com o tema, `sx={cardStyle}` continua valido.
const cardStyle = (t) => ({
    p: 3,
    border: `1px solid ${t.palette.lines.subtle}`,
    borderRadius: '16px',
    boxShadow: 'none',
});

const perfis = (t) => ([
    { key: 'Conservador', color: t.palette.series[1], taxa: '6% aa' },
    { key: 'Moderado',    color: t.palette.series[3], taxa: '8% aa' },
    { key: 'Arrojado',    color: t.palette.series[4], taxa: '12% aa' },
]);

const applyMask = (value) =>
    value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const stripMask = (value) =>
    Number(String(value).replace(/\./g, '')) || 0;

const JurosCompostosCalculadora = () => {
    const theme = useTheme();
    const PERFIS = perfis(theme);
    const { loading, error, resultado, calcular } = useJurosCompostos();

    const [patrimonioInicial, setPatrimonioInicial] = useState('');
    const [aporteMensal, setAporteMensal] = useState('');
    const [prazoMeses, setPrazoMeses] = useState(60);
    const [usarDadosReais, setUsarDadosReais] = useState(false);

    const handleSubmit = () => {
        calcular({
            patrimonioInicial: stripMask(patrimonioInicial),
            aporteMensal:      stripMask(aporteMensal),
            prazoMeses,
            usarDadosReais,
        });
    };

    // Monta dados do gráfico a partir do cenário Moderado (índice 1) como referência
    const dadosGrafico = resultado
        ? resultado.cenarios.flatMap((c) =>
            c.projecaoMensal
                .filter((_, i) => i % Math.max(1, Math.floor(c.projecaoMensal.length / 60)) === 0)
                .map((p) => ({ mes: p.mes, [c.perfil]: p.patrimonio }))
          ).reduce((acc, item) => {
            const existing = acc.find((a) => a.mes === item.mes);
            if (existing) {
                Object.assign(existing, item);
            } else {
                acc.push({ ...item });
            }
            return acc;
          }, [])
        : [];

    return (
        <Box>
            {/* Formulário */}
            <Card sx={cardStyle}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2.5 }}>
                        Parâmetros da simulação
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                id="patrimonioInicial"
                                name="patrimonioInicial"
                                label="Patrimônio Inicial"
                                type="text"
                                inputMode="numeric"
                                size="small"
                                value={patrimonioInicial}
                                onChange={(e) => setPatrimonioInicial(applyMask(e.target.value))}
                                helperText="Quanto você já tem investido (R$)"
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
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                Prazo: <strong>{prazoMeses} meses</strong>
                                {prazoMeses >= 12 && ` (${(prazoMeses / 12).toFixed(1)} anos)`}
                            </Typography>
                            <Slider
                                value={prazoMeses}
                                onChange={(_, v) => setPrazoMeses(v)}
                                min={12}
                                max={600}
                                step={12}
                                marks={[
                                    { value: 12,  label: '1a' },
                                    { value: 120, label: '10a' },
                                    { value: 240, label: '20a' },
                                    { value: 360, label: '30a' },
                                    { value: 600, label: '50a' },
                                ]}
                                sx={{ color: 'primary.main' }}
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
                                            (pré-preenche com seu aporte e patrimônio médios)
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
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <TrendingUpIcon />}
                            sx={{ borderRadius: '10px', px: 4 }}
                        >
                            {loading ? 'Calculando...' : 'Calcular projeção'}
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
                    {/* Total investido */}
                    <Card sx={(t) => ({ ...cardStyle(t), mb: 2 })}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                Total investido no período
                            </Typography>
                            <Typography variant="h5" fontWeight={700}>
                                {formatCurrency(resultado.totalInvestido)}
                            </Typography>
                            {resultado.dadosReaisUsados && (
                                <Chip
                                    label="Baseado nos seus dados reais"
                                    size="small"
                                    sx={(t) => ({ mt: 1, bgcolor: t.palette.accent.primarySoft, color: 'primary.main', fontSize: 11 })}
                                />
                            )}
                        </CardContent>
                    </Card>

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
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                sx={{ color: perfil.color, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.72rem', mb: 0.5 }}
                                            >
                                                {cenario.perfil}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {cenario.taxaAnual}% aa
                                            </Typography>
                                            <Typography variant="h5" fontWeight={800} sx={{ color: perfil.color, mt: 1, letterSpacing: '-0.5px' }}>
                                                {formatCurrency(cenario.montanteFinal)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                                Rendimento: {formatCurrency(cenario.rendimentoTotal)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Gráfico de evolução */}
                    {dadosGrafico.length > 0 && (
                        <Card sx={cardStyle}>
                            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                    Evolução patrimonial mensal
                                </Typography>
                                <Box sx={{ width: '100%', height: 280 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dadosGrafico} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.chart.grid} />
                                            <XAxis
                                                dataKey="mes"
                                                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                                label={{ value: 'Meses', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary, fontSize: 11 }}
                                            />
                                            <YAxis
                                                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                                width={70}
                                            />
                                            <Tooltip
                                                formatter={(value, name) => [formatCurrency(value), name]}
                                                contentStyle={{ backgroundColor: theme.palette.surfaces.raised, border: `1px solid ${theme.palette.lines.subtle}`, borderRadius: 8 }}
                                            />
                                            <Area type="monotone" dataKey="Conservador" stroke={theme.palette.series[1]} fill={`${theme.palette.series[1]}20`} strokeWidth={2} dot={false} />
                                            <Area type="monotone" dataKey="Moderado"    stroke={theme.palette.series[3]} fill={`${theme.palette.series[3]}20`} strokeWidth={2} dot={false} />
                                            <Area type="monotone" dataKey="Arrojado"    stroke={theme.palette.series[4]} fill={`${theme.palette.series[4]}20`} strokeWidth={2} dot={false} />
                                        </AreaChart>
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

export default JurosCompostosCalculadora;
