import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(buf:Buffer)=>createHash("sha256").update(buf).digest("hex");
const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";

test("FLORA1 rear-cup physical relief is a true reversible 16:9/9:16 image and 2.15x macro",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const scene=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folds=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const relief=page.getByRole("checkbox",{name:"Foundation rose rear cup relief"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(relief).toBeDisabled();
  await folds.check();
  await expect(relief).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const previous=await svg.screenshot({animations:"disabled",
      path:info.outputPath("crown-"+aspect+"-folds-before.png")});
    await relief.check();
    await expect(scene).toHaveAttribute("data-km-rose-back-cup-relief","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(16);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    await expect(svg.locator('[data-km-pencil-region="rose-turn-back-cup"] [data-km-pencil-details] path')).toHaveCount(5);
    expect(await svg.locator('[data-km-pencil-region="back-cup"] [data-km-pencil-details] path').count()).toBeGreaterThanOrEqual(6);
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("crown-"+aspect+"-physical-crest-after.png")});
    expect(hash(after)).not.toEqual(hash(previous));
    await focus.selectOption("rose-fold-back");
    await macro.check();
    await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus","rose-turn-back-cup");
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("crown-"+aspect+"-exposed-rear-underturn-215.png")});
    await macro.uncheck();
    await focus.selectOption("rose-crown-face");
    await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus","back-cup");
    await macro.check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("crown-"+aspect+"-front-scalloped-lip-215.png")});
    await macro.uncheck();
    await focus.selectOption("default");
    for(const name of ["Foundation rose nested inner whorl","Foundation rose middle cup",
      "Foundation rose frontal local values","Foundation rose physical rim thickness","Foundation rose calyx anatomy","Foundation rose pinnate leaves"])
      await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(44);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("crown-"+aspect+"-full44-cup-native.png")});
    for(const name of ["Foundation rose pinnate leaves","Foundation rose calyx anatomy",
      "Foundation rose physical rim thickness","Foundation rose frontal local values","Foundation rose middle cup","Foundation rose nested inner whorl"])
      await page.getByRole("checkbox",{name}).uncheck();
    await relief.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-back-cup-relief","baseline");
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("crown-"+aspect+"-restored-pixels.png")});
    expect(hash(restored)).toBe(hash(previous));
  }
  await relief.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(svg.locator('[data-km-pencil-region="rose-turn-back-cup"] [data-km-pencil-details] path').first())
    .toHaveAttribute("stroke-dasharray","0.00000 1");
  await folds.uncheck();
  await expect(relief).toBeDisabled();
  await expect(scene).toHaveAttribute("data-km-rose-back-cup-relief","baseline");
});

test("source-native rear cup underside has nonzero exposed area beyond the actual folded face",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose rear cup relief"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const area=await svg.evaluate(root=>{
    const underside=root.querySelector('[data-km-pencil-region="rose-turn-back-cup"] path[data-km-pencil-support]') as SVGPathElement|null;
    const front=root.querySelector('[data-km-pencil-region="back-cup"] path[data-km-pencil-support]') as SVGPathElement|null;
    if(!underside||!front)return {area:0,exposed:0};
    const box=underside.getBBox();
    let area=0,exposed=0;
    for(let row=0;row<43;row++)for(let col=0;col<43;col++){
      const p=new DOMPoint(box.x+(col+.5)*box.width/43,box.y+(row+.5)*box.height/43);
      if(underside.isPointInFill(p)){
        area++;
        if(!front.isPointInFill(p))exposed++;
      }
    }
    return {area,exposed};
  });
  expect(area.area).toBeGreaterThan(110);
  expect(area.exposed).toBeGreaterThan(50);
});
