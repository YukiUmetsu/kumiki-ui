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
    return panels.locator('[data-km-riso30-hand="'+owner+'"]')
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
