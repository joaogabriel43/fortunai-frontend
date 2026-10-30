import { describe, it, expect } from 'vitest'
import { formatCurrencyInText } from '../formatters'

// Incidente 2026-10-30: "Preço atual de PETR4: R$ 52,66" (já em pt-BR, vindo do backend)
// virava "R$ 52,00,66" — a regex capturava só o "52" e formatava de novo.
describe('formatCurrencyInText', () => {
  describe('não reformata valor já em pt-BR', () => {
    it.each([
      ['R$ 52,66'],
      ['R$ 52,00'],
      ['R$ 0,05'],
      ['R$ 1.234,50'],
      ['R$ 1.000.000,99'],
      ['R$ 1.000'],
      ['R$ 52,66'],
      ['R$ 1.234,50'],
    ])('%s permanece igual', (valor) => {
      const texto = `Preço atual de PETR4: ${valor}.`
      expect(formatCurrencyInText(texto)).toBe(texto)
    })

    it('resposta real do incidente permanece igual', () => {
      const texto = 'Preço atual de PETR4: R$ 52,66'
      expect(formatCurrencyInText(texto)).toBe(texto)
    })
  })

  describe('formata número cru (legado "R$ 800.0") com centavos variados', () => {
    it.each([
      ['R$ 800.0', 'R$ 800,00'],
      ['R$ 1500.0', 'R$ 1.500,00'],
      ['R$ 52.66', 'R$ 52,66'],
      ['R$ 52', 'R$ 52,00'],
      ['R$ 0.05', 'R$ 0,05'],
      ['R$ 1234.5', 'R$ 1.234,50'],
      ['R$ 1000000.99', 'R$ 1.000.000,99'],
      ['R$1500.0', 'R$ 1.500,00'],
    ])('%s → %s', (cru, esperado) => {
      expect(formatCurrencyInText(`Total: ${cru} hoje`)).toBe(`Total: ${esperado} hoje`)
    })

    it('formata várias ocorrências na mesma mensagem', () => {
      expect(formatCurrencyInText('Gastou R$ 800.0 de R$ 1500.0')).toBe(
        'Gastou R$ 800,00 de R$ 1.500,00'
      )
    })

    it('mistura: formata o cru e preserva o já formatado', () => {
      expect(formatCurrencyInText('Pagou R$ 52.66, saldo R$ 1.234,50')).toBe(
        'Pagou R$ 52,66, saldo R$ 1.234,50'
      )
    })
  })

  describe('entrada não textual', () => {
    it.each([[null], [undefined], [''], [42], [{}]])('%s é devolvido como está', (entrada) => {
      expect(formatCurrencyInText(entrada)).toBe(entrada)
    })
  })
})
