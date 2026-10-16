import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { hojeLocal, mesCorrente, prefixoMesCorrente, mesAnterior } from '../dateUtils'

// Rodar com TZ=UTC e TZ=America/Sao_Paulo: o resultado precisa ser idêntico.
describe('regressão: mês/ano de hoje independe da TZ do navegador', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('28/02 23:30 BRT (já é março em UTC) continua sendo fevereiro', () => {
    vi.setSystemTime(new Date('2026-03-01T02:30:00Z'))
    expect(hojeLocal()).toBe('2026-02-28')
    expect(mesCorrente()).toEqual({ ano: 2026, mes: 2 })
    expect(prefixoMesCorrente()).toBe('2026-02')
  })

  it('31/12 22:00 BRT (já é janeiro em UTC) continua sendo dezembro do ano anterior', () => {
    vi.setSystemTime(new Date('2026-01-01T01:00:00Z'))
    expect(mesCorrente()).toEqual({ ano: 2025, mes: 12 })
    expect(prefixoMesCorrente()).toBe('2025-12')
  })

  it('01/03 00:30 BRT já é março', () => {
    vi.setSystemTime(new Date('2026-03-01T03:30:00Z'))
    expect(mesCorrente()).toEqual({ ano: 2026, mes: 3 })
    expect(prefixoMesCorrente()).toBe('2026-03')
  })

  it('mesAnterior vira o ano em janeiro e recua um mês nos demais', () => {
    expect(mesAnterior({ ano: 2026, mes: 1 })).toEqual({ ano: 2025, mes: 12 })
    expect(mesAnterior({ ano: 2026, mes: 3 })).toEqual({ ano: 2026, mes: 2 })
  })
})
