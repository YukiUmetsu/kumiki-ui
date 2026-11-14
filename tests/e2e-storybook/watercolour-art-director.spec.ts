import { test, expect } from "@playwright/test";

const story = "/iframe.html?id=film-art-watercolour-art-director--heron-wetland-film&viewMode=story";

for (const output of ["landscape", "portrait"] as const) {
  test("WC9 watercolor illustration: "+output+" heron structure and production-frame art", async ({page}, info) => {
    await page.goto(story);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("combobox",{name:"Illustration output"}).selectOption(output);
    const svg = page.locator("svg[data-km-watercolour-illustration]");
    await expect(svg).toBeVisible();
    await expect(page.locator('[data-km-watercolour-part="great-blue-heron"]')).toHaveCount(1);
    await expect(page.locator('[data-km-watercolour-part="pupil"]')).toHaveCount(1);
    await expect(page.locator('[data-km-watercolour-part="near-leg"]')).toHaveCount(1);
    await expect(page.locator('[data-km-watercolour-part="folded-wing"]')).toHaveCount(1);
    await expect(page.locator("svg[data-km-wet-paper]")).toBeVisible();
    for (const f of [0, 135, 265, 359]) {
      await page.getByRole("button", {name:"Frame "+f, exact:true}).click();
      await expect(svg).toHaveAttribute("data-km-watercolour-illustration-frame", String(f));
      await svg.screenshot({animations:"disabled",path:info.outputPath(
        "wc9-"+output+"-frame-"+f+".png")});
    }
    await page.getByRole("button",{name:"Frame 265",exact:true}).click();
    const before = await svg.screenshot({animations:"disabled"});
    await page.getByRole("checkbox",{name:"Illustration fine detail"}).uncheck();
    await expect(page.locator('[data-km-watercolour-part="feather-barb-0"]')).toHaveCount(0);
    const after = await svg.screenshot({animations:"disabled"});
    expect(before.equals(after)).toBe(false);
    await page.getByRole("checkbox",{name:"Illustration fine detail"}).check();
    await expect(page.locator('[data-km-watercolour-part="feather-barb-0"]')).toHaveCount(1);
  });
}
