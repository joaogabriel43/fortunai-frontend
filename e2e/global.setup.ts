import { chromium, request as playwrightRequest } from '@playwright/test'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, createTestUser, getAuthToken } from './helpers/auth.helper'
import { COOKIE_CONSENT_KEY, CONSENT_DECLINED } from '../src/utils/cookieConsent.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const AUTH_STATE_PATH = path.join(currentDir, '.auth', 'user.json')
const BACKEND_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3333'

async function globalSetup() {
  console.log(`\n[E2E Setup] Registrando usuário: ${TEST_USER_EMAIL}`)

  // 1. Registra o usuário via API (ignora 409 se já existir entre retries)
  await createTestUser(TEST_USER_EMAIL, TEST_USER_PASSWORD)
  console.log('[E2E Setup] Usuário registrado (ou já existia).')

  // 2. Obtém token JWT via login API
  const token = await getAuthToken(TEST_USER_EMAIL, TEST_USER_PASSWORD)
  process.env.PLAYWRIGHT_E2E_AUTH_TOKEN = token
  console.log('[E2E Setup] Token JWT obtido.')

  // 2.5 Marca tutorial como concluído para que o overlay não apareça nos testes
  const setupCtx = await playwrightRequest.newContext({ baseURL: BACKEND_URL })
  await setupCtx.patch('/api/usuario/tutorial-concluido', {
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log('[E2E Setup] Tutorial marcado como concluído.')

  // 2.6 Aceita os documentos vigentes para o modal legal não bloquear os testes
  const consentimentoResponse = await setupCtx.post('/api/conta/consentimento', {
    headers: { Authorization: `Bearer ${token}` },
    data: { versaoTermos: '1.0', versaoPrivacidade: '1.0' },
  })
  if (!consentimentoResponse.ok()) {
    throw new Error(
      `Falha ao registrar consentimento E2E: ${consentimentoResponse.status()} ${await consentimentoResponse.text()}`,
    )
  }
  await setupCtx.dispose()
  console.log('[E2E Setup] Termos e Política aceitos.')

  // 3. Salva storage state com token no localStorage
  //    Playwright reutiliza esse estado em testes com storageState
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Navega para o frontend para ter o domínio correto no localStorage
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
  await page.goto(baseURL)

  // Injeta o token no localStorage (mesmo mecanismo que o authService.js usa).
  // Semeia também a escolha de cookies: sem ela o CookieConsentBanner (fixed,
  // bottom, zIndex 9100) cobre botões na borda inferior e o Playwright falha
  // com "intercepts pointer events". `declined` é a opção mais conservadora.
  await page.evaluate(([t, consentKey, consentValue]) => {
    localStorage.setItem('authToken', t)
    localStorage.setItem(consentKey, consentValue)
  }, [token, COOKIE_CONSENT_KEY, CONSENT_DECLINED])

  // Salva o storage state (localStorage + cookies)
  await context.storageState({ path: AUTH_STATE_PATH })
  console.log(`[E2E Setup] Storage state salvo em: ${AUTH_STATE_PATH}`)

  await browser.close()
}

export default globalSetup
