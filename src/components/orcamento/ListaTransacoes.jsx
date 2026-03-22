import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Typography,
    Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import EditarTransacaoModal from './EditarTransacaoModal';
import { formatarDataLocal } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';

const formatBRL = (value) => formatCurrency(value);

const ListaTransacoes = ({ refreshKey, onChanged }) => {
    const { user } = useAuth();
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);

    const fetchTransacoes = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await api.get(`/orcamento/transacoes/${user.id}`);
            const list = Array.isArray(res.data) ? res.data : [];
            setTransacoes(list.sort((a, b) => new Date(b.data) - new Date(a.data)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransacoes(); }, [user, refreshKey]);

    const handleDelete = async (transacaoId) => {
        if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                await api.delete(`/orcamento/transacao/${user.id}/${transacaoId}`);
                setTransacoes(prev => prev.filter(t => t.id !== transacaoId));
                if (onChanged) onChanged();
            } catch (error) {
                console.error('Falha ao excluir transação', error);
                alert('Não foi possível excluir a transação.');
            }
        }
    };

    const openModal = (t) => { setTransacaoSelecionada(t); setModalIsOpen(true); };
    const closeModal = () => { setModalIsOpen(false); setTransacaoSelecionada(null); };

    const handleUpdated = async () => {
        // Recarrega a lista e informa ao pai para atualizar o gráfico
        await fetchTransacoes();
        if (onChanged) onChanged();
    };

    if (loading) return <p>Carregando transações...</p>;

    return (
        <Box sx={{ mt: 4, width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Últimas Transações
            </Typography>

            <TableContainer
                component={Paper}
                sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow
                            sx={{
                                '& th': {
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    color: 'text.secondary',
                                },
                            }}
                        >
                            <TableCell>Data</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Categoria</TableCell>
                            <TableCell align="right">Valor</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transacoes.map(t => (
                            <TableRow key={t.id} hover>
                                <TableCell>{formatarDataLocal(t.data)}</TableCell>
                                <TableCell>{t.descricao}</TableCell>
                                <TableCell>{t.categoria}</TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        color: t.tipo === 'CREDIT' ? 'success.main' : 'error.main',
                                        fontWeight: 600,
                                    }}
                                >
                                    {t.tipo === 'CREDIT' ? '+ ' : '- '}{formatBRL(t.valor?.quantia ?? t.valor)}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" color="primary" onClick={() => openModal(t)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {transacoes.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    align="center"
                                    sx={{ py: 3, color: 'text.secondary' }}
                                >
                                    Nenhuma transação encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <EditarTransacaoModal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                transacao={transacaoSelecionada}
                onUpdate={handleUpdated}
            />
        </Box>
    );
};

export default ListaTransacoes;
