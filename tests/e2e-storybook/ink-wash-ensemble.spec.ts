import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
/** A single-pixel blend/antialias rounding difference isn't a timeline defect.
 * Require the decoded image to remain the same size and differ by at most
 * two channel levels in a tiny fraction of pixels.
 */
async function expectStablePixels(page: import("@playwright/test").Page, before: Buffer, after: Buffer) {
  if (digest(before) === digest(after)) return;
  const result = await page.evaluate(async ({a,b}) => {
    const decode = async (base64: string) => {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], {type: "image/png"}));
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas2D unavailable for pixel regression");
      ctx.drawImage(bmp,0,0); bmp.close();
      return {width:canvas.width,height:canvas.height,
        data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
    };
    const one=await decode(a),two=await decode(b);
    if(one.width!==two.width||one.height!==two.height) return {sameSize:false,maxDelta:255,changed:-1,total:one.width*one.height};
    let maxDelta=0,changed=0;
    for(let i=0;i<one.data.length;i+=4){
      let d=0;
      for(let k=0;k<4;k++) d=Math.max(d,Math.abs(one.data[i+k]-two.data[i+k]));
      maxDelta=Math.max(maxDelta,d);
      if(d>0)changed++;
    }
    return {sameSize:true,maxDelta,changed,total:one.width*one.height};
  },{a:before.toString("base64"),b:after.toString("base64")});
  expect(result.sameSize,JSON.stringify(result)).toBe(true);
  expect(result.maxDelta,JSON.stringify(result)).toBeLessThanOrEqual(2);
  expect(result.changed,JSON.stringify(result)).toBeLessThanOrEqual(
    Math.max(12,Math.ceil(result.total*.0001)));
}
async function seek(page: import("@playwright/test").Page, frame: number) {
  const input = page.getByRole("slider",{name:"Ink ensemble frame"});
  await input.evaluate((node,value)=>{
    const el=node as HTMLInputElement;
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!set)throw new Error("Native input value setter missing");
    set.call(el,String(value));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(input).toHaveValue(String(frame));
}
test("original ink duet uses real independent rigs, ordered scenes and frame-addressable contact review",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-ensemble--ink-ensemble-story&viewMode=story");
  const scene=page.locator('[data-km-ink-scene]');
  await expect(scene).toBeVisible();
  const actor=page.locator("[data-km-ink-ensemble-actor]");
  await expect(actor).toHaveCount(2);
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"Ink ensemble output"}).selectOption(aspect);
    await page.getByRole("checkbox",{name:"Show reach audit"}).check();
    await expect(actor).toHaveCount(2);
    await expect(page.locator("[data-km-character-presenter]")).toHaveCount(2);
    for (const frame of [10,117,188,298]){
      await seek(page,frame);
      await expect(page.locator("[data-km-ink-ensemble]")).toHaveAttribute("data-km-ink-ensemble-frame",String(frame));
      await scene.screenshot({animations:"disabled",
        path:info.outputPath("ink-duet-"+aspect+"-"+frame+".png")});
    }
    await expect(page.locator('[data-km-ink-reach="pass"]')).toHaveCount(0);
    await seek(page,188);
    await expect(page.locator('[data-km-ink-reach="pass"]')).toHaveCount(1);
    const first=await scene.screenshot({animations:"disabled"});
    await seek(page,20);await seek(page,188);
    const again=await scene.screenshot({animations:"disabled"});
    await expectStablePixels(page,first,again);
    await page.getByRole("checkbox",{name:"Show reach audit"}).uncheck();
  }
});
