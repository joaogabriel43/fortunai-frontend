import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

const projectFile = (path) => resolve(cwd(), path)
const readProjectFile = (path) => readFileSync(projectFile(path), 'utf8')

const cspValue = () => {
  const config = JSON.parse(readProjectFile('vercel.json'))
  return config.headers
    .flatMap(({ headers }) => headers)
    .find(({ key }) => key === 'Content-Security-Policy')
    .value
}

const vercelConfig = () => JSON.parse(readProjectFile('vercel.json'))

const cspDirective = (name) => cspValue()
  .split(';')
  .map((directive) => directive.trim())
  .find((directive) => directive.startsWith(`${name} `))

describe('Content Security Policy de produção', () => {
  it('permite carregar as folhas e os arquivos das fontes do Google', () => {
    expect(cspDirective('style-src')).toContain('https://fonts.googleapis.com')
    expect(cspDirective('font-src')).toContain('https://fonts.gstatic.com')
  })

  it('permite HTTPS e WebSocket seguro para o backend real', () => {
    expect(cspDirective('connect-src')).toContain('https://api.pondero.com.br')
    expect(cspDirective('connect-src')).toContain('wss://api.pondero.com.br')
    expect(cspDirective('connect-src')).toContain('https://finassistant-api.onrender.com')
    expect(cspDirective('connect-src')).toContain('wss://finassistant-api.onrender.com')
    expect(cspDirective('connect-src')).not.toMatch(/<URL>|placeholder/i)
  })

  it('gera o bundle com a URL completa da API, incluindo o prefixo /api', () => {
    expect(vercelConfig().env.VITE_API_URL).toBe('https://api.pondero.com.br/api')
  })

  it('carrega o bootstrap de tema como script externo sem liberar scripts inline', () => {
    const indexHtml = readProjectFile('index.html')
    const inlineScripts = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi)]

    expect(cspDirective('script-src')).not.toContain("'unsafe-inline'")
    expect(inlineScripts).toHaveLength(0)
    expect(indexHtml).toContain('<script src="/theme-init.js"></script>')
    expect(existsSync(projectFile('public/theme-init.js'))).toBe(true)
  })
})
