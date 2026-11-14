import {expect,test} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function seek(page:import("@playwright/test").Page,frame:number){
  const input=page.getByRole("slider",{name:"Shanshui frame"});
  await input.evaluate((node,value)=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Input setter unavailable");
    setter.call(el,String(value));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(input).toHaveValue(String(frame));
}
test("reference-inspired code-driven mountain, river and hermit compositions are real drawable scene layers",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const stage=page.getByTestId("shanshui-preview");
  await expect(stage).toBeVisible();
  const landscape=page.locator("[data-km-shanshui-scene]");
  const actor=page.locator("[data-km-ink-character-frame]");
  for(const scene of ["mountain-trail","river-scholar","misty-hermit"] as const){
    await page.getByRole("combobox",{name:"Shanshui composition"}).selectOption(scene);
    await seek(page,125);
    await expect(landscape).toHaveAttribute("data-km-shanshui-scene",scene);
    await expect(landscape).toHaveAttribute("data-km-shanshui-frame","125");
    await expect(page.locator("[data-km-shanshui-mountains]")).toHaveCount(1);
    await expect(page.locator("[data-km-shanshui-birds]")).toHaveCount(1);
    await expect(page.locator("[data-km-shanshui-foreground]")).toHaveCount(1);
    await expect(actor).toHaveCount(1);
    // Ink material renders a set of individual named paths inside the same
    // canonical body part; one actor is not one DOM path.
    await expect.poll(()=>page.locator('[data-km-ink-character-part="body"]').count())
      .toBeGreaterThan(1);
    if(scene==="river-scholar"){
      await expect(page.locator("[data-km-shanshui-willow]")).toHaveCount(1);
      await expect(page.locator("[data-km-shanshui-bridge]")).toHaveCount(1);
      await expect(page.locator("[data-km-shanshui-water]")).toHaveCount(1);
    }else{
      await expect(page.locator("[data-km-shanshui-pine]")).toHaveCount(1);
    }
    await stage.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-"+scene+"-125.png")});
    await seek(page,210);
    await stage.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-"+scene+"-210.png")});
    await seek(page,125);
    const first=await stage.screenshot({animations:"disabled"});
    await seek(page,31);
    await seek(page,125);
    const again=await stage.screenshot({animations:"disabled"});
    expect(hash(first)).toBe(hash(again));
  }
});
test("real paper/ink controls change geometry and the reduce-motion contract freezes foliage",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  const stage=page.getByTestId("shanshui-preview");
  await seek(page,166);
  const before=await stage.screenshot({animations:"disabled"});
  const detail=page.getByRole("slider",{name:"Shanshui detail"});
  await detail.evaluate(node=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("input setter missing");
    setter.call(el,"0");
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(detail).toHaveValue("0");
  const after=await stage.screenshot({animations:"disabled",
    path:info.outputPath("shanshui-sparse-detail.png")});
  expect(hash(before)).not.toBe(hash(after));
  await page.getByRole("checkbox",{name:"Reduced motion"}).check();
  const original=await page.locator("[data-km-shanshui-birds]").getAttribute("data-km-shanshui-bird-x");
  await seek(page,38);
  await expect(page.locator("[data-km-shanshui-birds]")).toHaveAttribute("data-km-shanshui-bird-x",original!);
  await page.getByRole("checkbox",{name:"Show scholar"}).uncheck();
  await expect(page.locator("[data-km-ink-character-frame]")).toHaveCount(0);
});
for(const [scene,story] of [
  ["mountain-trail","mountain-trail-export"],
  ["river-scholar","river-scholar-export"],
  ["misty-hermit","misty-hermit-export"],
] as const){
  test("the "+scene+" film can seek true production frames through the shared exporter",async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-shanshui--"+story+"&viewMode=story");
    await expect.poll(()=>page.evaluate(()=>Boolean(window.__kmVideoExport))).toBe(true);
    const manifest=await page.evaluate(()=>window.__kmVideoExport!.manifest);
    expect(manifest.width).toBe(960);
    expect(manifest.height).toBe(540);
    expect(manifest.durationFrames).toBe(300);
    await page.evaluate(async()=>window.__kmVideoExport!.seek(168));
    await expect(page.locator("[data-km-shanshui-scene]")).toHaveAttribute("data-km-shanshui-scene",scene);
    await expect(page.locator("[data-km-shanshui-frame]")).toHaveAttribute("data-km-shanshui-frame","168");
    await page.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-export-"+scene+".png")});
  });
}


test("gallery restarts playback from frame zero after the final frame",async({page})=>{
  await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
  await seek(page,299);
  await page.getByRole("button",{name:"Play film"}).click();
  const frame=page.getByRole("slider",{name:/Shanshui frame/});
  await expect.poll(async()=>Number(await frame.inputValue())).toBeLessThan(299);
  await expect(page.getByRole("button",{name:"Pause film"})).toBeVisible();
  await page.getByRole("button",{name:"Pause film"}).click();
  await expect(page.getByRole("button",{name:"Play film"})).toBeVisible();
});
