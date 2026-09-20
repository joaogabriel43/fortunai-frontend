import React from 'react';
import { render as renderRTL, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme';
import CookieConsentBanner from '../CookieConsentBanner';
import {
  COOKIE_CONSENT_KEY,
  hasAnalyticsConsent,
  onCookieConsentChange,
} from '../../../utils/cookieConsent';

// Tokens customizados do tema (surfaces.raised) exigem ThemeProvider.
const render = () =>
  renderRTL(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('aparece enquanto não há escolha e não concede consentimento por padrão', () => {
    render();
    expect(screen.getByRole('region', { name: /preferências de cookies/i })).toBeInTheDocument();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('linka para a Política de Privacidade', () => {
    render();
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute('href', '/privacidade');
  });

  it('Aceitar persiste, publica o evento e some', () => {
    const cb = vi.fn();
    onCookieConsentChange(cb);
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');
    expect(hasAnalyticsConsent()).toBe(true);
    expect(cb).toHaveBeenCalledWith('accepted');
    expect(screen.queryByRole('region', { name: /preferências de cookies/i })).not.toBeInTheDocument();
  });

  it('Recusar persiste como declined, mantém analytics bloqueado e some', () => {
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('declined');
    expect(hasAnalyticsConsent()).toBe(false);
    expect(screen.queryByRole('region', { name: /preferências de cookies/i })).not.toBeInTheDocument();
  });

  it('não reaparece quando já existe escolha salva', () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    render();
    expect(screen.queryByRole('region', { name: /preferências de cookies/i })).not.toBeInTheDocument();
  });
});
