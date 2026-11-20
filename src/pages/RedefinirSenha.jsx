import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Alert, Link } from '@mui/material';
import authService from '../services/authService';
import { logErroSeguro } from '../utils/apiErrorUtils';
import { regrasSenha, senhaValida } from '../utils/senhaPolicy';
import PasswordField from '../components/PasswordField';
import AuthPageLayout from '../components/public/AuthPageLayout';
import { cardSx, inputSx } from '../components/public/authFormSx';
import Seo from '../components/Seo';
import { PAGINAS } from '../seo/paginas';

const MENSAGEM_POLITICA = 'A senha precisa ter pelo menos 8 caracteres, com pelo menos 1 letra e 1 número.';
const MENSAGEM_DIVERGENTE = 'As senhas não coincidem';
const MENSAGEM_FALHA = 'Não foi possível redefinir a senha agora. Tente novamente em instantes.';

// O token do link vem SÓ do fragmento (#token=...): o fragmento não vai ao
// servidor nem ao header Referer. A query string (?token=) é ignorada de propósito.
// Parse manual (não URLSearchParams) para não trocar "+" por espaço.
const lerTokenDoFragmento = () => {
  const par = window.location.hash
    .slice(1)
    .split('&')
    .find((trecho) => trecho.startsWith('token='));
  if (!par) return '';
  try {
    return decodeURIComponent(par.slice('token='.length));
  } catch {
    return '';
  }
};

const RedefinirSenha = () => {
  const navigate = useNavigate();
  // O token vive só neste estado: nunca em storage, URL montada ou log.
  const [token, setToken] = useState(lerTokenDoFragmento);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [senhaRecusada, setSenhaRecusada] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const resultadoRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmarRef = useRef(null);

  // Tira o fragmento da barra de endereço (e do histórico) logo após a leitura.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      );
    }
  }, []);

  const linkInvalido = !sucesso && !token;

  // Leva o foco para a mensagem de resultado (leitor de tela e teclado).
  useEffect(() => {
    if (sucesso || linkInvalido) resultadoRef.current?.focus();
  }, [sucesso, linkInvalido]);

  useEffect(() => {
    if (!sucesso) return undefined;
    const timer = setTimeout(() => navigate('/login', { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [sucesso, navigate]);

  const regras = regrasSenha(senha);
  const senhaComErro = senhaRecusada || (tentouEnviar && !senhaValida(senha));
  const senhasDivergem = (confirmarSenha.length > 0 || tentouEnviar) && confirmarSenha !== senha;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (enviando) return;
    setTentouEnviar(true);
    setFalhou(false);
    if (!senhaValida(senha)) {
      senhaRef.current?.focus();
      return;
    }
    if (confirmarSenha !== senha) {
      confirmarRef.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      await authService.redefinirSenha(token, senha);
      setToken('');
      setSucesso(true);
    } catch (err) {
      // Convenção do backend: o código de erro vem em `erro` (ver useExtratoImportacao).
      const status = err?.response?.status;
      const codigo = err?.response?.data?.erro;
      if (status === 400 && codigo === 'TOKEN_INVALIDO') {
        setToken('');
      } else if (status === 400) {
        // SENHA_INVALIDA ou corpo de Bean Validation sem código: mostra a política.
        setSenhaRecusada(true);
        senhaRef.current?.focus();
      } else {
        // Rede, 5xx, 429: o token segue em memória para uma nova tentativa.
        setFalhou(true);
      }
      logErroSeguro('Erro ao redefinir senha', err);
    } finally {
      setEnviando(false);
    }
  };

  const renderConteudo = () => {
    if (sucesso) {
      return (
        <Alert ref={resultadoRef} tabIndex={-1} role="status" severity="success" sx={{ mt: '16px' }}>
          Senha redefinida com sucesso. Redirecionando para o login...
        </Alert>
      );
    }

    if (linkInvalido) {
      return (
        <>
          <Alert ref={resultadoRef} tabIndex={-1} severity="error" sx={{ mt: '16px' }}>
            Link inválido ou expirado. Peça um novo link para redefinir a senha.
          </Alert>
          <Button
            component={RouterLink}
            to="/esqueci-senha"
            variant="contained"
            fullWidth
            sx={{ mt: '16px', py: '6px' }}
          >
            Pedir outro link
          </Button>
        </>
      );
    }

    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: '12px' }}>
          Crie uma nova senha para a sua conta
        </Typography>

        <Box component="form" noValidate onSubmit={handleSubmit}>
          <PasswordField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="nova-senha"
            name="novaSenha"
            label="Nova senha"
            autoComplete="new-password"
            autoFocus
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setSenhaRecusada(false);
            }}
            inputRef={senhaRef}
            error={senhaComErro}
            helperText={
              <>
                {senhaComErro && (
                  <Box component="span" role="alert" sx={{ display: 'block', mb: '4px' }}>
                    {MENSAGEM_POLITICA}
                  </Box>
                )}
                {[
                  { ok: regras.tamanho, texto: 'Mínimo de 8 caracteres' },
                  { ok: regras.letra, texto: 'Pelo menos 1 letra' },
                  { ok: regras.numero, texto: 'Pelo menos 1 número' },
                ].map(({ ok, texto }) => (
                  <Box
                    key={texto}
                    component="span"
                    sx={{ display: 'block', color: ok ? 'statusText.positive' : 'text.disabled' }}
                  >
                    {ok ? '✓' : '○'} {texto}
                  </Box>
                ))}
              </>
            }
            slotProps={{ formHelperText: { component: 'div' } }}
            InputLabelProps={{ shrink: true }}
            sx={inputSx}
          />
          <PasswordField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="confirmar-senha"
            name="confirmarSenha"
            label="Confirmar nova senha"
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            inputRef={confirmarRef}
            error={senhasDivergem}
            helperText={senhasDivergem ? MENSAGEM_DIVERGENTE : ''}
            InputLabelProps={{ shrink: true }}
            sx={inputSx}
          />

          {falhou && (
            <Alert severity="error" sx={{ mt: '8px' }}>
              {MENSAGEM_FALHA}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={enviando}
            sx={{ mt: '8px', py: '6px' }}
          >
            {enviando ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </Box>
      </>
    );
  };

  return (
    <AuthPageLayout>
      <Seo {...PAGINAS.redefinirSenha} />
      <Paper sx={cardSx}>
        <Typography
          variant="h5"
          component="h1"
          fontWeight={700}
          sx={{ color: 'primary.main', mb: '4px', textAlign: 'center' }}
        >
          Redefinir senha
        </Typography>

        {renderConteudo()}

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

export default RedefinirSenha;
