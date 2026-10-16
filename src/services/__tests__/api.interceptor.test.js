import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from '../api';
import { __resetParaTestes } from '../tokenRefresh';

// Exercita o interceptor REAL de api.js trocando só o adapter (sem rede).
const resposta = (config, status, data = {}) => ({ data, status, statusText: '', headers: {}, config });
const rejeita = (config, status) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.config = config;
  error.response = resposta(config, status);
  return Promise.reject(error);
};

describe('api interceptor — sessão expirada (403 do entry point do Spring)', () => {
  let adapter;
  let chamadas;
  let assign;
  let locationOriginal;

  const refreshCalls = () => chamadas.filter((c) => c.url === '/auth/refresh');

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'jwt-velho');
    localStorage.setItem('refreshToken', 'rt-velho');
    __resetParaTestes();
    chamadas = [];
    assign = vi.fn();
    locationOriginal = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...locationOriginal, assign } });
    adapter = api.defaults.adapter;
  });

  afterEach(() => {
    api.defaults.adapter = adapter;
    Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal });
  });

  const usarAdapter = (handler) => {
    api.defaults.adapter = vi.fn((config) => {
      chamadas.push({ url: config.url, authorization: config.headers.Authorization });
      return handler(config);
    });
  };

  const refreshOk = (config) =>
    resposta(config, 200, { token: 'jwt-novo', refreshToken: 'rt-novo' });

  describe('regressão: 403 do entry point do Spring tratado como sessão expirada', () => {
    it('403 → renova 1x → reexecuta com o token novo e resolve', async () => {
      usarAdapter((config) => {
        if (config.url === '/auth/refresh') return Promise.resolve(refreshOk(config));
        if (config.headers.Authorization === 'Bearer jwt-novo') {
          return Promise.resolve(resposta(config, 200, { ok: true }));
        }
        return rejeita(config, 403);
      });

      const res = await api.get('/investimentos/portfolio');

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true });
      expect(refreshCalls()).toHaveLength(1);
      expect(chamadas.map((c) => c.url)).toEqual([
        '/investimentos/portfolio',
        '/auth/refresh',
        '/investimentos/portfolio',
      ]);
      expect(chamadas[2].authorization).toBe('Bearer jwt-novo');
      expect(localStorage.getItem('authToken')).toBe('jwt-novo');
      expect(localStorage.getItem('refreshToken')).toBe('rt-novo');
      expect(assign).not.toHaveBeenCalled();
    });

    it('403 persistente após renovar (sem permissão) → erro 403 intacto, sem logout', async () => {
      usarAdapter((config) => {
        if (config.url === '/auth/refresh') return Promise.resolve(refreshOk(config));
        return rejeita(config, 403);
      });

      await expect(api.get('/admin/usuarios')).rejects.toMatchObject({ response: { status: 403 } });

      expect(refreshCalls()).toHaveLength(1);
      expect(chamadas.filter((c) => c.url === '/admin/usuarios')).toHaveLength(2);
      expect(localStorage.getItem('authToken')).toBe('jwt-novo');
      expect(localStorage.getItem('refreshToken')).toBe('rt-novo');
      expect(assign).not.toHaveBeenCalled();
    });

    it('3 requests concorrentes com 403 → um único POST /auth/refresh e as 3 resolvem', async () => {
      usarAdapter((config) => {
        if (config.url === '/auth/refresh') return Promise.resolve(refreshOk(config));
        if (config.headers.Authorization === 'Bearer jwt-novo') {
          return Promise.resolve(resposta(config, 200, { url: config.url }));
        }
        return rejeita(config, 403);
      });

      const resultados = await Promise.all([
        api.get('/a'),
        api.get('/b'),
        api.get('/c'),
      ]);

      expect(resultados.map((r) => r.data.url)).toEqual(['/a', '/b', '/c']);
      expect(refreshCalls()).toHaveLength(1);
    });

    it('403 e a renovação falha → limpa tokens e redireciona para /login', async () => {
      usarAdapter((config) => {
        if (config.url === '/auth/refresh') return rejeita(config, 401);
        return rejeita(config, 403);
      });

      await expect(api.get('/investimentos/portfolio')).rejects.toMatchObject({
        response: { status: 403 },
      });

      expect(refreshCalls()).toHaveLength(1);
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith('/login');
    });
  });
});
