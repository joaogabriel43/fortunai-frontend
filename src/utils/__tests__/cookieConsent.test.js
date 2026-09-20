import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  setCookieConsent,
  hasAnalyticsConsent,
  onCookieConsentChange,
} from '../cookieConsent';

describe('cookieConsent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sem escolha registrada não há consentimento', () => {
    expect(getCookieConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('aceitar libera analytics e persiste', () => {
    setCookieConsent('accepted');
    expect(hasAnalyticsConsent()).toBe(true);
    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');
  });

  it('recusar NÃO libera analytics', () => {
    setCookieConsent('declined');
    expect(getCookieConsent()).toBe('declined');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('valor adulterado no storage é tratado como sem consentimento', () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    expect(getCookieConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('rejeita valores inválidos', () => {
    expect(() => setCookieConsent('yes')).toThrow();
  });

  it('notifica assinantes e permite cancelar a assinatura', () => {
    const cb = vi.fn();
    const off = onCookieConsentChange(cb);
    setCookieConsent('accepted');
    expect(cb).toHaveBeenCalledWith('accepted');
    off();
    setCookieConsent('declined');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('localStorage indisponível: leitura vira null e escrita não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const cb = vi.fn();
    onCookieConsentChange(cb);
    expect(getCookieConsent()).toBeNull();
    expect(() => setCookieConsent('accepted')).not.toThrow();
    expect(cb).toHaveBeenCalledWith('accepted');
  });
});
