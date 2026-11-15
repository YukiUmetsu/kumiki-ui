import {test,expect} from "@playwright/test";

/** Render real source-driven actors and their joint-bound exchange, not mockup images. */
test("RISO14: two-human acting, 16:9 and 9:16, all separations",async({page},info)=>{
  const pageErrors:string[]=[],consoleErrors:string[]=[];
  page.on("pageerror",e=>pageErrors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
  await page.setViewportSize({width:1750,height:1280});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--human-ensemble-acting&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const stage=page.locator("svg[data-km-riso-human-ensemble-frame]");
  await expect(stage).toBeVisible();
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO ensemble aspect"}).selectOption(aspect);
    await expect(stage).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    for(const frame of [0,92,142,160,198,239]){
      const slider=page.getByRole("slider",{name:"RISO ensemble film frame"});
      await slider.evaluate((node,value)=>{
        const input=node as HTMLInputElement;
        const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        if(!set)throw new Error("Native range setter missing");
        set.call(input,String(value));
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      },frame);
      await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-frame",String(frame));
      await expect(stage.locator("[data-km-riso-human-actor]")).toHaveCount(2);
      await expect(stage.locator('[data-km-riso-human-actor="paper-artist"]')).toHaveCount(1);
      if(frame>=142)await expect(stage.locator("[data-km-riso-human-ensemble-sheet]")).toHaveCount(1);
      else await expect(stage.locator("[data-km-riso-human-ensemble-sheet]")).toHaveCount(0);
      await stage.screenshot({path:info.outputPath(aspect+"-two-humans-"+frame+".png"),
        animations:"disabled"});
    }
  }
  await page.getByRole("combobox",{name:"RISO ensemble ink plate"}).selectOption("blue");
  await expect(stage.locator('[data-km-riso-part="mouth"]')).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO ensemble ink plate"}).selectOption("red");
  await expect(stage.locator('[data-km-riso-part="mouth"]')).toHaveCount(2);
  await page.getByRole("combobox",{name:"RISO ensemble ink plate"}).selectOption("both");
  await page.getByRole("checkbox",{name:"RISO ensemble contact anchors"}).check();
  await expect(stage.locator("[data-km-riso-ensemble-debug-anchors] circle")).toHaveCount(2);
  await stage.screenshot({path:info.outputPath("dual-actor-anchor-debug.png"),
    animations:"disabled"});
  await page.getByRole("checkbox",{name:"RISO ensemble contact anchors"}).uncheck();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
