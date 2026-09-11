import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'
import NovoGastoWizard from '../NovoGastoWizard'
import { hojeLocal } from '../../../utils/dateUtils'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}))

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

// Mesmo stub do AdicionarTransacaoForm.test: o CreatableSelect vira um input
// que devolve { value, label } a cada digitação.
vi.mock('react-select/creatable', () => ({
  default: ({ onChange, placeholder }) => (
    <input
      data-testid="categoria-select"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value ? { value: e.target.value, label: e.target.value } : null)}
    />
  ),
}))

import api from '../../../services/api'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CARTAO = { id: 'c1', nome: 'Roxinho', diaFechamento: 5, diaVencimento: 15 }

const GERENCIADAS = [
  { id: 'g1', nome: 'Casa', cor: null, categoriaPaiId: null },
  { id: 'g2', nome: 'Aluguel', cor: null, categoriaPaiId: 'g1' },
  { id: 'g3', nome: 'Mercado', cor: null, categoriaPaiId: null },
]

const mockApi = ({ progresso = [] } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/orcamento/categorias-gerenciadas') return Promise.resolve({ data: GERENCIADAS })
    if (url === '/orcamento/categorias/user-123') return Promise.resolve({ data: ['Mercado', 'Lazer'] })
    if (url === '/orcamento/limites/progresso') return Promise.resolve({ data: { itens: progresso } })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

const renderWizard = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <NovoGastoWizard open cartao={CARTAO} onClose={vi.fn()} onLancado={vi.fn()} {...props} />
    </ThemeProvider>
  )

const preencherPasso1 = ({ valor = '1.200,00', descricao = 'Notebook' } = {}) => {
  fireEvent.change(screen.getByLabelText('Valor total (R$)'), { target: { value: valor } })
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: descricao } })
}

const irParaPasso2 = (dados) => {
  preencherPasso1(dados)
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi()
})

// ─── Testes ─────────────────────────────────────────────────────────────────

describe('NovoGastoWizard — passo 1', () => {
  it('só habilita Continuar com valor e descrição preenchidos', () => {
    renderWizard()
    const continuar = screen.getByRole('button', { name: 'Continuar' })
    expect(continuar).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Valor total (R$)'), { target: { value: '50' } })
    expect(continuar).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Farmácia' } })
    expect(continuar).toBeEnabled()
  })

  it('nasce com a data de hoje (fuso de São Paulo) e bloqueia data futura', () => {
    renderWizard()
    const data = screen.getByLabelText('Data da compra')
    expect(data).toHaveValue(hojeLocal())

    preencherPasso1()
    fireEvent.change(data, { target: { value: '2999-01-01' } })
    expect(screen.getByText(/não pode ser futura/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })
})

describe('NovoGastoWizard — passo 2', () => {
  it('mostra a prévia da parcela ao escolher 12×', () => {
    renderWizard()
    irParaPasso2()

    expect(screen.getByText('Passo 2 de 2', { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '12×' }))

    const previa = screen.getByTestId('previa-gasto')
    expect(within(previa).getByText(/12× de/)).toHaveTextContent('100,00')
    expect(within(previa).getByText(/Primeira parcela entra na fatura de/)).toBeInTheDocument()
  })

  it('lança a compra com categoria, parcelas e data de hoje', async () => {
    const onLancado = vi.fn()
    api.post.mockResolvedValue({ data: {} })
    renderWizard({ onLancado })
    irParaPasso2()

    fireEvent.click(screen.getByRole('button', { name: '12×' }))
    fireEvent.change(screen.getByTestId('categoria-select'), { target: { value: 'Eletrônicos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lançar gasto' }))

    await waitFor(() => expect(onLancado).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith('/cartoes/compra', {
      cartaoId: 'c1',
      descricao: 'Notebook',
      valor: 1200,
      categoria: 'Eletrônicos',
      parcelas: 12,
      data: hojeLocal(),
    })
  })

  it('sem categoria envia null (o backend grava "Cartão")', async () => {
    api.post.mockResolvedValue({ data: {} })
    renderWizard()
    irParaPasso2({ valor: '89,90', descricao: 'Farmácia' })

    fireEvent.click(screen.getByRole('button', { name: 'Lançar gasto' }))

    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(api.post.mock.calls[0][1]).toMatchObject({ valor: 89.9, categoria: null, parcelas: 1 })
  })

  it('categoria-pai com filhas mostra a subcategoria e grava o nome da folha', async () => {
    api.post.mockResolvedValue({ data: {} })
    renderWizard()
    // Espera as categorias carregarem antes de escolher a raiz.
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/orcamento/categorias-gerenciadas'))
    irParaPasso2()

    fireEvent.change(screen.getByTestId('categoria-select'), { target: { value: 'Casa' } })
    const sub = await screen.findByRole('combobox')
    fireEvent.mouseDown(sub)
    fireEvent.click(await screen.findByRole('option', { name: 'Aluguel' }))

    fireEvent.click(screen.getByRole('button', { name: 'Lançar gasto' }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(api.post.mock.calls[0][1].categoria).toBe('Aluguel')
  })

  it('categoria sem filhas não mostra o campo de subcategoria', async () => {
    renderWizard()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/orcamento/limites/progresso'))
    irParaPasso2()

    fireEvent.change(screen.getByTestId('categoria-select'), { target: { value: 'Mercado' } })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('avisa o impacto no limite de orçamento da categoria (≥80% → warning)', async () => {
    mockApi({ progresso: [{ categoria: 'Mercado', gasto: 700, limite: 1000, percentual: 70, status: 'OK' }] })
    renderWizard()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/orcamento/limites/progresso'))
    irParaPasso2({ valor: '200', descricao: 'Compra do mês' })

    fireEvent.change(screen.getByTestId('categoria-select'), { target: { value: 'mercado' } })

    const alerta = await screen.findByTestId('impacto-orcamento')
    expect(alerta).toHaveTextContent(/Orçamento de mercado/i)
    expect(alerta).toHaveTextContent('90%')
    expect(alerta.className).toMatch(/Warning/)
  })

  it('não mostra impacto para categoria sem limite', async () => {
    mockApi({ progresso: [{ categoria: 'Mercado', gasto: 700, limite: 1000 }] })
    renderWizard()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/orcamento/limites/progresso'))
    irParaPasso2({ valor: '200', descricao: 'Cinema' })

    fireEvent.change(screen.getByTestId('categoria-select'), { target: { value: 'Lazer' } })
    expect(screen.queryByTestId('impacto-orcamento')).not.toBeInTheDocument()
  })

  it('mostra a mensagem do backend quando o lançamento falha', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onLancado = vi.fn()
    api.post.mockRejectedValue({ response: { status: 422, data: { message: 'Cartão não encontrado.' } } })
    renderWizard({ onLancado })
    irParaPasso2()

    fireEvent.click(screen.getByRole('button', { name: 'Lançar gasto' }))

    expect(await screen.findByText('Cartão não encontrado.')).toBeInTheDocument()
    expect(onLancado).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('Voltar preserva o que foi digitado no passo 1', () => {
    renderWizard()
    irParaPasso2()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByLabelText('Valor total (R$)')).toHaveValue('1.200,00')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Notebook')
  })

  it('"Outro…" aceita parcelas fora dos atalhos', async () => {
    api.post.mockResolvedValue({ data: {} })
    renderWizard()
    irParaPasso2()

    fireEvent.click(screen.getByRole('button', { name: 'Outro…' }))
    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '18' } })
    expect(screen.getByText(/18× de/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lançar gasto' }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(api.post.mock.calls[0][1].parcelas).toBe(18)
  })
})
