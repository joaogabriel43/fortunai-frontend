import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render as renderRTL, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}))

const mockApiPut = vi.fn()
vi.mock('../../../services/api', () => ({
  default: { put: (...args) => mockApiPut(...args) },
}))

// react-modal exige um elemento raiz; em jsdom basta renderizar os filhos.
vi.mock('react-modal', () => {
  const MockModal = ({ isOpen, children }) => (isOpen ? <div data-testid="modal">{children}</div> : null)
  MockModal.setAppElement = () => {}
  return { default: MockModal }
})

import EditarTransacaoModal from '../EditarTransacaoModal'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'

// Tokens customizados do tema exigem o ThemeProvider.
const render = (ui) => renderRTL(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

const transacao = { id: 'txn-1', descricao: 'Almoço', categoria: 'alimentacao', valor: { quantia: 50 }, tipo: 'DEBIT', data: '2026-05-01' }

describe('EditarTransacaoModal — erros ao salvar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  const salvar = () => {
    render(<EditarTransacaoModal isOpen onRequestClose={vi.fn()} transacao={transacao} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
  }

  it('409 de conflito de saldo: pede para recarregar e tentar de novo', async () => {
    mockApiPut.mockRejectedValueOnce(Object.assign(new Error('409'), { response: { status: 409, data: { status: 409, erro: 'Conflito', mensagem: 'A conta foi atualizada por outra operação. Recarregue e tente novamente.' } } }))
    salvar()

    await waitFor(() => expect(window.alert).toHaveBeenCalled())
    expect(window.alert.mock.calls[0][0]).toMatch(/saldo.*recarregue.*tente novamente/i)
  })

  it('outros erros mantêm a mensagem genérica', async () => {
    mockApiPut.mockRejectedValueOnce(new Error('fail'))
    salvar()

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Falha ao editar a transação.'))
  })
})
