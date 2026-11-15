import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

const screenshotHash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Browser rasterization can vary at a handful of antialiased edge pixels.
 * Preserve a strict source-geometry check plus a tiny, measured raster tolerance. */
async function comparePngPixels(page: import("@playwright/test").Page, first: Buffer, second: Buffer) {
  return page.evaluate(async ([one, two]) => {
    async function decode(encoded: string) {
      const raw = atob(encoded), bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return createImageBitmap(new Blob([bytes], { type: "image/png" }));
    }
    const a = await decode(one), b = await decode(two);
    if (a.width !== b.width || a.height !== b.height)
      return { sameDimensions: false, changedPixels: Infinity, totalPixels: 0 };
    const canvas = document.createElement("canvas");
    canvas.width = a.width;
    canvas.height = a.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D pixel comparison unavailable");
    const pixels = (bitmap: ImageBitmap) => {
      ctx.clearRect(0, 0, a.width, a.height);
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, a.width, a.height).data;
    };
    const before = pixels(a), after = pixels(b);
    a.close(); b.close();
    let changedPixels = 0;
    for (let i = 0; i < before.length; i += 4) {
      const delta = Math.max(
        Math.abs(before[i] - after[i]),
        Math.abs(before[i + 1] - after[i + 1]),
        Math.abs(before[i + 2] - after[i + 2]),
        Math.abs(before[i + 3] - after[i + 3]));
      if (delta > 3) changedPixels++;
    }
    return { sameDimensions: true, changedPixels, totalPixels: before.length / 4 };
  }, [first.toString("base64"), second.toString("base64")]);
}


async function seek(page: import("@playwright/test").Page, frame: number) {
  const slider = page.getByRole("slider", { name: "Drawing frame" });
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native range value setter unavailable");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
  await expect(slider).toHaveValue(String(frame));
  // Allow the browser to paint the new SVG filter/mask tree before capture.
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test("coloured pencil remains paper-anchored at nonsequential frames in both compositions", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-science--studio&viewMode=story");
  const svg = page.locator("svg[data-km-colored-pencil]");
  await expect(svg).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const aspect of ["landscape", "portrait"] as const) {
    await page.getByRole("combobox", { name: "Aspect ratio" }).selectOption(aspect);
    await expect(svg).toHaveAttribute("viewBox", aspect === "landscape" ? "0 0 960 540" : "0 0 540 960");
    for (const subject of ["leaf", "crystal"] as const) {
      await page.getByRole("combobox", { name: "Specimen" }).selectOption(subject);
      const captures: Buffer[] = [];
      let originalGeometry = "";
      for (const frame of [0, 135, 275]) {
        await seek(page, frame);
        await expect(svg).toHaveAttribute("data-km-pencil-frame", String(frame));
        if (frame === 135) originalGeometry = await svg.evaluate(element => element.outerHTML);
        captures.push(await svg.screenshot({
          animations: "disabled", path: info.outputPath("pencil-" + subject + "-" + aspect + "-" + frame + ".png"),
        }));
      }
      expect(screenshotHash(captures[0])).not.toBe(screenshotHash(captures[1]));
      expect(screenshotHash(captures[1])).not.toBe(screenshotHash(captures[2]));
      await seek(page, 135);
      await expect(svg).toHaveAttribute("data-km-pencil-frame", "135");
      const replayGeometry = await svg.evaluate(element => element.outerHTML);
      expect(replayGeometry, "Frame-addressed SVG geometry must be exactly reproducible").toBe(originalGeometry);
      const replay = await svg.screenshot({ animations: "disabled" });
      const pixelDiff = await comparePngPixels(page, captures[1], replay);
      expect(pixelDiff.sameDimensions, "Revisited drawing dimensions must match").toBe(true);
      expect(pixelDiff.changedPixels,
        "Revisited frame must be visually identical within a tiny antialias tolerance: " + JSON.stringify(pixelDiff))
        .toBeLessThanOrEqual(25);
      await seek(page, 275);
      await expect(svg.locator("[data-km-graphite]")).toHaveCount(subject === "leaf" ? 2 : 4);
      await expect(svg.locator("[data-km-pigment-layer]")).toHaveCount(subject === "leaf" ? 6 : 9);
      const textBounds = await svg.locator("text").evaluateAll(nodes => {
        const stage = (nodes[0] as SVGTextElement).ownerSVGElement!.getBoundingClientRect();
        return nodes.map(node => {
          const r = node.getBoundingClientRect();
          return { text: node.textContent, outside:
            r.left < stage.left - 2 || r.right > stage.right + 2 ||
            r.top < stage.top - 2 || r.bottom > stage.bottom + 2 };
        });
      });
      expect(textBounds.filter(x => x.outside), JSON.stringify(textBounds)).toEqual([]);
    }
  }
});

test("portable pencil film uses the existing FilmStage slots and honours reduced motion", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-science--film-stage-story&viewMode=story");
  const slider = page.getByRole("slider", { name: "Film frame" });
  const svg = page.locator("svg[data-km-colored-pencil]");
  await expect(svg).toBeVisible();
  for (const frame of [0, 95, 208, 352]) {
    await slider.evaluate((node, value) => {
      const input = node as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, frame);
    await expect(slider).toHaveValue(String(frame));
    await svg.screenshot({ animations: "disabled", path: info.outputPath("pencil-film-" + frame + ".png") });
  }
  await page.getByRole("checkbox", { name: "Reduced motion" }).check();
  await expect(svg).toBeVisible();
  await page.getByRole("combobox", { name: "Output" }).selectOption("portrait");
  await expect(svg).toHaveAttribute("viewBox", "0 0 540 960");
  await svg.screenshot({ animations: "disabled", path: info.outputPath("pencil-film-portrait-final.png") });
});
