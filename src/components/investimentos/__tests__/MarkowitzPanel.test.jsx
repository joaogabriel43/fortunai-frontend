import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MarkowitzPanel from '../MarkowitzPanel'

// --- MOCK: useMarkowitz hook ---
vi.mock('../../../hooks/useMarkowitz', () => ({
  useMarkowitz: vi.fn(),
}))

// --- MOCK: recharts (ResponsiveContainer needs real dimensions in jsdom) ---
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  }
})

describe('MarkowitzPanel', () => {
  let useMarkowitz

  beforeEach(async () => {
    vi.clearAllMocks()
    useMarkowitz = (await import('../../../hooks/useMarkowitz')).useMarkowitz
  })

  it('renderiza estado inicial com botão e mensagem placeholder', () => {
    useMarkowitz.mockReturnValue({ loading: false, error: null, resultado: null, otimizar: vi.fn() })

    render(<MarkowitzPanel />)

    expect(screen.getByText('Otimizador Markowitz')).toBeInTheDocument()
    expect(screen.getByText('Otimizar Portfólio')).toBeInTheDocument()
    expect(screen.getByText(/Clique em "Otimizar Portfólio"/)).toBeInTheDocument()
  })

  it('exibe loading state quando otimizando', () => {
    useMarkowitz.mockReturnValue({ loading: true, error: null, resultado: null, otimizar: vi.fn() })

    render(<MarkowitzPanel />)

    expect(screen.getByText('Otimizando...')).toBeInTheDocument()
  })

  it('exibe alert de erro de rate limit e NÃO renderiza gráfico', () => {
    useMarkowitz.mockReturnValue({
      loading: false,
      error: 'Limite de consultas atingido. O serviço de cotações está temporariamente indisponível. Tente novamente amanhã.',
      resultado: null,
      otimizar: vi.fn(),
    })

    render(<MarkowitzPanel />)

    // Alert de erro deve estar visível
    expect(screen.getByText(/Limite de consultas atingido/)).toBeInTheDocument()
    // Gráfico NÃO deve estar renderizado (sem barras de alocação)
    expect(screen.queryByText('Alocação Atual')).not.toBeInTheDocument()
    expect(screen.queryByText('Alocação Ótima')).not.toBeInTheDocument()
  })

  it('exibe alert de erro genérico e NÃO renderiza gráfico', () => {
    useMarkowitz.mockReturnValue({
      loading: false,
      error: 'Erro ao otimizar portfólio.',
      resultado: null,
      otimizar: vi.fn(),
    })

    render(<MarkowitzPanel />)

    expect(screen.getByText('Erro ao otimizar portfólio.')).toBeInTheDocument()
    expect(screen.queryByText('Alocação Atual')).not.toBeInTheDocument()
  })

  it('NÃO renderiza gráfico com pesos zerados (resultado inválido)', () => {
    useMarkowitz.mockReturnValue({
      loading: false,
      error: null,
      resultado: {
        alocacaoAtual: { PETR4: 0.6, ITSA4: 0.4 },
        alocacaoOtima: { PETR4: 0.0, ITSA4: 0.0 },
        taxaLivreDeRisco: 0.1175,
      },
      otimizar: vi.fn(),
    })

    render(<MarkowitzPanel />)

    // Quando todos os pesos ótimos são 0, não deve renderizar como se fosse válido
    // O placeholder deve aparecer em vez do gráfico
    expect(screen.getByText(/Clique em "Otimizar Portfólio"/)).toBeInTheDocument()
  })

  it('renderiza gráfico com resultado válido', () => {
    useMarkowitz.mockReturnValue({
      loading: false,
      error: null,
      resultado: {
        alocacaoAtual: { PETR4: 0.6, ITSA4: 0.4 },
        alocacaoOtima: { PETR4: 0.45, ITSA4: 0.55 },
        taxaLivreDeRisco: 0.1175,
      },
      otimizar: vi.fn(),
    })

    render(<MarkowitzPanel />)

    // Gráfico deve estar renderizado com dados
    expect(screen.queryByText(/Clique em "Otimizar Portfólio"/)).not.toBeInTheDocument()
    // Taxa de risco exibida
    expect(screen.getByText(/Selic/)).toBeInTheDocument()
  })
})
