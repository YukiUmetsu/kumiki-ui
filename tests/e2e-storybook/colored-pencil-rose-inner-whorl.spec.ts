import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const ids=["rose-whorl-recess","rose-whorl-left","rose-whorl-right","rose-whorl-scroll"];

test("native CP-F1 rose central whorl A/B at 16:9 and 9:16 with truthful local zoom",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const paper=svg.locator("xpath=..");
  const scene=page.locator("[data-km-foundation-studio]");
  await expect(paper).toHaveCSS("overflow","hidden");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const whorl=page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const zoom=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(whorl).not.toBeChecked();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const baseline=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-inner-"+aspect+"-original-source.png")});
    await whorl.check();
    await expect(scene).toHaveAttribute("data-km-rose-inner-whorl","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(15);
    for(const id of ids){
      const parent=svg.locator('[data-km-pencil-region="'+id+'"]');
      await expect(parent).toHaveCount(1);
      await expect(parent.locator("[data-km-pencil-support]")).toHaveCount(1);
      await expect(parent.locator("[data-km-pencil-details] path")).toHaveCount(4);
    }
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    const native=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-inner-"+aspect+"-four-nested-petals-native.png")});
    expect(hash(native)).not.toBe(hash(baseline));
    for(const [option,region] of [
      ["rose-whorl-center","rose-whorl-scroll"],
      ["rose-whorl-recess","rose-whorl-recess"],
    ] as const){
      await focus.selectOption(option);
      await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus",region);
      await zoom.check();
      await paper.screenshot({animations:"disabled",
        path:info.outputPath("rose-inner-"+aspect+"-"+region+"-215pct-parent-crop.png")});
      await zoom.uncheck();
    }
    await focus.selectOption("default");
    await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
    await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).check();
    await page.getByRole("checkbox",{name:"Foundation rose pinnate leaves"}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(39);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-inner-"+aspect+"-combined39-native.png")});
    await page.getByRole("checkbox",{name:"Foundation rose pinnate leaves"}).uncheck();
    await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).uncheck();
    await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).uncheck();
    await whorl.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-inner-whorl","baseline");
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-inner-"+aspect+"-restored-source.png")});
    expect(hash(restored)).toBe(hash(baseline));
  }
  await whorl.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  const trace=svg.locator('[data-km-pencil-region="rose-whorl-scroll"] [data-km-pencil-details] path').first();
  await expect(trace).toHaveAttribute("stroke-dasharray","0.00000 1");
});

test("each original inner lamina has bounded physical fill rather than line-only pseudo depth",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose nested inner whorl"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const areas=await svg.evaluate((svg,partIds)=>{
    const out:{id:string;filled:number;minDimension:number}[]=[];
    for(const id of partIds){
      const path=svg.querySelector('[data-km-pencil-region="'+id+'"] path[data-km-pencil-support]') as SVGPathElement|null;
      if(!path){out.push({id,filled:0,minDimension:0});continue;}
      const b=path.getBBox();
      let filled=0;
      for(let row=0;row<31;row++)for(let col=0;col<31;col++){
        const p=new DOMPoint(b.x+(col+.5)*b.width/31,b.y+(row+.5)*b.height/31);
        if(path.isPointInFill(p))filled++;
      }
      out.push({id,filled,minDimension:Math.min(b.width,b.height)});
    }
    return out;
  },ids);
  for(const part of areas){
    expect(part.filled,part.id).toBeGreaterThan(55);
    expect(part.minDimension,part.id).toBeGreaterThan(10);
  }
});
