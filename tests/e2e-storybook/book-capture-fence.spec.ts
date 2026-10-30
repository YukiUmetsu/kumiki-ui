import { expect, test } from "@playwright/test";

// Uses the actual Three.js canvas; a flat fallback must fail this GPU test.
test("book export waits for drawn frames on reverse and repeated seeks", async ({ page }, info) => {
  const base = process.env.KUMIKI_STORYBOOK_BASE_URL ?? "http://127.0.0.1:6006";
  await page.goto(`${base}/iframe.html?id=video-cinematic-templates--epic-book&viewMode=story&kmExport=1`);
  await page.waitForFunction(() => typeof window.__kmVideoExport?.seek === "function");
  const book = page.locator("[data-km-book-frame]");
  const canvas = book.locator("[data-km-book-canvas]");
  const captures = new Map<number, Buffer>();
  for (const frame of [80, 4, 80, 240, 4]) {
    await page.evaluate(async target => { await window.__kmVideoExport!.seek(target); }, frame);
    await expect(book).toHaveAttribute("data-km-book-frame", String(frame));
    await expect(canvas).toHaveAttribute("data-km-gl-frame", String(frame));
    const png = await canvas.screenshot({ path: info.outputPath(`book-${frame}-${captures.size}.png`) });
    const prior = captures.get(frame);
    if (prior) expect(png.equals(prior), `Repeated seek to ${frame} changed the canvas`).toBe(true);
    captures.set(frame, png);
  }
  expect(captures.get(80)!.equals(captures.get(240)!), "Page-turn action did not change the rendered pixels").toBe(false);
});
