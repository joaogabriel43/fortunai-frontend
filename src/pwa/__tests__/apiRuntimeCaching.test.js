// @vitest-environment node
//
// Ambiente `node` (não jsdom) de propósito: precisamos de Request/Response/fetch
// nativos (undici) para instanciar as estratégias REAIS do Workbox. O jsdom não
// entrega uma implementação de fetch API completa o bastante.

// Precisa vir antes dos imports do Workbox — ver o comentário no arquivo.
import './ambienteServiceWorker.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Router, RegExpRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

import {
  apiRuntimeCaching,
  podeSerCacheada,
  API_ORIGIN_PRODUCAO,
  CACHE_API_PUBLICA,
} from '../apiRuntimeCaching.js'

// ── Stubs de Cache Storage ───────────────────────────────────────────────────
// O Workbox só precisa de open/match/put/keys/delete. Implementação mínima e
// determinística; nada de IndexedDB (por isso o ExpirationPlugin fica de fora
// do router montado abaixo — ver nota em montarRouter).

class CacheFalso {
  constructor() {
    this.entradas = new Map()
  }
  #chave(req) {
    return typeof req === 'string' ? req : req.url
  }
  async match(req) {
    const encontrada = this.entradas.get(this.#chave(req))
    return encontrada ? encontrada.clone() : undefined
  }
  async put(req, res) {
    this.entradas.set(this.#chave(req), res.clone())
  }
  async delete(req) {
    return this.entradas.delete(this.#chave(req))
  }
  async keys() {
    return [...this.entradas.keys()].map((url) => new Request(url))
  }
}

class CacheStorageFalso {
  constructor() {
    this.caches = new Map()
  }
  async open(nome) {
    if (!this.caches.has(nome)) this.caches.set(nome, new CacheFalso())
    return this.caches.get(nome)
  }
  async keys() {
    return [...this.caches.keys()]
  }
  async has(nome) {
    return this.caches.has(nome)
  }
  async delete(nome) {
    return this.caches.delete(nome)
  }
  async match(req) {
    for (const cache of this.caches.values()) {
      const achou = await cache.match(req)
      if (achou) return achou
    }
    return undefined
  }
}

/**
 * FetchEvent mínimo: o Workbox só consome `request` e `waitUntil`, mas assere
 * `instanceof ExtendableEvent` em modo dev — daí a herança.
 */
class EventoFalso extends globalThis.ExtendableEvent {
  constructor(request) {
    super()
    this.request = request
    this.pendentes = []
  }
  waitUntil(promessa) {
    this.pendentes.push(promessa)
  }
  aguardarPendentes() {
    return Promise.allSettled(this.pendentes)
  }
}

const eventoFalso = (request) => new EventoFalso(request)

/**
 * Monta um Router real do Workbox a partir da config de produção.
 *
 * Nota: o `ExpirationPlugin` (que a config declara via `options.expiration`) é
 * deliberadamente omitido — ele exige IndexedDB e a propriedade sob teste aqui
 * é QUAIS URLs entram num cache compartilhado, não a contabilidade de validade.
 */
function montarRouter() {
  const router = new Router()
  for (const entrada of apiRuntimeCaching) {
    const estrategia = new NetworkFirst({
      cacheName: entrada.options.cacheName,
      networkTimeoutSeconds: entrada.options.networkTimeoutSeconds,
    })
    router.registerRoute(
      new RegExpRoute(entrada.urlPattern, estrategia, entrada.method || 'GET'),
    )
  }
  return router
}

/** Roteia uma requisição; `undefined` = nenhuma rota do SW assumiu a chamada. */
async function rotear(router, url) {
  const request = new Request(url)
  const evento = eventoFalso(request)
  const resposta = await router.handleRequest({ request, event: evento })
  await evento.aguardarPendentes()
  return resposta
}

const URL_DASHBOARD = `${API_ORIGIN_PRODUCAO}/api/dashboard/summary`
const SALDO_DA_CONTA_A = 'R$ 187.432,19 — PATRIMONIO DA CONTA A'

let cacheStorageOriginal
let selfOriginal

beforeEach(() => {
  cacheStorageOriginal = globalThis.caches
  selfOriginal = globalThis.self
  globalThis.caches = new CacheStorageFalso()
  // O escopo de Service Worker em si já foi montado por ambienteServiceWorker.js.
})

afterEach(() => {
  globalThis.caches = cacheStorageOriginal
  globalThis.self = selfOriginal
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('F-01 — cache do PWA não pode vazar dado entre contas', () => {
  it('não serve dado da conta A para a conta B quando a rede falha após o logout', async () => {
    const router = montarRouter()

    // ── Conta A, online: resposta autenticada volta do servidor ──────────────
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ patrimonio: SALDO_DA_CONTA_A }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const respostaA = await rotear(router, URL_DASHBOARD)
    if (respostaA) {
      // Com a regra genérica antiga, o SW assume e grava no Cache Storage.
      expect(await respostaA.clone().text()).toContain(SALDO_DA_CONTA_A)
    }

    // ── Logout: a limpeza de caches falha / ainda não terminou ───────────────
    // Este é exatamente o cenário do achado: o logout não aguardava a limpeza.
    // Nada é apagado aqui de propósito — o SW não pode depender disso.

    // ── Conta B, offline (ou rede lenta): fetch rejeita ──────────────────────
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    const respostaB = await rotear(router, URL_DASHBOARD)

    // O SW não pode ter assumido esta URL. Se assumiu, o NetworkFirst cai no
    // cache e devolve o patrimônio da conta A para a conta B.
    const corpoB = respostaB ? await respostaB.text() : ''
    expect(corpoB).not.toContain(SALDO_DA_CONTA_A)
    expect(respostaB).toBeUndefined()
  })

  it('nunca grava resposta de rota autenticada no Cache Storage', async () => {
    const router = montarRouter()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ patrimonio: SALDO_DA_CONTA_A }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await rotear(router, URL_DASHBOARD)

    const nomes = await globalThis.caches.keys()
    for (const nome of nomes) {
      const cache = await globalThis.caches.open(nome)
      const chaves = await cache.keys()
      expect(chaves.map((r) => r.url)).not.toContain(URL_DASHBOARD)
    }
  })
})

describe('F-01 — classificação das rotas GET de /api/**', () => {
  // Enumerado dos @GetMapping do backend. Sob /api/**, o SecurityConfig só
  // libera /api/status como permitAll; todo o resto é `.authenticated()` e
  // portanto retorna dado derivado do JWT.
  const ROTAS_AUTENTICADAS = [
    '/api/alertas',
    '/api/anomalias',
    '/api/auth/me',
    '/api/benchmarks/comparativo',
    '/api/benchmarks/janelas',
    '/api/cartoes',
    '/api/cartoes/7/assinaturas',
    '/api/cartoes/7/fatura',
    '/api/chat/historico',
    '/api/comparativo-mensal',
    '/api/compartilhamento/aceitar?token=abc',
    '/api/compartilhamento/status',
    '/api/conta/consentimento/status',
    '/api/dashboard/analise-mensal/2f1c',
    '/api/dashboard/expenses-by-category',
    '/api/dashboard/portfolio-composition',
    '/api/dashboard/summary',
    '/api/exportacao/extrato',
    '/api/exportacao/mensal',
    '/api/exportacao/portfolio/csv',
    '/api/exportacao/transacoes/csv',
    '/api/fluxo-caixa/projecao',
    '/api/insights/atual',
    '/api/investimentos/alocacao/2f1c',
    '/api/investimentos/calendario-proventos',
    '/api/investimentos/cotacao/PETR4',
    '/api/investimentos/dashboard/2f1c',
    '/api/investimentos/estrategia-legacy',
    '/api/investimentos/estrategia-legacy/analise',
    '/api/investimentos/estrategia/alertas',
    '/api/investimentos/estrategia/breakdown',
    '/api/investimentos/estrategia/tetos',
    '/api/investimentos/eventos-corporativos',
    '/api/investimentos/otimizacao-markowitz',
    '/api/investimentos/portfolio',
    '/api/investimentos/renda-passiva',
    '/api/investimentos/rentabilidade',
    '/api/investimentos/risco/alpha-beta',
    '/api/investimentos/risco/correlacao',
    '/api/investimentos/risco/fronteira',
    '/api/investimentos/valuation/preco-teto',
    '/api/ir/apuracao',
    '/api/ir/operacoes',
    '/api/ir/relatorio-anual',
    '/api/metas',
    '/api/notificacoes',
    '/api/notificacoes/count',
    '/api/orcamento/analise-historica/2f1c',
    '/api/orcamento/analise-mensal/2f1c',
    '/api/orcamento/calendario',
    '/api/orcamento/categorias-gerenciadas',
    '/api/orcamento/categorias/2f1c',
    '/api/orcamento/entradas-saidas',
    '/api/orcamento/evolucao-saldo/2f1c',
    '/api/orcamento/limites',
    '/api/orcamento/limites/progresso',
    '/api/orcamento/media-mensal',
    '/api/orcamento/ping',
    '/api/orcamento/recorrencias',
    '/api/orcamento/transacoes/2f1c',
    '/api/plano/status',
    '/api/profile/status',
    '/api/proventos',
    '/api/proventos/resumo',
    '/api/rebalanceamento/analisar',
    '/api/relatorio/mensal',
    '/api/resumo-inteligente',
    '/api/score-saude',
    '/api/usuario/dados-pessoais/exportar',
    '/api/usuario/perfil',
    '/api/usuario/preferencias',
    '/api/usuario/preferencias/ordem-cards-investimentos',
  ]

  it.each(ROTAS_AUTENTICADAS)('não cacheia a rota autenticada %s', (rota) => {
    expect(podeSerCacheada(`${API_ORIGIN_PRODUCAO}${rota}`)).toBe(false)
  })

  it.each(['/api/auth/senha/esqueci', '/api/auth/senha/redefinir'])(
    'não cacheia a rota de recuperação de senha %s',
    (rota) => {
      expect(podeSerCacheada(`${API_ORIGIN_PRODUCAO}${rota}`)).toBe(false)
    },
  )

  it('mantém /api/status cacheado — rota pública, sem custo de segurança', () => {
    expect(podeSerCacheada(`${API_ORIGIN_PRODUCAO}/api/status`)).toBe(true)
    expect(podeSerCacheada(`${API_ORIGIN_PRODUCAO}/api/status/`)).toBe(true)
  })

  it('serve /api/status do cache quando a rede cai (comportamento preservado)', async () => {
    const router = montarRouter()
    const corpo = JSON.stringify([{ servico: 'API', status: 'OPERACIONAL' }])

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(corpo, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await rotear(router, `${API_ORIGIN_PRODUCAO}/api/status`)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const offline = await rotear(router, `${API_ORIGIN_PRODUCAO}/api/status`)

    expect(offline).toBeDefined()
    expect(await offline.text()).toContain('OPERACIONAL')
    expect(await globalThis.caches.keys()).toContain(CACHE_API_PUBLICA)
  })

  it('não cacheia rota parecida com /api/status mas de outro recurso', () => {
    expect(podeSerCacheada(`${API_ORIGIN_PRODUCAO}/api/status-financeiro`)).toBe(false)
    expect(podeSerCacheada(`${API_ORIGIN_PRODUCAO}/api/plano/status`)).toBe(false)
    // Origin diferente (ex.: API apontada para outro host) não é cacheada.
    expect(podeSerCacheada('https://evil.example.com/api/status')).toBe(false)
  })
})
