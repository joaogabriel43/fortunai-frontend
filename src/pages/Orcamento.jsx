import React, { useState } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Button,
    Select, MenuItem, FormControl, InputLabel, Snackbar, Alert,
    CircularProgress, Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import AdicionarTransacaoForm from '../components/orcamento/AdicionarTransacaoForm';
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart';
import ListaTransacoes from '../components/orcamento/ListaTransacoes';
import ComparativoCard from '../components/orcamento/ComparativoCard';
import AnomaliaAlert from '../components/orcamento/AnomaliaAlert';
import ImportacaoExtratoModal from '../components/orcamento/ImportacaoExtratoModal';
import { useExportacao } from '../hooks/useExportacao';

const MESES = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },   { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },   { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro'},  { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro'},  { value: 12, label: 'Dezembro' },
];

const anoAtual = new Date().getFullYear();
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];

const Orcamento = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [extratoModalOpen, setExtratoModalOpen] = useState(false);
    const now = new Date();
    const [mesSelecionado, setMesSelecionado] = useState(now.getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear());
    const { loading: exportLoading, error: exportError, downloadArquivo, clearError } = useExportacao();

    const handleTransacaoAdicionada = () => {
        setRefreshKey((k) => k + 1);
    };

    const handleTransacaoAlterada = () => {
        setRefreshKey((k) => k + 1);
    };

    const handleExtratoImported = () => {
        setRefreshKey((k) => k + 1);
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Painel de Orçamento
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => setExtratoModalOpen(true)}
                >
                    Importar Extrato
                </Button>
            </Box>

            <ImportacaoExtratoModal
                open={extratoModalOpen}
                onClose={() => setExtratoModalOpen(false)}
                onImported={handleExtratoImported}
            />

            {/* Anomalias detectadas */}
            <AnomaliaAlert />

            {/* Top section: form (left) + chart (right) */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <AdicionarTransacaoForm onTransacaoAdicionada={handleTransacaoAdicionada} />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <GastosPorCategoriaChart key={refreshKey} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Comparativo Mensal */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <ComparativoCard />
                </CardContent>
            </Card>

            {/* Exportar */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Exportar Relatórios
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Mês</InputLabel>
                            <Select
                                value={mesSelecionado}
                                label="Mês"
                                onChange={(e) => setMesSelecionado(e.target.value)}
                            >
                                {MESES.map((m) => (
                                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Ano</InputLabel>
                            <Select
                                value={anoSelecionado}
                                label="Ano"
                                onChange={(e) => setAnoSelecionado(e.target.value)}
                            >
                                {ANOS.map((a) => (
                                    <MenuItem key={a} value={a}>{a}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                            disabled={exportLoading}
                            onClick={() => downloadArquivo(
                                `/api/exportacao/extrato?mes=${mesSelecionado}&ano=${anoSelecionado}`,
                                `extrato_${String(mesSelecionado).padStart(2,'0')}_${anoSelecionado}.pdf`
                            )}
                            data-testid="btn-extrato-pdf"
                        >
                            Exportar Extrato PDF
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                            disabled={exportLoading}
                            onClick={() => downloadArquivo(
                                `/api/exportacao/mensal?mes=${mesSelecionado}&ano=${anoSelecionado}`,
                                `resumo_mensal_${String(mesSelecionado).padStart(2,'0')}_${anoSelecionado}.pdf`
                            )}
                            data-testid="btn-mensal-pdf"
                        >
                            Exportar Resumo Mensal PDF
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={exportLoading ? <CircularProgress size={16} /> : <TableChartIcon />}
                            disabled={exportLoading}
                            onClick={() => downloadArquivo(
                                `/api/exportacao/transacoes/csv?mes=${mesSelecionado}&ano=${anoSelecionado}`,
                                `transacoes_${String(mesSelecionado).padStart(2,'0')}_${anoSelecionado}.csv`
                            )}
                            data-testid="btn-transacoes-csv"
                        >
                            Exportar Transações CSV
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Bottom: full-width transactions table */}
            <ListaTransacoes refreshKey={refreshKey} onChanged={handleTransacaoAlterada} />

            <Snackbar
                open={!!exportError}
                autoHideDuration={5000}
                onClose={clearError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="error" onClose={clearError}>{exportError}</Alert>
            </Snackbar>
        </Box>
    );
};

export default Orcamento;
