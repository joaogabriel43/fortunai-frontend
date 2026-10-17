import React from 'react'
import { render as renderRTL, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AdicionarTransacaoForm from '../AdicionarTransacaoForm'
import { MesOrcamentoProvider } from '../../../contexts/MesOrcamentoContext'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}))

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('react-select/creatable', () => ({
  default: ({ onChange, placeholder }) => (
    <input
      data-testid="categoria-select"
      placeholder={placeholder}
      onChange={(e) => onChange({ value: e.target.value, label: e.target.value })}
    />
  ),
}))

import api from '../../../services/api'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Mesma fonte do componente: o helper duplicado aqui repetia o bug de UTC
// e por isso nunca poderia flagrar a data errada no formulario.
import { hojeLocal } from '../../../utils/dateUtils'
const hoje = hojeLocal

const renderForm = (props) =>
  render(
    <MesOrcamentoProvider>
      <AdicionarTransacaoForm {...props} />
    </MesOrcamentoProvider>
  )

// Preenche os campos obrigatórios que JÁ existem no formulário.
const preencherCamposBase = async () => {
  fireEvent.change(screen.getByLabelText(/Valor/i), { target: { value: '100' } })
  fireEvent.change(screen.getByTestId('categoria-select'), {
    target: { value: 'alimentacao' },
  })
  fireEvent.change(screen.getByLabelText(/Descrição/i), {
    target: { value: 'almoço' },
  })
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // api.get para categorias — retorna lista vazia por padrão
  api.get.mockResolvedValue({ data: [] })
  // api.post para transação — simula sucesso por padrão
  api.post.mockResolvedValue({ data: {} })
})

// ─── Testes (RED — todos devem FALHAR porque o campo de data não existe) ─────

// O componente le tokens customizados do tema (palette.lines / palette.surfaces
// / palette.series), entao precisa do ThemeProvider no teste — regra do
// design system.
const render = (ui) => renderRTL(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

describe('AdicionarTransacaoForm — campo de data (RED)', () => {
  it('deve renderizar campo de data com valor padrão igual a hoje', () => {
    renderForm()

    // Espera um input type="date" OU um input com aria-label/label relacionado a "data"
    const campoData =
      document.querySelector('input[type="date"]') ||
      screen.queryByLabelText(/data/i) ||
      screen.queryByPlaceholderText(/data/i)

    expect(campoData).not.toBeNull()
    expect(campoData.value).toBe(hoje())
  })

  it('deve incluir data de hoje no payload quando não alterada', async () => {
    renderForm()

    await preencherCamposBase()

    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/orcamento/transacao/user-123`,
        expect.objectContaining({ data: hoje() })
      )
    })
  })

  it('deve incluir data customizada no payload quando alterada pelo usuário', async () => {
    renderForm()

    await preencherCamposBase()

    // Altera o campo de data para uma data passada específica
    const campoData =
      document.querySelector('input[type="date"]') ||
      screen.queryByLabelText(/data/i)

    expect(campoData).not.toBeNull()

    fireEvent.change(campoData, { target: { value: '2026-05-01' } })

    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/orcamento/transacao/user-123`,
        expect.objectContaining({ data: '2026-05-01' })
      )
    })
  })

  it('deve impedir submit com data futura', async () => {
    renderForm()

    await preencherCamposBase()

    const campoData =
      document.querySelector('input[type="date"]') ||
      screen.queryByLabelText(/data/i)

    expect(campoData).not.toBeNull()

    fireEvent.change(campoData, { target: { value: '2030-12-31' } })

    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    // Após o submit, a validação deve impedir o envio
    // O erro pode aparecer em um Alert ou a API não deve ter sido chamada
    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled()
    })
  })
})

describe('AdicionarTransacaoForm — conflito de saldo (409, ADR-066 do backend)', () => {
  it('pede para recarregar e tentar de novo quando o saldo mudou', async () => {
    api.post.mockRejectedValueOnce(Object.assign(new Error('409'), { response: { status: 409, data: { status: 409, erro: 'Conflito', mensagem: 'A conta foi atualizada por outra operação. Recarregue e tente novamente.' } } }))
    renderForm()
    await preencherCamposBase()

    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    expect(await screen.findByText(/saldo.*recarregue.*tente novamente/i)).toBeInTheDocument()
    expect(screen.queryByText('Falha ao adicionar transação.')).not.toBeInTheDocument()
  })

  it('mantém a mensagem genérica para outros erros', async () => {
    api.post.mockRejectedValueOnce(Object.assign(new Error('500'), { response: { status: 500, data: {} } }))
    renderForm()
    await preencherCamposBase()

    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    expect(await screen.findByText('Falha ao adicionar transação.')).toBeInTheDocument()
  })
})
