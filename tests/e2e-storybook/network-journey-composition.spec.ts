import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 300_000 });
const prefix = "/iframe.html?id=explainers-a-messages-journey--";

async function verifyWorld(page: Page) {
  await expect(page.locator("[data-network-journey]")).toBeVisible();
  const stage = page.locator('[data-journey-stage="world"] [data-km-explainer-stage]');
  await expect(stage).toHaveAttribute("data-layout-status", "ready", { timeout: 30_000 });
  await expect(page.locator("[data-journey-layout-diagnostic]")).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: /3D preview|graphics context|frame failed/i })).toHaveCount(0);
  const inspection = await stage.evaluate(root => {
    const text = root.querySelector<HTMLElement>('[data-km-explainer-text]:not([aria-hidden="true"])')!;
    const b = text.getBoundingClientRect(), canvas = root.querySelector("[data-km-explainer-canvas]")!.getBoundingClientRect();
    const collisions = [...root.querySelectorAll("[data-journey-protected]")].filter(subject => {
      const r = subject.getBoundingClientRect();
      return Math.min(b.right, r.right) - Math.max(b.left, r.left) > 1 && Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top) > 1;
    }).map(subject => subject.getAttribute("data-journey-protected"));
    return { collisions, protectedCount: root.querySelectorAll("[data-journey-protected]").length,
      inside: b.left >= canvas.left && b.right <= canvas.right + 1 && b.top >= canvas.top && b.bottom <= canvas.bottom + 1,
      textOverflow: text.scrollWidth > text.clientWidth + 1,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      fontSize: parseFloat(getComputedStyle(text).fontSize), text: text.textContent };
  });
  expect(inspection.collisions).toEqual([]);
  expect(inspection.protectedCount).toBeGreaterThan(0);
  expect(inspection.inside).toBe(true);
  expect(inspection.textOverflow).toBe(false);
  expect(inspection.pageOverflow).toBe(false);
  expect(inspection.fontSize).toBeGreaterThanOrEqual(16);
  expect(inspection.text!.length).toBeGreaterThan(20);
  return stage;
}

for (const aspect of ["landscape", "portrait"] as const) {
  test(`${aspect} protects subjects across all world lessons and former failure frames`, async ({ page }, testInfo) => {
    await page.setViewportSize(aspect === "portrait" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const frame of [207, 710, 892, 1265, 1405, 1448, 1515, 1915, 2340, 2360]) {
      await page.goto(`${prefix}constraint-composition&viewMode=story&args=initialFrame:${frame};initialAspect:${aspect}`);
      const stage = await verifyWorld(page);
      await expect(stage).toHaveAttribute("data-journey-caption-frame", String(frame));
      if ([1448, 1915, 2360].includes(frame)) await page.locator("[data-journey-composition]").screenshot({ path: testInfo.outputPath(`${aspect}-${frame}.png`) });
    }
    expect(errors).toEqual([]);
  });
}

test("frame playback and Director View retain the canvas element and measured composition", async ({ page }) => {
  await page.goto(`${prefix}constraint-composition&viewMode=story`);
  await verifyWorld(page);
  const canvas = await page.locator('[data-journey-stage="world"] canvas').elementHandle();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(async () => Number(await page.locator("[data-journey-caption-frame]").getAttribute("data-journey-caption-frame"))).toBeGreaterThan(1448);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await verifyWorld(page);
  expect(await canvas!.evaluate(node => node.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Director View", exact: true }).click();
  await verifyWorld(page);
  expect(await canvas!.evaluate(node => node.isConnected)).toBe(true);
});

test("offline and reduced-motion stories retain guarded readable world captions", async ({ page }) => {
  await page.goto(`${prefix}constraint-offline&viewMode=story`);
  await verifyWorld(page);
  await expect(page.locator('[data-journey-measured-caption]:not([aria-hidden="true"])')).toContainText("Recipient offline");
  await page.goto(`${prefix}constraint-reduced-motion&viewMode=story`);
  const stage = await verifyWorld(page);
  await expect(stage).toHaveAttribute("data-journey-caption-frame", "1500");
});
