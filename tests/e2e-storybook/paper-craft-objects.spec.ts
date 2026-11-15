import { expect, test } from "@playwright/test";

const base="/iframe.html?id=video-production-film-looks--";
const entries=[
  ["paper-craft-object-kingfisher","kingfisher","landscape"],
  ["paper-craft-object-dragonfly","dragonfly-head","landscape"],
  ["paper-craft-object-canal-houses","house-center-roof","landscape"],
  ["paper-craft-object-camera","camera-lens-ring-6","landscape"],
  ["paper-craft-object-teacup","tea-cup-body","landscape"],
  ["paper-craft-object-portrait","kingfisher","portrait"],
] as const;
test("Paper Craft objects render five sculpted subjects and a portrait without browser errors",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const [slug,part,aspect] of entries){
    await page.goto(base+slug+"&viewMode=story");
    const art=page.locator("svg[data-km-paper-craft]");
    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    const layers=art.locator("[data-km-paper-layer]");
    const count=await layers.count();
    expect(count).toBeGreaterThan(35);
    expect(count).toBeLessThanOrEqual(128);
    const ids=await layers.evaluateAll(nodes=>nodes.map(x=>x.getAttribute("data-km-paper-layer")));
    expect(new Set(ids).size).toBe(count);
    const find=part==="kingfisher"?"kingfisher-head":part;
    await expect(art.locator('[data-km-paper-layer="'+find+'"]')).toBeVisible();
    await expect(art.locator('[data-km-paper-layer="stage-frame"]')).toBeVisible();
    const fill=await layers.locator('path[fill-rule="evenodd"]').evaluateAll(nodes=>
      nodes.map(el=>el.getAttribute("fill")));
    expect(fill.every(v=>typeof v==="string"&&/^#[0-9A-Fa-f]{6}$/.test(v))).toBe(true);
    expect(new Set(fill).size).toBeGreaterThan(8);
    await art.screenshot({animations:"disabled",path:info.outputPath(slug+".png")});
  }
  expect(errors).toEqual([]);
});
test("Paper Craft objects frame-seek and reduced-motion presentation stays valid",async({page})=>{
  await page.goto(base+"paper-craft-object-kingfisher&viewMode=story");
  const stage=page.locator("svg[data-km-paper-craft]");
  await expect(stage).toHaveAttribute("data-km-paper-frame","195");
  await page.getByRole("button",{name:"Restart"}).click();
  await expect(stage).toHaveAttribute("data-km-paper-frame","0");
  await expect(stage.locator('[data-km-paper-layer="kingfisher-head"]')).toHaveAttribute("opacity","0");
});
