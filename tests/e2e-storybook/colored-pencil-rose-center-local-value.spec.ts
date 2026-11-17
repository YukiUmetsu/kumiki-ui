import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const centers=[
  "inner-fold","rose-whorl-recess","rose-whorl-left",
  "rose-whorl-right","heart","rose-whorl-scroll",
] as const;

test("source-native rose center dry-value fields: 16:9 and 9:16 A/B, native 2.15× focal films, restored source parity and all 45 regions",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const studio=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const parent=page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"});
  const knot=page.getByRole("checkbox",{name:"Foundation rose center knot anatomy"});
  const value=page.getByRole("checkbox",{name:"Foundation rose central diffuse values"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const zoom=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(value).toBeDisabled();
  await parent.check();
  await expect(value).toBeDisabled();
  await knot.check();
  await expect(value).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    const baseline=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-central-values-"+aspect+"-prior-source.png")});
    await value.check();
    await expect(studio).toHaveAttribute("data-km-rose-center-value","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const id of centers){
      const region=svg.locator('[data-km-pencil-region="'+id+'"]');
      await expect(region.locator("[data-km-pencil-interior-details]")).toHaveCount(1);
      await expect(region.locator("[data-km-pencil-interior-details] path")).toHaveCount(6);
      await expect(region.locator("[data-km-pigment-layer]")).toHaveCount(3);
      await expect(region.locator("[data-km-pencil-support]")).toHaveCount(1);
      const clip=await region.locator("[data-km-pencil-interior-details]").getAttribute("clip-path");
      expect(clip).toMatch(/^url\(#.+-region-\d+\)$/);
    }
    const native=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-central-values-"+aspect+"-six-petals-soft-tonal.png")});
    expect(hash(native)).not.toBe(hash(baseline));
    for(const [focusName,part] of [
      ["rose-whorl-center","rose-whorl-scroll"],
      ["rose-whorl-recess","rose-whorl-recess"],
    ] as const){
      await focus.selectOption(focusName);
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",part);
      await zoom.check();
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-central-values-"+aspect+"-"+part+"-215pct.png")});
      await zoom.uncheck();
    }
    await focus.selectOption("default");
    for(const name of [
      "Foundation rose physical folds",
      "Foundation rose outer petal form colour",
      "Foundation rose frontal lamina volume",
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ])await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(45);
    await expect(svg.locator("[data-km-pencil-interior-details]")).toHaveCount(10);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-central-values-"+aspect+"-complete45-native.png")});
    for(const name of [
      "Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy",
      "Foundation rose middle cup",
      "Foundation rose rear cup relief",
      "Foundation rose physical rim thickness",
      "Foundation rose frontal local values",
      "Foundation rose frontal lamina volume",
      "Foundation rose outer petal form colour",
      "Foundation rose physical folds",
    ])await page.getByRole("checkbox",{name}).uncheck();
    await value.uncheck();
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-central-values-"+aspect+"-source-restored.png")});
    expect(hash(restored)).toBe(hash(baseline));
    await expect(studio).toHaveAttribute("data-km-rose-center-value","baseline");
  }
  await value.check();
  await knot.uncheck();
  await expect(value).not.toBeChecked();
  await expect(value).toBeDisabled();
  await knot.check();
  await value.check();
  await parent.uncheck();
  await expect(value).not.toBeChecked();
  await expect(knot).not.toBeChecked();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
});

test("source-clipped center shadow/mid/return respects original absolute frame f3/f6 and scrubs reversibly",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose center knot anatomy"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose central diffuse values"}).check();
  const interior=svg.locator('[data-km-pencil-region="rose-whorl-scroll"] [data-km-pencil-interior-details] path');
  await expect(interior).toHaveCount(6);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(interior.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(interior.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const finish=hash(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(hash(await svg.screenshot({animations:"disabled"}))).toBe(finish);
});
