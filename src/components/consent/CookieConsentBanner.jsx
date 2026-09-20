import React, { useState } from 'react';
import { Box, Button, Link, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import { Link as RouterLink } from 'react-router-dom';
import {
  CONSENT_ACCEPTED,
  CONSENT_DECLINED,
  getCookieConsent,
  setCookieConsent,
} from '../../utils/cookieConsent';

/**
 * Banner de consentimento de cookies/ferramentas de análise.
 * Aparece até o usuário escolher; a escolha fica em localStorage e é
 * publicada por evento (ver utils/cookieConsent) para os loaders de terceiros.
 */
const CookieConsentBanner = () => {
  const [decided, setDecided] = useState(() => getCookieConsent() !== null);

  if (decided) return null;

  const escolher = (valor) => {
    setCookieConsent(valor);
    setDecided(true);
  };

  return (
    <Box
      role="region"
      aria-label="Preferências de cookies"
      sx={(theme) => ({
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: { xs: 16, md: 24 },
        mx: 'auto',
        width: 'min(720px, calc(100% - 32px))',
        zIndex: 9100,
        display: 'flex',
        alignItems: { xs: 'stretch', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        bgcolor: 'surfaces.raised',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      })}
    >
      <CookieOutlinedIcon
        aria-hidden="true"
        sx={{ color: 'primary.main', fontSize: 22, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
      />
      <Typography variant="body2" sx={{ color: 'text.primary', flex: 1 }}>
        Usamos apenas o armazenamento essencial para manter sua sessão. Com a sua
        autorização, também podemos usar ferramentas de análise de uso para melhorar o
        Pondero. Saiba mais na{' '}
        <Link component={RouterLink} to="/privacidade" underline="always" color="primary">
          Política de Privacidade
        </Link>
        .
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexShrink: 0 }}>
        <Button
          size="small"
          onClick={() => escolher(CONSENT_DECLINED)}
          sx={{ color: 'text.secondary', textTransform: 'none', fontSize: 12 }}
        >
          Recusar
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => escolher(CONSENT_ACCEPTED)}
          sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, fontSize: 12 }}
        >
          Aceitar
        </Button>
      </Box>
    </Box>
  );
};

export default CookieConsentBanner;
