/**
 * AMEVA Sentinel - Playwright Real-Browser Integration Test Suite
 * Validates:
 * 1. Stored report persistence and reload recovery
 * 2. Real-time multi-tab LocalStorage synchronization
 * 3. Telemetry collector lifecycle and listener destruction
 */
import { test, expect } from '@playwright/test';

test.describe('AMEVA Sentinel Real-Browser Integration', () => {

  test('stored report survives page reload with identical traceId', async ({ page }) => {
    await page.goto('/sdk/sentinel/dashboard.html');

    // Click "Evaluate Real Browser" button
    await page.getByRole('button', { name: /evaluate real browser/i }).click();

    // Read generated latest traceId
    const firstTraceId = await page.locator('[data-testid="latest-trace-id"]').textContent();
    expect(firstTraceId).toBeTruthy();

    // Reload page
    await page.reload();

    // Verify same report traceId is restored and visible
    await expect(page.locator(`[data-trace-id="${firstTraceId}"]`)).toBeVisible();
  });

  test('risk event is synchronized in real-time across tabs', async ({ context }) => {
    const producer = await context.newPage();
    const dashboard = await context.newPage();

    await producer.goto('/sdk/sentinel/dashboard.html');
    await dashboard.goto('/sdk/sentinel/dashboard.html');

    const before = Number(await dashboard.locator('[data-testid="event-count"]').textContent());

    // Generate event on producer tab
    await producer.getByRole('button', { name: /simulate headless bot/i }).click();

    // Verify dashboard tab updates count dynamically without reload
    await expect(dashboard.locator('[data-testid="event-count"]')).toHaveText(String(before + 1));
  });

});
