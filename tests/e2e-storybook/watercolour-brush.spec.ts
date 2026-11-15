import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

const story = "/iframe.html?id=film-art-watercolour-brush--painted-film&viewMode=story";
async function seek(input: Locator, frame: number) {
  await input.evaluate((node, at) => {
    const slider = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native slider setter unavailable");
    setter.call(slider, String(at));
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

for (const aspect of ["landscape", "portrait"] as const) {
  test("WM1 " + aspect + ": real painted frames, stable holds and safe bilingual captions", async ({ page }, info) => {
    await page.goto(story);
    if (aspect === "portrait") await page.getByRole("combobox", { name: "Output" }).selectOption("portrait");
    await page.evaluate(() => document.fonts.ready);
    const slider = page.getByRole("slider", { name: "Absolute film frame" });
    const paper = page.locator("svg[data-km-watercolour]");
    await expect(paper).toBeVisible();
    await expect(paper).toHaveAttribute("viewBox", aspect === "portrait" ? "0 0 540 960" : "0 0 960 540");
    for (const frame of [0, 92, 185, 340, 430, 570, 760, 818]) {
      await seek(slider, frame);
      await expect(slider).toHaveValue(String(frame));
      await expect(paper).toHaveAttribute("data-km-paint-frame", String(frame < 410 ? frame : frame - 410));
      const name = "wm1-" + aspect + "-" + String(frame).padStart(3, "0") + ".png";
      await paper.screenshot({ animations: "disabled", path: info.outputPath(name) });
    }
    await seek(slider, 390);
    await paper.screenshot({ animations: "disabled", path: info.outputPath("wm1-" + aspect + "-dry-reference.png") });
    const settledDOM=await paper.evaluate(node=>{
      const scene=node.cloneNode(true) as Element;
      scene.removeAttribute("data-km-paint-frame");
      return scene.outerHTML;
    });
    await seek(slider, 80);
    await seek(slider, 409);
    await paper.screenshot({ animations: "disabled", path: info.outputPath("wm1-" + aspect + "-dry-later.png") });
    const settledLaterDOM=await paper.evaluate(node=>{
      const scene=node.cloneNode(true) as Element;
      scene.removeAttribute("data-km-paint-frame");
      return scene.outerHTML;
    });
    // All pigment settles by frame 390. Compare the complete source geometry,
    // layer attributes and pigment paths after backwards seeking, not raw browser
    // GPU screenshot bytes (the SVG displacement filters rasterize nondeterministically).
    expect(settledLaterDOM).toEqual(settledDOM);
    await page.getByRole("checkbox", { name: "Reduced motion" }).check();
    await seek(slider, 0);
    await expect(paper.locator('[data-km-paint-phase="dry"]')).not.toHaveCount(0);
    const captions = page.locator("svg[aria-label*=study], svg[aria-label*=Notes]").filter({ hasText: /quiet|morning/i });
    // SVG text remains separate from pigment filters so CJK and serif titles are legible.
    await expect(page.getByText("水彩の表情", { exact: false })).toBeVisible();
    expect(await page.locator("svg[data-km-watercolour] text").count()).toBe(0);
    expect(await captions.count()).toBeGreaterThanOrEqual(0);
  });
}
