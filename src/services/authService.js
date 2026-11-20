import api from './api';
import { logErroSeguro } from '../utils/apiErrorUtils';
import { ehCacheDeApi } from '../pwa/apiRuntimeCaching';

/**
 * Teto de tempo para a limpeza do Cache Storage no logout.
 *
 * O logout AGUARDA a limpeza (F-01: antes ela era uma promise solta, e o
 * usuário seguinte podia logar antes de ela terminar). Mas aguardar não pode
 * virar travar: se o Cache Storage não responder, o logout completa mesmo
 * assim — a sessão local já foi encerrada de forma síncrona, bem antes daqui.
 */
export const TIMEOUT_LIMPEZA_CACHE_MS = 3000;

/** Referência ao Cache Storage, ou `undefined` onde a API não existe (SSR, teste). */
const obterCacheStorage = () =>
  typeof globalThis !== 'undefined' ? globalThis.caches : undefined;

/**
 * Destrói os caches de API do PWA. Nunca rejeita.
 *
 * F-01 (auditoria 2026-08-28, ALTA): o Cache Storage é indexado por URL e as
 * rotas da API não carregam a identidade do dono na URL — ela vem do JWT. Um
 * cache de API sobrevivente é, portanto, dado da conta anterior à espera de ser
 * servido para a próxima.
 *
 * O alvo é o namespace de API e só ele (`ehCacheDeApi`, a mesma noção usada na
 * purga do `activate`). O `workbox-precache-*` fica de fora de propósito: ele
 * guarda apenas os assets estáticos do `globPatterns`, nunca resposta de API —
 * apagá-lo não protegeria nada a mais e quebraria a navegação offline.
 *
 * @returns {Promise<void>} resolve mesmo em caso de falha (é best-effort logado)
 */
export async function limparCachesDoPwa() {
  const cacheStorage = obterCacheStorage();
  if (!cacheStorage) return;

  const limpeza = (async () => {
    const nomes = (await cacheStorage.keys()).filter(ehCacheDeApi);
    const resultados = await Promise.allSettled(
      nomes.map((nome) => cacheStorage.delete(nome)),
    );
    const falhas = resultados.filter((r) => r.status === 'rejected');
    if (falhas.length > 0) {
      logErroSeguro(
        `Falha ao limpar ${falhas.length} de ${nomes.length} cache(s) do PWA no logout`,
        falhas[0].reason,
        'warn',
      );
    }
  })();

  let temporizador;
  const tetoDeTempo = new Promise((resolve) => {
    temporizador = setTimeout(() => {
      logErroSeguro(
        'Limpeza de caches do PWA excedeu o tempo limite no logout',
        new Error(`timeout de ${TIMEOUT_LIMPEZA_CACHE_MS}ms`),
        'warn',
      );
      resolve();
    }, TIMEOUT_LIMPEZA_CACHE_MS);
  });

  try {
    await Promise.race([limpeza, tetoDeTempo]);
  } catch (erro) {
    // Falha na enumeração (Cache Storage indisponível, cota, modo privado):
    // registrada, mas jamais propagada — não pode impedir o logout.
    logErroSeguro('Falha ao limpar caches do PWA no logout', erro, 'warn');
  } finally {
    clearTimeout(temporizador);
  }
}

// Realiza login e armazena o par de tokens (access + refresh — ADR-029) no localStorage
export async function login(username, password) {
  const response = await api.post('/auth/login', { username, password });
  const { token, refreshToken } = response.data || {};
  if (token) {
    localStorage.setItem('authToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  return response.data;
}

// Registra novo usuário
export async function registrar(email, senha) {
  const response = await api.post('/auth/registrar', { email, senha });
  return response.data;
}

// "Esqueci minha senha": o backend responde 202 exista ou não a conta.
export async function solicitarRedefinicaoSenha(email) {
  await api.post('/auth/senha/esqueci', { email });
}

// O token do link só viaja aqui, no corpo do POST — nunca em URL, storage ou log.
export async function redefinirSenha(token, novaSenha) {
  await api.post('/auth/senha/redefinir', { token, novaSenha });
}

/**
 * Limpa a sessão local e revoga os refresh tokens no backend (best-effort).
 *
 * Ordem deliberada:
 *  1. localStorage, síncrono — o logout local nunca depende de rede nem de cache;
 *  2. revogação no servidor, disparada sem aguardar (best-effort, ADR-029);
 *  3. caches de API, AGUARDADO — quem chama só segue para a tela de login depois
 *     que o cache de API do usuário anterior deixou de existir.
 *
 * Nunca rejeita: qualquer falha vira log via `logErroSeguro` (ADR-048).
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  const token = localStorage.getItem('authToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');

  if (token) {
    api
      .post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } })
      .catch((erro) => {
        // Revogação best-effort — a sessão local já foi encerrada acima.
        logErroSeguro('Falha ao revogar a sessão no servidor', erro, 'warn');
      });
  }

  await limparCachesDoPwa();
}

// Utilitário opcional
export function getToken() {
  return localStorage.getItem('authToken');
}

// Export default para permitir import authService como objeto
export default {
  login, registrar, solicitarRedefinicaoSenha, redefinirSenha, logout, getToken, limparCachesDoPwa,
};
