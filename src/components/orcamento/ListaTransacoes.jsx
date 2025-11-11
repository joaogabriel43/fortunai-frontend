import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import EditarTransacaoModal from './EditarTransacaoModal';
import { formatarDataLocal } from '../../utils/dateUtils';

const ListaTransacoes = ({ refreshKey, onChanged }) => {
    const { user } = useAuth();
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // novo estado de erro
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);

    const fetchTransacoes = async () => {
        // Se usuário ainda não carregou, encerra loading para não ficar travado
        if (!user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/orcamento/transacoes/${user.id}`);
            const list = Array.isArray(res.data) ? res.data : [];
            setTransacoes(list.sort((a, b) => new Date(b.data) - new Date(a.data)));
        } catch (e) {
            console.error('Falha ao buscar transações', e);
            if (e?.response?.status === 401) {
                setError('Não autorizado. Faça login novamente.');
            } else if (e?.response?.status === 403) {
                setError('Acesso negado às transações.');
            } else {
                setError('Erro ao carregar transações.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransacoes(); }, [user, refreshKey]);

    const handleDelete = async (transacaoId) => {
        if (!user?.id) return;
        if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                await api.delete(`/orcamento/transacao/${user.id}/${transacaoId}`);
                setTransacoes(prev => prev.filter(t => t.id !== transacaoId));
                if (onChanged) onChanged();
            } catch (err) {
                console.error('Falha ao excluir transação', err);
                alert('Não foi possível excluir a transação.');
            }
        }
    };

    const openModal = (t) => { setTransacaoSelecionada(t); setModalIsOpen(true); };
    const closeModal = () => { setModalIsOpen(false); setTransacaoSelecionada(null); };

    const handleUpdated = async () => {
        await fetchTransacoes();
        if (onChanged) onChanged();
    };

    if (loading) return <p>Carregando transações...</p>;
    if (error) return <p style={{ color: '#e53e3e' }}>{error}</p>;

    return (
        <div style={{ marginTop: '40px', width: '100%' }}>
            <h4>Últimas Transações</h4>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #2d3748' }}>Data</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #2d3748' }}>Descrição</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #2d3748' }}>Categoria</th>
                            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #2d3748' }}>Valor</th>
                            <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #2d3748' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transacoes.map(t => (
                            <tr key={t.id}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #2d3748' }}>{formatarDataLocal(t.data)}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #2d3748' }}>{t.descricao}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #2d3748' }}>{t.categoria}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #2d3748', textAlign: 'right', color: t.tipo === 'CREDIT' ? '#00C49F' : '#FF8042' }}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t?.valor?.quantia ?? 0)}
                                </td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #2d3748', textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    <button onClick={() => openModal(t)} style={{ padding: '6px 10px', borderRadius: 4, background: '#3182ce', color: '#fff', border: 'none', cursor: 'pointer' }}>Editar</button>
                                    <button onClick={() => handleDelete(t.id)} style={{ padding: '6px 10px', borderRadius: 4, background: '#e53e3e', color: '#fff', border: 'none', cursor: 'pointer' }}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                        {transacoes.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#a0aec0' }}>Nenhuma transação encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <EditarTransacaoModal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                transacao={transacaoSelecionada}
                onUpdate={handleUpdated}
            />
        </div>
    );
};

export default ListaTransacoes;
