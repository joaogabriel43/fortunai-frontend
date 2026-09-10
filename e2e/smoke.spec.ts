import { test, expect, request as playwrightRequest } from '@playwright/test'

/**
 * Smoke tests de produção — rodam apenas contra o ambiente real.
 * 12 testes rápidos (< 30s total) que verificam se o sistema está UP.
 *
 * SEMPRE rodar via `npm run test:smoke`, que usa playwright.smoke.config.ts
 * (read-only). NÃO usar `npx playwright test e2e/smoke.spec.ts`: isso carrega
 * playwright.config.ts e dispara o globalSetup, que registra um usuário novo
 * no backend apontado por PLAYWRIGHT_API_URL — em produção, uma conta
 * descartável com consentimento LGPD fabricado a cada execução.
 *
 * Uso local:   PLAYWRIGHT_BASE_URL=https://pondero.com.br \
 *              PLAYWRIGHT_API_URL=https://api.pondero.com.br \
 *              npm run test:smoke
 *
 * No CI: executado pelo job "smoke" pós-deploy (ci.yml do repo finassistant).
 */

const API_URL = process.env.PLAYWRIGHT_API_URL || 'https://api.pondero.com.br'

test.describe('Smoke Tests — Produção', () => {

  // ─── 1. Backend health check ───────────────────────────────────────────
  test('1. GET /actuator/health → status UP', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.get('/actuator/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('UP')
    await ctx.dispose()
  })

  // ─── 2. Frontend carrega com título correto ────────────────────────────
  test('2. Frontend carrega e título contém "Pondero"', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Pondero/i, { timeout: 15_000 })
  })

  // ─── 3. Página /login renderiza campo de email ─────────────────────────
  test('3. /login renderiza campo de email visível', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10_000 })
  })

  // ─── 4. API responde 401 para credenciais inválidas ────────────────────
  test('4. POST /api/auth/login com credenciais inválidas → 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.post('/api/auth/login', {
      data: { username: 'smoke-test-fake@example.com', password: 'FakePassword999!' },
    })
    // Aceita 401 (Unauthorized) ou 400 (Bad Request) — ambos indicam API respondendo
    expect([400, 401]).toContain(response.status())
    await ctx.dispose()
  })

  // ─── 5. GET /api/status → 200 com campos gemini e database ────────────
  test('5. GET /api/status → 200 com campos gemini e database', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.get('/api/status')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toEqual(expect.arrayContaining([
      expect.objectContaining({ nome: 'Gemini AI', status: expect.any(String) }),
      expect.objectContaining({ nome: 'Database', status: expect.any(String) }),
    ]))
    await ctx.dispose()
  })

  // ─── 6. GET /api/chat/historico → existe e exige auth ─────────────────
  //
  // Ramo de login removido em 30/08/2026: este teste tentava autenticar como
  // `smoke-auth@fortunai-test.com` com senha hardcoded no código-fonte e caía
  // num `else` que aceitava 401/403 como sucesso. Verificação read-only contra
  // produção (POST /api/auth/login) retornou 401 — a conta não existe, logo o
  // ramo autenticado NUNCA executou e o teste passava exclusivamente pelo
  // `else`. Mantida só a asserção que de fato era exercida. Credencial de
  // produção não volta para o código-fonte (CLAUDE.md §8.3); se o smoke um dia
  // precisar de sessão real, a senha entra como secret do Actions.
  test('6. GET /api/chat/historico → existe e exige auth (401/403 sem token)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const res = await ctx.get('/api/chat/historico')
    expect(res.status()).not.toBe(404)
    expect([401, 403]).toContain(res.status())
    await ctx.dispose()
  })

  // ─── 7. PWA manifest disponível ───────────────────────────────────────
  test('7. GET /manifest.webmanifest → 200 com identidade Pondero', async ({ page }) => {
    test.skip(process.env.NODE_ENV === 'development', 'PWA manifest only available in production build')
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)
    const body = await response?.json()
    expect(body?.name).toContain('Pondero')
    expect(body?.short_name).toBe('Pondero')
    expect(body?.background_color).toBe('#09100E')
    expect(body?.theme_color).toBe('#09100E')
  })

  // ─── 8. PATCH /api/usuario/tutorial-concluido existe (401/403 esperado sem token) ──
  test('8. PATCH /api/usuario/tutorial-concluido → não retorna 404', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.patch('/api/usuario/tutorial-concluido')
    // 401/403 = endpoint exists but requires auth — correct
    // 404 = endpoint missing — bad
    expect(response.status()).not.toBe(404)
    await ctx.dispose()
  })

  // ─── 9–12. Sprints A-E: novos endpoints não retornam 404 ──────────────

  test('9. GET /api/orcamento/recorrencias → existe (401 sem token)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.get('/api/orcamento/recorrencias')
    expect(response.status()).not.toBe(404)
    await ctx.dispose()
  })

  test('10. GET /api/compartilhamento/status → existe (401 sem token)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.get('/api/compartilhamento/status')
    expect(response.status()).not.toBe(404)
    await ctx.dispose()
  })

  test('11. GET /api/insights/atual → existe (401 sem token)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.get('/api/insights/atual')
    expect(response.status()).not.toBe(404)
    await ctx.dispose()
  })

  test('12. GET /api/ir/apuracao → existe (401 ou 403 sem token ou plano)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL })
    const response = await ctx.get('/api/ir/apuracao', {
      params: { mes: '5', ano: '2026' },
    })
    // 401 = sem token, 403 = sem plano Premium — ambos indicam endpoint ativo
    // 404 = endpoint ausente — falha
    expect(response.status()).not.toBe(404)
    await ctx.dispose()
  })
})
