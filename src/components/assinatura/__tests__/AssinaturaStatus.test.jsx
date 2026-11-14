import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'
import AssinaturaStatus from '../AssinaturaStatus'
import { assinaturaService } from '../../../services/assinaturaService'

vi.mock('../../../services/assinaturaService', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, assinaturaService: { status: vi.fn(), cancelar: vi.fn() } }
})
vi.mock('../../../utils/dateUtils', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, hojeLocal: () => '2026-11-14' }
})

const mensalAtiva = {
  status: 'ATIVA',
  ciclo: 'MENSAL',
  acessoAte: '2026-12-10',
  proximaCobrancaEm: '2026-12-10',
  reembolsoDisponivelAte: '2026-11-17',
  cancelavel: true,
}

const renderStatus = (onSuccess = vi.fn()) => render(
  <ThemeProvider theme={theme}>
    <MemoryRouter><AssinaturaStatus onSuccess={onSuccess} /></MemoryRouter>
  </ThemeProvider>,
)

beforeEach(() => vi.clearAllMocks())

describe('AssinaturaStatus', () => {
  it('mostra status, próxima cobrança, acesso até e o texto do arrependimento', async () => {
    assinaturaService.status.mockResolvedValue(mensalAtiva)
    renderStatus()
    expect(await screen.findByText('Premium mensal')).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByText('Próxima cobrança')).toBeInTheDocument()
    expect(screen.getAllByText('10 de dezembro de 2026')).toHaveLength(2)
    expect(screen.getByText(/em até 7 dias da contratação/)).toBeInTheDocument()
  })

  it('sem assinatura mostra o plano Gratuito e o link para /plano', async () => {
    assinaturaService.status.mockResolvedValue(null)
    renderStatus()
    expect(await screen.findByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/plano')
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
  })

  it('não oferece cancelar quando cancelavel é false', async () => {
    assinaturaService.status.mockResolvedValue({ ...mensalAtiva, status: 'CANCELADA', cancelavel: false, proximaCobrancaEm: null })
    renderStatus()
    expect(await screen.findByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
  })

  it('mostra reembolso em processamento', async () => {
    assinaturaService.status.mockResolvedValue({ ...mensalAtiva, status: 'REEMBOLSADA', reembolsoEmProcessamento: true, cancelavel: false })
    renderStatus()
    expect(await screen.findByText(/Reembolso em processamento/)).toBeInTheDocument()
  })

  it('cancelar exige confirmação e, sem marcar o reembolso, envia false', async () => {
    const onSuccess = vi.fn()
    assinaturaService.status.mockResolvedValue(mensalAtiva)
    assinaturaService.cancelar.mockResolvedValue({})
    renderStatus(onSuccess)
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
    expect(assinaturaService.cancelar).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Você mantém o Premium até 10 de dezembro de 2026/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cancelamento' }))

    await waitFor(() => expect(assinaturaService.cancelar).toHaveBeenCalledWith(false))
    expect(onSuccess).toHaveBeenCalledWith('Assinatura cancelada.')
    // Relê o status depois de cancelar.
    expect(assinaturaService.status).toHaveBeenCalledTimes(2)
  })

  it('dentro dos 7 dias oferece o reembolso e envia true quando marcado', async () => {
    const onSuccess = vi.fn()
    assinaturaService.status.mockResolvedValue(mensalAtiva)
    assinaturaService.cancelar.mockResolvedValue({})
    renderStatus(onSuccess)
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /direito de arrependimento/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    await waitFor(() => expect(assinaturaService.cancelar).toHaveBeenCalledWith(true))
    expect(onSuccess).toHaveBeenCalledWith('Assinatura cancelada. O reembolso foi solicitado.')
  })

  it('fora dos 7 dias não oferece o reembolso', async () => {
    assinaturaService.status.mockResolvedValue({ ...mensalAtiva, reembolsoDisponivelAte: '2026-11-13' })
    renderStatus()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('falha ao cancelar mantém o diálogo aberto com a mensagem', async () => {
    assinaturaService.status.mockResolvedValue(mensalAtiva)
    assinaturaService.cancelar.mockRejectedValue(new Error('rede'))
    renderStatus()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível cancelar agora')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
