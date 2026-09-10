import { describe, expect, it } from 'vitest'
import { normalizarApiUrl } from '../apiUrl'

describe('normalizarApiUrl', () => {
  it('adiciona /api quando a variável contém apenas o origin', () => {
    expect(normalizarApiUrl('https://api.pondero.com.br'))
      .toBe('https://api.pondero.com.br/api')
  })

  it('não duplica /api quando o prefixo já existe', () => {
    expect(normalizarApiUrl('https://api.pondero.com.br/api'))
      .toBe('https://api.pondero.com.br/api')
  })

  it('remove barras finais antes de normalizar', () => {
    expect(normalizarApiUrl('https://api.pondero.com.br/api///'))
      .toBe('https://api.pondero.com.br/api')
  })
})
