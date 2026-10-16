import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Donut, formatBRL } from '@/components/ui';
import { investimentoService } from '../../services/investimentoService';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';
import {
    CLASSES_ATIVO,
    GEOGRAFIAS,
    SETORES_B3,
    labelDaChave,
} from '../../constants/taxonomiaB3';

// Dimensões visualizáveis do breakdown. Subsetor é somente leitura
// (nunca tem alvo nem teto — contrato do backend).
const DIMENSOES = [
    { key: 'porClasse', label: 'Classe' },
    { key: 'porSetor', label: 'Setor' },
    { key: 'porSubsetor', label: 'Subsetor' },
    { key: 'porGeografia', label: 'Geografia' },
];

// Dimensões configuráveis de teto (subsetor fica de fora) e as opções de
// chave de cada uma.
const DIMENSOES_TETO = [
    { key: 'porClasse', label: 'Por classe', opcoes: CLASSES_ATIVO },
    { key: 'porSetor', label: 'Por setor', opcoes: SETORES_B3 },
    { key: 'porGeografia', label: 'Por geografia', opcoes: GEOGRAFIAS },
];

const mapaParaLinhas = (mapa) =>
    Object.entries(mapa || {}).map(([chave, teto]) => ({ chave, teto: String(teto) }));

const fmtPct = (v) => `${(v ?? 0).toFixed(1).replace('.', ',')}%`;

/**
 * Painel "Estratégia por Setores" — visualização real vs alvo vs teto por
 * dimensão (classe/setor/subsetor/geografia) + configuração de tetos de
 * alocação. Valores A CUSTO (quantidade × preço médio) vindos do backend;
 * o front apenas consome e formata.
 */
const EstrategiaSetoresPanel = ({ refreshKey = 0, onTetosSalvos }) => {
    const theme = useTheme();
    const series = theme.palette.series;

    const [breakdown, setBreakdown] = useState(null);
    const [tetos, setTetos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dimensao, setDimensao] = useState('porClasse');

    // Configuração de tetos (rascunho editável por dimensão)
    const [configAberta, setConfigAberta] = useState(false);
    const [linhasTeto, setLinhasTeto] = useState({ porClasse: [], porSetor: [], porGeografia: [] });
    // Teto por ativo individual (%): string vazia = sem limite (o PUT é
    // substituição completa — campo ausente REMOVE o limite no backend).
    const [tetoAtivoIndividual, setTetoAtivoIndividual] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [msgSalvar, setMsgSalvar] = useState(null); // { severity, texto }

    const carregar = async () => {
        setLoading(true);
        setError('');
        try {
            const [bd, tt] = await Promise.all([
                investimentoService.obterBreakdown(),
                investimentoService.obterTetos(),
            ]);
            setBreakdown(bd);
            setTetos(tt);
            setLinhasTeto({
                porClasse: mapaParaLinhas(tt?.porClasse),
                porSetor: mapaParaLinhas(tt?.porSetor),
                porGeografia: mapaParaLinhas(tt?.porGeografia),
            });
            setTetoAtivoIndividual(tt?.porAtivoIndividual != null ? String(tt.porAtivoIndividual) : '');
        } catch (err) {
            setError(extrairMensagemErroApi(err, 'Falha ao carregar a estratégia por setores.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregar();
    }, [refreshKey]);

    const itens = useMemo(() => breakdown?.[dimensao] ?? [], [breakdown, dimensao]);
    const carteiraVazia =
        !!breakdown && DIMENSOES.every(({ key }) => (breakdown[key] ?? []).length === 0);
    const semTetos =
        !!tetos &&
        Object.keys(tetos.porClasse || {}).length === 0 &&
        Object.keys(tetos.porSetor || {}).length === 0 &&
        Object.keys(tetos.porGeografia || {}).length === 0;

    const segments = useMemo(
        () =>
            itens.map((item, i) => ({
                pct: item.percentualReal ?? 0,
                color: series[i % series.length],
            })),
        [itens, series],
    );

    // ── Edição de tetos ─────────────────────────────────────────────
    const addLinha = (dim, opcoes) => {
        setLinhasTeto((prev) => {
            const usadas = new Set(prev[dim].map((l) => l.chave));
            const livre = opcoes.find((o) => !usadas.has(o.value));
            if (!livre) return prev; // todas as chaves já configuradas
            return { ...prev, [dim]: [...prev[dim], { chave: livre.value, teto: '' }] };
        });
    };

    const rmLinha = (dim, idx) =>
        setLinhasTeto((prev) => ({ ...prev, [dim]: prev[dim].filter((_, i) => i !== idx) }));

    const changeLinha = (dim, idx, campo, valor) =>
        setLinhasTeto((prev) => ({
            ...prev,
            [dim]: prev[dim].map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)),
        }));

    // Validação client-side espelhando o backend: 0 < teto ≤ 100 e chaves
    // únicas por dimensão. Tetos NÃO precisam somar 100 (limites independentes).
    const validarTetos = () => {
        // Teto por ativo individual: opcional; quando preenchido, 0 < x ≤ 100.
        if (tetoAtivoIndividual.trim() !== '') {
            const teto = parseFloat(tetoAtivoIndividual);
            if (Number.isNaN(teto) || teto <= 0 || teto > 100) {
                return 'O teto por ativo individual deve ser maior que 0 e no máximo 100.';
            }
        }
        for (const { key, label } of DIMENSOES_TETO) {
            const chaves = new Set();
            for (const linha of linhasTeto[key]) {
                const teto = parseFloat(linha.teto);
                if (Number.isNaN(teto) || teto <= 0 || teto > 100) {
                    return `Cada teto (${label.toLowerCase()}) deve ser maior que 0 e no máximo 100.`;
                }
                if (chaves.has(linha.chave)) {
                    return `Há chaves repetidas na dimensão "${label.toLowerCase()}".`;
                }
                chaves.add(linha.chave);
            }
        }
        return '';
    };

    const salvarTetos = async () => {
        setMsgSalvar(null);
        const invalido = validarTetos();
        if (invalido) {
            setMsgSalvar({ severity: 'error', texto: invalido });
            return;
        }
        // SUBSTITUIÇÃO COMPLETA: mapa vazio limpa a dimensão no backend e
        // porAtivoIndividual ausente REMOVE o limite por ativo.
        const payload = Object.fromEntries(
            DIMENSOES_TETO.map(({ key }) => [
                key,
                Object.fromEntries(linhasTeto[key].map((l) => [l.chave, parseFloat(l.teto)])),
            ]),
        );
        if (tetoAtivoIndividual.trim() !== '') {
            payload.porAtivoIndividual = parseFloat(tetoAtivoIndividual);
        }
        try {
            setSalvando(true);
            await investimentoService.salvarTetos(payload);
            setMsgSalvar({ severity: 'success', texto: 'Tetos salvos com sucesso.' });
            await carregar();
            onTetosSalvos?.();
        } catch (err) {
            setMsgSalvar({
                severity: 'error',
                texto: extrairMensagemErroApi(err, 'Falha ao salvar os tetos. Tente novamente.'),
            });
        } finally {
            setSalvando(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="estrategia-setores-loading">
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box data-testid="estrategia-setores-panel">
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Estratégia por Setores
                </Typography>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box data-testid="estrategia-setores-panel">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Estratégia por Setores
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TuneIcon />}
                    onClick={() => setConfigAberta((v) => !v)}
                    data-testid="btn-configurar-tetos"
                >
                    {configAberta ? 'Ocultar tetos' : 'Configurar tetos'}
                </Button>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Limites máximos por classe, setor e geografia — valores a custo
                (quantidade × preço médio). Tetos são independentes e não precisam somar 100%.
            </Typography>

            {/* ── Configuração de tetos ── */}
            <Collapse in={configAberta} unmountOnExit>
                <Box
                    sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: `${theme.radius?.md ?? 12}px`,
                        bgcolor: theme.palette.surfaces?.raised ?? 'background.paper',
                        border: `1px solid ${theme.palette.lines?.subtle ?? theme.palette.divider}`,
                    }}
                    data-testid="config-tetos"
                >
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
                            Por ativo individual
                        </Typography>
                        <TextField
                            label="Teto por ativo individual (%)"
                            type="number"
                            size="small"
                            value={tetoAtivoIndividual}
                            onChange={(e) => setTetoAtivoIndividual(e.target.value)}
                            helperText="Opcional — limite máximo de concentração para cada ativo. Deixe vazio para não limitar."
                            inputProps={{
                                'data-testid': 'input-teto-por-ativo',
                                min: 0,
                                max: 100,
                                step: 0.5,
                            }}
                            sx={{ mt: 1, width: 280 }}
                        />
                    </Box>

                    <Grid container spacing={3}>
                        {DIMENSOES_TETO.map(({ key, label, opcoes }) => (
                            <Grid key={key} size={{ xs: 12, md: 4 }}>
                                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                                    {label}
                                </Typography>
                                {linhasTeto[key].map((linha, idx) => (
                                    <Box key={`${key}-${idx}`} sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id={`teto-${key}-${idx}-label`}>Chave</InputLabel>
                                            <Select
                                                labelId={`teto-${key}-${idx}-label`}
                                                label="Chave"
                                                value={linha.chave}
                                                onChange={(e) => changeLinha(key, idx, 'chave', e.target.value)}
                                                inputProps={{ 'data-testid': `select-teto-${key}-${idx}` }}
                                            >
                                                {opcoes.map((o) => (
                                                    <MenuItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Teto %"
                                            type="number"
                                            size="small"
                                            value={linha.teto}
                                            onChange={(e) => changeLinha(key, idx, 'teto', e.target.value)}
                                            inputProps={{
                                                'data-testid': `input-teto-${key}-${idx}`,
                                                min: 0,
                                                max: 100,
                                                step: 0.5,
                                            }}
                                            sx={{ width: 110 }}
                                        />
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label={`remover teto ${label.toLowerCase()} ${idx + 1}`}
                                            onClick={() => rmLinha(key, idx)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => addLinha(key, opcoes)}
                                    sx={{ mt: 1 }}
                                    data-testid={`btn-add-teto-${key}`}
                                >
                                    Adicionar teto
                                </Button>
                            </Grid>
                        ))}
                    </Grid>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                        <Button
                            variant="contained"
                            disabled={salvando}
                            onClick={salvarTetos}
                            data-testid="btn-salvar-tetos"
                        >
                            {salvando ? 'Salvando...' : 'Salvar tetos'}
                        </Button>
                        {msgSalvar && (
                            <Alert severity={msgSalvar.severity} sx={{ py: 0 }}>
                                {msgSalvar.texto}
                            </Alert>
                        )}
                    </Box>
                </Box>
            </Collapse>

            {/* ── Estados vazios ── */}
            {carteiraVazia ? (
                <Alert severity="info" data-testid="estrategia-carteira-vazia">
                    Sua carteira ainda está vazia. Adicione ativos ao portfólio para
                    visualizar a composição por setores.
                </Alert>
            ) : (
                <>
                    {semTetos && !configAberta && (
                        <Alert
                            severity="info"
                            sx={{ mb: 2 }}
                            data-testid="cta-configurar-tetos"
                            action={
                                <Button size="small" onClick={() => setConfigAberta(true)}>
                                    Configurar
                                </Button>
                            }
                        >
                            Você ainda não definiu tetos de alocação. Configure limites por
                            classe, setor ou geografia para monitorar a concentração da carteira.
                        </Alert>
                    )}

                    <Tabs
                        value={dimensao}
                        onChange={(_, v) => setDimensao(v)}
                        sx={{ mb: 2, minHeight: 36 }}
                        variant="scrollable"
                        allowScrollButtonsMobile
                    >
                        {DIMENSOES.map(({ key, label }) => (
                            <Tab
                                key={key}
                                value={key}
                                label={label}
                                sx={{ minHeight: 36, py: 0.5 }}
                                data-testid={`tab-${key}`}
                            />
                        ))}
                    </Tabs>

                    {itens.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Nenhum dado nesta dimensão.
                        </Typography>
                    ) : (
                        <Grid container spacing={3} alignItems="center">
                            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Donut segments={segments} size={180} thickness={22}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Total a custo
                                    </Typography>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{ fontFamily: theme.typography.fontFamilyMono, fontWeight: 600 }}
                                    >
                                        {formatBRL(breakdown?.valorTotal)}
                                    </Typography>
                                </Donut>
                            </Grid>

                            <Grid size={{ xs: 12, md: 8 }}>
                                {itens.map((item, i) => {
                                    const cor = series[i % series.length];
                                    const excedeu = !!item.excedeuTeto;
                                    return (
                                        <Box
                                            key={item.chave}
                                            sx={{ mb: 1.75 }}
                                            data-testid={`breakdown-item-${item.chave}`}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Box
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: cor,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {labelDaChave(item.chave)}
                                                </Typography>
                                                {excedeu && (
                                                    <Chip
                                                        size="small"
                                                        color="error"
                                                        icon={<WarningAmberIcon />}
                                                        label="Acima do teto"
                                                        data-testid={`chip-acima-teto-${item.chave}`}
                                                    />
                                                )}
                                                <Box sx={{ flexGrow: 1 }} />
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: theme.typography.fontFamilyMono }}
                                                >
                                                    {formatBRL(item.valor)}
                                                </Typography>
                                            </Box>

                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(item.percentualReal ?? 0, 100)}
                                                color={excedeu ? 'error' : 'primary'}
                                                sx={{
                                                    '& .MuiLinearProgress-bar': excedeu
                                                        ? undefined
                                                        : { backgroundColor: cor },
                                                }}
                                            />

                                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontFamily: theme.typography.fontFamilyMono,
                                                        color: excedeu ? 'statusText.negative' : 'text.secondary',
                                                        fontWeight: excedeu ? 700 : 400,
                                                    }}
                                                >
                                                    Real: {fmtPct(item.percentualReal)}
                                                </Typography>
                                                {item.percentualAlvo != null && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontFamily: theme.typography.fontFamilyMono,
                                                            color: 'text.secondary',
                                                        }}
                                                    >
                                                        Alvo: {fmtPct(item.percentualAlvo)}
                                                    </Typography>
                                                )}
                                                {item.percentualTeto != null && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontFamily: theme.typography.fontFamilyMono,
                                                            color: excedeu
                                                                ? 'statusText.negative'
                                                                : 'statusText.warning',
                                                        }}
                                                    >
                                                        Teto: {fmtPct(item.percentualTeto)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Grid>
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );
};

export default EstrategiaSetoresPanel;
