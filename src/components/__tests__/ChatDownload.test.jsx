import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

Element.prototype.scrollIntoView = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'
import Chat from '../Chat'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { BACKEND_ORIGIN } from '../../config/apiUrl'

const PLACEHOLDER = 'Pergunte ou registre algo em português...'
const BLOB = new Blob(['csv'], { type: 'text/csv' })

// Envia uma mensagem e devolve o botão de download que o bot responde.
async function abrirBotaoDeDownload(url) {
  api.post.mockResolvedValue({
    data: {
      resposta: 'Aqui está seu extrato.',
      idSessao: 'sess-1',
      acao: { tipo: 'DOWNLOAD', url, label: 'Baixar extrato' },
    },
  })
  render(
    <ThemeProvider theme={theme}>
      <Chat />
    </ThemeProvider>
  )
  const input = screen.getByPlaceholderText(PLACEHOLDER)
  fireEvent.change(input, { target: { value: 'me manda o extrato' } })
  fireEvent.submit(input.closest('form'))
  return screen.findByRole('button', { name: /Baixar extrato/ })
}

describe('Chat — download autenticado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: 'u-1', email: 'a@b.c' }, loading: false })
    localStorage.clear()
    api.get.mockResolvedValue({ data: [] })
    globalThis.fetch = vi.fn()
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/x')
    globalThis.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  describe('regressão: download do chat fora do interceptor de sessão não renova token expirado', () => {
    it('baixa pelo cliente central com responseType blob, sem fetch cru', async () => {
      const botao = await abrirBotaoDeDownload('/api/exportacao/extrato?mes=3&ano=2026')
      api.get.mockClear()
      api.get.mockResolvedValueOnce({ data: BLOB, status: 200 })

      fireEvent.click(botao)

      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1))
      expect(api.get).toHaveBeenCalledWith(
        `${BACKEND_ORIGIN}/api/exportacao/extrato?mes=3&ano=2026`,
        { responseType: 'blob' }
      )
      expect(globalThis.fetch).not.toHaveBeenCalled()
      await waitFor(() => expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(BLOB))
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('mantém o bloqueio same-origin: URL de domínio externo não dispara requisição', async () => {
      const botao = await abrirBotaoDeDownload('https://evil.example.com/api/exportacao/x')
      api.get.mockClear()

      fireEvent.click(botao)

      await new Promise((r) => setTimeout(r, 20))
      expect(api.get).not.toHaveBeenCalled()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })
  })
})
