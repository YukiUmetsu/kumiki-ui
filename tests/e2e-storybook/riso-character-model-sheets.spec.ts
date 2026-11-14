import {test,expect} from "@playwright/test";
for(const actor of [
  {id:"courier-construction-sheet",slug:"courier",part:"eye-left",frame:46},
  {id:"paper-bird-construction-sheet",slug:"paper-bird",part:"beak",frame:84},
]) {
  test(`Riso construction: ${actor.slug} face, body and IK mesh study`,async({page},info)=>{
    await page.setViewportSize({width:1700,height:1200});
    await page.goto(`/iframe.html?id=video-riso-character-model-sheets--${actor.id}&viewMode=story`);
    await page.evaluate(()=>document.fonts.ready);
    const svg=page.locator(`svg[data-km-riso-model-sheet="${actor.slug}"]`);
    await expect(svg).toBeVisible();
    await expect(svg.locator("[data-km-riso-sheet-full-view]")).toHaveCount(1);
    await expect(svg.locator("[data-km-riso-sheet-head-view]")).toHaveCount(1);
    const faceView=svg.locator("[data-km-riso-sheet-head-view]");
    await expect(faceView.locator(`[data-km-riso-face-ink="${actor.slug==="courier"?"nose":"eye"}"]`)).toHaveCount(1);
    await expect(faceView.locator('[data-km-riso-face-ink="wing-left"]')).toHaveCount(0);
    await expect(faceView.locator('[data-km-riso-face-ink="left-upper-sleeve"]')).toHaveCount(0);
    await expect(svg.locator("[data-km-riso-sheet-pose]")).toHaveCount(3);
    await expect(svg.locator("[data-km-riso-mesh-region]").first()).toBeVisible();
    await page.getByRole("combobox",{name:"Character sheet selected region"})
      .selectOption(actor.part);
    await expect(svg).toHaveAttribute("data-km-riso-sheet-feature",actor.part);
    await expect(svg.locator(`[data-km-riso-focused-region="${actor.part}"]`)).toHaveCount(1);
    const slider=page.getByRole("slider",{name:"Character sheet frame"});
    await slider.evaluate((node,frame)=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("No native slider setter");
      setter.call(input,String(frame));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },actor.frame);
    await expect(slider).toHaveValue(String(actor.frame));
    await expect(svg).toHaveAttribute("data-km-riso-sheet-frame",String(actor.frame));
    await svg.screenshot({path:info.outputPath(`${actor.slug}-proportion-mesh.png`),animations:"disabled"});
    const download=page.waitForEvent("download");
    await page.getByRole("button",{name:"Export SVG sheet"}).click();
    expect((await download).suggestedFilename()).toBe(`${actor.slug}-construction-sheet.svg`);
    await page.getByRole("checkbox",{name:"Mesh triangles"}).uncheck();
    await expect(svg.locator("[data-km-riso-mesh-triangle]")).toHaveCount(0);
    await page.getByRole("checkbox",{name:"Mesh triangles"}).check();
    await expect(svg.locator("[data-km-riso-mesh-triangle]").first()).toBeVisible();
  });
}
