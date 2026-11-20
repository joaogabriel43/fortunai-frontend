import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn().mockResolvedValue({ token: 'fake' }) }),
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login — integração com a navegação pública', () => {
  it('exibe o header público com logo e navegação de volta ao início', () => {
    renderLogin();

    expect(screen.getByTestId('public-header')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pondero' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
  });
});

describe('Login — recuperação de senha', () => {
  it('link "Esqueci minha senha" aponta para /esqueci-senha', () => {
    renderLogin();

    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha');
  });
});

describe('Login — mostrar/ocultar senha', () => {
  it('campo de senha começa oculto (type="password") com botão "Mostrar senha"', () => {
    renderLogin();

    expect(screen.getByLabelText(/^senha/i)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /mostrar senha/i })).toBeInTheDocument();
  });

  it('clicar no ícone de olho revela a senha (type="text")', () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(screen.getByLabelText(/^senha/i)).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /ocultar senha/i })).toBeInTheDocument();
  });
});
