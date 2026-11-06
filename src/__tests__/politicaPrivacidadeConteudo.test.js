import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const politica = readFileSync(resolve(__dirname, '..', '..', 'public', 'politica-de-privacidade.md'), 'utf8')

describe('política de privacidade (rascunho): transparência sobre Gemini e IP', () => {
  it('continua marcada como rascunho para revisão jurídica', () => {
    expect(politica).toContain('RASCUNHO — pendente de revisão jurídica')
  })

  it('informa que mensagens do chat e imagens de comprovantes vão ao Google Gemini', () => {
    const secao4 = politica.slice(politica.indexOf('## 4. Compartilhamento'), politica.indexOf('## 5.'))
    expect(secao4).toMatch(/Google Gemini/)
    expect(secao4).toMatch(/mensagens que você envia ao chat/)
    expect(secao4).toMatch(/imagens de comprovantes/)
    // a ressalva antiga "sem dados sensíveis" não pode voltar: o conteúdo enviado é livre
    expect(politica).not.toMatch(/sem dados sensíveis/i)
  })

  it('informa que o IP é registrado para segurança e limite de uso', () => {
    const secao23 = politica.slice(politica.indexOf('### 2.3'), politica.indexOf('## 3.'))
    expect(secao23).toMatch(/Endereço IP/)
    expect(secao23).toMatch(/segurança/)
    expect(secao23).toMatch(/limite de uso/)
  })

  it('NÃO afirma criptografia em repouso (só "em trânsito" e hash de senha)', () => {
    expect(politica).not.toMatch(/em repouso/i)
    expect(politica).not.toMatch(/at rest/i)
    expect(politica).not.toMatch(/(dados|banco|armazenamento)[^.\n]{0,40}criptografad/i)
    // o que é verdadeiro e permanece: TLS e hash de senha
    expect(politica).toContain('Comunicação criptografada (HTTPS/TLS)')
    expect(politica).toContain('Senhas com hash bcrypt')
  })
})
