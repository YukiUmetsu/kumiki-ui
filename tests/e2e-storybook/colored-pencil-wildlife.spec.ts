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
    // Macros inspect real animated pencil geometry, never a replacement raster thumbnail.
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("wing");
    await expect(stage).toHaveAttribute("style", /scale\(2\.85\)/);
    await stage.locator("xpath=..").screenshot({ animations: "disabled",
      path: info.outputPath("pencil-wing-macro-" + aspect + ".png") });
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("breast");
    await expect(stage).toHaveAttribute("style", /scale\(3\.1\)/);
    await stage.locator("xpath=..").screenshot({ animations: "disabled",
      path: info.outputPath("pencil-breast-macro-" + aspect + ".png") });
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("foot");
    await expect(stage).toHaveAttribute("style", /scale\(4\.8\)/);
    await stage.locator("xpath=..").screenshot({ animations: "disabled",
      path: info.outputPath("pencil-foot-perch-macro-" + aspect + ".png") });
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("beak");
    await expect(stage).toHaveAttribute("style", /scale\(3\.2\)/);
    await stage.locator("xpath=..").screenshot({ animations: "disabled",
      path: info.outputPath("pencil-bill-macro-" + aspect + ".png") });
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("crown");
    await expect(stage).toHaveAttribute("style", /scale\(4\)/);
    await stage.locator("xpath=..").screenshot({ animations: "disabled",
      path: info.outputPath("pencil-crown-macro-" + aspect + ".png") });
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("eye");
    await expect(stage).toHaveAttribute("style", /scale\(3\.4\)/);
    await stage.locator("xpath=..").screenshot({ animations: "disabled",
      path: info.outputPath("pencil-eye-macro-" + aspect + ".png") });
    await page.getByRole("combobox", { name: "Wildlife inspection" }).selectOption("composition");
    const body = stage.locator('[data-km-pencil-region="kingfisher-torso"]');
    await expect(body).toBeVisible();
    await expect(stage.locator('[data-km-pencil-support="kingfisher-torso"]')).toHaveCount(1);
    const original = await body.evaluate(node => node.outerHTML);
    await expect(stage.locator('[data-km-pencil-region="copperbird-head"]')).toHaveCount(0);
    await expect(stage.locator('[data-km-pencil-region="kingfisher-beak"]')).toHaveCount(1);
    await seek(50);
    await seek(350);
    expect(await body.evaluate(node => node.outerHTML)).toBe(original);
  }
});
