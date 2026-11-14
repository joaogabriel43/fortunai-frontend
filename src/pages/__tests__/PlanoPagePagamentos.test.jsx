import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'
import PlanoPage from '../PlanoPage'
import usePlano from '../../hooks/usePlano'
import { assinaturaService } from '../../services/assinaturaService'

// Este arquivo cobre a flag LIGADA; PlanoPage.test.jsx cobre o padrão (desligada).
vi.mock('../../config/features', () => ({
  PAGAMENTOS_HABILITADOS: true,
  COMPARTILHAMENTO_HABILITADO: false,
}))
vi.mock('../../hooks/usePlano', () => ({ default: vi.fn() }))
vi.mock('../../services/assinaturaService', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, assinaturaService: { iniciar: vi.fn(), status: vi.fn(), cancelar: vi.fn() } }
})

const erroHttp = (status, data) => Object.assign(new Error('http'), { response: { status, data } })

let locationOriginal
let assign

beforeEach(() => {
  vi.clearAllMocks()
  usePlano.mockReturnValue({ plano: 'FREE', isPremium: false, isLimitado: vi.fn(() => false), getUso: vi.fn(), loading: false })
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

describe('PlanoPage com pagamentos habilitados', () => {
  it('mostra os dois botões de assinatura no lugar do upgrade por e-mail', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Assinar mensal R$ 19,90 (cartão)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assinar anual R$ 199 (Pix ou cartão)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Começar Premium/i })).not.toBeInTheDocument()
  })

  it('anual: pede o checkout com ciclo ANUAL e redireciona para a URL do backend', async () => {
    const url = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=abc'
    assinaturaService.iniciar.mockResolvedValue({ assinaturaId: 1, checkoutUrl: url })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Assinar anual/ }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith(url))
    expect(assinaturaService.iniciar).toHaveBeenCalledWith('ANUAL')
  })

  it('mensal: usa o ciclo MENSAL', async () => {
    assinaturaService.iniciar.mockResolvedValue({ checkoutUrl: 'https://www.mercadopago.com.br/subscriptions/checkout?x=1' })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Assinar mensal/ }))
    await waitFor(() => expect(assinaturaService.iniciar).toHaveBeenCalledWith('MENSAL'))
  })

  it('não redireciona para URL fora do Mercado Pago', async () => {
    assinaturaService.iniciar.mockResolvedValue({ checkoutUrl: 'https://evil.example.com/pagar' })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Assinar mensal/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir o pagamento agora. Tente novamente.')
    expect(assign).not.toHaveBeenCalled()
  })

  it.each([
    [erroHttp(409), 'já tem uma assinatura em vigor'],
    [erroHttp(429), 'Muitas tentativas seguidas'],
    [erroHttp(503, { erro: 'PAGAMENTOS_DESABILITADOS' }), 'indisponível no momento'],
  ])('mostra a mensagem certa para o erro %#', async (erro, trecho) => {
    assinaturaService.iniciar.mockRejectedValue(erro)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Assinar anual/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(trecho)
    // Botões voltam a ficar disponíveis para nova tentativa.
    expect(screen.getByRole('button', { name: /Assinar anual/ })).toBeEnabled()
  })

  it('usuário Premium não vê os botões de assinatura', () => {
    usePlano.mockReturnValue({ plano: 'PREMIUM', isPremium: true, isLimitado: vi.fn(), getUso: vi.fn(), loading: false })
    renderPage()
    expect(screen.queryByRole('button', { name: /Assinar mensal/ })).not.toBeInTheDocument()
  })
})
