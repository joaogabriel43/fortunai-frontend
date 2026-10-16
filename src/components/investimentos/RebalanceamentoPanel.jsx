import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useRebalanceamento } from '../../hooks/useRebalanceamento';

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const formatPercent = (value) =>
    (value !== undefined && value !== null
        ? (value >= 0 ? '+' : '') +
          value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
        : '–');

const LABEL_MAP = {
    ACAO: 'Ações',
    FUNDO_IMOBILIARIO: 'Fundos Imobiliários',
    RENDA_FIXA: 'Renda Fixa',
    CRIPTOMOEDA: 'Criptomoedas',
};

const AcaoChip = ({ acao }) => {
    const config = {
        COMPRAR: { label: 'COMPRAR', color: 'success' },
        VENDER:  { label: 'VENDER',  color: 'error' },
        OK:      { label: 'Balanceado', color: 'default' },
    }[acao] ?? { label: acao, color: 'default' };

    return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 700 }} />;
};

// Recebe o tema como parametro porque e usada dentro do `sx` da linha da
// tabela — o tingimento de COMPRAR/VENDER precisa acompanhar claro/escuro.
const rowBg = (acao, t) => {
    if (acao === 'COMPRAR') return alpha(t.palette.success.main, 0.06);
    if (acao === 'VENDER')  return alpha(t.palette.error.main, 0.06);
    return 'transparent';
};

const RebalanceamentoPanel = () => {
    const theme = useTheme();
    const { loading, error, sugestoes } = useRebalanceamento();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="statusText.negative" variant="body2" sx={{ mt: 1 }}>
                {error}
            </Typography>
        );
    }

    if (!sugestoes) return null;

    const todasOk = sugestoes.length > 0 && sugestoes.every(s => s.acao === 'OK');

    if (todasOk) {
        return (
            <Alert severity="success" sx={{ mt: 1, borderRadius: 2 }}>
                Carteira balanceada! Nenhum ajuste necessário no momento.
            </Alert>
        );
    }

    return (
        <Box sx={{ mt: 1 }}>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow
                            sx={{
                                '& th': {
                                    borderBottom: `1px solid ${theme.palette.lines.strong}`,
                                    color: 'text.secondary',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                },
                            }}
                        >
                            <TableCell>Classe</TableCell>
                            <TableCell align="right">Atual (R$)</TableCell>
                            <TableCell align="right">Atual (%)</TableCell>
                            <TableCell align="right">Alvo (%)</TableCell>
                            <TableCell align="right">Desvio</TableCell>
                            <TableCell align="center">Ação</TableCell>
                            <TableCell align="right">Ajuste</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sugestoes.map((s) => (
                            <TableRow
                                key={s.classe}
                                sx={{
                                    bgcolor: rowBg(s.acao, theme),
                                    '& td': { borderBottom: `1px solid ${theme.palette.lines.subtle}`, py: 1.25 },
                                }}
                            >
                                <TableCell sx={{ fontWeight: 600 }}>
                                    {LABEL_MAP[s.classe] ?? s.classe}
                                </TableCell>
                                <TableCell align="right">{formatCurrency(s.valorAtual)}</TableCell>
                                <TableCell align="right">
                                    {s.percentualAtual.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                    })}%
                                </TableCell>
                                <TableCell align="right">
                                    {s.percentualAlvo.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                    })}%
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        color: s.desvio > 0 ? 'statusText.negative' : s.desvio < 0 ? 'statusText.positive' : 'text.secondary',
                                        fontWeight: 600,
                                    }}
                                >
                                    {formatPercent(s.desvio)}
                                </TableCell>
                                <TableCell align="center">
                                    <AcaoChip acao={s.acao} />
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 600, color: s.acao === 'OK' ? 'text.secondary' : 'text.primary' }}
                                >
                                    {s.acao === 'OK' ? '–' : formatCurrency(s.valorAjuste)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default RebalanceamentoPanel;
