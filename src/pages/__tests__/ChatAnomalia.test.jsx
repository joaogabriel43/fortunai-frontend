import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

import ChatPage from '../Chat'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const mockUser = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  email: 'test@fortunai.com',
}

describe('Chat — integração anomalias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: mockUser, loading: false })
    localStorage.clear()
  })

  it('exibe mensagem formatada com anomalias quando backend retorna dados', async () => {
    api.post.mockResolvedValue({
      data: {
        resposta: 'Seus gastos com Alimentacao subiram 50% — R$ 1.500,00 contra a media de R$ 1.000,00.',
        idSessao: 'sess-1',
      },
    })

    render(<ChatPage />)

    const input = screen.getByPlaceholderText('Digite sua mensagem...')
    fireEvent.change(input, { target: { value: 'como estão meus gastos' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/chat/enviar', expect.objectContaining({
        mensagem: 'como estão meus gastos',
      }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Alimentacao/)).toBeInTheDocument()
    })
  })

  it('exibe resposta normal quando sem anomalias', async () => {
    api.post.mockResolvedValue({
      data: {
        resposta: 'Seus gastos estao dentro do padrao historico este mes!',
        idSessao: 'sess-1',
      },
    })

    render(<ChatPage />)

    const input = screen.getByPlaceholderText('Digite sua mensagem...')
    fireEvent.change(input, { target: { value: 'gastos do mês' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/dentro do padr/)).toBeInTheDocument()
    })
  })
})
