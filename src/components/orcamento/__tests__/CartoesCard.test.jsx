import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme';
import CartoesCard from '../CartoesCard';
import { MesOrcamentoProvider } from '../../../contexts/MesOrcamentoContext';

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

// O NovoGastoWizard lê o usuário para buscar as categorias já usadas.
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

// Mesmo stub do NovoGastoWizard.test: o CreatableSelect vira um input simples.
vi.mock('react-select/creatable', () => ({
  default: ({ onChange, placeholder }) => (
    <input
      data-testid="categoria-select"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value ? { value: e.target.value, label: e.target.value } : null)}
    />
  ),
}));

import api from '../../../services/api';

const renderCard = () =>
  render(
    <ThemeProvider theme={theme}>
      <MesOrcamentoProvider>
        <CartoesCard />
      </MesOrcamentoProvider>
    </ThemeProvider>
  );

const cartoes = [
  {
    id: 'c1', nome: 'Roxinho', bandeira: 'Master', limiteTotal: 2000.0,
    diaFechamento: 5, diaVencimento: 15,
    faturaAberta: 300.0, percentualLimite: 15.0,
    proximoFechamento: '2026-07-05', proximoVencimento: '2026-07-15',
  },
  {
    id: 'c2', nome: 'Sem limite', bandeira: null, limiteTotal: null,
    diaFechamento: 10, diaVencimento: 20,
    faturaAberta: 120.5, percentualLimite: null,
    proximoFechamento: '2026-07-10', proximoVencimento: '2026-07-20',
  },
];

const FATURA_VAZIA = {
  cartaoId: 'c1', nomeCartao: 'Roxinho',
  inicioCiclo: '2026-06-06', fechamento: '2026-07-05', vencimento: '2026-07-15',
  total: 0, itens: [], porCategoria: [],
};

const mockApi = ({ lista = cartoes } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/cartoes') return Promise.resolve({ data: lista });
    if (url === '/orcamento/categorias-gerenciadas') return Promise.resolve({ data: [] });
    if (url === '/orcamento/categorias/user-123') return Promise.resolve({ data: [] });
    if (url === '/orcamento/limites/progresso') return Promise.resolve({ data: { itens: [] } });
    if (url.includes('/fatura')) return Promise.resolve({ data: FATURA_VAZIA });
    if (url.includes('/assinaturas')) return Promise.resolve({ data: null });
    return Promise.reject(new Error(`url inesperada: ${url}`));
  });
};

const preencherNovoCartao = (apelido) => {
  fireEvent.change(screen.getByLabelText(/apelido do cartão/i), { target: { value: apelido } });
  fireEvent.change(screen.getByLabelText(/dia fechamento/i), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText(/dia vencimento/i), { target: { value: '15' } });
  fireEvent.click(screen.getByRole('button', { name: /^criar$/i }));
};

describe('CartoesCard (ADR-035)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('lista cartões com fatura aberta e as próximas datas de fechamento/vencimento', async () => {
    renderCard();

    expect(await screen.findByText('Roxinho')).toBeInTheDocument();
    expect(screen.getByText('Fecha 05/jul · vence 15/jul')).toBeInTheDocument();
    expect(screen.getByText('Sem limite')).toBeInTheDocument();
    expect(screen.getByText('Fecha 10/jul · vence 20/jul')).toBeInTheDocument();
  });

  it('sem as próximas datas calculadas, cai no dia do mês cadastrado', async () => {
    const semDatas = { ...cartoes[0], proximoFechamento: undefined, proximoVencimento: undefined };
    mockApi({ lista: [semDatas] });
    renderCard();

    expect(await screen.findByText(/fecha dia 5 · vence dia 15/i)).toBeInTheDocument();
  });

  it('sem cartões mostra o convite com aviso de nunca usar o número real', async () => {
    mockApi({ lista: [] });
    renderCard();

    expect(await screen.findByText(/nunca o número real/i)).toBeInTheDocument();
  });

  it('dialog de novo cartão exibe o aviso anti-PAN e envia o POST', async () => {
    api.post.mockResolvedValue({ data: {} });
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: /novo cartão/i }));
    expect(screen.getByText(/nunca digite o número real do cartão/i)).toBeInTheDocument();

    preencherNovoCartao('Nubank');

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/cartoes', expect.objectContaining({
      nome: 'Nubank', diaFechamento: 5, diaVencimento: 15,
    })));
  });

  it('atalho "Gasto" abre o wizard e lança a compra com valor decimal PT-BR', async () => {
    api.post.mockResolvedValue({ data: [] });
    renderCard();

    fireEvent.click((await screen.findAllByLabelText(/novo gasto no cartão/i))[0]);
    fireEvent.change(screen.getByLabelText('Valor total (R$)'), { target: { value: '1.200,00' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Notebook' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lançar gasto' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/cartoes/compra', expect.objectContaining({
      cartaoId: 'c1', valor: 1200, descricao: 'Notebook',
    })));
    // Depois do lançamento, a lista é recarregada para refletir a fatura nova.
    await waitFor(() => expect(api.get.mock.calls.filter(([u]) => u === '/cartoes')).toHaveLength(2));
  });

  it('clicar no cartão abre o painel com a fatura do cartão', async () => {
    renderCard();

    fireEvent.click(await screen.findByLabelText('detalhes da fatura Roxinho'));

    expect(await screen.findByText(/Fatura — Roxinho/)).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/cartoes\/c1\/fatura\?mes=\d+&ano=\d+$/)));
    expect(await screen.findByText('Nenhum gasto nesta fatura.')).toBeInTheDocument();
  });

  it('excluir cartão pelo menu do painel pede confirmação e remove', async () => {
    api.delete.mockResolvedValue({ data: {} });
    renderCard();

    fireEvent.click(await screen.findByLabelText('detalhes da fatura Roxinho'));
    fireEvent.click(await screen.findByLabelText('mais ações do cartão'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Excluir cartão' }));

    const dialog = await screen.findByTestId('confirmar-exclusao-dialog');
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/cartoes/c1'));
    await waitFor(() => expect(screen.queryByText(/Fatura — Roxinho/)).not.toBeInTheDocument());
  });

  it('erro do backend (ex.: anti-PAN 422) aparece no alerta', async () => {
    api.post.mockRejectedValue({
      response: { status: 422, data: { message: 'Não insira o número real do cartão — use apenas um apelido.' } },
    });
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: /novo cartão/i }));
    preencherNovoCartao('x');

    expect(await screen.findByText(/use apenas um apelido/i)).toBeInTheDocument();
  });
});
