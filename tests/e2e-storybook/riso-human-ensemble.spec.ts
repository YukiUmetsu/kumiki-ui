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
    for(const frame of [0,92,142,160,177,189,202,239]){
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
      // Only authored fingertips sit in front of the paper, and only after
      // the advancing sheet reaches each contact root.
      await expect(stage.locator('[data-km-riso-paper-knockout="courier-grip"]'))
        .toHaveCount(frame>=142&&frame<=177?1:0);
      await expect(stage.locator('[data-km-riso-paper-knockout="artist-grip"]'))
        .toHaveCount(frame>=160?1:0);
      if(frame===142)await expect(stage).toHaveAttribute("data-km-riso-handoff-phase","unfurl");
      if(frame===160)await expect(stage).toHaveAttribute("data-km-riso-handoff-phase","shared");
      if(frame===189)await expect(stage).toHaveAttribute("data-km-riso-handoff-phase","release");
      if(frame>=202){
        await expect(stage).toHaveAttribute("data-km-riso-handoff-phase","received");
        await expect(stage).toHaveAttribute("data-km-riso-handoff-owner","receiver");
      }
      // Real press-bound paper creases exist only while those exact two
      // articulated hands physically touch their respective paper edges.
      if(frame===0||frame===92)
        await expect(stage.locator("[data-km-riso-contact-crease]")).toHaveCount(0);
      if(frame===160||frame===177)
        await expect(stage.locator("[data-km-riso-contact-crease]")).toHaveCount(6);
      if(frame>=202){
        await expect(stage.locator('[data-km-riso-contact-crease^="source-"]')).toHaveCount(0);
        await expect(stage.locator('[data-km-riso-contact-crease^="receiver-"]')).toHaveCount(3);
      }
      await stage.screenshot({path:info.outputPath(aspect+"-two-humans-"+frame+".png"),
        animations:"disabled"});
    }
  }
  await expect(stage.locator('[data-km-riso-transfer-plate="blue"]')).toHaveCount(1);
  await expect(stage.locator('[data-km-riso-transfer-plate="red"]')).toHaveCount(1);
  // The opaque paper and both ink masters must share one deformable contour.
  // The donor is no longer an upper paper overlay once the print transfers.
  await expect(stage.locator('[data-km-riso-paper-knockout="courier-grip"]')).toHaveCount(0);
  await expect(stage.locator('[data-km-riso-paper-knockout="artist-grip"]')).toHaveCount(1);
  const initialPaper=await stage.locator("[data-km-riso-human-ensemble-sheet]").getAttribute("d");
  expect(initialPaper).toMatch(/^M.+Z$/);
  const setRange=async(name:string,value:string)=>{
    await page.getByRole("slider",{name}).evaluate((node,amount)=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("Missing native range setter");
      setter.call(input,String(amount));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
  };
  await expect(stage.locator('[data-km-riso-contact-shadow="receiver"]')).toHaveCount(1);
  await setRange("RISO ensemble pressure crease depth","0");
  await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-imprint-depth","0");
  await expect(stage.locator("[data-km-riso-contact-crease]")).toHaveCount(0);
  await expect(stage.locator("[data-km-riso-contact-shadow]")).toHaveCount(0);
  await setRange("RISO ensemble pressure crease depth","1");
  await expect(stage.locator('[data-km-riso-contact-crease^="receiver-"]')).toHaveCount(3);
  await setRange("RISO ensemble donor release frame","172");
  await setRange("RISO ensemble transfer duration","20");
  await setRange("RISO ensemble receiver paper tilt","-58");
  await expect(stage).toHaveAttribute("data-km-riso-handoff-phase","received");
  await expect(stage).toHaveAttribute("data-km-riso-handoff-owner","receiver");
  await setRange("RISO ensemble paper curl","9");
  await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-paper-curl","9");
  const curvedPaper=await stage.locator("[data-km-riso-human-ensemble-sheet]").getAttribute("d");
  expect(curvedPaper).not.toEqual(initialPaper);
  await setRange("RISO ensemble paper grip pinch","0.8");
  await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-grip-pinch","0.8");
  const pinchedPaper=await stage.locator("[data-km-riso-human-ensemble-sheet]").getAttribute("d");
  expect(pinchedPaper).not.toEqual(curvedPaper);
  await expect(stage.locator("[data-km-riso-transfer-fold-shade]")).toHaveCount(1);
  await page.getByRole("checkbox",{name:"RISO ensemble anatomical fingertip occlusion"}).uncheck();
  await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-contact-overprint","false");
  await expect(stage.locator("[data-km-riso-grip-occlusion]")).toHaveCount(0);
  await page.getByRole("checkbox",{name:"RISO ensemble anatomical fingertip occlusion"}).check();
  await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-contact-overprint","true");
  // The 239f received state owns the paper only at the receiver. Donor
  // fingers must not float on a transferred sheet after release. The old
  // two-grip assertion was a stale RISO17 assumption, not valid handoff QA.
  await expect(stage.locator("[data-km-riso-grip-occlusion]")).toHaveCount(1);
  await expect(stage.locator('[data-km-riso-grip-occlusion="artist-grip"]')).toHaveCount(1);
  await expect(stage.locator('[data-km-riso-grip-occlusion="courier-grip"]')).toHaveCount(0);
  await expect(stage.locator("[data-km-riso-transfer-postmark]")).toHaveCount(1);
  await page.getByRole("checkbox",{name:"RISO ensemble fine printed-sheet detail"}).uncheck();
  await expect(stage.locator("[data-km-riso-transfer-postmark]")).toHaveCount(0);
  await expect(stage.locator('[data-km-riso-transfer-plate="blue"]')).toHaveCount(1);
  await page.getByRole("checkbox",{name:"RISO ensemble fine printed-sheet detail"}).check();
  await expect(stage.locator("[data-km-riso-transfer-postmark]")).toHaveCount(1);
  await page.getByRole("combobox",{name:"RISO ensemble ink plate"}).selectOption("blue");
  await expect(stage.locator('[data-km-riso-transfer-plate="red"]')).toHaveCount(0);
  await expect(stage.locator('[data-km-riso-part="mouth"]')).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO ensemble ink plate"}).selectOption("red");
  await expect(stage.locator('[data-km-riso-transfer-plate="blue"]')).toHaveCount(0);
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
