import { expect, test } from "@playwright/test";
const root = "/iframe.html?id=video-production-film-looks-paper-craft--";

test("paper director keeps four chapters usable as stills with reduced motion", async ({ page }, info) => {
  await page.goto(root + "director&viewMode=story&args=aspect:portrait;medium:layered;reducedMotion:true");
  const stage = page.locator('svg[data-km-paper-director="material-paper-tour"]');
  await expect(page.getByRole("button", { name: "Play film" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Play film" })).toHaveCSS("cursor", "not-allowed", { timeout: 3000 });
  for (const [name, shot] of [["01 · Woodland", "woodland-light"], ["02 · Botanical", "botanical-wing"], ["03 · Canal houses", "city-layering"], ["04 · Camera", "constructed-device"]] as const) {
    const chapter = page.getByRole("button", { name, exact: true });
    await chapter.focus();
    await page.keyboard.press("Enter");
    await expect(stage).toHaveAttribute("data-km-paper-shot", shot, { timeout: 3000 });
    await expect(chapter).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-km-paper-curtain]")).toHaveCount(0);
  }
  await expect(page.getByRole("slider", { name: "Scrub complete paper film" })).toBeDisabled();
  await expect(page.getByText("Choose a chapter to view its still pose.")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: info.outputPath("director-reduced-desktop.png"), fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("director-reduced-mobile.png"), fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.goto(root + "director&viewMode=story&args=aspect:landscape;medium:layered;reducedMotion:true");
  await page.getByRole("button", { name: "02 · Botanical", exact: true }).click();
  await expect(stage).toHaveAttribute("data-km-paper-shot", "botanical-wing");
  await expect(page.locator("[data-km-paper-curtain]")).toHaveCount(0);
});

test("garden shows an assembled still without inactive motion controls", async ({ page }) => {
  await page.goto(root + "gallery&viewMode=story&args=aspect:landscape;reducedMotion:true");
  const stage = page.locator("svg[data-km-paper-craft]");
  await expect(stage).toBeVisible();
  await expect(page.getByRole("button", { name: "Play 8s film" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Play 8s film" })).toHaveCSS("cursor", "not-allowed", { timeout: 3000 });
  await expect(page.getByRole("button", { name: "Restart" })).toBeDisabled({ timeout: 3000 });
  await expect(page.getByRole("slider", { name: "Scrub film frame" })).toBeDisabled();
  await expect(page.getByText("Still assembled composition")).toBeVisible();
  await page.locator('[data-paper-medium-link="kirigami"]').click();
  await expect(stage).toHaveAttribute("data-km-paper-style", "kirigami");
});
