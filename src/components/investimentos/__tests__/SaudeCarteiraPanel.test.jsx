import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import theme, { createAppTheme } from '@/theme';
import SaudeCarteiraPanel from '../SaudeCarteiraPanel';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../../services/investimentoService', () => ({
  investimentoService: {
    obterAlertas: vi.fn(),
    sugerirAporte: vi.fn(),
  },
}));

import { investimentoService } from '../../../services/investimentoService';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const saudeSemViolacoes = {
  alertas: [],
  scoreAderencia: 92,
  motivoScoreIndisponivel: null,
};

const saudeComAlertas = {
  alertas: [
    { dimensao: 'ATIVO', chave: 'PETR4', percentualReal: 35, limite: 20, excesso: 15 },
    { dimensao: 'CLASSE', chave: 'ACAO', percentualReal: 70, limite: 60, excesso: 10 },
    { dimensao: 'SETOR', chave: 'FINANCEIRO', percentualReal: 30, limite: 25, excesso: 5 },
    { dimensao: 'GEOGRAFIA', chave: 'BRASIL', percentualReal: 95, limite: 80, excesso: 15 },
  ],
  scoreAderencia: 45.4,
  motivoScoreIndisponivel: null,
};

const saudeSemScore = {
  alertas: [],
  scoreAderencia: null,
  motivoScoreIndisponivel: 'Nenhuma estratégia com alvo configurada.',
};

const sugestaoCompleta = {
  valorAporte: 1000,
  parcelas: [
    { classe: 'ACAO', valor: 600 },
    { classe: 'FUNDO_IMOBILIARIO', valor: 250 },
  ],
  valorNaoAlocavel: 150,
  motivoNaoAlocavel: 'Todas as classes restantes atingiram o teto configurado.',
  simulacao: [
    { classe: 'ACAO', percentualAntes: 40, percentualDepois: 45.5, percentualAlvo: 50 },
    { classe: 'FUNDO_IMOBILIARIO', percentualAntes: 60, percentualDepois: 54.5, percentualAlvo: null },
  ],
  disclaimer: 'Sugestão meramente informativa — não constitui recomendação de investimento.',
};

const renderPanel = (props = {}, appTheme = theme) =>
  render(
    <ThemeProvider theme={appTheme}>
      <SaudeCarteiraPanel {...props} />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  investimentoService.obterAlertas.mockResolvedValue(saudeComAlertas);
  investimentoService.sugerirAporte.mockResolvedValue(sugestaoCompleta);
});

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('SaudeCarteiraPanel — score de aderência', () => {
  it('renderiza o RingGauge com o valor arredondado quando o score existe', async () => {
    renderPanel();

    expect(await screen.findByTestId('score-aderencia-gauge')).toBeInTheDocument();
    expect(screen.getByTestId('score-aderencia-valor')).toHaveTextContent('45');
    expect(screen.queryByTestId('score-indisponivel')).not.toBeInTheDocument();
  });

  it('exibe o motivo no lugar do gauge quando o score é null', async () => {
    investimentoService.obterAlertas.mockResolvedValue(saudeSemScore);
    renderPanel();

    expect(await screen.findByTestId('score-indisponivel')).toBeInTheDocument();
    expect(
      screen.getByText('Nenhuma estratégia com alvo configurada.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('score-aderencia-gauge')).not.toBeInTheDocument();
  });

  it('recarrega os alertas quando o refreshKey muda (padrão da página)', async () => {
    const { rerender } = renderPanel({ refreshKey: 0 });
    await screen.findByTestId('score-aderencia-gauge');
    expect(investimentoService.obterAlertas).toHaveBeenCalledTimes(1);

    rerender(
      <ThemeProvider theme={theme}>
        <SaudeCarteiraPanel refreshKey={1} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(investimentoService.obterAlertas).toHaveBeenCalledTimes(2);
    });
  });
});

describe('SaudeCarteiraPanel — alertas de concentração', () => {
  describe('regressão: chip de dimensão usava warning.main como texto', () => {
    it('pinta o texto com statusText.warning (>= 4,5:1)', async () => {
      // No claro warning.main (#C78C3D) reprova como texto; o tema expõe CSS vars; statusText.warning resolve para warnText (#885F27 no claro, coberto em themeContrast).
      renderPanel({}, createAppTheme('light'));

      const chip = await screen.findByTestId('chip-dimensao-ATIVO-PETR4');
      expect(chip).toHaveStyle({ color: 'var(--fa-palette-statusText-warning)' });
    });
  });

  it('renderiza cada violação com chip da dimensão, real vs limite e excesso', async () => {
    renderPanel();

    const alertaAtivo = await screen.findByTestId('alerta-ATIVO-PETR4');
    // ATIVO: a chave é o ticker cru
    expect(within(alertaAtivo).getByText('PETR4')).toBeInTheDocument();
    expect(within(alertaAtivo).getByTestId('chip-dimensao-ATIVO-PETR4')).toHaveTextContent('Ativo');
    expect(within(alertaAtivo).getByText(/Real: 35,0% \/ Limite: 20,0%/)).toBeInTheDocument();
    expect(within(alertaAtivo).getByText(/\+15,0% acima/)).toBeInTheDocument();

    // Dimensões de enum usam os labels PT-BR da taxonomia
    expect(within(screen.getByTestId('alerta-CLASSE-ACAO')).getByText('Ação')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('alerta-SETOR-FINANCEIRO')).getByText('Financeiro'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('alerta-GEOGRAFIA-BRASIL')).getByText('Brasil'),
    ).toBeInTheDocument();

    // Chips das 4 dimensões com label PT-BR
    expect(screen.getByTestId('chip-dimensao-CLASSE-ACAO')).toHaveTextContent('Classe');
    expect(screen.getByTestId('chip-dimensao-SETOR-FINANCEIRO')).toHaveTextContent('Setor');
    expect(screen.getByTestId('chip-dimensao-GEOGRAFIA-BRASIL')).toHaveTextContent('Geografia');
  });

  it('exibe estado vazio amigável quando não há violações', async () => {
    investimentoService.obterAlertas.mockResolvedValue(saudeSemViolacoes);
    renderPanel();

    expect(await screen.findByTestId('alertas-vazio')).toBeInTheDocument();
    expect(
      screen.getByText(/nenhuma concentração acima dos seus limites/i),
    ).toBeInTheDocument();
  });

  it('exibe erro de API sem quebrar o painel', async () => {
    investimentoService.obterAlertas.mockRejectedValue(new Error('network down'));
    renderPanel();

    expect(
      await screen.findByText(/falha ao carregar a saúde da carteira/i),
    ).toBeInTheDocument();
  });
});

describe('SaudeCarteiraPanel — simulador de aporte', () => {
  const simularCom = async (valor) => {
    renderPanel();
    await screen.findByTestId('saude-carteira-panel');
    fireEvent.change(screen.getByTestId('input-valor-aporte'), { target: { value: valor } });
    fireEvent.click(screen.getByTestId('btn-simular-aporte'));
  };

  it('envia o POST com o valor numérico (aceita vírgula decimal PT-BR)', async () => {
    await simularCom('1000,50');

    await waitFor(() => {
      expect(investimentoService.sugerirAporte).toHaveBeenCalledWith(1000.5);
    });
  });

  it('bloqueia valores inválidos sem chamar a API (< 0,01 ou > 2 casas)', async () => {
    await simularCom('0');

    expect(
      await screen.findByText(/pelo menos r\$ 0,01, com no máximo 2 casas decimais/i),
    ).toBeInTheDocument();
    expect(investimentoService.sugerirAporte).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('input-valor-aporte'), {
      target: { value: '10,999' },
    });
    fireEvent.click(screen.getByTestId('btn-simular-aporte'));

    expect(investimentoService.sugerirAporte).not.toHaveBeenCalled();
  });

  it('renderiza as parcelas por classe com labels PT-BR e valores BRL', async () => {
    await simularCom('1000');

    const tabela = await screen.findByTestId('tabela-parcelas');
    const linhaAcao = within(tabela).getByTestId('parcela-ACAO');
    expect(within(linhaAcao).getByText('Ação')).toBeInTheDocument();
    expect(within(linhaAcao).getByText(/R\$\s*600,00/)).toBeInTheDocument();

    const linhaFii = within(tabela).getByTestId('parcela-FUNDO_IMOBILIARIO');
    expect(within(linhaFii).getByText('FII')).toBeInTheDocument();
    expect(within(linhaFii).getByText(/R\$\s*250,00/)).toBeInTheDocument();
  });

  it('destaca o valor não alocável com o motivo quando > 0', async () => {
    await simularCom('1000');

    const naoAlocavel = await screen.findByTestId('valor-nao-alocavel');
    expect(within(naoAlocavel).getByText(/R\$\s*150,00/)).toBeInTheDocument();
    expect(
      within(naoAlocavel).getByText(/todas as classes restantes atingiram o teto/i),
    ).toBeInTheDocument();
  });

  it('oculta o bloco de não alocável quando valorNaoAlocavel = 0', async () => {
    investimentoService.sugerirAporte.mockResolvedValue({
      ...sugestaoCompleta,
      valorNaoAlocavel: 0,
      motivoNaoAlocavel: null,
    });
    await simularCom('1000');

    await screen.findByTestId('tabela-parcelas');
    expect(screen.queryByTestId('valor-nao-alocavel')).not.toBeInTheDocument();
  });

  it('exibe a comparação antes/depois por classe com o alvo quando existir', async () => {
    await simularCom('1000');

    const simAcao = await screen.findByTestId('simulacao-ACAO');
    expect(within(simAcao).getByText('40,0%')).toBeInTheDocument();
    expect(within(simAcao).getByText('45,5%')).toBeInTheDocument();
    expect(within(simAcao).getByText(/alvo: 50,0%/)).toBeInTheDocument();

    // Sem alvo configurado (null) não exibe a referência
    const simFii = screen.getByTestId('simulacao-FUNDO_IMOBILIARIO');
    expect(within(simFii).queryByText(/alvo:/)).not.toBeInTheDocument();
  });

  it('renderiza o disclaimer vindo da API (nunca hardcoded)', async () => {
    await simularCom('1000');

    const disclaimer = await screen.findByTestId('disclaimer-aporte');
    expect(disclaimer).toHaveTextContent(
      'Sugestão meramente informativa — não constitui recomendação de investimento.',
    );
  });

  it('trata o 400 "sem estratégia" com a mensagem do backend e CTA para configurar', async () => {
    const onConfigurarEstrategia = vi.fn();
    investimentoService.sugerirAporte.mockRejectedValue({
      response: {
        status: 400,
        data: { status: 400, message: 'Nenhuma estratégia de alocação configurada.' },
      },
    });
    renderPanel({ onConfigurarEstrategia });
    await screen.findByTestId('saude-carteira-panel');
    fireEvent.change(screen.getByTestId('input-valor-aporte'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('btn-simular-aporte'));

    const erro = await screen.findByTestId('erro-aporte');
    expect(erro).toHaveTextContent('Nenhuma estratégia de alocação configurada.');

    fireEvent.click(screen.getByTestId('cta-configurar-estrategia'));
    expect(onConfigurarEstrategia).toHaveBeenCalledTimes(1);
  });

  it('erro não-400 exibe mensagem de falha sem CTA', async () => {
    investimentoService.sugerirAporte.mockRejectedValue({
      response: { status: 500, data: {} },
    });
    await simularCom('500');

    const erro = await screen.findByTestId('erro-aporte');
    expect(erro).toHaveTextContent(/falha ao simular o aporte/i);
    expect(screen.queryByTestId('cta-configurar-estrategia')).not.toBeInTheDocument();
  });
});
