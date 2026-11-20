import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import RedefinirSenha from '../RedefinirSenha';

vi.mock('../../services/api', () => ({
  default: { post: vi.fn() },
}));

import api from '../../services/api';

const TOKEN = 'tok-abc-123';
const MENSAGEM_POLITICA = 'A senha precisa ter pelo menos 8 caracteres, com pelo menos 1 letra e 1 número.';

const Rota = () => <div data-testid="rota-atual">{useLocation().pathname}</div>;

const renderPagina = (urlDoNavegador) => {
  window.history.replaceState(null, '', urlDoNavegador);
  return render(
    <MemoryRouter initialEntries={['/redefinir-senha']}>
      <Routes>
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/login" element={<Rota />} />
      </Routes>
    </MemoryRouter>
  );
};

const preencher = (senha, confirmar = senha) => {
  fireEvent.change(screen.getByLabelText(/^nova senha/i), { target: { value: senha } });
  fireEvent.change(screen.getByLabelText(/^confirmar nova senha/i), { target: { value: confirmar } });
};

const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));

const erroHttp = (status, data) => {
  const erro = new Error(`Request failed with status code ${status}`);
  erro.response = { status, data };
  return erro;
};

describe('RedefinirSenha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  describe('leitura do token', () => {
    it('lê o token do fragmento e limpa o fragmento com replaceState (pathname + search)', () => {
      window.history.replaceState(null, '', '/redefinir-senha?origem=email#token=abc');
      const replaceState = vi.spyOn(window.history, 'replaceState');
      render(
        <MemoryRouter>
          <RedefinirSenha />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/^nova senha/i)).toBeInTheDocument();
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(replaceState.mock.calls[0][2]).toBe('/redefinir-senha?origem=email');
      expect(window.location.hash).toBe('');
    });

    it('envia exatamente { token, novaSenha } com o token do fragmento', async () => {
      api.post.mockResolvedValue({ status: 204 });
      renderPagina('/redefinir-senha#token=abc');

      preencher('novaSenha1');
      enviar();

      await screen.findByText(/senha redefinida com sucesso/i);
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/auth/senha/redefinir', { token: 'abc', novaSenha: 'novaSenha1' });
    });

    it('?token= na query string é ignorado → link inválido, API nunca chamada', () => {
      renderPagina('/redefinir-senha?token=abc');

      expect(screen.getByText(/link inválido ou expirado/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^nova senha/i)).toBeNull();
      expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/esqueci-senha');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('nunca grava o token em localStorage/sessionStorage', async () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      api.post.mockResolvedValue({ status: 204 });
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1');
      enviar();
      await screen.findByText(/senha redefinida com sucesso/i);

      const comToken = setItem.mock.calls.filter((args) => args.some((v) => String(v).includes(TOKEN)));
      expect(comToken).toEqual([]);
    });
  });

  describe('política de senha no cliente', () => {
    it.each([
      ['curta', 'abc1234'],
      ['sem número', 'abcdefgh'],
      ['sem letra', '12345678'],
    ])('senha %s → mensagem da política e API não chamada', (_caso, senha) => {
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher(senha);
      enviar();

      expect(screen.getByRole('alert')).toHaveTextContent(MENSAGEM_POLITICA);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('confirmação diferente → "As senhas não coincidem" e API não chamada', () => {
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1', 'novaSenha2');
      enviar();

      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('respostas do backend', () => {
    it('204 → mensagem de sucesso e redireciona para /login após 2 s', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      api.post.mockResolvedValue({ status: 204 });
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1');
      enviar();

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Senha redefinida com sucesso. Redirecionando para o login...'
      );
      expect(screen.queryByTestId('rota-atual')).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect((await screen.findByTestId('rota-atual')).textContent).toBe('/login');
    });

    it('400 TOKEN_INVALIDO → estado de link inválido com link para /esqueci-senha', async () => {
      api.post.mockRejectedValue(erroHttp(400, { erro: 'TOKEN_INVALIDO', mensagem: 'Token inválido' }));
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1');
      enviar();

      expect(await screen.findByText(/link inválido ou expirado/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/esqueci-senha');
      expect(screen.queryByLabelText(/^nova senha/i)).toBeNull();
    });

    it('400 SENHA_INVALIDA → mensagem da política', async () => {
      api.post.mockRejectedValue(erroHttp(400, { erro: 'SENHA_INVALIDA' }));
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1');
      enviar();

      expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_POLITICA);
      expect(screen.queryByText(/link inválido ou expirado/i)).toBeNull();
    });

    it('400 sem código (corpo de Bean Validation) → mensagem da política', async () => {
      api.post.mockRejectedValue(erroHttp(400, { fields: { novaSenha: 'tamanho inválido' } }));
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1');
      enviar();

      expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_POLITICA);
    });

    it('500 → erro genérico, formulário segue disponível', async () => {
      api.post.mockRejectedValue(erroHttp(500, {}));
      renderPagina(`/redefinir-senha#token=${TOKEN}`);

      preencher('novaSenha1');
      enviar();

      expect(
        await screen.findByText('Não foi possível redefinir a senha agora. Tente novamente em instantes.')
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^nova senha/i)).toBeInTheDocument();
      expect(screen.queryByText(MENSAGEM_POLITICA)).toBeNull();
    });
  });
});
