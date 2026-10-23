import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import theme from '@/theme';
import BenchmarkJanelasPanel from '../BenchmarkJanelasPanel';

// --- MOCK: investimentoService ---
vi.mock('../../../services/investimentoService', () => ({
  investimentoService: {
    getBenchmarkJanelas: vi.fn(),
  },
}));

import { investimentoService } from '../../../services/investimentoService';

// Monta uma série de 12 pontos cronológicos (jul/2025 em diante).
function montarSerie(valores) {
  return valores.map((v, i) => ({
    ano: 2025 + Math.floor((6 + i) / 12),
    mes: ((6 + i) % 12) + 1,
    valor: v,
  }));
}

const dadosCompletos = {
  janelas: [
    {
      janela: 'MES',
      carteira: 3.0,
      cdi: 0.83,
      ibov: 0.64,
      ipca: 0.39,
      alphaCdi: 2.17,
      alphaIbov: 2.36,
      alphaIpca: 2.61,
      superouCdi: true,
      superouIbov: true,
      superouIpca: true,
    },
    {
      janela: 'ANO',
      carteira: 5.0,
      cdi: 7.5,
      ibov: 4.0,
      ipca: 2.0,
      alphaCdi: -2.5,
      alphaIbov: 1.0,
      alphaIpca: 3.0,
      superouCdi: false,
      superouIbov: true,
      superouIpca: true,
    },
    {
      janela: 'DOZE_MESES',
      carteira: 11.0,
      cdi: 10.5,
      ibov: 8.0,
      ipca: 4.8,
      alphaCdi: 0.5,
      alphaIbov: 3.0,
      alphaIpca: 6.2,
      superouCdi: true,
      superouIbov: true,
      superouIpca: true,
    },
    {
      janela: 'DESDE_INICIO',
      carteira: 25.0,
      cdi: 20.0,
      ibov: 15.0,
      ipca: 9.0,
      alphaCdi: 5.0,
      alphaIbov: 10.0,
      alphaIpca: 16.0,
      superouCdi: true,
      superouIbov: true,
      superouIpca: true,
    },
  ],
  serieCarteira: montarSerie([1.5, 2.0, 2.2, 2.8, 3.0, 3.1, 3.3, 3.0, 3.4, 3.6, 3.8, 4.0]),
  serieCdi: montarSerie([0.8, 0.82, 0.83, 0.84, 0.83, 0.82, 0.83, 0.84, 0.85, 0.84, 0.83, 0.83]),
  serieIbov: montarSerie([0.6, 0.7, 0.64, 0.5, 0.8, 0.9, 0.4, 0.64, 0.7, 0.6, 0.55, 0.64]),
  serieIpca: montarSerie([0.4, 0.39, 0.41, 0.38, 0.39, 0.4, 0.42, 0.39, 0.38, 0.4, 0.41, 0.39]),
};

const dadosVazios = {
  janelas: [],
  serieCarteira: [],
  serieCdi: [],
  serieIbov: [],
  serieIpca: [],
};

const renderPanel = () =>
  render(
    <ThemeProvider theme={theme}>
      <BenchmarkJanelasPanel />
    </ThemeProvider>,
  );

// rgb equivalentes dos tokens Pondero (success #76A968 / error #C76562)
const RGB_SUCCESS = 'rgb(118, 169, 104)';
const RGB_ERROR = 'rgb(217, 128, 125)'; // negText do escuro (#D9807D)

describe('BenchmarkJanelasPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama o service no carregamento e renderiza a janela inicial (Mês)', async () => {
    investimentoService.getBenchmarkJanelas.mockResolvedValue(dadosCompletos);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('benchmark-janelas')).toBeInTheDocument();
    });

    expect(investimentoService.getBenchmarkJanelas).toHaveBeenCalledTimes(1);

    // Janela MES: carteira 3,00% no resumo
    const resumo = screen.getByTestId('benchmark-resumo-carteira');
    expect(within(resumo).getByText(/3,00%/)).toBeInTheDocument();

    // Todas as janelas disponíveis aparecem no seletor
    expect(screen.getByTestId('janela-MES')).toBeInTheDocument();
    expect(screen.getByTestId('janela-ANO')).toBeInTheDocument();
    expect(screen.getByTestId('janela-DOZE_MESES')).toBeInTheDocument();
    expect(screen.getByTestId('janela-DESDE_INICIO')).toBeInTheDocument();
  });

  it('troca de janela altera os números exibidos', async () => {
    investimentoService.getBenchmarkJanelas.mockResolvedValue(dadosCompletos);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('benchmark-janelas')).toBeInTheDocument();
    });

    // MES → carteira 3,00%
    let resumo = screen.getByTestId('benchmark-resumo-carteira');
    expect(within(resumo).getByText(/3,00%/)).toBeInTheDocument();

    // Seleciona "Desde o início" → carteira 25,00%
    fireEvent.click(screen.getByTestId('janela-DESDE_INICIO'));

    resumo = screen.getByTestId('benchmark-resumo-carteira');
    expect(within(resumo).getByText(/25,00%/)).toBeInTheDocument();
    // valor anterior não está mais visível
    expect(within(resumo).queryByText(/3,00%/)).not.toBeInTheDocument();

    // alpha vs CDI muda para +5,00%
    const cardCdi = screen.getByTestId('alpha-card-CDI-valor');
    expect(cardCdi).toHaveTextContent(/\+5,00%/);
  });

  it('colore alpha de OUTperformance em success e UNDERperformance em error', async () => {
    investimentoService.getBenchmarkJanelas.mockResolvedValue(dadosCompletos);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('benchmark-janelas')).toBeInTheDocument();
    });

    // Na janela ANO: superouCdi=false (error), superouIbov=true (success)
    fireEvent.click(screen.getByTestId('janela-ANO'));

    const cdi = screen.getByTestId('alpha-card-CDI-valor');
    expect(cdi).toHaveTextContent(/-2,50%/);
    expect(cdi).toHaveStyle({ color: RGB_ERROR });
    // seta de baixa no card de underperformance
    expect(screen.getByTestId('alpha-card-CDI-seta')).toBeInTheDocument();

    const ibov = screen.getByTestId('alpha-card-IBOV-valor');
    expect(ibov).toHaveTextContent(/\+1,00%/);
    expect(ibov).toHaveStyle({ color: RGB_SUCCESS });
  });

  it('alpha usa fonte monoespaçada', async () => {
    investimentoService.getBenchmarkJanelas.mockResolvedValue(dadosCompletos);

    renderPanel();

    const cdi = await screen.findByTestId('alpha-card-CDI-valor');
    expect(cdi).toHaveStyle({ fontFamily: theme.typography.fontFamilyMono });
  });

  it('renderiza o gráfico multi-série com as 4 séries sobrepostas + legenda', async () => {
    investimentoService.getBenchmarkJanelas.mockResolvedValue(dadosCompletos);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('benchmark-grafico-chart')).toBeInTheDocument();
    });

    // svg presente
    const chart = screen.getByTestId('benchmark-grafico-chart');
    expect(chart.querySelector('svg')).toBeInTheDocument();

    // 4 linhas (paths) — uma por série
    expect(screen.getByTestId('benchmark-serie-carteira')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-serie-cdi')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-serie-ibov')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-serie-ipca')).toBeInTheDocument();

    // legenda associa cor ↔ série
    const legenda = screen.getByTestId('benchmark-legenda');
    expect(within(legenda).getByText('Carteira')).toBeInTheDocument();
    expect(within(legenda).getByText('CDI')).toBeInTheDocument();
    expect(within(legenda).getByText('IBOV')).toBeInTheDocument();
    expect(within(legenda).getByText('IPCA')).toBeInTheDocument();
  });

  it('exibe estado vazio quando não há janelas nem série de carteira', async () => {
    investimentoService.getBenchmarkJanelas.mockResolvedValue(dadosVazios);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('benchmark-janelas-empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/ainda não tem histórico/i)).toBeInTheDocument();
    // sem gráfico no estado vazio
    expect(screen.queryByTestId('benchmark-grafico-chart')).not.toBeInTheDocument();
  });

  it('exibe mensagem de erro quando o service falha', async () => {
    investimentoService.getBenchmarkJanelas.mockRejectedValue(new Error('boom'));

    renderPanel();

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar a comparação vs benchmarks.'),
      ).toBeInTheDocument();
    });
  });

  it('exibe loading enquanto carrega', () => {
    investimentoService.getBenchmarkJanelas.mockReturnValue(new Promise(() => {}));

    renderPanel();

    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
