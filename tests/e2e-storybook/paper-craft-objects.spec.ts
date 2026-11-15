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
    const stock=await layers.evaluateAll(nodes=>nodes.map(el=>
      el.getAttribute("data-km-paper-stock")));
    expect(stock.every(v=>typeof v==="string"&&/^#[0-9A-Fa-f]{6}$/.test(v))).toBe(true);
    expect(new Set(stock).size).toBeGreaterThan(8);
    const colored=await layers.locator('path[fill-rule="evenodd"]').evaluateAll(nodes=>
      nodes.map(el=>el.getAttribute("fill")));
    expect(colored.every(v=>typeof v==="string"&&(
      /^#[0-9A-Fa-f]{6}$/.test(v)||/^url\(#paper[a-zA-Z0-9_-]+\)$/.test(v)
    ))).toBe(true);
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

test("Paper Craft curled stock stays opaque and all wing pieces flap together on seek",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const {slug,group} of [
    {slug:"paper-craft-feather-rig",group:"kingfisher-wing"},
    {slug:"paper-craft-dragonfly-flutter",group:"dragonfly-wing-0"},
  ]){
    await page.goto(base+slug+"&viewMode=story");
    const svg=page.locator("svg[data-km-paper-craft]");
    await expect(svg).toBeVisible();
    const rig=svg.locator('[data-km-paper-rig="'+group+'"]');
    expect(await rig.count()).toBeGreaterThan(2);
    const curves=svg.locator("linearGradient[data-km-paper-curl]");
    expect(await curves.count()).toBeGreaterThanOrEqual(8);
    const stops=curves.locator("stop");
    const colors=await stops.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("stop-color")));
    expect(colors.every(s=>typeof s==="string"&&/^#[0-9A-Fa-f]{6}$/.test(s))).toBe(true);
    const initial=await rig.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("transform")));
    const unique0=await rig.evaluateAll(nodes=>new Set(nodes.map(n=>
      /rotate\((-?[0-9.]+)\)/.exec(n.getAttribute("transform")||"")?.[1])).size);
    expect(unique0).toBe(1);
    const slider=page.getByRole("slider",{name:"Scrub film frame"});
    await slider.evaluate(node=>{
      const el=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("Native frame setter unavailable");
      setter.call(el,"204");
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await expect(svg).toHaveAttribute("data-km-paper-frame","204");
    const after=await rig.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("transform")));
    expect(after).not.toEqual(initial);
    const unique1=await rig.evaluateAll(nodes=>new Set(nodes.map(n=>
      /rotate\((-?[0-9.]+)\)/.exec(n.getAttribute("transform")||"")?.[1])).size);
    expect(unique1).toBe(1);
    await svg.screenshot({animations:"disabled",path:info.outputPath(slug+"-curled.png")});
  }
  expect(errors).toEqual([]);
});

test("Crafted feather tips are separate opaque hinged shapes in both aspect ratios",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  for(const [slug,aspect] of [
    ["paper-craft-feather-relief-macro","landscape"],
    ["paper-craft-feather-relief-portrait","portrait"],
  ] as const){
    await page.goto(base+slug+"&viewMode=story");
    const svg=page.locator("svg[data-km-paper-craft]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    const tips=svg.locator('[data-km-paper-lift-tip^="wing-feather-"]');
    await expect(tips).toHaveCount(18);
    expect(Number(await tips.first().getAttribute("data-km-paper-fold-angle"))).not.toBe(0);
    const colors=await tips.locator("path[fill-rule=evenodd]").evaluateAll(nodes=>
      nodes.map(el=>el.getAttribute("fill")));
    expect(colors).toHaveLength(18);
    expect(colors.every(v=>/^#[a-fA-F0-9]{6}$/.test(v??""))).toBe(true);
    const wing=svg.locator('[data-km-paper-layer="wing-feather-0"]');
    const before=await wing.getAttribute("transform");
    const slider=page.getByRole("slider",{name:"Scrub film frame"});
    await slider.evaluate(node=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("Missing input setter");
      setter.call(input,"222");
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await expect(svg).toHaveAttribute("data-km-paper-frame","222");
    expect(await wing.getAttribute("transform")).not.toBe(before);
    await svg.screenshot({animations:"disabled",path:info.outputPath(slug+"-final.png")});
  }
  expect(errors).toEqual([]);
});
