import React, { useState } from 'react';
import AlocacaoAtivosChart from '../components/investimentos/AlocacaoAtivosChart';
import BenchmarkChart from '../components/investimentos/BenchmarkChart';
import PortfolioTable from '../components/dashboard/PortfolioTable';
import EstrategiaForm from '../components/investimentos/EstrategiaForm';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { investimentoService } from '../services/investimentoService';
import { useExportacao } from '../hooks/useExportacao';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Grid,
    Modal,
    Paper,
    Snackbar,
    Alert,
    TextField,
    Typography,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';

const cardStyle = {
    p: 3,
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    boxShadow: 'none',
};

const Investimentos = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { loading: exportLoading, error: exportError, downloadArquivo, clearError } = useExportacao();

    // Estado para venda de ativo (Modal)
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [sellQuantity, setSellQuantity] = useState(0);
    const [selling, setSelling] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Adiciona log de navegação para depuração e direciona para a rota do questionário-perfil
    const handleRefazerQuestionario = () => {
        console.log('Navegando para /questionario-perfil...');
        navigate('/questionario-perfil');
    };

    const handleOpenSellModal = (ativo) => {
        setSelectedAsset(ativo);
        setSellQuantity(ativo?.quantidade ?? 0);
        setModalOpen(true);
    };

    const handleCloseSellModal = () => {
        setModalOpen(false);
        setSelectedAsset(null);
        setSellQuantity(0);
    };

    const handleSellConfirm = async () => {
        if (!selectedAsset || !selectedAsset.ticker) {
            alert('Ativo inválido.');
            return;
        }
        const qtd = parseFloat(sellQuantity);
        if (Number.isNaN(qtd) || qtd <= 0) {
            alert('Quantidade inválida.');
            return;
        }
        if (qtd > (selectedAsset.quantidade ?? 0)) {
            alert('Você não pode vender mais do que possui.');
            return;
        }
        try {
            setSelling(true);
            await investimentoService.venderAtivo({ ticker: selectedAsset.ticker, quantidade: qtd });
            handleCloseSellModal();
            // Força o refresh da tabela
            setRefreshKey((k) => k + 1);
        } catch (error) {
            console.error('Erro ao processar a venda:', error);
            alert('Erro ao processar a venda.');
        } finally {
            setSelling(false);
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>

            {/* LINHA 1 — Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h5" fontWeight={700}>
                        Painel de Investimentos
                    </Typography>
                    {user?.perfilInvestidor && (
                        <Chip
                            label={`Perfil: ${user.perfilInvestidor}`}
                            size="small"
                            sx={{
                                ml: 1,
                                bgcolor: 'rgba(124,106,247,0.15)',
                                color: '#7C6AF7',
                                border: '1px solid rgba(124,106,247,0.3)',
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={exportLoading ? <CircularProgress size={16} /> : <TableChartIcon />}
                        disabled={exportLoading}
                        onClick={() => downloadArquivo('/api/exportacao/portfolio/csv', 'portfolio.csv')}
                        data-testid="btn-portfolio-csv"
                    >
                        Exportar Portfólio CSV
                    </Button>
                    <Button variant="outlined" onClick={handleRefazerQuestionario}>
                        Refazer Questionário
                    </Button>
                </Box>
            </Box>

            {/* LINHA 2 — Chart (md=5) + Portfolio Table (md=7) */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={cardStyle}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Alocação por Tipo de Ativo
                        </Typography>
                        <AlocacaoAtivosChart refreshKey={refreshKey} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={cardStyle}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Meu Portfólio
                        </Typography>
                        <PortfolioTable onSellRequest={handleOpenSellModal} refreshKey={refreshKey} />
                    </Paper>
                </Grid>
            </Grid>

            {/* LINHA 3 — Benchmark Chart (xs=12) */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12 }}>
                    <Paper sx={cardStyle}>
                        <BenchmarkChart />
                    </Paper>
                </Grid>
            </Grid>

            {/* LINHA 4 — Strategy card (xs=12) */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Paper sx={cardStyle}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Minha Estratégia de Alocação
                        </Typography>
                        <EstrategiaForm />
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar
                open={!!exportError}
                autoHideDuration={5000}
                onClose={clearError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="error" onClose={clearError}>{exportError}</Alert>
            </Snackbar>

            {/* Modal de Venda */}
            <Modal open={modalOpen} onClose={handleCloseSellModal} aria-labelledby="sell-modal-title">
                <Paper
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400,
                        p: 4,
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.12)',
                    }}
                >
                    <Typography id="sell-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
                        Vender {selectedAsset?.ticker}
                    </Typography>
                    <TextField
                        label="Quantidade a Vender"
                        type="number"
                        fullWidth
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(parseFloat(e.target.value) || 0)}
                        sx={{ mt: 1 }}
                        inputProps={{ min: 0, step: 'any' }}
                    />
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button onClick={handleCloseSellModal} disabled={selling}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSellConfirm}
                            variant="contained"
                            color="error"
                            disabled={selling}
                        >
                            {selling ? 'Vendendo...' : 'Confirmar Venda'}
                        </Button>
                    </Box>
                </Paper>
            </Modal>
        </Box>
    );
};

export default Investimentos;
