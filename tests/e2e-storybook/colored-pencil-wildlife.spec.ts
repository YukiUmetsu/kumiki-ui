import { test, expect } from "@playwright/test";

test("wildlife animation preserves opaque bird parts under seek and aspect switches", async ({ page }, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-wildlife--illustrated-wildlife&viewMode=story");
  const stage = page.locator("svg[data-km-pencil-scene]");
  const slider = page.getByRole("slider", { name: "Wildlife frame" });
  await expect(stage).toBeVisible();
  const seek = async (frame: number) => {
    await slider.evaluate((node, value) => {
      const element = node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(element, String(value));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, frame);
    await expect(stage).toHaveAttribute("data-km-pencil-scene-frame", String(frame));
  };
  for (const aspect of ["landscape", "portrait"] as const) {
    await page.getByRole("combobox", { name: "Wildlife aspect" }).selectOption(aspect);
    await expect(stage).toHaveAttribute("viewBox", aspect === "landscape" ?
      "0 0 960 540" : "0 0 540 960");
    for (const frame of [0, 180, 291, 350]) {
      await seek(frame);
      await stage.screenshot({ animations: "disabled",
        path: info.outputPath("pencil-wildlife-" + aspect + "-" + frame + ".png") });
    }
    const body = stage.locator('[data-km-pencil-region="copperbird-torso"]');
    await expect(body).toBeVisible();
    await expect(stage.locator('[data-km-pencil-support="copperbird-torso"]')).toHaveCount(1);
    const original = await body.evaluate(node => node.outerHTML);
    await seek(50);
    await seek(350);
    expect(await body.evaluate(node => node.outerHTML)).toBe(original);
  }
});
