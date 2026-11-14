import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const URL="/iframe.html?id=video-ink-character--interactive&viewMode=story";
async function seek(slider:Locator,frame:number){
  await slider.evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Range setter not found.");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
}
for(const aspect of ["landscape","portrait"] as const) {
  test("INK3 "+aspect+": articulated figure, face, material and seek-stable stage",async({page},info)=>{
    await page.goto(URL);
    await page.evaluate(()=>document.fonts.ready);
    if(aspect==="portrait")await page.getByRole("combobox",{name:"Ink actor output"}).selectOption("portrait");
    const slider=page.getByRole("slider",{name:"Ink actor frame"});
    const canvas=page.locator("[data-km-ink-scene]");
    await expect(canvas).toHaveCount(1);
    const capture=async(frame:number)=>{
      await seek(slider,frame);
      await expect(slider).toHaveValue(String(frame));
      await expect(canvas.locator("[data-km-ink-character]")).toHaveCount(1);
      await expect(canvas.locator("[data-km-ink-character-shape]").first()).toBeVisible();
      return canvas.screenshot({animations:"disabled",
        path:info.outputPath("ink-actor-"+aspect+"-"+frame+".png")});
    };
    const walking=await capture(82);
    const speaking=await capture(195);
    const bow=await capture(288);
    expect(walking).not.toEqual(speaking);
    expect(speaking).not.toEqual(bow);
    expect(await capture(195)).toEqual(speaking);
    const rect=await canvas.evaluate(el=>el.getBoundingClientRect().toJSON());
    expect(rect.height/rect.width).toBeCloseTo(aspect==="portrait"?960/540:540/960,2);
    await expect(canvas.locator("[data-part=eyes]")).toHaveCount(1);
    await expect(canvas.locator("[data-part=mouth]")).toHaveCount(1);
    await expect(canvas.locator("[data-part=brush]")).toHaveCount(1);
    await expect(canvas.locator("feDisplacementMap")).toHaveCount(1);
  });
}
for(const [aspect,story] of [
  ["landscape","video-ink-character--production-export"],
  ["portrait","video-ink-character--portrait-export"],
] as const) {
  test("INK3 "+aspect+": exporter keeps rigs at absolute production frames",async({page})=>{
    await page.goto("/iframe.html?id="+story+"&viewMode=story");
    await page.waitForFunction(()=>typeof window.__kmVideoExport?.seek==="function");
    const capture=page.locator("[data-km-video-capture]");
    await expect(capture).toHaveAttribute("data-output-width",aspect==="portrait"?"540":"960");
    await expect(capture).toHaveAttribute("data-output-height",aspect==="portrait"?"960":"540");
    for(const frame of [190,78,321]){
      await page.evaluate(f=>window.__kmVideoExport!.seek(f),frame);
      await expect(capture).toHaveAttribute("data-frame",String(frame));
      await expect(capture.locator("[data-km-ink-character]")).toHaveCount(1);
    }
  });
}
