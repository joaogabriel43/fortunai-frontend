import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, it, expect } from 'vitest'

const ler = (arquivo) => readFileSync(resolve(cwd(), arquivo), 'utf8')

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
