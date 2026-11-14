import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
async function seek(slider:Locator,frame:number){
  await slider.evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("No native range setter");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
}
async function pixelDiff(page:Page,a:Buffer,b:Buffer){
  return page.evaluate(async ([one,two])=>{
    const read=async(base64:string)=>{
      const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));
      const bitmap=await createImageBitmap(new Blob([bytes],{type:"image/png"}));
      const canvas=document.createElement("canvas");
      canvas.width=bitmap.width;canvas.height=bitmap.height;
      const ctx=canvas.getContext("2d");
      if(!ctx)throw new Error("No canvas");
      ctx.drawImage(bitmap,0,0);bitmap.close();
      return ctx.getImageData(0,0,canvas.width,canvas.height).data;
    };
    const x=await read(one),y=await read(two);
    if(x.length!==y.length)throw new Error("Screenshot dimensions differ");
    let changed=0;
    for(let i=0;i<x.length;i+=4){
      if(Math.abs(x[i]-y[i])>2||Math.abs(x[i+1]-y[i+1])>2||
        Math.abs(x[i+2]-y[i+2])>2||Math.abs(x[i+3]-y[i+3])>2)changed++;
    }
    return changed;
  },[a.toString("base64"),b.toString("base64")] as [string,string]);
}
test("RISC1 printed multi-actor film: expressions, cel hold, scene camera and deterministic seek",async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-characters--performance-lab&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const slider=page.getByRole("slider",{name:"Riso character film frame"});
  const output=page.getByRole("combobox",{name:"Riso character output"});
  const scene=page.locator("svg[data-km-riso-scene]");
  await expect(slider).toBeVisible();
  for(const aspect of ["landscape","portrait"] as const){
    if(aspect==="portrait")await output.selectOption("portrait");
    await expect(scene).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    const at=[0,26,94,96,100,101,126,142,160,299,300,365,420,450,580,599];
    for(const frame of at){
      await seek(slider,frame);
      await expect(slider).toHaveValue(String(frame));
      await expect(scene).toHaveAttribute("data-km-riso-scene-frame",String(frame<300?frame:frame-300));
      await expect(scene.locator("[data-km-riso-actor]")).toHaveCount(4);
      await expect(scene.locator("[data-km-riso-plate]")).toHaveCount(2);
      await expect(scene).toHaveAttribute("data-km-riso-scene",frame<300?
        "riso-postcard-"+aspect:"riso-night-garden-"+aspect);
      await scene.screenshot({animations:"disabled",
        path:info.outputPath("riso-"+aspect+"-actors-"+frame+".png")});
      if(frame===100||frame===101){
        await expect(scene.locator('[data-km-riso-actor="courier"]').first())
          .toHaveAttribute("data-km-riso-pose-frame","100");
      }
    }
    await seek(slider,142);
    const talk=await scene.locator('[data-km-riso-mark="mouth"]').first().getAttribute("d");
    await seek(slider,152);
    const rest=await scene.locator('[data-km-riso-mark="mouth"]').first().getAttribute("d");
    expect(talk).not.toBe(rest);
    await seek(slider,160);
    const before=await scene.screenshot({animations:"disabled"});
    await seek(slider,599);await seek(slider,0);await seek(slider,160);
    const after=await scene.screenshot({animations:"disabled",
      path:info.outputPath("riso-"+aspect+"-actors-160-reseek.png")});
    expect(await pixelDiff(page,before,after)).toBe(0);
  }
  await page.getByRole("checkbox",{name:"Reduced motion"}).check();
  await seek(slider,0);
  await expect(scene.locator('[data-km-riso-actor="courier"]').first())
    .toHaveAttribute("data-km-riso-pose-frame","298");
  await page.getByRole("checkbox",{name:"Reduced motion"}).uncheck();
  await page.getByRole("combobox",{name:"Riso character cel hold"}).selectOption("3");
  await seek(slider,100);
  await expect(scene.locator('[data-km-riso-actor="courier"]').first())
    .toHaveAttribute("data-km-riso-pose-frame","99");
  await page.getByRole("checkbox",{name:"Authored camera"}).uncheck();
  await scene.screenshot({animations:"disabled",path:info.outputPath("riso-no-camera.png")});
});
