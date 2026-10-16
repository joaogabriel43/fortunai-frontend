import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EastIcon from '@mui/icons-material/East';
import { RingGauge, formatBRL } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';
import { labelDaChave } from '../../constants/taxonomiaB3';

// Labels PT-BR das dimensões de alerta (contrato do backend).
const LABEL_DIMENSAO = {
    ATIVO: 'Ativo',
    CLASSE: 'Classe',
    SETOR: 'Setor',
    GEOGRAFIA: 'Geografia',
};

const fmtPct = (v) => `${(v ?? 0).toFixed(1).replace('.', ',')}%`;

// Chave do alerta: ticker cru quando ATIVO; label PT-BR quando enum.
const labelChaveAlerta = (dimensao, chave) =>
    dimensao === 'ATIVO' ? chave : labelDaChave(chave);

// Cor do score de aderência via theme: success ≥ 80, warning 50–79, error < 50.
const corDoScore = (theme, score) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
};

// Valor monetário válido para aporte: número ≥ 0.01 com no máximo 2 casas.
const VALOR_APORTE_REGEX = /^\d+([.,]\d{1,2})?$/;

/**
 * Painel "Saúde da Carteira" — score de aderência à estratégia (RingGauge),
 * alertas de concentração acima dos tetos configurados e simulador de aporte
 * inteligente. Todo o cálculo vem do backend; o front apenas consome e formata.
 */
const SaudeCarteiraPanel = ({ refreshKey = 0, onConfigurarEstrategia }) => {
    const theme = useTheme();
    const mono = theme.typography.fontFamilyMono;

    const [saude, setSaude] = useState(null); // { alertas, scoreAderencia, motivoScoreIndisponivel }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── Simulador de aporte ─────────────────────────────────────────
    const [valorAporte, setValorAporte] = useState('');
    const [valorInvalido, setValorInvalido] = useState('');
    const [simulando, setSimulando] = useState(false);
    const [sugestao, setSugestao] = useState(null);
    const [erroAporte, setErroAporte] = useState(null); // { texto, semEstrategia }

    useEffect(() => {
        let ativo = true;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const data = await investimentoService.obterAlertas();
                if (ativo) setSaude(data);
            } catch (err) {
                if (ativo) setError(extrairMensagemErroApi(err, 'Falha ao carregar a saúde da carteira.'));
            } finally {
                if (ativo) setLoading(false);
            }
        })();
        return () => { ativo = false; };
    }, [refreshKey]);

    const alertas = useMemo(() => saude?.alertas ?? [], [saude]);
    const score = saude?.scoreAderencia;

    const simular = async () => {
        setErroAporte(null);
        setSugestao(null);
        const bruto = valorAporte.trim();
        if (!VALOR_APORTE_REGEX.test(bruto) || parseFloat(bruto.replace(',', '.')) < 0.01) {
            setValorInvalido('Informe um valor de pelo menos R$ 0,01, com no máximo 2 casas decimais.');
            return;
        }
        setValorInvalido('');
        try {
            setSimulando(true);
            const data = await investimentoService.sugerirAporte(
                parseFloat(bruto.replace(',', '.')),
            );
            setSugestao(data);
        } catch (err) {
            const semEstrategia = err?.response?.status === 400;
            setErroAporte({
                texto: extrairMensagemErroApi(
                    err,
                    semEstrategia
                        ? 'Você ainda não configurou uma estratégia de alocação.'
                        : 'Falha ao simular o aporte. Tente novamente.',
                ),
                semEstrategia,
            });
        } finally {
            setSimulando(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="saude-carteira-loading">
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box data-testid="saude-carteira-panel">
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Saúde da Carteira
                </Typography>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box data-testid="saude-carteira-panel">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Saúde da Carteira
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Aderência da carteira à sua estratégia, concentrações acima dos tetos
                e sugestão de distribuição para o próximo aporte.
            </Typography>

            <Grid container spacing={3}>
                {/* ── Score de aderência ── */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                        Score de aderência
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        {score != null ? (
                            <Box data-testid="score-aderencia-gauge">
                                <RingGauge
                                    value={score}
                                    size={150}
                                    color={corDoScore(theme, score)}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{ fontFamily: mono, fontWeight: 700 }}
                                        data-testid="score-aderencia-valor"
                                    >
                                        {Math.round(score)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        de 100
                                    </Typography>
                                </RingGauge>
                            </Box>
                        ) : (
                            <Alert severity="info" data-testid="score-indisponivel" sx={{ width: '100%' }}>
                                {saude?.motivoScoreIndisponivel || 'Score indisponível.'}
                            </Alert>
                        )}
                    </Box>
                </Grid>

                {/* ── Alertas de concentração ── */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                        Alertas de concentração
                    </Typography>
                    {alertas.length === 0 ? (
                        <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}
                            data-testid="alertas-vazio"
                        >
                            <CheckCircleOutlineIcon sx={{ color: theme.palette.success.main }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Nenhuma concentração acima dos seus limites.
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ mt: 1 }}>
                            {alertas.map((a) => (
                                <Box
                                    key={`${a.dimensao}-${a.chave}`}
                                    data-testid={`alerta-${a.dimensao}-${a.chave}`}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        py: 1,
                                        borderBottom: `1px solid ${theme.palette.lines?.subtle ?? theme.palette.divider}`,
                                    }}
                                >
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        label={LABEL_DIMENSAO[a.dimensao] ?? a.dimensao}
                                        data-testid={`chip-dimensao-${a.dimensao}-${a.chave}`}
                                    />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {labelChaveAlerta(a.dimensao, a.chave)}
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <Typography variant="caption" sx={{ fontFamily: mono, color: 'text.secondary' }}>
                                        Real: {fmtPct(a.percentualReal)} / Limite: {fmtPct(a.limite)}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ fontFamily: mono, color: 'statusText.negative', fontWeight: 700 }}
                                    >
                                        +{fmtPct(a.excesso)} acima
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: theme.palette.lines?.subtle ?? 'divider' }} />

            {/* ── Simulador de aporte ── */}
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Simulador de aporte inteligente
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mt: 1, flexWrap: 'wrap' }}>
                <TextField
                    label="Valor do aporte (R$)"
                    size="small"
                    value={valorAporte}
                    onChange={(e) => setValorAporte(e.target.value)}
                    error={!!valorInvalido}
                    helperText={valorInvalido || ' '}
                    inputProps={{ 'data-testid': 'input-valor-aporte', inputMode: 'decimal' }}
                    sx={{ width: 220 }}
                />
                <Button
                    variant="contained"
                    startIcon={simulando ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
                    disabled={simulando}
                    onClick={simular}
                    data-testid="btn-simular-aporte"
                >
                    {simulando ? 'Simulando...' : 'Simular aporte'}
                </Button>
            </Box>

            {erroAporte && (
                <Alert
                    severity={erroAporte.semEstrategia ? 'info' : 'error'}
                    sx={{ mt: 1 }}
                    data-testid="erro-aporte"
                    action={
                        erroAporte.semEstrategia ? (
                            <Button
                                size="small"
                                onClick={() => onConfigurarEstrategia?.()}
                                data-testid="cta-configurar-estrategia"
                            >
                                Configurar estratégia
                            </Button>
                        ) : undefined
                    }
                >
                    {erroAporte.texto}
                </Alert>
            )}

            {sugestao && (
                <Box sx={{ mt: 2 }} data-testid="resultado-aporte">
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Distribuição sugerida para{' '}
                        <Box component="span" sx={{ fontFamily: mono, fontWeight: 700 }}>
                            {formatBRL(sugestao.valorAporte)}
                        </Box>
                        :
                    </Typography>

                    <Table size="small" sx={{ maxWidth: 480 }} data-testid="tabela-parcelas">
                        <TableHead>
                            <TableRow>
                                <TableCell>Classe</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(sugestao.parcelas ?? []).map((p) => (
                                <TableRow key={p.classe} data-testid={`parcela-${p.classe}`}>
                                    <TableCell>{labelDaChave(p.classe)}</TableCell>
                                    <TableCell align="right" sx={{ fontFamily: mono }}>
                                        {formatBRL(p.valor)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {(sugestao.valorNaoAlocavel ?? 0) > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }} data-testid="valor-nao-alocavel">
                            <Box component="span" sx={{ fontFamily: mono, fontWeight: 700 }}>
                                {formatBRL(sugestao.valorNaoAlocavel)}
                            </Box>{' '}
                            não pôde ser alocado
                            {sugestao.motivoNaoAlocavel ? ` — ${sugestao.motivoNaoAlocavel}` : '.'}
                        </Alert>
                    )}

                    {(sugestao.simulacao ?? []).length > 0 && (
                        <Box sx={{ mt: 2.5 }} data-testid="simulacao-antes-depois">
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                                Antes / depois do aporte
                            </Typography>
                            {sugestao.simulacao.map((s) => (
                                <Box
                                    key={s.classe}
                                    data-testid={`simulacao-${s.classe}`}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, flexWrap: 'wrap' }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                                        {labelDaChave(s.classe)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: mono, color: 'text.secondary' }}>
                                        {fmtPct(s.percentualAntes)}
                                    </Typography>
                                    <EastIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" sx={{ fontFamily: mono, fontWeight: 700 }}>
                                        {fmtPct(s.percentualDepois)}
                                    </Typography>
                                    {s.percentualAlvo != null && (
                                        <Typography
                                            variant="caption"
                                            sx={{ fontFamily: mono, color: 'text.secondary', ml: 1 }}
                                        >
                                            alvo: {fmtPct(s.percentualAlvo)}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    )}

                    {sugestao.disclaimer && (
                        <Alert severity="info" sx={{ mt: 2 }} data-testid="disclaimer-aporte">
                            {sugestao.disclaimer}
                        </Alert>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default SaudeCarteiraPanel;
