import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";

const digest=(buffer:Buffer)=>createHash("sha256").update(buffer).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("native rose frontal value areas A/B, two aspect ratios, macro and all 42 anatomical regions",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const scene=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folds=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const volume=page.getByRole("checkbox",{name:"Foundation rose frontal local values"});
  await expect(volume).toBeDisabled();
  await folds.check();
  await expect(volume).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const zoom=page.getByRole("checkbox",{name:"Foundation inspect macro"});

  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-value-"+aspect+"-folded-no-local-plane.png")});
    await volume.check();
    await expect(scene).toHaveAttribute("data-km-rose-front-value","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const side of ["left","right"] as const){
      const petal=svg.locator('[data-km-pencil-region="petal-front-'+side+'"]');
      await expect(petal.locator("[data-km-pencil-interior-details]")).toHaveCount(1);
      await expect(petal.locator("[data-km-pencil-interior-details] path")).toHaveCount(9);
      await expect(petal.locator("[data-km-pencil-interior-details]"))
        .toHaveAttribute("clip-path",/url\(#.*region-/);
      await expect(petal.locator('[data-km-pencil-trace="rf-front-'+side+'-crease"]'))
        .toHaveCount(1);
    }
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-value-"+aspect+"-six-native-form-planes.png")});
    expect(digest(after)).not.toBe(digest(before));
    for(const [option,name] of [
      ["rose-front-left","front-left-local-value"],
      ["rose-front-right","front-right-local-value"],
    ] as const){
      await focus.selectOption(option);
      await zoom.check();
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-value-"+aspect+"-"+name+"-215pct.png")});
      await zoom.uncheck();
    }
    await focus.selectOption("default");
    for(const name of ["Foundation rose nested inner whorl",
      "Foundation rose middle cup","Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves"])
      await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(42);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-value-"+aspect+"-complete42.png")});
    for(const name of ["Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy","Foundation rose middle cup",
      "Foundation rose nested inner whorl"])
      await page.getByRole("checkbox",{name}).uncheck();
    await volume.uncheck();
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-value-"+aspect+"-folded-restored.png")});
    expect(digest(restored)).toBe(digest(before));
    await expect(scene).toHaveAttribute("data-km-rose-front-value","baseline");
  }
});

test("source-contained value marks follow absolute six-stage film and switch resets with physical folds",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folds=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const value=page.getByRole("checkbox",{name:"Foundation rose frontal local values"});
  await folds.check();
  await value.check();
  const all=svg.locator("[data-km-pencil-interior-details] path");
  await expect(all).toHaveCount(18);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(all.first()).toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(all.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  await folds.uncheck();
  await expect(value).not.toBeChecked();
  await expect(value).toBeDisabled();
  await expect(all).toHaveCount(0);
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
});
