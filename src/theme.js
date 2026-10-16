// src/theme.js — Pondero MUI v7 theme
// ───────────────────────────────────────────────────────────────────
// Fonte única da verdade dos tokens visuais (DESIGN.md + protótipo
// `docs/brand/pondero-dashboard-prototype.html`).
//
// Diferença estrutural em relação à versão D4 dark-only: o tema agora é
// uma FÁBRICA por modo (`createAppTheme('light' | 'dark')`). O export
// default continua sendo o tema escuro pronto, porque ~20 arquivos de
// teste fazem `import theme from '@/theme'` — quebrar essa assinatura
// custaria churn sem ganho algum.
//
// Fontes: DM Sans (UI), IBM Plex Mono (valores financeiros) e Fraunces
// (apenas momentos editoriais) chegam pelo Google Fonts em index.html,
// mesmo mecanismo que a Inter já usava — zero dependência nova.

import { createTheme } from '@mui/material/styles';

// ── Famílias tipográficas ───────────────────────────────────────────
export const font = {
  ui: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 };
export const motion = { ease: 'cubic-bezier(.22,.7,.3,1)', dur: 900 };

// Semânticas de estado — idênticas nos dois modos (DESIGN.md).
const status = {
  positive: '#76A968',
  negative: '#C76562',
  warning: '#C78C3D',
  information: '#5F8F9A',
};

// ── Paletas por modo ────────────────────────────────────────────────
// Valores transcritos de html[data-theme=...] do protótipo Pondero.
// `series` mantém ordem estável para que legenda e donut nunca troquem
// de cor entre renders.
const palettes = {
  light: {
    bg: '#F4EEE3',
    bgSoft: '#EEE5D7',
    panel: '#FFFDF8',
    surface: '#FFFDF8',
    surfaceSoft: '#F8F4EA',
    raised: '#FFFAF0',
    strong: '#173029',

    text: '#19372F',
    textDim: '#68776E',
    textFaint: '#89948E',

    primary: '#285F50',
    primaryHi: '#31735F',
    primaryLo: '#1E5143',
    primarySoft: 'rgba(40,95,80,0.10)',
    onPrimary: '#FFFDF8',

    accentNatural: '#5E8138',
    accentSoft: 'rgba(94,129,56,0.12)',
    copper: '#D49A69',
    // O cobre claro serve como preenchimento/decoracao, mas como TEXTO sobre
    // papel quente ele fica em 2,38:1 — reprova o SC 1.4.3 (4,5:1). Esta e a
    // mesma familia de cor, rebaixada para uso tipografico: 4,97:1 sobre
    // #FFFDF8. No escuro nao ha esse problema, entao o valor e o mesmo cobre.
    copperText: '#9A6432',
    // Anel de foco: no claro o verde primario a 45% de opacidade caia para
    // ~2,04:1 contra o creme. Solido e escuro, passa com folga (SC 1.4.11).
    focusRing: '#1E5143',
    // Semanticas de estado como TEXTO (SC 1.4.3). Os tons de `status` servem a
    // icone/fundo/borda, mas como texto reprovam no claro (ex.: #76A968 sobre
    // #FFFDF8 = 2,7:1). Mesma familia de matiz, so rebaixados; >= 4,5:1 sobre
    // papel #FFFDF8 e sobre o canvas #F4EEE3 (4,8:1 a 5,8:1) e tambem sobre o
    // fundo de chip (main a 20% sobre o papel, ~4,6:1) onde o texto aparece.
    posText: '#4B7241',
    negText: '#AC413D',
    warnText: '#885F27',
    infoText: '#476A73',

    line: 'rgba(25,55,47,0.13)',
    lineStrong: 'rgba(25,55,47,0.22)',
    inputBorder: 'rgba(25,55,47,0.20)',
    inputBorderHover: 'rgba(25,55,47,0.34)',

    shadowLow: '0 10px 28px rgba(30,55,45,0.08)',
    shadowHigh: '0 24px 70px rgba(30,55,45,0.11)',

    // Panorama G3-A: material translúcido apoiado direto no ambiente,
    // sem placa opaca por baixo.
    panorama: 'rgba(23,48,41,0.92)',
    panoramaText: '#EFF2ED',
    panoramaMuted: '#B9C5BF',
    panoramaAccent: '#B8D979',
    // Hairlines e material interno DENTRO da placa do panorama: a placa é
    // escura nos dois temas, então esses tons são claros nos dois.
    panoramaLine: 'rgba(255,255,255,0.14)',
    panoramaOnAccent: '#0B1410',
    panoramaInner: 'rgba(255,255,255,0.05)',
    panoramaInnerLine: 'rgba(255,255,255,0.10)',
    chartGrid: 'rgba(25,55,47,0.10)',

    series: ['#285F50', '#5F8F9A', '#D49A69', '#5E8138', '#8C6BA0'],
  },
  dark: {
    bg: '#09100E',
    bgSoft: '#0E1714',
    panel: '#0E1714',
    surface: '#101815',
    surfaceSoft: '#121D19',
    raised: '#17231F',
    strong: '#1D352D',

    text: '#EFF2ED',
    textDim: '#9AA69F',
    textFaint: '#707D76',

    primary: '#B8D979',
    primaryHi: '#C9E793',
    primaryLo: '#9DBE60',
    primarySoft: 'rgba(184,217,121,0.10)',
    onPrimary: '#09100E',

    accentNatural: '#B8D979',
    accentSoft: 'rgba(184,217,121,0.11)',
    copper: '#D49A69',
    copperText: '#D49A69',
    focusRing: '#B8D979',
    // No escuro os tons de `status` ja passam (>= 4,7:1 sobre papel e canvas).
    // Ressalva: sobre chip tingido (20%) no escuro negativo/info ficam ~3,7:1 (ja era assim
    // antes; tokens proprios do escuro ficam como pendencia, ver docs/sprints/F9.md).
    posText: status.positive,
    negText: status.negative,
    warnText: status.warning,
    infoText: status.information,

    line: 'rgba(255,255,255,0.085)',
    lineStrong: 'rgba(255,255,255,0.15)',
    inputBorder: 'rgba(255,255,255,0.14)',
    inputBorderHover: 'rgba(255,255,255,0.26)',

    shadowLow: '0 12px 32px rgba(0,0,0,0.26)',
    shadowHigh: '0 30px 88px rgba(0,0,0,0.35)',

    panorama: 'rgba(23,35,31,0.82)',
    panoramaText: '#EFF2ED',
    panoramaMuted: '#9AA69F',
    panoramaAccent: '#B8D979',
    panoramaLine: 'rgba(255,255,255,0.11)',
    panoramaOnAccent: '#0B1410',
    panoramaInner: 'rgba(255,255,255,0.045)',
    panoramaInnerLine: 'rgba(255,255,255,0.09)',
    chartGrid: 'rgba(255,255,255,0.07)',

    series: ['#B8D979', '#5F8F9A', '#D49A69', '#76A968', '#B39BC8'],
  },
};

export const COLOR_MODES = ['light', 'dark'];

/**
 * Tokens do modo pedido. Mesmo formato do `tokens` exportado pela
 * versão anterior do arquivo (colors/radius/space/font/motion).
 * @param {'light'|'dark'} mode
 */
export function getTokens(mode = 'dark') {
  const p = palettes[mode] ?? palettes.dark;
  return {
    colors: { ...p, ...status, pos: status.positive, neg: status.negative, warn: status.warning },
    radius,
    space,
    font,
    motion,
  };
}

// Back-compat: `tokens` sem argumento continua sendo o conjunto escuro.
export const tokens = getTokens('dark');

/**
 * Constrói o tema MUI para um modo. TODAS as extensões customizadas de
 * palette (`surfaces`, `lines`, `accent`, `series`) existem nos DOIS
 * modos — os ~24 call sites que as leem funcionam em claro e escuro sem
 * nenhum condicional.
 * @param {'light'|'dark'} mode
 */
export function createAppTheme(mode = 'dark') {
  const c = palettes[mode] ?? palettes.dark;
  const isDark = mode === 'dark';

  return createTheme({
    cssVariables: { cssVarPrefix: 'fa' },

    palette: {
      mode,
      primary: { main: c.primary, light: c.primaryHi, dark: c.primaryLo, contrastText: c.onPrimary },
      secondary: { main: c.copper, contrastText: isDark ? '#09100E' : '#19372F' },
      success: { main: status.positive, contrastText: isDark ? '#06140F' : '#FFFDF8' },
      error: { main: status.negative, contrastText: '#FFFDF8' },
      warning: { main: status.warning, contrastText: isDark ? '#1A1203' : '#FFFDF8' },
      info: { main: status.information, contrastText: '#FFFDF8' },
      background: { default: c.bg, paper: c.surface },
      text: { primary: c.text, secondary: c.textDim, disabled: c.textFaint },
      divider: c.line,

      // ── custom palette extensions (read via theme.palette.*) ────────
      surfaces: {
        bg: c.bg,
        bgSoft: c.bgSoft,
        panel: c.panel,
        surface: c.surface,
        surfaceSoft: c.surfaceSoft,
        raised: c.raised,
        strong: c.strong,
      },
      lines: { subtle: c.line, strong: c.lineStrong },
      // Estado semantico para uso como TEXTO (success.main continua para icone/fundo).
      statusText: {
        positive: c.posText,
        negative: c.negText,
        warning: c.warnText,
        information: c.infoText,
      },
      accent: {
        primarySoft: c.primarySoft,
        natural: c.accentNatural,
        naturalSoft: c.accentSoft,
        copper: c.copper,
        copperText: c.copperText,
        // `pink` sobrevive como alias: componentes legados leem esse nome.
        pink: c.copper,
        textFaint: c.textFaint,
        focusRing: c.focusRing,
      },
      // Panorama G3-A — material próprio, não é uma "surface" comum.
      panorama: {
        bg: c.panorama,
        text: c.panoramaText,
        muted: c.panoramaMuted,
        accent: c.panoramaAccent,
        onAccent: c.panoramaOnAccent,
        line: c.panoramaLine,
        inner: c.panoramaInner,
        innerLine: c.panoramaInnerLine,
      },
      chart: { grid: c.chartGrid },
      elevation: { low: c.shadowLow, high: c.shadowHigh },
      series: c.series,
    },

    // base 4px: theme.spacing(1) === 4px → space tokens mapeiam 1:1
    spacing: 4,
    shape: { borderRadius: radius.lg },
    radius,
    motion,

    typography: {
      fontFamily: font.ui,
      fontFamilyMono: font.mono, // usar em TODO valor monetário comparável
      fontFamilyDisplay: font.display, // Fraunces só em momento editorial
      h1: { fontWeight: 700, letterSpacing: '-0.035em' },
      h2: { fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontWeight: 600, letterSpacing: '-0.025em' },
      h4: { fontWeight: 600, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, letterSpacing: '-0.015em' },
      body1: { lineHeight: 1.55 },
      button: { fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
      overline: { fontWeight: 600, letterSpacing: '0.095em', fontSize: '0.66rem' },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFeatureSettings: '"tnum" 1',
            backgroundColor: c.bg,
            color: c.text,
            transition: `background-color 320ms ${motion.ease}, color 240ms ${motion.ease}`,
          },
          // Acessibilidade: quem pede menos movimento não recebe animação.
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            outline: 'none',
            '&.Mui-focusVisible': {
              outline: 'none',
              backgroundColor: c.primarySoft,
              borderRadius: radius.md,
            },
            '&:focus': { outline: 'none' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: c.surface,
            backgroundImage: 'none',
            border: `1px solid ${c.line}`,
            borderRadius: radius.lg,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: c.surface,
            backgroundImage: 'none',
            border: `1px solid ${c.line}`,
            borderRadius: radius.lg,
            boxShadow: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          // Flat by default: sem gradiente nem sombra colorida (DESIGN.md).
          // Contrato de altura: 40 px por padrao (denso, telas de app); 48 px em size="large" (CTAs da landing). F9.
          root: { borderRadius: radius.md, fontWeight: 700, paddingInline: 18, minHeight: 40 },
          sizeLarge: { minHeight: 48 },
          containedPrimary: {
            backgroundColor: c.primary,
            color: c.onPrimary,
            boxShadow: 'none',
            '&:hover': { backgroundColor: c.primaryHi, boxShadow: 'none' },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: c.inputBorder },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.inputBorderHover },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.primary },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.inputBorder },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.inputBorderHover },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.primary },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 6, borderRadius: 4, backgroundColor: c.line },
          bar: { borderRadius: 4 },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: c.line } } },
      MuiChip: { styleOverrides: { root: { borderRadius: radius.sm } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: c.raised,
            color: c.text,
            border: `1px solid ${c.lineStrong}`,
            fontSize: 12,
          },
        },
      },
    },
  });
}

export const theme = createAppTheme('dark');
export const lightTheme = createAppTheme('light');

/**
 * Achata os tokens nas custom properties `--c-*` / `--r-*` / `--f-*`
 * consumidas pelo CSS escrito à mão.
 * @param {'light'|'dark'} [mode]
 * @returns {Record<string,string>} mapa de variáveis (para spread em sx/style)
 */
export function cssVars(mode = 'dark') {
  const c = palettes[mode] ?? palettes.dark;
  return {
    '--c-bg': c.bg, '--c-bg-soft': c.bgSoft, '--c-panel': c.panel,
    '--c-surface': c.surface, '--c-surface-soft': c.surfaceSoft, '--c-raised': c.raised,
    '--c-line': c.line, '--c-line-strong': c.lineStrong,
    '--c-tx': c.text, '--c-tx2': c.textDim, '--c-tx3': c.textFaint,
    '--c-pri': c.primary, '--c-pri-hi': c.primaryHi, '--c-pri-lo': c.primaryLo,
    '--c-pri-soft': c.primarySoft,
    '--c-pos': status.positive, '--c-neg': status.negative,
    '--c-warn': status.warning, '--c-info': status.information,
    '--c-pos-text': c.posText, '--c-neg-text': c.negText,
    '--c-warn-text': c.warnText, '--c-info-text': c.infoText,
    // alias legado — o acento de dado deste tema é o cobre, não o rosa D4
    '--c-pink': c.copper,
    '--c-focus': c.focusRing,
    '--c-panorama': c.panorama, '--c-panorama-tx': c.panoramaText,
    '--c-chart-grid': c.chartGrid,
    '--c-shadow-low': c.shadowLow, '--c-shadow-high': c.shadowHigh,
    '--r-sm': `${radius.sm}px`, '--r-md': `${radius.md}px`,
    '--r-lg': `${radius.lg}px`, '--r-xl': `${radius.xl}px`, '--r-pill': `${radius.pill}px`,
    '--f-ui': font.ui, '--f-mono': font.mono, '--f-display': font.display,
    '--ease': motion.ease,
  };
}

/**
 * Aplica as custom properties no elemento raiz. A assinatura mantém `el`
 * como primeiro parâmetro para não quebrar chamadas antigas.
 * @param {HTMLElement} [el]
 * @param {'light'|'dark'} [mode]
 */
export function applyCssVars(el, mode = 'dark') {
  const target = el ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  const vars = cssVars(mode);
  for (const k in vars) target.style.setProperty(k, vars[k]);
}

export default theme;
