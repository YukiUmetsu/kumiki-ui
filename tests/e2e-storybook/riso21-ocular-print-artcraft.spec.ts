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


/** ArtCraft RISO25: actual browser pixels, not just path registration. The
 * original RISO24 ear is used as a stable before-art source, while the new
 * components print on the same physically separated press masters.
 */
test("RISO25 original-ear and midface craft: two identities, states and ratios",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.setViewportSize({width:1540,height:1120});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--ocular-print-craft&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const face=page.getByRole("combobox",{name:"RISO25 facial craft comparison"});
  const crop=page.getByRole("combobox",{name:"RISO24 feature focus"});
  const aspectCtrl=page.getByRole("combobox",{name:"RISO21 crop aspect"});
  const pose=page.getByRole("combobox",{name:"RISO21 expression pose"});
  await expect(face).toBeVisible({timeout:12000});

  for(const aspect of ["landscape","portrait"] as const){
    await aspectCtrl.selectOption(aspect);
    for(const frame of ["46","198"] as const){
      await pose.selectOption(frame);
      for(const focus of ["ear","midface"] as const){
        await crop.selectOption(focus);
        // A source-bound small ear in 9:16 once requested >30x scale and
        // crashed the physical press placement contract. Verify bounded
        // camera scale on every actor *before* the expensive screenshot loop.
        for(const actor of ["courier","paper-artist"] as const){
          const subject=page.locator('[data-km-riso21-actor="'+actor+'"]');
          await expect(subject).toBeVisible({timeout:12000});
          const scale=Number(await subject.getAttribute("data-km-riso25-crop-scale"));
          expect(Number.isFinite(scale)&&scale>0&&scale<=29,
            actor+" "+aspect+" "+focus+" has a valid real-print camera scale").toBe(true);
        }
        await expect(face).toBeVisible({timeout:12000});
        await face.selectOption("legacy");
        const before=new Map<string,Buffer>();
        for(const actor of ["courier","paper-artist"] as const){
          const subject=page.locator('[data-km-riso21-actor="'+actor+'"]');
          await expect(subject).toHaveAttribute("data-km-riso25-face-study","legacy");
          await expect(subject).toHaveAttribute("data-km-riso24-focus",focus);
          await expect(subject.locator('[data-km-riso-part="ear-concha-pocket"]')).toHaveCount(0);
          before.set(actor,await subject.screenshot({
            path:info.outputPath("riso25-"+aspect+"-"+focus+"-"+actor+"-"+frame+"-before.png"),
            animations:"disabled",
          }));
        }
        await face.selectOption("crafted");
        for(const actor of ["courier","paper-artist"] as const){
          const subject=page.locator('[data-km-riso21-actor="'+actor+'"]');
          await expect(subject).toHaveAttribute("data-km-riso25-face-study","crafted");
          for(const id of ["ear-helix-fold","ear-concha-pocket","nasolabial-flow","upper-lip-engraving"])
            await expect(subject.locator('[data-km-riso-part="'+id+'"]')).toHaveCount(1);
          const after=await subject.screenshot({
            path:info.outputPath("riso25-"+aspect+"-"+focus+"-"+actor+"-"+frame+"-after.png"),
            animations:"disabled",
          });
          expect(after.equals(before.get(actor)!),focus+" / "+actor+" must truly change physical printed pixels")
            .toBe(false);
        }
      }
    }
  }
  await crop.selectOption("ear");
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("blue");
  await expect(page.locator('[data-km-riso-part="ear-concha-pocket"]')).toHaveCount(0);
  await page.locator("main").screenshot({path:info.outputPath("riso25-ear-blue-only.png"),animations:"disabled"});
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("red");
  await expect(page.locator('[data-km-riso-part="ear-concha-pocket"]')).toHaveCount(2);
  await page.locator("main").screenshot({path:info.outputPath("riso25-ear-red-only.png"),animations:"disabled"});
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("both");
  await crop.selectOption("head");
  await pose.selectOption("160");
  await page.locator("main").screenshot({path:info.outputPath("riso25-full-face-speech-portrait.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});


/** RISO26: compare identical authored face contours/pose/camera/paper/ink, changing
 * ONLY which physical screen-master dot area fills the original named planes.
 * Browser pixels are evidence of actual implementation, not artistic approval.
 */
test("RISO26 true graded press master: original faces, two film ratios, AM and FM",async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.setViewportSize({width:1540,height:1100});
  await page.goto("/iframe.html?id=video-riso-artcraft-studies--ocular-print-craft&viewMode=story");
  await page.evaluate(()=>document.fonts.ready);
  const tone=page.getByRole("combobox",{name:"RISO26 tonal master comparison"});
  await expect(tone).toBeVisible({timeout:12000});
  const aspect=page.getByRole("combobox",{name:"RISO21 crop aspect"});
  const pose=page.getByRole("combobox",{name:"RISO21 expression pose"});
  const mode=page.getByRole("combobox",{name:"RISO21 screening method"});
  await page.getByRole("combobox",{name:"RISO24 feature focus"}).selectOption("head");
  for(const screening of ["am","fm"] as const){
    await mode.selectOption(screening);
    for(const ratio of ["landscape","portrait"] as const){
      await aspect.selectOption(ratio);
      for(const frame of ["46","198"] as const){
        await pose.selectOption(frame);
        await tone.selectOption("flat");
        const baseline=new Map<string,Buffer>();
        for(const actor of ["courier","paper-artist"] as const){
          const panel=page.locator('[data-km-riso21-actor="'+actor+'"]');
          await expect(panel).toHaveAttribute("data-km-riso26-tone-study","flat");
          const region=panel.locator('[data-km-riso-part="zygomatic-tone-planes"]');
          await expect(region).toHaveAttribute("data-km-riso-screen-tone","normal");
          baseline.set(actor,await panel.screenshot({
            path:info.outputPath("riso26-"+screening+"-"+ratio+"-"+actor+"-"+frame+"-flat.png"),
            animations:"disabled",
          }));
        }
        await tone.selectOption("graded");
        for(const actor of ["courier","paper-artist"] as const){
          const panel=page.locator('[data-km-riso21-actor="'+actor+'"]');
          await expect(panel).toHaveAttribute("data-km-riso26-tone-study","graded");
          await expect(panel.locator('[data-km-riso-part="zygomatic-tone-planes"]'))
            .toHaveAttribute("data-km-riso-screen-tone","light");
          await expect(panel.locator('[data-km-riso-part="orbital-tone-planes"]'))
            .toHaveAttribute("data-km-riso-screen-tone","mid");
          const image=await panel.screenshot({
            path:info.outputPath("riso26-"+screening+"-"+ratio+"-"+actor+"-"+frame+"-graded.png"),
            animations:"disabled",
          });
          expect(image.equals(baseline.get(actor)!),
            "Only graded stencil dots must alter actual printed film pixels, "+screening+" "+ratio+" "+actor)
              .toBe(false);
        }
      }
    }
  }
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("blue");
  await expect(page.locator('[data-km-riso-part="zygomatic-tone-planes"]')).toHaveCount(0);
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("red");
  await expect(page.locator('[data-km-riso-part="zygomatic-tone-planes"]')).toHaveCount(2);
  await page.locator("main").screenshot({path:info.outputPath("riso26-red-master-only.png"),animations:"disabled"});
  await page.getByRole("combobox",{name:"RISO21 ink separation"}).selectOption("both");
  await mode.selectOption("am");
  await aspect.selectOption("portrait");
  await pose.selectOption("160");
  await page.locator("main").screenshot({path:info.outputPath("riso26-portrait-speech-fullface.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});
