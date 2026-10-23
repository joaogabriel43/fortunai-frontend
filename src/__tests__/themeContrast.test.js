import { describe, expect, it } from 'vitest'
import { createAppTheme, getTokens } from '../theme'

// Luminancia relativa e razao de contraste conforme WCAG 2.x (SC 1.4.3).
const channel = (v) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Tons de status ORIGINAIS: servem a icone/fundo/borda e nao podem mudar.
const STATUS_MAIN = {
  success: '#76A968',
  error: '#C76562',
  warning: '#C78C3D',
  info: '#5F8F9A',
}

const TEXT_KEYS = ['posText', 'negText', 'warnText', 'infoText']
const PALETTE_KEYS = { posText: 'positive', negText: 'negative', warnText: 'warning', infoText: 'information' }

describe('ratio() — funcao de contraste do proprio teste', () => {
  it('preto sobre branco = 21 e identico = 1', () => {
    expect(ratio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(ratio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })
})

describe.each(['light', 'dark'])('tokens de texto semantico — tema %s', (mode) => {
  const { colors } = getTokens(mode)
  const theme = createAppTheme(mode)
  const { statusText } = theme.palette

  it.each(TEXT_KEYS)('%s >= 4,5:1 sobre papel e sobre canvas', (key) => {
    expect(colors[key]).toMatch(/^#[0-9A-F]{6}$/i)
    expect(ratio(colors[key], colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(colors[key], colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('palette.statusText espelha getTokens().colors e as superficies batem com o tema', () => {
    for (const key of TEXT_KEYS) expect(statusText[PALETTE_KEYS[key]]).toBe(colors[key])
    expect(theme.palette.background.paper).toBe(colors.surface)
    expect(theme.palette.background.default).toBe(colors.bg)
  })

  it('success/error/warning/info.main continuam os tons originais (paleta nao trocada)', () => {
    for (const [name, hex] of Object.entries(STATUS_MAIN)) {
      expect(theme.palette[name].main).toBe(hex)
    }
  })
})

// Chips/avisos pintam o texto sobre alpha(main, ate 0.2) sobre o papel.
const blend = (fg, bg, a) =>
  '#' + [1, 3, 5].map((i) => Math.round(a * parseInt(fg.slice(i, i + 2), 16) + (1 - a) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('').toUpperCase()

const MAIN = { posText: STATUS_MAIN.success, negText: STATUS_MAIN.error, warnText: STATUS_MAIN.warning, infoText: STATUS_MAIN.info }

describe.each(['light', 'dark'])('tokens de texto sobre fundo tingido (chip a 20 por cento) — tema %s', (mode) => {
  const { colors } = getTokens(mode)
  it.each(TEXT_KEYS)('%s >= 4,5:1 sobre o tom a 20 por cento sobre o papel', (key) => {
    expect(ratio(colors[key], blend(MAIN[key], colors.surface, 0.2))).toBeGreaterThanOrEqual(4.5)
  })
})

describe.each(['light', 'dark'])('text.secondary — tema %s', (mode) => {
  const { colors } = getTokens(mode)
  const theme = createAppTheme(mode)
  it('palette.text.secondary espelha textDim e passa >= 4,5:1 sobre canvas e papel', () => {
    expect(theme.palette.text.secondary).toBe(colors.textDim)
    expect(ratio(colors.textDim, colors.bg)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(colors.textDim, colors.surface)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('regressao: textDim claro media 4,084:1 sobre o canvas', () => {
  it('fica na mesma familia (matiz verde-acinzentado) e escurece pouco', () => {
    const { colors } = getTokens('light')
    expect(colors.textDim).not.toBe('#68776E')
    expect(ratio('#68776E', colors.bg)).toBeCloseTo(4.084, 2)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(colors.textDim.slice(i, i + 2), 16))
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThanOrEqual(b)
  })
})

describe('regressao: dark negText/infoText eram os tons de status (3,7:1 e 3,9:1 sobre o chip)', () => {
  it('negText e infoText do escuro sao tokens proprios, distintos de status.main', () => {
    const { colors } = getTokens('dark')
    expect(colors.negText).not.toBe(STATUS_MAIN.error)
    expect(colors.infoText).not.toBe(STATUS_MAIN.info)
  })
})

describe('regressao de valores', () => {
  it('claro: positiveText escurecido (ratio calculado fixo sobre o canvas)', () => {
    const { colors } = getTokens('light')
    expect(colors.posText).not.toBe(STATUS_MAIN.success)
    expect(ratio(colors.posText, colors.bg)).toBeCloseTo(4.8, 1)
  })

  it('o tom original reprova no claro (motivo da existencia dos tokens)', () => {
    const { colors } = getTokens('light')
    expect(ratio(STATUS_MAIN.success, colors.surface)).toBeLessThan(4.5)
  })
})
