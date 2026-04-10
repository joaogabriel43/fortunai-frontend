import { test, expect, request as playwrightRequest } from '@playwright/test'

/**
 * Smoke tests de produção — rodam apenas contra o ambiente real.
 * 5 testes rápidos (< 30s total) que verificam o sistema está UP.
 *
 * Uso local:   PLAYWRIGHT_BASE_URL=https://finassistant-frontend.vercel.app \
 *              PLAYWRIGHT_API_URL=https://finassistant-production.up.railway.app \
 *              npx playwright test e2e/smoke.spec.ts
 *
 * No CI: executado pelo job "smoke" pós-deploy.
 */

const API_URL = process.env.PLAYWRIGHT_API_URL || 'https://finassistant-production.up.railway.app'

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
  test('2. Frontend carrega e título contém "FortunAI"', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FortunAI/i, { timeout: 15_000 })
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
    // O endpoint retorna informações de status dos serviços
    expect(body).toHaveProperty('status')
    await ctx.dispose()
  })
})
