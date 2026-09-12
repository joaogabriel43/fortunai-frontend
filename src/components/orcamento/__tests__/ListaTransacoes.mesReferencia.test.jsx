import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as renderRTL, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks — hoisted antes dos imports que os referenciam.
// dateUtils NÃO é mockado aqui de propósito: o MesOrcamentoProvider ancora o
// mês corrente em `hojeLocal()` (America/Sao_Paulo), e o teste precisa do
// mesmo relógio que o contexto para montar as datas das transações.
// ---------------------------------------------------------------------------
vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'test-user-id' } }),
    AuthContext: { Provider: ({ children }) => children },
}))

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

vi.mock('../../../utils/formatters', () => ({
    formatCurrency: (v) => `R$ ${v}`,
    formatCurrencyInText: (t) => t,
}))

vi.mock('react-modal', () => {
    const MockModal = ({ isOpen, children }) =>
        isOpen ? <div data-testid="modal">{children}</div> : null
    MockModal.setAppElement = () => {}
    return { default: MockModal }
})

vi.mock('@mui/icons-material/Edit', () => ({ default: () => <span>EditIcon</span> }))
vi.mock('@mui/icons-material/Delete', () => ({ default: () => <span>DeleteIcon</span> }))

import ListaTransacoes from '../ListaTransacoes'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme'
import { MesOrcamentoProvider, useMesOrcamento } from '../../../contexts/MesOrcamentoContext'
import { hojeLocal } from '../../../utils/dateUtils'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const pad = (n) => String(n).padStart(2, '0')

// Mesmo relógio do contexto (America/Sao_Paulo), não o fuso de quem roda o teste.
const [anoHoje, mesHoje] = hojeLocal().split('-').map(Number)
const recuar = (delta) => {
    const total = anoHoje * 12 + (mesHoje - 1) - delta
    return { mes: (total % 12) + 1, ano: Math.floor(total / 12) }
}
const { mes: mesPassado, ano: anoPassado } = recuar(1)
const { mes: mesRetrasado, ano: anoRetrasado } = recuar(2)

const txAtual = {
    id: 'txn-atual',
    descricao: 'Almoço deste mês',
    categoria: 'alimentacao',
    valor: { quantia: 50.0 },
    tipo: 'DEBIT',
    data: `${anoHoje}-${pad(mesHoje)}-05`,
}

const txPassado = {
    id: 'txn-passado',
    descricao: 'Aluguel do mês passado',
    categoria: 'moradia',
    valor: { quantia: 1800.0 },
    tipo: 'DEBIT',
    data: `${anoPassado}-${pad(mesPassado)}-12`,
}

// Quem navega o mês na tela real é o SeletorMesOrcamento, acima das sub-abas;
// aqui dois botões mínimos cumprem o mesmo papel sobre o contexto.
const Navegador = () => {
    const { navegar } = useMesOrcamento()
    return (
        <>
            <button onClick={() => navegar(-1)}>voltar um mês</button>
            <button onClick={() => navegar(-1)}>voltar mais um mês</button>
        </>
    )
}

const renderComTema = (ui) => renderRTL(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

const arvoreComContexto = (ui) => (
    <ThemeProvider theme={theme}>
        <MesOrcamentoProvider>
            <Navegador />
            {ui}
        </MesOrcamentoProvider>
    </ThemeProvider>
)

const renderComContexto = (ui) => renderRTL(arvoreComContexto(ui))

describe('ListaTransacoes — mês de referência do MesOrcamentoContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockApiGet.mockResolvedValue({ data: [txAtual, txPassado] })
    })

    it('mostra apenas as transações do mês selecionado', async () => {
        renderComContexto(<ListaTransacoes />)

        expect(await screen.findByText('Almoço deste mês')).toBeInTheDocument()
        expect(screen.queryByText('Aluguel do mês passado')).not.toBeInTheDocument()
        expect(
            screen.getByText(`Transações — ${MESES[mesHoje - 1]} ${anoHoje}`),
        ).toBeInTheDocument()
    })

    it('trocar de mês recorta a mesma base em memória, sem novo GET', async () => {
        renderComContexto(<ListaTransacoes />)
        await screen.findByText('Almoço deste mês')
        expect(mockApiGet).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByText('voltar um mês'))

        expect(await screen.findByText('Aluguel do mês passado')).toBeInTheDocument()
        expect(screen.queryByText('Almoço deste mês')).not.toBeInTheDocument()
        expect(
            screen.getByText(`Transações — ${MESES[mesPassado - 1]} ${anoPassado}`),
        ).toBeInTheDocument()

        // O endpoint devolve a base inteira e não aceita mes/ano: o recorte é
        // client-side, então navegar não pode disparar uma segunda busca.
        expect(mockApiGet).toHaveBeenCalledTimes(1)
    })

    it('mês sem transações mostra mensagem vazia nomeando o mês', async () => {
        renderComContexto(<ListaTransacoes />)
        await screen.findByText('Almoço deste mês')

        fireEvent.click(screen.getByText('voltar um mês'))
        await screen.findByText('Aluguel do mês passado')
        fireEvent.click(screen.getByText('voltar mais um mês'))

        const rotuloMes = `${MESES[mesRetrasado - 1].toLowerCase()} de ${anoRetrasado}`
        expect(
            await screen.findByText(`Nenhuma transação em ${rotuloMes}.`),
        ).toBeInTheDocument()
    })

    it('fora da página de Orçamento (sem provider) continua listando tudo', async () => {
        renderComTema(<ListaTransacoes />)

        expect(await screen.findByText('Almoço deste mês')).toBeInTheDocument()
        expect(screen.getByText('Aluguel do mês passado')).toBeInTheDocument()
        expect(screen.getByText('Últimas Transações')).toBeInTheDocument()
    })

    it('mantém as linhas do mês na tela durante o refetch', async () => {
        const { rerender } = renderComContexto(<ListaTransacoes refreshKey={0} />)
        await screen.findByText('Almoço deste mês')

        let resolverSegundaBusca
        mockApiGet.mockImplementationOnce(
            () => new Promise((resolve) => { resolverSegundaBusca = resolve }),
        )

        // Um refreshKey novo refaz a busca; a tabela não pode virar "Carregando...".
        rerender(arvoreComContexto(<ListaTransacoes refreshKey={1} />))

        expect(screen.queryByText(/carregando transações/i)).not.toBeInTheDocument()
        expect(screen.getByText('Almoço deste mês')).toBeInTheDocument()
        expect(screen.getByRole('table').closest('[aria-busy]'))
            .toHaveAttribute('aria-busy', 'true')

        resolverSegundaBusca({ data: [txAtual, txPassado] })
        await waitFor(() =>
            expect(screen.getByRole('table').closest('[aria-busy]'))
                .toHaveAttribute('aria-busy', 'false'),
        )
    })
})
