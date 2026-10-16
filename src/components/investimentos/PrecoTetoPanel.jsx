import React, { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Slider,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatBRL } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';

// Rótulos PT-BR da origem do preço atual (contrato do backend).
const LABEL_ORIGEM = {
    COTACAO: 'cotação',
    PRECO_MEDIO: 'preço médio',
    MANUAL: 'manual',
};

// Percentual com vírgula decimal PT-BR e sinal explícito (+/−).
// A margem de segurança já chega em pontos percentuais do backend (ex.: 15.3 = 15,3%).
const fmtMargem = (v) => {
    const n = v ?? 0;
    const sinal = n >= 0 ? '+' : '−';
    return `${sinal}${Math.abs(n).toFixed(1).replace('.', ',')}%`;
};

// Yield decimal (ex.: 0.06) → percentual legível "6%".
const fmtYieldPct = (dec) => `${(dec * 100).toFixed(1).replace('.', ',').replace(',0', '')}%`;

// Número decimal opcional a partir de um input de texto (aceita vírgula PT-BR).
// Retorna undefined quando vazio/ inválido — para omitir o campo do payload.
const parseOpcional = (bruto) => {
    const t = (bruto ?? '').trim();
    if (!t) return undefined;
    const n = parseFloat(t.replace(',', '.'));
    return Number.isNaN(n) ? undefined : n;
};

/**
 * Célula de um método de valuation (Bazin ou Graham) para uma ação.
 * VALIDO → teto (BRL mono) + margem de segurança colorida pelo veredito.
 * INVALIDO/SEM_DADOS → o `motivo` textual, nunca um número quebrado.
 */
const MetodoValuationCell = ({ metodo, campoTeto, testIdBase }) => {
    const theme = useTheme();
    const mono = theme.typography.fontFamilyMono;

    if (!metodo || metodo.status !== 'VALIDO') {
        const motivo = metodo?.motivo || 'Sem dados suficientes.';
        return (
            <Box data-testid={`${testIdBase}-indisponivel`}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {motivo}
                </Typography>
            </Box>
        );
    }

    const teto = metodo[campoTeto];
    const abaixo = metodo.veredito === 'ABAIXO_DO_TETO';
    const cor = abaixo ? theme.palette.success.main : theme.palette.error.main;
    const corTexto = abaixo ? theme.palette.statusText.positive : theme.palette.statusText.negative;
    const IconeVeredito = abaixo ? TrendingDownIcon : TrendingUpIcon;

    return (
        <Box data-testid={`${testIdBase}-valido`}>
            <Typography
                variant="body2"
                sx={{ fontFamily: mono, fontWeight: 700 }}
                data-testid={`${testIdBase}-teto`}
            >
                {formatBRL(teto)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <IconeVeredito sx={{ fontSize: 15, color: cor }} />
                <Typography
                    variant="caption"
                    sx={{ fontFamily: mono, fontWeight: 700, color: corTexto }}
                    data-testid={`${testIdBase}-margem`}
                >
                    {fmtMargem(metodo.margemSeguranca)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {abaixo ? 'barata' : 'cara'}
                </Typography>
            </Box>
        </Box>
    );
};

/**
 * Painel "Preço-Teto (Valuation)" — calcula, para cada ação da carteira, o
 * preço máximo justificável pelos métodos Bazin (dividendos + yield desejado)
 * e Graham (valor intrínseco por LPA e VPA). Inclui controle de yield, um
 * avaliador avulso para tickers fora da carteira e o disclaimer da API.
 * Todo o cálculo vem do backend; o front apenas consome e formata (ADR-001).
 */
const PrecoTetoPanel = ({ refreshKey = 0 }) => {
    const theme = useTheme();
    const mono = theme.typography.fontFamilyMono;

    // ── Tabela da carteira (GET) ────────────────────────────────────
    const [dados, setDados] = useState(null); // { yieldDesejado, ativos, disclaimer }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Controle de yield desejado (Bazin). Percentual na UI, decimal na API.
    const [yieldPct, setYieldPct] = useState(6); // valor "ao vivo" do slider/input
    const [yieldAplicado, setYieldAplicado] = useState(0.06); // valor que dispara o GET

    useEffect(() => {
        let ativo = true;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const data = await investimentoService.obterPrecoTeto(yieldAplicado);
                if (ativo) setDados(data);
            } catch (err) {
                if (ativo) setError(extrairMensagemErroApi(err, 'Falha ao carregar a análise de preço-teto.'));
            } finally {
                if (ativo) setLoading(false);
            }
        })();
        return () => { ativo = false; };
    }, [yieldAplicado, refreshKey]);

    const ativos = useMemo(() => dados?.ativos ?? [], [dados]);

    const aplicarYield = () => {
        const dec = Number((yieldPct / 100).toFixed(4));
        if (dec > 0) setYieldAplicado(dec);
    };

    // ── Avaliador avulso (POST) ─────────────────────────────────────
    const [avulso, setAvulso] = useState({
        ticker: '',
        precoAtual: '',
        dividendoAnual: '',
        lpa: '',
        vpa: '',
    });
    const [avaliando, setAvaliando] = useState(false);
    const [erroAvulso, setErroAvulso] = useState('');
    const [resultadoAvulso, setResultadoAvulso] = useState(null); // { yieldDesejado, analise, disclaimer }

    const handleAvulso = (campo) => (e) => {
        const valor = campo === 'ticker' ? e.target.value.toUpperCase() : e.target.value;
        setAvulso((prev) => ({ ...prev, [campo]: valor }));
    };

    const avaliarAvulso = async () => {
        setErroAvulso('');
        setResultadoAvulso(null);

        if (!avulso.ticker.trim()) {
            setErroAvulso('Informe o ticker do ativo a avaliar.');
            return;
        }
        const precoAtual = parseOpcional(avulso.precoAtual);
        if (precoAtual != null && precoAtual <= 0) {
            setErroAvulso('O preço atual, quando informado, deve ser maior que zero.');
            return;
        }

        const payload = { ticker: avulso.ticker.trim(), yieldDesejado: yieldAplicado };
        if (precoAtual != null) payload.precoAtual = precoAtual;
        const dividendoAnual = parseOpcional(avulso.dividendoAnual);
        if (dividendoAnual != null) payload.dividendoAnual = dividendoAnual;
        const lpa = parseOpcional(avulso.lpa);
        if (lpa != null) payload.lpa = lpa;
        const vpa = parseOpcional(avulso.vpa);
        if (vpa != null) payload.vpa = vpa;

        try {
            setAvaliando(true);
            const data = await investimentoService.avaliarPrecoTetoAvulso(payload);
            setResultadoAvulso(data);
        } catch (err) {
            setErroAvulso(extrairMensagemErroApi(err, 'Falha ao avaliar o ativo. Verifique os dados e tente novamente.'));
        } finally {
            setAvaliando(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────
    return (
        <Box data-testid="preco-teto-panel">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Preço-Teto (Valuation)
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Preço máximo justificável para cada ação da carteira pelos métodos Bazin e Graham.
                São metodologias de referência — não constituem recomendação de compra ou venda.
            </Typography>

            {/* ── Explicação dos métodos ── */}
            <Accordion
                disableGutters
                elevation={0}
                sx={{ bgcolor: 'transparent', border: `1px solid ${theme.palette.lines?.subtle ?? theme.palette.divider}`, borderRadius: 2, mb: 2.5, '&:before': { display: 'none' } }}
                data-testid="metodos-explicacao"
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Como funcionam Bazin e Graham?
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>Método Bazin:</Box>{' '}
                        estima o preço máximo a pagar por uma ação a partir dos dividendos pagos e do
                        yield (dividend yield) que você deseja receber. Preço-teto = dividendo anual ÷
                        yield desejado.
                    </Typography>
                    <Typography variant="body2">
                        <Box component="span" sx={{ fontWeight: 700 }}>Método Graham:</Box>{' '}
                        estima o valor intrínseco da ação combinando o lucro por ação (LPA) e o valor
                        patrimonial por ação (VPA). Número de Graham = √(22,5 × LPA × VPA).
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                        Ambos são apenas metodologias de análise — não são recomendação de investimento.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* ── Controle de yield desejado (Bazin) ── */}
            <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                        Yield desejado (Bazin)
                    </Typography>
                    <Tooltip title="Dividend yield mínimo que você quer receber. Quanto maior o yield exigido, menor o preço-teto Bazin.">
                        <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                    </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Slider
                        value={yieldPct}
                        onChange={(_, v) => setYieldPct(Array.isArray(v) ? v[0] : v)}
                        onChangeCommitted={(_, v) => {
                            const dec = Number(((Array.isArray(v) ? v[0] : v) / 100).toFixed(4));
                            if (dec > 0) setYieldAplicado(dec);
                        }}
                        min={1}
                        max={15}
                        step={0.5}
                        sx={{ width: 220, maxWidth: '100%' }}
                        data-testid="slider-yield"
                        aria-label="Yield desejado em porcentagem"
                    />
                    <TextField
                        label="Yield (%)"
                        size="small"
                        type="number"
                        value={yieldPct}
                        onChange={(e) => setYieldPct(parseFloat(e.target.value) || 0)}
                        inputProps={{ 'data-testid': 'input-yield', min: 0.1, step: 0.5 }}
                        sx={{ width: 120 }}
                    />
                    <Button
                        variant="outlined"
                        onClick={aplicarYield}
                        data-testid="btn-aplicar-yield"
                    >
                        Aplicar
                    </Button>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="yield-aplicado">
                        Aplicado: {fmtYieldPct(yieldAplicado)}
                    </Typography>
                </Box>
            </Box>

            {/* ── Tabela por ação ── */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="preco-teto-loading">
                    <CircularProgress size={28} />
                </Box>
            ) : error ? (
                <Alert severity="error" data-testid="preco-teto-erro">{error}</Alert>
            ) : ativos.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }} data-testid="preco-teto-vazio">
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Adicione ações à carteira para ver a análise de preço-teto.
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" data-testid="tabela-preco-teto">
                        <TableHead>
                            <TableRow>
                                <TableCell>Ativo</TableCell>
                                <TableCell align="right">Preço atual</TableCell>
                                <TableCell>Bazin</TableCell>
                                <TableCell>Graham</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ativos.map((a) => (
                                <TableRow key={a.ticker} data-testid={`linha-${a.ticker}`}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {a.ticker}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {a.precoAtual != null ? (
                                            <>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: mono }}
                                                    data-testid={`preco-atual-${a.ticker}`}
                                                >
                                                    {formatBRL(a.precoAtual)}
                                                </Typography>
                                                {a.origemPreco && LABEL_ORIGEM[a.origemPreco] && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: 'text.secondary' }}
                                                        data-testid={`origem-preco-${a.ticker}`}
                                                    >
                                                        {LABEL_ORIGEM[a.origemPreco]}
                                                    </Typography>
                                                )}
                                            </>
                                        ) : (
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <MetodoValuationCell
                                            metodo={a.bazin}
                                            campoTeto="precoTeto"
                                            testIdBase={`bazin-${a.ticker}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <MetodoValuationCell
                                            metodo={a.graham}
                                            campoTeto="numeroGraham"
                                            testIdBase={`graham-${a.ticker}`}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            <Divider sx={{ my: 3, borderColor: theme.palette.lines?.subtle ?? 'divider' }} />

            {/* ── Avaliador avulso ── */}
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Avaliar um ticker fora da carteira
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                Simule o preço-teto de qualquer ação antes de comprar. Os campos manuais
                (dividendo anual, LPA, VPA e preço) têm precedência sobre os dados da fonte.
            </Typography>

            <Box component="form" onSubmit={(e) => { e.preventDefault(); avaliarAvulso(); }} noValidate data-testid="avulso-form">
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            label="Ticker"
                            size="small"
                            fullWidth
                            required
                            value={avulso.ticker}
                            onChange={handleAvulso('ticker')}
                            placeholder="Ex: BBAS3"
                            inputProps={{ 'data-testid': 'avulso-ticker', maxLength: 20 }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                            label="Preço atual (R$)"
                            size="small"
                            fullWidth
                            value={avulso.precoAtual}
                            onChange={handleAvulso('precoAtual')}
                            inputProps={{ 'data-testid': 'avulso-preco', inputMode: 'decimal' }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            label="Dividendo anual (R$)"
                            size="small"
                            fullWidth
                            value={avulso.dividendoAnual}
                            onChange={handleAvulso('dividendoAnual')}
                            inputProps={{ 'data-testid': 'avulso-dividendo', inputMode: 'decimal' }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            label="LPA (R$)"
                            size="small"
                            fullWidth
                            value={avulso.lpa}
                            onChange={handleAvulso('lpa')}
                            inputProps={{ 'data-testid': 'avulso-lpa', inputMode: 'decimal' }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            label="VPA (R$)"
                            size="small"
                            fullWidth
                            value={avulso.vpa}
                            onChange={handleAvulso('vpa')}
                            inputProps={{ 'data-testid': 'avulso-vpa', inputMode: 'decimal' }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                A avaliação usa o yield desejado configurado acima ({fmtYieldPct(yieldAplicado)}).
                                Campos deixados em branco são buscados na fonte de dados.
                            </Typography>
                        </Box>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={avaliando}
                            startIcon={avaliando ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
                            data-testid="btn-avaliar-avulso"
                        >
                            {avaliando ? 'Avaliando...' : 'Avaliar preço-teto'}
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            {erroAvulso && (
                <Alert severity="error" sx={{ mt: 2 }} data-testid="avulso-erro">{erroAvulso}</Alert>
            )}

            {resultadoAvulso?.analise && (
                <Box sx={{ mt: 2.5 }} data-testid="avulso-resultado">
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ativo</TableCell>
                                    <TableCell align="right">Preço atual</TableCell>
                                    <TableCell>Bazin</TableCell>
                                    <TableCell>Graham</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow data-testid={`avulso-linha-${resultadoAvulso.analise.ticker}`}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {resultadoAvulso.analise.ticker}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {resultadoAvulso.analise.precoAtual != null ? (
                                            <Typography variant="body2" sx={{ fontFamily: mono }} data-testid="avulso-preco-atual">
                                                {formatBRL(resultadoAvulso.analise.precoAtual)}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <MetodoValuationCell
                                            metodo={resultadoAvulso.analise.bazin}
                                            campoTeto="precoTeto"
                                            testIdBase="avulso-bazin"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <MetodoValuationCell
                                            metodo={resultadoAvulso.analise.graham}
                                            campoTeto="numeroGraham"
                                            testIdBase="avulso-graham"
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                </Box>
            )}

            {/* ── Disclaimer sempre visível (renderizado da API) ── */}
            {(dados?.disclaimer || resultadoAvulso?.disclaimer) && (
                <Alert severity="warning" sx={{ mt: 3 }} data-testid="preco-teto-disclaimer">
                    {dados?.disclaimer || resultadoAvulso?.disclaimer}
                </Alert>
            )}
        </Box>
    );
};

export default PrecoTetoPanel;
