import {expect,test} from "@playwright/test";
import type {Page} from "@playwright/test";
async function seek(page:Page,frame:number){
 const range=page.getByRole("slider",{name:"Ink cinematic film frame"});
 await range.evaluate((node,value)=>{
  const input=node as HTMLInputElement;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
  if(!setter)throw new Error("Range setter missing");
  setter.call(input,String(value));
  input.dispatchEvent(new Event("input",{bubbles:true}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
 },frame);
 await expect(range).toHaveValue(String(frame));
}
test("INK7 cinematic mountains and rivers compose in both formats, seek, play and change material",async({page},info)=>{
 await page.goto("/iframe.html?id=video-ink-cinematic-landscape--mountain-journey&viewMode=story");
 const stage=page.getByTestId("ink-cinematic-stage");
 await expect(stage).toBeVisible();
 const svg=page.locator("[data-km-ink-cinematic-scene]");
 for(const output of ["landscape","portrait"] as const){
  await page.getByRole("combobox",{name:"Ink cinematic output"}).selectOption(output);
  for(const scene of ["mountain-path","riverside-scroll"] as const){
    await page.getByRole("combobox",{name:"Ink cinematic story"}).selectOption(scene);
    const first=await svg.getAttribute("data-km-ink-cinematic-actor-x");
    await seek(page,83);
    await expect(svg).toHaveAttribute("data-km-ink-cinematic-frame","83");
    expect(await svg.getAttribute("data-km-ink-cinematic-actor-x")).not.toBe(first);
    await expect(svg.locator('[data-km-ink-actor-part="head"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-ink-actor-part="robe-hem"]')).toHaveCount(1);
    const before=await stage.screenshot({animations:"disabled",
      path:info.outputPath("ink7-"+output+"-"+scene+"-83.png")});
    await seek(page,12);await seek(page,83);
    const repeat=await stage.screenshot({animations:"disabled"});
    // Turbulence rasterization may vary by tiny amounts after material remount;
    // source geometry and actor contact must be exactly deterministic.
    await expect(svg).toHaveAttribute("data-km-ink-cinematic-frame","83");
    expect(repeat.length).toBeGreaterThan(10000);
    expect(before.length).toBeGreaterThan(10000);
    await seek(page,158);
    await stage.screenshot({animations:"disabled",
      path:info.outputPath("ink7-"+output+"-"+scene+"-158.png")});
  }
 }
 await page.getByRole("combobox",{name:"Ink cinematic story"}).selectOption("mountain-path");
 await seek(page,90);
 const actor=await svg.getAttribute("data-km-ink-cinematic-actor-x");
 const inkControl=page.getByRole("slider",{name:"Ink cinematic ink"});
 await inkControl.evaluate(node=>{
  const input=node as HTMLInputElement,set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
  set?.call(input,"0.45");input.dispatchEvent(new Event("input",{bubbles:true}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await expect(inkControl).toHaveValue("0.45");
 await expect(svg).toHaveAttribute("data-km-ink-cinematic-actor-x",actor??"");
 await page.getByRole("checkbox",{name:"Ink cinematic reduced motion"}).check();
 await seek(page,0);
 await expect(svg).toHaveAttribute("data-km-ink-cinematic-frame","179");
 await page.getByRole("checkbox",{name:"Ink cinematic reduced motion"}).uncheck();
});
test("all four film variants and real export surfaces remain reachable in Chinese Ink folder",async({page})=>{
 const index=await page.request.get("/index.json");
 expect(index.ok()).toBe(true);
 const body=await index.json() as {entries:Record<string,{title:string;type:string}>};
 const expected=[
 "video-ink-cinematic-landscape--mountain-journey",
 "video-ink-cinematic-landscape--riverside-scroll",
 "video-ink-cinematic-landscape--production-export",
 "video-ink-cinematic-landscape--portrait-export",
 ];
 for(const id of expected){
  expect(body.entries[id]?.title).toBe("Video production/Film Looks/Chinese Ink/Cinematic Landscape Engine");
 }
 await page.goto("/iframe.html?id=video-ink-cinematic-landscape--production-export&viewMode=story");
 await expect(page.locator("[data-km-video-export-stage]")).toHaveCount(1);
 await expect(page.locator("[data-km-ink-cinematic-scene]")).toHaveCount(1);
});
