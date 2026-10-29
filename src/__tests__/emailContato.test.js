import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, it, expect } from 'vitest'

describe('regressão: e-mail de contato da marca antiga', () => {
  const fonte = readFileSync(resolve(cwd(), 'src/pages/PlanoPage.jsx'), 'utf8')

  it('PlanoPage usa contato@pondero.com.br (texto e mailto)', () => {
    expect(fonte).not.toContain('fortunai.app')
    expect(fonte.match(/contato@pondero\.com\.br/g)).toHaveLength(2)
  })
})
