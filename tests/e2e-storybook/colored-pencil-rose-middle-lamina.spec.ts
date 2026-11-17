import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";

const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const ids=["rose-mid-left-shoulder","rose-mid-right-tuck","rose-mid-center-guard"];

test("native middle rose cup A/B, 1x/2.15x, 16:9/9:16 and 42-region compatibility",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const scene=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const middle=page.getByRole("checkbox",{name:"Foundation rose middle cup"});
  const zoom=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  await expect(middle).not.toBeChecked();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const baseline=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-middle-"+aspect+"-original.png")});
    await middle.check();
    await expect(scene).toHaveAttribute("data-km-rose-middle-cup","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(14);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const id of ids){
      const region=svg.locator('[data-km-pencil-region="'+id+'"]');
      await expect(region).toHaveCount(1);
      await expect(region.locator("[data-km-pencil-support]")).toHaveCount(1);
      await expect(region.locator("[data-km-pencil-details] path")).toHaveCount(4);
    }
    const updated=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-middle-"+aspect+"-three-actual-petals.png")});
    expect(hash(updated)).not.toBe(hash(baseline));
    for(const [value,region] of [
      ["rose-mid-left","rose-mid-left-shoulder"],
      ["rose-mid-right","rose-mid-right-tuck"],
    ] as const){
      await focus.selectOption(value);
      await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus",region);
      await zoom.check();
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-middle-"+aspect+"-"+region+"-215pct.png")});
      await zoom.uncheck();
    }
    await focus.selectOption("default");
    for(const name of ["Foundation rose nested inner whorl",
      "Foundation rose physical folds","Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves"])
      await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(42);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-middle-"+aspect+"-full42.png")});
    for(const name of ["Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy","Foundation rose physical folds",
      "Foundation rose nested inner whorl"])
      await page.getByRole("checkbox",{name}).uncheck();
    await middle.uncheck();
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-middle-"+aspect+"-restored.png")});
    expect(hash(restored)).toBe(hash(baseline));
  }
  await middle.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  const detail=svg.locator('[data-km-pencil-region="rose-mid-left-shoulder"] [data-km-pencil-details] path').first();
  await expect(detail).toHaveAttribute("stroke-dasharray","0.00000 1");
});

test("middle cup has genuine source-space SVG area, not painted line decorations",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose middle cup"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const areas=await svg.evaluate((root,parts)=>{
    return parts.map(id=>{
      const path=root.querySelector('[data-km-pencil-region="'+id+'"] path[data-km-pencil-support]') as SVGPathElement|null;
      if(!path)return {id,area:0,width:0};
      const b=path.getBBox();
      let area=0;
      for(let y=0;y<31;y++)for(let x=0;x<31;x++)
        if(path.isPointInFill(new DOMPoint(b.x+(x+.5)*b.width/31,b.y+(y+.5)*b.height/31)))
          area++;
      return {id,area,width:Math.min(b.width,b.height)};
    });
  },ids);
  for(const {id,area,width} of areas){
    expect(area,id).toBeGreaterThan(65);
    expect(width,id).toBeGreaterThan(12);
  }
});
