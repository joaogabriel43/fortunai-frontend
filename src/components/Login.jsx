import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const password = senha;
    try {
      const result = await login({ username: email, password });
      if (!result?.token) {
        setError('Email ou senha inválidos. Por favor, tente novamente.');
      }
      // redirecionamento controlado pelo AuthContext
    } catch (err) {
      setError('Email ou senha inválidos. Por favor, tente novamente.');
      console.error('Erro de autenticação:', err);
    } finally {
      setLoading(false);
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
          Entre na sua conta para continuar
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Endereço de Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="senha"
            label="Senha"
            type="password"
            id="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, py: 1.5 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
            Não tem uma conta?{' '}
            <Link href="/registrar" underline="hover" sx={{ color: '#7C6AF7', fontWeight: 600 }}>
              Cadastre-se
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
