import {expect,test} from "@playwright/test";
test("three uploaded teacher designs appear as distinct reference meshes with honest unknown joints",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-scholar-proportions--three-teacher-figure-studies&viewMode=story");
    await expect(page.getByTestId("shanshui-teacher-mesh")).toBeVisible();
    const selector=page.getByRole("combobox",{name:"Teacher figure"});
    const table=page.getByTestId("shanshui-proportion-table");
    for(const [scene,identity] of [
      ["misty-hermit","Older scholar"],
      ["river-scholar","Young scholar reading"],
      ["mountain-trail","Young traveler"],
    ] as const){
      await selector.selectOption(scene);
      await expect(page.locator('[data-km-teacher-point="chin"]')).toHaveCount(1);
      await expect(page.locator('[data-km-teacher-region="hair"]')).toHaveCount(1);
      await expect(page.locator('[data-km-teacher-region="nose"]')).toHaveCount(1);
      await expect(page.locator('[data-km-teacher-region="mouth"]')).toHaveCount(1);
      await expect(page.locator('[data-km-teacher-region="robe"]')).toHaveCount(1);
      await expect(page.locator('[data-km-teacher-region="sleeve-screen-left"]')).toHaveCount(1);
      await expect(page.locator('[data-km-teacher-region="sleeve-screen-right"]')).toHaveCount(1);
      await expect(page.getByRole("img",{name:new RegExp(identity)})).toBeVisible();
      await expect(page.locator('[data-km-teacher-point="knee-left"]')).toHaveCount(0);
      await expect(page.locator('[data-km-proportion-status="unobservable"]').first())
        .toBeVisible();
      await page.screenshot({path:info.outputPath("teacher-mesh-"+scene+".png"),
        animations:"disabled"});
      const metric=table.locator("tr").filter({hasText:"Skull height / total figure"});
      await expect(metric).toBeVisible();
      await expect(metric.locator("td").nth(1)).not.toBeEmpty();
    }
    await page.getByRole("combobox",{name:"Teacher region"}).selectOption("face");
    await expect(page.locator('[data-km-teacher-region="mouth"]')).toHaveCount(1);
    await expect(page.locator('[data-km-teacher-region="robe"]')).toHaveCount(0);
    await page.getByRole("combobox",{name:"Teacher region"}).selectOption("costume");
    await expect(page.locator('[data-km-teacher-region="sleeve-screen-left"]')).toHaveCount(1);
    await expect(page.locator('[data-km-teacher-region="mouth"]')).toHaveCount(0);
  });
test("optional teacher image stays local and its overlay is cleared when switching teachers",
  async({page})=>{
    await page.goto("/iframe.html?id=video-ink-scholar-proportions--three-teacher-figure-studies&viewMode=story");
    await expect(page.getByTestId("shanshui-teacher-mesh")).toBeVisible();
    const input=page.getByLabel("Load matching teacher image");
    // An ORIGINAL test SVG is sufficient to exercise the user-provided image
    // overlay mechanism. The copyrighted teacher image is not committed.
    await input.setInputFiles({name:"test-original.svg",mimeType:"image/svg+xml",
      buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"><rect width="1672" height="941" fill="#e9dbc2"/></svg>')});
    await expect(page.locator('svg[data-testid="shanshui-teacher-mesh"] image[href^="blob:"]'))
      .toHaveCount(1);
    await page.getByRole("combobox",{name:"Teacher figure"}).selectOption("misty-hermit");
    await expect(page.locator('svg[data-testid="shanshui-teacher-mesh"] image[href^="blob:"]'))
      .toHaveCount(0);
  });

test("the new 260×340 fitted figure shows real source-specific geometry for all body regions",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-scholar-proportions--three-teacher-figure-studies&viewMode=story");
    const choice=page.getByRole("combobox",{name:"Teacher figure"});
    for(const scene of ["misty-hermit","river-scholar","mountain-trail"] as const){
      await choice.selectOption(scene);
      const drawing=page.getByTestId("shanshui-fitted-figure");
      await expect(drawing).toBeVisible();
      await expect(page.getByRole("img",{
        name:"Full-figure fitted construction for "+scene,
      })).toBeVisible();
      for(const label of ["robe","folds","sleeve-near","sleeve-far",
        "shoe-left","shoe-right","collar","waist","hair","face"]){
        await expect(drawing.locator('[data-km-figure-fit-region="'+label+'"]'))
          .toHaveCount(1);
      }
      await expect(drawing.locator('[data-km-figure-fit-region="robe"] path'))
        .not.toHaveCount(0);
      const name=scene==="river-scholar"?"scroll":"beard";
      await expect(drawing.locator('[data-km-figure-fit-region="'+name+'"]'))
        .toHaveCount(1);
      await drawing.screenshot({path:info.outputPath("source-fitted-body-"+scene+".png"),
        animations:"disabled"});
    }
  });
test("all three cinematic scenes render two independently placed shoe parts instead of old shin sprites",
  async({page})=>{
    await page.goto("/iframe.html?id=video-ink-shanshui--gallery-studio&viewMode=story");
    const select=page.getByRole("combobox",{name:"Shanshui composition"});
    for(const scene of ["misty-hermit","river-scholar","mountain-trail"] as const){
      await select.selectOption(scene);
      await expect(page.locator('[data-km-ink-character-part="shoe-left"]').first())
        .toBeVisible();
      await expect(page.locator('[data-km-ink-character-part="shoe-right"]').first())
        .toBeVisible();
      await expect(page.locator('[data-km-ink-character-part="near-lower"]'))
        .toHaveCount(0);
      await expect(page.locator('[data-km-ink-character-part="far-lower"]'))
        .toHaveCount(0);
    }
  });

test("craftsmanship control increases actual SVG pressure-brush shapes without changing figure anatomy",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-scholar-proportions--three-teacher-figure-studies&viewMode=story");
    await page.getByRole("combobox",{name:"Teacher figure"}).selectOption("river-scholar");
    const slider=page.getByRole("slider",{name:"Figure brush craftsmanship"});
    const figure=page.getByTestId("shanshui-fitted-figure");
    const strokes=figure.locator('[data-km-figure-fit-region="robe-fine"] path');
    await expect(slider).toBeVisible();
    await slider.focus();
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    const low=await strokes.count();
    await slider.press("End");
    await expect(slider).toHaveValue("1");
    await expect.poll(()=>strokes.count()).toBeGreaterThan(low);
    for(const id of ["sleeve-fine-near","sleeve-fine-far","hand-fine-near",
      "collar-fine","belt-fine","scroll-fine","shoe-fine-right"]){
      await expect(figure.locator('[data-km-figure-fit-region="'+id+'"]'))
        .toHaveCount(1);
    }
    await figure.screenshot({path:info.outputPath("rich-scholar-brush-detail.png"),
      animations:"disabled"});
  });
