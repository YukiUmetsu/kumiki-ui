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
