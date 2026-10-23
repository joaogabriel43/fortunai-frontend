import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import theme from '@/theme';
import RentabilidadePanel from '../RentabilidadePanel';

// --- MOCK: investimentoService ---
vi.mock('../../../services/investimentoService', () => ({
  investimentoService: {
    getRentabilidade: vi.fn(),
  },
}));

import { investimentoService } from '../../../services/investimentoService';

// Monta uma série de evolução com 12 pontos cronológicos.
function montarEvolucao(valores) {
  return valores.map((v, i) => ({
    ano: 2025,
    mes: ((6 + i) % 12) + 1, // começa em jul/2025, rola adiante
    rentabilidadePercentual: v,
  }));
}

const renderPanel = () =>
  render(
    <ThemeProvider theme={theme}>
      <RentabilidadePanel />
    </ThemeProvider>,
  );

// Cenário de LUCRO
const dadosLucro = {
  valorInvestidoTotal: 3000.0,
  valorAtualTotal: 3600.0,
  ganhoAbsolutoTotal: 600.0,
  ganhoPercentualTotal: 20.0,
  proventosTotal: 50.0,
  retornoTotalAbsoluto: 650.0,
  retornoTotalPercentual: 21.6667,
  ativos: [
    {
      ticker: 'PETR4',
      quantidade: 100,
      precoMedio: 30.0,
      precoAtual: 36.0,
      valorInvestido: 3000.0,
      valorAtual: 3600.0,
      ganhoAbsoluto: 600.0,
      ganhoPercentual: 20.0,
      proventosRecebidos: 50.0,
      retornoTotalAbsoluto: 650.0,
      retornoTotalPercentual: 21.6667,
    },
  ],
  evolucao: montarEvolucao([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20]),
};

// Cenário de PREJUÍZO
const dadosPrejuizo = {
  valorInvestidoTotal: 3000.0,
  valorAtualTotal: 2400.0,
  ganhoAbsolutoTotal: -600.0,
  ganhoPercentualTotal: -20.0,
  proventosTotal: 50.0,
  retornoTotalAbsoluto: -550.0,
  retornoTotalPercentual: -18.3333,
  ativos: [
    {
      ticker: 'MGLU3',
      quantidade: 200,
      precoMedio: 15.0,
      precoAtual: 12.0,
      valorInvestido: 3000.0,
      valorAtual: 2400.0,
      ganhoAbsoluto: -600.0,
      ganhoPercentual: -20.0,
      proventosRecebidos: 50.0,
      retornoTotalAbsoluto: -550.0,
      retornoTotalPercentual: -18.3333,
    },
  ],
  evolucao: montarEvolucao([0, -2, -3, -5, -6, -8, -10, -12, -14, -16, -17, -18.3333]),
};

const dadosVazios = {
  valorInvestidoTotal: 0,
  valorAtualTotal: 0,
  ganhoAbsolutoTotal: 0,
  ganhoPercentualTotal: 0,
  proventosTotal: 0,
  retornoTotalAbsoluto: 0,
  retornoTotalPercentual: 0,
  ativos: [],
  evolucao: [],
};

// rgb equivalentes dos tokens Pondero (success #76A968 / error #C76562)
const RGB_SUCCESS = 'rgb(118, 169, 104)';
const RGB_ERROR = 'rgb(217, 128, 125)'; // negText do escuro (#D9807D)

describe('RentabilidadePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama o service no carregamento e renderiza os cards consolidados', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosLucro);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Valor investido')).toBeInTheDocument();
    });

    expect(investimentoService.getRentabilidade).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Valor atual')).toBeInTheDocument();
    // "Retorno total" aparece como label do card e header da tabela —
    // valida o card consolidado especificamente.
    const cardRetorno = screen.getByTestId('card-retorno-total');
    expect(within(cardRetorno).getByText('Retorno total')).toBeInTheDocument();
    // Retorno total deixa explícito que inclui proventos
    expect(within(cardRetorno).getByText(/inclui proventos/i)).toBeInTheDocument();
  });

  it('renderiza ganho com cor de sucesso (lucro) e formatação BRL + mono', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosLucro);

    renderPanel();

    const card = await screen.findByTestId('card-ganho-total');
    // valor R$ 600,00 colorido em success e com fonte mono
    const valor = within(card).getByText(/R\$\s?600,00/);
    expect(valor).toBeInTheDocument();
    expect(valor).toHaveStyle({ fontFamily: theme.typography.fontFamilyMono });
    expect(valor).toHaveStyle({ color: RGB_SUCCESS });
    // seta de tendência de alta presente
    expect(within(card).getByTestId('card-ganho-total-seta')).toBeInTheDocument();
  });

  it('renderiza ganho com cor de erro (prejuízo) e seta de baixa', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosPrejuizo);

    renderPanel();

    const card = await screen.findByTestId('card-ganho-total');
    const valor = within(card).getByText(/-R\$\s?600,00/);
    expect(valor).toBeInTheDocument();
    expect(valor).toHaveStyle({ color: RGB_ERROR });
    expect(within(card).getByTestId('card-ganho-total-seta')).toBeInTheDocument();
  });

  it('colore o ganho por ativo conforme o sinal (lucro = success)', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosLucro);

    renderPanel();

    const linha = await screen.findByTestId('rentabilidade-ativo-PETR4');
    expect(within(linha).getByText('PETR4')).toBeInTheDocument();
    // preço médio formatado BRL
    expect(within(linha).getByText(/R\$\s?30,00/)).toBeInTheDocument();
    // ganho colorido em success
    const ganho = within(linha).getByText(/R\$\s?600,00/);
    expect(ganho).toHaveStyle({ color: RGB_SUCCESS });
  });

  it('colore o ganho por ativo conforme o sinal (prejuízo = error)', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosPrejuizo);

    renderPanel();

    const linha = await screen.findByTestId('rentabilidade-ativo-MGLU3');
    const ganho = within(linha).getByText(/-R\$\s?600,00/);
    expect(ganho).toHaveStyle({ color: RGB_ERROR });
  });

  it('renderiza o gráfico de evolução temporal (linha)', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosLucro);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('rentabilidade-evolucao-chart')).toBeInTheDocument();
    });

    // o Sparkline renderiza um <svg> com uma path de linha
    const chart = screen.getByTestId('rentabilidade-evolucao-chart');
    expect(chart.querySelector('svg')).toBeInTheDocument();
    expect(chart.querySelector('path')).toBeInTheDocument();
  });

  it('exibe o estado vazio quando a carteira não tem ativos', async () => {
    investimentoService.getRentabilidade.mockResolvedValue(dadosVazios);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('rentabilidade-empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/ainda não tem ativos/i)).toBeInTheDocument();
    // não renderiza o gráfico no estado vazio
    expect(screen.queryByTestId('rentabilidade-evolucao-chart')).not.toBeInTheDocument();
  });

  it('exibe mensagem de erro quando o service falha', async () => {
    investimentoService.getRentabilidade.mockRejectedValue(new Error('boom'));

    renderPanel();

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar a rentabilidade da carteira.'),
      ).toBeInTheDocument();
    });
  });
});
