import {test,expect} from "@playwright/test";

test("rose folded cuticle A/B survives both native aspect ratios and timeline",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const checkbox=page.getByRole("checkbox",{name:"Foundation rose rolled lip study"});
  await expect(checkbox).not.toBeChecked();
  await expect(scene).toHaveAttribute("data-km-rose-rolled-lip","baseline");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await page.getByRole("button",{name:/6\\. Burnish and visual audit/}).click();
    const sourceBefore=await svg.evaluate(node=>node.outerHTML);
    const baseline=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-original-source.png")});
    await checkbox.check();
    await expect(scene).toHaveAttribute("data-km-rose-rolled-lip","opt-in");
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]')).toHaveCount(21);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const studied=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-rolled-edge.png")});
    expect(studied.equals(baseline)).toBe(false);
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-rolled-edge-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
    await page.getByRole("button",{name:/3\\. Light value map/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]')).toHaveCount(21);
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]').first())
      .toHaveAttribute("stroke-dasharray","0.00000 1");
    await checkbox.uncheck();
    await page.getByRole("button",{name:/6\\. Burnish and visual audit/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lip-"]')).toHaveCount(0);
    expect(await svg.evaluate(node=>node.outerHTML)).toBe(sourceBefore);
  }
});
