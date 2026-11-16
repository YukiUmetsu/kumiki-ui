import {expect,test} from "@playwright/test";

test("Chinese-ink EXPR1 atelier uses the source-fitted reader with visible full, micro and five keyframe views",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--reader-expression-art-craft&viewMode=story");
    const studio=page.getByTestId("shanshui-expr1-reader-studio");
    const full=page.getByTestId("reader-expr1-full");
    const micro=page.getByTestId("reader-expr1-micro");
    await expect(studio).toBeVisible();
    await expect(full).toBeVisible();
    await expect(micro).toBeVisible();
    await expect(studio.locator("[data-km-ink-expression-frame]")).toHaveCount(5);
    const parts=["face","hair","reader-ear","brows","eyes","mouth",
      "pupil-left","pupil-right"];
    for(const part of parts){
      await expect(micro.locator('[data-km-ink-expression-part="'+part+'"]'))
        .toHaveCount(1);
    }
    const renderPaths=await micro.locator("path").count();
    expect(renderPaths).toBeGreaterThan(70);
    const camera=(await micro.getAttribute("viewBox"))?.split(/\s+/).map(Number);
    expect(camera).toHaveLength(4);
    expect(camera?.every(Number.isFinite)).toBe(true);
    const brow=micro.locator('[data-km-ink-expression-part="brows"] path').first();
    const before=await brow.getAttribute("d");
    const picker=page.getByRole("combobox",{name:"EXPR1 emotion"});
    await picker.selectOption("sad");
    const after=await brow.getAttribute("d");
    expect(after).not.toEqual(before);
    await micro.screenshot({animations:"disabled",
      path:info.outputPath("reader-EXPR1-sad-face-micro.png")});
    await picker.selectOption("smile");
    await micro.screenshot({animations:"disabled",
      path:info.outputPath("reader-EXPR1-smile-face-micro.png")});
    const diagnostic=page.getByTestId("reader-expr1-diagnostics");
    await expect(diagnostic).toContainText("Active crease regions:");
    await page.getByRole("combobox",{name:"EXPR1 eyelids"}).selectOption("closed");
    await expect(micro.locator('[data-km-ink-expression-part="pupil-left"]'))
      .toHaveCount(0);
    await page.getByRole("combobox",{name:"EXPR1 eyelids"}).selectOption("open");
    await expect(micro.locator('[data-km-ink-expression-part="pupil-left"]'))
      .toHaveCount(1);
    await page.getByRole("combobox",{name:"EXPR1 viseme"}).selectOption("aa");
    await expect(micro.locator('[data-km-ink-expression-part="mouth"] path'))
      .not.toHaveCount(0);
    await page.getByRole("combobox",{name:"EXPR1 eyelids"}).selectOption("auto");
    await page.getByRole("combobox",{name:"EXPR1 viseme"}).selectOption("auto");
    const slider=page.getByRole("slider",{name:"EXPR1 intensity"});
    await slider.focus();
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    await expect.poll(()=>micro.locator("path").count()).toBeLessThan(renderPaths);
    await slider.press("End");
    await expect(slider).toHaveValue("1");
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("reader-EXPR1-expression-atlas.png")});
  });


test("Chinese-ink EXPR1 timeline scrubs an actual source reader through neutral, expression and recovery",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-reader-face--reader-expression-art-craft&viewMode=story");
  const micro=page.getByTestId("reader-expr1-micro");
  const picker=page.getByRole("combobox",{name:"EXPR1 emotion"});
  const frame=page.getByRole("slider",{name:"EXPR1 motion frame"});
  const brow=micro.locator('[data-km-ink-expression-part="brows"] path').first();
  const mouth=micro.locator('[data-km-ink-expression-part="mouth"] path');
  const mouthGeometry=()=>mouth.evaluateAll(paths=>paths.map(path=>path.getAttribute("d")).join("|"));
  await picker.selectOption("sad");
  await frame.focus();
  await frame.press("Home");
  await expect(frame).toHaveValue("0");
  const neutral=await brow.getAttribute("d");
  await expect(page.getByTestId("reader-expr1-diagnostics"))
    .toContainText("Cue frame 0");
  // These are source-frame controls, not CSS-morphed screenshots.
  for(let n=0;n<12;n++)await frame.press("ArrowRight");
  await expect(frame).toHaveValue("12");
  const engaged=await brow.getAttribute("d");
  expect(engaged).not.toEqual(neutral);
  await micro.screenshot({animations:"disabled",
    path:info.outputPath("reader-EXPR1-cue-full-sad-frame12.png")});
  await frame.press("End");
  await expect(frame).toHaveValue("96");
  expect(await brow.getAttribute("d")).toEqual(neutral);
  await picker.selectOption("smile");
  const mouthNeutral=await mouthGeometry();
  await frame.press("Home");
  for(let n=0;n<12;n++)await frame.press("ArrowRight");
  expect(await mouthGeometry()).not.toEqual(mouthNeutral);
  await expect(page.getByTestId("reader-expr1-cue-frames")
    .locator("[data-km-ink-cue-frame]")).toHaveCount(7);
  await expect(page.getByRole("button",{name:"Reset cue"})).toBeVisible();
  await page.getByRole("button",{name:"Reset cue"}).click();
  await expect(frame).toHaveValue("0");
  await micro.screenshot({animations:"disabled",
    path:info.outputPath("reader-EXPR1-cue-neutral-frame0.png")});
});


test("ANAT1 binocular gaze remains inside separate source-painted eye apertures across EXPR1 poses",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--reader-expression-art-craft&viewMode=story");
    const micro=page.getByTestId("reader-expr1-micro");
    const near=micro.locator('[data-km-ink-expression-part="pupil-left"]');
    const far=micro.locator('[data-km-ink-expression-part="pupil-right"]');
    const nearD=await near.locator("path").first().getAttribute("d");
    const farD=await far.locator("path").first().getAttribute("d");
    const neutralNear=await near.locator("[data-km-ink-iris-travel]").getAttribute("transform");
    const neutralFar=await far.locator("[data-km-ink-iris-travel]").getAttribute("transform");
    await expect(micro.locator("[data-km-ink-iris-occlusion]")).toHaveCount(2);
    const clips=micro.locator("clipPath");
    await expect(clips).toHaveCount(2);
    const nearClip=await clips.nth(0).locator("path").getAttribute("d");
    const farClip=await clips.nth(1).locator("path").getAttribute("d");
    expect(nearClip).toContain("118.4");
    expect(farClip).toContain("149.1");
    expect(nearClip).not.toEqual(farClip);
    const horizontal=page.getByRole("slider",{name:"EXPR1 iris gaze horizontal"});
    const vertical=page.getByRole("slider",{name:"EXPR1 iris gaze vertical"});
    await horizontal.focus();await horizontal.press("End");
    await vertical.focus();await vertical.press("End");
    await expect(horizontal).toHaveValue("1");
    await expect(vertical).toHaveValue("1");
    const travelNear=await near.locator("[data-km-ink-iris-travel]").getAttribute("transform");
    const travelFar=await far.locator("[data-km-ink-iris-travel]").getAttribute("transform");
    expect(travelNear).not.toEqual(neutralNear);
    expect(travelFar).not.toEqual(neutralFar);
    expect(travelNear).not.toEqual(travelFar);
    expect(await near.locator("path").first().getAttribute("d")).toEqual(nearD);
    expect(await far.locator("path").first().getAttribute("d")).toEqual(farD);
    await micro.screenshot({animations:"disabled",
      path:info.outputPath("reader-ANAT1-iris-gaze-down-right.png")});
    await page.getByRole("combobox",{name:"EXPR1 eyelids"}).selectOption("closed");
    await expect(micro.locator("[data-km-ink-iris-occlusion]")).toHaveCount(0);
    await expect(micro.locator("clipPath")).toHaveCount(0);
    await page.getByRole("combobox",{name:"EXPR1 eyelids"}).selectOption("open");
    await expect(micro.locator("[data-km-ink-iris-occlusion]")).toHaveCount(2);
    await page.getByRole("button",{name:"Reset gaze"}).click();
    await expect(horizontal).toHaveValue("0");
    await expect(vertical).toHaveValue("0");
    expect(await near.locator("[data-km-ink-iris-travel]").getAttribute("transform")).toEqual(neutralNear);
    // Pixel-level proof, not just valid mask markup: a previous source-
    // coordinate clip made BOTH painted eyes blank while all DOM assertions
    // passed. Rasterize the exact actual source SVG twice (irises on/off),
    // and require measurable ink contribution in the native browser.
    const visibleIrisPixels=await micro.evaluate(async svg=>{
      const render=async(show:boolean):Promise<Uint8ClampedArray>=>{
        const clone=svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
        clone.setAttribute("width","516");
        clone.setAttribute("height","400");
        clone.querySelectorAll('[data-km-ink-expression-part="pupil-left"],'+
          '[data-km-ink-expression-part="pupil-right"]').forEach(el=>
          el.setAttribute("visibility",show?"visible":"hidden"));
        const xml=new XMLSerializer().serializeToString(clone);
        const uri=URL.createObjectURL(new Blob([xml],{type:"image/svg+xml"}));
        try{
          const image=new Image();image.src=uri;
          await image.decode();
          const canvas=document.createElement("canvas");
          canvas.width=516;canvas.height=400;
          const ctx=canvas.getContext("2d");
          if(!ctx)throw Error("Canvas 2D missing");
          ctx.drawImage(image,0,0,516,400);
          return ctx.getImageData(0,0,516,400).data;
        }finally{URL.revokeObjectURL(uri);}
      };
      const [on,off]=await Promise.all([render(true),render(false)]);
      let changed=0;
      for(let i=0;i<on.length;i+=4)
        if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+
          Math.abs(on[i+2]-off[i+2])>12)changed++;
      return changed;
    });
    expect(visibleIrisPixels,
      "Original near/far irises must remain visibly painted through the clip")
      .toBeGreaterThan(20);
    await micro.screenshot({animations:"disabled",
      path:info.outputPath("reader-ANAT1-original-gaze-open.png")});
  });

test("reduced-motion disables autoplay without blocking deterministic facial and gaze scrubbing",
  async({page})=>{
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.goto("/iframe.html?id=video-ink-reader-face--reader-expression-art-craft&viewMode=story");
    await expect(page.getByRole("button",{name:"Play EXPR1 cue"})).toBeDisabled();
    const frame=page.getByRole("slider",{name:"EXPR1 motion frame"});
    await frame.focus();await frame.press("Home");await frame.press("ArrowRight");
    await expect(frame).toHaveValue("1");
    const gaze=page.getByRole("slider",{name:"EXPR1 iris gaze horizontal"});
    await gaze.focus();await gaze.press("End");
    await expect(gaze).toHaveValue("1");
    await expect(page.getByTestId("reader-expr1-diagnostics")).toContainText("Cue frame 1");
  });
