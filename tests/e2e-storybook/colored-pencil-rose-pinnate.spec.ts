import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");

test("FLORA1 five-leaflet rose foliage native A/B and macro at both film aspects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  const leaves=page.getByRole("checkbox",{name:"Foundation rose pinnate leaves"});
  await expect(leaves).not.toBeChecked();
  await expect(scene).toHaveAttribute("data-km-rose-pinnate-study","baseline");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    const baseHtml=await svg.evaluate(node=>node.outerHTML);
    const base=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-single-lamina-leaves-native.png")});
    await leaves.check();
    await expect(scene).toHaveAttribute("data-km-rose-pinnate-study","opt-in");
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(25);
    await expect(svg.locator('[data-km-pencil-region^="rose-left-"]')).toHaveCount(8);
    await expect(svg.locator('[data-km-pencil-region^="rose-right-"]')).toHaveCount(8);
    await expect(svg.locator('[data-km-pencil-region="leaf-left"]')).toHaveCount(0);
    await expect(svg.locator('[data-km-pencil-region="leaf-right"]')).toHaveCount(0);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const full=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-pinnate-five-leaflets-native.png")});
    expect(hash(full)).not.toBe(hash(base));
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-pinnate-five-leaflets-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
    await leaves.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-pinnate-study","baseline");
    expect(await svg.evaluate(node=>node.outerHTML)).toBe(baseHtml);
  }
  await leaves.check();
  await page.getByRole("checkbox",{name:"Foundation rose calyx anatomy"}).check();
  await expect(svg.locator("[data-km-pencil-region]")).toHaveCount(30);
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  await expect(svg.locator('[data-km-pencil-region^="rose-left-"]')).toHaveCount(8);
});

test("real SVG compound rose foliage has deeply attached leaflets and fine serrations",async({page})=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const svg=page.locator("svg[data-km-colored-pencil]");
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await page.getByRole("checkbox",{name:"Foundation rose pinnate leaves"}).check();
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  const evidence=await svg.evaluate(node=>{
    const failures:string[]=[];
    const sideCounts:Record<string,number>={left:0,right:0};
    let teeth=0;
    for(const side of ["left","right"]){
      const parent=node.querySelector('[data-km-pencil-region="rose-'+side+'-rachis"]');
      const rachis=parent?.querySelector("path[data-km-pencil-support]") as SVGPathElement|null;
      if(!rachis){failures.push(side+": missing native rachis support");continue;}
      const length=rachis.getTotalLength();
      const boundary=Array.from({length:401},(_,i)=>rachis.getPointAtLength(i*length/400));
      const leaflets=Array.from(node.querySelectorAll(
        '[data-km-pencil-region^="rose-'+side+'-pair-"],'+
        '[data-km-pencil-region="rose-'+side+'-terminal"]'));
      sideCounts[side]=leaflets.length;
      for(const leaf of leaflets){
        const path=leaf.querySelector("path[data-km-pencil-support]") as SVGPathElement|null;
        if(!path){failures.push("No physical leaf silhouette");continue;}
        const origin=path.getPointAtLength(0);
        const distance=Math.min(...boundary.map(p=>Math.hypot(origin.x-p.x,origin.y-p.y)));
        // Node centerline may be inside a narrow petiole support, but cannot float.
        if(distance>11)failures.push(leaf.getAttribute("data-km-pencil-region")+": detached by "+
          distance.toFixed(2)+" source units");
        const segments=(path.getAttribute("d")?.match(/ L/g)??[]).length;
        teeth+=segments;
        if(segments<64)failures.push("Unserrated simplified leaf "+leaf.getAttribute("data-km-pencil-region"));
        const details=leaf.querySelectorAll("[data-km-pencil-details] path");
        if(details.length<3)failures.push("Lost native layered pigment/vein sources");
      }
    }
    return {failures,teeth,sideCounts};
  });
  expect(evidence.failures).toEqual([]);
  expect(evidence.sideCounts).toEqual({left:5,right:5});
  expect(evidence.teeth).toBeGreaterThan(750);
});
