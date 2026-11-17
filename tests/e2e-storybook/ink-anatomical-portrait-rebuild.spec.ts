import {test,expect} from "@playwright/test";

test("ANAT2 Chinese ink characters are genuinely different, expressive, and source-space inspectable",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--portrait-rebuild&viewMode=story");
    const preview=page.getByTestId("ink-anat2-live");
    const portrait=preview.getByTestId("ink-anat2-portrait");
    await expect(portrait).toBeVisible();
    await expect(portrait.locator('[data-km-ink-cheek="L"] path')).toHaveCount(14);
    await expect(portrait.locator('[data-km-ink-cheek="R"] path')).toHaveCount(14);
    const initialBrow=await portrait.locator('[data-km-ink-brow="L"] path').first().getAttribute("d");
    await page.getByRole("combobox",{name:"Ink rebuilt expression"}).selectOption("sad");
    const sadBrow=await portrait.locator('[data-km-ink-brow="L"] path').first().getAttribute("d");
    expect(sadBrow).not.toEqual(initialBrow);
    await preview.screenshot({animations:"disabled",path:info.outputPath("new-scholar-sad-bust-1x.png")});
    await page.getByRole("combobox",{name:"Ink rebuilt camera"}).selectOption("face");
    await preview.screenshot({animations:"disabled",path:info.outputPath("new-scholar-sad-face-native.png")});
    await page.getByRole("combobox",{name:"Ink rebuilt character"}).selectOption("elder");
    await expect(portrait).toHaveAttribute("data-ink-character","elder");
    await preview.screenshot({animations:"disabled",path:info.outputPath("new-elder-sad-face-native.png")});
    await page.getByRole("combobox",{name:"Ink rebuilt expression"}).selectOption("smile");
    await preview.screenshot({animations:"disabled",path:info.outputPath("new-elder-smile-face-native.png")});
    const metrics=page.getByTestId("ink-anat2-metrics");
    await expect(metrics).toContainText("EXPR1 cheek lift");
    await expect(metrics).toContainText("ANAT1 nose width");
    const headRatio=page.getByRole("slider",{name:"Ink rebuilt head scale"});
    await headRatio.focus();
    await headRatio.press("Home");
    await expect(headRatio).toHaveValue("0.38");
    await expect(portrait).toHaveAttribute("data-ink-head-scale","0.38");
    await preview.screenshot({animations:"disabled",
      path:info.outputPath("anat2-original-anatomical-low-head-period-ratio.png")});
    await headRatio.press("End");
    await expect(headRatio).toHaveValue("0.75");
    await expect(portrait).toHaveAttribute("data-ink-head-scale","0.75");
    await preview.screenshot({animations:"disabled",
      path:info.outputPath("anat2-original-anatomical-high-head-negative-control.png")});
    const box=await portrait.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
    expect(box?.height).toBeGreaterThan(250);
  });

test("independent ANAT2 expression atlas and 24fps motion share the production renderer",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--two-characters-and-five-expressions&viewMode=story");
    await expect(page.locator("[data-ink-atlas-character]")).toHaveCount(2);
    await expect(page.getByTestId("ink-anat2-portrait")).toHaveCount(10);
    await page.screenshot({fullPage:true,animations:"disabled",
      path:info.outputPath("new-ink-anat2-two-character-facs-atlas.png")});
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--film-time-face-motion&viewMode=story");
    const slider=page.getByRole("slider",{name:"Ink rebuilt film frame"});
    await slider.focus();
    await slider.press("Home");
    await expect(page.getByTestId("ink-anat2-cue-value")).toContainText("0%");
    const film=page.getByTestId("ink-anat2-film-preview");
    const neutral=await film.locator('[data-km-ink-mouth-line="true"]').getAttribute("d");
    for(let i=0;i<12;i++)await slider.press("ArrowRight");
    await expect(page.getByTestId("ink-anat2-cue-value")).toContainText("100%");
    const engaged=await film.locator('[data-km-ink-mouth-line="true"]').getAttribute("d");
    expect(engaged).not.toEqual(neutral);
    await film.screenshot({animations:"disabled",path:info.outputPath("new-ink-anat2-smile-frame12.png")});
    await slider.press("End");
    const recovered=await film.locator('[data-km-ink-mouth-line="true"]').getAttribute("d");
    expect(recovered).toEqual(neutral);
  });

test("ANAT2 ArtCraft source comparison only accepts local images and manually registered camera crops",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--historical-painting-review&viewMode=story");
    const desk=page.getByTestId("ink-anat2-historical-source-desk");
    await expect(desk).toBeVisible();
    await expect(page.getByTestId("ink-anat2-source-image")).toHaveCount(0);
    await expect(page.getByTestId("ink-anat2-paint-window")
      .getByTestId("ink-anat2-portrait")).toBeVisible();
    const upload=page.getByLabel("Ink original source image");
    await upload.setInputFiles({
      name:"interaction-fixture.png",mimeType:"image/png",
      // A synthetic 1×1 transparent PNG tests upload mechanics ONLY, not art.
      buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64"),
    });
    await expect(page.getByTestId("ink-anat2-source-image")).toBeVisible();
    await page.getByRole("combobox",{name:"Ink source review character"}).selectOption("elder");
    await page.getByRole("combobox",{name:"Ink source review expression"}).selectOption("sad");
    const live=page.getByTestId("ink-anat2-paint-window")
      .getByTestId("ink-anat2-portrait");
    await expect(live).toHaveAttribute("data-ink-character","elder");
    await expect(live).toHaveAttribute("data-ink-emotion","sad");
    const originalRatio=page.getByRole("slider",{name:"Ink source head proportion"});
    await originalRatio.focus();await originalRatio.press("End");
    await expect(page.getByTestId("ink-anat2-paint-window")
      .getByTestId("ink-anat2-portrait")).toHaveAttribute("data-ink-head-scale","0.75");
    const zoom=page.getByRole("slider",{name:"Ink original source zoom"});
    await zoom.focus();await zoom.press("End");
    await expect(zoom).toHaveValue("4");
    await page.getByRole("checkbox",{name:"Ink source overlay"}).check();
    await expect(page.getByTestId("ink-anat2-registration-overlay")).toBeVisible();
    await desk.screenshot({animations:"disabled",
      path:info.outputPath("anat2-local-source-input-mechanics-NOT-art-evidence.png")});
    await page.getByRole("checkbox",{name:"Ink source overlay"}).uncheck();
    await expect(page.getByTestId("ink-anat2-registration-overlay")).toHaveCount(0);
    await upload.setInputFiles({name:"invalid.txt",mimeType:"text/plain",
      buffer:Buffer.from("not an image")});
    await expect(page.getByRole("alert")).toContainText("Only PNG");
  });

test("ANAT2 robe microscope reuses INK1 variable-pressure material and exposes matched 1x views",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--robe-pressure-microscope&viewMode=story");
    const desk=page.getByTestId("ink-anat2-robe-pressure-microscope");
    await expect(desk).toBeVisible();
    await expect(page.locator("[data-ink-robe-inspector]")).toHaveCount(2);
    await expect(page.locator('[data-ink-robe-camera="robe"] svg')).toHaveCount(2);
    await expect(page.locator('[data-ink-robe-camera="bust"] svg')).toHaveCount(2);
    const scholar=page.locator('[data-ink-robe-inspector="scholar"]');
    const elder=page.locator('[data-ink-robe-inspector="elder"]');
    for(const figure of [scholar,elder]){
      const crop=figure.locator('[data-ink-robe-camera="robe"]');
      await expect(crop.locator('[data-km-ink-native-robe-brush]')).toHaveCount(4);
      await expect(crop.locator('[data-km-ink-brush-pressure="INK1-variable-width"]')).toHaveCount(4);
      await expect(crop.locator('mask[maskUnits="userSpaceOnUse"]')).toHaveCount(4);
      await expect(crop.locator('svg')).toHaveAttribute("data-ink-view","robe");
    }
    await desk.screenshot({animations:"disabled",
      path:info.outputPath("anat2-native-ink1-robe-load-pressure-two-people-1x.png")});
    const pressure=page.getByRole("slider",{name:"Ink robe pressure detail"});
    await pressure.focus();await pressure.press("Home");
    await expect(pressure).toHaveValue("0.25");
    await page.getByRole("combobox",{name:"Ink robe pressure expression"})
      .selectOption("surprise");
    await expect(elder.locator('[data-ink-robe-camera="robe"] svg'))
      .toHaveAttribute("data-ink-emotion","surprise");
    await expect(elder.locator('[data-ink-robe-camera="robe"] [data-km-ink-native-robe-brush]'))
      .toHaveCount(4);
  });

test("experimental 96-frame ANAT2 actor is transparent, motion-safe and foreground-composited",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--original-film-actor-proof&viewMode=story");
    const film=page.getByTestId("ink-anat2-960-film");
    const actor=film.getByTestId("ink-anat2-film-actor");
    await expect(film).toBeVisible();
    await expect(film).toHaveAttribute("data-ink-proof-frame","0");
    await expect(actor).toHaveAttribute("data-ink-cue","0.0000");
    await expect(film.locator('[data-km-shanshui-scene="misty-hermit"]')).toBeVisible();
    await expect(actor.getByTestId("ink-anat2-portrait"))
      .toHaveAttribute("data-ink-transparent-paper","true");
    await expect(actor.locator('[data-km-ink-native-robe-brush]')).toHaveCount(4);
    await film.screenshot({animations:"disabled",
      path:info.outputPath("anat2-native-shanshui-actor-frame00-960x540.png")});
    const seek=page.getByRole("slider",{name:"Ink ANAT2 film seek"});
    // Chromium/Playwright intentionally rejects locator.fill() for range
    // inputs. Use the native setter plus an actual bubbling input event;
    // React's tracked input state will process exactly one frame transition.
    await seek.evaluate((element)=>{
      const input=element as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw new Error("Range slider setter unavailable");
      setter.call(input,"12");
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await expect(film).toHaveAttribute("data-ink-proof-frame","12");
    await expect(actor).toHaveAttribute("data-ink-cue","1.0000");
    await film.screenshot({animations:"disabled",
      path:info.outputPath("anat2-native-shanshui-actor-frame12-960x540.png")});
    await page.getByRole("combobox",{name:"Ink ANAT2 film actor"}).selectOption("elder");
    await expect(film).toHaveAttribute("data-ink-proof-character","elder");
    await film.screenshot({animations:"disabled",
      path:info.outputPath("anat2-native-shanshui-elder-frame12-960x540.png")});
    await seek.focus();
    await seek.press("End");
    await expect(film).toHaveAttribute("data-ink-proof-frame","95");
    await expect(actor).toHaveAttribute("data-ink-cue","0.0000");
    await page.getByRole("checkbox",{name:"Ink ANAT2 film reduced motion"}).check();
    await expect(actor).toHaveAttribute("data-ink-cue","0.0000");
    await expect(actor.getByTestId("ink-anat2-portrait"))
      .toHaveAttribute("data-ink-transparent-paper","true");
  });

test("ANAT2 original standing scholar preserves all planted supports at 1x while motion affects local cloth only",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-standing-figure--cotton-robe-and-staff&viewMode=story");
    const studio=page.getByTestId("ink-anat2-standing-figure-studio");
    const live=page.getByTestId("ink-anat2-standing-live");
    const figure=live.locator("[data-km-ink-standing-figure]");
    await expect(studio).toBeVisible();
    await expect(figure).toHaveAttribute("data-km-ink-standing-figure","scholar");
    await expect(figure).toHaveAttribute("data-km-ink-standing-ground","soles-fixed");
    await expect(figure.locator('[data-km-ink-foot]')).toHaveCount(2);
    await expect(figure.locator('[data-km-ink-bamboo-node]')).toHaveCount(10);
    await expect(figure.locator('[data-km-ink-hand-finger]')).toHaveCount(4);
    await expect(figure.locator('[data-km-ink-standing-pressure]')).toHaveCount(6);
    await expect(figure.locator('[data-km-ink-native-robe-brush]')).toHaveCount(4);
    const feet=figure.locator('[data-km-ink-foot]');
    const original=await Promise.all([feet.nth(0).boundingBox(),feet.nth(1).boundingBox()]);
    await live.screenshot({animations:"disabled",
      path:info.outputPath("anat2-standing-source-540x1080-scholar-frame12.png")});
    const frame=page.getByRole("slider",{name:"Ink standing frame"});
    await frame.focus();await frame.press("End");
    await expect(figure).toHaveAttribute("data-km-ink-standing-frame","95");
    const reversed=await Promise.all([feet.nth(0).boundingBox(),feet.nth(1).boundingBox()]);
    for(let i=0;i<2;i++){
      expect(reversed[i]).not.toBeNull();
      expect(reversed[i]!.x).toBeCloseTo(original[i]!.x,2);
      expect(reversed[i]!.y).toBeCloseTo(original[i]!.y,2);
    }
    await page.getByRole("combobox",{name:"Ink standing character"}).selectOption("elder");
    await page.getByRole("combobox",{name:"Ink standing emotion"}).selectOption("sad");
    await expect(figure).toHaveAttribute("data-km-ink-standing-figure","elder");
    await expect(figure.locator('[data-km-ink-beard-fibre]')).toHaveCount(93);
    await live.screenshot({animations:"disabled",
      path:info.outputPath("anat2-standing-source-540x1080-elder-frame95.png")});
    await page.getByRole("checkbox",{name:"Ink standing reduced motion"}).check();
    await expect(figure.locator('[data-km-ink-foot]')).toHaveCount(2);
  });

test("ANAT2 real Shanshui film switches between grounded full figure and original bust",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--original-film-actor-proof&viewMode=story");
    const film=page.getByTestId("ink-anat2-960-film");
    const actor=film.getByTestId("ink-anat2-film-actor");
    await expect(actor).toHaveAttribute("data-ink-actor-mode","standing");
    await expect(actor.locator('[data-km-ink-standing-ground="soles-fixed"]')).toHaveCount(1);
    await film.screenshot({animations:"disabled",
      path:info.outputPath("anat2-real-shanshui-standing-scholar-frame00.png")});
    const framing=page.getByRole("combobox",{name:"Ink ANAT2 film framing"});
    await framing.selectOption("bust");
    await expect(actor).toHaveAttribute("data-ink-actor-mode","bust");
    await expect(actor.locator('[data-km-ink-standing-figure]')).toHaveCount(0);
    await film.screenshot({animations:"disabled",
      path:info.outputPath("anat2-real-shanshui-legacy-bust-comparison.png")});
    await framing.selectOption("standing");
    await expect(actor.locator('[data-km-ink-standing-figure]')).toHaveCount(1);
  });

test("original standing cotton color and source-space 2.8x robe seam, 5.4x grip and 1.86x soles are genuinely inspectable",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-standing-figure--cotton-robe-and-staff&viewMode=story");
    const figure=page.getByTestId("ink-anat2-standing-live")
      .locator('[data-km-ink-standing-figure="scholar"]');
    const camera=page.getByRole("combobox",{name:"Ink standing camera"});
    await expect(figure).toHaveAttribute("data-km-ink-standing-camera","full");
    await expect(figure.locator('[data-km-ink-standing-seam="paper-wicked-continuous"]')).toHaveCount(1);
    await expect(figure.locator('[data-km-ink-costume-material="cotton"]')).toHaveCount(1);
    await camera.selectOption("waist");
    await expect(figure).toHaveAttribute("viewBox","65 425 420 305");
    await figure.screenshot({animations:"disabled",
      path:info.outputPath("anat2-standing-real-paperwicked-cotton-junction-2.8x.png")});
    await camera.selectOption("grip");
    await expect(figure).toHaveAttribute("viewBox","87 535 100 134");
    await expect(figure.locator('[data-km-ink-bamboo-staff="continuous"]')).toHaveCount(1);
    await expect(figure.locator('[data-km-ink-hand-finger]')).toHaveCount(4);
    await figure.screenshot({animations:"disabled",
      path:info.outputPath("anat2-standing-real-bamboo-opposed-grip-5.4x.png")});
    await camera.selectOption("hem");
    await expect(figure).toHaveAttribute("viewBox","158 855 290 196");
    await expect(figure.locator('[data-km-ink-foot]')).toHaveCount(2);
    await figure.screenshot({animations:"disabled",
      path:info.outputPath("anat2-standing-real-cotton-hem-and-sandals-1.86x.png")});
  });
