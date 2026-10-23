import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { alpha, useTheme } from '@mui/material/styles';
import ThemeToggle from '../layout/ThemeToggle';

const PublicHeader = ({ anchors = [], onNavigateSection, variant = 'landing' }) => {
  const theme = useTheme();
  const isAuth = variant === 'auth';

  return (
    <Box
      component="header"
      data-testid="public-header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
        bgcolor: alpha(theme.palette.background.default, 0.75),
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <Typography
            component={RouterLink}
            to="/"
            aria-label="Pondero"
            variant="h6"
            fontWeight={700}
            sx={{
              color: 'primary.main',
              letterSpacing: '-0.5px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Pondero
          </Typography>

          {!isAuth && (
            <Box component="nav" aria-label="Seções da página inicial"
              sx={{ display: { xs: 'none', md: 'flex' }, gap: 2.5 }}>
              {anchors.map((anchor) => (
                <Button
                  key={anchor.id}
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={() => onNavigateSection?.(anchor.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  {anchor.label}
                </Button>
              ))}
            </Box>
          )}

          {isAuth ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 1 } }}>
              <ThemeToggle />
              <Button
                component={RouterLink}
                to="/"
                variant="text"
                color="inherit"
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
              >
                Voltar ao início
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 1 } }}>
              <ThemeToggle />
              <Button component={RouterLink} to="/login" variant="text" data-testid="landing-btn-entrar">
                Entrar
              </Button>
              <Button component={RouterLink} to="/registrar" variant="contained" data-testid="landing-btn-criar-conta">
                Criar conta grátis
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PublicHeader;
