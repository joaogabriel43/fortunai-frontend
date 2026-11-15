import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'
import CheckoutRetorno, { INTERVALO_CONSULTA_MS, MAX_CONSULTAS_AUTOMATICAS } from '../CheckoutRetorno'
import { assinaturaService } from '../../services/assinaturaService'

vi.mock('../../services/assinaturaService', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, assinaturaService: { status: vi.fn() } }
})

const renderPage = (url = '/plano/retorno') => render(
  <ThemeProvider theme={theme}>
    <MemoryRouter initialEntries={[url]}><CheckoutRetorno /></MemoryRouter>
  </ThemeProvider>,
)

// Deixa as promessas do mock resolverem sob fake timers.
const flush = () => act(async () => { await Promise.resolve() })

beforeEach(() => vi.clearAllMocks())

describe('CheckoutRetorno', () => {
  it('ignora ?status=approved quando o backend diz que nada foi aprovado', async () => {
    assinaturaService.status.mockResolvedValue({ status: 'CANCELADA' })
    renderPage('/plano/retorno?status=approved&collection_status=approved')
    expect(await screen.findByRole('heading', { name: 'Pagamento não aprovado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute('href', '/plano')
  })

  it('aprovado só quando o backend devolve ATIVA', async () => {
    assinaturaService.status.mockResolvedValue({ status: 'ATIVA' })
    renderPage('/plano/retorno?status=rejected')
    expect(await screen.findByRole('heading', { name: 'Pagamento aprovado' })).toBeInTheDocument()
  })

  it('sem assinatura (null) conta como não aprovado', async () => {
    assinaturaService.status.mockResolvedValue(null)
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Pagamento não aprovado' })).toBeInTheDocument()
  })

  it('erro na consulta oferece nova consulta', async () => {
    assinaturaService.status.mockRejectedValueOnce(new Error('rede')).mockResolvedValue({ status: 'ATIVA' })
    renderPage()
    const botao = await screen.findByRole('button', { name: 'Consultar novamente' })
    await act(async () => { botao.click() })
    expect(await screen.findByRole('heading', { name: 'Pagamento aprovado' })).toBeInTheDocument()
    expect(assinaturaService.status).toHaveBeenCalledTimes(2)
  })

  describe('pendente', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('consulta de novo a cada intervalo e para quando aprova', async () => {
      assinaturaService.status
        .mockResolvedValueOnce({ status: 'PENDENTE' })
        .mockResolvedValueOnce({ status: 'PENDENTE' })
        .mockResolvedValue({ status: 'ATIVA' })
      renderPage()
      await flush()
      expect(screen.getByRole('heading', { name: 'Estamos confirmando seu pagamento' })).toBeInTheDocument()
      expect(assinaturaService.status).toHaveBeenCalledTimes(1)

      await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_CONSULTA_MS) })
      expect(assinaturaService.status).toHaveBeenCalledTimes(2)

      await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_CONSULTA_MS) })
      expect(assinaturaService.status).toHaveBeenCalledTimes(3)
      expect(screen.getByRole('heading', { name: 'Pagamento aprovado' })).toBeInTheDocument()

      await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_CONSULTA_MS * 3) })
      expect(assinaturaService.status).toHaveBeenCalledTimes(3)
    })

    it('para de consultar sozinha após o limite e mantém o botão manual', async () => {
      assinaturaService.status.mockResolvedValue({ status: 'PENDENTE' })
      renderPage()
      await flush()
      // Um act por intervalo: dentro de um act só, o React só aplica os
      // renders (e agenda o próximo timer) quando o act termina.
      for (let i = 0; i < MAX_CONSULTAS_AUTOMATICAS + 3; i += 1) {
        await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_CONSULTA_MS) })
      }
      expect(assinaturaService.status).toHaveBeenCalledTimes(MAX_CONSULTAS_AUTOMATICAS)
      expect(screen.getByText(/está demorando mais que o normal/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Consultar novamente' })).toBeEnabled()
    })
  })
})
