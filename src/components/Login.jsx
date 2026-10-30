import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { logErroSeguro } from '../utils/apiErrorUtils';
import PasswordField from './PasswordField';
import AuthPageLayout from './public/AuthPageLayout';
import Seo from './Seo';
import { PAGINAS } from '../seo/paginas';

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
      // 429 (rate limit anti brute-force) tem mensagem própria do backend com o tempo
      // de espera — mostrá-la evita o falso "senha inválida" durante o bloqueio.
      if (err?.response?.status === 429) {
        setError(err.response?.data?.mensagem || 'Muitas tentativas. Aguarde e tente novamente.');
      } else {
        setError('Email ou senha inválidos. Por favor, tente novamente.');
      }
      // SEC-03: nunca logar o erro cru — `err.config.data` carrega e-mail e senha.
      logErroSeguro('Erro de autenticação', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <Seo {...PAGINAS.login} />
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
          Entre na sua conta para continuar
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
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
            InputLabelProps={{ shrink: true }}
            sx={inputSx}
          />
          <PasswordField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="senha"
            label="Senha"
            id="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={inputSx}
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
            <Link href="/registrar" underline="hover" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Cadastre-se
            </Link>
          </Typography>
        </Box>
      </Paper>
    </AuthPageLayout>
  );
};

export default Login;
