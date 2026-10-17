import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Alert,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useMesOrcamento } from '../../contexts/MesOrcamentoContext';
import api from '../../services/api';
import { useTheme, alpha } from '@mui/material/styles';
import CreatableSelect from 'react-select/creatable';
import { hojeLocal } from '../../utils/dateUtils';
import { mensagemComConflitoDeSaldo } from '../../utils/apiErrorUtils';

const hoje = hojeLocal; // "yyyy-MM-dd" no fuso America/Sao_Paulo

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// O react-select recebe um objeto de estilos, nao um `sx` — por isso aqui o
// tema entra como parametro explicito (`selectStyles(theme)`) em vez do
// callback que o MUI resolveria sozinho.
const selectStyles = (t) => ({
    control: (base, state) => ({
        ...base,
        backgroundColor: 'transparent',
        borderColor: state.isFocused ? t.palette.primary.main : t.palette.lines.strong,
        borderRadius: 8,
        boxShadow: 'none',
        minHeight: 40,
        ':hover': { borderColor: t.palette.text.secondary },
    }),
    menu: (base) => ({
        ...base,
        backgroundColor: t.palette.surfaces.raised,
        border: `1px solid ${t.palette.lines.subtle}`,
        borderRadius: 8,
        zIndex: 9999,
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? alpha(t.palette.primary.main, 0.12) : 'transparent',
        color: t.palette.text.primary,
        ':active': { backgroundColor: alpha(t.palette.primary.main, 0.2) },
    }),
    singleValue: (base) => ({ ...base, color: t.palette.text.primary }),
    input: (base) => ({ ...base, color: t.palette.text.primary }),
    placeholder: (base) => ({ ...base, color: t.palette.text.secondary }),
    clearIndicator: (base) => ({
        ...base,
        color: t.palette.text.secondary,
        ':hover': { color: t.palette.text.primary },
    }),
    dropdownIndicator: (base) => ({
        ...base,
        color: t.palette.text.secondary,
        ':hover': { color: t.palette.text.primary },
    }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: t.palette.lines.strong }),
});

const AdicionarTransacaoForm = ({ onTransacaoAdicionada }) => {
    const theme = useTheme();
    const { user } = useAuth();
    const { mes, ano, isMesAtual, primeiroDiaMes, ultimoDiaMes } = useMesOrcamento();
    // Mesmo relógio que o backend usa para validar @PastOrPresent (ver hojeLocal):
    // `new Date()` aqui leria o fuso do NAVEGADOR, que pode divergir de
    // America/Sao_Paulo e classificar o mês errado como futuro na virada.
    const [anoHoje, mesHoje] = hoje().split('-').map(Number);
    const isMesFuturo = !isMesAtual && (ano > anoHoje || (ano === anoHoje && mes > mesHoje));
    const isMesPassado = !isMesAtual && !isMesFuturo;

    const [valor, setValor] = useState('');
    const [categoria, setCategoria] = useState(null);
    const [descricao, setDescricao] = useState('');
    const [tipo, setTipo] = useState('SAIDA');
    const [data, setData] = useState(hoje());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [categoriasExistentes, setCategoriasExistentes] = useState([]);
    const [isLoadingCategorias, setIsLoadingCategorias] = useState(true);

    // O back-end nunca aceita data futura (@PastOrPresent — ver CLAUDE.md).
    // Ao trocar o mês de referência: em mês passado, pré-preenche uma data
    // dentro dele; em mês atual/futuro, a data de lançamento continua sendo hoje.
    useEffect(() => {
        setData(isMesPassado ? ultimoDiaMes : hoje());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mes, ano]);

    useEffect(() => {
        if (!user || !user.id) return;
        setIsLoadingCategorias(true);
        // União: categorias gerenciadas (ADR-038, vêm primeiro) + categorias já
        // usadas em transações; dedupe case-insensitive. Texto livre continua valendo.
        Promise.all([
            api.get('/orcamento/categorias-gerenciadas').then((r) => r.data ?? []).catch(() => []),
            api.get(`/orcamento/categorias/${user.id}`).then((r) => r.data ?? []).catch(() => []),
        ])
            .then(([gerenciadas, usadas]) => {
                const options = [];
                const vistos = new Set();
                gerenciadas.forEach((c) => {
                    const chave = c.nome.trim().toLowerCase();
                    if (!vistos.has(chave)) {
                        vistos.add(chave);
                        options.push({ value: c.nome, label: c.nome });
                    }
                });
                usadas.forEach((cat) => {
                    const chave = String(cat).trim().toLowerCase();
                    if (!vistos.has(chave)) {
                        vistos.add(chave);
                        options.push({ value: cat, label: cat });
                    }
                });
                setCategoriasExistentes(options);
            })
            .finally(() => setIsLoadingCategorias(false));
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (data > hoje()) {
            setError('A data da transação não pode ser futura.');
            return;
        }
        try {
            if (!user || !user.id) { setError('Usuário não autenticado.'); return; }
            if (!categoria || !categoria.value) { setError('Selecione ou informe uma categoria.'); return; }
            const requestData = { valor, categoria: categoria.value, descricao, tipo, data };
            await api.post(`/orcamento/transacao/${user.id}`, requestData);
            setSuccess(requestData.descricao);
            setValor('');
            setCategoria(null);
            setDescricao('');
            setTipo('SAIDA');
            setData(isMesPassado ? ultimoDiaMes : hoje());
            if (onTransacaoAdicionada) onTransacaoAdicionada();
            if (!categoriasExistentes.find((opt) => opt.value === requestData.categoria)) {
                setCategoriasExistentes((prev) => [...prev, { value: requestData.categoria, label: requestData.categoria }]);
            }
        } catch (err) {
            setError(mensagemComConflitoDeSaldo(err, 'Falha ao adicionar transação.'));
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Adicionar Nova Transação
            </Typography>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <TextField
                    type="number"
                    label="Valor (R$)"
                    size="small"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                    inputProps={{ step: '0.01', min: 0 }}
                />

                <FormControl size="small">
                    <InputLabel id="tipo-transacao-label">Tipo</InputLabel>
                    <Select
                        id="tipo-transacao"
                        labelId="tipo-transacao-label"
                        value={tipo}
                        label="Tipo"
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        <MenuItem value="SAIDA">Despesa</MenuItem>
                        <MenuItem value="ENTRADA">Receita</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography
                        component="label"
                        htmlFor="categoria-transacao"
                        variant="caption"
                        sx={{ color: 'text.secondary', display: 'block', mb: 0.5, ml: 0.5 }}
                    >
                        Categoria
                    </Typography>
                    <CreatableSelect
                        inputId="categoria-transacao"
                        aria-label="Categoria"
                        isClearable
                        isDisabled={isLoadingCategorias}
                        isLoading={isLoadingCategorias}
                        onChange={(newValue) => setCategoria(newValue)}
                        options={categoriasExistentes}
                        value={categoria}
                        placeholder="Selecione ou digite uma categoria..."
                        styles={selectStyles(theme)}
                    />
                </Box>

                <TextField
                    label="Descrição"
                    size="small"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    required
                    placeholder="Ex: Almoço com amigos"
                    sx={{ gridColumn: '1 / -1' }}
                />

                <TextField
                    type="date"
                    label="Data da transação"
                    size="small"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    inputProps={{ max: hoje(), min: isMesPassado ? primeiroDiaMes : undefined }}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ gridColumn: '1 / -1' }}
                />

                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Button type="submit" variant="contained" fullWidth>
                        Adicionar
                    </Button>
                </Box>
            </Box>

            {isMesPassado && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                    Adicionando a {MESES[mes - 1]}/{ano}.
                </Alert>
            )}
            {isMesFuturo && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                    Você está visualizando {MESES[mes - 1]}/{ano}. Novos lançamentos sempre usam a data
                    de hoje — o sistema não aceita transações com data futura.
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mt: 1.5 }}>
                    Transação adicionada com sucesso: <strong>{success}</strong>
                </Alert>
            )}
            {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        </Box>
    );
};

export default AdicionarTransacaoForm;
