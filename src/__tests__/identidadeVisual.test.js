import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getTokens } from '../theme'

const raiz = (...p) => resolve(__dirname, '..', '..', ...p)
const lerTexto = (...p) => readFileSync(raiz(...p), 'utf8')
// IHDR do PNG: largura nos bytes 16-19, altura nos 20-23 (big-endian).
const dimensoesPng = (...p) => {
  const b = readFileSync(raiz(...p))
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

describe('identidade visual provisória do Pondero ("P")', () => {
  const html = lerTexto('index.html')

  it('o favicon não é mais o logo do Vite', () => {
    expect(html).not.toContain('vite.svg')
    expect(existsSync(raiz('public', 'vite.svg'))).toBe(false)
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />')
    expect(existsSync(raiz('public', 'favicon.svg'))).toBe(true)
  })

  it('o favicon usa as cores do tema escuro (tokens de theme.js)', () => {
    const { bg, primary } = getTokens('dark').colors
    const svg = lerTexto('public', 'favicon.svg').toLowerCase()
    expect(svg).toContain(bg.toLowerCase())
    expect(svg).toContain(primary.toLowerCase())
    // nada do roxo do FortunAI
    expect(svg).not.toContain('#7c3aed')
  })

  it('apple-touch-icon aponta para um PNG 180x180 próprio', () => {
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">')
    expect(dimensoesPng('public', 'icons', 'apple-touch-icon.png')).toEqual([180, 180])
  })

  it('ícones do manifest existem com o tamanho declarado', () => {
    const config = lerTexto('vite.config.js')
    expect(config).toContain("src: '/icons/pwa-192x192.png'")
    expect(config).toContain("src: '/icons/pwa-512x512.png'")
    expect(dimensoesPng('public', 'icons', 'pwa-192x192.png')).toEqual([192, 192])
    expect(dimensoesPng('public', 'icons', 'pwa-512x512.png')).toEqual([512, 512])
  })

  it('o gerador não desenha mais o "F" roxo do FortunAI', () => {
    const gerador = lerTexto('scripts', 'generate-icons.js')
    expect(gerador).not.toContain('#7C3AED')
    expect(gerador).not.toMatch(/>F<\/text>/)
  })
})
