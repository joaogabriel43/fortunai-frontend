import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import JurosCompostosCalculadora from '../calculadoras/JurosCompostosCalculadora'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useJurosCompostos', () => ({
  useJurosCompostos: vi.fn(),
}))

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  }
})

describe('JurosCompostosCalculadora', () => {
  let useAuth
  let useJurosCompostos

  beforeEach(async () => {
    vi.clearAllMocks()
    useAuth = (await import('../../contexts/AuthContext')).useAuth
    useJurosCompostos = (await import('../../hooks/useJurosCompostos')).useJurosCompostos

    useAuth.mockReturnValue({ user: { id: 'abc-123', email: 'test@fortunai.com' } })
  })

  it('renderiza campos do formulário', () => {
    useJurosCompostos.mockReturnValue({
      loading: false, error: null, resultado: null, calcular: vi.fn(),
    })

    render(<JurosCompostosCalculadora />)

    expect(screen.getByLabelText(/patrimônio inicial/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/aporte mensal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /calcular/i })).toBeInTheDocument()
  })

  it('chama calcular ao submeter o formulário', async () => {
    const mockCalcular = vi.fn()
    useJurosCompostos.mockReturnValue({
      loading: false, error: null, resultado: null, calcular: mockCalcular,
    })

    render(<JurosCompostosCalculadora />)

    fireEvent.change(screen.getByLabelText(/aporte mensal/i), {
      target: { value: '1000' },
    })

    fireEvent.click(screen.getByRole('button', { name: /calcular/i }))

    await waitFor(() => {
      expect(mockCalcular).toHaveBeenCalledOnce()
    })
  })

  it('exibe 3 cards de cenários após calcular', () => {
    useJurosCompostos.mockReturnValue({
      loading: false,
      error: null,
      resultado: {
        cenarios: [
          {
            perfil: 'Conservador',
            taxaAnual: 6.0,
            montanteFinal: 12682.50,
            rendimentoTotal: 682.50,
            projecaoMensal: [],
          },
          {
            perfil: 'Moderado',
            taxaAnual: 8.0,
            montanteFinal: 12938.0,
            rendimentoTotal: 938.0,
            projecaoMensal: [],
          },
          {
            perfil: 'Arrojado',
            taxaAnual: 12.0,
            montanteFinal: 13468.0,
            rendimentoTotal: 1468.0,
            projecaoMensal: [],
          },
        ],
        totalInvestido: 12000,
        dadosReaisUsados: false,
        receitaMediaMensal: 0,
        despesaMediaMensal: 0,
      },
      calcular: vi.fn(),
    })

    render(<JurosCompostosCalculadora />)

    expect(screen.getByText(/conservador/i)).toBeInTheDocument()
    expect(screen.getByText(/moderado/i)).toBeInTheDocument()
    expect(screen.getByText(/arrojado/i)).toBeInTheDocument()
  })

  it('exibe toggle "usar dados reais"', () => {
    useJurosCompostos.mockReturnValue({
      loading: false, error: null, resultado: null, calcular: vi.fn(),
    })

    render(<JurosCompostosCalculadora />)

    expect(screen.getByText(/usar dados reais/i)).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando ocorre falha', () => {
    useJurosCompostos.mockReturnValue({
      loading: false,
      error: 'Erro ao calcular juros compostos.',
      resultado: null,
      calcular: vi.fn(),
    })

    render(<JurosCompostosCalculadora />)

    expect(screen.getByText(/erro ao calcular juros compostos/i)).toBeInTheDocument()
  })
})
