import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'
import PlanoPage from '../PlanoPage'
import usePlano from '../../hooks/usePlano'
import usePagamentosHabilitados from '../../hooks/usePagamentosHabilitados'
import { assinaturaService } from '../../services/assinaturaService'

// Este arquivo cobre os pagamentos LIBERADOS; PlanoPage.test.jsx cobre o padrão (upgrade por e-mail).
// A chave dupla (constante + /api/features) é testada em usePagamentosHabilitados.test.js.
vi.mock('../../hooks/usePlano', () => ({ default: vi.fn() }))
vi.mock('../../hooks/usePagamentosHabilitados', () => ({ default: vi.fn() }))
vi.mock('../../services/assinaturaService', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, assinaturaService: { iniciar: vi.fn(), status: vi.fn(), cancelar: vi.fn(), ofertas: vi.fn() } }
})

const erroHttp = (status, data) => Object.assign(new Error('http'), { response: { status, data } })
const OFERTAS = {
  pagamentosHabilitados: true,
  ofertas: [{ ciclo: 'MENSAL', valor: 19.9 }, { ciclo: 'ANUAL', valor: 199 }],
}

let locationOriginal
let assign

beforeEach(() => {
  vi.clearAllMocks()
  usePlano.mockReturnValue({ plano: 'FREE', isPremium: false, isLimitado: vi.fn(() => false), getUso: vi.fn(), loading: false })
  usePagamentosHabilitados.mockReturnValue(true)
  assinaturaService.ofertas.mockResolvedValue(OFERTAS)
  assign = vi.fn()
  locationOriginal = window.location
  Object.defineProperty(window, 'location', { configurable: true, value: { ...locationOriginal, assign } })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal })
})

const renderPage = () => render(
  <ThemeProvider theme={theme}>
    <MemoryRouter initialEntries={['/plano']}><PlanoPage /></MemoryRouter>
  </ThemeProvider>,
)

// formatBRL usa espaço não separável depois do "R$".
const MENSAL = /^Assinar mensal R\$\s19,90 \(cartão\)$/
const ANUAL = /^Assinar anual R\$\s199,00 \(Pix ou cartão\)$/

/** Espera as ofertas chegarem e o botão habilitar. */
const botaoPronto = async (nome) => {
  const botao = await screen.findByRole('button', { name: nome })
  await waitFor(() => expect(botao).toBeEnabled())
  return botao
}

describe('PlanoPage com pagamentos liberados', () => {
  it('mostra os dois botões com os preços de /ofertas no lugar do upgrade por e-mail', async () => {
    renderPage()
    expect(await botaoPronto(MENSAL)).toBeInTheDocument()
    expect(await botaoPronto(ANUAL)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Começar Premium/i })).not.toBeInTheDocument()
    expect(assinaturaService.ofertas).toHaveBeenCalledTimes(1)
  })

  it('usa o preço que o backend devolve, não um valor fixo', async () => {
    assinaturaService.ofertas.mockResolvedValue({
      pagamentosHabilitados: true,
      ofertas: [{ ciclo: 'MENSAL', valor: 24.9 }, { ciclo: 'ANUAL', valor: 249 }],
    })
    renderPage()
    expect(await botaoPronto(/^Assinar mensal R\$\s24,90/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Assinar anual R\$\s249,00/ })).toBeInTheDocument()
    expect(screen.getByText(/por mês · ou R\$\s249,00 por ano/)).toBeInTheDocument()
  })

  it('ofertas falhando: mostra os preços de exibição com os botões desabilitados', async () => {
    assinaturaService.ofertas.mockRejectedValue(erroHttp(500))
    renderPage()
    expect(await screen.findByText(/Não foi possível carregar os preços agora/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: MENSAL })).toBeDisabled()
    expect(screen.getByRole('button', { name: ANUAL })).toBeDisabled()
  })

  it('pagamentosHabilitados false em /ofertas: botões desabilitados com aviso', async () => {
    assinaturaService.ofertas.mockResolvedValue({ ...OFERTAS, pagamentosHabilitados: false })
    renderPage()
    expect(await screen.findByText(/indisponível no momento/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: MENSAL })).toBeDisabled()
    expect(screen.getByRole('button', { name: ANUAL })).toBeDisabled()
  })

  it('ciclo ausente em /ofertas: só aquele botão fica desabilitado', async () => {
    assinaturaService.ofertas.mockResolvedValue({ pagamentosHabilitados: true, ofertas: [{ ciclo: 'ANUAL', valor: 199 }] })
    renderPage()
    expect(await botaoPronto(ANUAL)).toBeEnabled()
    expect(screen.getByRole('button', { name: MENSAL })).toBeDisabled()
  })

  it('anual: pede o checkout com ciclo ANUAL e redireciona para a URL do backend', async () => {
    const url = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=abc'
    assinaturaService.iniciar.mockResolvedValue({ assinaturaId: 1, checkoutUrl: url })
    renderPage()
    await userEvent.click(await botaoPronto(ANUAL))
    await waitFor(() => expect(assign).toHaveBeenCalledWith(url))
    expect(assinaturaService.iniciar).toHaveBeenCalledWith('ANUAL')
  })

  it('mensal: usa o ciclo MENSAL', async () => {
    assinaturaService.iniciar.mockResolvedValue({ checkoutUrl: 'https://www.mercadopago.com.br/subscriptions/checkout?x=1' })
    renderPage()
    await userEvent.click(await botaoPronto(MENSAL))
    await waitFor(() => expect(assinaturaService.iniciar).toHaveBeenCalledWith('MENSAL'))
  })

  it('não redireciona para URL fora do Mercado Pago', async () => {
    assinaturaService.iniciar.mockResolvedValue({ checkoutUrl: 'https://evil.example.com/pagar' })
    renderPage()
    await userEvent.click(await botaoPronto(MENSAL))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir o pagamento agora. Tente novamente.')
    expect(assign).not.toHaveBeenCalled()
  })

  it.each([
    [erroHttp(409, { erro: 'ASSINATURA_VIGENTE' }), 'já tem uma assinatura em vigor'],
    [erroHttp(429), 'Muitas tentativas seguidas'],
    [erroHttp(503, { erro: 'PAGAMENTOS_DESABILITADOS' }), 'indisponível no momento'],
    [erroHttp(502, { erro: 'GATEWAY_INDISPONIVEL' }), 'O Mercado Pago não respondeu agora'],
  ])('mostra a mensagem certa para o erro %#', async (erro, trecho) => {
    assinaturaService.iniciar.mockRejectedValue(erro)
    renderPage()
    await userEvent.click(await botaoPronto(ANUAL))
    expect(await screen.findByRole('alert')).toHaveTextContent(trecho)
    // Botões voltam a ficar disponíveis para nova tentativa.
    expect(screen.getByRole('button', { name: ANUAL })).toBeEnabled()
  })

  it('usuário Premium não vê os botões de assinatura', async () => {
    usePlano.mockReturnValue({ plano: 'PREMIUM', isPremium: true, isLimitado: vi.fn(), getUso: vi.fn(), loading: false })
    renderPage()
    await waitFor(() => expect(assinaturaService.ofertas).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /Assinar mensal/ })).not.toBeInTheDocument()
  })
})

describe('PlanoPage com pagamentos não liberados pelo backend', () => {
  it('volta ao upgrade por e-mail e nem consulta as ofertas', () => {
    usePagamentosHabilitados.mockReturnValue(false)
    renderPage()
    expect(screen.getByRole('button', { name: /Começar Premium/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Assinar mensal/ })).not.toBeInTheDocument()
    expect(assinaturaService.ofertas).not.toHaveBeenCalled()
  })

  it('enquanto /features responde, não mostra nenhum dos dois caminhos', () => {
    usePagamentosHabilitados.mockReturnValue(null)
    renderPage()
    expect(screen.queryByRole('button', { name: /Começar Premium/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Assinar mensal/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Carregando planos')).toBeInTheDocument()
  })
})
