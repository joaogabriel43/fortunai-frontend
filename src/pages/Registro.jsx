import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, Alert, Link,
    Checkbox, FormControlLabel,
} from '@mui/material';
import authService from '../services/authService';
import api from '../services/api';
import { regrasSenha, senhaValida } from '../utils/senhaPolicy';
import { extrairMensagemErroApi } from '../utils/apiErrorUtils';
import PasswordField from '../components/PasswordField';
import AuthPageLayout from '../components/public/AuthPageLayout';

const VERSAO_TERMOS = '1.0';
const VERSAO_PRIVACIDADE = '1.0';

const Registro = () => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [aceitouTermos, setAceitouTermos] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const regras = regrasSenha(senha);
    const politicaOk = senhaValida(senha);
    // Confirmação: só considera divergência quando o usuário já digitou algo
    // no campo de confirmação — evita mostrar erro antes da interação.
    const senhasDivergem = confirmarSenha.length > 0 && confirmarSenha !== senha;
    const confirmacaoOk = confirmarSenha.length > 0 && !senhasDivergem;

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!aceitouTermos || !politicaOk || !confirmacaoOk) return;
        setError('');
        setSuccess('');
        try {
            await authService.registrar(email, senha);

            // LGPD: registrar consentimento logo após criar a conta
            try {
                const loginRes = await api.post('/auth/login', { username: email, password: senha });
                const { token } = loginRes.data;
                if (token) {
                    await api.post('/conta/consentimento',
                        { versaoTermos: VERSAO_TERMOS, versaoPrivacidade: VERSAO_PRIVACIDADE },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            } catch {
                // Falha silenciosa — consentimento pode ser registrado no próximo login via modal
            }

            setSuccess('Usuário registrado com sucesso! Redirecionando para o login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            // 429 (rate limit) e 400 (política de senha) trazem mensagem própria do backend
            setError(extrairMensagemErroApi(err, 'Erro ao registrar. Tente novamente.'));
        }
    };

    const inputSx = (theme) => ({
        '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: 'text.disabled' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
        },
        '& .MuiInputBase-input': { color: 'text.primary' },
        '& .MuiInputBase-input:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset`,
            WebkitTextFillColor: theme.palette.text.primary,
            caretColor: theme.palette.text.primary,
        },
        '& .MuiInputLabel-root': { color: 'text.secondary' },
        '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
    });

    return (
        <AuthPageLayout>
            <Paper
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: 'divider',
                    backdropFilter: 'blur(12px)',
                    bgcolor: 'background.paper',
                }}
            >
                <Typography variant="h5" fontWeight={700} sx={{ color: 'primary.main', mb: 0.5, textAlign: 'center' }}>
                    Pondero
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                    Crie sua conta e comece a gerenciar suas finanças
                </Typography>

                <Box component="form" onSubmit={handleRegister}>
                    <TextField
                        variant="outlined"
                        type="email"
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                    />
                    <PasswordField
                        variant="outlined"
                        label="Senha"
                        fullWidth
                        margin="normal"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                    />

                    {/* Checklist ao vivo da política de senha (espelho do backend — ADR-028) */}
                    <Box sx={{ mt: 0.5, mb: 0.5 }}>
                        {[
                            { ok: regras.tamanho, texto: 'Mínimo de 8 caracteres' },
                            { ok: regras.letra, texto: 'Pelo menos 1 letra' },
                            { ok: regras.numero, texto: 'Pelo menos 1 número' },
                        ].map(({ ok, texto }) => (
                            <Typography
                                key={texto}
                                variant="caption"
                                component="div"
                                sx={{ color: ok ? 'statusText.positive' : 'text.disabled' }}
                            >
                                {ok ? '✓' : '○'} {texto}
                            </Typography>
                        ))}
                    </Box>

                    <PasswordField
                        variant="outlined"
                        label="Confirmar senha"
                        fullWidth
                        margin="normal"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        required
                        error={senhasDivergem}
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                    />
                    {senhasDivergem && (
                        <Typography
                            variant="caption"
                            component="div"
                            sx={{ color: 'statusText.negative', mt: -1, mb: 0.5 }}
                        >
                            As senhas não coincidem
                        </Typography>
                    )}

                    {/* LGPD: aceite obrigatório dos Termos de Uso e Política de Privacidade */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={aceitouTermos}
                                onChange={(e) => setAceitouTermos(e.target.checked)}
                                sx={{ color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' } }}
                            />
                        }
                        label={
                            <Typography variant="body2" color="text.secondary">
                                Li e aceito os{' '}
                                <Link
                                    component={RouterLink}
                                    to="/termos"
                                    target="_blank"
                                    rel="noopener"
                                    sx={{ color: 'primary.main' }}
                                >
                                    Termos de Uso
                                </Link>
                                {' '}e a{' '}
                                <Link
                                    component={RouterLink}
                                    to="/privacidade"
                                    target="_blank"
                                    rel="noopener"
                                    sx={{ color: 'primary.main' }}
                                >
                                    Política de Privacidade
                                </Link>
                            </Typography>
                        }
                        sx={{ mt: 1.5, mb: 0.5, alignItems: 'flex-start' }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            {success}
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={!aceitouTermos || !politicaOk || !confirmacaoOk}
                        sx={{ mt: 2, py: 1.5, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}
                    >
                        Criar conta
                    </Button>

                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                        Já tem uma conta?{' '}
                        <Link component={RouterLink} to="/login" underline="hover" sx={{ color: 'primary.main', fontWeight: 600 }}>
                            Faça login
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </AuthPageLayout>
    );
};

export default Registro;
