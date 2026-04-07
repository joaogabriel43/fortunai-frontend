import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AposentadoriaCalculadora from '../calculadoras/AposentadoriaCalculadora'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useAposentadoria', () => ({
  useAposentadoria: vi.fn(),
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

const mockResultado = {
  cenarios: [
    {
      perfil: 'Conservador',
      taxaRetornoAnual: 6.0,
      taxaRetornoReal: 1.14,
      patrimonioNecessario: 5000000,
      anosParaAposentadoria: 30,
      idadeNaAposentadoria: 60,
      patrimonioProjetado: 4800000,
      suficiente: false,
      projecaoAnual: [
        { ano: 1, idade: 31, patrimonio: 124000 },
        { ano: 30, idade: 60, patrimonio: 4800000 },
      ],
    },
    {
      perfil: 'Moderado',
      taxaRetornoAnual: 8.0,
      taxaRetornoReal: 3.05,
      patrimonioNecessario: 1968000,
      anosParaAposentadoria: 30,
      idadeNaAposentadoria: 60,
      patrimonioProjetado: 2500000,
      suficiente: true,
      projecaoAnual: [],
    },
    {
      perfil: 'Arrojado',
      taxaRetornoAnual: 12.0,
      taxaRetornoReal: 6.87,
      patrimonioNecessario: 872400,
      anosParaAposentadoria: 30,
      idadeNaAposentadoria: 60,
      patrimonioProjetado: 5200000,
      suficiente: true,
      projecaoAnual: [],
    },
  ],
  patrimonioAtual: 100000,
  despesaMediaMensal: 3000,
  ipca: 4.8,
}

describe('AposentadoriaCalculadora', () => {
  let useAuth
  let useAposentadoria

  beforeEach(async () => {
    vi.clearAllMocks()
    useAuth = (await import('../../contexts/AuthContext')).useAuth
    useAposentadoria = (await import('../../hooks/useAposentadoria')).useAposentadoria

    useAuth.mockReturnValue({ user: { id: 'abc-123', email: 'test@fortunai.com' } })
  })

  it('renderiza campos do formulário', () => {
    useAposentadoria.mockReturnValue({
      loading: false, error: null, resultado: null, calcular: vi.fn(),
    })

    render(<AposentadoriaCalculadora />)

    expect(screen.getByLabelText(/renda mensal desejada/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/aporte mensal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /calcular/i })).toBeInTheDocument()
  })

  it('exibe informação do IPCA de referência', () => {
    useAposentadoria.mockReturnValue({
      loading: false, error: null, resultado: null, calcular: vi.fn(),
    })

    render(<AposentadoriaCalculadora />)

    expect(screen.getByText(/ipca/i)).toBeInTheDocument()
  })

  it('chama calcular ao submeter o formulário', async () => {
    const mockCalcular = vi.fn()
    useAposentadoria.mockReturnValue({
      loading: false, error: null, resultado: null, calcular: mockCalcular,
    })

    render(<AposentadoriaCalculadora />)

    fireEvent.change(screen.getByLabelText(/renda mensal desejada/i), {
      target: { value: '5000' },
    })

    fireEvent.click(screen.getByRole('button', { name: /calcular/i }))

    await waitFor(() => {
      expect(mockCalcular).toHaveBeenCalledOnce()
    })
  })

  it('exibe 3 cards de cenários após calcular', () => {
    useAposentadoria.mockReturnValue({
      loading: false, error: null, resultado: mockResultado, calcular: vi.fn(),
    })

    render(<AposentadoriaCalculadora />)

    expect(screen.getByText(/conservador/i)).toBeInTheDocument()
    expect(screen.getByText(/moderado/i)).toBeInTheDocument()
    expect(screen.getByText(/arrojado/i)).toBeInTheDocument()
  })

  it('mostra IPCA real do resultado', () => {
    useAposentadoria.mockReturnValue({
      loading: false, error: null, resultado: mockResultado, calcular: vi.fn(),
    })

    render(<AposentadoriaCalculadora />)

    // múltiplos chips podem mostrar 4.8 (referência + usado); basta existir pelo menos um
    expect(screen.getAllByText(/4[,.]8/).length).toBeGreaterThan(0)
  })

  it('exibe mensagem de erro quando ocorre falha', () => {
    useAposentadoria.mockReturnValue({
      loading: false,
      error: 'Erro ao calcular aposentadoria.',
      resultado: null,
      calcular: vi.fn(),
    })

    render(<AposentadoriaCalculadora />)

    expect(screen.getByText(/erro ao calcular aposentadoria/i)).toBeInTheDocument()
  })
})
