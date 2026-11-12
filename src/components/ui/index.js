// src/components/ui/index.js
// ───────────────────────────────────────────────────────────────────
// Barrel for the Pondero data-viz primitives. Plain JS (no JSX) so it
// stays valid regardless of Vite's .js/.jsx loader config.
//
//   import { RingGauge, Donut, Sparkline } from '@/components/ui';

export { default as RingGauge, useMountTween } from './RingGauge';
export { default as Donut } from './Donut';
export { default as Sparkline } from './Sparkline';

// ── money formatting helpers (mono figures are styled via theme) ────

/**
 * Format a number as Brazilian Real.
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export const formatBRL = (value, options = {}) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', ...options }).format(value ?? 0);

/**
 * Compact Real (e.g. "R$ 187,4 mil"). Good for tight legend/stat slots.
 * @param {number} value
 * @returns {string}
 */
export const formatBRLShort = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value ?? 0);

/**
 * Quantidade de ativo em pt-BR: até 8 casas (coluna numeric(38,8), V16),
 * sem zeros à direita (0,25 / 1,5 / 0,00012345 / 100).
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export const formatQuantidade = (value) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(Number(value ?? 0));
