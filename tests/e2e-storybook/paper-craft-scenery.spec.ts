import { expect, test } from "@playwright/test";

const root="/iframe.html?id=video-production-film-looks-paper-craft--scenery&viewMode=story";
const scene=(subject:string,palette:string,aspect:string)=>
  root+"&args=scenery:"+subject+";sceneryPalette:"+palette+";aspect:"+aspect+";detail:1;breeze:0.5";

test("Two fully opaque Paper Craft landscapes render as one configurable Storybook page",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  for(const subject of ["woodland","alpine-lake"]){
    for(const aspect of ["landscape","portrait"]){
      await page.goto(scene(subject,subject==="woodland"?"sage":"moonlight",aspect));
      const svg=page.locator("svg[data-km-paper-craft]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
      const cut=svg.locator("[data-km-paper-layer]");
      const count=await cut.count();
      expect(count).toBeGreaterThan(38);
      expect(count).toBeLessThanOrEqual(128);
      const ids=await cut.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-layer")));
      expect(new Set(ids).size).toBe(count);
      await expect(svg.locator('[data-km-paper-layer="scenery-frame"]')).toBeVisible();
      const key=subject==="woodland"?"woodland-foliage-0-0":"alpine-snowcap-1";
      await expect(svg.locator('[data-km-paper-layer="'+key+'"]')).toBeVisible();
      const sculpted=subject==="woodland"?"woodland-lace-canopy-0":"alpine-lake-islet";
      await expect(svg.locator('[data-km-paper-layer="'+sculpted+'"]')).toBeVisible();
      if(subject==="woodland"){
        const crown=svg.locator('[data-km-paper-layer="woodland-lace-canopy-0"]');
        const cutPath=await crown.locator("path[fill-rule='evenodd']").getAttribute("d");
        expect((cutPath?.match(/C/g)??[]).length).toBeGreaterThanOrEqual(6);
        expect((cutPath?.match(/Z/g)??[]).length).toBeGreaterThanOrEqual(9);
      }
      const prefix=subject==="woodland"?"woodland":"alpine";
      const herb=svg.locator('[data-km-paper-layer="'+prefix+'-herb-0-0"]');
      const veins=svg.locator('[data-km-paper-layer="'+prefix+'-herb-veins"]');
      await expect(herb).toBeVisible();
      await expect(veins).toBeVisible();
      const cutwork=await herb.locator('path[fill-rule="evenodd"]').getAttribute("d");
      expect((cutwork?.match(/L/g)??[]).length).toBeGreaterThan(50);
      const pistils=subject==="woodland"?"woodland-flower-centers":"alpine-meadow-bloom-centers";
      await expect(svg.locator('[data-km-paper-layer="'+pistils+'"]')).toBeVisible();
      const stock=await cut.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-stock")));
      expect(stock.every(c=>/^#[a-fA-F0-9]{6}$/.test(c??""))).toBe(true);
      await svg.screenshot({animations:"disabled",path:info.outputPath(subject+"-"+aspect+".png")});
    }
  }
  expect(errors).toEqual([]);
});

test("Scenery custom controls update actual paper geometry, stock and frame seeking",async({page})=>{
  await page.goto(scene("woodland","sage","landscape"));
  const art=page.locator("svg[data-km-paper-craft]");
  await expect(art).toHaveAttribute("data-km-paper-frame","214");
  await expect(art.locator('[data-km-paper-layer="woodland-stream"]')).toBeVisible();
  const first=await art.locator('[data-km-paper-layer="scenery-sky"]').getAttribute("data-km-paper-stock");
  await page.goto(scene("woodland","ember","landscape"));
  const second=await art.locator('[data-km-paper-layer="scenery-sky"]').getAttribute("data-km-paper-stock");
  expect(second).not.toBe(first);
  await page.getByRole("button",{name:"Restart"}).click();
  await expect(art).toHaveAttribute("data-km-paper-frame","0");
  await expect(art.locator('[data-km-paper-layer="woodland-trunk-0"]')).toHaveAttribute("opacity","0");
});

test("One Scenery page supports high and low cut-detail with no ghosted paper",async({page})=>{
  const count=async(detail:number)=>{
    await page.goto(root+"&args=scenery:alpine-lake;detail:"+detail+";sceneryPalette:moonlight");
    const art=page.locator("svg[data-km-paper-craft]");
    await expect(art).toBeVisible();
    const layers=art.locator("[data-km-paper-layer]");
    const colors=await layers.locator('path[fill-rule="evenodd"]').evaluateAll(nodes=>
      nodes.map(node=>node.getAttribute("fill")));
    expect(colors.every(c=>c?.startsWith("#")||c?.startsWith("url(#paper"))).toBe(true);
    return layers.count();
  };
  const sparse=await count(0);
  const intricate=await count(1);
  expect(intricate).toBeGreaterThan(sparse);
});

test("Scenery relief controls actual paper-shadow separation, not opacity",async({page})=>{
  const shadow=async(relief:number)=>{
    await page.goto(root+"&args=scenery:alpine-lake;sceneryPalette:moonlight;relief:"+relief+";frame:214");
    const art=page.locator("svg[data-km-paper-craft]");
    await expect(art).toBeVisible();
    const layer=art.locator('[data-km-paper-layer="alpine-snowcap-1"]');
    await expect(layer).toBeVisible();
    const fill=await layer.getAttribute("data-km-paper-stock");
    expect(fill).toMatch(/^#[0-9a-fA-F]{6}$/);
    return layer.getAttribute("style");
  };
  const flat=await shadow(0);
  const raised=await shadow(1);
  expect(flat).not.toEqual(raised);
});


test("Alpine paper pines change cut contour when choosing spruce, fir and larch diversity",async({page})=>{
  const source=async(variety:number)=>{
    await page.goto(root+"&args=scenery:alpine-lake;sceneryPalette:moonlight;treeVariety:"+variety+";detail:1;frame:214");
    const stage=page.locator("svg[data-km-paper-craft]");
    await expect(stage).toBeVisible();
    const treeLayer=stage.locator('[data-km-paper-layer^="alpine-pine-"]');
    const paths=await treeLayer.evaluateAll(nodes=>nodes.map(node=>
      node.querySelector('path[fill-rule="evenodd"]')?.getAttribute("d")??""));
    expect(paths.length).toBeGreaterThan(10);
    expect(paths.every(path=>path.startsWith("M")&&path.endsWith("Z"))).toBe(true);
    return paths;
  };
  const regular=await source(0);
  const varied=await source(1);
  expect(regular).not.toEqual(varied);
  expect(new Set(regular.map(path=>(path.match(/L/g)??[]).length)).size).toBe(1);
  expect(new Set(varied.map(path=>(path.match(/L/g)??[]).length)).size).toBeGreaterThan(1);
});
