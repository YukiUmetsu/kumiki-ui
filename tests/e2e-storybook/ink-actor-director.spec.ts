import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

function sha(png:Buffer){ return createHash("sha256").update(png).digest("hex"); }
/** Browser screenshots may differ in PNG encoding despite identical scene pixels.
 * Compare decoded art pixels instead, with a small raster tolerance. A changed
 * character pose or paint layer affects far more than the permitted fraction.
 */
async function pixelDifference(page:import("@playwright/test").Page,a:Buffer,b:Buffer):Promise<number>{
  return page.evaluate(async ([first,second])=>{
    async function decode(source:string){
      const image=new Image();
      image.src="data:image/png;base64,"+source;
      await image.decode();
      const canvas=document.createElement("canvas");
      canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Canvas pixel inspection unavailable.");
      ctx.drawImage(image,0,0);
      return {width:canvas.width,height:canvas.height,
        pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data};
    }
    const x=await decode(first),y=await decode(second);
    if(x.width!==y.width||x.height!==y.height)return 1;
    let changed=0;
    for(let i=0;i<x.pixels.length;i+=4){
      if(Math.max(Math.abs(x.pixels[i]-y.pixels[i]),
        Math.abs(x.pixels[i+1]-y.pixels[i+1]),
        Math.abs(x.pixels[i+2]-y.pixels[i+2]),
        Math.abs(x.pixels[i+3]-y.pixels[i+3]))>8)changed++;
    }
    return changed/(x.pixels.length/4);
  },[a.toString("base64"),b.toString("base64")] as const);
}
async function seek(page:import("@playwright/test").Page,frame:number){
  const range=page.getByRole("slider",{name:"Film frame"});
  await range.evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw Error("Native range setter unavailable.");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(range).toHaveValue(String(frame));
  await expect(page.locator("[data-km-ink-scene]")).toHaveAttribute("data-km-ink-scene-frame",String(frame));
}
test("ink character director: both aspects, IK legs, frame-exact reverse seek and reduced-motion hold",
  async ({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-character-director--continuous-walk&viewMode=story");
    await expect(page.locator("[data-km-ink-scene]")).toBeVisible();
    for(const aspect of ["landscape","portrait"] as const){
      await page.getByRole("combobox",{name:"Output"}).selectOption(aspect);
      const actor=page.locator("[data-km-ink-character]");
      await expect(actor).toBeVisible();
      await expect(actor.locator('[data-part="far-thigh"]')).toHaveCount(1);
      await expect(actor.locator('[data-part="far-shin"]')).toHaveCount(1);
      await expect(actor.locator('[data-part="near-thigh"]')).toHaveCount(1);
      await expect(actor.locator('[data-part="near-shin"]')).toHaveCount(1);
      // INK6: the separate painted hem follows the gait; the control must
      // change the ACTUAL parent's child-part transform in each aspect ratio.
      const flowSlider=page.getByRole("slider",{name:"Cloth follow-through"});
      await expect(flowSlider).toHaveValue("0.75");
      await seek(page,110);
      const hem=actor.locator('[data-part="hem-drape"]');
      await expect(hem).toHaveCount(1);
      const movingTransform=await hem.getAttribute("transform");
      await flowSlider.evaluate(node=>{
        const input=node as HTMLInputElement;
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        if(!setter)throw Error("Range setter unavailable.");
        setter.call(input,"0");
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      });
      await expect(flowSlider).toHaveValue("0");
      await expect.poll(()=>hem.getAttribute("transform")).not.toBe(movingTransform);
      await flowSlider.evaluate(node=>{
        const input=node as HTMLInputElement;
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        if(!setter)throw Error("Range setter unavailable.");
        setter.call(input,"0.75");
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      });
      await expect(flowSlider).toHaveValue("0.75");
      await expect.poll(()=>hem.getAttribute("transform")).toBe(movingTransform);
      await expect(actor.locator('[data-part="brush-grip"]')).toHaveCount(1);
      // INK5 costume-density controls must change real part-local geometry,
      // not merely a frame-wide color filter or decorative UI slider.
      const foldSlider=page.getByRole("slider",{name:"Garment brush detail"});
      await expect(foldSlider).toHaveValue("1");
      const brushShapes=actor.locator("[data-km-ink-character-shape]");
      const fullCount=await brushShapes.count();
      await foldSlider.evaluate(node=>{
        const input=node as HTMLInputElement;
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        setter?.call(input,"0");
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      });
      await expect(foldSlider).toHaveValue("0");
      await expect.poll(()=>brushShapes.count()).toBeLessThan(fullCount);
      await foldSlider.evaluate(node=>{
        const input=node as HTMLInputElement;
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        setter?.call(input,"1");
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      });
      await expect(foldSlider).toHaveValue("1");
      await expect.poll(()=>brushShapes.count()).toBe(fullCount);
      const shots:Record<number,Buffer>={};
      for(const frame of [0,85,135,235,310,419]){
        await seek(page,frame);
        const png=await page.locator("[data-km-ink-scene]").screenshot({
          animations:"disabled",
          path:info.outputPath("ink-director-"+aspect+"-"+String(frame).padStart(3,"0")+".png"),
        });
        shots[frame]=png;
      }
      expect(sha(shots[0])).not.toEqual(sha(shots[135]));
      expect(sha(shots[135])).not.toEqual(sha(shots[419]));
      await seek(page,135);
      const replay=await page.locator("[data-km-ink-scene]").screenshot({animations:"disabled"});
      const diff=await pixelDifference(page,shots[135],replay);
      expect(diff,"A repeated absolute ink frame must preserve scene pixels within a tiny raster tolerance").toBeLessThan(.001);
      await page.getByRole("checkbox",{name:"Reduced motion"}).check();
      await seek(page,0);
      await expect(actor).toHaveAttribute("data-km-ink-character-frame","419");
      await page.getByRole("checkbox",{name:"Reduced motion"}).uncheck();
    }
  });

test("Character Director can compare the actual actor crop with the untouched full film",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-character-director--continuous-walk&viewMode=story");
  const framing=page.getByRole("combobox",{name:"Director preview framing"});
  await expect(framing).toHaveValue("figure");
  await seek(page,244);
  const stage=page.locator("[data-km-ink-scene]");
  const close=await stage.screenshot({animations:"disabled",
    path:info.outputPath("ink-director-actor-inspection.png")});
  await framing.selectOption("wide");
  const wide=await stage.screenshot({animations:"disabled",
    path:info.outputPath("ink-director-full-film.png")});
  expect(await pixelDifference(page,close,wide)).toBeGreaterThan(.05);
  await framing.selectOption("figure");
  await seek(page,244);
  expect(await pixelDifference(page,close,
    await stage.screenshot({animations:"disabled"}))).toBeLessThan(.001);
});
