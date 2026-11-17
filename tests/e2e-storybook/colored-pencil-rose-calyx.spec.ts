import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(x:Buffer)=>createHash("sha256").update(x).digest("hex");

test("rose five-sepal calyx native A/B proof for both film formats",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const checkbox=page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"});
  await expect(checkbox).not.toBeChecked();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    await expect(svg).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    const before=await svg.evaluate(node=>node.outerHTML);
    const base=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-legacy-calyx.png")});
    await checkbox.check();
    await expect(scene).toHaveAttribute("data-km-rose-calyx-study","opt-in");
    await expect(svg.locator('[data-km-pencil-region^="calyx-"]')).toHaveCount(6);
    await expect(svg.locator('[data-km-pencil-region="calyx-receptacle"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-pencil-region="sepal"]')).toHaveCount(0);
    await expect(svg.locator('[data-km-pencil-region]')).toHaveCount(16);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-five-sepal-native.png")});
    expect(hash(after)).not.toBe(hash(base));
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-five-sepal-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
    await checkbox.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-calyx-study","baseline");
    expect(await svg.evaluate(node=>node.outerHTML)).toBe(before);
  }
  await checkbox.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(svg.locator('[data-km-pencil-region^="calyx-"]')).toHaveCount(6);
  await expect(svg.locator('[data-km-pencil-region^="calyx-"] [data-km-pencil-details] path').first())
    .toHaveAttribute("stroke-dasharray","0.00000 1");
});


/** Actual browser source geometry, not a disconnected star diagram:
 * each of five native sepal beginnings must be planted within the same
 * source receptacle fill. Inks cannot fake a missing physical joint. */
test("five native sepal bases attach within the actual rose receptacle fill",async({page})=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const proof=await page.locator("svg[data-km-colored-pencil]").evaluate(svg=>{
    const receptor=svg.querySelector(
      '[data-km-pencil-region="calyx-receptacle"] [data-km-pencil-support]') as SVGPathElement|null;
    const ids=["calyx-sepal-far-left","calyx-sepal-far-right",
      "calyx-sepal-near-left","calyx-sepal-near-right","calyx-sepal-axial"];
    const detached:string[]=[];
    for(const id of ids){
      const organ=svg.querySelector(
        '[data-km-pencil-region="'+id+'"] [data-km-pencil-support]') as SVGPathElement|null;
      if(!receptor||!organ||
        !receptor.isPointInFill(organ.getPointAtLength(0)))detached.push(id);
    }
    return {attached:ids.length-detached.length,detached};
  });
  expect(proof).toEqual({attached:5,detached:[]});
});
