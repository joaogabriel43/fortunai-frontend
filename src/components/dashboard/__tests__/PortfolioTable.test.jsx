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

    const celulaQtd = async (t) =>
      (await screen.findByTestId(`portfolio-row-${t}`)).querySelectorAll('td')[2].textContent;

    expect(await celulaQtd('TESOURO')).toBe('0,25');
    expect(await celulaQtd('BEN')).toBe('1,5');
    expect(await celulaQtd('BTC')).toBe('0,00012345');
    expect(await celulaQtd('PETR4')).toBe('100');
  });
});
