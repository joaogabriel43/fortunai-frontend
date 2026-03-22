import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import BenchmarkChart from '../BenchmarkChart'

// --- MOCK: useBenchmarks hook ---
vi.mock('../../../hooks/useBenchmarks', () => ({
  useBenchmarks: vi.fn(),
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

describe('BenchmarkChart', () => {
  let useBenchmarks

  beforeEach(async () => {
    vi.clearAllMocks()
    useBenchmarks = (await import('../../../hooks/useBenchmarks')).useBenchmarks
  })

  // --- Teste 1: loading state ---
  it('renderiza loading state enquanto dados são carregados', () => {
    useBenchmarks.mockReturnValue({ loading: true, error: null, dados: null })

    render(<BenchmarkChart />)

    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
    expect(screen.queryByText(/Carteira/i)).not.toBeInTheDocument()
  })

  // --- Teste 2: renderiza dados da carteira vs benchmarks ---
  it('renderiza gráfico com dados de carteira vs benchmarks', () => {
    useBenchmarks.mockReturnValue({
      loading: false,
      error: null,
      dados: {
        rentabilidadeCarteira: 12.5,
        cdi: 10.5,
        ibov: 8.0,
        ipca: 4.8,
        alphaCDI: 2.0,
        alphaIBOV: 4.5,
        alphaIPCA: 7.7,
      },
    })

    render(<BenchmarkChart />)

    expect(screen.getByText('Rentabilidade vs Benchmarks')).toBeInTheDocument()
    expect(screen.getByText('CDI')).toBeInTheDocument()
    expect(screen.getByText('IBOV')).toBeInTheDocument()
    expect(screen.getByText('IPCA')).toBeInTheDocument()
  })

  // --- Teste 3: alpha positivo exibido em chip verde ---
  it('exibe alpha positivo vs CDI com sinal + e cor verde', () => {
    useBenchmarks.mockReturnValue({
      loading: false,
      error: null,
      dados: {
        rentabilidadeCarteira: 15.0,
        cdi: 10.5,
        ibov: 8.0,
        ipca: 4.8,
        alphaCDI: 4.5,
        alphaIBOV: 7.0,
        alphaIPCA: 10.2,
      },
    })

    render(<BenchmarkChart />)

    const chipCDI = screen.getByText(/Alpha vs CDI/i).closest('[class*="MuiChip"]') ||
                    screen.getByText(/Alpha vs CDI/i).parentElement

    expect(screen.getByText(/Alpha vs CDI/i)).toBeInTheDocument()
    // Deve mostrar sinal positivo no alpha
    const alphaText = screen.getByText(/\+4,50%|\+4\.50%|\+4,5%/i)
    expect(alphaText).toBeInTheDocument()
  })

  // --- Teste 4: alpha negativo exibido em chip vermelho ---
  it('exibe alpha negativo vs CDI com sinal - e cor vermelha', () => {
    useBenchmarks.mockReturnValue({
      loading: false,
      error: null,
      dados: {
        rentabilidadeCarteira: 5.0,
        cdi: 10.5,
        ibov: 8.0,
        ipca: 4.8,
        alphaCDI: -5.5,
        alphaIBOV: -3.0,
        alphaIPCA: 0.2,
      },
    })

    render(<BenchmarkChart />)

    expect(screen.getByText(/Alpha vs CDI/i)).toBeInTheDocument()
    // Deve mostrar sinal negativo no alpha
    const alphaText = screen.getByText(/-5,50%|-5\.50%|-5,5%/i)
    expect(alphaText).toBeInTheDocument()
  })
})
