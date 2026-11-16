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
