import { test,expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function seek(slider: Locator, frame: number) {
  await slider.evaluate((node, n) => {
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Native input setter unavailable");
    setter.call(input,String(n));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
}
test("Risograph actors: real Storybook motion and plate isolation in both aspect ratios",async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-characters--paper-courier-performance&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const slider=page.getByRole("slider",{name:"Risograph character film frame"});
  await expect(slider).toBeVisible();
  for(const aspect of ["landscape","portrait"] as const){
    if(aspect==="portrait")
      await page.getByRole("combobox",{name:"Riso performance output"}).selectOption("portrait");
    const stage=page.locator("svg[data-km-riso-performance]");
    await expect(stage).toHaveAttribute("viewBox",aspect==="landscape"?"0 0 960 540":"0 0 540 960");
    for(const at of [0,32,76,80,128,157,166,198,239]){
      await seek(slider,at);
      await expect(slider).toHaveValue(String(at));
      await expect(stage).toHaveAttribute("data-km-riso-performance-frame",String(at));
      await expect(stage.locator('[data-km-riso-character="courier"]')).toHaveCount(2);
      await expect(stage.locator('[data-km-riso-character="paper-bird"]')).toHaveCount(2);
      await stage.screenshot({
        path:info.outputPath("riso-"+aspect+"-characters-"+at+".png"),
        animations:"disabled",
      });
    }
    await seek(slider,157);
    await expect(stage.locator('[data-km-riso-character="courier"]').first()).toHaveAttribute(
      "data-km-riso-expression","speak");
    const screenshot=await stage.screenshot({animations:"disabled"});
    await seek(slider,239);
    await seek(slider,157);
    const repeated=await stage.screenshot({animations:"disabled",
      path:info.outputPath("riso-"+aspect+"-seek-return.png")});
    expect(repeated.equals(screenshot)).toBe(true);
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("red");
    await expect(stage.locator("[data-km-riso-plate]")).toHaveCount(1);
    await expect(stage.locator("[data-km-riso-plate]")).toHaveAttribute("data-km-riso-plate","red");
    await stage.screenshot({path:info.outputPath("riso-"+aspect+"-red-only.png"),animations:"disabled"});
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("blue");
    await expect(stage.locator("[data-km-riso-plate]")).toHaveAttribute("data-km-riso-plate","blue");
    await stage.screenshot({path:info.outputPath("riso-"+aspect+"-blue-only.png"),animations:"disabled"});
    await page.getByRole("combobox",{name:"Ink plate isolation"}).selectOption("both");
    await page.getByRole("checkbox",{name:"Reduced motion"}).check();
    await expect(stage.locator('[data-km-riso-character="courier"]').first()).toHaveAttribute(
      "data-km-riso-expression","smile");
    await page.getByRole("checkbox",{name:"Reduced motion"}).uncheck();
  }
});
