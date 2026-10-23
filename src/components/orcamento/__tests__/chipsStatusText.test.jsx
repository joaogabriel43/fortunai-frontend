import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { describe, it, expect, vi } from 'vitest'
import { createAppTheme } from '../../../theme'
import SeletorMesOrcamento from '../SeletorMesOrcamento'
import RecorrenciasCard from '../RecorrenciasCard'
import OrcamentoLimitesCard from '../OrcamentoLimitesCard'
import { MesOrcamentoProvider } from '../../../contexts/MesOrcamentoContext'

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}))
import api from '../../../services/api'

// No claro warning.main/success.main/error.main reprovam como texto pequeno;
// chip outlined precisa ler statusText.* (borda continua em *.main).
const comTema = (ui) => render(<ThemeProvider theme={createAppTheme('light')}>{ui}</ThemeProvider>)
const chipDe = (texto) => screen.getByText(texto).closest('.MuiChip-root')

describe('regressão: chips outlined de status usavam *.main como texto', () => {
  it('SeletorMesOrcamento: "Mês atual" usa statusText.positive', () => {
    comTema(
      <MesOrcamentoProvider>
        <SeletorMesOrcamento />
      </MesOrcamentoProvider>
    )
    expect(chipDe('Mês atual')).toHaveStyle({ color: 'var(--fa-palette-statusText-positive)' })
  })

  it('RecorrenciasCard: confiança ALTA/MEDIA e "Valor subiu" usam statusText', () => {
    const base = {
      nome: 'Netflix', valorMedio: 45.9, frequencia: 'MENSAL', diaRecorrente: 15,
      proximaCobrancaEstimada: '2026-06-15', totalOcorrencias: 3,
    }
    comTema(
      <RecorrenciasCard
        recorrencias={[
          { ...base, confianca: 'ALTA', aumentouValor: true, valorAnterior: 30 },
          { ...base, nome: 'Spotify', confianca: 'MEDIA' },
        ]}
      />
    )
    expect(chipDe('Alta confiança')).toHaveStyle({ color: 'var(--fa-palette-statusText-positive)' })
    expect(chipDe('Média confiança')).toHaveStyle({ color: 'var(--fa-palette-statusText-warning)' })
    expect(chipDe('Valor subiu')).toHaveStyle({ color: 'var(--fa-palette-statusText-warning)' })
  })

  it('OrcamentoLimitesCard: chips OK/ATENCAO/ESTOURADO usam statusText', async () => {
    const item = (categoria, status) => ({
      categoria, limite: 100, gasto: 50, percentual: 50,
      projecaoFimDeMes: null, diaEstimadoEstouro: null, status,
    })
    api.get.mockResolvedValue({
      data: {
        itens: [item('A', 'OK'), item('B', 'ATENCAO'), item('C', 'ESTOURADO')],
        totalLimites: 300, totalGasto: 150,
      },
    })
    comTema(<OrcamentoLimitesCard />)
    await waitFor(() => expect(screen.getByText('Dentro do limite')).toBeInTheDocument())
    expect(chipDe('Dentro do limite')).toHaveStyle({ color: 'var(--fa-palette-statusText-positive)' })
    expect(chipDe('Atenção')).toHaveStyle({ color: 'var(--fa-palette-statusText-warning)' })
    expect(chipDe('Estourado')).toHaveStyle({ color: 'var(--fa-palette-statusText-negative)' })
  })
})
