// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { navigateFallbackDenylist } from '../navigateFallbackDenylist.js'

// O Workbox testa cada regex contra `pathname + search` da navegação.
const negada = (caminho) => navigateFallbackDenylist.some((re) => re.test(caminho))

describe('navigateFallbackDenylist — recuperação de senha nunca vem do shell em cache', () => {
  it.each([
    '/esqueci-senha',
    '/esqueci-senha/',
    '/esqueci-senha?origem=login',
    '/redefinir-senha',
    '/redefinir-senha/',
    '/redefinir-senha?x=1',
  ])('%s → negada', (caminho) => {
    expect(negada(caminho)).toBe(true)
  })

  it.each(['/dashboard', '/login', '/', '/redefinir-senhas', '/esqueci-senha-x'])(
    '%s → atendida pelo fallback',
    (caminho) => {
      expect(negada(caminho)).toBe(false)
    },
  )

  it('mantém os arquivos estáticos de SEO negados', () => {
    expect(negada('/robots.txt')).toBe(true)
    expect(negada('/sitemap.xml')).toBe(true)
    expect(negada('/llms.txt')).toBe(true)
  })
})
