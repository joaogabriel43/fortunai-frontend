import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Metas from '../Metas'

vi.mock('../../hooks/useMetas', () => ({
  useMetas: vi.fn(),
}))

import { useMetas } from '../../hooks/useMetas'

const mockMetas = [
  { id: '1', titulo: 'Reserva Emergencia', valorAlvo: 30000, prazo: '2027-03-23', tipo: 'EMERGENCIA', progresso: 50, valorFaltante: 15000, previsaoConclusao: '2026-12' },
  { id: '2', titulo: 'Viagem', valorAlvo: 5000, prazo: '2026-09-23', tipo: 'LIVRE', progresso: 20, valorFaltante: 4000, previsaoConclusao: '2026-08' },
]

describe('MetasPage', () => {
  const mockCriarMeta = vi.fn()
  const mockExcluirMeta = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useMetas.mockReturnValue({
      metas: mockMetas,
      loading: false,
      error: null,
      criarMeta: mockCriarMeta,
      excluirMeta: mockExcluirMeta,
    })
  })

  it('deve renderizar titulo da pagina', () => {
    render(<Metas />)
    expect(screen.getByText('Metas Financeiras')).toBeInTheDocument()
  })

  it('deve renderizar lista de metas', () => {
    render(<Metas />)
    expect(screen.getByText('Reserva Emergencia')).toBeInTheDocument()
    expect(screen.getByText('Viagem')).toBeInTheDocument()
  })

  it('deve criar nova meta via formulario', async () => {
    mockCriarMeta.mockResolvedValue()
    render(<Metas />)

    fireEvent.change(screen.getByLabelText(/Titulo/), { target: { value: 'Carro novo' } })
    fireEvent.change(screen.getByLabelText(/Valor Alvo/), { target: { value: '50000' } })
    fireEvent.change(screen.getByLabelText(/Prazo/), { target: { value: '2028-01-01' } })

    fireEvent.click(screen.getByText('Criar Meta'))

    await waitFor(() => {
      expect(mockCriarMeta).toHaveBeenCalledWith(expect.objectContaining({
        titulo: 'Carro novo',
        valorAlvo: 50000,
        prazo: '2028-01-01',
      }))
    })
  })

  it('deve excluir meta ao clicar no botao', async () => {
    mockExcluirMeta.mockResolvedValue()
    render(<Metas />)

    const deleteButtons = screen.getAllByLabelText('excluir meta')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockExcluirMeta).toHaveBeenCalledWith('1')
    })
  })
})
