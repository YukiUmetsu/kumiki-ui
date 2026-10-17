import { test } from "@playwright/test";

const OUT = "/private/var/folders/kn/148pypnd47n11h_vmhs6sjtw0000gn/T/opencode";

test("capture media sections for visual review", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/media");
  await page.getByRole("heading", { level: 1, name: "Media compositions" }).waitFor();
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-km-appearance", "light");
    document.documentElement.setAttribute("data-km-density", "comfortable");
  });
  await page.waitForTimeout(400);

  const golden = page.locator('[data-pattern-section="golden"]');
  await golden.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const gb = await golden.boundingBox();
  if (gb) {
    const half = Math.floor(gb.height / 2);
    await page.screenshot({
      path: `${OUT}/golden-top.png`,
      clip: { x: gb.x, y: gb.y, width: gb.width, height: half },
    });
    await page.screenshot({
      path: `${OUT}/golden-bottom.png`,
      clip: { x: gb.x, y: gb.y + half, width: gb.width, height: gb.height - half },
    });
  }

  const guides = page.locator('[data-pattern-section="guides"]');
  await guides.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const gd = await guides.boundingBox();
  if (gd) {
    await page.screenshot({
      path: `${OUT}/guides.png`,
      clip: { x: gd.x, y: gd.y, width: gd.width, height: Math.min(gd.height, 800) },
    });
  }

  const artboard = page.locator('[data-pattern-section="artboard"]');
  await artboard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const ab = await artboard.boundingBox();
  if (ab) {
    await page.screenshot({
      path: `${OUT}/artboard.png`,
      clip: { x: ab.x, y: ab.y, width: ab.width, height: Math.min(ab.height, 900) },
    });
  }
});
