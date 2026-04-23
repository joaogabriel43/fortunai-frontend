import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ImportacaoExtratoModal from '../ImportacaoExtratoModal'

vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from '../../../services/api'

const createMockFile = (name = 'extrato.csv', type = 'text/csv') => {
  return new File(['date,title,amount\n2026-03-01,Compra,-50.00'], name, { type })
}

describe('ImportacaoExtratoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar dropzone para CSV e OFX', () => {
    render(<ImportacaoExtratoModal open={true} onClose={vi.fn()} />)

    expect(screen.getByText('Importar Extrato Bancário')).toBeInTheDocument()
    expect(screen.getByText(/Arraste um arquivo CSV ou OFX/)).toBeInTheDocument()
    expect(screen.getByText('Analisar Extrato')).toBeInTheDocument()
  })

  it('deve exibir preview das transações antes de confirmar', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        transacoes: [
          { data: '2026-03-01', descricao: 'Supermercado', valor: 150.50, tipo: 'DEBIT', isDuplicata: false },
          { data: '2026-03-05', descricao: 'Salário', valor: 5000.00, tipo: 'CREDIT', isDuplicata: false },
        ],
        totalTransacoes: 2,
        totalDuplicatas: 0,
        totalValidas: 2,
      },
    })

    render(<ImportacaoExtratoModal open={true} onClose={vi.fn()} />)

    // Simula seleção de arquivo via input
    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [createMockFile()] } })

    fireEvent.click(screen.getByText('Analisar Extrato'))

    await waitFor(() => {
      expect(screen.getByText('Preview do Extrato')).toBeInTheDocument()
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.getByText('Salário')).toBeInTheDocument()
      expect(screen.getByText(/2 transações encontradas/)).toBeInTheDocument()
    })
  })

  it('deve exibir contador de duplicatas detectadas', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        transacoes: [
          { data: '2026-03-01', descricao: 'Compra', valor: 50, tipo: 'DEBIT', isDuplicata: true },
          { data: '2026-03-05', descricao: 'Nova', valor: 30, tipo: 'DEBIT', isDuplicata: false },
        ],
        totalTransacoes: 2,
        totalDuplicatas: 1,
        totalValidas: 1,
      },
    })

    render(<ImportacaoExtratoModal open={true} onClose={vi.fn()} />)

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [createMockFile()] } })
    fireEvent.click(screen.getByText('Analisar Extrato'))

    await waitFor(() => {
      expect(screen.getByText(/1 duplicatas/)).toBeInTheDocument()
      expect(screen.getByText(/1 novas/)).toBeInTheDocument()
      expect(screen.getByText('Duplicata')).toBeInTheDocument()
    })
  })

  it('deve confirmar e importar todas as transações válidas', async () => {
    api.post
      .mockResolvedValueOnce({
        data: {
          transacoes: [
            { data: '2026-03-01', descricao: 'Compra', valor: 50, tipo: 'DEBIT', isDuplicata: false },
          ],
          totalTransacoes: 1,
          totalDuplicatas: 0,
          totalValidas: 1,
        },
      })
      .mockResolvedValueOnce({
        data: { mensagem: '1 transações importadas com sucesso!', totalImportadas: 1 },
      })

    render(<ImportacaoExtratoModal open={true} onClose={vi.fn()} />)

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [createMockFile()] } })
    fireEvent.click(screen.getByText('Analisar Extrato'))

    await waitFor(() => {
      expect(screen.getByText(/Importar 1 transações/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Importar 1 transações/))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/extrato/confirmar', expect.any(Array))
      expect(screen.getByText(/1 transações importadas com sucesso!/)).toBeInTheDocument()
    })
  })

  it('deve chamar onImported ao fechar após importação bem-sucedida (botão Fechar)', async () => {
    const onImported = vi.fn()
    const onClose = vi.fn()

    api.post
      .mockResolvedValueOnce({
        data: {
          transacoes: [
            { data: '2026-03-01', descricao: 'Compra', valor: 50, tipo: 'DEBIT', isDuplicata: false },
          ],
          totalTransacoes: 1, totalDuplicatas: 0, totalValidas: 1,
        },
      })
      .mockResolvedValueOnce({
        data: { mensagem: '1 transações importadas com sucesso!', totalImportadas: 1 },
      })

    render(<ImportacaoExtratoModal open={true} onClose={onClose} onImported={onImported} />)

    // Seleciona arquivo e analisa
    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [createMockFile()] } })
    fireEvent.click(screen.getByText('Analisar Extrato'))

    // Aguarda step de preview e confirma importação
    await waitFor(() => screen.getByText(/Importar 1 transações/))
    fireEvent.click(screen.getByText(/Importar 1 transações/))

    // Aguarda tela de sucesso
    await waitFor(() => screen.getByText(/1 transações importadas com sucesso!/))

    // Clica em Fechar (não "Ver no Orçamento")
    fireEvent.click(screen.getByText('Fechar'))

    // onImported deve ser chamado mesmo clicando em Fechar
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('deve chamar onImported ao clicar em Ver no Orçamento após importação', async () => {
    const onImported = vi.fn()

    api.post
      .mockResolvedValueOnce({
        data: {
          transacoes: [
            { data: '2026-03-01', descricao: 'Compra', valor: 50, tipo: 'DEBIT', isDuplicata: false },
          ],
          totalTransacoes: 1, totalDuplicatas: 0, totalValidas: 1,
        },
      })
      .mockResolvedValueOnce({
        data: { mensagem: '1 transações importadas com sucesso!', totalImportadas: 1 },
      })

    render(<ImportacaoExtratoModal open={true} onClose={vi.fn()} onImported={onImported} />)

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [createMockFile()] } })
    fireEvent.click(screen.getByText('Analisar Extrato'))

    await waitFor(() => screen.getByText(/Importar 1 transações/))
    fireEvent.click(screen.getByText(/Importar 1 transações/))

    await waitFor(() => screen.getByText(/1 transações importadas com sucesso!/))

    // Clica em "Ver no Orçamento"
    fireEvent.click(screen.getByText('Ver no Orçamento'))

    // onImported deve ser chamado exatamente uma vez (não duplicado)
    expect(onImported).toHaveBeenCalledTimes(1)
  })

  it('deve exibir erro para arquivo inválido', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Formato não suportado. Envie arquivo CSV ou OFX.' } },
    })

    render(<ImportacaoExtratoModal open={true} onClose={vi.fn()} />)

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [createMockFile('doc.csv')] } })
    fireEvent.click(screen.getByText('Analisar Extrato'))

    await waitFor(() => {
      expect(screen.getByText('Formato não suportado. Envie arquivo CSV ou OFX.')).toBeInTheDocument()
    })
  })
})
