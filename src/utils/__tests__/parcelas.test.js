import { describe, it, expect } from 'vitest'
import { calcularParcelas, faturaDoLancamento, faturasDaCompra } from '../parcelas'

describe('calcularParcelas — espelho do HALF_UP com resíduo na última', () => {
  it('à vista devolve uma parcela igual ao total', () => {
    expect(calcularParcelas(89.9, 1)).toEqual({ n: 1, parcela: 89.9, ultima: 89.9, total: 89.9 })
  })

  it('1.200,05 em 12× → 11 × 100,00 + última 100,05', () => {
    expect(calcularParcelas(1200.05, 12)).toEqual({ n: 12, parcela: 100, ultima: 100.05, total: 1200.05 })
  })

  it('arredonda HALF_UP: 100 em 3× → 33,33 ×2 + 33,34', () => {
    expect(calcularParcelas(100, 3)).toEqual({ n: 3, parcela: 33.33, ultima: 33.34, total: 100 })
  })

  it('meio centavo sobe: 0,05 em 2× → 0,03 + 0,02', () => {
    expect(calcularParcelas(0.05, 2)).toEqual({ n: 2, parcela: 0.03, ultima: 0.02, total: 0.05 })
  })

  it('a soma das parcelas é exatamente o total para qualquer n de 1 a 48', () => {
    for (let n = 1; n <= 48; n++) {
      const r = calcularParcelas(1234.57, n)
      const somaCentavos = Math.round(r.parcela * 100) * (n - 1) + Math.round(r.ultima * 100)
      expect(somaCentavos).toBe(123457)
    }
  })

  it('não sofre com ponto flutuante (0,1 + 0,2)', () => {
    expect(calcularParcelas(0.1 + 0.2, 1).total).toBe(0.3)
  })

  it('entrada inválida devolve null', () => {
    expect(calcularParcelas(0, 3)).toBeNull()
    expect(calcularParcelas(-10, 3)).toBeNull()
    expect(calcularParcelas(100, 0)).toBeNull()
    expect(calcularParcelas(NaN, 2)).toBeNull()
  })
})

describe('faturaDoLancamento — ciclo pelo dia de fechamento', () => {
  it('compra até o dia do fechamento (inclusive) cai na fatura do mesmo mês', () => {
    expect(faturaDoLancamento('2026-09-05', 5, 15)).toEqual({
      mes: 9, ano: 2026, fechamento: '2026-09-05', vencimento: '2026-09-15',
    })
  })

  it('compra depois do fechamento cai na fatura do mês seguinte', () => {
    expect(faturaDoLancamento('2026-09-06', 5, 15)).toMatchObject({ mes: 10, ano: 2026, vencimento: '2026-10-15' })
  })

  it('vencimento antes do fechamento no calendário vence no mês seguinte ao fechamento', () => {
    expect(faturaDoLancamento('2026-09-10', 20, 3)).toEqual({
      mes: 9, ano: 2026, fechamento: '2026-09-20', vencimento: '2026-10-03',
    })
  })

  it('vira o ano em dezembro', () => {
    expect(faturaDoLancamento('2026-12-28', 25, 5)).toEqual({
      mes: 1, ano: 2027, fechamento: '2027-01-25', vencimento: '2027-02-05',
    })
  })
})

describe('faturasDaCompra — primeira e última parcela', () => {
  it('12× a partir de set/2026 termina na fatura de ago/2027', () => {
    const r = faturasDaCompra('2026-09-11', 12, 5, 15)
    expect(r.primeira).toMatchObject({ mes: 10, ano: 2026 })
    expect(r.ultima).toMatchObject({ mes: 9, ano: 2027 })
  })

  it('à vista: primeira e última são a mesma fatura', () => {
    const r = faturasDaCompra('2026-09-02', 1, 5, 15)
    expect(r.ultima).toEqual(r.primeira)
  })

  it('dia 31 + meses segue o plusMonths do Java (fim de fevereiro)', () => {
    // Parcela 2 datada em 2027-02-28 → fechamento dia 28 inclui a data.
    const r = faturasDaCompra('2027-01-31', 2, 28, 10)
    expect(r.primeira).toMatchObject({ mes: 2, ano: 2027 })
    expect(r.ultima).toMatchObject({ mes: 2, ano: 2027 })
  })
})
