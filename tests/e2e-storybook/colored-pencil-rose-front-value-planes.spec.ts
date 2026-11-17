import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";

const story="/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const atlas=[
  ["rose-front-left-cool-core","petal-front-left","cast-shadow"],
  ["rose-front-left-warm-bounce","petal-front-left","glaze"],
  ["rose-front-right-cool-core","petal-front-right","cast-shadow"],
  ["rose-front-right-warm-bounce","petal-front-right","glaze"],
] as const;

test("native original vs four dry pigment area overlays vs restored, both aspect ratios and source macro",async({page},info)=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  const scene=page.locator("[data-km-foundation-studio]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const folds=page.getByRole("checkbox",{name:"Foundation rose physical folds"});
  const value=page.getByRole("checkbox",{name:"Foundation rose front value planes"});
  const focus=page.getByRole("combobox",{name:"Foundation inspection focus"});
  const macro=page.getByRole("checkbox",{name:"Foundation inspect macro"});
  await expect(value).toBeDisabled();
  await folds.check();
  await expect(value).toBeEnabled();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    const original=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-values-"+aspect+"-folds-only.png")});
    await value.check();
    await expect(scene).toHaveAttribute("data-km-rose-front-value","opt-in");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(20);
    await expect(svg.locator("image,foreignObject,feImage")).toHaveCount(0);
    for(const [id,parent] of atlas){
      const overlay=svg.locator('[data-km-pencil-region="'+id+'"]');
      await expect(overlay).toHaveCount(1);
      await expect(overlay.locator("[data-km-pencil-support]")).toHaveCount(0);
      await expect(overlay.locator("[data-km-pencil-craft-base]")).toHaveCount(0);
      await expect(overlay.locator("[data-km-pigment-layer]")).toHaveCount(3);
      await expect(overlay.locator("[data-km-pencil-details] path")).toHaveCount(2);
      const pIndex=await svg.locator("[data-km-pencil-region]").evaluateAll((regions,pair)=>
        [regions.findIndex(r=>r.getAttribute("data-km-pencil-region")===pair[0]),
         regions.findIndex(r=>r.getAttribute("data-km-pencil-region")===pair[1])],
      [id,parent]);
      expect(pIndex[0]).toBeGreaterThan(pIndex[1]);
    }
    const rendered=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-values-"+aspect+"-transparent-pigment.png")});
    expect(hash(rendered)).not.toBe(hash(original));
    for(const [option,id] of [
      ["rose-value-left","rose-front-left-cool-core"],
      ["rose-value-right","rose-front-right-cool-core"],
    ] as const){
      await focus.selectOption(option);
      await expect(scene).toHaveAttribute("data-km-foundation-inspection-focus",id);
      await macro.check();
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("rose-values-"+aspect+"-"+id+"-215pct.png")});
      await macro.uncheck();
    }
    await focus.selectOption("default");
    for(const name of [
      "Foundation rose calyx anatomy","Foundation rose pinnate leaves",
      "Foundation rose nested inner whorl","Foundation rose middle cup",
    ])await page.getByRole("checkbox",{name}).check();
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(46);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-values-"+aspect+"-combined46-native.png")});
    for(const name of [
      "Foundation rose middle cup","Foundation rose nested inner whorl",
      "Foundation rose pinnate leaves","Foundation rose calyx anatomy",
    ])await page.getByRole("checkbox",{name}).uncheck();
    await value.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-front-value","baseline");
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-values-"+aspect+"-restored-folds.png")});
    expect(hash(restored)).toBe(hash(original));
  }
  await value.check();
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  for(const [id] of atlas)
    await expect(svg.locator('[data-km-pencil-region="'+id+'"] [data-km-pencil-details] path').first())
      .toHaveAttribute("stroke-dasharray","0.00000 1");
  await folds.uncheck();
  await expect(value).toBeDisabled();
  await expect(scene).toHaveAttribute("data-km-rose-front-value","baseline");
  await expect(svg.locator('[data-km-pencil-region^="rose-front-"]')).toHaveCount(0);
});

test("pigment is real filled local area and largely within parent petal instead of a floating sticker",async({page})=>{
  await page.goto(story);
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose physical folds"}).check();
  await page.getByRole("checkbox",{name:"Foundation rose front value planes"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const overlap=await svg.evaluate((root,config)=>{
    return config.map(([id,parent])=>{
      const region=root.querySelector('[data-km-pencil-region="'+id+'"] path[data-km-pencil-underpaint]') as SVGPathElement|null;
      const host=root.querySelector('[data-km-pencil-region="'+parent+'"] path[data-km-pencil-support]') as SVGPathElement|null;
      if(!region||!host)return {id,filled:0,inParent:0};
      const box=region.getBBox();
      let filled=0,inParent=0;
      for(let row=0;row<37;row++)for(let col=0;col<37;col++){
        const pt=new DOMPoint(box.x+(col+.5)*box.width/37,box.y+(row+.5)*box.height/37);
        if(region.isPointInFill(pt)){
          filled++;
          if(host.isPointInFill(pt))inParent++;
        }
      }
      return {id,filled,inParent};
    });
  },atlas);
  for(const r of overlap){
    expect(r.filled,r.id+" needs real pigment area").toBeGreaterThan(115);
    expect(r.inParent/r.filled,r.id+" is escaping the drawn rose petal").toBeGreaterThan(.86);
  }
});
