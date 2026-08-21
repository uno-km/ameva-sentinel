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
    await page.goto('/packages/dashboard/index.html');

    // Click "Evaluate Real Browser" button
    await page.getByRole('button', { name: /evaluate real browser/i }).click();

    // Read generated latest traceId
    const firstTraceId = await page.locator('[data-testid="latest-trace-id"]').textContent();
    expect(firstTraceId).toBeTruthy();

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify same report traceId is restored and visible
    await expect(page.locator(`[data-trace-id="${firstTraceId}"]`)).toBeVisible();
    await page.waitForLoadState('domcontentloaded');
  });

  test('risk event is synchronized in real-time across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const producer = await context.newPage();
    const dashboard = await context.newPage();

    try {
      await producer.goto('/packages/dashboard/index.html');
      await dashboard.goto('/packages/dashboard/index.html');

      const before = Number(await dashboard.locator('[data-testid="event-count"]').textContent());

      // Generate event on producer tab
      await producer.getByRole('button', { name: /simulate headless bot/i }).click();

      // Verify dashboard tab updates count dynamically without reload
      await expect(dashboard.locator('[data-testid="event-count"]')).toHaveText(String(before + 1));
    } finally {
      await producer.close().catch(() => {});
      await dashboard.close().catch(() => {});
      await context.close().catch(() => {});
    }
  });

  test('destroy() stops active telemetry collection and listener observation', async ({ page }) => {
    await page.goto('/tests/fixtures/telemetry-test.html');

    const before = await page.evaluate(() => {
      window.testTelemetry.start();
      return window.testTelemetry.snapshot();
    });

    await page.mouse.move(100, 100);
    await page.mouse.move(300, 300);

    const during = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    // Must strictly prove telemetry listener actually captured pointer events before destruction
    expect(during.pointerEventCount).toBeGreaterThan(before.pointerEventCount);

    // Destroy telemetry collector
    await page.evaluate(() => {
      window.testTelemetry.destroy();
    });

    const stoppedAt = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    await page.mouse.move(500, 500);
    await page.mouse.move(700, 700);

    const after = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    // Pointer event counter must not increase after destroy()
    expect(after.pointerEventCount).toBe(stoppedAt.pointerEventCount);
  });

});
