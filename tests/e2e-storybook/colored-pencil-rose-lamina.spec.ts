import {test,expect} from "@playwright/test";
import type {Page} from "@playwright/test";
import {createHash} from "node:crypto";

const sha256=(bytes:Buffer|string)=>createHash("sha256").update(bytes).digest("hex");

/** Compare decoded pixels instead of PNG bytes. Identical SVG markup can still
 * produce slightly different subpixel anti-aliasing after re-mounting clipping
 * masks in Chromium; >8/16-level differences must remain extremely sparse.
 * This NEVER excuses source geometry, material or frame contract changes. */
async function compareNativePixels(page:Page,first:Buffer,second:Buffer){
  return page.evaluate(async ([a64,b64])=>{
    const load=async(base64:string)=>{
      const img=document.createElement("img");
      img.src="data:image/png;base64,"+base64;
      await img.decode();
      return img;
    };
    const [a,b]=await Promise.all([load(a64),load(b64)]);
    if(a.naturalWidth!==b.naturalWidth||a.naturalHeight!==b.naturalHeight)
      throw new Error("Native screenshot dimensions changed after A/B restoration");
    const canvas=document.createElement("canvas");
    canvas.width=a.naturalWidth;canvas.height=a.naturalHeight;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw new Error("Native PNG pixel decoding unavailable");
    ctx.drawImage(a,0,0);
    const before=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(b,0,0);
    const after=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let over8=0,over16=0;
    for(let i=0;i<before.length;i+=4){
      const delta=Math.max(
        Math.abs(before[i]-after[i]),
        Math.abs(before[i+1]-after[i+1]),
        Math.abs(before[i+2]-after[i+2]));
      if(delta>8)over8++;
      if(delta>16)over16++;
    }
    return {over8:over8/(before.length/4),over16:over16/(before.length/4)};
  },[first.toString("base64"),second.toString("base64")]);
}

test("rose lamina native film: original source and four optical passes at both aspects",async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--drawing-foundation&viewMode=story");
  const scene=page.locator("[data-km-foundation-studio]");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const checkbox=page.getByRole("checkbox",{name:"Foundation rose petal lamina fibres"});
  await page.getByRole("combobox",{name:"Foundation subject"}).selectOption("rose");
  await expect(checkbox).toBeVisible();
  await expect(checkbox).toBeChecked();
  await expect(scene).toHaveAttribute("data-km-rose-lamina-study","opt-in");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Foundation aspect"}).selectOption(aspect);
    await expect(svg).toHaveAttribute("viewBox",
      aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(28);
    expect(await svg.locator("image,foreignObject,feImage").count()).toBe(0);
    const authoredSvgHash=sha256(await svg.evaluate(node=>node.outerHTML));
    const withFibres=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-lamina-original-native.png")});
    await checkbox.uncheck();
    await expect(scene).toHaveAttribute("data-km-rose-lamina-study","baseline");
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(0);
    const before=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-baseline-original-native.png")});
    expect(sha256(before)).not.toBe(sha256(withFibres));
    await checkbox.check();
    await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
      .toHaveCount(28);
    expect(sha256(await svg.evaluate(node=>node.outerHTML))).toBe(authoredSvgHash);
    // Actual native browser pixels are compared, not static/mock geometry.
    // An identical SVG/seed is mandatory; only extremely sparse Chromium
    // clipping-mask antialiasing jitter is tolerated, never missing lamina.
    const restored=await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-restored-native.png")});
    const pixels=await compareNativePixels(page,withFibres,restored);
    expect(pixels.over8).toBeLessThan(.001);
    expect(pixels.over16).toBeLessThan(.0005);
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).check();
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("rose-"+aspect+"-lamina-macro.png")});
    await page.getByRole("checkbox",{name:"Foundation inspect macro"}).uncheck();
  }
  // Frame-addressed pigment cannot jump ahead of the pencil layering process.
  await page.getByRole("button",{name:/3\. Light value map/}).click();
  // SVG geometry remains in the DOM for deterministic seek; at frame 106
  // the real dash deposition is zero, not deleted source microgeometry.
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
    .toHaveCount(28);
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]').first())
    .toHaveAttribute("stroke-dasharray","0.00000 1");
  await page.getByRole("button",{name:/6\. Burnish and visual audit/}).click();
  await expect(svg.locator('[data-km-pencil-trace^="rose-lam-"]'))
    .toHaveCount(28);
});
