import {test,expect} from "@playwright/test";

/** Native Storybook SVG/stencil proof, NOT an approval of reference likeness.
 * The experiment is intentionally off in published human-film components. */
test("RISO59 A/B retains original master geometry at rest and changes the two active hand sources at contact",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.setViewportSize({width:1600,height:1198});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--human-hand-anatomy-print&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const root=page.locator("[data-km-riso30-hands-story]");
  const panels=root.locator("[data-km-riso30-hand]");
  await expect(panels).toHaveCount(2);
  await expect(root).toHaveAttribute("data-km-riso59-preview","false");
  const toggle=page.getByRole("checkbox",{name:"RISO59 preview original joined skin"});
  const pose=page.getByRole("combobox",{name:"RISO30 gesture frame"});
  const ink=page.getByRole("combobox",{name:"RISO30 ink plate"});
  const red=async(side:"right"|"left")=>{
    const owner=side==="right"?"courier-right":"paper-artist-left";
    return root.locator('[data-km-riso30-hand="'+owner+'"]')
      .locator('[data-km-riso-part="'+side+'-glove"]').first().getAttribute("d");
  };
  await pose.selectOption("0");
  const rested=[await red("right"),await red("left")];
  expect(rested.every(Boolean)).toBe(true);
  await toggle.check();
  await expect(root).toHaveAttribute("data-km-riso59-preview","true");
  await expect(root).toHaveAttribute("data-km-riso59-joint-crests","6");
  expect([await red("right"),await red("left")]).toEqual(rested);
  await pose.selectOption("160");
  await toggle.uncheck();
  const baseline=[await red("right"),await red("left")];
  await root.screenshot({path:info.outputPath("riso59-original-two-masters-f160.png"),animations:"disabled"});
  await toggle.check();
  const candidate=[await red("right"),await red("left")];
  expect(candidate.every(Boolean)).toBe(true);
  expect(candidate[0]).not.toBe(baseline[0]);
  expect(candidate[1]).not.toBe(baseline[1]);
  for(const side of ["right","left"] as const){
    const id=side==="right"?"courier-right":"paper-artist-left";
    const panel=panels.locator('[data-km-riso30-hand="'+id+'"]');
    await expect(panel).toHaveAttribute("data-km-riso36-source-contours","12");
    await expect(panel).toHaveAttribute("data-km-riso50-palm-cubics","16");
    await expect(panel).toHaveAttribute("data-km-riso58-reconstructed-bone-rays","4");
    expect((await red(side))?.match(/C/g)).toHaveLength(16);
    for(const valley of ["middle-ring","ring-pinky"]){
      await expect(panel.locator('[data-km-riso-paper-clearance="'+side+
        '-glove-web-reserve-'+valley+'"]').first()).toBeAttached();
    }
  }
  for(const mode of ["red","blue","both"] as const){
    await ink.selectOption(mode);
    await expect(root).toHaveAttribute("data-km-riso30-ink",mode);
    await root.screenshot({path:info.outputPath("riso59-candidate-"+mode+"-master-f160.png"),animations:"disabled"});
  }
  await toggle.uncheck();
  expect([await red("right"),await red("left")]).toEqual(baseline);
  expect(errors).toEqual([]);
});

/** Render the entire original camera, joint-registered paper, and BOTH actors
 * at actual output sizes; the same shot with a preview toggle must never
 * change source rig, paper or approved stage timing. */
test("RISO59 real 16:9 and 9:16 whole-film A/B exposes the original source silhouette without changing paper",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1750,height:1280});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--human-ensemble-acting&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const stage=page.locator("svg[data-km-riso-human-ensemble-frame]");
  const checkbox=page.getByRole("checkbox",{name:"RISO59 film three-quarter skin A/B"});
  const slider=page.getByRole("slider",{name:"RISO ensemble film frame"});
  const seek=async(frame:number)=>{
    await slider.evaluate((node,value)=>{
      const input=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("Native source slider setter absent");
      setter.call(input,String(value));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },frame);
    await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-frame",String(frame));
  };
  const original=async()=>{
    const courier=await stage.locator('[data-km-riso-part="right-glove"]').first().getAttribute("d");
    const artist=await stage.locator('[data-km-riso-part="left-glove"]').first().getAttribute("d");
    const sheets=stage.locator("[data-km-riso-human-ensemble-sheet]");
    // The opening cel intentionally precedes the first paper prop. Read
    // absence as null instead of waiting three minutes for a non-existent path.
    const sheet=await sheets.count()?await sheets.first().getAttribute("d"):null;
    return {courier,artist,sheet};
  };
  await expect(stage).toHaveAttribute("data-km-riso59-film-preview","false");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO ensemble aspect"}).selectOption(aspect);
    await expect(stage).toHaveAttribute("data-km-riso-human-ensemble-aspect",aspect);
    await seek(0);
    const baselineRest=await original();
    expect(baselineRest.courier).toBeTruthy();
    expect(baselineRest.artist).toBeTruthy();
    await checkbox.check();
    await expect(stage).toHaveAttribute("data-km-riso59-film-preview","true");
    expect(await original()).toEqual(baselineRest);
    await checkbox.uncheck();
    await seek(160);
    const baseline=await original();
    expect(baseline.sheet).toBeTruthy();
    const film=page.locator('[data-km-riso-ensemble-stage-container="'+aspect+'"]');
    await film.screenshot({path:info.outputPath("riso59-"+aspect+"-original-full-film-f160.png"),animations:"disabled"});
    await checkbox.check();
    const candidate=await original();
    expect(candidate.courier).not.toBe(baseline.courier);
    expect(candidate.artist).not.toBe(baseline.artist);
    expect(candidate.sheet).toBe(baseline.sheet);
    await expect(stage).toHaveAttribute("data-km-riso43-paper-layering","index-above-thumb-below");
    await film.screenshot({path:info.outputPath("riso59-"+aspect+"-candidate-full-film-f160.png"),animations:"disabled"});
    await checkbox.uncheck();
    expect(await original()).toEqual(baseline);
  }
  expect(errors).toEqual([]);
});
