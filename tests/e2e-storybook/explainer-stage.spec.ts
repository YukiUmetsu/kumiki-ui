import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 45_000 });

async function verifyBounds(page: import("@playwright/test").Page) {
  const stage = page.locator("[data-km-explainer-stage]");
  await expect(stage).toHaveAttribute("data-layout-status", "ready");
  const bounds = await stage.evaluate(root => {
    const subject = root.querySelector('[data-testid="protected-primary"]')!.getBoundingClientRect();
    const text = root.querySelector('[data-km-explainer-canvas] [data-km-explainer-text]:not([aria-hidden="true"])')!.getBoundingClientRect();
    const canvas = root.querySelector('[data-km-explainer-canvas]')!.getBoundingClientRect();
    const paragraph = root.querySelector('[data-km-explainer-canvas] [data-km-explainer-text]:not([aria-hidden="true"])')!;
    return { overlapX: Math.min(subject.right, text.right) - Math.max(subject.left, text.left),
      overlapY: Math.min(subject.bottom, text.bottom) - Math.max(subject.top, text.top),
      inside: text.left >= canvas.left && text.right <= canvas.right + 1 && text.top >= canvas.top && text.bottom <= canvas.bottom + 1,
      overflow: paragraph.scrollWidth > paragraph.clientWidth + 1,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      font: getComputedStyle(paragraph).fontSize,
    };
  });
  expect(bounds.overlapX <= 0 || bounds.overlapY <= 0).toBe(true);
  expect(bounds.inside).toBe(true);
  expect(bounds.overflow).toBe(false);
  expect(bounds.pageOverflow).toBe(false);
  return bounds;
}

test("reflows actual font metrics from landscape to portrait with no collisions", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/iframe.html?id=explainers-explainer-stage--responsive&viewMode=story");
  await verifyBounds(page);
  await expect(page.locator("[data-km-explainer-stage]")).toHaveAttribute("data-orientation", "landscape");
  await page.screenshot({ path: testInfo.outputPath("landscape.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-km-explainer-stage]")).toHaveAttribute("data-orientation", "portrait");
  await verifyBounds(page);
  await page.screenshot({ path: testInfo.outputPath("portrait.png"), fullPage: true });
  expect(errors).toEqual([]);
});
test("lays out CJK without losing essential characters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/iframe.html?id=explainers-explainer-stage--portrait-cjk&viewMode=story");
  await verifyBounds(page);
  await expect(page.locator("#essential-explanation")).toHaveAttribute("lang", "ja");
  expect(await page.locator("#essential-explanation").count()).toBe(1);
});
test("rechecks changed typography and font loading", async ({ page }) => {
  await page.goto("/iframe.html?id=explainers-explainer-stage--typography-and-content&viewMode=story");
  expect((await verifyBounds(page)).font).toBe("24px");
  await page.getByRole("button", { name: "Change typography" }).click();
  await expect(page.locator("#essential-explanation")).toHaveCSS("font-size", "32px");
  await page.evaluate(() => document.fonts.dispatchEvent(new Event("loadingdone")));
  expect((await verifyBounds(page)).font).toBe("32px");
});
test("shows a diagnostic and complete readable fallback for impossible layouts", async ({ page }) => {
  await page.goto("/iframe.html?id=explainers-explainer-stage--impossible-layout&viewMode=story");
  await expect(page.getByRole("alert")).toContainText("cannot fit");
  await expect(page.locator("[data-km-explainer-stage]")).toHaveAttribute("data-layout-status", "error");
  const text = page.locator("[data-km-explainer-fallback] [data-km-explainer-text]");
  await expect(text).toBeVisible();
  expect((await text.textContent())!.length).toBeGreaterThan(2000);
  await expect(page.locator('[data-km-explainer-canvas] [data-km-explainer-text]:not([aria-hidden="true"])')).toHaveCount(0);
});
