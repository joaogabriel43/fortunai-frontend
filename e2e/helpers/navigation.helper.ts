import { Page, expect } from '@playwright/test'

/**
 * Aguarda dashboard estar completamente carregado:
 * URL contém /dashboard + texto "Patrimônio" visível.
 */
export async function waitForDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.getByText(/Patrimônio/i).first()).toBeVisible({ timeout: 10_000 })
}

/**
 * Aguarda Snackbar MUI com texto específico aparecer.
 * MUI Snackbar usa role="alert" internamente.
 */
export async function waitForToast(page: Page, text: string): Promise<void> {
  const toast = page.getByRole('alert').filter({ hasText: text })
  await expect(toast).toBeVisible({ timeout: 10_000 })
}
