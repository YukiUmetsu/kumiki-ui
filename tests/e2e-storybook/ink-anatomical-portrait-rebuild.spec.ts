import {test,expect} from "@playwright/test";

test("ANAT2 Chinese ink characters are genuinely different, expressive, and source-space inspectable",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat2-portrait-rebuild--portrait-rebuild&viewMode=story");
    const preview=page.getByTestId("ink-anat2-live");
    const portrait=preview.getByTestId("ink-anat2-portrait");
    await expect(portrait).toBeVisible();
    await expect(portrait.locator('[data-km-ink-cheek="L"] path')).toHaveCount(15);
    await expect(portrait.locator('[data-km-ink-cheek="R"] path')).toHaveCount(15);
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
    await slider.fill("0");
    await expect(page.getByTestId("ink-anat2-cue-value")).toContainText("0%");
    const film=page.getByTestId("ink-anat2-film-preview");
    const neutral=await film.locator('[data-km-ink-mouth-line="true"]').getAttribute("d");
    await slider.fill("12");
    await expect(page.getByTestId("ink-anat2-cue-value")).toContainText("100%");
    const engaged=await film.locator('[data-km-ink-mouth-line="true"]').getAttribute("d");
    expect(engaged).not.toEqual(neutral);
    await film.screenshot({animations:"disabled",path:info.outputPath("new-ink-anat2-smile-frame12.png")});
    await slider.fill("96");
    const recovered=await film.locator('[data-km-ink-mouth-line="true"]').getAttribute("d");
    expect(recovered).toEqual(neutral);
  });
