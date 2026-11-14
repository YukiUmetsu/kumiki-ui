import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native range setter unavailable");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}
async function pixelDistance(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([x, y]) => {
    const read = async (text: string) => {
      const binary = Uint8Array.from(atob(text), c => c.charCodeAt(0));
      const img = await createImageBitmap(new Blob([binary], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No Canvas 2D");
      ctx.drawImage(img, 0, 0); img.close();
      return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
    };
    const left = await read(x), right = await read(y);
    if (left.width !== right.width || left.height !== right.height)
      return { peak: 255, changed: left.data.length, total: left.data.length };
    let peak = 0, changed = 0;
    for (let i = 0; i < left.data.length; i += 4) {
      let diff = 0;
      for (let c = 0; c < 4; c++) diff = Math.max(diff, Math.abs(left.data[i + c] - right.data[i + c]));
      peak = Math.max(peak, diff);
      if (diff > 0) changed++;
    }
    return { peak, changed, total: left.data.length / 4 };
  }, [a.toString("base64"), b.toString("base64")] as [string, string]);
}
test("Ink brush FilmStage: two subjects, five tones, deterministic seek, and paper-space rendering", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-ink-brush--brush-studio-film&viewMode=story");
  await page.evaluate(() => document.fonts.ready);
  const slider = page.getByRole("slider", { name: "Ink film frame" });
  await expect(slider).toBeVisible();
  for (const aspect of ["landscape", "portrait"] as const) {
    if (aspect === "portrait") await page.getByRole("combobox", { name: "Output" }).selectOption("portrait");
    const stage = page.locator("svg[data-km-ink-brush]");
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("viewBox", aspect === "portrait" ? "0 0 540 960" : "0 0 960 540");
    const checkpoints = [0, 45, 135, 210, 279, 281, 365, 510, 599];
    for (const frame of checkpoints) {
      await seek(slider, frame);
      await expect(slider).toHaveValue(String(frame));
      await expect(stage).toHaveAttribute("data-km-ink-frame",
        String(frame < 95 ? frame : frame < 210 ? frame : frame < 280 ? frame : 
          frame < 375 ? frame - 280 : frame < 530 ? frame - 280 : frame - 280));
      await stage.screenshot({
        path: info.outputPath("ink-" + aspect + "-film-" + frame + ".png"),
        animations: "disabled",
      });
      if (frame === 0) await expect(stage.locator("[data-km-ink-stroke]")).toHaveCount(0);
      if (frame === 210) await expect(stage.locator("[data-km-ink-stroke]")).toHaveCount(15);
      if (frame === 599) await expect(stage.locator("[data-km-ink-stroke]")).toHaveCount(26);
    }
    await seek(slider, 135);
    const before = await stage.screenshot({ animations: "disabled" });
    await seek(slider, 599);
    await seek(slider, 135);
    const after = await stage.screenshot({ animations: "disabled",
      path: info.outputPath("ink-" + aspect + "-135-seek-return.png") });
    const distance = await pixelDistance(page, before, after);
    expect(distance.peak, JSON.stringify(distance)).toBeLessThanOrEqual(2);
    expect(distance.changed, JSON.stringify(distance)).toBeLessThanOrEqual(Math.ceil(distance.total * .0001));
    await seek(slider, 280);
    await page.getByRole("checkbox", { name: "Reduced motion" }).check();
    await expect(stage.locator("[data-km-ink-stroke]")).toHaveCount(26);
    await page.getByRole("checkbox", { name: "Reduced motion" }).uncheck();
  }
});
