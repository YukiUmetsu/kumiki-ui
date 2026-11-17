import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const petals=["outer-left","outer-right","back-cup","petal-front-left","petal-front-right"];

test("native 16:9 and 9:16 rose corolla: five source contour changes and opaque physical abaxial surfaces",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const scene=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const volume=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  await expect(volume).not.toBeChecked();
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const zoom=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    const baseline=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-pre-fold-source.png")});
    await volume.check();
    await expect(scene).toHaveAttribute("data-km-rose-physical-folds","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator('[data-km-pencil-region^="rose-turn-"]')).toHaveCount(5);
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const altered=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-five-abaxial-surfaces-native.png")});
    expect(digest(altered)).not.toBe(digest(baseline));
    for(const [option,key,name] of [
      ["rose-fold-left","rose-turn-outer-left","left-outer"],
      ["rose-fold-right","rose-turn-petal-front-right","front-right"],
      ["rose-fold-back","rose-turn-back-cup","back-cup"],
    ] as const){
      await focus.selectOption(option);
      await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus",key);
      await zoom.check();
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-"+aspect+"-"+name+"-fold-215pct.png")});
      await zoom.uncheck();
    }
    await focus.selectOption("default");
    // All three previous opt-ins remain independent. These physical surfaces
    // are additional botanical regions, not a photograph or replacement stage.
    await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).check();
    await page.getByRole("checkbox",{name:"Foundation rose pinnate leaves"}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(35);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-full-foliage-calyx-corolla-native.png")});
    await page.getByRole("checkbox",{name:"Foundation rose pinnate leaves"}).uncheck();
    await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).uncheck();
    await volume.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-physical-folds","baseline");
    // React may reorder equivalent SVG attributes on a re-render.
    // Verify actual original film output instead of attribute serialization.
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-restored-source.png")});
    expect(digest(restored)).toBe(digest(baseline));
  }
  await volume.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(svg.locator('[data-km-pencil-region^="rose-turn-"]')).toHaveCount(5);
  await expect(svg.locator('[data-km-pencil-region="rose-turn-outer-left"] [data-km-pencil-details] path').first())
    .toHaveAttribute("stroke-dasharray","0.00000 1");
});

test("physical underturns have truly visible filled lamina beyond their parent face — not just a line",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const actual=await svg.evaluate((svg,petals)=>{
    const result:{id:string;visible:number;inside:number;details:number}[]=[];
    for(const id of petals){
      const back=svg.querySelector('[data-km-pencil-region="rose-turn-'+id+'"] path[data-km-pencil-support]') as SVGPathElement|null;
      const face=svg.querySelector('[data-km-pencil-region="'+id+'"] path[data-km-pencil-support]') as SVGPathElement|null;
      const strokes=svg.querySelectorAll('[data-km-pencil-region="rose-turn-'+id+'"] [data-km-pencil-details] path');
      if(!back||!face){result.push({id,visible:0,inside:0,details:0});continue;}
      const box=back.getBBox();
      let inside=0,visible=0;
      for(let y=0;y<31;y++)for(let x=0;x<31;x++){
        const pt=new DOMPoint(box.x+box.width*(x+.5)/31,box.y+box.height*(y+.5)/31);
        if(back.isPointInFill(pt)){
          inside++;
          if(!face.isPointInFill(pt))visible++;
        }
      }
      result.push({id,visible,inside,details:strokes.length});
    }
    return result;
  },petals);
  expect(actual).toHaveLength(5);
  for(const shape of actual){
    expect(shape.inside,shape.id+" must have real physical area").toBeGreaterThan(80);
    expect(shape.visible,shape.id+" must remain uncovered by front lamina").toBeGreaterThan(22);
    expect(shape.details,shape.id+" must have four native optical traces").toBe(4);
  }
});
