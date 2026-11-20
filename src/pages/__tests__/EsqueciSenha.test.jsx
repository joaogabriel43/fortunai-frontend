import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EsqueciSenha from '../EsqueciSenha';

vi.mock('../../services/api', () => ({
  default: { post: vi.fn() },
}));

import api from '../../services/api';

const MENSAGEM = 'Se houver uma conta com esse e-mail, enviamos um link.';

const renderPagina = () =>
  render(
    <MemoryRouter>
      <EsqueciSenha />
    </MemoryRouter>
  );

const enviar = (email = 'pessoa@exemplo.com') => {
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
};

describe('EsqueciSenha — mensagem que não revela se a conta existe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('202 → mostra a mensagem exata e chama o serviço com o e-mail digitado', async () => {
    api.post.mockResolvedValue({ status: 202 });
    renderPagina();

    enviar('pessoa@exemplo.com');

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM);
    expect(screen.getByRole('status').textContent).toBe(MENSAGEM);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/senha/esqueci', { email: 'pessoa@exemplo.com' });
  });

  it('falha de rede → mostra a MESMA mensagem do sucesso', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));
    renderPagina();

    enviar();

    expect((await screen.findByRole('status')).textContent).toBe(MENSAGEM);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('500 do backend → mostra a MESMA mensagem do sucesso', async () => {
    const erro = new Error('Request failed with status code 500');
    erro.response = { status: 500, data: { erro: 'ERRO_INTERNO' } };
    api.post.mockRejectedValue(erro);
    renderPagina();

    enviar();

    expect((await screen.findByRole('status')).textContent).toBe(MENSAGEM);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([400, 404, 429])('%i do backend → mostra a MESMA mensagem do sucesso', async (status) => {
    const erro = new Error(`Request failed with status code ${status}`);
    erro.response = { status, data: {} };
    api.post.mockRejectedValue(erro);
    renderPagina();

    enviar();

    expect((await screen.findByRole('status')).textContent).toBe(MENSAGEM);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
