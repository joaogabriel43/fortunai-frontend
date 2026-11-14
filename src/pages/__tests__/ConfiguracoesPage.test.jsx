import React from 'react'
import { render as renderRTL, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Configuracoes from '../Configuracoes'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../theme'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockService = vi.hoisted(() => ({
  getPerfil: vi.fn(),
  atualizarPerfil: vi.fn(),
  alterarSenha: vi.fn(),
  getPreferencias: vi.fn(),
  atualizarPreferencias: vi.fn(),
  uploadFoto: vi.fn(),
  desativarConta: vi.fn(),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'uuid-1', nome: 'Joao Silva', email: 'joao@example.com', fotoUrl: null },
    logout: vi.fn(),
    updateUser: vi.fn(),
  }),
}))

vi.mock('../../services/configuracaoService', () => ({
  configuracaoService: mockService,
}))

// ExclusaoContaModal usa useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../services/api', () => ({
  default: { delete: vi.fn().mockResolvedValue({ data: null }) },
}))

// A seção de assinatura tem teste próprio (AssinaturaStatus.test.jsx); aqui só o gate.
const mockPagamentos = vi.hoisted(() => vi.fn(() => false))
vi.mock('../../hooks/usePagamentosHabilitados', () => ({ default: mockPagamentos }))
vi.mock('../../components/assinatura/AssinaturaStatus', () => ({
  default: () => <div data-testid="assinatura-status" />,
}))

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockPagamentos.mockReturnValue(false)
  mockService.getPreferencias.mockResolvedValue({
    temaEscuro: true,
    notificacaoEmailAtiva: true,
    digestSemanalAtivo: true,
  })
})

// ── Testes ─────────────────────────────────────────────────────────────────

// O componente le tokens customizados do tema (palette.lines / palette.surfaces
// / palette.series), entao precisa do ThemeProvider no teste — regra do
// design system.
const render = (ui) => renderRTL(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

describe('Configuracoes — pagina de configuracoes', () => {

  it('renderiza o titulo e as 4 abas', () => {
    render(<Configuracoes />)
    expect(screen.getByText('Configurações')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Seguranca' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notificacoes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Conta' })).toBeInTheDocument()
  })

  it('aba Perfil exibe nome e email do usuario', () => {
    render(<Configuracoes />)
    expect(screen.getByDisplayValue('Joao Silva')).toBeInTheDocument()
    expect(screen.getByDisplayValue('joao@example.com')).toBeInTheDocument()
  })

  it('aba Perfil: erro se nome vazio ao salvar', async () => {
    render(<Configuracoes />)
    const nomeInput = screen.getByDisplayValue('Joao Silva')
    fireEvent.change(nomeInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))
    await waitFor(() => {
      expect(screen.getByText(/nome e email sao obrigatorios/i)).toBeInTheDocument()
    })
    expect(mockService.atualizarPerfil).not.toHaveBeenCalled()
  })

  it('aba Perfil: chama service ao salvar com dados validos', async () => {
    mockService.atualizarPerfil.mockResolvedValue({ nome: 'Joao Silva', email: 'joao@example.com' })
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))
    await waitFor(() => {
      expect(mockService.atualizarPerfil).toHaveBeenCalledWith('Joao Silva', 'joao@example.com')
    })
  })

  it('navega para aba Seguranca ao clicar', () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Seguranca' }))
    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/nova senha/i).length).toBeGreaterThan(0)
  })

  it('aba Seguranca: erro se nova senha diferente da confirmacao', async () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Seguranca' }))

    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } })
    const [novaSenhaInput] = screen.getAllByLabelText(/nova senha/i)
    fireEvent.change(novaSenhaInput, { target: { value: 'nova123' } })
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: 'diferente' } })
    fireEvent.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByText(/nao coincidem/i)).toBeInTheDocument()
    })
    expect(mockService.alterarSenha).not.toHaveBeenCalled()
  })

  it('aba Seguranca: erro 422 exibe mensagem de senha incorreta', async () => {
    mockService.alterarSenha.mockRejectedValue({ response: { status: 422 } })
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Seguranca' }))

    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'errada' } })
    const [novaSenhaInput422] = screen.getAllByLabelText(/nova senha/i)
    fireEvent.change(novaSenhaInput422, { target: { value: 'nova123' } })
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: 'nova123' } })
    fireEvent.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByText(/senha atual incorreta/i)).toBeInTheDocument()
    })
  })

  it('aba Seguranca: erro se nova senha muito curta', async () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Seguranca' }))

    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } })
    const [novaSenhaCurta] = screen.getAllByLabelText(/nova senha/i)
    fireEvent.change(novaSenhaCurta, { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByText(/pelo menos 6 caracteres/i)).toBeInTheDocument()
    })
  })

  it('aba Notificacoes carrega preferencias da API', async () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Notificacoes' }))
    await waitFor(() => {
      expect(mockService.getPreferencias).toHaveBeenCalled()
    })
    // Dark-only (D4): o toggle "Tema escuro" foi removido; valida outra preferência
    expect(screen.getByText(/notificacoes por e-mail/i)).toBeInTheDocument()
    expect(screen.getByText(/digest semanal/i)).toBeInTheDocument()
  })

  // ── Upload de foto de perfil (alinhado ao backend — ADR-047) ───────────────

  const dispararUploadFoto = (container) => {
    const input = container.querySelector('input[type="file"]')
    const file = new File(['bytes'], 'foto.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    return input
  }

  it('aba Perfil: seletor de foto aceita apenas os formatos que o backend valida', () => {
    const { container } = render(<Configuracoes />)
    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
  })

  it('aba Perfil: exibe a mensagem real do backend quando o upload falha (422)', async () => {
    mockService.uploadFoto.mockRejectedValue({
      response: { status: 422, data: { message: 'Formato de imagem inválido. Apenas JPEG e PNG são aceitos.' } },
    })
    const { container } = render(<Configuracoes />)

    await act(async () => { dispararUploadFoto(container) })

    await waitFor(() => {
      expect(screen.getByText(/apenas jpeg e png são aceitos/i)).toBeInTheDocument()
    })
  })

  it('aba Perfil: cai na mensagem generica quando o erro nao traz corpo do backend', async () => {
    mockService.uploadFoto.mockRejectedValue(new Error('Network Error'))
    const { container } = render(<Configuracoes />)

    await act(async () => { dispararUploadFoto(container) })

    await waitFor(() => {
      expect(screen.getByText(/erro ao enviar foto/i)).toBeInTheDocument()
    })
  })

  // Testes atualizados para o novo fluxo LGPD (ExclusaoContaModal com "EXCLUIR")

  it('aba Conta exibe seção Zona de Perigo com botão de exclusão', () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Conta' }))

    // Nova LGPD: "Zona de Perigo" + botão "Excluir minha conta"
    expect(screen.getByText(/zona de perigo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /excluir minha conta/i })).toBeInTheDocument()
  })

  it.each([
    [false, false],
    [null, false],
    [true, true],
  ])('aba Conta: seção Assinatura com pagamentos = %s → visível %s', (valor, visivel) => {
    mockPagamentos.mockReturnValue(valor)
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Conta' }))
    expect(screen.queryByTestId('assinatura-status') !== null).toBe(visivel)
  })

  it('aba Conta: clicar em "Excluir minha conta" abre ExclusaoContaModal', () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Conta' }))

    fireEvent.click(screen.getByRole('button', { name: /excluir minha conta/i }))

    // ExclusaoContaModal exige "EXCLUIR" — campo de confirmação deve aparecer
    expect(screen.getByTestId('exclusao-titulo')).toBeInTheDocument()
  })

  it('aba Conta: ExclusaoContaModal pode ser fechado com Cancelar', () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('tab', { name: 'Conta' }))

    // Abrir modal
    fireEvent.click(screen.getByRole('button', { name: /excluir minha conta/i }))
    expect(screen.getByTestId('exclusao-titulo')).toBeInTheDocument()

    // Fechar com Cancelar
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByTestId('exclusao-titulo')).not.toBeInTheDocument()
  })
})
