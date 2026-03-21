import React, { useState } from 'react';
import AlocacaoAtivosChart from '../components/investimentos/AlocacaoAtivosChart';
import PortfolioTable from '../components/dashboard/PortfolioTable';
import EstrategiaForm from '../components/investimentos/EstrategiaForm';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { investimentoService } from '../services/investimentoService';
import { Box, Button, Modal, Paper, TextField, Typography } from '@mui/material';

const Investimentos = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

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
            <h2>Painel de Investimentos</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                <button
                    onClick={handleRefazerQuestionario}
                    style={{ background: '#3182ce', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >Refazer Questionário de Perfil</button>
                {user?.perfilInvestidor && (
                    <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Perfil atual: {user.perfilInvestidor}</span>
                )}
            </div>
            <hr />
            <AlocacaoAtivosChart refreshKey={refreshKey} />
            <PortfolioTable onSellRequest={handleOpenSellModal} refreshKey={refreshKey} />
            <EstrategiaForm />

            {/* Modal de Venda */}
            <Modal open={modalOpen} onClose={handleCloseSellModal} aria-labelledby="sell-modal-title">
                <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4 }}>
                    <Typography id="sell-modal-title" variant="h6" component="h2">
                        Vender {selectedAsset?.ticker}
                    </Typography>
                    <TextField
                        label="Quantidade a Vender"
                        type="number"
                        fullWidth
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(parseFloat(e.target.value) || 0)}
                        sx={{ mt: 2 }}
                        inputProps={{ min: 0, step: 'any' }}
                    />
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={handleCloseSellModal} sx={{ mr: 1 }} disabled={selling}>Cancelar</Button>
                        <Button onClick={handleSellConfirm} variant="contained" color="error" disabled={selling}>
                            {selling ? 'Vendendo...' : 'Confirmar Venda'}
                        </Button>
                    </Box>
                </Paper>
            </Modal>
        </Box>
    );
};

export default Investimentos;
