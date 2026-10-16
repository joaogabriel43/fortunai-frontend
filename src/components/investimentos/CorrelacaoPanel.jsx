import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import GrainIcon from '@mui/icons-material/Grain';
import { RingGauge } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';

/**
 * Painel de análise de risco por correlação (ADR-030): heatmap SVG da matriz de
 * correlação de Pearson, pares altamente correlacionados (ρ > 0,70), score de
 * diversificação (RingGauge) e ativos excluídos por histórico insuficiente.
 */

const fmtRho = (v) => (v ?? 0).toFixed(2).replace('.', ',');

// Cor da célula via theme (regra D4): ρ positivo puxa error (risco de concentração),
// negativo puxa success (diversifica). Intensidade = |ρ|. Diagonal neutra.
const corDaCelula = (theme, rho, ehDiagonal) => {
    if (ehDiagonal) return theme.palette.action.selected;
    const base = rho >= 0 ? theme.palette.error.main : theme.palette.success.main;
    const alpha = Math.min(1, Math.abs(rho)) * 0.85 + 0.05;
    return `${base}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
};

const corDoScore = (theme, score) => {
    if (score >= 70) return theme.palette.success.main;
    if (score >= 40) return theme.palette.warning.main;
    return theme.palette.error.main;
};

const fmtBeta = (v) => (v ?? 0).toFixed(2).replace('.', ',');
const fmtAlphaPct = (v) => `${(v * 100).toFixed(2).replace('.', ',')}%`;

const CorrelacaoPanel = ({ refreshKey }) => {
    const theme = useTheme();
    const [analise, setAnalise] = useState(null);
    const [alphaBeta, setAlphaBeta] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        Promise.all([
            investimentoService.obterAnaliseCorrelacao(),
            investimentoService.obterAlphaBeta(),
        ])
            .then(([correlacao, ab]) => {
                if (ativo) {
                    setAnalise(correlacao);
                    setAlphaBeta(ab);
                }
            })
            .catch((e) => {
                if (ativo) setErro(extrairMensagemErroApi(e, 'Não foi possível carregar a análise de correlação.'));
            })
            .finally(() => { if (ativo) setCarregando(false); });
        return () => { ativo = false; };
    }, [refreshKey]);

    if (carregando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }
    if (erro) {
        return <Alert severity="error">{erro}</Alert>;
    }
    if (!analise) return null;

    const { tickers, matrizCorrelacao, paresAltaCorrelacao, scoreDiversificacao,
        motivoIndisponivel, ativosExcluidos, disclaimer } = analise;

    const n = tickers?.length ?? 0;
    const CELULA = 44;
    const ROTULO = 64;
    const lado = ROTULO + n * CELULA;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <GrainIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                <Typography variant="h6">Correlação da carteira</Typography>
            </Box>

            {motivoIndisponivel ? (
                <Alert severity="info">{motivoIndisponivel}</Alert>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
                    {/* Heatmap SVG da matriz de correlação */}
                    <Box sx={{ overflowX: 'auto' }} data-testid="heatmap-correlacao">
                        <svg width={lado} height={lado} role="img"
                             aria-label="Matriz de correlação entre os ativos da carteira">
                            {tickers.map((t, j) => (
                                <text key={`col-${t}`} x={ROTULO + j * CELULA + CELULA / 2} y={ROTULO - 8}
                                      textAnchor="middle" fontSize="11"
                                      fill={theme.palette.text.secondary}>{t}</text>
                            ))}
                            {tickers.map((t, i) => (
                                <text key={`lin-${t}`} x={ROTULO - 8} y={ROTULO + i * CELULA + CELULA / 2 + 4}
                                      textAnchor="end" fontSize="11"
                                      fill={theme.palette.text.secondary}>{t}</text>
                            ))}
                            {matrizCorrelacao.map((linha, i) => linha.map((rho, j) => (
                                <g key={`cel-${i}-${j}`}>
                                    <rect x={ROTULO + j * CELULA} y={ROTULO + i * CELULA}
                                          width={CELULA - 2} height={CELULA - 2} rx={4}
                                          fill={corDaCelula(theme, rho, i === j)} />
                                    <text x={ROTULO + j * CELULA + (CELULA - 2) / 2}
                                          y={ROTULO + i * CELULA + (CELULA - 2) / 2 + 4}
                                          textAnchor="middle" fontSize="11"
                                          fontFamily={theme.typography.fontFamilyMono}
                                          fill={theme.palette.text.primary}>
                                        {fmtRho(rho)}
                                    </text>
                                </g>
                            )))}
                        </svg>
                    </Box>

                    {/* Score de diversificação */}
                    {scoreDiversificacao != null && (
                        <Box sx={{ textAlign: 'center' }}>
                            <RingGauge
                                value={scoreDiversificacao}
                                size={110}
                                color={corDoScore(theme, scoreDiversificacao)}
                            >
                                <Typography variant="h6" sx={{ fontFamily: theme.typography.fontFamilyMono }}>
                                    {scoreDiversificacao}
                                </Typography>
                            </RingGauge>
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                Diversificação
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Pares altamente correlacionados */}
            {paresAltaCorrelacao?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Pares altamente correlacionados (ρ &gt; 0,70)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {paresAltaCorrelacao.map((par) => (
                            <Tooltip key={`${par.tickerA}-${par.tickerB}`}
                                     title="Estes ativos tendem a se mover juntos — concentram o mesmo risco.">
                                <Chip
                                    color="warning"
                                    variant="outlined"
                                    label={`${par.tickerA} × ${par.tickerB} · ρ ${fmtRho(par.correlacao)}`}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Ativos fora da matriz */}
            {ativosExcluidos?.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    Fora da análise: {ativosExcluidos.map((a) => `${a.ticker} (${a.motivo})`).join(' · ')}
                </Alert>
            )}

            {/* Alpha & Beta vs benchmark (ADR-031) */}
            {alphaBeta && (
                <Box sx={{ mt: 3 }} data-testid="secao-alpha-beta">
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Alpha &amp; Beta {alphaBeta.benchmark ? `vs ${alphaBeta.benchmark}` : ''}
                        {alphaBeta.betaCarteira != null && (
                            <Chip size="small" sx={{ ml: 1 }} variant="outlined"
                                  label={`β carteira ${fmtBeta(alphaBeta.betaCarteira)}`} />
                        )}
                    </Typography>
                    {alphaBeta.motivoIndisponivel ? (
                        <Alert severity="info">{alphaBeta.motivoIndisponivel}</Alert>
                    ) : (
                        <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', maxWidth: 460 }}>
                            <Box component="thead">
                                <Box component="tr">
                                    {['Ativo', 'Beta', 'Alpha (a.a.)', 'Sharpe (a.a.)'].map((h) => (
                                        <Box key={h} component="th" sx={{
                                            textAlign: h === 'Ativo' ? 'left' : 'right', py: 0.5, px: 1,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            color: theme.palette.text.secondary,
                                            typography: 'caption',
                                        }}>{h}</Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {alphaBeta.itens.map((item) => (
                                    <Box key={item.ticker} component="tr">
                                        <Box component="td" sx={{ py: 0.5, px: 1, typography: 'body2' }}>
                                            {item.ticker}
                                        </Box>
                                        <Box component="td" sx={{
                                            py: 0.5, px: 1, textAlign: 'right', typography: 'body2',
                                            fontFamily: theme.typography.fontFamilyMono,
                                        }}>
                                            {fmtBeta(item.beta)}
                                        </Box>
                                        <Box component="td" sx={{
                                            py: 0.5, px: 1, textAlign: 'right', typography: 'body2',
                                            fontFamily: theme.typography.fontFamilyMono,
                                            color: item.alphaAnualizado >= 0
                                                ? theme.palette.statusText.positive
                                                : theme.palette.statusText.negative,
                                        }}>
                                            {fmtAlphaPct(item.alphaAnualizado)}
                                        </Box>
                                        <Box component="td" sx={{
                                            py: 0.5, px: 1, textAlign: 'right', typography: 'body2',
                                            fontFamily: theme.typography.fontFamilyMono,
                                        }}>
                                            {item.sharpeAnualizado != null ? item.sharpeAnualizado.toFixed(2) : '—'}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">{disclaimer}</Typography>
        </Box>
    );
};

export default CorrelacaoPanel;
