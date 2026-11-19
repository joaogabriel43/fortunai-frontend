import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SellIcon from '@mui/icons-material/Sell';
import { formatBRL, formatQuantidade } from '../ui';
import { logErroSeguro } from '../../utils/apiErrorUtils';
import { GRUPOS_ATIVO, GRUPO_OUTROS, grupoDoTipo } from '../../constants/gruposAtivo';

// Subtotal de exibição: soma, em centavos, valores que o backend já calculou
// por ativo (totalAtual, lucroPrejuizo). Nenhum cálculo financeiro novo.
const somar = (ativos, campo) =>
    ativos.reduce((acc, ativo) => acc + Math.round((Number(ativo[campo]) || 0) * 100), 0) / 100;

// Grupos na ordem fixa de GRUPOS_ATIVO ("Outros" por último), sem grupo vazio;
// dentro do grupo, maior valor atual primeiro.
const agruparPorTipo = (portfolio) =>
    [...GRUPOS_ATIVO, GRUPO_OUTROS]
        .map((grupo) => {
            const ativos = portfolio
                .filter((ativo) => grupoDoTipo(ativo.tipoAtivo).tipo === grupo.tipo)
                .sort((a, b) => (Number(b.totalAtual) || 0) - (Number(a.totalAtual) || 0));
            return {
                ...grupo,
                ativos,
                totalAtual: somar(ativos, 'totalAtual'),
                lucro: somar(ativos, 'lucroPrejuizo'),
            };
        })
        .filter((grupo) => grupo.ativos.length > 0);

const PortfolioTable = ({
    onSellRequest = () => {},
    onEditRequest = null,
    onRemoveRequest = null,
    refreshKey = 0,
}) => {
    const theme = useTheme();
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Tipos de grupo recolhidos. Começa tudo aberto; não persiste entre visitas.
    const [recolhidos, setRecolhidos] = useState(() => new Set());
    const { user } = useAuth();

    const grupos = useMemo(() => agruparPorTipo(portfolio || []), [portfolio]);

    const alternarGrupo = (tipo) =>
        setRecolhidos((atual) => {
            const proximo = new Set(atual);
            if (!proximo.delete(tipo)) proximo.add(tipo);
            return proximo;
        });

    const fetchPortfolio = useCallback(async () => {
        if (!user || !user.id) return;
        try {
            setLoading(true);
            const response = await api.get(`/investimentos/dashboard/${user.id}`);
            setPortfolio(response.data || []);
            setError(null);
        } catch (err) {
            setError('Não foi possível carregar os dados do portfólio.');
            // eslint-disable-next-line no-console
            logErroSeguro('Falha ao carregar o portfólio', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPortfolio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPortfolio, refreshKey]);

    const formatPercent = (value) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format((value ?? 0));

    // Regra do design system D4: valores monetários usam formatBRL + fonte mono.
    const monoSx = { fontFamily: (theme) => theme.typography.fontFamilyMono };

    if (!user || !user.id) {
        return (
            <SkeletonTheme baseColor={theme.palette.surfaces.surfaceSoft} highlightColor={theme.palette.surfaces.raised}>
                <p><Skeleton width={200} /></p>
            </SkeletonTheme>
        );
    }

    if (loading) {
        return (
            <SkeletonTheme baseColor={theme.palette.surfaces.surfaceSoft} highlightColor={theme.palette.surfaces.raised}>
                <Box sx={{ mt: 2 }}>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} height={40} style={{ marginBottom: 8 }} />
                    ))}
                </Box>
            </SkeletonTheme>
        );
    }

    if (error) {
        return (
            <Typography variant="body2" color="statusText.negative" sx={{ mt: 1 }}>
                {error}
            </Typography>
        );
    }

    if (!portfolio || portfolio.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Você ainda não possui ativos no seu portfólio.
            </Typography>
        );
    }

    return (
        <TableContainer sx={{ mt: 1, overflowX: 'auto' }}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ '& th': { borderBottom: `1px solid ${theme.palette.lines.strong}`, color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
                        <TableCell>Ticker</TableCell>
                        <TableCell align="right">Qtd</TableCell>
                        <TableCell align="right">Preço Médio</TableCell>
                        <TableCell align="right">Valor Atual</TableCell>
                        <TableCell align="right">Lucro/Prejuízo</TableCell>
                        <TableCell align="right">Ações</TableCell>
                    </TableRow>
                </TableHead>
                {grupos.map((grupo) => {
                    const recolhido = recolhidos.has(grupo.tipo);
                    return (
                        <TableBody key={grupo.tipo} data-testid={`portfolio-grupo-${grupo.tipo}`}>
                            <TableRow
                                sx={{
                                    bgcolor: theme.palette.surfaces.surfaceSoft,
                                    '& th, & td': { borderBottom: `1px solid ${theme.palette.lines.strong}`, py: 1 },
                                }}
                            >
                                <TableCell component="th" scope="rowgroup" colSpan={3}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <IconButton
                                            size="small"
                                            aria-expanded={!recolhido}
                                            aria-label={`${recolhido ? 'expandir' : 'recolher'} ${grupo.label}`}
                                            onClick={() => alternarGrupo(grupo.tipo)}
                                        >
                                            {recolhido ? <ChevronRightIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                        </IconButton>
                                        <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                                            {grupo.label}
                                        </Typography>
                                        <Typography component="span" variant="caption" color="text.secondary">
                                            {grupo.ativos.length === 1 ? '1 ativo' : `${grupo.ativos.length} ativos`}
                                        </Typography>
                                    </Box>
                                    {/* Em telas estreitas as colunas de subtotal ficam atrás do scroll
                                        horizontal; esta linha repete os valores. É duplicata visual
                                        (aria-hidden): a fonte para leitores de tela são as células. */}
                                    <Box
                                        aria-hidden="true"
                                        sx={{
                                            display: { xs: 'flex', md: 'none' },
                                            gap: '12px',
                                            pl: '42px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            ...monoSx,
                                        }}
                                    >
                                        <span>{formatBRL(grupo.totalAtual)}</span>
                                        <Box
                                            component="span"
                                            sx={{ color: grupo.lucro >= 0 ? 'statusText.positive' : 'statusText.negative' }}
                                        >
                                            {formatBRL(grupo.lucro)}
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell
                                    align="right"
                                    data-testid={`portfolio-subtotal-valor-${grupo.tipo}`}
                                    sx={{ ...monoSx, fontWeight: 700, whiteSpace: 'nowrap' }}
                                >
                                    {formatBRL(grupo.totalAtual)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    data-testid={`portfolio-subtotal-lucro-${grupo.tipo}`}
                                    sx={{
                                        ...monoSx,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        color: grupo.lucro >= 0 ? 'statusText.positive' : 'statusText.negative',
                                    }}
                                >
                                    {formatBRL(grupo.lucro)}
                                </TableCell>
                                <TableCell />
                            </TableRow>
                            {!recolhido && grupo.ativos.map((ativo) => {
                                const lucro = ativo.lucroPrejuizo ?? 0;
                                return (
                                    <TableRow
                                        key={ativo.ticker}
                                        data-testid={`portfolio-row-${ativo.ticker}`}
                                        sx={{
                                            '& td': { borderBottom: `1px solid ${theme.palette.lines.subtle}`, py: 1.25 },
                                            '&:hover': { bgcolor: theme.palette.surfaces.surfaceSoft },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 600, pl: '50px' }}>{ativo.ticker}</TableCell>
                                        <TableCell align="right">{formatQuantidade(ativo.quantidade)}</TableCell>
                                        <TableCell align="right" sx={monoSx}>{formatBRL(ativo.precoMedio)}</TableCell>
                                        <TableCell align="right" sx={monoSx}>{formatBRL(ativo.totalAtual)}</TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                ...monoSx,
                                                color: lucro >= 0 ? 'statusText.positive' : 'statusText.negative',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {formatBRL(lucro)} ({formatPercent(ativo.variacaoPercentual)})
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            {onEditRequest && (
                                                <Tooltip title="Editar posição">
                                                    <IconButton
                                                        aria-label={`editar ${ativo.ticker}`}
                                                        size="small"
                                                        onClick={() => onEditRequest(ativo)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Vender">
                                                <IconButton
                                                    color="warning"
                                                    aria-label={`vender ${ativo.ticker}`}
                                                    size="small"
                                                    onClick={() => onSellRequest(ativo)}
                                                >
                                                    <SellIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {onRemoveRequest && (
                                                <Tooltip title="Remover ativo">
                                                    <IconButton
                                                        color="error"
                                                        aria-label={`remover ${ativo.ticker}`}
                                                        size="small"
                                                        onClick={() => onRemoveRequest(ativo)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    );
                })}
            </Table>
        </TableContainer>
    );
};

export default PortfolioTable;
