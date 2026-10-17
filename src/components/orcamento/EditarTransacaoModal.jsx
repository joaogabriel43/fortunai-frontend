import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useTheme, alpha } from '@mui/material/styles';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { logErroSeguro, mensagemComConflitoDeSaldo } from '../../utils/apiErrorUtils';

Modal.setAppElement('#root');

const EditarTransacaoModal = ({ isOpen, onRequestClose, transacao, onUpdate }) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [formData, setFormData] = useState({ valor: '', categoria: '', descricao: '', tipo: 'SAIDA', data: '' });

    useEffect(() => {
        if (transacao) {
            setFormData({
                valor: transacao?.valor?.quantia ?? transacao?.valor ?? '',
                categoria: transacao?.categoria ?? '',
                descricao: transacao?.descricao ?? '',
                tipo: transacao?.tipo === 'CREDIT' ? 'ENTRADA' : 'SAIDA',
                data: transacao?.data ?? '',
            });
        }
    }, [transacao]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.id || !transacao?.id) return;
        try {
            await api.put(`/orcamento/transacao/${user.id}/${transacao.id}`, formData);
            if (onUpdate) onUpdate();
            onRequestClose();
        } catch (error) {
            logErroSeguro('Erro ao editar transação', error);
            alert(mensagemComConflitoDeSaldo(error, 'Falha ao editar a transação.'));
        }
    };

    const modalStyles = {
        content: {
            maxWidth: '520px',
            margin: 'auto',
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.lines.strong}`,
        },
        // Scrim: continua escuro nos dois temas, mas sai do preto cravado.
        overlay: { backgroundColor: alpha(theme.palette.common.black, 0.5) },
    };

    const inputStyle = {
        padding: 10,
        borderRadius: 6,
        border: `1px solid ${theme.palette.lines.strong}`,
        background: theme.palette.surfaces.surfaceSoft,
        color: theme.palette.text.primary,
        width: '100%',
    };
    const formGrid = { display: 'grid', gap: 12 };
    const actions = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 };
    const saveBtn = {
        padding: '8px 12px',
        borderRadius: 6,
        background: theme.palette.primary.main,
        border: 'none',
        color: theme.palette.primary.contrastText,
        fontWeight: 700,
        cursor: 'pointer',
    };
    const cancelBtn = {
        padding: '8px 12px',
        borderRadius: 6,
        background: theme.palette.surfaces.raised,
        border: 'none',
        color: theme.palette.text.primary,
        cursor: 'pointer',
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={modalStyles}>
            <h2 style={{ marginTop: 0 }}>Editar Transação</h2>
            <form onSubmit={handleSubmit} style={formGrid}>
                <input type="number" step="0.01" name="valor" placeholder="Valor" value={formData.valor} onChange={handleChange} required style={inputStyle} />
                <input type="text" name="categoria" placeholder="Categoria" value={formData.categoria} onChange={handleChange} required style={inputStyle} />
                <input
                    type="text"
                    name="descricao"
                    aria-label="Descrição"
                    placeholder="Descrição"
                    value={formData.descricao}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                />
                <select name="tipo" value={formData.tipo} onChange={handleChange} style={inputStyle}>
                    <option value="SAIDA">Despesa</option>
                    <option value="ENTRADA">Receita</option>
                </select>
                <input
                    type="text"
                    name="data"
                    value={formData.data}
                    onChange={handleChange}
                    placeholder="Data (AAAA-MM-DD)"
                    pattern="\d{4}-\d{2}-\d{2}"
                    style={inputStyle}
                    aria-label="data"
                />
                <div style={actions}>
                    <button type="button" onClick={onRequestClose} style={cancelBtn}>Cancelar</button>
                    <button type="submit" style={saveBtn}>Salvar Alterações</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditarTransacaoModal;
