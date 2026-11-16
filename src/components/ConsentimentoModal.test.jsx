import React from 'react'
import { render as renderRTL, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ← RED: ConsentimentoModal.jsx não existe ainda
import ConsentimentoModal from './ConsentimentoModal'

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: null }),
  },
}))

import api from '../services/api'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../theme'

// O componente le tokens customizados do tema (palette.lines / palette.surfaces
// / palette.series), entao precisa do ThemeProvider no teste — regra do
// design system.
const render = (ui) => renderRTL(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

describe('ConsentimentoModal', () => {
  const onAceitar = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Modal aparece quando aberto (consentimentoPendente = true)
  it('renderiza quando open=true com texto de atualização de termos', () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    // Usa data-testid para evitar múltiplos matches de "Termos de Uso" no DOM
    expect(screen.getByTestId('consentimento-titulo')).toBeInTheDocument()
    expect(screen.getByTestId('consentimento-titulo')).toHaveTextContent(/Termos|Política|atualizados/i)
  })

  // 2. Não renderiza quando open=false
  it('não renderiza conteúdo quando open=false', () => {
    render(<ConsentimentoModal open={false} onAceitar={onAceitar} />)

    expect(
      screen.queryByText(/Termos de Uso|Política de Privacidade/i)
    ).not.toBeInTheDocument()
  })

  // 3. Checkbox obrigatório antes de habilitar "Aceitar"
  it('botão "Aceitar" desabilitado até marcar checkbox', () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    const btn = screen.getByRole('button', { name: /aceitar/i })
    expect(btn).toBeDisabled()
  })

  it('botão "Aceitar" habilitado após marcar checkbox', () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    const btn = screen.getByRole('button', { name: /aceitar/i })
    expect(btn).not.toBeDisabled()
  })

  // 4. Clicar "Aceitar" chama POST /api/conta/consentimento
  it('clicar "Aceitar e continuar" chama POST /api/conta/consentimento', async () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /aceitar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/conta/consentimento',
        expect.objectContaining({
          versaoTermos: expect.any(String),
          versaoPrivacidade: expect.any(String),
        })
      )
    })
  })

  // Versão 2.0 = Termos/Política do plano pago (ADR-073). Tem de bater com o backend.
  it('envia e exibe a versão 2.0 dos documentos', async () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    expect(screen.getByText(/Termos de Uso — versão 2\.0/)).toBeInTheDocument()
    expect(screen.getByText(/Política de Privacidade — versão 2\.0/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /aceitar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/conta/consentimento', {
        versaoTermos: '2.0',
        versaoPrivacidade: '2.0',
      })
    })
  })

  // 5. Após aceitar → callback onAceitar é chamado
  it('após POST bem-sucedido chama callback onAceitar', async () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /aceitar/i }))

    await waitFor(() => {
      expect(onAceitar).toHaveBeenCalledTimes(1)
    })
  })

  // 6. Modal não pode ser fechado sem aceitar (sem botão X)
  it('não exibe botão de fechar — modal é obrigatório', () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    // Não deve haver botão de fechar / cancelar
    expect(screen.queryByRole('button', { name: /fechar|cancelar|x/i })).not.toBeInTheDocument()
  })

  // 7. Links para /termos e /privacidade presentes
  it('contém links para /termos e /privacidade', () => {
    render(<ConsentimentoModal open={true} onAceitar={onAceitar} />)

    // getAllByRole evita falha por múltiplos links com texto similar
    const termosLinks = screen.getAllByRole('link').filter(
      (el) => /termos/i.test(el.textContent)
    )
    const privacidadeLinks = screen.getAllByRole('link').filter(
      (el) => /privacidade/i.test(el.textContent)
    )
    expect(termosLinks.length).toBeGreaterThan(0)
    expect(privacidadeLinks.length).toBeGreaterThan(0)
  })
})
