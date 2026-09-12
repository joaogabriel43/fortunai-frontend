import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';
import api from '../../services/api';
import EditarTransacaoModal from './EditarTransacaoModal';
import ConfirmarExclusaoDialog from './ConfirmarExclusaoDialog';
import { formatarDataLocal } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { logErroSeguro } from '../../utils/apiErrorUtils';

const formatBRL = (value) => formatCurrency(value);

const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Filtro client-side pelo mes de referencia, mesmo padrao ja usado pelo
// GastosPorCategoriaChart: `/orcamento/transacoes/{id}` devolve a base inteira
// e nao aceita mes/ano, entao o recorte acontece aqui. Quando o volume de
// transacoes fizer o payload incomodar, o caminho e paginacao/filtro no
// backend — registrado no backlog do CLAUDE.md, fora do escopo desta rodada.
const filtrarPorMes = (transacoes, mes, ano) => {
    if (!Array.isArray(transacoes)) return [];
    const prefixoMes = `${ano}-${String(mes).padStart(2, '0')}`;
    return transacoes.filter((t) => t?.data?.startsWith(prefixoMes));
};

const ListaTransacoes = ({ refreshKey, onChanged }) => {
    const { user } = useAuth();
    // O contexto so existe dentro da pagina de Orcamento; fora dela o
    // componente segue listando tudo, como antes.
    const mesOrcamento = useMesOrcamento();
    const mes = mesOrcamento?.mes;
    const ano = mesOrcamento?.ano;
    const modoMensal = Number.isInteger(mes) && Number.isInteger(ano);

    const [transacoes, setTransacoes] = useState([]);
    const [atualizando, setAtualizando] = useState(true);
    const [jaCarregou, setJaCarregou] = useState(false);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transacaoParaExcluir, setTransacaoParaExcluir] = useState(null);

    const fetchTransacoes = useCallback(async () => {
        if (!user?.id) return;
        // As linhas ja carregadas continuam na tela durante o refetch — o
        // "Carregando..." so aparece na primeira carga, nunca substituindo
        // dados que o usuario ja esta lendo.
        setAtualizando(true);
        try {
            const res = await api.get(`/orcamento/transacoes/${user.id}`);
            const list = Array.isArray(res.data) ? res.data : [];
            setTransacoes(list.sort((a, b) => new Date(b.data) - new Date(a.data)));
        } catch (e) {
            logErroSeguro('Falha ao carregar transações', e);
        } finally {
            setAtualizando(false);
            setJaCarregou(true);
        }
    }, [user?.id]);

    useEffect(() => { fetchTransacoes(); }, [fetchTransacoes, refreshKey]);

    // Trocar de mes nao refaz a busca: a base ja esta em memoria, so o recorte muda.
    const transacoesVisiveis = useMemo(
        () => (modoMensal ? filtrarPorMes(transacoes, mes, ano) : transacoes),
        [transacoes, modoMensal, mes, ano],
    );

    const carregandoPrimeiraVez = atualizando && !jaCarregou;

    const handleDelete = (transacaoId) => {
        setTransacaoParaExcluir(transacaoId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        setDeleteDialogOpen(false);
        try {
            await api.delete(`/orcamento/transacao/${user.id}/${transacaoParaExcluir}`);
            setTransacoes(prev => prev.filter(t => t.id !== transacaoParaExcluir));
            if (onChanged) onChanged();
        } catch (error) {
            logErroSeguro('Falha ao excluir transação', error);
        } finally {
            setTransacaoParaExcluir(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setTransacaoParaExcluir(null);
    };

    const openModal = (t) => { setTransacaoSelecionada(t); setModalIsOpen(true); };
    const closeModal = () => { setModalIsOpen(false); setTransacaoSelecionada(null); };

    const handleUpdated = async () => {
        // Recarrega a lista e informa ao pai para atualizar o gráfico
        await fetchTransacoes();
        if (onChanged) onChanged();
    };

    const titulo = modoMensal
        ? `Transações — ${MESES[mes - 1]} ${ano}`
        : 'Últimas Transações';

    const mensagemVazia = modoMensal
        ? `Nenhuma transação em ${MESES[mes - 1].toLowerCase()} de ${ano}.`
        : 'Nenhuma transação encontrada.';

    return (
        <Box sx={{ mt: 4, width: '100%' }}>
            {carregandoPrimeiraVez ? (
                <p>Carregando transações...</p>
            ) : (
                <>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        {titulo}
                    </Typography>

                    <TableContainer
                        component={Paper}
                        aria-busy={atualizando}
                        sx={(t) => ({
                            border: `1px solid ${t.palette.lines.subtle}`,
                            borderRadius: '12px',
                            opacity: atualizando ? 0.6 : 1,
                            transition: 'opacity 150ms ease',
                        })}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow
                                    sx={(t) => ({
                                        '& th': {
                                            borderBottom: `1px solid ${t.palette.lines.subtle}`,
                                            fontWeight: 600,
                                            fontSize: 12,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            color: 'text.secondary',
                                        },
                                    })}
                                >
                                    <TableCell>Data</TableCell>
                                    <TableCell>Descrição</TableCell>
                                    <TableCell>Categoria</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                    <TableCell align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transacoesVisiveis.map(t => (
                                    <TableRow key={t.id} hover>
                                        <TableCell>{formatarDataLocal(t.data)}</TableCell>
                                        <TableCell>{t.descricao}</TableCell>
                                        <TableCell>{capitalize(t.categoria)}</TableCell>
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
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                aria-label="Editar transação"
                                                onClick={() => openModal(t)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label="Excluir transação"
                                                onClick={() => handleDelete(t.id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transacoesVisiveis.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            align="center"
                                            sx={{ py: 3, color: 'text.secondary' }}
                                        >
                                            {mensagemVazia}
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
                </>
            )}

            <ConfirmarExclusaoDialog
                open={deleteDialogOpen}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </Box>
    );
};

export default ListaTransacoes;
