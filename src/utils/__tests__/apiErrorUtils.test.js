import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  extrairMensagemErroApi,
  logErroSeguro,
  ehConflitoDeSaldo,
  mensagemComConflitoDeSaldo,
  MSG_CONFLITO_SALDO,
} from '../apiErrorUtils';

/**
 * Erro Axios realista: o objeto carrega `config.headers.Authorization` (o JWT)
 * e `config.data` (o corpo enviado — no login, as credenciais). Logar o erro
 * cru despeja tudo isso no console do navegador — foi exatamente esse o
 * vazamento apontado pela auditoria (SEC-03).
 */
const erroAxiosFake = ({ status = 401, data = { message: 'Token expirado' } } = {}) => ({
  message: `Request failed with status code ${status}`,
  config: {
    url: '/investimentos/estrategia-legacy',
    headers: {
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.PAYLOAD_SECRETO.ASSINATURA',
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({ email: 'vitima@example.com', senha: 'SenhaSuperSecreta1' }),
  },
  response: { status, data },
});

describe('extrairMensagemErroApi', () => {
  it('usa o fallback quando não há corpo reconhecível', () => {
    expect(extrairMensagemErroApi(new Error('boom'), 'padrão')).toBe('padrão');
  });

  it('extrai a mensagem do backend quando presente', () => {
    expect(extrairMensagemErroApi(erroAxiosFake(), 'padrão')).toBe('Token expirado');
  });
});

describe('logErroSeguro (SEC-03)', () => {
  afterEach(() => vi.restoreAllMocks());

  const capturar = (erro, contexto = 'Contexto') => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logErroSeguro(contexto, erro);
    const saida = spy.mock.calls.map((args) => args.join(' ')).join('\n');
    return { spy, saida };
  };

  it('NUNCA emite o JWT, o header Authorization ou o corpo da requisição', () => {
    const { saida } = capturar(erroAxiosFake());
    expect(saida).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(saida).not.toContain('Bearer');
    expect(saida).not.toContain('Authorization');
    expect(saida).not.toContain('SenhaSuperSecreta1');
    expect(saida).not.toContain('vitima@example.com');
  });

  it('não passa o objeto de erro cru para o console (só strings)', () => {
    const { spy } = capturar(erroAxiosFake());
    const argumentos = spy.mock.calls.flat();
    expect(argumentos.length).toBeGreaterThan(0);
    argumentos.forEach((arg) => expect(typeof arg).toBe('string'));
  });

  it('preserva o que é útil para diagnóstico: contexto, status e mensagem', () => {
    const { saida } = capturar(erroAxiosFake(), 'Falha ao carregar estratégia');
    expect(saida).toContain('Falha ao carregar estratégia');
    expect(saida).toContain('401');
    expect(saida).toContain('Token expirado');
  });

  it('lida com erro sem resposta do servidor (rede fora)', () => {
    const { saida } = capturar(new Error('Network Error'), 'Falha de rede');
    expect(saida).toContain('Falha de rede');
    expect(saida).toContain('Network Error');
  });

  it('lida com erro nulo sem quebrar', () => {
    expect(() => capturar(null)).not.toThrow();
  });

  it('nível warn emite em console.warn e continua sem vazar dado sensível', () => {
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    logErroSeguro('Falha ao carregar histórico', erroAxiosFake(), 'warn');
    expect(spyError).not.toHaveBeenCalled();
    const saida = spyWarn.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(saida).toContain('Falha ao carregar histórico');
    expect(saida).not.toContain('Bearer');
    expect(saida).not.toContain('SenhaSuperSecreta1');
  });
});

// ADR-066 (backend): lock otimista em ContaFinanceira -> 409 { erro: 'Conflito', mensagem }.
// Outros 409 da API (ex.: PREVIEW_EM_PROCESSAMENTO) usam outro codigo em `erro`.
describe('ehConflitoDeSaldo (409 do lock otimista, ADR-066)', () => {
  it('reconhece o 409 com erro "Conflito"', () => {
    const e = erroAxiosFake({ status: 409, data: { status: 409, erro: 'Conflito', mensagem: 'x' } });
    expect(ehConflitoDeSaldo(e)).toBe(true);
  });

  it('nao confunde com o 409 de preview em processamento', () => {
    const e = erroAxiosFake({ status: 409, data: { erro: 'PREVIEW_EM_PROCESSAMENTO' } });
    expect(ehConflitoDeSaldo(e)).toBe(false);
  });

  it('ignora outros status e erros sem resposta', () => {
    expect(ehConflitoDeSaldo(erroAxiosFake({ status: 400, data: { erro: 'Conflito' } }))).toBe(false);
    expect(ehConflitoDeSaldo(new Error('boom'))).toBe(false);
    expect(ehConflitoDeSaldo(undefined)).toBe(false);
  });
});

describe('mensagemComConflitoDeSaldo', () => {
  it('pede para recarregar e tentar de novo quando o saldo mudou', () => {
    const e = erroAxiosFake({ status: 409, data: { erro: 'Conflito' } });
    const msg = mensagemComConflitoDeSaldo(e, 'Falha ao salvar.');
    expect(msg).toBe(MSG_CONFLITO_SALDO);
    expect(msg).toMatch(/saldo/i);
    expect(msg).toMatch(/recarregue/i);
    expect(msg).toMatch(/tente novamente/i);
  });

  it('devolve o fallback para qualquer outro erro', () => {
    expect(mensagemComConflitoDeSaldo(erroAxiosFake({ status: 500 }), 'Falha ao salvar.')).toBe('Falha ao salvar.');
  });
});
