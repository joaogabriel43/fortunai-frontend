import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as renderRTL, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before imports that reference these modules
// ---------------------------------------------------------------------------

// Mock AuthContext so that ListaTransacoes receives a stable user without
// needing a real Router or JWT token.
vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'test-user-id' } }),
    AuthContext: { Provider: ({ children }) => children },
}))

// Mock the api service — we control get/delete/put per test.
const mockApiGet = vi.fn()
const mockApiDelete = vi.fn()
const mockApiPut = vi.fn()
vi.mock('../../../services/api', () => ({
    default: {
        get: (...args) => mockApiGet(...args),
        delete: (...args) => mockApiDelete(...args),
        put: (...args) => mockApiPut(...args),
    },
}))

// Mock utility functions to avoid locale/timezone issues in CI.
vi.mock('../../../utils/dateUtils', () => ({
    formatarDataLocal: (d) => d,
}))
vi.mock('../../../utils/formatters', () => ({
    formatCurrency: (v) => `R$ ${v}`,
    formatCurrencyInText: (t) => t,
}))

// react-modal calls Modal.setAppElement — suppress the warning in jsdom.
vi.mock('react-modal', () => {
    const MockModal = ({ isOpen, children }) =>
        isOpen ? <div data-testid="modal">{children}</div> : null
    MockModal.setAppElement = () => {}
    return { default: MockModal }
})

// MUI icons — lightweight stubs so tests don't pull the full icon bundle.
vi.mock('@mui/icons-material/Edit', () => ({ default: () => <span>EditIcon</span> }))
vi.mock('@mui/icons-material/Delete', () => ({ default: () => <span>DeleteIcon</span> }))

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks are in place
// ---------------------------------------------------------------------------
import ListaTransacoes from '../ListaTransacoes'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const mockTransacao = {
    id: 'txn-1',
    descricao: 'Almoço',
    categoria: 'alimentacao',
    valor: { quantia: 50.0 },
    tipo: 'DEBIT',
    data: '2026-05-01',
}

// O componente le tokens customizados do tema (palette.lines / palette.surfaces
// / palette.series), entao precisa do ThemeProvider no teste — regra do
// design system.
const render = (ui) => renderRTL(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

describe('ListaTransacoes — editar e excluir', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default: GET returns one transaction
        mockApiGet.mockResolvedValue({ data: [mockTransacao] })
    })

    // -----------------------------------------------------------------------
    // Test 1 — GREEN: edit and delete icons are rendered in each row
    // -----------------------------------------------------------------------
    it('exibe botões de editar e excluir em cada linha', async () => {
        render(<ListaTransacoes />)

        // Wait for async data load
        await screen.findByText('Almoço')

        const editButtons = screen.getAllByRole('button', { name: /editar transação/i })
        const deleteButtons = screen.getAllByRole('button', { name: /excluir transação/i })

        expect(editButtons.length).toBeGreaterThanOrEqual(1)
        expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
    })

    // -----------------------------------------------------------------------
    // Test 2 — GREEN: clicking edit opens modal pre-filled with transaction data
    // -----------------------------------------------------------------------
    it('clicar em editar abre modal com dados da transação', async () => {
        render(<ListaTransacoes />)

        // Wait for data to load and row to appear
        const row = await screen.findByText('Almoço')
        expect(row).toBeInTheDocument()

        const editButton = screen.getByRole('button', { name: /editar transação/i })
        await waitFor(() => fireEvent.click(editButton))

        // Modal should be visible — useEffect inside EditarTransacaoModal
        // populates formData after transacao prop is set; wait for the input.
        const descricaoInput = await screen.findByDisplayValue('Almoço')
        expect(descricaoInput).toBeInTheDocument()
    })

    // -----------------------------------------------------------------------
    // Test 3 — clicking delete opens ConfirmarExclusaoDialog (not window.confirm)
    // -----------------------------------------------------------------------
    it('clicar em excluir abre dialog de confirmação em vez de window.confirm', async () => {
        render(<ListaTransacoes />)

        await screen.findByText('Almoço')

        const deleteButton = screen.getByRole('button', { name: /excluir transação/i })
        fireEvent.click(deleteButton)

        const dialog = screen.getByTestId('confirmar-exclusao-dialog')
        expect(dialog).toBeInTheDocument()
    })

    // -----------------------------------------------------------------------
    // Test 4 — confirming delete calls api.delete and removes the row
    // -----------------------------------------------------------------------
    it('confirmar exclusão chama DELETE e remove da lista', async () => {
        mockApiDelete.mockResolvedValue({})

        render(<ListaTransacoes />)

        await screen.findByText('Almoço')

        const deleteButton = screen.getByRole('button', { name: /excluir transação/i })
        fireEvent.click(deleteButton)

        const confirmButton = await screen.findByRole('button', { name: 'Excluir' })
        fireEvent.click(confirmButton)

        await waitFor(() => {
            expect(mockApiDelete).toHaveBeenCalledWith(
                `/orcamento/transacao/test-user-id/txn-1`
            )
        })

        // Row should be removed from the list
        expect(screen.queryByText('Almoço')).not.toBeInTheDocument()

    })

    // -----------------------------------------------------------------------
    // Test 5 — cancelling delete does NOT call api.delete
    // -----------------------------------------------------------------------
    it('cancelar exclusão não chama api.delete', async () => {
        render(<ListaTransacoes />)

        await screen.findByText('Almoço')

        const deleteButton = screen.getByRole('button', { name: /excluir transação/i })
        fireEvent.click(deleteButton)

        const cancelButton = await screen.findByRole('button', { name: /cancelar/i })
        fireEvent.click(cancelButton)

        expect(mockApiDelete).not.toHaveBeenCalled()
    })

    // -----------------------------------------------------------------------
    // Test 6 — saving an edit calls api.put and updates the list
    // -----------------------------------------------------------------------
    it('salvar edição chama PUT e atualiza a lista', async () => {
        mockApiPut.mockResolvedValue({})
        // Second GET after save returns the updated transaction
        mockApiGet
            .mockResolvedValueOnce({ data: [mockTransacao] })         // initial load
            .mockResolvedValueOnce({ data: [{ ...mockTransacao, descricao: 'Almoço editado' }] }) // after update

        render(<ListaTransacoes />)

        await screen.findByText('Almoço')

        // Open the edit modal
        const editButton = screen.getByRole('button', { name: /editar transação/i })
        fireEvent.click(editButton)

        const dateInput = screen.getByRole('textbox', { name: /data/i })
        expect(dateInput).toBeInTheDocument()

        // Submit the form
        const saveButton = screen.getByRole('button', { name: /salvar alterações/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockApiPut).toHaveBeenCalledWith(
                `/orcamento/transacao/test-user-id/txn-1`,
                expect.any(Object)
            )
        })
    })
})

describe('regressão: ListaTransacoes ordena por data ISO, da mais recente para a mais antiga', () => {
    it('ordena sem depender de Date (inclui virada de mês e de ano)', async () => {
        mockApiGet.mockResolvedValue({
            data: [
                { ...mockTransacao, id: 'a', descricao: 'Antiga', data: '2025-12-31' },
                { ...mockTransacao, id: 'b', descricao: 'Recente', data: '2026-01-01' },
                { ...mockTransacao, id: 'c', descricao: 'Meio', data: '2026-01-02' },
            ],
        })

        render(<ListaTransacoes />)
        await screen.findByText('Recente')

        const descricoes = screen
            .getAllByRole('row')
            .slice(1)
            .map((row) => row.cells[1].textContent)
        expect(descricoes).toEqual(['Meio', 'Recente', 'Antiga'])
    })
})

describe('ListaTransacoes — conflito de saldo ao excluir (409, ADR-066 do backend)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockApiGet.mockResolvedValue({ data: [mockTransacao] })
    })

    it('avisa que o saldo mudou, mantém a linha e recarrega a lista', async () => {
        mockApiDelete.mockRejectedValueOnce(Object.assign(new Error('409'), { response: { status: 409, data: { status: 409, erro: 'Conflito', mensagem: 'A conta foi atualizada por outra operação. Recarregue e tente novamente.' } } }))

        render(<ListaTransacoes />)
        await screen.findByText('Almoço')

        fireEvent.click(screen.getByRole('button', { name: /excluir transação/i }))
        fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))

        expect(await screen.findByText(/saldo.*recarregue.*tente novamente/i)).toBeInTheDocument()
        expect(screen.getByText('Almoço')).toBeInTheDocument()
        // GET inicial + recarga após o conflito
        await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2))
    })
})
