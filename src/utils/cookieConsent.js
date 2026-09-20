// Consentimento de cookies/rastreamento (LGPD). Distinto do ConsentimentoModal,
// que registra o aceite dos Termos no backend: este é apenas uma preferência do
// navegador e por isso vive em localStorage.
//
// Contrato para loaders de terceiros (GA, Clarity...): NUNCA injetar script
// antes de `hasAnalyticsConsent()` retornar true; reagir a mudanças com
// `onCookieConsentChange`. Sem escolha registrada = sem consentimento.

export const COOKIE_CONSENT_KEY = 'pondero:cookie-consent';
export const COOKIE_CONSENT_EVENT = 'pondero:cookie-consent-change';

export const CONSENT_ACCEPTED = 'accepted';
export const CONSENT_DECLINED = 'declined';

/** @returns {'accepted' | 'declined' | null} null = usuário ainda não decidiu. */
export function getCookieConsent() {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === CONSENT_ACCEPTED || value === CONSENT_DECLINED ? value : null;
  } catch {
    // localStorage bloqueado (modo privado restrito): trata como "sem consentimento".
    return null;
  }
}

export function setCookieConsent(value) {
  if (value !== CONSENT_ACCEPTED && value !== CONSENT_DECLINED) {
    throw new Error(`Valor de consentimento inválido: ${value}`);
  }
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // Sem persistência: a escolha vale só nesta sessão, via evento abaixo.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}

export function hasAnalyticsConsent() {
  return getCookieConsent() === CONSENT_ACCEPTED;
}

/** Assina mudanças de consentimento. Retorna a função de cancelamento. */
export function onCookieConsentChange(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(COOKIE_CONSENT_EVENT, handler);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
}
