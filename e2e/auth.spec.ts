import { test, expect } from '@playwright/test'
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  createTestUser,
  loginAs,
} from './helpers/auth.helper'

// Cenário 1 + 2 + 3 + 4 + 5: testes de autenticação
// Sem storageState — esses testes validam o próprio fluxo de auth

test.describe('Autenticação', () => {

  // ─── Cenário 1 — Registro de novo usuário ──────────────────────────────
  test('Cenário 1 — Registro de novo usuário', async ({ page }) => {
    const timestamp = Date.now()
    const email = `registro-${timestamp}@fortunai-test.com`
    const senha = `Registro${timestamp}!`

    await page.goto('/login')

    // Clica no link de cadastro
    await page.getByRole('link', { name: /Cadastre-se/i }).click()
    await expect(page).toHaveURL(/\/registrar/, { timeout: 5_000 })

    // Preenche o formulário de registro
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Senha').fill(senha)
    await page.getByRole('button', { name: /Criar conta|Registrar|Cadastrar/i }).click()

    // Após registro bem-sucedido, redireciona para login (com mensagem de sucesso)
    await expect(page.getByText(/sucesso|registrado/i).first()).toBeVisible({ timeout: 8_000 })
  })

  // ─── Cenário 2 — Login com credenciais válidas ──────────────────────────
  test('Cenário 2 — Login com credenciais válidas', async ({ page }) => {
    await loginAs(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)

    // Verifica que chegou ao dashboard com texto de patrimônio
    await expect(page).toHaveURL(/\/(dashboard|questionario)/, { timeout: 10_000 })

    // Se caiu no questionário, navega para o dashboard
    if (page.url().includes('questionario')) {
      await page.goto('/dashboard')
    }

    await expect(page.getByText(/Patrimônio/i).first()).toBeVisible({ timeout: 10_000 })
  })

  // ─── Cenário 3 — Login com credenciais inválidas ────────────────────────
  test('Cenário 3 — Login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Endereço de Email').fill('inexistente@fortunai-test.com')
    await page.getByLabel('Senha').fill('SenhaErrada123!')
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Mensagem de erro visível
    await expect(
      page.getByText(/inválido|incorreto|erro|Email ou senha/i).first()
    ).toBeVisible({ timeout: 8_000 })

    // URL permanece em /login
    await expect(page).toHaveURL(/\/login/)
  })

  // ─── Cenário 4 — Acesso a rota protegida sem auth ───────────────────────
  test('Cenário 4 — Acesso direto a rota protegida redireciona para /login', async ({ page }) => {
    // Acessa /dashboard sem nenhuma autenticação
    await page.goto('/dashboard')

    // ProtectedRoute deve redirecionar para /login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
    await expect(page.getByText('FortunAI').first()).toBeVisible()
  })

  // ─── Cenário 5 — Logout ──────────────────────────────────────────────────
  test('Cenário 5 — Logout redireciona para /login e protege rotas', async ({ page }) => {
    // Login via UI
    await loginAs(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)

    // Vai para o dashboard (pode ter caído no questionário)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

    // Abre o menu de usuário (avatar no Sidebar) — desktop
    const avatarButton = page.getByRole('button', { name: /Conta/i })
    await avatarButton.click()

    // Clica em "Sair"
    await page.getByRole('menuitem', { name: /Sair/i }).click()

    // Verifica redirect para /login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })

    // Tenta acessar /dashboard após logout → redirect para /login
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })
})
