import {test,expect} from "@playwright/test";

/** ArtCraft RISO9 actual actor source renders, not a screenshot of a mockup. */
for(const actor of [
  {slug:"courier",story:"courier-artcraft-detail",frame:160,
    feature:"eye-left",details:["hair-forelock","iris-left","nostril","lip-shadow","cuff-left"]},
  {slug:"paper-bird",story:"bird-artcraft-detail",frame:124,
    feature:"left-wing",details:["wing-left-coverts","eye-ring","beak-divider","wing-right-quills"]},
]){
  test("RISO9 ArtCraft detailed rendering and ink controls: "+actor.slug,async({page},info)=>{
    const pageErrors:string[]=[],consoleErrors:string[]=[];
    page.on("pageerror",error=>pageErrors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});
    await page.setViewportSize({width:1700,height:1280});
    await page.goto(
      `/iframe.html?id=video-riso-artcraft-studies--${actor.story}&viewMode=story`,
      {waitUntil:"domcontentloaded"},
    );
    await page.evaluate(()=>document.fonts.ready);
    const stage=page.locator(`svg[data-km-riso-artcraft-studio="${actor.slug}"]`);
    await expect(stage).toBeVisible();
    await expect(stage.locator("[data-km-riso-artcraft-panel]")).toHaveCount(3);
    await expect(stage.locator("[data-km-riso-artcraft-crop]")).toHaveCount(3);
    await expect(stage.locator(`[data-km-riso-artcraft-panel="${actor.feature}"]`)).toHaveCount(1);
    for(const detail of actor.details)await expect(stage.locator(
      `[data-km-riso-part="${detail}"]`).first()).toHaveCount(1);
    await stage.screenshot({path:info.outputPath(actor.slug+"-static-artcraft.png"),
      animations:"disabled"});
    const frame=page.getByRole("slider",{name:"ArtCraft animation frame"});
    await frame.evaluate((node,n)=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("No native range setter");
      setter.call(input,String(n));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },actor.frame);
    await expect(stage).toHaveAttribute("data-km-riso-artcraft-frame",String(actor.frame));
    await stage.screenshot({path:info.outputPath(actor.slug+"-expression-stress.png"),
      animations:"disabled"});
    await page.getByRole("checkbox",{name:"ArtCraft show source mesh"}).check();
    await expect(stage.locator(`[data-km-riso-artcraft-mesh="${actor.feature}"]`)).toBeVisible();
    await stage.screenshot({path:info.outputPath(actor.slug+"-mesh-detail.png"),
      animations:"disabled"});
    await page.getByRole("checkbox",{name:"ArtCraft show source mesh"}).uncheck();
    await expect(stage.locator("[data-km-riso-artcraft-mesh]")).toHaveCount(0);
    await page.getByRole("combobox",{name:"ArtCraft ink plate"}).selectOption("blue");
    await expect(stage).toHaveAttribute("data-km-riso-artcraft-plate","blue");
    await expect(stage.locator("[data-km-riso-character]").first()).toHaveCount(1);
    await page.getByRole("combobox",{name:"ArtCraft ink plate"}).selectOption("red");
    await expect(stage).toHaveAttribute("data-km-riso-artcraft-plate","red");
    await page.getByRole("combobox",{name:"ArtCraft ink plate"}).selectOption("both");
    const zoom=page.getByRole("slider",{name:"ArtCraft study zoom"});
    await zoom.evaluate(node=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("No native setter");
      setter.call(input,"2");
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await expect(stage).toHaveAttribute("data-km-riso-artcraft-zoom","2");
    await stage.screenshot({path:info.outputPath(actor.slug+"-zoomed-detail.png"),
      animations:"disabled"});
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
