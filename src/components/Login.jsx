import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logErroSeguro } from '../utils/apiErrorUtils';
import PasswordField from './PasswordField';
import AuthPageLayout from './public/AuthPageLayout';
import { cardSx, inputSx } from './public/authFormSx';
import Seo from './Seo';
import { PAGINAS } from '../seo/paginas';

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
      <Paper sx={cardSx}>
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
          <Box sx={{ textAlign: 'right', mt: '4px' }}>
            <Link
              component={RouterLink}
              to="/esqueci-senha"
              underline="hover"
              variant="body2"
              sx={{ color: 'primary.main', fontWeight: 600 }}
            >
              Esqueci minha senha
            </Link>
          </Box>

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
