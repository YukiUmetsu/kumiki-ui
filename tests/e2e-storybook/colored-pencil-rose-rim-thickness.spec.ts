import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const sideIds=["rose-rim-front-left","rose-rim-front-right"] as const;

test("actual 16:9 and 9:16 film: two physically filled, uneven petal rims and restorable source A/B",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const studio=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const fold=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const thickness=page.getByRole("checkbox",{name:"Foundation rose physical rim thickness"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(thickness).toBeDisabled();
  await fold.check();
  await expect(thickness).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const original=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-rim-"+aspect+"-folded-original.png")});
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await thickness.check();
    await expect(studio).toHaveAttribute("data-km-rose-petal-rim","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(18);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const [side,focusValue] of [
      ["left","rose-rim-left"],["right","rose-rim-right"],
    ] as const){
      const rim=svg.locator('[data-km-pencil-region="rose-rim-front-'+side+'"]');
      await expect(rim.locator('path[data-km-pencil-support]')).toHaveCount(1);
      await expect(rim.locator('[data-km-pencil-details] path')).toHaveCount(4);
      await expect(rim.locator('[data-km-pigment-layer]')).toHaveCount(3);
      // The new physical lip is behind no bitmap or text overlay and
      // shares its precise physical hinge with the source front face.
      const area=await rim.locator('path[data-km-pencil-support]').evaluate(path=>{
        const p=path as SVGPathElement;
        const box=p.getBBox();let inside=0;
        for(let y=0;y<31;y++)for(let x=0;x<31;x++){
          if(p.isPointInFill(new DOMPoint(
            box.x+(x+.5)*box.width/31,box.y+(y+.5)*box.height/31)))inside++;
        }
        return {inside,width:box.width,height:box.height};
      });
      expect(area.width).toBeGreaterThan(50);
      expect(area.height).toBeGreaterThan(19);
      expect(area.inside,"actual closed nonzero-area cuticle wall "+side)
        .toBeGreaterThan(20);
      await focus.selectOption(focusValue);
      await macro.check();
      await expect(studio).toHaveAttribute(
        "data-km-foundation-inspection-focus","rose-rim-front-"+side);
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-rim-"+aspect+"-"+side+"-physical-wall-215pct.png")});
      await macro.uncheck();
    }
    await focus.selectOption("default");
    const changed=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-rim-"+aspect+"-both-walls-native.png")});
    expect(digest(changed)).not.toBe(digest(original));
    for(const name of [
      "Foundation rose frontal local values",
      "Foundation rose nested inner whorl",
      "Foundation rose middle cup",
      "Foundation rose calyx anatomy",
      "Foundation rose pinnate leaves",
    ])
      await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(44);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-rim-"+aspect+"-complete-44-organs-native.png")});
    for(const name of [
      "Foundation rose pinnate leaves",
      "Foundation rose calyx anatomy",
      "Foundation rose middle cup",
      "Foundation rose nested inner whorl",
      "Foundation rose frontal local values",
    ])
      await page.getByRole("checkbox",{name}).uncheck();
    await thickness.uncheck();
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-rim-"+aspect+"-original-restored.png")});
    expect(digest(restored)).toBe(digest(original));
    await expect(studio).toHaveAttribute("data-km-rose-petal-rim","baseline");
  }
  await thickness.check();
  await fold.uncheck();
  await expect(thickness).not.toBeChecked();
  await expect(thickness).toBeDisabled();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(11);
});

test("paper-locked sidewall contacts are chronological and 100% deterministic under seeks",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose physical rim thickness"}).check();
  const traces=svg.locator('[data-km-pencil-region^="rose-rim-"] [data-km-pencil-details] path');
  await expect(traces).toHaveCount(8);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  for(const id of sideIds)
    await expect(svg.locator('[data-km-pencil-region="'+id+'"] [data-km-pencil-details] path').first())
      .toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(traces.first()).toHaveAttribute("stroke-dasharray","1.00000 1");
  const complete=await svg.screenshot({animations:"disabled"});
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  expect(digest(await svg.screenshot({animations:"disabled"}))).toBe(digest(complete));
});
