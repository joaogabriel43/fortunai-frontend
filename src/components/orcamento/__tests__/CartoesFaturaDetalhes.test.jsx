import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'
import CartoesCard from '../CartoesCard'
import { MesOrcamentoProvider } from '../../../contexts/MesOrcamentoContext'

vi.mock('../../../services/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
import api from '../../../services/api'

const CARTAO = {
    id: 'c1', nome: 'Roxinho', bandeira: 'Master', faturaAberta: 260,
    limiteTotal: 1000, percentualLimite: 26, diaFechamento: 20, diaVencimento: 28,
}

const FATURA = {
    cartaoId: 'c1', nomeCartao: 'Roxinho',
    inicioCiclo: '2026-05-21', fechamento: '2026-06-20', vencimento: '2026-06-28',
    total: 260,
    itens: [
        { transacaoId: 't1', descricao: 'Mercado', valor: 200, categoria: 'Mercado', data: '2026-06-01', parcelada: false, parcelamentoId: null },
        { transacaoId: 't2', descricao: 'TV (1/3)', valor: 60, categoria: 'Casa', data: '2026-06-02', parcelada: true, parcelamentoId: 'p1' },
    ],
    porCategoria: [
        { categoria: 'Mercado', total: 200 },
        { categoria: 'Casa', total: 60 },
    ],
}

const ASSINATURAS = {
    recorrencias: [{ nome: 'Netflix', valorMedio: 39.9, frequencia: 'MENSAL' }],
    totalMensalComprometido: 39.9,
}

const renderCard = () =>
    render(
        <ThemeProvider theme={theme}>
            <MesOrcamentoProvider>
                <CartoesCard />
            </MesOrcamentoProvider>
        </ThemeProvider>
    )

// Os lançamentos ficam na segunda aba do painel; a exclusão passa pelo
// ConfirmarExclusaoDialog (antes era window.confirm).
const pedirExclusaoDoParcelamento = async () => {
    renderCard()
    fireEvent.click(await screen.findByLabelText('detalhes da fatura Roxinho'))
    fireEvent.click(await screen.findByRole('tab', { name: 'Lançamentos' }))
    fireEvent.click(await screen.findByLabelText('excluir parcelamento de TV (1/3)'))
    return screen.findByTestId('confirmar-exclusao-dialog')
}

describe('CartoesCard — detalhes da fatura (ADR-040)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        api.get.mockImplementation((url) => {
            if (url === '/cartoes') return Promise.resolve({ data: [CARTAO] })
            if (url.includes('/fatura')) return Promise.resolve({ data: FATURA })
            if (url.includes('/assinaturas')) return Promise.resolve({ data: ASSINATURAS })
            return Promise.resolve({ data: {} })
        })
    })

    it('abre o dialog com quebra por categoria e assinaturas do cartão', async () => {
        renderCard()
        await waitFor(() => expect(screen.getByLabelText('detalhes da fatura Roxinho')).toBeInTheDocument())
        fireEvent.click(screen.getByLabelText('detalhes da fatura Roxinho'))

        await waitFor(() => expect(screen.getByTestId('fatura-cat-Mercado')).toBeInTheDocument())
        expect(screen.getByTestId('fatura-cat-Casa')).toBeInTheDocument()
        expect(screen.getByText(/Netflix/)).toBeInTheDocument()
        expect(screen.getByText(/Comprometimento mensal estimado/)).toBeInTheDocument()
    })

    it('exclui parcelamento em grupo após confirmação (DELETE /cartoes/parcelamentos/{id})', async () => {
        api.delete.mockResolvedValue({ data: { parcelasRemovidas: 3 } })

        const dialog = await pedirExclusaoDoParcelamento()
        fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }))

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith('/cartoes/parcelamentos/p1')
        })
    })

    it('cancelar a confirmação não chama o DELETE', async () => {
        const dialog = await pedirExclusaoDoParcelamento()
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

        await waitFor(() =>
            expect(screen.queryByTestId('confirmar-exclusao-dialog')).not.toBeInTheDocument())
        expect(api.delete).not.toHaveBeenCalled()
    })
})
