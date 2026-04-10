import { chromium, request as playwrightRequest } from '@playwright/test'
import path from 'path'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, createTestUser, getAuthToken } from './helpers/auth.helper'

const AUTH_STATE_PATH = path.join(__dirname, '.auth', 'user.json')
const BACKEND_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3333'

async function globalSetup() {
  console.log(`\n[E2E Setup] Registrando usuário: ${TEST_USER_EMAIL}`)

  // 1. Registra o usuário via API (ignora 409 se já existir entre retries)
  await createTestUser(TEST_USER_EMAIL, TEST_USER_PASSWORD)
  console.log('[E2E Setup] Usuário registrado (ou já existia).')

  // 2. Obtém token JWT via login API
  const token = await getAuthToken(TEST_USER_EMAIL, TEST_USER_PASSWORD)
  console.log('[E2E Setup] Token JWT obtido.')

  // 3. Salva storage state com token no localStorage
  //    Playwright reutiliza esse estado em testes com storageState
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Navega para o frontend para ter o domínio correto no localStorage
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
  await page.goto(baseURL)

  // Injeta o token no localStorage (mesmo mecanismo que o authService.js usa)
  await page.evaluate((t) => {
    localStorage.setItem('authToken', t)
  }, token)

  // Salva o storage state (localStorage + cookies)
  await context.storageState({ path: AUTH_STATE_PATH })
  console.log(`[E2E Setup] Storage state salvo em: ${AUTH_STATE_PATH}`)

  await browser.close()
}

export default globalSetup
