import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { vi, describe, it, expect } from 'vitest'
import theme from '../theme'
import LandingPage from '../pages/LandingPage'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

describe('regressão: landing sem restos do nome FortunAI', () => {
  it('nenhum link nem texto visível menciona "fortunai"', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </ThemeProvider>
    )
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
    expect(hrefs.filter((h) => /fortunai/i.test(h))).toEqual([])
    expect(container.textContent).not.toMatch(/fortunai/i)
    expect(container.querySelector('[aria-label="GitHub do Pondero"]')).toBeNull()
  })
})
