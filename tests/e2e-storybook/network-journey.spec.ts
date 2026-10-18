import { expect, test, type Page } from "@playwright/test";

/**
 * Visual evidence gate, separate from the unit tests. Run:
 *   npx playwright test -c playwright.storybook.config.ts
 *
 * Actual Chrome/WebGL, fonts and display resolution are required. This file
 * does not certify cinematic aesthetics: inspected screenshots remain mandatory.
 */
const prefix = "explainers-a-messages-journey";

async function openStory(page: Page, name: string) {
  await page.goto(`/iframe.html?id=${prefix}--${name}&viewMode=story`);
  await expect(page.locator("[data-network-journey]")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test("phone shot shows a detailed readable Messages UI and no debug overlay", async ({ page }, testInfo) => {
  await openStory(page, "phone-screen-detail");
  const stage = page.locator('[data-journey-stage="phone"]');
  await expect(stage).toBeVisible();
  await expect(stage.locator("[data-network-phone-closeup]")).toBeVisible();
  await expect(stage.locator("canvas")).toBeVisible();
  await expect(stage.locator("[data-send-tap]")).toBeVisible();
  await stage.screenshot({ path: testInfo.outputPath("phone-message-app.png") });
});

test("DNS has an uncluttered lesson stage and no overlapping text bounds", async ({ page }, testInfo) => {
  await openStory(page, "dns-layout-detail");
  const svg = page.locator("svg[data-network-dns-lesson]");
  await expect(svg).toBeVisible();
  await expect(page.locator('[data-journey-stage="dns"]')).toBeVisible();
  await expect(page.locator("[data-network-annotation]")).toHaveCount(0);
  const collisions = await svg.evaluate(node => {
    const texts = Array.from(node.querySelectorAll<SVGTextElement>("text"))
      .filter(element => element.textContent?.trim() && Number(getComputedStyle(element).opacity || 1) > .05)
      .map(element => ({ text: element.textContent?.trim() ?? "", box: element.getBBox() }));
    const overlapping: string[] = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].box, b = texts[j].box;
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      // Ignore <2px antialiasing/tiny baseline contacts. Any meaningful text
      // collision blocks acceptance and includes both labels in the error.
      if (width > 2 && height > 2) overlapping.push(`${texts[i].text} ↔ ${texts[j].text}`);
    }
    return overlapping;
  });
  expect(collisions, "Text must have reserved, non-overlapping screen space").toEqual([]);
  await svg.screenshot({ path: testInfo.outputPath("dns-reserved-text-layout.png") });
});

test("crossfade uses one MG1 frame and two smoothly weighted stages", async ({ page }, testInfo) => {
  await openStory(page, "handoff-detail");
  const stages = page.locator("[data-journey-stage]");
  await expect(stages).toHaveCount(2);
  await expect(page.locator('[data-journey-stage="world"]')).toBeVisible();
  await expect(page.locator('[data-journey-stage="vt-phone"]')).toBeVisible();
  const weights = await stages.evaluateAll(nodes => nodes.map(node => Number(getComputedStyle(node).opacity)));
  expect(weights.reduce((total, value) => total + value, 0)).toBeCloseTo(1, 2);
  await page.locator("[data-journey-composition]").screenshot({ path: testInfo.outputPath("vt1-short-crossfade.png") });
});

test("protocol lesson exposes the complete conceptual OSI stack", async ({ page }, testInfo) => {
  await openStory(page, "seven-osi-layers");
  const svg = page.locator("svg[data-network-protocol-lesson]");
  await expect(svg).toBeVisible();
  for (const label of ["Application", "Presentation", "Session", "Transport", "Network", "Data link", "Physical"]) {
    await expect(svg.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await svg.screenshot({ path: testInfo.outputPath("seven-layer-teaching-scene.png") });
});

test("3D studio renders, and the browser reports no WebGL rendering error", async ({ page }, testInfo) => {
  await openStory(page, "studio-detail");
  await expect(page.locator('[data-journey-stage="world"] canvas')).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /3D preview|graphics context|frame failed/i })).toHaveCount(0);
  await page.locator("[data-journey-composition]").screenshot({ path: testInfo.outputPath("3d-studio-contact-supports.png") });
});
