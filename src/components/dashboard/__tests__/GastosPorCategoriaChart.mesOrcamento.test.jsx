import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GastosPorCategoriaChart from '../GastosPorCategoriaChart'
import { MesOrcamentoProvider, useMesOrcamento } from '../../../contexts/MesOrcamentoContext'
import { hojeLocal } from '../../../utils/dateUtils'
import theme from '../../../theme'

const { mockUser } = vi.hoisted(() => ({ mockUser: { id: 'user-123' } }))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ data, children }) => (
    <div data-testid="pie-data">
      {data.map(({ name, value }) => <span key={name}>{`${name}:${value}`}</span>)}
      {children}
    </div>
  ),
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

import api from '../../../services/api'

const [anoAtual, mesAtual] = hojeLocal().split('-').map(Number)
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function deslocarMes(delta) {
  const total = anoAtual * 12 + (mesAtual - 1) + delta
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 }
}

function dataDoMes(delta) {
  const { ano, mes } = deslocarMes(delta)
  return `${ano}-${String(mes).padStart(2, '0')}-10`
}

const transacoesDeTresMeses = [
  { id: 'atual', data: dataDoMes(0), tipo: 'DEBIT', categoria: 'alimentacao', valor: 100 },
  { id: 'credito', data: dataDoMes(0), tipo: 'CREDIT', categoria: 'salario', valor: 9999 },
  { id: 'anterior', data: dataDoMes(-1), tipo: 'debit', categoria: 'transporte', valor: 200 },
  { id: 'antiga', data: dataDoMes(-2), tipo: 'DEBIT', categoria: 'moradia', valor: 300 },
]

const Navegador = () => {
  const { navegar } = useMesOrcamento()
  return <button onClick={() => navegar(-1)}>mês anterior</button>
}

const renderMensal = () => render(
  <ThemeProvider theme={theme}>
    <MesOrcamentoProvider>
      <Navegador />
      <GastosPorCategoriaChart />
    </MesOrcamentoProvider>
  </ThemeProvider>,
)

function deferred() {
  let resolve
  const promise = new Promise((resolver) => { resolve = resolver })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockImplementation((url) => {
    if (url === '/orcamento/categorias-gerenciadas') return Promise.resolve({ data: [] })
    if (url === '/orcamento/transacoes/user-123') return Promise.resolve({ data: transacoesDeTresMeses })
    if (url === '/orcamento/analise-historica/user-123') return Promise.resolve({ data: { lazer: 450 } })
    return Promise.resolve({ data: [] })
  })
})

describe('GastosPorCategoriaChart com mês de referência', () => {
  it('refaz a consulta e troca os dados ao navegar por três meses', async () => {
    renderMensal()

    expect(await screen.findByText('Alimentacao:100')).toBeInTheDocument()
    expect(screen.getByText(`Despesas por Categoria — ${MESES[mesAtual - 1]} ${anoAtual}`)).toBeInTheDocument()
    expect(screen.queryByText('Salario:9999')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('mês anterior'))
    const mesAnterior = deslocarMes(-1)
    expect(await screen.findByText('Transporte:200')).toBeInTheDocument()
    expect(screen.getByText(`Despesas por Categoria — ${MESES[mesAnterior.mes - 1]} ${mesAnterior.ano}`)).toBeInTheDocument()
    expect(screen.queryByText('Alimentacao:100')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('mês anterior'))
    const mesAntigo = deslocarMes(-2)
    expect(await screen.findByText('Moradia:300')).toBeInTheDocument()
    expect(screen.getByText(`Despesas por Categoria — ${MESES[mesAntigo.mes - 1]} ${mesAntigo.ano}`)).toBeInTheDocument()
    expect(screen.queryByText('Transporte:200')).not.toBeInTheDocument()

    const chamadasMensais = api.get.mock.calls.filter(([url]) => url === '/orcamento/transacoes/user-123')
    expect(chamadasMensais).toHaveLength(3)
  })

  it('ignora a resposta obsoleta quando o usuário troca de mês rapidamente', async () => {
    const requisicaoAtual = deferred()
    const requisicaoAnterior = deferred()
    let indiceRequisicao = 0
    api.get.mockImplementation((url) => {
      if (url === '/orcamento/categorias-gerenciadas') return Promise.resolve({ data: [] })
      if (url === '/orcamento/transacoes/user-123') {
        return [requisicaoAtual.promise, requisicaoAnterior.promise][indiceRequisicao++]
      }
      return Promise.resolve({ data: [] })
    })

    renderMensal()
    fireEvent.click(screen.getByText('mês anterior'))

    await act(async () => {
      requisicaoAnterior.resolve({ data: transacoesDeTresMeses })
    })
    expect(await screen.findByText('Transporte:200')).toBeInTheDocument()

    await act(async () => {
      requisicaoAtual.resolve({ data: transacoesDeTresMeses })
    })
    expect(screen.getByText('Transporte:200')).toBeInTheDocument()
    expect(screen.queryByText('Alimentacao:100')).not.toBeInTheDocument()
  })

  it('identifica o mês selecionado no estado vazio', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/orcamento/categorias-gerenciadas') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })

    renderMensal()

    expect(await screen.findByText(
      `Não há despesas em ${MESES[mesAtual - 1].toLowerCase()} de ${anoAtual} para exibir.`,
    )).toBeInTheDocument()
  })

  it('mantém a fonte e os textos históricos quando renderizado fora do contexto', async () => {
    render(
      <ThemeProvider theme={theme}>
        <GastosPorCategoriaChart />
      </ThemeProvider>,
    )

    expect(await screen.findByText('Lazer:450')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/orcamento/analise-historica/user-123')
    expect(screen.getByText('Despesas por Categoria (Histórico Completo)')).toBeInTheDocument()
  })
})
