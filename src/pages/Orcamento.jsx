import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Button,
    Snackbar, Alert,
    CircularProgress, Skeleton, Tab, Tabs,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import TableChartIcon from '@mui/icons-material/TableChart';
import AdicionarTransacaoForm from '../components/orcamento/AdicionarTransacaoForm';
import GastosPorCategoriaChart from '../components/dashboard/GastosPorCategoriaChart';
import ListaTransacoes from '../components/orcamento/ListaTransacoes';
import ComparativoCard from '../components/orcamento/ComparativoCard';
import AnomaliaAlert from '../components/orcamento/AnomaliaAlert';
import ImportacaoExtratoModal from '../components/orcamento/ImportacaoExtratoModal';
import NfceScannerModal from '../components/orcamento/NfceScannerModal';
import RecorrenciasCard from '../components/orcamento/RecorrenciasCard';
import OrcamentoLimitesCard from '../components/orcamento/OrcamentoLimitesCard';
import MinhasCategoriasCard from '../components/orcamento/MinhasCategoriasCard';
import CartoesCard from '../components/orcamento/CartoesCard';
import CalendarioGastosCard from '../components/orcamento/CalendarioGastosCard';
import EntradasSaidasChart from '../components/orcamento/EntradasSaidasChart';
import SeletorMesOrcamento from '../components/orcamento/SeletorMesOrcamento';
import { useExportacao } from '../hooks/useExportacao';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MesOrcamentoProvider, useMesOrcamento } from '../contexts/MesOrcamentoContext';
import { formatarDataLocal } from '../utils/dateUtils';

// Exporta o mês de referência da página (MesOrcamentoContext): um único
// seletor de mês no Orçamento, sem estado de período próprio aqui.
const ExportarRelatoriosCard = ({ exportLoading, downloadArquivo }) => {
    const { mes, ano } = useMesOrcamento();
    const periodo = formatarDataLocal(`${ano}-${String(mes).padStart(2, '0')}-01`, { month: 'long', year: 'numeric' });
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Exportar Relatórios
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid="export-periodo">
                    Período: {periodo}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        startIcon={exportLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                        disabled={exportLoading}
                        onClick={() => downloadArquivo(
                            `/api/exportacao/extrato?mes=${mes}&ano=${ano}`,
                            `extrato_${String(mes).padStart(2,'0')}_${ano}.pdf`
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
                            `/api/exportacao/mensal?mes=${mes}&ano=${ano}`,
                            `resumo_mensal_${String(mes).padStart(2,'0')}_${ano}.pdf`
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
                            `/api/exportacao/transacoes/csv?mes=${mes}&ano=${ano}`,
                            `transacoes_${String(mes).padStart(2,'0')}_${ano}.csv`
                        )}
                        data-testid="btn-transacoes-csv"
                    >
                        Exportar Transações CSV
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

// Sub-abas do Orçamento (Lote K — mesmo padrão de organização do ADR-037)
const ABAS_ORCAMENTO = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'categorias', label: 'Categorias & Limites' },
    { id: 'cartoes', label: 'Cartões' },
    { id: 'analises', label: 'Análises' },
    { id: 'transacoes', label: 'Transações' },
];

const Orcamento = () => {
    const { user } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [extratoModalOpen, setExtratoModalOpen] = useState(false);
    const [nfceOpen, setNfceOpen] = useState(false);
    const { loading: exportLoading, error: exportError, downloadArquivo, clearError } = useExportacao();
    const [abaAtiva, setAbaAtiva] = useState('visao-geral');
    const [recorrencias, setRecorrencias] = useState([]);
    const [totalMensalComprometido, setTotalMensalComprometido] = useState(0);
    const [loadingRecorrencias, setLoadingRecorrencias] = useState(true);

    // Skeleton de inicialização — mostra enquanto as transações iniciais carregam
    useEffect(() => {
        if (!user?.id) { setPageLoading(false); return; }
        api.get(`/orcamento/transacoes/${user.id}`)
            .catch(() => { /* silently ignore — child components handle their own errors */ })
            .finally(() => setPageLoading(false));
    }, [user?.id]);

    // Carrega assinaturas recorrentes detectadas automaticamente
    useEffect(() => {
        if (!user?.id) { setLoadingRecorrencias(false); return; }
        setLoadingRecorrencias(true);
        api.get('/orcamento/recorrencias')
            .then((res) => {
                setRecorrencias(res.data?.recorrencias ?? []);
                setTotalMensalComprometido(res.data?.totalMensalComprometido ?? 0);
            })
            .catch(() => {
                setRecorrencias([]);
                setTotalMensalComprometido(0);
            })
            .finally(() => setLoadingRecorrencias(false));
    }, [user?.id]);

    const handleTransacaoAdicionada = () => {
        setRefreshKey((k) => k + 1);
    };

    const handleTransacaoAlterada = () => {
        setRefreshKey((k) => k + 1);
    };

    const handleExtratoImported = () => {
        setRefreshKey((k) => k + 1);
    };

    if (pageLoading) {
        return (
            <Box sx={{ p: { xs: 1.5, md: 3 } }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} animation="wave" variant="rectangular" height={48}
                        sx={(t) => ({ mb: 1, bgcolor: t.palette.surfaces.surfaceSoft, borderRadius: 2 })} />
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Skeleton animation="wave" variant="circular" width={180} height={180}
                        sx={(t) => ({ bgcolor: t.palette.surfaces.surfaceSoft })} />
                </Box>
            </Box>
        );
    }

    return (
        <MesOrcamentoProvider>
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Painel de Orçamento
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<QrCodeScannerIcon />}
                        onClick={() => setNfceOpen(true)}
                        sx={(t) => ({ borderColor: t.palette.lines.strong })}
                    >
                        📄 Escanear NF-e
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={() => setExtratoModalOpen(true)}
                    >
                        Importar Extrato
                    </Button>
                </Box>
            </Box>

            <ImportacaoExtratoModal
                open={extratoModalOpen}
                onClose={() => setExtratoModalOpen(false)}
                onImported={handleExtratoImported}
            />

            <NfceScannerModal
                open={nfceOpen}
                onClose={() => setNfceOpen(false)}
                onSuccess={() => {
                    setNfceOpen(false);
                    setRefreshKey((k) => k + 1); // recarrega lista de transações
                }}
            />

            {/* Anomalias detectadas — visíveis em qualquer aba */}
            <AnomaliaAlert />

            {/* Mês de referência — persistente, compartilhado entre as sub-abas */}
            <SeletorMesOrcamento />

            {/* Sub-abas por tema (Lote K, padrão ADR-037) */}
            <Tabs value={abaAtiva} onChange={(_e, v) => setAbaAtiva(v)}
                variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
                sx={(t) => ({ mb: 3, borderBottom: `1px solid ${t.palette.lines.subtle}` })}>
                {ABAS_ORCAMENTO.map((aba) => (
                    <Tab key={aba.id} value={aba.id} label={aba.label} data-testid={`tab-orcamento-${aba.id}`} />
                ))}
            </Tabs>

            {abaAtiva === 'visao-geral' && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    {/* 7/5 e nao 6/6: o formulario tem grade interna de 2 colunas
                        e precisa da largura; o grafico e um circulo de 200px
                        fixos (outerRadius 100) mais a legenda, e num card de
                        metade da pagina ficava boiando. O CardContent do grafico
                        centraliza verticalmente para que a diferenca de altura
                        entre os dois cards nao vire um vazio no rodape. */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <AdicionarTransacaoForm onTransacaoAdicionada={handleTransacaoAdicionada} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                }}
                            >
                                <GastosPorCategoriaChart key={refreshKey} />
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {abaAtiva === 'categorias' && (
                <>
                    {/* Categorias gerenciadas (ADR-038) + limites mensais (ADR-034) */}
                    <MinhasCategoriasCard />
                    <OrcamentoLimitesCard />
                </>
            )}

            {abaAtiva === 'cartoes' && <CartoesCard />}

            {abaAtiva === 'analises' && (
                <>
                    <EntradasSaidasChart />
                    <CalendarioGastosCard />
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <ComparativoCard />
                        </CardContent>
                    </Card>
                    <Box sx={{ mb: 3 }}>
                        <RecorrenciasCard
                            recorrencias={recorrencias}
                            totalMensalComprometido={totalMensalComprometido}
                            loading={loadingRecorrencias}
                        />
                    </Box>
                </>
            )}

            {abaAtiva === 'transacoes' && (
            <>
            <ExportarRelatoriosCard exportLoading={exportLoading} downloadArquivo={downloadArquivo} />

            {/* Bottom: full-width transactions table */}
            <ListaTransacoes refreshKey={refreshKey} onChanged={handleTransacaoAlterada} />
            </>
            )}

            <Snackbar
                open={!!exportError}
                autoHideDuration={5000}
                onClose={clearError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="error" onClose={clearError}>{exportError}</Alert>
            </Snackbar>
        </Box>
        </MesOrcamentoProvider>
    );
};

export default Orcamento;
