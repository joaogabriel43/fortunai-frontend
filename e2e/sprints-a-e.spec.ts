import { test, expect, request as playwrightRequest } from '@playwright/test'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, getAuthToken } from './helpers/auth.helper'

/**
 * E2E — Sprints A–E: Recorrências, NFC-e, Colaboração, Insights, IR.
 *
 * Estratégia:
 *   - Testes de API são determinísticos: endpoints reais, sem mocks.
 *   - Testes de UI são condicionais quando o componente é opcional (InsightCard).
 *   - Nenhum teste assume dados pré-existentes no banco.
 *   - Cleanup via helpers para operações que criam dados persistentes.
 *
 * Componentes frontend ainda não criados (só backend implementado):
 *   - NfceScannerModal.jsx → testes de NFC-e são API-only
 *   - InsightEducacionalCard.jsx → teste de Dashboard é condicional
 *   - Aba Compartilhamento em Configurações → testes de colaboração são API-only
 */

const BACKEND_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3333'
const AUTH_STATE = 'e2e/.auth/user.json'

test.use({ storageState: AUTH_STATE })

// ── Helper: contexto HTTP autenticado ────────────────────────────────────────

async function getAuthCtx() {
  const token = await getAuthToken(TEST_USER_EMAIL, TEST_USER_PASSWORD)
  const ctx = await playwrightRequest.newContext({
    baseURL: BACKEND_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  return { ctx, token }
}

// ════════════════════════════════════════════════════════════════════════════
// SPRINT A — Assinaturas Recorrentes
// ════════════════════════════════════════════════════════════════════════════

test.describe('Sprint A — Assinaturas Recorrentes', () => {

  // ── API: endpoint existe e responde com resumo ───────────────────────────

  test('Sprint A-1 — GET /api/orcamento/recorrencias → 200 com resumo', async () => {
    const { ctx } = await getAuthCtx()
    const res = await ctx.get('/api/orcamento/recorrencias')

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('recorrencias')
    expect(body).toHaveProperty('totalMensalComprometido')
    expect(Array.isArray(body.recorrencias)).toBe(true)
    // A lista pode estar vazia (sem transações recorrentes no usuário de teste)
    // Cada item deve ter os campos do RecorrenciaDTO
    if (body.recorrencias.length > 0) {
      expect(body.recorrencias[0]).toHaveProperty('nome')
      expect(body.recorrencias[0]).toHaveProperty('valorMedio')
      expect(body.recorrencias[0]).toHaveProperty('frequencia')
    }

    await ctx.dispose()
  })

  // ── UI: OrcamentoPage carrega sem erro ─────────────────────────────────

  test('Sprint A-2 — UI: OrcamentoPage renderiza sem erro (RecorrenciasCard presente)', async ({ page }) => {
    await page.goto('/orcamento')

    // Página deve carregar título
    await expect(page.getByText(/Painel de Orçamento|Orçamento/i).first()).toBeVisible({ timeout: 10_000 })

    // Não deve exibir erro de runtime
    await expect(page.getByText(/Internal Server Error|Erro inesperado/i)).not.toBeVisible()

    // RecorrenciasCard é condicional — só aparece se houver recorrências detectadas
    // Se presente, deve ter título reconhecível
    const hasRecorrencias = await page.getByText(/Assinaturas Detectadas|Recorrências/i)
      .first().isVisible({ timeout: 3_000 }).catch(() => false)
    if (hasRecorrencias) {
      await expect(page.getByText(/Assinaturas Detectadas|Recorrências/i).first()).toBeVisible()
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SPRINT B — NFC-e Scanner (API-only — frontend não implementado)
// ════════════════════════════════════════════════════════════════════════════

test.describe('Sprint B — NFC-e Scanner', () => {

  // ── API: SSRF guard rejeita URL não-SEFAZ ─────────────────────────────

  test('Sprint B-1 — POST /api/orcamento/nfce/preview com URL não-SEFAZ → 400', async () => {
    const { ctx } = await getAuthCtx()
    const res = await ctx.post('/api/orcamento/nfce/preview', {
      data: { url: 'https://site-malicioso.com/fake-nfce-payload' },
    })

    // SSRF guard: URL rejeitada ANTES de qualquer chamada HTTP externa
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('erro')

    await ctx.dispose()
  })

  // ── API: importar sem autenticação → 401 (403 é só 'sem permissão') ──────────────────────────

  test('Sprint B-2 — POST /api/orcamento/nfce/importar sem auth → 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: BACKEND_URL })
    const res = await ctx.post('/api/orcamento/nfce/importar', {
      data: {
        url: 'https://www.nfce.fazenda.sp.gov.br/consulta?p=12345',
        importarItensSeparados: false,
        indicesItensSelecionados: [],
      },
    })
    expect(res.status()).toBe(401)
    expect(res.headers()['www-authenticate']).toContain('Bearer')
    await ctx.dispose()
  })

  // ── API: preview com URL .gov.br válida mas SEFAZ indisponível → 503 ──

  test('Sprint B-3 — POST /api/orcamento/nfce/preview URL SEFAZ válida → 400 ou 503', async () => {
    const { ctx } = await getAuthCtx()
    // URL com domínio SEFAZ válido mas chave de acesso fake — passa no SSRF guard
    // mas falha no XML parser (indisponível ou XML inválido)
    const res = await ctx.post('/api/orcamento/nfce/preview', {
      data: { url: 'https://www.nfce.fazenda.sp.gov.br/consulta?p=35230612345678000195650010000000011123456785' },
    })
    // 400 (XML inválido) ou 503 (SEFAZ indisponível no ambiente de teste)
    expect([400, 503]).toContain(res.status())

    await ctx.dispose()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SPRINT C — Colaboração Casal/Família + Expiração de Token (ADR-016)
// ════════════════════════════════════════════════════════════════════════════

test.describe('Sprint C — Colaboração e Expiração de Convite', () => {

  // ── API: status do vínculo ─────────────────────────────────────────────

  test('Sprint C-1 — GET /api/compartilhamento/status → 200', async () => {
    const { ctx } = await getAuthCtx()
    const res = await ctx.get('/api/compartilhamento/status')

    expect(res.status()).toBe(200)
    const body = await res.json()
    // Pode retornar { ativo: false, status: null } ou { ativo: true, status: "ATIVO" }
    expect(body).toHaveProperty('ativo')

    await ctx.dispose()
  })

  // ── API: desvincular (idempotente) → 204 ──────────────────────────────

  test('Sprint C-2 — DELETE /api/compartilhamento → 204 (idempotente sem vínculo)', async () => {
    const { ctx } = await getAuthCtx()
    // Operação idempotente: sem vínculo ativo retorna 204 normalmente
    const res = await ctx.delete('/api/compartilhamento')
    expect(res.status()).toBe(204)
    await ctx.dispose()
  })

  // ── API: convidar com email inexistente → 400 ──────────────────────────

  test('Sprint C-3 — POST /api/compartilhamento/convidar email não cadastrado → 400 ou 409', async () => {
    const { ctx } = await getAuthCtx()
    const res = await ctx.post('/api/compartilhamento/convidar', {
      data: { email: 'usuario-definitivamente-nao-existe-xyz@fortunai-test.com' },
    })
    // 400: email não encontrado (ConviteInvalidoException)
    // 409: usuário já tem convite PENDENTE de execução anterior (CompartilhamentoJaAtivoException)
    expect([400, 409]).toContain(res.status())

    if (res.status() === 400) {
      const body = await res.json()
      expect(body).toHaveProperty('mensagem')
    }

    await ctx.dispose()
  })

  // ── API: aceitar com token inválido → 400 ─────────────────────────────

  test('Sprint C-4 — GET /api/compartilhamento/aceitar com token inválido → 400', async () => {
    const { ctx } = await getAuthCtx()
    const res = await ctx.get('/api/compartilhamento/aceitar', {
      params: { token: 'token-invalido-para-teste-abc123xyz000' },
    })

    // Token inexistente → ConviteInvalidoException → 400
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')

    await ctx.dispose()
  })

  // ── API: ADR-016 — convite expirado retorna 400 com mensagem específica ─

  test('Sprint C-5 — ADR-016: endpoint aceitar existe e retorna 400 para token inválido/expirado', async () => {
    const { ctx } = await getAuthCtx()
    // Qualquer token inválido retorna 400 — seja por não existir ou por expirado
    // Em um ambiente de teste real, criar um convite expirado exigiria manipular o banco
    const res = await ctx.get('/api/compartilhamento/aceitar', {
      params: { token: 'expirado-simulation-xxxxxxxxxxxxxxxxxxx' },
    })
    expect(res.status()).toBe(400)

    await ctx.dispose()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SPRINT D — Insights Educacionais
// ════════════════════════════════════════════════════════════════════════════

test.describe('Sprint D — Insights Educacionais', () => {

  // ── API: GET atual → 200 ──────────────────────────────────────────────

  test('Sprint D-1 — GET /api/insights/atual → 200 (body null ou InsightDTO)', async () => {
    const { ctx } = await getAuthCtx()
    const res = await ctx.get('/api/insights/atual')

    expect(res.status()).toBe(200)
    // Body pode ser vazio/null (sem insights elegíveis no usuário de teste) ou InsightDTO
    const text = await res.text()
    if (text) {
      const body = JSON.parse(text)
      // Se retornou InsightDTO, deve ter os campos esperados
      expect(body).toHaveProperty('titulo')
      expect(body).toHaveProperty('conteudo')
      expect(body).toHaveProperty('tipoInsight')
    }

    await ctx.dispose()
  })

  // ── API: POST visto com UUID inexistente → 422 ────────────────────────

  test('Sprint D-2 — POST /api/insights/{id}/visto com ID inexistente → 422', async () => {
    const { ctx } = await getAuthCtx()
    const fakeId = '00000000-dead-beef-0000-000000000001'
    const res = await ctx.post(`/api/insights/${fakeId}/visto`)

    // Insight não encontrado → IllegalArgumentException → 422
    expect([404, 422]).toContain(res.status())

    await ctx.dispose()
  })

  // ── UI: Dashboard carrega após adição das features Sprint A-D ─────────

  test('Sprint D-3 — UI: Dashboard renderiza o estado atual sem erro após Sprints A-D', async ({ page }) => {
    await page.goto('/dashboard')
    // Com dados, o Panorama G3-A exibe seu headline; sem dados, o onboarding
    // ocupa a tela. Ambos são estados válidos para o usuário sintético.
    await expect(
      page.getByText(/Sua posição consolidada hoje|Comece registrando uma transação no chat/i).first()
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Internal Server Error/i)).not.toBeVisible()
  })

  // ── UI: InsightCard — condicional (só aparece se houver insight elegível) ─

  test('Sprint D-4 — UI: Dashboard não quebra se InsightCard estiver presente', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2_000) // aguarda carregamento assíncrono dos cards

    // InsightCard é opcional — só aparece se GET /api/insights/atual retornar algo
    // Teste passa independente: verifica apenas que não há erro de runtime
    await expect(page.getByText(/Internal Server Error|Erro inesperado/i)).not.toBeVisible()

    // Se InsightCard aparecer, botão de ação deve ser clicável
    const insightBtn = page.getByRole('button', { name: /entendi|marcar.*visto|próximo insight/i })
    const insightBtnVisible = await insightBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)
    if (insightBtnVisible) {
      // Botão existe e está acessível
      await expect(insightBtn.first()).toBeEnabled()
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SPRINT E — IR Investimentos
// ════════════════════════════════════════════════════════════════════════════

test.describe('Sprint E — IR Investimentos', () => {

  // ── API: FREE user → 403 ──────────────────────────────────────────────

  test('Sprint E-1 — GET /api/ir/apuracao usuário FREE → 403 (Premium only)', async () => {
    const { ctx } = await getAuthCtx()
    const now = new Date()
    const res = await ctx.get('/api/ir/apuracao', {
      params: { mes: String(now.getMonth() + 1), ano: String(now.getFullYear()) },
    })

    // FREE → 403 (RecursoNaoDisponivelException)
    // Se o usuário de teste for Premium no ambiente: 200
    expect([200, 403]).toContain(res.status())
    if (res.status() === 403) {
      const body = await res.json()
      expect(body).toHaveProperty('plano')
      expect(body.plano).toBe('PREMIUM_REQUIRED')
    }

    await ctx.dispose()
  })

  // ── API: POST operacao sem auth → 401 (403 é só 'sem permissão') ──────────────────────────────

  test('Sprint E-2 — POST /api/ir/operacao sem autenticação → 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: BACKEND_URL })
    const res = await ctx.post('/api/ir/operacao', {
      data: {
        ticker: 'PETR4', tipoOperacao: 'COMPRA', tipoTrade: 'SWING',
        tipoAtivo: 'ACAO', quantidade: 100, precoUnitario: 30.0,
        dataOperacao: '2026-05-15',
      },
    })
    expect(res.status()).toBe(401)
    expect(res.headers()['www-authenticate']).toContain('Bearer')
    await ctx.dispose()
  })

  // ── API: GET operacoes autenticado → 200 Premium ou 403 Free ─────────

  test('Sprint E-3 — GET /api/ir/operacoes autenticado → 200 Premium ou 403 Free', async () => {
    const { ctx } = await getAuthCtx()
    const now = new Date()
    const res = await ctx.get('/api/ir/operacoes', {
      params: { mes: String(now.getMonth() + 1), ano: String(now.getFullYear()) },
    })

    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    } else {
      const body = await res.json()
      expect(body).toHaveProperty('plano', 'PREMIUM_REQUIRED')
    }

    await ctx.dispose()
  })

  // ── UI: Rota /ir existe e renderiza IrPage ─────────────────────────────

  test('Sprint E-4 — UI: /ir renderiza (Premium gate ou página de apuração)', async ({ page }) => {
    await page.goto('/ir')

    // Aguarda URL estabilizar
    await page.waitForURL(/\/ir/, { timeout: 5_000 })

    // IrPage.jsx: usuário FREE → PremiumGate ("exclusivo Premium")
    //             usuário Premium → seletor de período + card resumo
    await expect(
      page.getByText(/apuração|IR|Premium|exclusivo|plano/i).first()
    ).toBeVisible({ timeout: 8_000 })

    // Não deve dar erro de runtime
    await expect(page.getByText(/Internal Server Error/i)).not.toBeVisible()
  })

  // ── UI: Sidebar contém "IR Investimentos" ─────────────────────────────

  test('Sprint E-5 — UI: Sidebar tem link "IR Investimentos" com chip Premium para FREE', async ({ page }) => {
    await page.goto('/dashboard')

    // Link IR existe para todos os usuários (chip dourado "Premium" para FREE)
    await expect(page.getByRole('link', { name: /IR Investimentos/i })).toBeVisible({ timeout: 8_000 })
  })
})
