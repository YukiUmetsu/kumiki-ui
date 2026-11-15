import {test,expect} from "@playwright/test";

const story="/iframe.html?id=film-art-watercolour-portrait-reference-atlas--masterwork-studies&viewMode=story";

test("WC16: no rejected watercolor humans; masterwork sources and anatomy dossier render",async({page},info)=>{
  await page.goto(story);
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.getByRole("heading",{name:"Study the masters before drawing a face"}))
    .toBeVisible();
  await expect(page.locator("[data-watercolour-reference]")).toHaveCount(6);
  await expect(page.getByText("The previous two generated portraits were rejected",{exact:false}))
    .toBeVisible();
  await expect(page.getByRole("heading",{name:"New human characters are on hold"}))
    .toBeVisible();
  const withdrawn=page.locator('[data-km-watercolour-part*="face-foundation"],'+
    '[data-km-watercolour-part*="rebuilt-human"],'+
    '[data-km-watercolour-part*="near-eye"]');
  await expect(withdrawn).toHaveCount(0);
  await expect(page.getByRole("link",{name:"View credited original artwork"}))
    .toHaveCount(6);
  await page.screenshot({fullPage:true,
    path:info.outputPath("wc16-reference-masterwork-atlas.png")});
  await page.getByRole("combobox",{name:"Filter watercolor portrait references"})
    .selectOption("Stan Miller");
  await expect(page.locator("[data-watercolour-reference]")).toHaveCount(2);
  await page.getByRole("checkbox",{name:"Show construction and failure analysis"}).uncheck();
  await expect(page.getByRole("heading",{name:"What the code must construct"})).toHaveCount(0);
  await page.getByRole("checkbox",{name:"Show construction and failure analysis"}).check();
  await expect(page.getByRole("heading",{name:"What the code must construct"})).toHaveCount(2);
  await page.getByRole("combobox",{name:"Filter watercolor portrait references"})
    .selectOption("all");
  await expect(page.locator("[data-watercolour-reference]")).toHaveCount(6);
});
