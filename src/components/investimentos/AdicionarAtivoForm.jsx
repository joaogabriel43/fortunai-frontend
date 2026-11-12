import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { investimentoService } from '../../services/investimentoService';
import { extrairMensagemErroApi } from '../../utils/apiErrorUtils';
import { CLASSES_ATIVO } from '../../constants/taxonomiaB3';
import ClassificacaoAtivoSelects from './ClassificacaoAtivoSelects';
import { hojeLocal } from '../../utils/dateUtils';

const hoje = hojeLocal; // "yyyy-MM-dd" no fuso America/Sao_Paulo

// Rótulos PT-BR dos tipos aceitos pelo backend (enum TipoAtivo).
// Valor vazio = backend infere o tipo via catálogo (comportamento legado).
const TIPOS_ATIVO = CLASSES_ATIVO;

const estadoInicial = () => ({
    ticker: '',
    tipoAtivo: '',
    quantidade: '',
    precoCompra: '',
    dataCompra: hoje(),
    setor: '',
    subsetor: '',
    geografia: '',
});

/**
 * Formulário de cadastro manual de ativo no portfólio.
 * POST /api/investimentos/portfolio/ativos — ticker duplicado é tratado como
 * RE-COMPRA pelo backend (preço médio ponderado recalculado automaticamente).
 */
const AdicionarAtivoForm = ({ onAtivoAdicionado }) => {
    const [form, setForm] = useState(estadoInicial());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const handleChange = (campo) => (e) => {
        const valor = campo === 'ticker' ? e.target.value.toUpperCase() : e.target.value;
        setForm((prev) => ({ ...prev, [campo]: valor }));
    };

    // Validação client-side espelhando o Bean Validation do backend.
    const validar = () => {
        if (!form.ticker.trim()) return 'Informe o ticker do ativo.';
        const quantidade = parseFloat(form.quantidade);
        if (Number.isNaN(quantidade) || quantidade <= 0) return 'A quantidade deve ser maior que zero.';
        const preco = parseFloat(form.precoCompra);
        if (Number.isNaN(preco) || preco <= 0) return 'O preço de compra deve ser maior que zero.';
        if (form.dataCompra && form.dataCompra > hoje()) return 'A data da compra não pode ser futura.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const mensagemValidacao = validar();
        if (mensagemValidacao) {
            setError(mensagemValidacao);
            return;
        }

        const payload = {
            ticker: form.ticker.trim(),
            quantidade: parseFloat(form.quantidade),
            precoCompra: parseFloat(form.precoCompra),
        };
        // Campos opcionais: omitidos quando não informados (backend aplica os fallbacks).
        if (form.tipoAtivo) payload.tipoAtivo = form.tipoAtivo;
        if (form.dataCompra) payload.dataCompra = form.dataCompra;
        // Classificação estratégica opcional (setor/subsetor/geografia).
        // Subsetor sem setor não acontece na UI (auto-preenchimento do pai).
        if (form.setor) payload.setor = form.setor;
        if (form.subsetor) payload.subsetor = form.subsetor;
        if (form.geografia) payload.geografia = form.geografia;

        try {
            setSaving(true);
            await investimentoService.adicionarAtivo(payload);
            setSuccess(`Ativo ${payload.ticker} adicionado ao portfólio.`);
            setForm(estadoInicial());
            if (onAtivoAdicionado) onAtivoAdicionado();
        } catch (err) {
            setError(extrairMensagemErroApi(err, 'Falha ao adicionar o ativo. Tente novamente.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate data-testid="adicionar-ativo-form">
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3, xl: 2 }}>
                    <TextField
                        label="Ticker"
                        size="small"
                        fullWidth
                        required
                        value={form.ticker}
                        onChange={handleChange('ticker')}
                        placeholder="Ex: PETR4"
                        inputProps={{ 'data-testid': 'input-ticker', maxLength: 20 }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3, xl: 3 }}>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="tipo-ativo-label">Tipo</InputLabel>
                        <Select
                            labelId="tipo-ativo-label"
                            label="Tipo"
                            value={form.tipoAtivo}
                            onChange={handleChange('tipoAtivo')}
                            inputProps={{ 'data-testid': 'select-tipo-ativo' }}
                        >
                            <MenuItem value="">
                                <em>Detectar automaticamente</em>
                            </MenuItem>
                            {TIPOS_ATIVO.map((tipo) => (
                                <MenuItem key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                    <TextField
                        label="Quantidade"
                        type="number"
                        size="small"
                        fullWidth
                        required
                        value={form.quantidade}
                        onChange={handleChange('quantidade')}
                        inputProps={{ 'data-testid': 'input-quantidade', min: 0, step: 'any' }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2, xl: 3 }}>
                    <TextField
                        label="Preço de compra (R$)"
                        type="number"
                        size="small"
                        fullWidth
                        required
                        value={form.precoCompra}
                        onChange={handleChange('precoCompra')}
                        inputProps={{ 'data-testid': 'input-preco-compra', min: 0, step: '0.01' }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                    <TextField
                        label="Data da compra"
                        type="date"
                        size="small"
                        fullWidth
                        value={form.dataCompra}
                        onChange={handleChange('dataCompra')}
                        inputProps={{ 'data-testid': 'input-data-compra', max: hoje() }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </Grid>

                {/* Classificação estratégica opcional — alimenta o breakdown por setores */}
                <ClassificacaoAtivoSelects
                    value={{ setor: form.setor, subsetor: form.subsetor, geografia: form.geografia }}
                    onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
                />

                <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Ticker já existente na carteira? A operação vira uma re-compra e o
                            preço médio é recalculado automaticamente.
                        </Typography>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving}
                        data-testid="btn-adicionar-ativo"
                    >
                        {saving ? 'Adicionando...' : 'Adicionar Ativo'}
                    </Button>
                </Grid>
            </Grid>

            {success && <Alert severity="success" sx={{ mt: 1.5 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        </Box>
    );
};

export default AdicionarAtivoForm;
