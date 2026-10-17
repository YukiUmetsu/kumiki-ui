import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const recipes = [
  ["Shape to shape", 120], ["Diagram to diagram", 270], ["Diagram to equation", 420],
  ["Equation to code", 570], ["Assembly and disassembly", 870],
  ["Layout rearrangement", 1020], ["Scene with shared elements", 720],
] as const;

async function openStudy(page: Page) {
  await page.goto("/#/storyboard/transformation");
  await expect(page.getByRole("heading", { level: 1, name: "Visual transformation" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function film(page: Page) {
  return page.getByRole("img", { name: /^An idea in motion:/ });
}

async function expectIdentities(page: Page) {
  for (const semanticId of ["a", "b", "c"]) {
    const count = await film(page).locator(`g[data-semantic-id="${semanticId}"]`).count();
    expect(count, `${semanticId} remains present`).toBeGreaterThan(0);
    expect(count, `${semanticId} has at most two dissolve endpoint paints`).toBeLessThanOrEqual(2);
  }
}

test.describe("Visual transformation reference film", () => {
  test("captures all seven recipes and exact endpoints in both authored aspects and themes", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await openStudy(page);
    for (const aspect of ["Landscape", "Portrait"] as const) {
      await page.getByRole("button", { name: aspect, exact: true }).click();
      await expect(film(page)).toHaveAttribute("viewBox", aspect === "Portrait" ? "0 0 720 1280" : "0 0 1280 720");
      for (const theme of ["Theme A", "Theme B"] as const) {
        await page.getByRole("button", { name: theme, exact: true }).click();
        const prefix = `${aspect.toLowerCase()}-${theme.toLowerCase().replace(" ", "-")}`;
        const slider = page.getByRole("slider", { name: "Transformation frame" });
        for (const [key, frame] of [["Home", 0], ["End", 1259]] as const) {
          await slider.press(key);
          await expect(film(page)).toHaveAttribute("data-frame", String(frame));
          await expectIdentities(page);
          await film(page).screenshot({ path: testInfo.outputPath(`${prefix}-frame-${frame}.png`) });
        }
        for (const [recipe, frame] of recipes) {
          await page.getByRole("button", { name: recipe, exact: true }).click();
          await expect(film(page)).toHaveAttribute("data-frame", String(frame));
          await expectIdentities(page);
          await film(page).screenshot({ path: testInfo.outputPath(`${prefix}-frame-${frame}.png`) });
        }
      }
    }
    expect(errors).toEqual([]);
  });

  test("seeking returns identical pixels and keyboard increments one frame", async ({ page }, testInfo) => {
    await openStudy(page);
    await page.getByRole("button", { name: "Diagram to equation", exact: true }).click();
    const first = await film(page).screenshot({ path: testInfo.outputPath("seek-first-420.png") });
    await page.getByRole("button", { name: "Layout rearrangement", exact: true }).click();
    await page.getByRole("button", { name: "Diagram to equation", exact: true }).click();
    const repeated = await film(page).screenshot({ path: testInfo.outputPath("seek-repeat-420.png") });
    expect(repeated.equals(first), "returning to a frame paints identical pixels").toBe(true);
    const slider = page.getByRole("slider", { name: "Transformation frame" });
    await slider.press("Home");
    await slider.press("ArrowRight");
    await expect(film(page)).toHaveAttribute("data-frame", "1");
    await expect(slider).toHaveAttribute("aria-valuenow", "1");
    await expectIdentities(page);
  });

  test("renders opt-in mask and seeded particle strategies", async ({ page }, testInfo) => {
    await openStudy(page);
    const strategy = page.getByRole("combobox", { name: "First shape handoff" });
    await strategy.selectOption("mask-reveal");
    await expect(film(page)).toHaveAttribute("data-frame", "120");
    expect(await film(page).locator("clipPath, mask").count()).toBeGreaterThan(0);
    await film(page).screenshot({ path: testInfo.outputPath("shape-mask-reveal-120.png") });
    await strategy.selectOption("particle-handoff");
    await expect(film(page)).toHaveAttribute("data-frame", "120");
    await expect(film(page).locator('[data-visual-layer*="particle:"]')).toHaveCount(192);
    const first = await film(page).screenshot({ path: testInfo.outputPath("shape-particles-120.png") });
    await page.getByRole("slider", { name: "Transformation frame" }).press("End");
    await page.getByRole("button", { name: "Shape to shape", exact: true }).click();
    expect((await film(page).screenshot()).equals(first)).toBe(true);
  });

  test("renders at 390px and 200% zoom without horizontal overflow and has no axe violations", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await openStudy(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Portrait", exact: true }).click();
    await page.getByRole("button", { name: "Equation to code", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath("portrait-page-390.png"), fullPage: true });
    for (const zoom of [1, 2]) {
      await page.evaluate((value) => { document.body.style.zoom = String(value); }, zoom);
      await page.screenshot({ path: testInfo.outputPath(`portrait-page-390-zoom-${zoom}.png`), fullPage: true });
      const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
        overflowing: [...document.querySelectorAll("*")].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 || element.scrollWidth > element.clientWidth + 1)
          .slice(0, 15).map((element) => ({ tag: element.tagName, className: element.getAttribute("class"), text: element.textContent?.slice(0, 70), right: element.getBoundingClientRect().right, client: element.clientWidth, scroll: element.scrollWidth, position: getComputedStyle(element).position, overflow: getComputedStyle(element).overflow })),
      }));
      expect(widths.scroll, `horizontal overflow at 390px, zoom ${zoom}: ${JSON.stringify(widths.overflowing)}`).toBeLessThanOrEqual(widths.client + 1);
    }
    await page.evaluate(() => { document.body.style.zoom = "1"; });
    await page.addScriptTag({ path: path.join(process.cwd(), "node_modules/axe-core/axe.min.js") });
    for (const appearance of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.setAttribute("data-km-appearance", value); }, appearance);
      await page.getByRole("button", { name: appearance === "light" ? "Theme A" : "Theme B", exact: true }).click();
      await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (root: Element, options: unknown) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: string[] }> }> }> } }).axe;
        const results = await axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
        return results.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }));
      });
      expect(violations, `axe ${appearance}`).toEqual([]);
    }
  });

  test("resolves the destination under system reduced motion", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStudy(page);
    await expect(film(page)).toHaveAttribute("data-frame", "1259");
    await expect(page.getByText("Reduced motion is on; the final arrangement is shown.", { exact: false })).toBeVisible();
    await expectIdentities(page);
    await film(page).screenshot({ path: testInfo.outputPath("reduced-motion-destination.png") });
  });

  test("records actual playback rather than a sequence of stills", async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1200 },
      recordVideo: { dir: testInfo.outputPath("video"), size: { width: 1440, height: 1200 } } });
    const page = await context.newPage();
    await openStudy(page);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await film(page).scrollIntoViewIfNeeded();
    // The existing scrubber owns real requestAnimationFrame playback. Capture
    // the complete 42-second study, including all seven connected transitions.
    await expect(film(page)).toHaveAttribute("data-frame", "1259", { timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    const video = page.video();
    await context.close();
    await video?.saveAs(testInfo.outputPath("reference-playback.webm"));
    await testInfo.attach("actual-playback", { path: testInfo.outputPath("reference-playback.webm"), contentType: "video/webm" });
  });
});
