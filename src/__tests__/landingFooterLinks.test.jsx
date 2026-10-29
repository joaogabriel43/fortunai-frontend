import React from 'react'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { vi, describe, it, expect } from 'vitest'
import theme from '../theme'
import LandingPage from '../pages/LandingPage'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const renderLanding = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </ThemeProvider>
  )

describe('regressão: links do rodapé da landing são âncoras reais', () => {
  const DESTINOS = [
    ['Recursos', '#recursos'],
    ['Como funciona', '#como-funciona'],
    ['Segurança', '#seguranca'],
    ['Perguntas frequentes', '#faq'],
  ]

  it.each(DESTINOS)('"%s" é <a href="%s">, não botão', (nome, href) => {
    renderLanding()
    const rodape = within(screen.getByTestId('landing-footer'))
    const link = rodape.getByRole('link', { name: nome })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe(href)
    expect(rodape.queryByRole('button', { name: nome })).toBeNull()
  })

  it('clicar rola até a seção sem navegar (preventDefault)', () => {
    renderLanding()
    const alvo = document.getElementById('faq')
    alvo.scrollIntoView = vi.fn()
    const link = within(screen.getByTestId('landing-footer')).getByRole('link', { name: 'Perguntas frequentes' })
    const naoCancelado = fireEvent.click(link)
    expect(naoCancelado).toBe(false)
    expect(alvo.scrollIntoView).toHaveBeenCalledTimes(1)
  })
})
