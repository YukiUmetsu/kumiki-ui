import {test,expect} from "@playwright/test";

test("ANAT3 Chinese ink character redraw uses new archival references and ANAT1/EXPR1 geometry",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat3-reference-led-redraw--scholar-and-elder-reference-redraw&viewMode=story",
      {waitUntil:"domcontentloaded"});
    const atelier=page.getByTestId("ink-anat3-reference-atelier");
    await expect(atelier).toBeVisible();
    const scholar=page.getByTestId("ink-anat3-scholar")
      .locator('[data-km-ink-reference-redraw="ANAT3"]');
    const elder=page.getByTestId("ink-anat3-elder")
      .locator('[data-km-ink-reference-redraw="ANAT3"]');
    await expect(scholar).toHaveAttribute("data-km-ink-reference-source","LOC-1903-cph-3a44343");
    await expect(elder).toHaveAttribute("data-km-ink-reference-source","LOC-1860-LCCN2011660679");
    expect(await scholar.locator("[data-km-anat1-feature]").count()).toBeGreaterThan(6);
    await expect(elder.locator("[data-km-anat1-iris]")).toHaveCount(2);
    await expect(elder.locator("[data-km-ink-beard-fiber]")).toHaveCount(72);
    await page.screenshot({fullPage:true,animations:"disabled",
      path:info.outputPath("anat3-new-archival-character-reference-board-neutral.png")});
    await page.getByRole("combobox",{name:"Reference redraw expression"}).selectOption("smile");
    await expect(scholar).toHaveAttribute("data-km-expr1-emotion","smile");
    await expect(elder).toHaveAttribute("data-km-expr1-emotion","smile");
    await page.screenshot({fullPage:true,animations:"disabled",
      path:info.outputPath("anat3-new-archival-character-reference-board-smile.png")});
    await page.getByRole("combobox",{name:"Reference redraw expression"}).selectOption("fear");
    await expect(elder).toHaveAttribute("data-km-expr1-emotion","fear");
    const refs=atelier.locator("article img");
    await expect(refs).toHaveCount(3);
    await expect(refs.nth(0)).toHaveAttribute("alt",/1903/);
  });
