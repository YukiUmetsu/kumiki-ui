import { expect, test } from "@playwright/test";
/** Chromium may round a handful of SVG subpixel edges by 1–2 levels during reseeks.
 * Compare decoded RGBA values, not compressed PNG buffer bytes and metadata. */
async function expectStablePixels(page:import("@playwright/test").Page,before:Buffer,after:Buffer) {
  const diff=await page.evaluate(async ({first,second})=>{
    const decode=async (base64:string)=>{
      const raw=Uint8Array.from(atob(base64), c=>c.charCodeAt(0));
      const bitmap=await createImageBitmap(new Blob([raw],{type:"image/png"}));
      const canvas=document.createElement("canvas");
      canvas.width=bitmap.width;canvas.height=bitmap.height;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Canvas2D unavailable");
      ctx.drawImage(bitmap,0,0);bitmap.close();
      return {width:canvas.width,height:canvas.height,rgba:ctx.getImageData(0,0,canvas.width,canvas.height).data};
    };
    const a=await decode(first),b=await decode(second);
    if(a.width!==b.width||a.height!==b.height)
      return {sameSize:false,maxDelta:255,changedPixels:-1,totalPixels:0};
    let maxDelta=0,changedPixels=0;
    for(let i=0;i<a.rgba.length;i+=4){
      let changed=0;
      for(let c=0;c<4;c++)changed=Math.max(changed,Math.abs(a.rgba[i+c]-b.rgba[i+c]));
      maxDelta=Math.max(maxDelta,changed);
      if(changed>0)changedPixels++;
    }
    return {sameSize:true,maxDelta,changedPixels,totalPixels:a.width*a.height};
  },{first:before.toString("base64"),second:after.toString("base64")});
  expect(diff.sameSize,JSON.stringify(diff)).toBe(true);
  expect(diff.maxDelta,JSON.stringify(diff)).toBeLessThanOrEqual(2);
  expect(diff.changedPixels,JSON.stringify(diff)).toBeLessThanOrEqual(Math.max(12,Math.ceil(diff.totalPixels*.0001)));
}


/** Real Chromium captures of the actual Storybook renderer, never a hand-built mockup. */
for (const [subject, aspect, storyId] of [
  ["lantern", "landscape", "video-crayon-storybook--lantern-trail"],
  ["lantern", "portrait", "video-crayon-storybook--lantern-portrait"],
  ["garden", "landscape", "video-crayon-storybook--one-little-seed"],
  ["garden", "portrait", "video-crayon-storybook--garden-portrait"],
] as const) {
  test("crayon "+subject+" / "+aspect+" draws repeatable physical wax", async ({page},info)=>{
    await page.goto("/iframe.html?id="+storyId+"&viewMode=story");
    const svg=page.locator('svg[data-km-crayon-storybook]');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    await expect(svg).toHaveAttribute("data-km-crayon-story",subject);
    await expect(svg.locator("[data-km-crayon-paper]")).toHaveCount(1);
    await expect(svg.locator("[data-km-crayon-wax]").first()).toBeAttached();
    await page.evaluate(()=>document.fonts.ready);

    const chapters=[
      {name:"Restart",frame:0},
      {name:"2 · Scene emerges",frame:156},
      {name:"3 · Wax drawing",frame:270},
      {name:"4 · Final page",frame:419},
    ];
    const captures:Buffer[]=[];
    for (const chapter of chapters) {
      await page.getByRole("button",{name:chapter.name,exact:true}).click();
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(chapter.frame));
      const png=await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-"+subject+"-"+aspect+"-"+chapter.frame+".png")});
      captures.push(png);
    }
    expect(captures[0]).not.toEqual(captures[1]);
    expect(captures[1]).not.toEqual(captures[2]);
    expect(captures[2]).not.toEqual(captures[3]);

    // Return to a prior frame after newer frames: paper/scumble must remain fixed.
    await page.getByRole("button",{name:"2 · Scene emerges",exact:true}).click();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","156");
    const again=await svg.screenshot({animations:"disabled"});
    await expectStablePixels(page,again,captures[1]);

    const rect=await svg.evaluate(node=>{
      const b=node.getBoundingClientRect();
      return {width:b.width,height:b.height};
    });
    expect(rect.width).toBeGreaterThan(200);
    expect(rect.height/rect.width).toBeCloseTo(aspect==="portrait"?16/9:9/16,1);
    if(subject==="lantern") await expect(svg.locator("[data-km-crayon-fox]")).toHaveCount(1);
    else await expect(svg.locator("[data-km-crayon-bloom]")).toHaveCount(3);
  });
}
