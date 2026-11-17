import {expect,test} from "@playwright/test";

test("reader's only reworked part is a complete asymmetric face with independent eyelid/viseme art",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const drawing=page.getByTestId("reader-coded-face");
    await expect(drawing).toBeVisible();
    for(const key of ["face","hair","reader-ear","brows","eyes","mouth","pupil-left","pupil-right"]){
      await expect(drawing.locator('[data-ink-reader-part="'+key+'"]'))
        .toHaveCount(1);
    }
    await expect(drawing.locator('[data-ink-reader-part="face"] path'))
      .not.toHaveCount(0);
    await drawing.screenshot({path:info.outputPath("reader-face-three-quarter-rest.png"),
      animations:"disabled"});

    const eyes=page.getByRole("combobox",{name:"Face eyelids"});
    const pupil=drawing.locator('[data-ink-reader-part="pupil-left"]');
    await eyes.selectOption("closed");
    await expect(pupil).toHaveCount(0);
    await drawing.screenshot({path:info.outputPath("reader-face-blink-closed.png"),
      animations:"disabled"});
    await eyes.selectOption("soft");
    await expect(pupil).toHaveCount(1);

    const mouth=page.getByRole("combobox",{name:"Face mouth"});
    await mouth.selectOption("oh");
    const after=await drawing.locator('[data-ink-reader-part="mouth"] path').first()
      .getAttribute("d");
    await mouth.selectOption("rest");
    const before=await drawing.locator('[data-ink-reader-part="mouth"] path').first()
      .getAttribute("d");
    expect(before).not.toEqual(after);

    await page.getByLabel("Show portrait landmarks").check();
    await expect(drawing.locator('[data-ink-reader-landmark="exposed-ear"]'))
      .toHaveCount(1);
    await expect(drawing.locator('[data-ink-reader-landmark="chin"]'))
      .toHaveCount(1);

    const slider=page.getByRole("slider",{name:"Face craftsmanship"});
    await slider.focus();await slider.press("Home");
    await expect(slider).toHaveValue("0");
    const low=await drawing.locator('[data-ink-reader-part="hair"] path').count();
    await slider.press("End");await expect(slider).toHaveValue("1");
    await expect.poll(()=>drawing.locator('[data-ink-reader-part="hair"] path').count())
      .toBeGreaterThan(low);
    await drawing.screenshot({path:info.outputPath("reader-face-high-detail-with-points.png"),
      animations:"disabled"});
  });

test("ArtCraft 6x face study exposes live asymmetric iris, nasal planes and viseme controls",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const close=page.getByTestId("reader-anatomy-closeup");
    await expect(close).toBeVisible();
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("open");
    for(const id of ["base-face","eye-apertures","near-iris","far-iris","lip-planes"]){
      await expect(close.locator('[data-ink-anatomy-feature="'+id+'"]'))
        .toHaveCount(1);
    }
    await expect.poll(()=>close.locator(
      '[data-ink-anatomy-feature="eye-apertures"] path').count())
      .toBeGreaterThan(8);
    await expect.poll(()=>close.locator(
      '[data-ink-anatomy-feature="near-iris"] path').count())
      .toBeGreaterThanOrEqual(3);
    await close.screenshot({animations:"disabled",
      path:info.outputPath("reader-artcraft-eye-nose-lips-open.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(close.locator('[data-ink-anatomy-feature="near-iris"]'))
      .toHaveCount(0);
    await expect(close.locator('[data-ink-anatomy-feature="far-iris"]'))
      .toHaveCount(0);
    await close.screenshot({animations:"disabled",
      path:info.outputPath("reader-artcraft-eye-nose-lips-closed.png")});
  });

test("the same Chinese Ink folder displays three separately drawn face identities",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const review=page.getByTestId("shanshui-portrait-lineage");
    await expect(review).toBeVisible();
    for(const scene of ["misty-hermit","river-scholar","mountain-trail"]){
      await expect(review.locator('[data-km-scene-face="'+scene+'"]'))
        .toHaveCount(1);
    }
    await expect(review.locator("[data-km-portrait-irises]")).toHaveCount(3);
    const windows=await review.locator("[data-km-scene-face]").evaluateAll(
      elements=>elements.map(el=>el.getAttribute("viewBox")),
    );
    expect(new Set(windows).size).toBeGreaterThan(1);
    // Measure topknot margin after the ORIGINAL source-fitted hair pose.
    // A group's DOM bounding box also contains flying silk beyond the face
    // crop, making it unsuitable as a crown-visibility assertion.
    const headroom=await review.locator("[data-km-scene-face]").evaluateAll(
      paintings=>paintings.map(painting=>
        Number(painting.getAttribute("data-km-camera-crown"))-
        Number(painting.getAttribute("data-km-camera-top"))),
    );
    expect(headroom.every(px=>Number.isFinite(px)&&px>=15)).toBe(true);


    await review.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-portrait-identity-review.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(review.locator("[data-km-portrait-irises]")).toHaveCount(0);
    await review.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-portrait-blink-review.png")});
  });

test("all three distinct figure faces remain in one Chinese Ink folder with live controls",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-faces-comparison&viewMode=story");
    const studio=page.getByTestId("shanshui-three-faces-studio");
    await expect(studio).toBeVisible();
    for(const scene of ["river-scholar","mountain-trail","misty-hermit"]){
      const face=studio.locator('[data-km-three-face-scene="'+scene+'"]');
      await expect(face).toBeVisible();
      await expect.poll(()=>face.locator('path').count()).toBeGreaterThan(18);
      await expect(face.locator('[data-km-three-face-part="eyes"]')).toHaveCount(1);
      await expect(face.locator('[data-km-three-face-part="pupil-left"]')).toHaveCount(1);
    }
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-face-identities-open.png")});
    await page.getByRole("combobox",{name:"Three faces eyelids"}).selectOption("closed");
    await expect(studio.locator('[data-km-three-face-part="pupil-left"]')).toHaveCount(0);
    await studio.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-face-identities-closed.png")});
    await page.getByRole("slider",{name:"Three faces detail"}).focus();
    await page.getByRole("slider",{name:"Three faces detail"}).press("Home");
    await expect(page.getByRole("slider",{name:"Three faces detail"})).toHaveValue("0");
    await expect(studio.locator("[data-km-three-face-scene]")).toHaveCount(3);
  });

test("source teacher reference image overlays locally without committing image pixels",
  async({page})=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const reference=page.getByTestId("reader-reference-face");
    await expect(reference).toBeVisible();
    // Synthetic test image only. The user's original teacher art is not copied.
    await page.getByLabel("Load scroll reader teacher image").setInputFiles({
      name:"original-test.png",mimeType:"image/png",
      buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64"),
    });
    await expect(reference.locator('image[href^="blob:"]')).toHaveCount(1);
    await expect(page.getByTestId("reader-coded-face")).toBeVisible();
  });

test("ArtCraft crown macro renders nine distinct attached regions and reveals the rightward-lowered band",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const crown=page.getByTestId("reader-crown-artcraft");
    await expect(crown).toBeVisible();
    const parts=["trailing-silk","rear-tie-wing","sideburn","rear-topknot",
      "front-topknot","cap-shell","forehead-band","fold-lines","dry-ink-grain"];
    for(const name of parts){
      await expect(crown.locator('[data-km-reader-crown-region="'+name+'"]'))
        .toHaveCount(1);
    }
    await crown.screenshot({
      path:info.outputPath("reader-crown-artcraft-all-regions.png"),
      animations:"disabled",
    });
    const picker=page.getByRole("combobox",{name:"Crown structural region"});
    await picker.selectOption("forehead-band");
    await expect(crown.locator('[data-km-reader-crown-region="forehead-band"]'))
      .toHaveAttribute("opacity","1");
    await expect(crown.locator('[data-km-reader-crown-region="front-topknot"]'))
      .toHaveAttribute("opacity","0.13");
    await crown.screenshot({
      path:info.outputPath("reader-crown-artcraft-band-only.png"),
      animations:"disabled",
    });
    await picker.selectOption("all");
    const slider=page.getByRole("slider",{name:"Face craftsmanship"});
    await slider.focus();await slider.press("Home");
    await expect(slider).toHaveValue("0");
    const low=await crown.locator('path').count();
    await slider.press("End");
    await expect(slider).toHaveValue("1");
    await expect.poll(()=>crown.locator('path').count())
      .toBeGreaterThan(low);
    await crown.screenshot({
      path:info.outputPath("reader-crown-artcraft-100pct.png"),
      animations:"disabled",
    });
  });


test("ANAT1 reader facial planes preserve source identity across soft-wash and ink-bone inspection",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
  const drawing=page.getByTestId("reader-coded-face");
  const inspector=page.getByTestId("reader-face-plane-study");
  const close=page.getByTestId("reader-anatomy-closeup");
  await expect(drawing).toBeVisible();
  await expect(inspector).toBeVisible();
  const viewport=(await close.getAttribute("viewBox"))?.split(/\s+/).map(Number)??[];
  expect(viewport).toHaveLength(4);
  expect(viewport.every(Number.isFinite)).toBe(true);
  // The source 260x340 drawing is translated, scaled and pitched by the
  // production actor. Raw illustration y-coordinates are NOT valid camera
  // assertions. Confirm the original live face really fills the browser
  // frame, instead of accepting a screenshot of empty paper and chin.
  const coverage=await inspector.evaluate(svg=>{
    const canvas=svg.getBoundingClientRect();
    const fraction=(id:string)=>{
      const group=svg.querySelector(
        '[data-km-reader-anatomy-region="'+id+'"]');
      if(!group)return 0;
      const face=group.getBoundingClientRect();
      if(!face.width||!face.height)return 0;
      const w=Math.max(0,Math.min(face.right,canvas.right)-
        Math.max(face.left,canvas.left));
      const h=Math.max(0,Math.min(face.bottom,canvas.bottom)-
        Math.max(face.top,canvas.top));
      return w*h/(face.width*face.height);
    };
    return Object.fromEntries(["opaque-head","near-far-eyes","nose","lips"]
      .map(id=>[id,fraction(id)]));
  });
  for(const [region,visible] of Object.entries(coverage))
    expect(visible,region+" must actually be in frame").toBeGreaterThan(.92);
  const closeEyes=await close.locator(
    '[data-ink-anatomy-feature="eye-apertures"]')
    .evaluate(group=>{
      const root=group.closest("svg");
      if(!root)return 0;
      const rect=root.getBoundingClientRect(),eye=group.getBoundingClientRect();
      const w=Math.max(0,Math.min(eye.right,rect.right)-
        Math.max(eye.left,rect.left));
      const h=Math.max(0,Math.min(eye.bottom,rect.bottom)-
        Math.max(eye.top,rect.top));
      return w*h/Math.max(1,eye.width*eye.height);
    });
  expect(closeEyes).toBeGreaterThan(.85);
  const volume=inspector.locator('[data-km-reader-anatomy-region="wash"]');
  const nasal=inspector.locator('[data-km-reader-anatomy-region="nose"]');
  const lids=inspector.locator('[data-km-reader-anatomy-region="near-far-eyes"]');
  const lips=inspector.locator('[data-km-reader-anatomy-region="lips"]');
  expect(await volume.locator("path").count()).toBeGreaterThanOrEqual(15);
  expect(await nasal.locator("path").count()).toBeGreaterThanOrEqual(6);
  const original=await drawing.locator('[data-ink-reader-part="face"] path')
    .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
  const selector=page.getByRole("combobox",{name:"Face structure review"});
  await selector.selectOption("wash");
  await expect(volume).toHaveAttribute("opacity","1");
  await expect(nasal).toHaveAttribute("opacity","0.08");
  await expect(lids).toHaveAttribute("opacity","0.08");
  await expect(lips).toHaveAttribute("opacity","0.08");
  await inspector.screenshot({animations:"disabled",
    path:info.outputPath("reader-face-ANAT1-soft-wash-planes.png")});
  await selector.selectOption("bones");
  await expect(volume).toHaveAttribute("opacity","0.08");
  await expect(nasal).toHaveAttribute("opacity","1");
  await expect(lids).toHaveAttribute("opacity","1");
  await expect(lips).toHaveAttribute("opacity","1");
  await inspector.screenshot({animations:"disabled",
    path:info.outputPath("reader-face-ANAT1-ink-bone-planes.png")});
  const opened=await lids.locator("path").count();
  await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
  const closed=await lids.locator("path").count();
  expect(closed).toBeLessThan(opened);
  await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("open");
  await selector.selectOption("full");
  await expect(volume).toHaveAttribute("opacity","1");
  await expect(nasal).toHaveAttribute("opacity","1");
  await page.getByLabel("Show portrait landmarks").check();
  await expect(inspector.locator("[data-km-anat1-face-point]")).toHaveCount(9);
  await inspector.screenshot({animations:"disabled",
    path:info.outputPath("reader-face-ANAT1-full-landmark-study.png")});
  expect(await drawing.locator('[data-ink-reader-part="face"] path')
    .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d"))))
    .toEqual(original);
  await expect(page.getByTestId("shanshui-portrait-lineage")
    .locator("[data-km-scene-face]")).toHaveCount(3);
});


test("ear microcamera reveals the real Y-branch antihelix, concha wash and landmarks at both detail levels",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const ear=page.getByTestId("reader-ear-native-study");
    await expect(ear).toBeVisible();
    for(const layer of ["opaque-face","hair","cartilage"]){
      await expect(ear.locator('[data-km-reader-ear-layer="'+layer+'"]'))
        .toHaveCount(1);
    }
    const cartilage=ear.locator('[data-km-reader-ear-layer="cartilage"]');
    const hi=await cartilage.locator("path").count();
    expect(hi).toBeGreaterThanOrEqual(11);
    const fold=await cartilage.locator("path").nth(2).getAttribute("d");
    expect((fold?.match(/M/g)??[]).length).toBe(3);
    const coverage=await cartilage.evaluate(group=>{
      const svg=group.closest("svg");
      if(!svg)return 0;
      const a=svg.getBoundingClientRect(),b=group.getBoundingClientRect();
      const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
      const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      return w*h/Math.max(1,b.width*b.height);
    });
    expect(coverage).toBeGreaterThan(.85);
    await ear.screenshot({animations:"disabled",
      path:info.outputPath("reader-ear-ANAT1-helix-concha-full.png")});
    await page.getByLabel("Show portrait landmarks").check();
    await expect(ear.locator("[data-km-reader-ear-landmark]")).toHaveCount(2);
    await ear.screenshot({animations:"disabled",
      path:info.outputPath("reader-ear-ANAT1-source-landmarks.png")});
    const detail=page.getByRole("slider",{name:"Face craftsmanship"});
    await detail.focus();
    await detail.press("Home");
    await expect(detail).toHaveValue("0");
    const low=await cartilage.locator("path").count();
    expect(low).toBeLessThan(hi);
    await ear.screenshot({animations:"disabled",
      path:info.outputPath("reader-ear-ANAT1-minimum-detail.png")});
  });


test("source-linked Bochen multiglaze survives native 1x, isolated six-region and lower-detail comparisons",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-reader-face--three-quarter-face-study&viewMode=story");
    const proof=page.getByTestId("reader-ink-glaze-comparison");
    const original=proof.locator('[data-km-ink-glaze-variant="original"]');
    const layered=proof.locator('[data-km-ink-glaze-variant="layered"]');
    await expect(proof).toBeVisible();
    await expect(original).toBeVisible();
    await expect(layered).toBeVisible();
    const oldShapes=await original.locator("[data-km-ink-glaze-base] path")
      .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
    const newShapes=await layered.locator("[data-km-ink-glaze-base] path")
      .evaluateAll(nodes=>nodes.map(node=>node.getAttribute("d")));
    expect(newShapes).toEqual(oldShapes);
    const regions=layered.locator("[data-km-ink-glaze-region]");
    await expect(regions).toHaveCount(6);
    const before=await layered.locator("[data-km-ink-glaze-region] path").count();
    expect(before).toBeGreaterThanOrEqual(14);
    for(const id of ["orbital-near","orbital-far","nose-bridge",
      "malar-near","malar-far","sublabial"]){
      expect(await layered.locator('[data-km-ink-glaze-region="'+id+'"] path')
        .count(),id).toBeGreaterThanOrEqual(2);
    }
    await proof.screenshot({animations:"disabled",
      path:info.outputPath("reader-source-Ming-ink-glazes-all-1x.png")});
    const choose=page.getByRole("combobox",{name:"Face glaze region"});
    await choose.selectOption("nose-bridge");
    await expect(layered.locator('[data-km-ink-glaze-region="nose-bridge"]'))
      .toHaveAttribute("opacity","1");
    await expect(layered.locator('[data-km-ink-glaze-region="malar-near"]'))
      .toHaveAttribute("opacity","0.09");
    await proof.screenshot({animations:"disabled",
      path:info.outputPath("reader-source-Ming-ink-nasal-bridge-isolated.png")});
    const detail=page.getByRole("slider",{name:"Face craftsmanship"});
    await detail.focus();await detail.press("Home");
    await expect(detail).toHaveValue("0");
    const low=await layered.locator("[data-km-ink-glaze-region] path").count();
    expect(low).toBeLessThan(before);
    expect(await original.locator("[data-km-ink-glaze-base] path").count())
      .toBeLessThan(oldShapes.length);
    await page.getByRole("combobox",{name:"Face eyelids"})
      .selectOption("closed");
    await page.getByRole("combobox",{name:"Face mouth"}).selectOption("oh");
    await expect(regions).toHaveCount(6);
    await proof.screenshot({animations:"disabled",
      path:info.outputPath("reader-source-Ming-ink-minimum-detail-blink-oh.png")});
  });
