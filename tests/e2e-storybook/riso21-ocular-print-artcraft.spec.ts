import {test,expect} from "@playwright/test";

/** Actual native spot-master screenshot gate for ArtCraft v9. A human likeness
 * review and matched reference crop masks remain independent release gates.
 */
test("RISO21 both original faces: 16:9/9:16, anatomy states, distinct inks",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.setViewportSize({width:1510,height:1100});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--ocular-print-craft&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const people=page.locator("[data-km-riso21-actor]");
  await expect(people).toHaveCount(2);
  await expect(people.nth(0)).toHaveAttribute("data-km-riso21-actor","courier");
  await expect(people.nth(1)).toHaveAttribute("data-km-riso21-actor","paper-artist");
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO21 crop aspect"}).selectOption(aspect);
    const output=aspect==="portrait"?"0 0 360 640":"0 0 640 360";
    for(const frame of ["46","78","160","198"]){
      await page.getByRole("combobox",{name:"RISO21 expression pose"}).selectOption(frame);
      const inks=page.locator("svg[data-km-riso-print]");
      await expect(inks).toHaveCount(2);
      for(const actor of ["courier","paper-artist"]){
        const crop=page.locator('[data-km-riso21-actor="'+actor+'"]');
        await expect(crop).toHaveAttribute("data-km-riso21-frame",frame);
        await expect(crop).toHaveAttribute("data-km-riso21-aspect",aspect);
        const svg=crop.locator("svg[data-km-riso-print]");
        await expect(svg).toHaveAttribute("viewBox",output);
        const box=await svg.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(295);
        expect(box!.height).toBeGreaterThan(aspect==="portrait"?520:170);
        await expect(svg.locator('[data-km-riso-paper-knockout="ocular-actor"]')).toHaveCount(1);
        await expect(svg.locator('[data-km-riso-part="eye-canthus-shapes"]')).toHaveCount(1);
        await expect(svg.locator('[data-km-riso-part="eye-lash-wedges"]')).toHaveCount(1);
        await expect(svg.locator('[data-km-riso-part="eye-iris-grain"]')).toHaveCount(1);
        await expect(svg.locator('[data-km-riso-part="eye-lower-orbit-engraving"]')).toHaveCount(1);
        // RISO23: each head now exposes three physical wide-screen tonal
        // masses, instead of relying on undersampled pinprick red details.
        for(const id of ["orbital-tone-planes","zygomatic-tone-planes","jaw-shadow-planing"])
          await expect(svg.locator('[data-km-riso-part="'+id+'"]')).toHaveCount(1);
      }
      // Every actor is a separate rendered proof. A multi-match locator's
      // screenshot() is a Playwright strictness error and had never been run.
      for(const actor of ["courier","paper-artist"] as const){
        await page.locator('[data-km-riso21-actor="'+actor+'"]').screenshot({
          path:info.outputPath(aspect+"-"+actor+"-"+frame+".png"),animations:"disabled",
        });
      }
      await page.locator("main").screenshot({
        path:info.outputPath(aspect+"-pair-"+frame+".png"),animations:"disabled",
      });
    }
  }
  // ArtCraft negative control from the first RISO23 screenshot: a 6-unit
  // halftone over a ~70-unit face produces cartoon-sized isolated red freckles.
  // The default is a genuinely fine screen; retain a coarse-pitch comparison.
  const pitch=page.getByRole("slider",{name:"RISO23 screen pitch"});
  await expect(pitch).toHaveValue("2");
  const narrowTiles=await page.locator('svg[data-km-riso-print]').first()
    .locator('pattern').evaluateAll(elements=>elements.map(el=>Number(el.getAttribute("width"))));
  expect(narrowTiles).toHaveLength(2);
  expect(narrowTiles.every(value=>value>=2&&value<=2.2)).toBe(true);
  await pitch.fill("6");
  await page.locator("main").screenshot({
    path:info.outputPath("negative-control-coarse-6-unit-screen.png"),animations:"disabled",
  });
  await pitch.fill("2");
  await page.locator("main").screenshot({
    path:info.outputPath("recovered-fine-2-unit-screen.png"),animations:"disabled",
  });
  // A plate-separated physical print must be inspectable, not just asserted.
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("blue");
  await page.locator("main").screenshot({
    path:info.outputPath("blue-only-faces.png"),animations:"disabled",
  });
  await expect(page.locator('[data-km-riso-part="eye-iris-grain"]')).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("red");
  await page.locator("main").screenshot({
    path:info.outputPath("red-only-faces.png"),animations:"disabled",
  });
  await expect(page.locator('[data-km-riso-part="eye-lash-wedges"]')).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("both");
  await page.getByRole("combobox",{name:"RISO21 screening method"}).selectOption("fm");
  await expect(page.locator('[data-km-riso-screen-mode="fm"]')).toHaveCount(2);
  await page.getByRole("slider",{name:"RISO21 dot gain"}).fill("0.5");
  await expect(page.locator('svg[data-km-riso-dot-gain="0.5"]')).toHaveCount(2);
  await page.getByRole("slider",{name:"RISO23 screen coverage"}).fill("0.4");
  await expect(page.locator('svg[data-km-riso-screen-density="0.4"]')).toHaveCount(2);
  await page.locator("main").screenshot({
    path:info.outputPath("screened-face-40-percent.png"),animations:"disabled",
  });
  await page.getByRole("checkbox",{name:"RISO21 region IDs"}).check();
  await expect(page.getByText(/iris-screen-left/)).toBeVisible();
  expect(errors).toEqual([]);
});


/** RISO24: actual HTML/SVG pixels in both press formats. An opaque rendered
 * crop and image inequality are mechanical evidence only: the independent
 * ArtCraft likeness/esthetic review remains a distinct release gate.
 */
test("RISO24 ArtCraft hair-closeup: legacy versus paper-carved two-ink craft",async({page},info)=>{
  const failures:string[]=[];
  page.on("pageerror",error=>failures.push(error.message));
  page.on("console",entry=>{if(entry.type()==="error")failures.push(entry.text());});
  await page.setViewportSize({width:1520,height:1150});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--ocular-print-craft&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  await page.getByRole("combobox",{name:"RISO24 feature focus"}).selectOption("hair");
  const mode=page.getByRole("combobox",{name:"RISO24 hair craft comparison"});
  for(const aspect of ["landscape","portrait"] as const){
    await page.getByRole("combobox",{name:"RISO21 crop aspect"}).selectOption(aspect);
    for(const frame of ["46","78","198"]){
      await page.getByRole("combobox",{name:"RISO21 expression pose"}).selectOption(frame);
      await mode.selectOption("legacy");
      const old=new Map<string,Buffer>();
      for(const actor of ["courier","paper-artist"]){
        const subject=page.locator('[data-km-riso21-actor="'+actor+'"]');
        await expect(subject).toHaveAttribute("data-km-riso24-focus","hair");
        await expect(subject).toHaveAttribute("data-km-riso24-study","legacy");
        expect(await subject.locator('[data-km-riso-paper-clearance="cap-paper-ribbons"],[data-km-riso-paper-clearance="hair-paper-crown"]').count()).toBe(0);
        const bytes=await subject.screenshot({path:info.outputPath("riso24-"+aspect+"-"+actor+"-"+frame+"-legacy.png"),animations:"disabled"});
        old.set(actor,bytes);
      }
      await mode.selectOption("engraved");
      for(const actor of ["courier","paper-artist"]){
        const subject=page.locator('[data-km-riso21-actor="'+actor+'"]');
        await expect(subject).toHaveAttribute("data-km-riso24-study","engraved");
        const highlight=actor==="courier"?"cap-paper-ribbons":"hair-paper-crown";
        const strands=actor==="courier"?"cap-crown-engraving":"hair-crown-engravings";
        await expect(subject.locator('[data-km-riso-paper-clearance="'+highlight+'"]').first()).toBeAttached();
        await expect(subject.locator('[data-km-riso-part="'+strands+'"]')).toHaveCount(1);
        const img=await subject.screenshot({path:info.outputPath("riso24-"+aspect+"-"+actor+"-"+frame+"-engraved.png"),animations:"disabled"});
        expect(img.equals(old.get(actor)!),"Hair craft must produce actual different printed pixels").toBe(false);
      }
    }
  }
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("blue");
  await expect(page.locator('[data-km-riso-part="hair-crown-engravings"]')).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("red");
  await expect(page.locator('[data-km-riso-part="hair-crown-engravings"]')).toHaveCount(1);
  await page.locator("main").screenshot({path:info.outputPath("riso24-red-engraving-plate.png"),animations:"disabled"});
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("both");
  await page.getByRole("combobox",{name:"RISO24 feature focus"}).selectOption("head");
  await page.locator("main").screenshot({path:info.outputPath("riso24-full-face-stress.png"),animations:"disabled"});
  expect(failures).toEqual([]);
});
