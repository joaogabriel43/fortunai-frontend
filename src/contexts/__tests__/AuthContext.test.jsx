import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}))

vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getToken: () => localStorage.getItem('authToken'),
}))

import api from '../../services/api'
import { AuthProvider, useAuth } from '../AuthContext'

/**
 * L-5 (auditoria 2026-09-12): `isAuthenticated` era `!!token` — bastava existir QUALQUER string em
 * `localStorage.authToken` (inclusive um JWT vencido há dias, sem refresh token para renová-lo)
 * para as rotas protegidas renderizarem como sessão ativa.
 */
const base64Url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

const jwtComExp = (expSegundos) =>
  `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ sub: 'l5@test.com', exp: expSegundos })}.assinatura`

const agoraSegundos = () => Math.floor(Date.now() / 1000)

const Consumidor = () => {
  const { isAuthenticated, loading } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="autenticado">{String(isAuthenticated)}</span>
    </div>
  )
}

const renderizar = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Consumidor />
      </AuthProvider>
    </MemoryRouter>,
  )

const aguardarCarregamento = () =>
  waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

describe('AuthContext — isAuthenticated considera a expiração do JWT (L-5)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { email: 'l5@test.com', questionarioRespondido: true } })
  })

  it('L-5 (RED): token expirado SEM refresh token → não autenticado, token removido e /auth/me não é chamado', async () => {
    localStorage.setItem('authToken', jwtComExp(agoraSegundos() - 3600))

    renderizar()
    await aguardarCarregamento()

    expect(screen.getByTestId('autenticado').textContent).toBe('false')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('L-5 (RED): token malformado (payload não decodificável) SEM refresh token → não autenticado', async () => {
    localStorage.setItem('authToken', 'nao-e-um-jwt')

    renderizar()
    await aguardarCarregamento()

    expect(screen.getByTestId('autenticado').textContent).toBe('false')
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('regressão: token expirado COM refresh token → continua autenticado (o interceptor do api.js renova no 401)', async () => {
    localStorage.setItem('authToken', jwtComExp(agoraSegundos() - 3600))
    localStorage.setItem('refreshToken', 'refresh-valido')

    renderizar()
    await aguardarCarregamento()

    expect(screen.getByTestId('autenticado').textContent).toBe('true')
    expect(api.get).toHaveBeenCalledWith('/auth/me')
  })

  it('regressão: token dentro da validade → autenticado', async () => {
    localStorage.setItem('authToken', jwtComExp(agoraSegundos() + 1800))

    renderizar()
    await aguardarCarregamento()

    expect(screen.getByTestId('autenticado').textContent).toBe('true')
    expect(api.get).toHaveBeenCalledWith('/auth/me')
  })

  it('regressão: sem token → não autenticado, sem chamada ao backend', async () => {
    renderizar()
    await aguardarCarregamento()

    expect(screen.getByTestId('autenticado').textContent).toBe('false')
    expect(api.get).not.toHaveBeenCalled()
  })
})
