import { expect, test } from "@playwright/test";

// Dedicated real-Chromium proof; expensive visual checks remain outside routine CI.
const root = "/iframe.html?id=video-production-film-looks--";
const studies = [
  { id: "paper-craft-gallery", medium: "layered" },
  { id: "paper-craft-kirigami", medium: "kirigami" },
  { id: "paper-craft-pop-up", medium: "pop-up" },
  { id: "paper-craft-lightbox", medium: "lightbox" },
  { id: "paper-craft-shadow-puppet", medium: "shadow-puppet" },
] as const;
const scene = (id: string) => root + id + "&viewMode=story";
test("Paper Craft original five media render genuinely different opaque cut-paper studies",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  for(const study of studies){
    await page.goto(scene(study.id));
    const canvas=page.locator("svg[data-km-paper-craft]");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-km-paper-style",study.medium);
    await expect(canvas).toHaveAttribute("viewBox","0 0 960 540");
    const cutCount=await canvas.locator("[data-km-paper-layer]").count();
    expect(cutCount).toBeGreaterThan(23);
    const ids=await canvas.locator("[data-km-paper-layer]").evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("data-km-paper-layer")));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(canvas.locator('[data-km-paper-layer="perch-bridge"]')).toBeVisible();
    await expect(canvas.locator('[data-km-paper-layer="bird-head"]')).toBeVisible();
    await expect(canvas.locator('[data-km-paper-layer="bird-feet"]')).toBeVisible();
    await expect(canvas.locator('path[fill-rule="evenodd"]').first()).toBeAttached();
    await expect(canvas.locator('[data-km-paper-layer="bird-beak"]')).toBeVisible();
    await expect(canvas.locator('[data-km-paper-layer="flower-calyx"]')).toBeVisible();
    if(study.medium==="shadow-puppet"){
      const paths=canvas.locator('[data-km-paper-layer] path[fill-rule="evenodd"]');
      expect(await paths.count()).toBe(cutCount);
      for(const opacity of await paths.evaluateAll(elements=>elements.map(el=>el.getAttribute("opacity"))))
        expect(opacity).toBe("1");
    }
    await canvas.screenshot({animations:"disabled",path:info.outputPath("paper-"+study.medium+".png")});
  }
  expect(errors).toEqual([]);
});
test("Paper Craft portrait crop, frame seek and reduced-motion assembly",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(scene("paper-craft-portrait"));
  const svg=page.locator("svg[data-km-paper-craft]");
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute("viewBox","0 0 540 960");
  await svg.screenshot({animations:"disabled",path:info.outputPath("paper-portrait-full.png")});
  const slider=page.getByRole("slider",{name:"Scrub film frame"});
  await slider.evaluate(node=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw Error("Native range setter unavailable");
    setter.call(el,"60");
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(svg).toHaveAttribute("data-km-paper-frame","60");
  await svg.screenshot({animations:"disabled",path:info.outputPath("paper-portrait-fold.png")});
  await page.getByRole("button",{name:"Restart"}).click();
  await expect(svg).toHaveAttribute("data-km-paper-frame","0");
  expect(errors).toEqual([]);
});

test("ArtCraft botanical sheets have connected detail, real holes and correct two-aspect framing", async ({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  for(const {id,aspect} of [
    {id:"paper-craft-botanical-nocturne",aspect:"landscape"},
    {id:"paper-craft-botanical-ivory",aspect:"landscape"},
    {id:"paper-craft-botanical-portrait",aspect:"portrait"},
    {id:"paper-craft-chromatic-rainforest",aspect:"landscape"},
    {id:"paper-craft-chromatic-wildflower",aspect:"landscape"},
    {id:"paper-craft-chromatic-portrait",aspect:"portrait"},
  ] as const){
    await page.goto(scene(id));
    const svg=page.locator("svg[data-km-paper-craft]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    const layers=svg.locator("[data-km-paper-layer]");
    const count=await layers.count();
    expect(count).toBeGreaterThan(60);
    expect(count).toBeGreaterThan(106);
    expect(count).toBeLessThanOrEqual(128);
    const ids=await layers.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-layer")));
    expect(new Set(ids).size).toBe(count);
    for(const id of ["fern-0","fern-0-chroma","flower-0-outer-stock","flower-0-top","flower-0-inner-stock","moth-left-fore-lining","moth-left-fore","moth-left-fore-panel","moth-right-fore-panel","moth-right-fore","moth-thorax"]){
      await expect(svg.locator('[data-km-paper-layer="'+id+'"]')).toBeVisible();
    }
    const colors=await layers.locator('path[fill-rule="evenodd"]').evaluateAll(nodes=>
      [...new Set(nodes.map(n=>n.getAttribute("fill")))]);
    expect(colors.length).toBeGreaterThan(18);
    await svg.screenshot({animations:"disabled",path:info.outputPath(id+".png")});
  }
  expect(errors).toEqual([]);
});
