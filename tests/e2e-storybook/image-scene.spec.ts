import { test, expect } from "@playwright/test";

test("real photographic mesh supports source comparison, deterministic seek and inspection controls", async ({ page }) => {
  await page.goto('/iframe.html?id=craft-image-scene--real-photographs&viewMode=story');
  const canvas = page.locator('[data-km-camera-viewport-3d] canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('img', { name: /held-out photograph/ })).toHaveCount(3);
  await expect(page.locator('[data-km-physical-lights="false"]')).toBeVisible();
  await page.waitForFunction(() => !!window.__kmVideoExport);
  await page.evaluate(() => window.__kmVideoExport!.seek(90));
  const first = await canvas.screenshot();
  await page.evaluate(() => window.__kmVideoExport!.seek(5));
  await page.evaluate(() => window.__kmVideoExport!.seek(90));
  expect(await canvas.screenshot()).toEqual(first);
  for (const preset of ['Orbit', 'Oblique']) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    await page.evaluate(() => window.__kmVideoExport!.seek(179));
    await expect(page.locator('[data-camera-frame="179"]')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Geometry only', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Geometry only' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Geometry only', exact: true }).click();
  await page.screenshot({ path: 'artifacts/image-scene/story-landscape.png', fullPage: true });
  await page.getByRole('button', { name: 'Portrait', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__kmVideoExport?.manifest.height)).toBe(1920);
  await page.evaluate(() => window.__kmVideoExport!.seek(90));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => canvas.evaluate(element => { const viewport = element.closest('[data-km-video-capture]')!.parentElement!.parentElement!; return Math.abs(element.getBoundingClientRect().width - viewport.getBoundingClientRect().width); })).toBeLessThan(2);
  await page.screenshot({ path: 'artifacts/image-scene/story-portrait-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.locator('[data-camera-frame="179"]')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
