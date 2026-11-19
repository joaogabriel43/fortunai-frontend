import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import theme from '@/theme';
import PortfolioTable from '../PortfolioTable';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Referência estável: um objeto novo a cada render dispararia o useCallback
// de fetch em loop (dep [user]) e a tabela nunca sairia do skeleton.
vi.mock('../../../contexts/AuthContext', () => {
  const user = { id: 'user-123' };
  return { useAuth: () => ({ user }) };
});

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../../services/api';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ativos = [
  {
    ticker: 'PETR4',
    tipoAtivo: 'ACAO',
    quantidade: 100,
    precoMedio: 32.5,
    totalAtual: 3400,
    lucroPrejuizo: 150,
    variacaoPercentual: 0.0461,
  },
];

const renderTable = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <PortfolioTable {...props} />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: ativos });
});

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('PortfolioTable — ações por linha', () => {
  it('exibe botões de editar, vender e remover quando os handlers são fornecidos', async () => {
    renderTable({
      onSellRequest: vi.fn(),
      onEditRequest: vi.fn(),
      onRemoveRequest: vi.fn(),
    });

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('editar PETR4')).toBeInTheDocument();
    expect(screen.getByLabelText('vender PETR4')).toBeInTheDocument();
    expect(screen.getByLabelText('remover PETR4')).toBeInTheDocument();
  });

  it('não exibe editar/remover quando os handlers não são fornecidos (retrocompatibilidade)', async () => {
    renderTable({ onSellRequest: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('editar PETR4')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('remover PETR4')).not.toBeInTheDocument();
    expect(screen.getByLabelText('vender PETR4')).toBeInTheDocument();
  });

  it('dispara os callbacks com o ativo da linha ao clicar em editar e remover', async () => {
    const onEditRequest = vi.fn();
    const onRemoveRequest = vi.fn();
    renderTable({ onEditRequest, onRemoveRequest });

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('editar PETR4'));
    expect(onEditRequest).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4', quantidade: 100 }));

    fireEvent.click(screen.getByLabelText('remover PETR4'));
    expect(onRemoveRequest).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4', precoMedio: 32.5 }));
  });

  it('formata valores monetários em BRL com a fonte mono do tema', async () => {
    renderTable();

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument();
    });

    // Preço médio formatado via formatBRL (R$ 32,50) com fontFamilyMono do tema D4
    const precoMedio = screen.getByText(/R\$\s?32,50/);
    expect(precoMedio).toBeInTheDocument();
    expect(precoMedio).toHaveStyle({ fontFamily: theme.typography.fontFamilyMono });
  });
});

describe('PortfolioTable — quantidade fracionária (V16, numeric 38,8)', () => {
  it('exibe 0,25 / 1,5 / 0,00012345 / 100 em pt-BR, sem arredondar para 0', async () => {
    api.get.mockResolvedValue({
      data: [
        { ticker: 'TESOURO', tipoAtivo: 'RENDA_FIXA', quantidade: 0.25, precoMedio: 100, totalAtual: 25, lucroPrejuizo: 0 },
        { ticker: 'BEN', tipoAtivo: 'ACAO', quantidade: 1.5, precoMedio: 10, totalAtual: 15, lucroPrejuizo: 0 },
        { ticker: 'BTC', tipoAtivo: 'CRIPTOMOEDA', quantidade: 0.00012345, precoMedio: 1, totalAtual: 1, lucroPrejuizo: 0 },
        { ticker: 'PETR4', tipoAtivo: 'ACAO', quantidade: 100, precoMedio: 1, totalAtual: 100, lucroPrejuizo: 0 },
      ],
    });
    renderTable();

    // Colunas da linha: ticker, qtd, ... (a coluna "Tipo" virou cabeçalho de grupo).
    const celulaQtd = async (t) =>
      (await screen.findByTestId(`portfolio-row-${t}`)).querySelectorAll('td')[1].textContent;

    expect(await celulaQtd('TESOURO')).toBe('0,25');
    expect(await celulaQtd('BEN')).toBe('1,5');
    expect(await celulaQtd('BTC')).toBe('0,00012345');
    expect(await celulaQtd('PETR4')).toBe('100');
  });
});

describe('PortfolioTable — agrupamento por tipo de ativo', () => {
  // Fora de ordem de propósito: a tela não pode depender da ordem da API.
  const carteira = [
    { ticker: 'BTC', tipoAtivo: 'CRIPTOMOEDA', quantidade: 0.01, precoMedio: 1, totalAtual: 900, lucroPrejuizo: 100 },
    { ticker: 'VALE3', tipoAtivo: 'ACAO', quantidade: 10, precoMedio: 1, totalAtual: 1200.1, lucroPrejuizo: -200.75 },
    { ticker: 'MISTERIO', tipoAtivo: 'TIPO_NOVO', quantidade: 1, precoMedio: 1, totalAtual: 10, lucroPrejuizo: 0 },
    { ticker: 'IVVB11', tipoAtivo: 'EXTERIOR', quantidade: 5, precoMedio: 1, totalAtual: 700, lucroPrejuizo: 20 },
    { ticker: 'PETR4', tipoAtivo: 'ACAO', quantidade: 100, precoMedio: 1, totalAtual: 3400.2, lucroPrejuizo: 150.25 },
    { ticker: 'HGLG11', tipoAtivo: 'FUNDO_IMOBILIARIO', quantidade: 3, precoMedio: 1, totalAtual: 480, lucroPrejuizo: 12 },
    { ticker: 'SEMTIPO', tipoAtivo: null, quantidade: 1, precoMedio: 1, totalAtual: 30, lucroPrejuizo: 0 },
    { ticker: 'ITUB4', tipoAtivo: 'ACAO', quantidade: 20, precoMedio: 1, totalAtual: 2000, lucroPrejuizo: 0 },
  ];

  const texto = (testId) => screen.getByTestId(testId).textContent.replace(/\s/g, ' ');
  const tickersDoGrupo = (tipo) =>
    [...screen.getByTestId(`portfolio-grupo-${tipo}`).querySelectorAll('[data-testid^="portfolio-row-"]')].map(
      (linha) => linha.dataset.testid.replace('portfolio-row-', ''),
    );

  const renderCarteira = async (dados = carteira) => {
    api.get.mockResolvedValue({ data: dados });
    renderTable();
    await screen.findByTestId(`portfolio-row-${dados[0].ticker}`);
  };

  it('mostra os grupos na ordem fixa, sem grupo vazio e com "Outros" por último', async () => {
    await renderCarteira();

    const grupos = [...document.querySelectorAll('[data-testid^="portfolio-grupo-"]')].map(
      (grupo) => grupo.dataset.testid.replace('portfolio-grupo-', ''),
    );
    // Não há ativo de RENDA_FIXA na carteira: o grupo não aparece.
    expect(grupos).toEqual(['ACAO', 'FUNDO_IMOBILIARIO', 'EXTERIOR', 'CRIPTOMOEDA', 'OUTROS']);
    expect(screen.getByRole('rowheader', { name: /Ações\s*3 ativos/ })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /FIIs\s*1 ativo$/ })).toBeInTheDocument();
  });

  it('ordena os ativos do grupo pelo valor atual, do maior para o menor', async () => {
    await renderCarteira();

    expect(tickersDoGrupo('ACAO')).toEqual(['PETR4', 'ITUB4', 'VALE3']);
  });

  it('ativo sem tipo ou de tipo desconhecido continua visível, em "Outros"', async () => {
    await renderCarteira();

    expect(tickersDoGrupo('OUTROS')).toEqual(['SEMTIPO', 'MISTERIO']);
  });

  it('subtotal do grupo soma valor atual e lucro dos ativos, com o valor exato', async () => {
    await renderCarteira();

    expect(texto('portfolio-subtotal-valor-ACAO')).toBe('R$ 6.600,30');
    expect(texto('portfolio-subtotal-lucro-ACAO')).toBe('-R$ 50,50');
    // O tema usa variáveis CSS: a cor resolvida é o token, não o hex.
    expect(screen.getByTestId('portfolio-subtotal-lucro-ACAO')).toHaveStyle({
      color: 'var(--fa-palette-statusText-negative)',
    });
    expect(texto('portfolio-subtotal-lucro-CRIPTOMOEDA')).toBe('R$ 100,00');
    expect(screen.getByTestId('portfolio-subtotal-lucro-CRIPTOMOEDA')).toHaveStyle({
      color: 'var(--fa-palette-statusText-positive)',
    });
  });

  it('subtotal não acumula erro de ponto flutuante (0,10 + 0,20 = 0,30)', async () => {
    await renderCarteira([
      { ticker: 'AAAA3', tipoAtivo: 'ACAO', quantidade: 1, precoMedio: 1, totalAtual: 0.1, lucroPrejuizo: 0.1 },
      { ticker: 'BBBB3', tipoAtivo: 'ACAO', quantidade: 1, precoMedio: 1, totalAtual: 0.2, lucroPrejuizo: 0.2 },
    ]);

    expect(texto('portfolio-subtotal-valor-ACAO')).toBe('R$ 0,30');
    expect(texto('portfolio-subtotal-lucro-ACAO')).toBe('R$ 0,30');
  });

  it('recolhe e expande um grupo sem afetar os outros nem o subtotal', async () => {
    await renderCarteira();

    const botao = screen.getByRole('button', { name: 'recolher Ações' });
    expect(botao).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(botao);

    expect(tickersDoGrupo('ACAO')).toEqual([]);
    expect(texto('portfolio-subtotal-valor-ACAO')).toBe('R$ 6.600,30');
    expect(screen.getByRole('button', { name: 'expandir Ações' })).toHaveAttribute('aria-expanded', 'false');
    expect(tickersDoGrupo('FUNDO_IMOBILIARIO')).toEqual(['HGLG11']);

    fireEvent.click(screen.getByRole('button', { name: 'expandir Ações' }));

    expect(tickersDoGrupo('ACAO')).toEqual(['PETR4', 'ITUB4', 'VALE3']);
  });
});
