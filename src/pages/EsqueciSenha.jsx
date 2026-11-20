import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import authService from '../services/authService';
import { logErroSeguro } from '../utils/apiErrorUtils';
import AuthPageLayout from '../components/public/AuthPageLayout';
import { cardSx, inputSx } from '../components/public/authFormSx';
import Seo from '../components/Seo';
import { PAGINAS } from '../seo/paginas';

// Uma única mensagem, exista ou não a conta e mesmo se a chamada falhar:
// a tela nunca revela se o e-mail está cadastrado.
const MENSAGEM_ENVIADO = 'Se houver uma conta com esse e-mail, enviamos um link.';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const resultadoRef = useRef(null);

  // Leva o foco para a mensagem de resultado (leitor de tela e teclado).
  useEffect(() => {
    if (enviado) resultadoRef.current?.focus();
  }, [enviado]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const destino = email.trim();
    if (!destino || enviando) return;
    setEnviando(true);
    try {
      await authService.solicitarRedefinicaoSenha(destino);
    } catch (err) {
      // Rede, 5xx, 429 ou qualquer outro status: mesmo estado do sucesso.
      logErroSeguro('Erro ao solicitar redefinição de senha', err);
    } finally {
      setEnviando(false);
      setEnviado(true);
    }
  };

  return (
    <AuthPageLayout>
      <Seo {...PAGINAS.esqueciSenha} />
      <Paper sx={cardSx}>
        <Typography
          variant="h5"
          component="h1"
          fontWeight={700}
          sx={{ color: 'primary.main', mb: '4px', textAlign: 'center' }}
        >
          Esqueci minha senha
        </Typography>

        {enviado ? (
          <Alert
            ref={resultadoRef}
            tabIndex={-1}
            role="status"
            severity="success"
            sx={{ mt: '16px' }}
          >
            {MENSAGEM_ENVIADO}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: '12px' }}>
              Informe o e-mail da sua conta para receber um link de redefinição
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="email"
                type="email"
                label="E-mail"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={enviando}
                sx={{ mt: '8px', py: '6px' }}
              >
                {enviando ? 'Enviando...' : 'Enviar link'}
              </Button>
            </Box>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: '16px' }}>
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
            sx={{ color: 'primary.main', fontWeight: 600 }}
          >
            Voltar para o login
          </Link>
        </Typography>
      </Paper>
    </AuthPageLayout>
  );
};

export default EsqueciSenha;
