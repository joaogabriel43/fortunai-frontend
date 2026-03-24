import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UploadComprovanteModal from '../UploadComprovanteModal'

vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user-id' } })),
}))

import api from '../../../services/api'

const createMockFile = (name = 'comprovante.png', type = 'image/png') => {
  const file = new File(['dummy'], name, { type })
  // jsdom does not support URL.createObjectURL
  if (!globalThis.URL.createObjectURL) {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  }
  return file
}

describe('UploadComprovanteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar modal com preview do arquivo', () => {
    const file = createMockFile()
    render(<UploadComprovanteModal open={true} onClose={vi.fn()} file={file} />)

    expect(screen.getByText('Extrair Comprovante')).toBeInTheDocument()
    expect(screen.getByText('comprovante.png')).toBeInTheDocument()
    expect(screen.getByText('Extrair Dados')).toBeInTheDocument()
  })

  it('deve chamar API de extracao ao clicar Extrair Dados', async () => {
    api.post.mockResolvedValueOnce({
      data: { valor: 150.0, descricao: 'Farmacia', categoria: 'Saude', tipo: 'DEBIT', dataTransacao: '2026-03-20', confianca: 'ALTA' },
    })

    const file = createMockFile()
    render(<UploadComprovanteModal open={true} onClose={vi.fn()} file={file} />)

    fireEvent.click(screen.getByText('Extrair Dados'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/comprovantes/extrair', expect.any(FormData), expect.any(Object))
    })
  })

  it('deve exibir dados extraidos para confirmacao', async () => {
    api.post.mockResolvedValueOnce({
      data: { valor: 150.0, descricao: 'Farmacia', categoria: 'Saude', tipo: 'DEBIT', dataTransacao: '2026-03-20', confianca: 'ALTA' },
    })

    const file = createMockFile()
    render(<UploadComprovanteModal open={true} onClose={vi.fn()} file={file} />)

    fireEvent.click(screen.getByText('Extrair Dados'))

    await waitFor(() => {
      expect(screen.getByText(/Farmacia/)).toBeInTheDocument()
      expect(screen.getByText(/Saude/)).toBeInTheDocument()
      expect(screen.getByText('Confirmar e Salvar')).toBeInTheDocument()
    })
  })

  it('deve salvar transacao ao confirmar', async () => {
    api.post
      .mockResolvedValueOnce({
        data: { valor: 150.0, descricao: 'Farmacia', categoria: 'Saude', tipo: 'DEBIT', dataTransacao: '2026-03-20', confianca: 'ALTA' },
      })
      .mockResolvedValueOnce({ data: {} })

    const file = createMockFile()
    render(<UploadComprovanteModal open={true} onClose={vi.fn()} file={file} />)

    fireEvent.click(screen.getByText('Extrair Dados'))

    await waitFor(() => {
      expect(screen.getByText('Confirmar e Salvar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirmar e Salvar'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/orcamento/transacao/test-user-id', expect.objectContaining({
        descricao: 'Farmacia',
        valor: 150.0,
      }))
    })
  })

  it('deve exibir erro quando extracao falha', async () => {
    api.post.mockRejectedValueOnce(new Error('fail'))

    const file = createMockFile()
    render(<UploadComprovanteModal open={true} onClose={vi.fn()} file={file} />)

    fireEvent.click(screen.getByText('Extrair Dados'))

    await waitFor(() => {
      expect(screen.getByText('Falha ao extrair dados do comprovante.')).toBeInTheDocument()
    })
  })
})
