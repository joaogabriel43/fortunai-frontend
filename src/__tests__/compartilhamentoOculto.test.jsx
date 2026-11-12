import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import llms from '../../public/llms.txt?raw'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

// A landing monta FEATURES na carga do módulo, então cada cenário reimporta com a flag desejada.
async function renderLandingComFlag(habilitado) {
  vi.resetModules()
  vi.doMock('../config/features', () => ({ COMPARTILHAMENTO_HABILITADO: habilitado }))
  const { default: LandingPage } = await import('../pages/LandingPage')
  const { default: temaAtual } = await import('../theme')
  return render(
    <ThemeProvider theme={temaAtual}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('Compartilhamento ("Orçamento a dois") escondido até o convite funcionar', () => {
  beforeEach(() => vi.doUnmock('../config/features'))

  it('a flag real está desligada', async () => {
    vi.resetModules()
    const { COMPARTILHAMENTO_HABILITADO } = await import('../config/features')
    expect(COMPARTILHAMENTO_HABILITADO).toBe(false)
  })

  it('com a flag desligada, a landing não mostra o card nem o texto', async () => {
    await renderLandingComFlag(false)
    expect(screen.queryByText('Orçamento a dois')).toBeNull()
    expect(screen.queryByText(/Compartilhe as finanças/)).toBeNull()
  })

  it('reversível: com a flag ligada, o card volta', async () => {
    await renderLandingComFlag(true)
    expect(screen.getByText('Orçamento a dois')).toBeTruthy()
  })

  it('llms.txt não anuncia a funcionalidade', () => {
    expect(llms).not.toMatch(/Orçamento a dois/)
    expect(llms).not.toMatch(/compartilhamento das finanças/i)
  })
})
