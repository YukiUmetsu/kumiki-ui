import { expect, test } from "@playwright/test";

// One existing Paper Craft folder under Film Looks, one interactive story per object.
const root="/iframe.html?id=video-production-film-looks-paper-craft--";
const scene=(slug:string,args?:string)=>root+slug+"&viewMode=story"+
  (args?"&args="+args:"");
const entries=[
  ["kingfisher","kingfisher-head","landscape"],
  ["dragonfly","dragonfly-head","landscape"],
  ["canal-houses","house-center-roof","landscape"],
  ["camera","camera-lens-ring-6","landscape"],
  ["teacup","tea-cup-body","landscape"],
  ["kingfisher","kingfisher-head","portrait"],
] as const;

test("All five Paper Craft subjects share one Storybook folder and support portrait controls",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const [slug,part,aspect] of entries){
    const args=aspect==="portrait"?"aspect:portrait":undefined;
    await page.goto(scene(slug,args));
    const art=page.locator("svg[data-km-paper-craft]");
    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    const layers=art.locator("[data-km-paper-layer]");
    const count=await layers.count();
    expect(count).toBeGreaterThan(35);
    expect(count).toBeLessThanOrEqual(128);
    const ids=await layers.evaluateAll(nodes=>nodes.map(x=>x.getAttribute("data-km-paper-layer")));
    expect(new Set(ids).size).toBe(count);
    await expect(art.locator('[data-km-paper-layer="'+part+'"]')).toBeVisible();
    await expect(art.locator('[data-km-paper-layer="stage-frame"]')).toBeVisible();
    const stock=await layers.evaluateAll(nodes=>nodes.map(el=>el.getAttribute("data-km-paper-stock")));
    expect(stock.every(v=>typeof v==="string"&&/^#[0-9A-Fa-f]{6}$/.test(v))).toBe(true);
    expect(new Set(stock).size).toBeGreaterThan(8);
    const colored=await layers.locator('path[fill-rule="evenodd"]').evaluateAll(nodes=>
      nodes.map(el=>el.getAttribute("fill")));
    expect(colored.every(v=>typeof v==="string"&&(
      /^#[0-9A-Fa-f]{6}$/.test(v)||/^url\(#paper[a-zA-Z0-9_-]+\)$/.test(v)
    ))).toBe(true);
    await art.screenshot({animations:"disabled",path:info.outputPath(slug+"-"+aspect+".png")});
  }
  expect(errors).toEqual([]);
});

test("Kingfisher supports frame seeking without a separate storyboard duplicate",async({page})=>{
  await page.goto(scene("kingfisher"));
  const stage=page.locator("svg[data-km-paper-craft]");
  await expect(stage).toHaveAttribute("data-km-paper-frame","215");
  await page.getByRole("button",{name:"Restart"}).click();
  await expect(stage).toHaveAttribute("data-km-paper-frame","0");
  await expect(stage.locator('[data-km-paper-layer="kingfisher-head"]')).toHaveAttribute("opacity","0");
});

test("Paper Craft object rig and curl controls preserve opaque, synchronized wings",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const {slug,group} of [
    {slug:"kingfisher",group:"kingfisher-wing"},
    {slug:"dragonfly",group:"dragonfly-wing-0"},
  ]){
    await page.goto(scene(slug));
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
      if(!setter)throw Error("Native frame setter unavailable");
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
    await svg.screenshot({animations:"disabled",path:info.outputPath(slug+"-rig.png")});
  }
  expect(errors).toEqual([]);
});

test("Raised opaque feather tips use one kingfisher page in landscape and portrait",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  for(const aspect of ["landscape","portrait"] as const){
    await page.goto(scene("kingfisher",aspect==="portrait"?"aspect:portrait":undefined));
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
    await svg.screenshot({animations:"disabled",path:info.outputPath("wing-relief-"+aspect+".png")});
  }
  expect(errors).toEqual([]);
});

test("Reference-led anatomy persists while stock and aspect change by page controls",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const [aspect,palette] of [["landscape","jewel"],["portrait","pastel"]] as const){
    await page.goto(scene("kingfisher","aspect:"+aspect+";objectPalette:"+palette));
    const svg=page.locator("svg[data-km-paper-craft]");
    await expect(svg).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    await expect(svg).toHaveAttribute("data-km-paper-frame","215");
    const pieces=svg.locator("[data-km-paper-layer]");
    const ids=await pieces.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-layer")));
    for(const id of ["kingfisher-head","kingfisher-throat","kingfisher-cheek",
      "kingfisher-belly-russet","kingfisher-wing-coverts","kingfisher-beak-upper",
      "kingfisher-crown-bar-2","back-shingles-2","kingfisher-breast-tract-2",
      "kingfisher-talon-1-2"]){expect(ids).toContain(id)}
    expect(ids.filter(id=>id?.startsWith("wing-feather-")).length).toBe(18);
    await expect(svg.locator("[data-km-paper-lift-tip^='wing-feather-']")).toHaveCount(18);
    const colors=await pieces.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-stock")));
    expect(colors.every(c=>!!c&&/^#[0-9A-Fa-f]{6}$/.test(c))).toBe(true);
    await svg.screenshot({animations:"disabled",path:info.outputPath("anatomy-"+aspect+".png")});
  }
  expect(errors).toEqual([]);
});

test("Kingfisher detail changes actual paper cuts without a second Storybook story",async({page})=>{
  const getVane=async()=>{
    const vane=page.locator('[data-km-paper-layer="wing-feather-0"] path[fill-rule="evenodd"]').first();
    return vane.getAttribute("d");
  };
  await page.goto(scene("kingfisher","detail:0"));
  const smooth=await getVane();
  await page.goto(scene("kingfisher","detail:1"));
  const intricate=await getVane();
  expect(smooth).toBeTruthy();
  expect(intricate).toBeTruthy();
  expect((intricate?.match(/L/g)||[]).length).toBeGreaterThan((smooth?.match(/L/g)||[]).length);
});
