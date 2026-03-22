import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import DividendosCard from '../DividendosCard'

// --- MOCK: useDividendos hook ---
vi.mock('../../../hooks/useDividendos', () => ({
  useDividendos: vi.fn(),
}))

describe('DividendosCard', () => {
  let useDividendos

  beforeEach(async () => {
    vi.clearAllMocks()
    useDividendos = (await import('../../../hooks/useDividendos')).useDividendos
  })

  // --- Teste 1: estado de loading ---
  it('exibe spinner de carregamento enquanto loading=true', () => {
    useDividendos.mockReturnValue({
      loading: true,
      error: null,
      proventos: [],
      resumo: { totalPago: 0, totalProvisionado: 0 },
    })

    render(<DividendosCard />)

    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
    expect(screen.queryByText('Dividendos e Proventos')).not.toBeInTheDocument()
  })

  // --- Teste 2: estado de erro ---
  it('exibe mensagem de erro quando error está definido', () => {
    useDividendos.mockReturnValue({
      loading: false,
      error: 'Não foi possível carregar os proventos.',
      proventos: [],
      resumo: { totalPago: 0, totalProvisionado: 0 },
    })

    render(<DividendosCard />)

    expect(screen.getByText('Não foi possível carregar os proventos.')).toBeInTheDocument()
  })

  // --- Teste 3: estado vazio ---
  it('exibe empty state quando não há proventos', () => {
    useDividendos.mockReturnValue({
      loading: false,
      error: null,
      proventos: [],
      resumo: { totalPago: 0, totalProvisionado: 0 },
    })

    render(<DividendosCard />)

    expect(screen.getByText('Dividendos e Proventos')).toBeInTheDocument()
    expect(screen.getByText('Nenhum provento registrado ainda')).toBeInTheDocument()
    expect(screen.getByText('Registre dividendos e rendimentos via chat')).toBeInTheDocument()
  })

  // --- Teste 4: renderiza chips coloridos por tipo ---
  it('renderiza chips com labels corretos para cada tipo de provento', () => {
    // Data no mês atual para aparecer em "Recebidos este mês"
    const hoje = new Date()
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0')
    const anoAtual = hoje.getFullYear()
    const dataMesAtual = `${anoAtual}-${mesAtual}-15`

    useDividendos.mockReturnValue({
      loading: false,
      error: null,
      proventos: [
        {
          id: '1',
          ticker: 'ITSA4',
          tipo: 'DIVIDENDO',
          valorPorCota: 0.25,
          dataEx: dataMesAtual,
          dataPagamento: dataMesAtual,
          pago: true,
        },
        {
          id: '2',
          ticker: 'PETR4',
          tipo: 'JCP',
          valorPorCota: 0.10,
          dataEx: dataMesAtual,
          dataPagamento: dataMesAtual,
          pago: true,
        },
        {
          id: '3',
          ticker: 'HSML11',
          tipo: 'RENDIMENTO',
          valorPorCota: 0.80,
          dataEx: '2026-04-10',
          dataPagamento: '2026-04-20',
          pago: false,
        },
      ],
      resumo: { totalPago: 0.35, totalProvisionado: 0.80 },
    })

    render(<DividendosCard />)

    expect(screen.getByText('ITSA4')).toBeInTheDocument()
    expect(screen.getByText('PETR4')).toBeInTheDocument()
    expect(screen.getByText('HSML11')).toBeInTheDocument()

    expect(screen.getByText('Dividendo')).toBeInTheDocument()
    expect(screen.getByText('JCP')).toBeInTheDocument()
    expect(screen.getByText('Rendimento')).toBeInTheDocument()
  })

  // --- Teste 5: exibe seção de provisionados separada ---
  it('exibe seção "Provisionados" para proventos com pago=false', () => {
    useDividendos.mockReturnValue({
      loading: false,
      error: null,
      proventos: [
        {
          id: '3',
          ticker: 'HSML11',
          tipo: 'RENDIMENTO',
          valorPorCota: 0.80,
          dataEx: '2026-04-10',
          dataPagamento: '2026-04-20',
          pago: false,
        },
      ],
      resumo: { totalPago: 0, totalProvisionado: 0.80 },
    })

    render(<DividendosCard />)

    expect(screen.getByText(/Provisionados/i)).toBeInTheDocument()
    expect(screen.getByText('HSML11')).toBeInTheDocument()
  })

  // --- Teste 6: rodapé exibe totais gerais ---
  it('exibe total recebido e a receber no rodapé quando há proventos', () => {
    const hoje = new Date()
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0')
    const anoAtual = hoje.getFullYear()
    const dataMesAtual = `${anoAtual}-${mesAtual}-10`

    useDividendos.mockReturnValue({
      loading: false,
      error: null,
      proventos: [
        {
          id: '1',
          ticker: 'PETR4',
          tipo: 'DIVIDENDO',
          valorPorCota: 1.5,
          dataEx: dataMesAtual,
          dataPagamento: dataMesAtual,
          pago: true,
        },
      ],
      resumo: { totalPago: 1.5, totalProvisionado: 0 },
    })

    render(<DividendosCard />)

    expect(screen.getByText('Total recebido')).toBeInTheDocument()
    expect(screen.getByText('A receber')).toBeInTheDocument()
  })
})
