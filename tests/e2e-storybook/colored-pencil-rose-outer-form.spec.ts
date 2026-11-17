import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const sha=(buffer:Buffer)=>createHash("sha256").update(buffer).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("native 16:9/9:16 rose outer lamina softly coloured, source-bound, reversible A/B and two 2.15x macros",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const studio=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const fold=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const form=page.getByRole("checkbox",{name:"Foundation rose outer petal form colour"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(form).toBeDisabled();
  await fold.check();
  await expect(form).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-"+aspect+"-original-folds.png")});
    await form.check();
    await expect(studio).toHaveAttribute("data-km-rose-outer-form","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    for(const [side,control] of [
      ["outer-left","rose-outer-left"],
      ["outer-right","rose-outer-right"],
    ] as const){
      const region=svg.locator('[data-km-pencil-region="'+side+'"]');
      await expect(region.locator("[data-km-pencil-support]")).toHaveCount(1);
      await expect(region.locator("[data-km-pigment-layer]")).toHaveCount(3);
      const deposits=region.locator("[data-km-pencil-interior-details]");
      await expect(deposits).toHaveCount(1);
      await expect(deposits.locator("path")).toHaveCount(9);
      await expect(deposits).toHaveAttribute("clip-path",/url\(#.*region-/);
      await expect(svg.locator('[data-km-pencil-region="rose-turn-'+side+'"]')).toHaveCount(1);
      await focus.selectOption(control);
      await macro.check();
      await expect(studio).toHaveAttribute("data-km-foundation-inspection-focus",side);
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-outer-"+aspect+"-"+side+"-curve-value-215pct.png")});
      await macro.uncheck();
    }
    await focus.selectOption("default");
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-"+aspect+"-three-fields-each-native.png")});
    expect(sha(after)).not.toEqual(sha(before));
    const controls=[
      "Foundation rose frontal lamina volume",
      "Foundation rose frontal local values",
      "Foundation rose physical rim thickness",
      "Foundation rose rear cup relief",
      "Foundation rose nested inner whorl",
      "Foundation rose center knot anatomy",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ];
    for(const control of controls)
      await page.getByRole("checkbox",{name:control}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(45);
    await expect(svg.locator("[data-km-pencil-interior-details] path")).toHaveCount(36);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-"+aspect+"-all45-native.png")});
    for(const control of [...controls].reverse())
      await page.getByRole("checkbox",{name:control}).uncheck();
    await form.uncheck();
    await expect(studio).toHaveAttribute("data-km-rose-outer-form","baseline");
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-outer-"+aspect+"-restored-source.png")});
    expect(sha(restored)).toBe(sha(before));
  }
  await form.check();
  await fold.uncheck();
  await expect(form).toBeDisabled();
  await expect(form).not.toBeChecked();
  await expect(studio).toHaveAttribute("data-km-rose-outer-form","baseline");
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
});

test("outer petal optical deposits are deterministic on repeated seeks and remain inside physical faces",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose outer petal form colour"}).check();
  const deposits=svg.locator("[data-km-pencil-interior-details] path");
  await expect(deposits).toHaveCount(18);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(deposits.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(deposits.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const native=sha(await svg.screenshot({animations:"disabled"}));
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(sha(await svg.screenshot({animations:"disabled"}))).toBe(native);
});
