import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function setFrame(page: Page, value: number) {
  const slider=page.getByRole("slider",{name:"Rigging microscope frame"});
  await slider.evaluate((node,n)=>{
    const element=node as HTMLInputElement;
    const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!native)throw new Error("No native range setter");
    native.call(element,String(n));
    element.dispatchEvent(new Event("input",{bubbles:true}));
    element.dispatchEvent(new Event("change",{bubbles:true}));
  },value);
  await expect(slider).toHaveValue(String(value));
  // React's controlled range value can update before the SVG has committed.
  // Wait for the *rendered paper frame*, not just the input's DOM value.
  await expect(page.locator("svg[data-km-riso-rig-lab]"))
    .toHaveAttribute("data-km-riso-rig-frame",String(value));
}
/** Chromium's SVG antialiasing may change a few edge pixels after DOM remounts.
 * Compare decoded pixels with a strict bounded tolerance, not encoded PNG bytes.
 */
async function pixelDelta(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([base64A,base64B])=>{
    const read=async (raw:string)=>{
      const bytes=Uint8Array.from(atob(raw),ch=>ch.charCodeAt(0));
      const bitmap=await createImageBitmap(new Blob([bytes],{type:"image/png"}));
      const canvas=document.createElement("canvas");
      canvas.width=bitmap.width; canvas.height=bitmap.height;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Canvas 2D is unavailable");
      context.drawImage(bitmap,0,0);bitmap.close();
      return {bytes:context.getImageData(0,0,canvas.width,canvas.height).data,
        width:canvas.width,height:canvas.height};
    };
    const x=await read(base64A),y=await read(base64B);
    if(x.width!==y.width||x.height!==y.height)return {changed:Infinity,peak:255,total:1};
    let changed=0,peak=0;
    for(let i=0;i<x.bytes.length;i+=4){
      let d=0;
      for(let k=0;k<4;k++)d=Math.max(d,Math.abs(x.bytes[i+k]-y.bytes[i+k]));
      if(d>0)changed++;
      peak=Math.max(peak,d);
    }
    return {changed,peak,total:x.width*x.height};
  },[a.toString("base64"),b.toString("base64")] as [string,string]);
}
test("RISO3 magnified rig: real stance foot planting, gait close-ups, FK comparison and seeking",async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-rig-lab--rigging-microscope&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const stage=page.locator("svg[data-km-riso-rig-lab]");
  await expect(stage).toBeVisible();
  await expect(page.getByRole("checkbox",{name:"Enable IK in microscope"})).toBeChecked();
  await expect(page.getByRole("checkbox",{name:"Show joints and IK foot targets"})).toBeChecked();
  await setFrame(page,10);
  const left=stage.locator('[data-km-riso-foot-target="left-foot-lock"]');
  await expect(left).toHaveCount(1);
  await expect(stage.locator('[data-km-riso-grip-target="satchel-handhold"]')).toHaveCount(1);
  const targetX=await left.locator("circle").getAttribute("cx");
  const targetY=await left.locator("circle").getAttribute("cy");
  const hip=stage.locator('[data-km-riso-joint="left-leg"]');
  const initialHip=Number(await hip.getAttribute("cx"));
  await stage.screenshot({path:info.outputPath("riso3-stance-planted.png"),animations:"disabled"});
  await setFrame(page,36);
  await expect(stage.locator('[data-km-riso-grip-target="satchel-handhold"]')).toHaveCount(1);
  const gripError = Number(await stage.locator('[data-km-riso-grip-target="satchel-handhold"]')
    .getAttribute("data-km-riso-ik-error"));
  expect(gripError).toBeLessThan(.001);
  await expect(left.locator("circle")).toHaveAttribute("cx",targetX!);
  await expect(left.locator("circle")).toHaveAttribute("cy",targetY!);
  expect(Math.abs(Number(await hip.getAttribute("cx"))-initialHip)).toBeGreaterThan(10);
  const plantedError=Number(await left.getAttribute("data-km-riso-foot-error"));
  expect(plantedError).toBeLessThan(.001);
  for(const at of [0,25,46,53,78,112,143,198,239]) {
    await setFrame(page,at);
    await expect(stage).toHaveAttribute("data-km-riso-rig-frame",String(at));
    await stage.screenshot({path:info.outputPath("riso3-rig-f"+String(at).padStart(3,"0")+".png"),
      animations:"disabled"});
  }
  await setFrame(page,46);
  const ik=await stage.screenshot({animations:"disabled",path:info.outputPath("riso3-ik-swing.png")});
  await page.getByRole("checkbox",{name:"Enable IK in microscope"}).uncheck();
  await expect(stage.locator("[data-km-riso-foot-target]")).toHaveCount(0);
  const fk=await stage.screenshot({animations:"disabled",path:info.outputPath("riso3-fk-original.png")});
  expect(ik.equals(fk)).toBe(false);
  await page.getByRole("checkbox",{name:"Enable IK in microscope"}).check();
  await expect(stage.locator("[data-km-riso-foot-target]")).toHaveCount(2);
  const renewed=await stage.screenshot({animations:"disabled",
    path:info.outputPath("riso3-ik-restored.png")});
  const delta=await pixelDelta(page,ik,renewed);
  // The decoded art must be visually identical, allowing only subpixel edge
  // antialias noise after React swaps the SVG tree.
  expect(delta.changed).toBeLessThan(delta.total*.005);
  expect(delta.peak).toBeLessThan(48);
  await page.getByRole("checkbox",{name:"Show joints and IK foot targets"}).uncheck();
  await expect(stage.locator("[data-km-riso-rig-diagnostics]")).toHaveCount(0);
  await stage.screenshot({path:info.outputPath("riso3-clean-animation-frame.png"),animations:"disabled"});
  await page.getByRole("combobox",{name:"Microscope spot ink plate"}).selectOption("red");
  await expect(stage.locator('[data-km-riso-plate="red"]')).toHaveCount(1);
  await expect(stage.locator('[data-km-riso-plate="blue"]')).toHaveCount(0);
  await stage.screenshot({path:info.outputPath("riso3-vermilion-separated.png"),animations:"disabled"});
});
