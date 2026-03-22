import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import authService from '../services/authService';

const Registro = () => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await authService.registrar(email, senha);
            setSuccess('Usuário registrado com sucesso! Redirecionando para o login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data || 'Erro ao registrar. Tente novamente.');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0a0a0f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Paper
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    background: 'rgba(255,255,255,0.04)',
                }}
            >
                <Typography variant="h5" fontWeight={700} sx={{ color: '#7C6AF7', mb: 0.5, textAlign: 'center' }}>
                    FortunAI
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                    Crie sua conta e comece a gerenciar suas finanças
                </Typography>

                <Box component="form" onSubmit={handleRegister}>
                    <TextField
                        type="email"
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField
                        type="password"
                        label="Senha"
                        fullWidth
                        margin="normal"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
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

                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, py: 1.5 }}>
                        Registrar
                    </Button>

                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                        Já tem uma conta?{' '}
                        <Link component={RouterLink} to="/login" underline="hover" sx={{ color: '#7C6AF7', fontWeight: 600 }}>
                            Faça login
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default Registro;
