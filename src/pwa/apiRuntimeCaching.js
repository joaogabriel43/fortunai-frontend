/**
 * Política de runtime caching do Service Worker (PWA) para chamadas à API.
 *
 * ── F-01 (auditoria externa 2026-08-28, severidade ALTA) ────────────────────
 * A versão anterior aplicava `NetworkFirst` a TODO `GET https://<api>/api/**`
 * sob um único `cacheName: 'api-cache'`. A chave do Cache Storage é a URL —
 * e nenhuma dessas rotas carrega a identidade do dono na URL: o dono é
 * derivado do JWT no header. Consequência: duas contas no mesmo navegador
 * compartilhavam a mesma entrada de cache, e uma resposta ainda válida da
 * conta A podia ser servida para a conta B (offline, rede lenta, ou logout
 * cuja limpeza ainda não terminou).
 *
 * ── Regra adotada ───────────────────────────────────────────────────────────
 * Allowlist POSITIVA: nada sob `/api/**` é cacheado por padrão; só entra aqui
 * rota comprovadamente sem dado derivado do usuário autenticado.
 *
 * Critério de classificação (fonte: `SecurityConfig.java` do backend): sob
 * `/api/**` o único GET `permitAll` é `/api/status`; todo o resto cai em
 * `.anyRequest().authenticated()` e portanto retorna dado de usuário.
 *
 * Propriedade fail-safe desta forma: se o origin da API mudar e esta constante
 * não for atualizada, o resultado é "nada é cacheado" (perda de performance),
 * nunca "tudo é cacheado" (vazamento). O erro cai para o lado seguro.
 */

/** Origin da API em produção (servidor Pondero). Deve espelhar `VITE_API_URL`. */
export const API_ORIGIN_PRODUCAO = 'https://api.pondero.com.br'

/**
 * Cache das rotas públicas. Nome novo de propósito: a instância antiga
 * ('api-cache') fica órfã e é purgada no `activate` por `sw-purge-caches.js`.
 */
export const CACHE_API_PUBLICA = 'api-publica-cache-v1'

/**
 * Caches de versões anteriores do SW que precisam ser destruídos no `activate`.
 * Mantido aqui para servir de fonte única — `sw-purge-caches.js` roda em escopo
 * de Service Worker (sem ESM) e repete estes nomes; há teste travando a sincronia.
 */
export const CACHES_LEGADOS = ['api-cache']

/**
 * O nome pertence ao namespace de cache da API?
 *
 * Fonte unica de verdade para os DOIS pontos de purga do PWA, que tem alvos
 * ligeiramente diferentes e por isso nao compartilham a funcao inteira:
 *  - `sw-purge-caches.js` (activate do SW) purga o namespace MENOS o cache
 *    publico corrente, que acabou de ser criado pela versao nova do SW;
 *  - `authService.limparCachesDoPwa()` (logout) purga o namespace INTEIRO,
 *    porque ali nada de API pode sobreviver a troca de conta.
 *
 * O que nenhum dos dois toca: `workbox-precache-*` e demais caches internos do
 * Workbox. Eles guardam apenas os `globPatterns` estaticos (js/css/html/ico/
 * png/svg) — nunca resposta de API, nunca dado de usuario. Apaga-los nao
 * protegeria nada e quebraria a navegacao offline, que depende do precache via
 * `createHandlerBoundToURL('index.html')`.
 *
 * O `api[-_]` defensivo cobre caches deixados por versoes anteriores do SW cujo
 * nome nao esteja mais listado em CACHES_LEGADOS.
 *
 * @param {string} nome nome do cache no Cache Storage
 * @returns {boolean}
 */
export const ehCacheDeApi = (nome) =>
  nome === CACHE_API_PUBLICA ||
  CACHES_LEGADOS.includes(nome) ||
  /^api[-_]/i.test(nome)

/** Escapa metacaracteres para embutir uma string literal numa RegExp. */
const escaparParaRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Rotas públicas cacheáveis. Cada entrada é ancorada no início da URL completa
 * e no fim do path — nada de prefixo aberto que volte a pegar `/api/**`.
 */
export const ROTAS_PUBLICAS_CACHEAVEIS = [
  {
    nome: 'status-page',
    // GET /api/status — saúde dos serviços (ADR-050). `permitAll`, sem dado de
    // usuário, e o frontend faz polling a cada 30s (useStatusPage.js). Manter
    // cacheado preserva a status page útil justamente quando a API está fora.
    urlPattern: new RegExp(
      `^${escaparParaRegex(`${API_ORIGIN_PRODUCAO}/api/status`)}/?$`,
      'i',
    ),
  },
]

/**
 * Config consumida por `vite.config.js` (opção `workbox.runtimeCaching`).
 */
export const apiRuntimeCaching = ROTAS_PUBLICAS_CACHEAVEIS.map((rota) => ({
  urlPattern: rota.urlPattern,
  method: 'GET',
  handler: 'NetworkFirst',
  options: {
    cacheName: CACHE_API_PUBLICA,
    expiration: { maxEntries: 10, maxAgeSeconds: 300 },
    networkTimeoutSeconds: 10,
    // Só resposta 200 real. `0` (opaca) ficaria de fora de propósito: opaca é
    // indistinguível de erro e não deve virar conteúdo servido offline.
    cacheableResponse: { statuses: [200] },
  },
}))

/**
 * Uma URL é elegível a cache de runtime? Espelha a decisão de roteamento do SW
 * e existe para ser exercida em teste sem precisar de um Service Worker real.
 *
 * @param {string} url URL absoluta da requisição
 * @returns {boolean}
 */
export const podeSerCacheada = (url) =>
  ROTAS_PUBLICAS_CACHEAVEIS.some((rota) => rota.urlPattern.test(url))
