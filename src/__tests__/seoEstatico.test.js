import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, it, expect } from 'vitest'

const ler = (arquivo) => readFileSync(resolve(cwd(), arquivo), 'utf8')

describe('index.html', () => {
  it('não declara canonical nem og:url (o <Seo> emite por rota; um "/" fixo contradiria)', () => {
    const html = ler('index.html')
    expect(html).not.toMatch(/rel="canonical"/)
    expect(html).not.toMatch(/property="og:url"/)
  })
})

describe('sitemap.xml', () => {
  const xml = ler('public/sitemap.xml')

  it('toda URL tem lastmod em formato ISO', () => {
    expect(xml.match(/<url>/g)).toHaveLength(5)
    expect(xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)).toHaveLength(5)
  })

  it('/status fica fora do sitemap e do llms.txt (página noindex)', () => {
    expect(xml).not.toContain('/status')
    expect(ler('public/llms.txt')).not.toContain('/status')
  })
})

describe('JSON-LD do index.html', () => {
  it('declara SoftwareApplication, Organization e WebSite do Pondero, sem FAQPage', () => {
    const m = ler('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    const grafo = JSON.parse(m[1])['@graph']
    expect(grafo.map((n) => n['@type']).sort()).toEqual(['Organization', 'SoftwareApplication', 'WebSite'])
    const site = grafo.find((n) => n['@type'] === 'WebSite')
    expect(site.name).toBe('Pondero')
    expect(site.url).toBe('https://www.pondero.com.br/')
    expect(grafo.find((n) => n['@type'] === 'Organization').name).toBe('Pondero')
  })

  it('Organization não declara logo enquanto não existir um logo oficial da marca Pondero', () => {
    const m = ler('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    const org = JSON.parse(m[1])['@graph'].find((n) => n['@type'] === 'Organization')
    expect(org).not.toHaveProperty('logo')
  })
})
