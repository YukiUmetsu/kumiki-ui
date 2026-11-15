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

    await review.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-portrait-identity-review.png")});
    await page.getByRole("combobox",{name:"Face eyelids"}).selectOption("closed");
    await expect(review.locator("[data-km-portrait-irises]")).toHaveCount(0);
    await review.screenshot({animations:"disabled",
      path:info.outputPath("shanshui-three-portrait-blink-review.png")});
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
