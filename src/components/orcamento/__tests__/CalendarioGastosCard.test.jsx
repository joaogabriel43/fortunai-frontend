import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme';
import CalendarioGastosCard from '../CalendarioGastosCard';
import EntradasSaidasChart from '../EntradasSaidasChart';
import { MesOrcamentoProvider, useMesOrcamento } from '../../../contexts/MesOrcamentoContext';
import { hojeLocal } from '../../../utils/dateUtils';

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

import api from '../../../services/api';

const renderComTema = (el) => render(<ThemeProvider theme={theme}>{el}</ThemeProvider>);

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Quem navega o mês na tela real é o SeletorMesOrcamento, que fica acima das
// sub-abas; aqui um botão mínimo cumpre o mesmo papel sobre o contexto.
const Navegador = () => {
  const { navegar } = useMesOrcamento();
  return <button onClick={() => navegar(-1)}>ir para mês passado</button>;
};

const renderComNavegacao = (el) =>
  render(
    <ThemeProvider theme={theme}>
      <MesOrcamentoProvider>
        <Navegador />
        {el}
      </MesOrcamentoProvider>
    </ThemeProvider>,
  );

const calendarioJunho = {
  mes: 6, ano: 2026,
  dias: Array.from({ length: 30 }, (_, i) => ({
    dia: i + 1,
    totalDebito: i === 4 ? 150.0 : 0.0,
    totalCredito: i === 0 ? 2000.0 : 0.0,
  })),
  totalDebitos: 150.0, totalCreditos: 2000.0, maiorGastoDia: 150.0,
};

describe('CalendarioGastosCard (ADR-036)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: calendarioJunho });
  });

  it('renderiza a grade do mês com todos os dias e os totais', async () => {
    renderComTema(<CalendarioGastosCard />);

    expect(await screen.findByTestId('heatmap-calendario')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // último dia na grade
    expect(screen.getByText(/total do mês/i)).toBeInTheDocument();
  });

  it('busca o mês corrente quando não há MesOrcamentoProvider acima', async () => {
    renderComTema(<CalendarioGastosCard />);
    await screen.findByTestId('heatmap-calendario');

    const [anoHoje, mesHoje] = hojeLocal().split('-').map(Number);
    expect(api.get).toHaveBeenCalledWith('/orcamento/calendario', {
      params: { mes: mesHoje, ano: anoHoje },
    });
    expect(screen.getByText(`${MESES[mesHoje - 1]} ${anoHoje}`)).toBeInTheDocument();
  });

  it('navegar no contexto refaz a busca com o mês selecionado', async () => {
    renderComNavegacao(<CalendarioGastosCard />);
    await screen.findByTestId('heatmap-calendario');

    fireEvent.click(screen.getByText('ir para mês passado'));

    // Mesmo relógio do contexto (America/Sao_Paulo), não o fuso de quem roda o teste.
    const [anoHoje, mesHoje] = hojeLocal().split('-').map(Number);
    const mesPassado = mesHoje === 1 ? 12 : mesHoje - 1;
    const anoPassado = mesHoje === 1 ? anoHoje - 1 : anoHoje;

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/orcamento/calendario', {
        params: { mes: mesPassado, ano: anoPassado },
      });
    });
    expect(screen.getByText(`${MESES[mesPassado - 1]} ${anoPassado}`)).toBeInTheDocument();
  });

  it('não expõe navegação própria de mês — quem navega é o SeletorMesOrcamento', async () => {
    renderComNavegacao(<CalendarioGastosCard />);
    await screen.findByTestId('heatmap-calendario');

    expect(screen.queryByLabelText(/mês anterior/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/próximo mês/i)).not.toBeInTheDocument();
  });

  it('mantém a grade anterior na tela durante o refetch de outro mês', async () => {
    renderComNavegacao(<CalendarioGastosCard />);
    const grade = await screen.findByTestId('heatmap-calendario');

    let resolverSegundaBusca;
    api.get.mockImplementationOnce(
      () => new Promise((resolve) => { resolverSegundaBusca = resolve; }),
    );

    fireEvent.click(screen.getByText('ir para mês passado'));

    // Em voo: a grade continua montada (esmaecida), sem spinner no lugar dela.
    expect(grade).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-calendario')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    resolverSegundaBusca({ data: calendarioJunho });
    await waitFor(() =>
      expect(screen.getByTestId('heatmap-calendario')).toHaveAttribute('aria-busy', 'false'),
    );
  });

  it('erro de rede mostra alerta', async () => {
    api.get.mockRejectedValue(new Error('falhou'));
    renderComTema(<CalendarioGastosCard />);

    expect(await screen.findByText(/não foi possível carregar o calendário/i)).toBeInTheDocument();
  });
});

describe('EntradasSaidasChart (ADR-036)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o gráfico quando a série chega', async () => {
    api.get.mockResolvedValue({
      data: [
        { mes: '05/2026', receitas: 2800, despesas: 900, saldo: 1900 },
        { mes: '06/2026', receitas: 3000, despesas: 1200, saldo: 1800 },
      ],
    });
    renderComTema(<EntradasSaidasChart />);

    expect(await screen.findByTestId('grafico-entradas-saidas')).toBeInTheDocument();
  });

  it('erro de rede mostra alerta', async () => {
    api.get.mockRejectedValue(new Error('falhou'));
    renderComTema(<EntradasSaidasChart />);

    expect(await screen.findByText(/não foi possível carregar entradas/i)).toBeInTheDocument();
  });
});
