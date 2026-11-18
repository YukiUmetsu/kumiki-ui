import {test,expect} from "@playwright/test";

test("ANAT4 full figure uses ANAT1 anatomy, EXPR1 face and INK1 robe brush geometry",
  async({page},info)=>{
    await page.goto("/iframe.html?id=video-ink-anat4-anatomy-led-full-figure--full-figure-anatomy-study&viewMode=story",
      {waitUntil:"domcontentloaded"});
    const atelier=page.getByTestId("ink-anat4-atelier");
    await expect(atelier).toBeVisible();
    const figure=page.getByTestId("ink-anat4-figure");
    await expect(figure).toHaveAttribute("data-km-anat4-ready","true",{timeout:30000});
    await expect(figure).toHaveAttribute("data-km-anat1-out-of-range","0");
    expect(Number(await figure.getAttribute("data-km-anat1-hair-strands"))).toBeGreaterThan(0);
    expect(Number(await figure.getAttribute("data-km-anat1-joint-count"))).toBeGreaterThan(30);
    await expect(figure.locator("[data-km-ink1-stroke]")).toHaveCount(8);
    await expect(page.getByTestId("ink-anat4-face-study")).toBeVisible();
    await page.screenshot({fullPage:true,animations:"disabled",
      path:info.outputPath("anat4-scholar-staff-neutral.png")});
    await page.getByRole("combobox",{name:"ANAT4 character"}).selectOption("elder");
    await expect(figure).toHaveAttribute("data-km-anat4-character","elder",{timeout:30000});
    await expect(figure).toHaveAttribute("data-km-anat4-prop","pipe");
    await page.getByRole("combobox",{name:"ANAT4 expression"}).selectOption("fear");
    await expect(page.locator('[data-km-expr1-emotion="fear"]')).toBeVisible();
    await page.screenshot({fullPage:true,animations:"disabled",
      path:info.outputPath("anat4-elder-pipe-fear.png")});
  });
