import { expect, test } from "@playwright/test";

// All paper craft stories are under one Film Looks / Paper Craft folder.
const root="/iframe.html?id=video-production-film-looks-paper-craft--";
const scene=(id:string,args?:string)=>root+id+"&viewMode=story"+(args?"&args="+args:"");
const studies=[
  { medium:"layered", button:"layered" },
  { medium:"kirigami", button:"kirigami" },
  { medium:"pop-up", button:"pop-up" },
  { medium:"lightbox", button:"lightbox" },
  { medium:"shadow-puppet", button:"shadow-puppet" },
] as const;

test("One Garden page supports all five paper media without duplicate Storybook pages",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(scene("gallery"));
  const canvas=page.locator("svg[data-km-paper-craft]");
  for(const study of studies){
    if(study.medium!=="layered"){
      await page.locator('[data-paper-medium-link="'+study.button+'"]').click();
    }
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

test("Garden controls one wing edge without changing neighboring stock",async({page},info)=>{
  await page.goto(scene("gallery"));
  const wing=page.locator('[data-km-paper-layer="bird-wing"] > g');
  const body=page.locator('[data-km-paper-layer="bird-body"] > g');
  await expect(wing.locator("path")).toHaveCount(2);
  await page.getByRole("slider",{name:"Wing cut edge"}).fill("0");
  await expect(wing.locator("path")).toHaveCount(1);
  await expect(wing.locator("path").first()).toHaveAttribute("stroke-opacity","0");
  await expect(body.locator("path")).toHaveCount(2);
  await page.locator('svg[data-km-paper-craft]').screenshot({animations:"disabled",path:info.outputPath("paper-wing-edge-zero.png")});
  await page.getByRole("slider",{name:"Wing cut edge"}).fill("1");
  await expect(wing.locator("path")).toHaveCount(2);
  await page.locator('svg[data-km-paper-craft]').screenshot({animations:"disabled",path:info.outputPath("paper-wing-edge-full.png")});
});

test("Garden controls fibre on a single sheet without altering adjacent stock",async({page},info)=>{
  await page.goto(scene("gallery"));
  const wing=page.locator('[data-km-paper-layer="bird-wing"] > g > rect');
  const body=page.locator('[data-km-paper-layer="bird-body"] > g > rect');
  const originalBody=await body.getAttribute("fill");
  await page.getByRole("slider",{name:"Wing fibre scale"}).fill("0.5");
  await page.getByRole("slider",{name:"Wing fibre intensity"}).fill("0.5");
  const fill=await wing.getAttribute("fill");
  expect(fill).not.toBe(originalBody);
  expect(await body.getAttribute("fill")).toBe(originalBody);
  expect(Number(await wing.getAttribute("opacity"))).toBeCloseTo(.55*.8*.5);
  const id=fill!.slice(5,-1);
  const transform=await page.evaluate(id=>document.getElementById(id)?.getAttribute("patternTransform"),id);
  expect(transform).toBe("scale(0.5)");
  await page.locator('svg[data-km-paper-craft]').screenshot({animations:"disabled",path:info.outputPath("paper-wing-fibre-half.png")});
  await page.getByRole("slider",{name:"Wing fibre intensity"}).fill("0");
  await expect(wing).toHaveCount(0);
  await expect(body).toHaveCount(1);
});

test("Garden page portrait, frame seek and reduced-motion assembly",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(scene("gallery","aspect:portrait"));
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

test("One Botanical page renders every stock and aspect with genuine paper apertures",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  for(const {palette,aspect} of [
    {palette:"nocturne",aspect:"landscape"},
    {palette:"ivory",aspect:"landscape"},
    {palette:"nocturne",aspect:"portrait"},
    {palette:"rainforest",aspect:"landscape"},
    {palette:"wildflower",aspect:"landscape"},
    {palette:"rainforest",aspect:"portrait"},
  ] as const){
    await page.goto(scene("botanical","palette:"+palette+";aspect:"+aspect+";colorLayers:1;detail:1"));
    const svg=page.locator("svg[data-km-paper-craft]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    const layers=svg.locator("[data-km-paper-layer]");
    const count=await layers.count();
    expect(count).toBeGreaterThan(106);
    expect(count).toBeLessThanOrEqual(128);
    const ids=await layers.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-layer")));
    expect(new Set(ids).size).toBe(count);
    for(const id of ["fern-0","fern-0-chroma","flower-0-outer-stock",
      "flower-0-top","flower-0-inner-stock","moth-left-fore-lining",
      "moth-left-fore","moth-left-fore-panel","moth-right-fore-panel",
      "moth-right-fore","moth-thorax"]){
      await expect(svg.locator('[data-km-paper-layer="'+id+'"]')).toBeVisible();
    }
    const colors=await layers.locator('path[fill-rule="evenodd"]').evaluateAll(nodes=>
      [...new Set(nodes.map(n=>n.getAttribute("fill")))]);
    expect(colors.length).toBeGreaterThan(18);
    await svg.screenshot({animations:"disabled",path:info.outputPath("botanical-"+palette+"-"+aspect+".png")});
  }
  expect(errors).toEqual([]);
});
