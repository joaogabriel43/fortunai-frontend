import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'
import PlanoPage from '../PlanoPage'
import usePlano from '../../hooks/usePlano'

// Mock usePlano hook
vi.mock('../../hooks/usePlano', () => ({
  default: vi.fn(),
}))

// Modo padrão: backend sem pagamentos para o usuário (upgrade por e-mail).
// Os pagamentos liberados ficam em PlanoPagePagamentos.test.jsx.
vi.mock('../../hooks/usePagamentosHabilitados', () => ({ default: () => false }))

const mockFreeUser = () => usePlano.mockReturnValue({
  plano: 'FREE',
  isPremium: false,
  isLimitado: vi.fn(() => false),
  getUso: vi.fn(() => null),
  loading: false,
})

const mockPremiumUser = () => usePlano.mockReturnValue({
  plano: 'PREMIUM',
  isPremium: true,
  isLimitado: vi.fn(() => false),
  getUso: vi.fn(() => null),
  loading: false,
})

beforeEach(() => {
  mockFreeUser()
})

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/plano']}>
        <Routes>
          <Route path="/plano" element={<PlanoPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )

describe('PlanoPage', () => {
  it('renderiza título "Escolha seu plano"', () => {
    renderPage()
    expect(screen.getByText(/Escolha seu plano/i)).toBeInTheDocument()
  })

  it('mostra tabela Free vs Premium com dois cards', () => {
    renderPage()
    expect(screen.getByText(/Gratuito/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 19/i)).toBeInTheDocument()
  })

  it('usuário FREE vê botão "Começar Premium"', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Começar Premium/i })).toBeInTheDocument()
  })

  it('usuário PREMIUM vê badge "Plano ativo"', () => {
    mockPremiumUser()
    renderPage()
    const items = screen.getAllByText(/Plano ativo/i)
    expect(items.length).toBeGreaterThanOrEqual(1)
  })
})
