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
    assinaturaService.cancelar.mockResolvedValue({ ...mensalAtiva, status: 'REEMBOLSADA', cancelavel: false })
    renderStatus(onSuccess)
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /direito de arrependimento/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    await waitFor(() => expect(assinaturaService.cancelar).toHaveBeenCalledWith(true))
    expect(onSuccess).toHaveBeenCalledWith('Assinatura cancelada e reembolso concluído.')
  })

  describe('regressão: respostas do cancelamento (fortunai#67)', () => {
    const erroHttp = (status, data) => Object.assign(new Error('http'), { response: { status, data } })
    const abrirEConfirmar = async () => {
      await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
      await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    }

    it('200 com o DTO: usa a resposta sem reler o status', async () => {
      assinaturaService.status.mockResolvedValue(mensalAtiva)
      assinaturaService.cancelar.mockResolvedValue({ ...mensalAtiva, status: 'CANCELADA', cancelavel: false, proximaCobrancaEm: null })
      renderStatus()
      await abrirEConfirmar()
      expect(await screen.findByText('Cancelada')).toBeInTheDocument()
      expect(assinaturaService.status).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
    })

    it('200 com reembolsoEmProcessamento: avisa que o reembolso está em processamento', async () => {
      const onSuccess = vi.fn()
      assinaturaService.status.mockResolvedValue(mensalAtiva)
      assinaturaService.cancelar.mockResolvedValue({ ...mensalAtiva, status: 'CANCELADA', reembolsoEmProcessamento: true, cancelavel: false })
      renderStatus(onSuccess)
      await abrirEConfirmar()
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Assinatura cancelada. Reembolso em processamento.'))
      expect(screen.getByText('Reembolso em processamento. O valor volta pelo mesmo meio de pagamento.')).toBeInTheDocument()
    })

    it('404: fecha o diálogo, avisa e relê o status', async () => {
      const onSuccess = vi.fn()
      assinaturaService.status.mockResolvedValueOnce(mensalAtiva).mockResolvedValueOnce(null)
      assinaturaService.cancelar.mockRejectedValue(erroHttp(404, { erro: 'ASSINATURA_NAO_ENCONTRADA' }))
      renderStatus(onSuccess)
      await abrirEConfirmar()
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Não há assinatura para cancelar.'))
      expect(await screen.findByRole('link', { name: 'Ver planos' })).toBeInTheDocument()
      expect(assinaturaService.status).toHaveBeenCalledTimes(2)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('409 REEMBOLSO_INDISPONIVEL: tira o reembolso e oferece só o cancelamento simples', async () => {
      assinaturaService.status.mockResolvedValue(mensalAtiva)
      assinaturaService.cancelar
        .mockRejectedValueOnce(erroHttp(409, { erro: 'REEMBOLSO_INDISPONIVEL' }))
        .mockResolvedValueOnce({ ...mensalAtiva, status: 'CANCELADA', cancelavel: false })
      renderStatus()
      await userEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))
      await userEvent.click(screen.getByRole('checkbox', { name: /direito de arrependimento/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'O prazo de 7 dias para reembolso terminou. Você ainda pode cancelar sem reembolso.',
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(assinaturaService.cancelar).toHaveBeenNthCalledWith(1, true)

      await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
      await waitFor(() => expect(assinaturaService.cancelar).toHaveBeenNthCalledWith(2, false))
    })

    it('502: Mercado Pago fora, nada mudou, diálogo continua aberto', async () => {
      assinaturaService.status.mockResolvedValue(mensalAtiva)
      assinaturaService.cancelar.mockRejectedValue(erroHttp(502, { erro: 'GATEWAY_INDISPONIVEL' }))
      renderStatus()
      await abrirEConfirmar()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'O Mercado Pago não respondeu. Tente de novo em instantes; nada foi alterado.',
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(assinaturaService.status).toHaveBeenCalledTimes(1)
    })
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
