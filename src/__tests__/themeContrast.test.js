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

describe('regressao de valores', () => {
  it('claro: positiveText escurecido (ratio calculado fixo sobre o canvas)', () => {
    const { colors } = getTokens('light')
    expect(colors.posText).not.toBe(STATUS_MAIN.success)
    expect(ratio(colors.posText, colors.bg)).toBeCloseTo(4.6, 1)
  })

  it('o tom original reprova no claro (motivo da existencia dos tokens)', () => {
    const { colors } = getTokens('light')
    expect(ratio(STATUS_MAIN.success, colors.surface)).toBeLessThan(4.5)
  })
})
