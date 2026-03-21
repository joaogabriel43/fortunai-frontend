import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

// --- MOCK: AuthContext ---
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-id', email: 'test@test.com' }, logout: vi.fn() }),
}))

// --- MOCK: Outlet (react-router-dom) ---
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">page content</div>,
  }
})

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>
  )
}

describe('Responsividade — Layout e Sidebar', () => {
  // --- Teste 1 --- Sidebar possui data-testid="sidebar"
  it('Sidebar possui data-testid="sidebar" renderizado no DOM', () => {
    renderLayout()
    const sidebars = screen.getAllByTestId('sidebar')
    expect(sidebars.length).toBeGreaterThanOrEqual(1)
  })

  // --- Teste 2 --- Botão hamburger está no DOM
  it('Layout possui botão data-testid="menu-toggle" para abrir sidebar', () => {
    renderLayout()
    expect(screen.getByTestId('menu-toggle')).toBeInTheDocument()
  })

  // --- Teste 3 --- Clicar no hamburger muda aria-expanded de false → true
  it('Clicar em menu-toggle altera aria-expanded de "false" para "true"', async () => {
    const user = userEvent.setup()
    renderLayout()
    const toggle = screen.getByTestId('menu-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  // --- Teste 4 --- AppBar com data-testid="app-bar" está no DOM
  it('Layout possui AppBar com data-testid="app-bar"', () => {
    renderLayout()
    expect(screen.getByTestId('app-bar')).toBeInTheDocument()
  })

  // --- Teste 5 --- Toggle funciona em ciclo completo (abrir e fechar)
  it('menu-toggle funciona como toggle: abrir e depois fechar (aria-expanded ciclo)', async () => {
    const user = userEvent.setup()
    renderLayout()
    const toggle = screen.getByTestId('menu-toggle')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
