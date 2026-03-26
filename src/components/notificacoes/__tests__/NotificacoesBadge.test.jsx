import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useNotificacoes hook
vi.mock('../../../hooks/useNotificacoes', () => ({
  useNotificacoes: vi.fn(),
}))

import NotificacoesBadge from '../NotificacoesBadge'
import { useNotificacoes } from '../../../hooks/useNotificacoes'

describe('NotificacoesBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe número correto de não lidas no badge', () => {
    useNotificacoes.mockReturnValue({
      naoLidas: 5,
      notificacoes: [],
      marcarComoLida: vi.fn(),
    })

    render(<NotificacoesBadge />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('não exibe badge vermelho quando há 0 não lidas', () => {
    useNotificacoes.mockReturnValue({
      naoLidas: 0,
      notificacoes: [],
      marcarComoLida: vi.fn(),
    })

    render(<NotificacoesBadge />)

    // Badge com 0 não deve renderizar texto "0"
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
