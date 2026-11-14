import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
/** Range inputs cannot use Playwright fill(); update native value and dispatch React events. */
async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native input value setter unavailable");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}


/** Chromium can round the final RGB value by 1–2/255 on a handful of subpixel SVG edges.
 * Compare decoded pixels and refuse any substantive change, rather than treating PNG
 * byte identity as a physical render invariant. No additional image library is needed.
 */
async function expectStablePixels(page: Page, before: Buffer, after: Buffer) {
  const diff = await page.evaluate(async ({ first, second }) => {
    const decode = async (base64: string) => {
      const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([raw], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D unavailable for image comparison");
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return { width: canvas.width, height: canvas.height,
        rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
    };
    const a = await decode(first), b = await decode(second);
    if (a.width !== b.width || a.height !== b.height) return { sameSize: false,
      maxChannelDelta: 255, changedPixels: -1, totalPixels: a.width * a.height };
    let maxChannelDelta = 0, changedPixels = 0;
    for (let i = 0; i < a.rgba.length; i += 4) {
      let pixelMax = 0;
      for (let c = 0; c < 4; c++) pixelMax = Math.max(pixelMax, Math.abs(a.rgba[i + c] - b.rgba[i + c]));
      maxChannelDelta = Math.max(maxChannelDelta, pixelMax);
      if (pixelMax > 0) changedPixels++;
    }
    return { sameSize: true, maxChannelDelta, changedPixels, totalPixels: a.width * a.height };
  }, { first: before.toString("base64"), second: after.toString("base64") });
  expect(diff.sameSize, JSON.stringify(diff)).toBe(true);
  expect(diff.maxChannelDelta, JSON.stringify(diff)).toBeLessThanOrEqual(2);
  expect(diff.changedPixels, JSON.stringify(diff))
    .toBeLessThanOrEqual(Math.max(12, Math.ceil(diff.totalPixels * .0001)));
}

const story = "/iframe.html?id=video-film-looks--risograph-two-ink&viewMode=story";
const filmStory = "/iframe.html?id=video-film-looks--risograph-film&viewMode=story";
const frames = [0, 50, 135, 250] as const;

type Rect = { x: number; y: number; right: number; bottom: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect, tolerance = 1) =>
  a.x < b.right - tolerance && a.right > b.x + tolerance &&
  a.y < b.bottom - tolerance && a.bottom > b.y + tolerance;

for (const aspect of ["landscape", "portrait"] as const) {
  test("riso " + aspect + ": print composition, stamp glyph bounds, plates and frame capture", async ({ page }, info) => {
    await page.goto(story);
    if (aspect === "portrait") await page.getByRole("combobox", { name: "Aspect ratio" }).selectOption("portrait");
    await page.evaluate(() => document.fonts.ready);
    const stage = page.locator("svg[data-km-riso-print]");
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("viewBox", aspect === "portrait" ? "0 0 540 960" : "0 0 960 540");
    await expect(stage.locator("[data-km-riso-plate]")).toHaveCount(2);
    const stamp = stage.locator("[data-km-riso-stamp]");
    await expect(stamp).toHaveCount(1);

    const geometry = await stage.evaluate(svg => {
      const group = svg.querySelector("[data-km-riso-stamp]") as SVGGElement;
      const text = group.querySelector("text") as SVGTextElement;
      const border = group.querySelector("rect") as SVGRectElement;
      const textBox = text.getBBox(), borderBox = border.getBBox();
      const parent = svg.getBoundingClientRect();
      const toRect = (element: Element): Rect => {
        const b = element.getBoundingClientRect();
        return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
      };
      const labels = [...svg.querySelectorAll("text")].filter(x => x !== text);
      return {
        text: { x: textBox.x, y: textBox.y, width: textBox.width, height: textBox.height },
        border: { x: borderBox.x, y: borderBox.y, width: borderBox.width, height: borderBox.height },
        textOnPage: toRect(text),
        borderOnPage: toRect(border),
        stage: { x: parent.x, y: parent.y, right: parent.right, bottom: parent.bottom, width: parent.width, height: parent.height },
        otherLabels: labels.map(toRect),
      };
    });
    // The regression: "RISO / 02" previously extended beyond its right border.
    expect(geometry.text.x).toBeGreaterThanOrEqual(geometry.border.x + 5);
    expect(geometry.text.y).toBeGreaterThanOrEqual(geometry.border.y + 2);
    expect(geometry.text.x + geometry.text.width).toBeLessThanOrEqual(geometry.border.x + geometry.border.width - 5);
    expect(geometry.text.y + geometry.text.height).toBeLessThanOrEqual(geometry.border.y + geometry.border.height - 2);
    // Stamp should be clear of ALL other text labels, not only the title's guessed box.
    for (const label of geometry.otherLabels) {
      if (label.width < 1 || label.height < 1) continue;
      expect(overlaps(geometry.borderOnPage, label, 2), "Stamp overlaps a label").toBe(false);
    }
    expect(geometry.borderOnPage.x).toBeGreaterThanOrEqual(geometry.stage.x);
    expect(geometry.borderOnPage.right).toBeLessThanOrEqual(geometry.stage.right);
    expect(geometry.borderOnPage.bottom).toBeLessThanOrEqual(geometry.stage.bottom);
    expect(geometry.stage.height / geometry.stage.width).toBeCloseTo(aspect === "portrait" ? 16 / 9 : 9 / 16, 1);

    const slider = page.getByRole("slider", { name: "Printing sequence" });
    const snapshots: Buffer[] = [];
    for (const frame of frames) {
      await seek(slider, frame);
      await expect(slider).toHaveValue(String(frame));
      await expect(stage).toHaveAttribute("data-km-riso-frame", String(frame));
      const filename = "riso-" + aspect + "-" + String(frame).padStart(3, "0") + ".png";
      snapshots.push(await stage.screenshot({ animations: "disabled", path: info.outputPath(filename) }));
    }
    expect(snapshots[0]).not.toEqual(snapshots[1]);
    expect(snapshots[1]).not.toEqual(snapshots[2]);
    expect(snapshots[2]).not.toEqual(snapshots[3]);
    // Scene frame determinism: revisiting a prior absolute frame returns the same pixels.
    await seek(slider, 135);
    await expect(stage).toHaveAttribute("data-km-riso-frame", "135");
    const seekBack = await stage.screenshot({ animations: "disabled",
      path: info.outputPath("riso-" + aspect + "-135-return.png") });
    await expectStablePixels(page, snapshots[2], seekBack);
    await page.getByRole("button", { name: "Cobalt only" }).click();
    await expect(page.getByRole("button", { name: "Cobalt only" })).toHaveAttribute("aria-pressed", "true");
    await stage.screenshot({ path: info.outputPath("riso-" + aspect + "-blue-only.png") });
    await page.getByRole("button", { name: "Vermilion only" }).click();
    await stage.screenshot({ path: info.outputPath("riso-" + aspect + "-red-only.png") });
    await page.getByRole("checkbox", { name: "Reduced motion" }).check();
    await seek(slider, 0);
    // Reduced-motion state resolves all plates even when the author seeks to the initial frame.
    const count = await stage.locator('clipPath path').count();
    expect(count).toBe(2);
  });
}

test("Riso films reuse the existing three-shot FilmStage for both aspect ratios", async ({ page }, info) => {
  await page.goto(filmStory);
  await expect(page.locator("svg[data-km-riso-print]")).toBeVisible();
  const slider = page.getByRole("slider", { name: /Film frame/i });
  for (const f of [0, 110, 220, 389]) {
    await seek(slider, f);
    const svg = page.locator("svg[data-km-riso-print]");
    await svg.screenshot({ animations: "disabled", path: info.outputPath("riso-film-landscape-" + f + ".png") });
  }
  await page.getByRole("combobox", { name: "Output" }).selectOption("portrait");
  await expect(page.locator("svg[data-km-riso-print]")).toHaveAttribute("viewBox", "0 0 540 960");
  await seek(slider, 389);
  await page.locator("svg[data-km-riso-print]").screenshot({ animations: "disabled",
    path: info.outputPath("riso-film-portrait-final.png") });
});


test("native sheet feed uses FilmStage timeline, compares two different posters and remains seek-exact", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-film-looks--risograph-sheet-feed&viewMode=story");
  const slider = page.getByRole("slider", { name: "Film frame" });
  await expect(slider).toBeVisible();
  for (const aspect of ["landscape", "portrait"] as const) {
    if (aspect === "portrait") await page.getByRole("combobox", { name: "Output" }).selectOption("portrait");
    await seek(slider, 330);
    await expect(page.locator('[data-km-riso-sheet-feed]')).toHaveCount(0);
    await expect(page.locator('svg[data-km-riso-print]')).toHaveCount(1);
    await page.locator('svg[data-km-riso-print]').screenshot({
      path: info.outputPath("riso-" + aspect + "-before-feed.png"), animations: "disabled",
    });
    for (const frame of [420, 480, 530]) {
      await seek(slider, frame);
      await expect(page.locator('[data-km-riso-sheet-feed]')).toHaveCount(1);
      await expect(page.locator('[data-km-riso-sheet-feed]')).toHaveAttribute("data-km-riso-sheet-frame", String(frame - 390));
      await expect(page.locator('[data-km-riso-sheet-incoming]')).toHaveCount(1);
      await expect(page.locator('svg[data-km-riso-print]')).toHaveCount(2);
      await page.locator('[data-km-riso-sheet-feed]').screenshot({
        path: info.outputPath("riso-" + aspect + "-feed-" + frame + ".png"), animations: "disabled",
      });
    }
    const middle = await page.locator('[data-km-riso-sheet-feed]').screenshot({ animations: "disabled" });
    await seek(slider, 650);
    await expect(page.locator('[data-km-riso-sheet-feed]')).toHaveCount(0);
    await page.locator('svg[data-km-riso-print]').screenshot({
      path: info.outputPath("riso-" + aspect + "-after-feed.png"), animations: "disabled",
    });
    await seek(slider, 530);
    await expect(page.locator('[data-km-riso-sheet-feed]')).toHaveAttribute("data-km-riso-sheet-frame", "140");
    await expectStablePixels(page, middle,
      await page.locator('[data-km-riso-sheet-feed]').screenshot({ animations: "disabled",
        path: info.outputPath("riso-" + aspect + "-feed-530-return.png") }));
  }
});
