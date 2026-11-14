import {test,expect} from "@playwright/test";

async function seek(page: import("@playwright/test").Page, frame: number) {
  const slider=page.getByRole("slider",{name:"RISO5 opacity lab frame"});
  await slider.evaluate((node,n)=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("No native value setter");
    setter.call(input,String(n));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(slider).toHaveValue(String(frame));
}
test("RISO5: opaque paper knockout preserves two subject silhouettes against dense crossings",async({page},info)=>{
  await page.goto("/iframe.html?id=video-riso-opaque-lab--opaque-print-proof&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const stage=page.locator("svg[data-km-riso-opaque-lab]");
  await expect(stage).toBeVisible();
  await expect(stage.locator('[data-km-riso-opaque-backdrop="blue"]')).toHaveCount(1);
  await expect(stage.locator('[data-km-riso-opaque-backdrop="red"]')).toHaveCount(1);
  const courier=stage.locator('[data-km-riso-paper-knockout="courier"]');
  const bird=stage.locator('[data-km-riso-paper-knockout="paper-bird"]');
  await expect(courier).toHaveCount(1);
  await expect(bird).toHaveCount(1);
  for(const frame of [0,46,157,198]){
    await seek(page,frame);
    await expect(stage).toHaveAttribute("data-km-riso-opaque-frame",String(frame));
    await expect(courier.locator('[data-km-riso-character-knockout="courier"]'))
      .toHaveAttribute("data-km-riso-knockout-frame",String(Math.floor(frame/2)*2));
    await stage.screenshot({
      path:info.outputPath(`riso5-dense-opaque-f${String(frame).padStart(3,"0")}.png`),
      animations:"disabled",
    });
  }
  const trapping=page.getByRole("slider",{name:"RISO5 paper trapping"});
  await trapping.evaluate(node=>{
    const input=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("No native value setter");
    setter.call(input,"4");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(courier.locator("g[data-km-riso-character-knockout]")).toHaveAttribute("stroke-width","4");
  await page.getByRole("combobox",{name:"RISO5 ink plate"}).selectOption("blue");
  await expect(stage.locator('[data-km-riso-foreground-plate="red"]')).toHaveCount(0);
  await expect(stage.locator('[data-km-riso-foreground-plate="blue"]')).toHaveCount(2);
  await stage.screenshot({path:info.outputPath("riso5-opaque-cobalt-only.png"),animations:"disabled"});
});
