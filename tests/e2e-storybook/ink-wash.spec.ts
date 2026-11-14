import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, value) => {
    const input = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Cannot set range input");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

const path = "/iframe.html?id=video-ink-wash--chinese-ink-wash&viewMode=story";

for (const aspect of ["landscape", "portrait"] as const) {
  test("INK1 " + aspect + " visual proof: two artworks, staged brush onset and seek stability", async ({ page }, info) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    if (aspect === "portrait") await page.getByRole("combobox", { name: "Composition" }).selectOption("portrait");
    const slider = page.getByRole("slider", { name: "Scrub ink film" });
    const image = page.locator("svg[data-km-ink-wash]");
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("viewBox", aspect === "landscape" ? "0 0 960 540" : "0 0 540 960");

    for (const subject of ["landscape", "bamboo"] as const) {
      if (subject === "bamboo") await page.getByRole("combobox", { name: "Original subject" }).selectOption("bamboo");
      const images: Buffer[] = [];
      for (const frame of [0, 84, 181, 276, 395]) {
        await seek(slider, frame);
        await expect(image).toHaveAttribute("data-km-ink-frame", String(frame));
        images.push(await image.screenshot({
          animations: "disabled", path: info.outputPath("ink-" + aspect + "-" + subject + "-" + frame + ".png"),
        }));
      }
      expect(images[0]).not.toEqual(images[2]);
      expect(images[2]).not.toEqual(images[4]);
      await seek(slider, 181);
      const revisited = await image.screenshot({ animations: "disabled" });
      expect(revisited).toEqual(images[2]);
      await seek(slider, 395);
      await expect(image.locator("[data-km-ink-stroke]").first()).toBeVisible();
      await expect(image.locator("[data-km-ink-paper]")).toHaveCount(1);
    }
    await page.getByRole("checkbox", { name: /Reduced motion/ }).check();
    await seek(slider, 0);
    await expect(image.locator("[data-km-ink-stroke]").first()).toBeVisible();
    await image.screenshot({
      animations: "disabled", path: info.outputPath("ink-" + aspect + "-reduced-motion.png"),
    });
  });
}

test("INK1 preserves typography safe zones and pure paper-stage dimensions", async ({ page }) => {
  await page.goto(path);
  for (const aspect of ["landscape", "portrait"] as const) {
    if (aspect === "portrait") await page.getByRole("combobox", { name: "Composition" }).selectOption("portrait");
    const bounds = await page.locator("svg[data-km-ink-wash]").evaluate(svg => {
      const host = svg.parentElement!;
      const stage = svg.getBoundingClientRect();
      const texts = [...host.querySelectorAll("text")];
      return {
        stage: { width: stage.width, height: stage.height },
        textInside: texts.every(node => {
          const b = node.getBoundingClientRect();
          return b.left >= stage.left && b.right <= stage.right &&
            b.top >= stage.top && b.bottom <= stage.bottom;
        }),
      };
    });
    expect(bounds.textInside).toBe(true);
    expect(bounds.stage.height / bounds.stage.width).toBeCloseTo(aspect === "portrait" ? 16 / 9 : 9 / 16, 2);
  }
});
