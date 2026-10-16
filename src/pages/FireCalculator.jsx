import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    LinearProgress,
    TextField,
    Typography,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useTheme, alpha } from '@mui/material/styles';
import { useFireCalculator } from '../hooks/useFireCalculator';
import { formatCurrency } from '../utils/formatCurrency';

// Funcao do tema: a hairline precisa mudar entre claro e escuro. Como o `sx`
// do MUI aceita callback com o tema, `sx={cardStyle}` continua valido.
const cardStyle = (t) => ({
    p: 3,
    border: `1px solid ${t.palette.lines.subtle}`,
    borderRadius: '16px',
    boxShadow: 'none',
});

// Perfis de risco = serie de dados comparaveis (palette.series).
const perfis = (t) => ([
    { key: 'conservador', label: 'Conservador', taxa: '6% aa',  color: t.palette.series[1], anosKey: 'anosAteFireConservador', idadeKey: 'idadeFireConservador' },
    { key: 'moderado',    label: 'Moderado',    taxa: '8% aa',  color: t.palette.series[3], anosKey: 'anosAteFireModerado',    idadeKey: 'idadeFireModerado' },
    { key: 'arrojado',    label: 'Arrojado',    taxa: '12% aa', color: t.palette.series[4], anosKey: 'anosAteFireArrojado',    idadeKey: 'idadeFireArrojado' },
]);

// Gera dados de projeção patrimonial para o gráfico
function gerarDadosGrafico(patrimonioAtual, aporteMensal, resultado) {
    if (!resultado) return [];

    const pv  = Number(patrimonioAtual) || 0;
    const pmt = (Number(aporteMensal) || 0) * 12;

    const taxas = {
        conservador: 0.06,
        moderado:    0.08,
        arrojado:    0.12,
    };

    const maxAnos = Math.min(
        Math.ceil(resultado.anosAteFireConservador || 0) + 2,
        60
    );

    const dados = [];
    for (let ano = 0; ano <= maxAnos; ano++) {
        const ponto = { ano };
        for (const [perfil, r] of Object.entries(taxas)) {
            const fv = pmt === 0
                ? pv * Math.pow(1 + r, ano)
                : pv * Math.pow(1 + r, ano) + pmt * (Math.pow(1 + r, ano) - 1) / r;
            ponto[perfil] = Math.round(fv);
        }
        dados.push(ponto);
    }
    return dados;
}

const FireCalculator = () => {
    const theme = useTheme();
    const PERFIS = perfis(theme);
    const { loading, error, resultado, calcular } = useFireCalculator();

    const [form, setForm] = useState({
        patrimonioAtual: '',
        aporteMensal:    '',
        despesaMensal:   '',
        idadeAtual:      '',
    });

    const CURRENCY_FIELDS = ['patrimonioAtual', 'aporteMensal', 'despesaMensal'];

    const applyMask = (value) =>
        value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const stripMask = (value) =>
        Number(String(value).replace(/\./g, '')) || 0;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (CURRENCY_FIELDS.includes(name)) {
            setForm((prev) => ({ ...prev, [name]: applyMask(value) }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = () => {
        calcular({
            patrimonioAtual: stripMask(form.patrimonioAtual),
            aporteMensal:    stripMask(form.aporteMensal),
            despesaMensal:   stripMask(form.despesaMensal),
            idadeAtual:      Number(form.idadeAtual) || 0,
        });
    };

    const dadosGrafico = gerarDadosGrafico(stripMask(form.patrimonioAtual), stripMask(form.aporteMensal), resultado);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <RocketLaunchIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        FIRE Calculator
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Calcule quanto tempo falta para sua independência financeira
                    </Typography>
                </Box>
            </Box>

            {/* SEÇÃO 1 — Formulário */}
            <Card sx={cardStyle}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2.5 }}>
                        Seus dados financeiros
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                id="patrimonioAtual"
                                name="patrimonioAtual"
                                label="Patrimônio Atual"
                                type="text"
                                inputMode="numeric"
                                size="small"
                                value={form.patrimonioAtual}
                                onChange={handleChange}
                                helperText="Total investido hoje (R$)"
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
                                value={form.aporteMensal}
                                onChange={handleChange}
                                helperText="Quanto você investe por mês (R$)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                id="despesaMensal"
                                name="despesaMensal"
                                label="Despesa Mensal"
                                type="text"
                                inputMode="numeric"
                                size="small"
                                value={form.despesaMensal}
                                onChange={handleChange}
                                helperText="Seus gastos mensais atuais (R$)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                id="idadeAtual"
                                name="idadeAtual"
                                label="Idade Atual"
                                type="number"
                                size="small"
                                value={form.idadeAtual}
                                onChange={handleChange}
                                inputProps={{ min: 18, max: 80 }}
                                helperText="Sua idade hoje (18–80)"
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            disabled={loading || !form.despesaMensal || stripMask(form.despesaMensal) <= 0}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RocketLaunchIcon />}
                            sx={{ borderRadius: '10px', px: 4 }}
                        >
                            {loading ? 'Calculando...' : 'Calcular minha independência financeira'}
                        </Button>
                    </Box>

                    {error && (
                        <Typography variant="body2" color="statusText.negative" sx={{ mt: 1.5 }}>
                            {error}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* SEÇÃO 2 — Resultado */}
            {resultado && (
                <Box sx={{ mt: 3 }}>
                    {/* Hero: meta FIRE */}
                    <Card sx={(t) => ({ ...cardStyle(t), background: `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.15)}, ${alpha(t.palette.primary.main, 0.05)})`, mb: 2 })}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                Meta FIRE — Patrimônio necessário para viver de renda
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: 'primary.main', letterSpacing: '-1px' }}>
                                {formatCurrency(resultado.metaPatrimonioFIRE)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Baseado na Regra dos 4% (25× sua despesa anual)
                            </Typography>

                            <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Progresso atual
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600}>
                                        {resultado.percentualAtingido.toFixed(1)}%
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(resultado.percentualAtingido, 100)}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: theme.palette.lines.subtle,
                                        '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>

                    {/* 3 cards por perfil */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {PERFIS.map(({ key, label, taxa, color, anosKey, idadeKey }) => {
                            const anos  = resultado[anosKey];
                            const idade = resultado[idadeKey];
                            return (
                                <Grid key={key} size={{ xs: 12, md: 4 }}>
                                    <Card
                                        sx={{
                                            ...cardStyle(theme),
                                            borderColor: `${color}33`,
                                            background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                                        }}
                                    >
                                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                            <Typography variant="body2" fontWeight={700} sx={{ color, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.72rem' }}>
                                                {label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {taxa}
                                            </Typography>
                                            <Typography variant="h4" fontWeight={800} sx={{ color, mt: 1, letterSpacing: '-1px' }}>
                                                {anos != null ? Math.ceil(anos) : '–'}
                                                <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                                    anos
                                                </Typography>
                                            </Typography>
                                            {idade != null && (
                                                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                                    Aos {idade} anos de idade
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Gráfico de projeção */}
                    <Card sx={cardStyle}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Evolução patrimonial projetada
                            </Typography>
                            <Box sx={{ width: '100%', height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dadosGrafico} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.chart.grid} />
                                        <XAxis
                                            dataKey="ano"
                                            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                            label={{ value: 'Anos', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary, fontSize: 11 }}
                                        />
                                        <YAxis
                                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                            width={70}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [formatCurrency(value), name]}
                                            contentStyle={{ backgroundColor: theme.palette.surfaces.raised, border: `1px solid ${theme.palette.lines.subtle}`, borderRadius: 8 }}
                                            labelStyle={{ color: theme.palette.text.secondary }}
                                        />
                                        <ReferenceLine
                                            y={resultado.metaPatrimonioFIRE}
                                            stroke={theme.palette.primary.main}
                                            strokeDasharray="6 3"
                                            label={{ value: 'Meta FIRE', fill: theme.palette.primary.main, fontSize: 11, position: 'right' }}
                                        />
                                        <Bar dataKey="conservador" name="Conservador" fill={theme.palette.series[1]} radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="moderado"    name="Moderado"    fill={theme.palette.series[3]} radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="arrojado"    name="Arrojado"    fill={theme.palette.series[4]} radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    );
};

export default FireCalculator;
