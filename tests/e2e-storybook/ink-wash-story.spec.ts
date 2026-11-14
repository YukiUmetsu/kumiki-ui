import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
const url="/iframe.html?id=video-ink-any-topic--interactive&viewMode=story";
async function setFrame(slider:Locator,frame:number){
  await slider.evaluate((node,value)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Cannot set range input.");
    setter.call(input,String(value));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
}
for(const aspect of ["landscape","portrait"] as const){
  test("INK2 "+aspect+": media, diagrams, editorial typography and seek-stable ink transitions",
    async({page},info)=>{
      await page.goto(url);
      if(aspect==="portrait")await page.getByRole("combobox",{name:"Output"}).selectOption("portrait");
      await page.evaluate(()=>document.fonts.ready);
      const slider=page.getByRole("slider",{name:"Ink film frame"});
      const canvas=page.locator("[data-km-ink-scene]");
      await expect(canvas).toHaveCount(1);
      const width=aspect==="landscape"?960:540,height=aspect==="landscape"?540:960;
      const screenshot=async(frame:number)=>{
        await setFrame(slider,frame);
        await expect(slider).toHaveValue(String(frame));
        return canvas.screenshot({animations:"disabled",
          path:info.outputPath("ink-any-"+aspect+"-"+frame+".png")});
      };
      const a=await screenshot(52);
      await expect(canvas.locator("[data-km-ink-layer-host=hero-photo]")).toHaveCount(1);
      const b=await screenshot(219);
      await expect(canvas.locator("[data-km-ink-layer-host=diagram]")).toHaveCount(1);
      const c=await screenshot(402);
      await expect(canvas.locator("[data-km-ink-layer-host=final-type]")).toHaveCount(1);
      expect(a).not.toEqual(b);
      expect(b).not.toEqual(c);
      // No frame-history. Each matte and camera state is reconstituted from absolute time.
      const again=await screenshot(219);
      expect(again).toEqual(b);
      const r=await canvas.evaluate(node=>{
        const box=node.getBoundingClientRect();
        return {width:box.width,height:box.height,hasFolio:node.textContent?.includes("WATER / INK STUDY")};
      });
      expect(r.height/r.width).toBeCloseTo(height/width,2);
      expect(r.hasFolio).toBe(true);
    });
}
test("INK2 source media and live captions are valid without forcing monochrome",async({page})=>{
  await page.goto(url);
  const slider=page.getByRole("slider",{name:"Ink film frame"});
  await setFrame(slider,56);
  await expect(page.locator("[data-km-ink-scene]")).toBeVisible();
  await expect(page.locator("[data-km-ink-media] img")).toHaveCount(1);
  await page.getByRole("combobox",{name:"Visual direction"}).selectOption("meticulous");
  await expect(page.locator("[data-km-ink-scene]")).toBeVisible();
});
test("INK2 multi-shot exporter reports correct manifest and frame-ready content",async({page})=>{
  await page.goto("/iframe.html?id=video-ink-any-topic--production-export&viewMode=story");
  await page.waitForFunction(()=>typeof window.__kmVideoExport?.seek==="function");
  const capture=page.locator("[data-km-video-capture]");
  await expect(capture).toHaveAttribute("data-output-width","960");
  await expect(capture).toHaveAttribute("data-output-height","540");
  await page.evaluate(()=>window.__kmVideoExport!.seek(241));
  await expect(capture).toHaveAttribute("data-frame","241");
  await expect(capture.locator("[data-km-ink-scene]")).toBeVisible();
  await page.evaluate(()=>window.__kmVideoExport!.seek(23));
  await expect(capture).toHaveAttribute("data-frame","23");
  await expect(capture.locator("[data-km-ink-scene]")).toBeVisible();
});
