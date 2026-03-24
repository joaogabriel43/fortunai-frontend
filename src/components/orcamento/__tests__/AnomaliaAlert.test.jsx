import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AnomaliaAlert from '../AnomaliaAlert'

vi.mock('../../../hooks/useAnomalias', () => ({
  useAnomalias: vi.fn(),
}))

import { useAnomalias } from '../../../hooks/useAnomalias'

const mockAnomalias = [
  {
    categoria: 'Alimentacao',
    valorAtual: 1500.0,
    media3Meses: 1000.0,
    percentualDesvio: 50.0,
    explicacaoGemini: 'Possivel aumento sazonal nos precos',
  },
]

describe('AnomaliaAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar alerta quando ha anomalias', () => {
    useAnomalias.mockReturnValue({ anomalias: mockAnomalias, loading: false, error: null })
    render(<AnomaliaAlert />)

    expect(screen.getByTestId('anomalia-alert')).toBeInTheDocument()
    expect(screen.getByText(/Alimentacao/)).toBeInTheDocument()
    expect(screen.getByText('+50%')).toBeInTheDocument()
  })

  it('deve exibir explicacao do Gemini', () => {
    useAnomalias.mockReturnValue({ anomalias: mockAnomalias, loading: false, error: null })
    render(<AnomaliaAlert />)

    expect(screen.getByText('Possivel aumento sazonal nos precos')).toBeInTheDocument()
  })

  it('deve exibir valores monetarios', () => {
    useAnomalias.mockReturnValue({ anomalias: mockAnomalias, loading: false, error: null })
    render(<AnomaliaAlert />)

    expect(screen.getByText(/1500\.00/)).toBeInTheDocument()
    expect(screen.getByText(/1000\.00/)).toBeInTheDocument()
  })

  it('nao deve renderizar quando nao ha anomalias', () => {
    useAnomalias.mockReturnValue({ anomalias: [], loading: false, error: null })
    const { container } = render(<AnomaliaAlert />)

    expect(container.innerHTML).toBe('')
  })
})
