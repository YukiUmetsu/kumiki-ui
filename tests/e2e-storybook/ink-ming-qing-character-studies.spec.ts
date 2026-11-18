import {test,expect} from "@playwright/test";

test("ANAT5 portrait atelier exposes new references and live expressions",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-anat5-ming-qing-character-studies--source-led-portrait-atlas&viewMode=story",
    {waitUntil:"domcontentloaded"});
  const atelier=page.getByTestId("ink-anat5-portrait-atelier");
  await expect(atelier).toBeVisible();
  const portrait=atelier.getByTestId("ink-anat5-selected-portrait").locator("svg");
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-source-object","55.37");
  await expect(atelier.locator("[data-km-ink-anat5-reference-card]")).toHaveCount(4);
  await expect(atelier.locator('[data-testid="ink-anat5-expression-contact-sheet"] svg')).toHaveCount(6);
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-scholar-neutral.png")});
  await atelier.getByRole("combobox",{name:"Historical character"}).selectOption("writer");
  await expect(portrait)
    .toHaveAttribute("data-km-ink-anat5-source-object","2024.180");
  await atelier.getByRole("combobox",{name:"Facial expression"}).selectOption("smile");
  await expect(portrait).toHaveAttribute("data-km-expr1-emotion","smile");
  await atelier.getByRole("combobox",{name:"Historical character"}).selectOption("attendant");
  await expect(portrait)
    .toHaveAttribute("data-km-ink-anat5-hair-style","attendant-double-pin");
  await atelier.getByRole("combobox",{name:"Facial expression"}).selectOption("fear");
  await expect(portrait).toHaveAttribute("data-km-expr1-emotion","fear");
  await atelier.getByRole("slider",{name:"Expression intensity"}).evaluate(el=>{
    const input=el as HTMLInputElement;input.value="0.55";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await atelier.getByRole("slider",{name:"Head turn"}).evaluate(el=>{
    const input=el as HTMLInputElement;input.value="15";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-yaw","15");
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-attendant-fear.png")});
});
