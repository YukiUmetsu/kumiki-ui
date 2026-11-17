import {test,expect} from "@playwright/test";

test("rose lamina native film: original source and four optical passes at both aspects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const checkbox=page.getByRole("checkbox",{name:"Foundation rose petal lamina fibres"});
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await expect(checkbox).toBeVisible();
  await expect(checkbox).toBeChecked();
  await expect(scene).toHaveAttribute("data-km-rose-lam-study","opt-in");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(28);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const withFibres=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-lamina-original-native.png")});
    await checkbox.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-lam-study","baseline");
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(0);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-baseline-original-native.png")});
    expect(before).not.toEqual(withFibres);
    await checkbox.check();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(28);
    expect(await svg.screenshot({animations:"disabled"})).toEqual(withFibres);
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-lamina-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
  }
  // Frame-addressed pigment cannot jump ahead of the pencil layering process.
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
    .toHaveCount(0);
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
    .toHaveCount(28);
});
