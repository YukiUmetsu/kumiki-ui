import {test,expect} from "@playwright/test";

test("ANAT5 portrait atelier exposes new references and live expressions",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-anat5-ming-qing-character-studies--source-led-portrait-atlas&viewMode=story",
    {waitUntil:"domcontentloaded"});
  const atelier=page.getByTestId("ink-anat5-portrait-atelier");
  await expect(atelier).toBeVisible();
  const portrait=atelier.locator('[data-km-ink-anat5-character="scholar"]');
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-source-object","55.37");
  await expect(atelier.locator("[data-km-ink-anat5-reference-card]")).toHaveCount(4);
  await expect(atelier.locator('[data-testid="ink-anat5-expression-contact-sheet"] svg')).toHaveCount(6);
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-scholar-neutral.png")});
  await atelier.getByRole("combobox",{name:"Historical character"}).selectOption("writer");
  await expect(atelier.locator('[data-km-ink-anat5-character="writer"]'))
    .toHaveAttribute("data-km-ink-anat5-source-object","2024.180");
  await atelier.getByRole("combobox",{name:"Facial expression"}).selectOption("smile");
  await expect(atelier.locator('[data-km-ink-anat5-character="writer"]'))
    .toHaveAttribute("data-km-expr1-emotion","smile");
  await atelier.getByRole("combobox",{name:"Historical character"}).selectOption("attendant");
  await expect(atelier.locator('[data-km-ink-anat5-character="attendant"]'))
    .toHaveAttribute("data-km-ink-anat5-hair-style","attendant-double-pin");
  await atelier.getByRole("combobox",{name:"Facial expression"}).selectOption("fear");
  await expect(atelier.locator('[data-km-ink-anat5-character="attendant"]'))
    .toHaveAttribute("data-km-expr1-emotion","fear");
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-attendant-fear.png")});
});
