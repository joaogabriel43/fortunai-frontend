import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VERSAO_TERMOS, VERSAO_PRIVACIDADE } from '../config/documentosLegais'

const termos = readFileSync(resolve(__dirname, '..', '..', 'public', 'termos-de-uso.md'), 'utf8')

const secao = (inicio, fim) => termos.slice(termos.indexOf(inicio), termos.indexOf(fim))

describe('termos de uso v2.0: plano pago (ADR-073)', () => {
  it('continua rascunho, na versão 2.0, com data de vigência a preencher', () => {
    expect(termos).toContain('RASCUNHO — pendente de revisão jurídica')
    expect(termos).toContain('**Versão 2.0 — vigente a partir de [DATA DE VIGÊNCIA]**')
  })

  it('a versão do documento é a que o consentimento envia', () => {
    expect(VERSAO_TERMOS).toBe('2.0')
    expect(VERSAO_PRIVACIDADE).toBe('2.0')
  })

  it('identifica o fornecedor só com placeholders (Decreto 7.962/2013)', () => {
    const s2 = secao('## 2. Quem fornece', '## 3.')
    expect(s2).toContain('Decreto 7.962/2013')
    for (const p of ['[NOME COMPLETO]', '[CPF]', '[ENDEREÇO]', '[E-MAIL DE CONTATO]']) {
      expect(s2).toContain(p)
    }
  })

  it('traz os dois planos com preço, meio de pagamento e renovação', () => {
    const s6 = secao('## 6. Planos', '## 7.')
    expect(s6).toMatch(/Premium mensal: R\$ 19,90 por mês, pago no cartão de crédito, com renovação automática/)
    expect(s6).toMatch(/Premium anual: R\$ 199,00, pagamento único por Pix ou cartão/)
    expect(s6).toMatch(/não se renova sozinho/)
    expect(s6).toMatch(/\*\*Mercado Pago\*\*/)
  })

  it('cancelamento pelo Pondero mantém o acesso até o fim do período pago', () => {
    const s8 = secao('## 8. Como cancelar', '## 9.')
    expect(s8).toMatch(/pelo próprio Pondero, a qualquer momento/)
    expect(s8).toMatch(/continua até o fim do período que você já pagou/)
  })

  it('arrependimento: 7 dias, reembolso integral, CDC art. 49', () => {
    const s9 = secao('## 9. Direito de arrependimento', '## 10.')
    expect(s9).toMatch(/\*\*7 dias\*\*/)
    expect(s9).toMatch(/\*\*reembolso integral\*\*/)
    expect(s9).toMatch(/art\. 49 do Código de Defesa do Consumidor/)
  })

  it('inadimplência: carência de 10 dias e volta ao Gratuito', () => {
    const s10 = secao('## 10. Falta de pagamento', '## 11.')
    expect(s10).toMatch(/\*\*carência de 10 dias\*\*/)
    expect(s10).toMatch(/volta para o plano Gratuito/)
  })

  it('mudança de preço com aviso prévio, prazo a definir', () => {
    expect(secao('## 11. Mudanças de preço', '## 12.')).toMatch(/pelo menos \[PRAZO\] dias de antecedência/)
  })

  describe('regressão: o Premium não promete recurso que é FREE ou que não existe', () => {
    const s7 = secao('## 7. O que o Premium inclui', '## 8.')

    it('lista os limites da matriz FREE x PREMIUM do backend', () => {
      expect(s7).toMatch(/Conversas com o assistente: 50 mensagens por dia \(no Gratuito, 10\)/)
      expect(s7).toMatch(/Otimização de carteira \(Markowitz\): 100 por mês \(no Gratuito, 2\)/)
      expect(s7).toMatch(/Apuração de Imposto de Renda: sem limite de quantidade \(não incluída no Gratuito\)/)
      expect(s7.match(/^- /gm)).toHaveLength(12)
    })

    it('não cita recursos que são iguais no Gratuito', () => {
      expect(s7).not.toMatch(/fronteira eficiente|valuation|Bazin|Graham|aporte inteligente/i)
    })

    it('não promete teste grátis', () => {
      expect(termos).toMatch(/Não há período de teste grátis/)
      expect(termos).not.toMatch(/\d+ dias grátis/i)
    })
  })
})
