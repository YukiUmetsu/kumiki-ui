import { expect, test } from "@playwright/test";

test("real Blender rigid-body Storybook clip scrubs and shares camera/light controls", async ({ page }, info) => {
  await page.goto("/iframe.html?id=craft-blender-asset-bridge--blender-simulated-fastener-drop&viewMode=story");
  const canvas = page.locator("[data-km-hero-viewer] canvas");
  await expect(canvas).toHaveAttribute("data-km-hero-ready", "true", { timeout: 60_000 });
  await expect(page.getByText("Blender 4.5.15 simulated 12 falling metal fasteners", { exact: false })).toBeVisible();
  const scrub = page.getByLabel("Physical animation frame");
  await scrub.focus();
  await scrub.press("Home");
  await expect(page.getByLabel("Physical animation position")).toHaveText("0 / 120");
  const start = await canvas.screenshot({ path: info.outputPath("blender-physics-start.png") });
  await scrub.press("End");
  await expect(page.getByLabel("Physical animation position")).toHaveText("120 / 120");
  const landed = await canvas.screenshot({ path: info.outputPath("blender-physics-landed.png") });
  expect(landed.equals(start), "real Blender frames must change rendered WebGL pixels").toBe(false);

  const camera = page.getByLabel("Camera and lighting inspector");
  await expect(camera.getByLabel("Camera zoom")).toBeVisible();
  await expect(camera.getByLabel("Camera height")).toBeVisible();
  await camera.getByRole("button", { name: "Top" }).click();
  const topView = await canvas.screenshot({ path: info.outputPath("blender-physics-top.png") });
  expect(topView.equals(landed), "shared camera controls must change the rendered shot").toBe(false);
  await expect(camera.getByLabel("Brightness / exposure")).toBeVisible();
  await expect(page.locator("[role=alert]")).toHaveCount(0);
});
