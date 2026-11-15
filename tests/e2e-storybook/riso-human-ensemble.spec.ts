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
  await expect(stage).toHaveAttribute("data-km-riso-print","");
  await expect(stage.locator("[data-km-riso-foot-contact]")).toHaveCount(4);
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO ensemble aspect"}).selectOption(aspect);
    await expect(stage).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    const artBox=await stage.boundingBox();
    expect(artBox).not.toBeNull();
    expect(artBox!.width).toBeGreaterThan(aspect==="portrait"?400:800);
    expect(artBox!.width).toBeLessThanOrEqual(aspect==="portrait"?455:965);
    expect(artBox!.height).toBeGreaterThan(aspect==="portrait"?730:500);
    expect(artBox!.height).toBeLessThanOrEqual(aspect==="portrait"?805:545);
    const container=page.locator(`[data-km-riso-ensemble-stage-container="${aspect}"]`);
    await expect(container).toBeVisible();
    const containerBox=await container.boundingBox();
    expect(containerBox).not.toBeNull();
    expect(Math.abs(containerBox!.height-artBox!.height)).toBeLessThan(6);
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
      // A passing DOM count is not sufficient: both actors must actually be
      // within the visible paper bounds at every selected film frame.
      for(const actorName of ["courier","paper-artist"]){
        const actor=stage.locator(`[data-km-riso-human-actor="${actorName}"]`);
        const bb=await actor.boundingBox();
        expect(bb,actorName+" bbox at "+frame).not.toBeNull();
        expect(bb!.width,actorName).toBeGreaterThan(8);
        expect(bb!.height,actorName).toBeGreaterThan(20);
        expect(bb!.x,actorName).toBeGreaterThan(artBox!.x-4);
        expect(bb!.x+bb!.width,actorName).toBeLessThan(artBox!.x+artBox!.width+4);
        expect(bb!.y,actorName).toBeGreaterThan(artBox!.y-4);
        expect(bb!.y+bb!.height,actorName).toBeLessThan(artBox!.y+artBox!.height+4);
      }
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
  const cell=page.getByRole("slider",{name:"RISO ensemble screen cell"});
  await cell.evaluate(node=>{
    const input=node as HTMLInputElement;
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!set)throw new Error("Missing range setter");
    set.call(input,"9");input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(page.getByText("Screen cell · 9px")).toBeVisible();
  await expect(stage.locator('pattern[width="9"]')).toHaveCount(2);
  await page.getByRole("slider",{name:"RISO ensemble paper grain"}).evaluate(node=>{
    const input=node as HTMLInputElement;
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!set)throw new Error("Missing range setter");
    set.call(input,"0.75");input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(page.getByText("Paper fibres · 0.75")).toBeVisible();
  await stage.screenshot({path:info.outputPath("two-human-native-ink-paper-calibration.png"),
    animations:"disabled"});
  // The Storybook preview runs at 24fps, while its frame evaluator remains
  // absolute-time and independent of previous seek history.
  const before=await stage.getAttribute("data-km-riso-human-ensemble-frame");
  await page.getByRole("button",{name:"Play Risograph ensemble"}).click();
  await expect.poll(()=>stage.getAttribute("data-km-riso-human-ensemble-frame"),
    {timeout:3000}).not.toBe(before);
  await page.getByRole("button",{name:"Pause Risograph ensemble"}).click();
  await expect(page.getByRole("button",{name:"Play Risograph ensemble"})).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
