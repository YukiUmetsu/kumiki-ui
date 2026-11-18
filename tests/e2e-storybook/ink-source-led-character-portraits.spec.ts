import {test,expect} from "@playwright/test";

test("ANAT6 builds new source-led characters from museum references and live EXPR1 anatomy",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-anat6-source-led-character-portraits--source-led-qing-character-portraits&viewMode=story",
    {waitUntil:"domcontentloaded"});
  const atelier=page.getByTestId("ink-anat6-source-led-atelier");
  await expect(atelier).toBeVisible();
  const portrait=atelier.getByTestId("ink-anat6-selected-portrait").locator("svg");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-character","scholar");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-source-object","CMA 1979.27.2.19");
  await expect(portrait).toHaveAttribute("data-km-anat1-source","468-point-face-mesh");
  await expect(atelier.locator("[data-km-ink-anat6-reference-card]")).toHaveCount(4);
  await expect(atelier.locator("[data-km-ink-anat6-reference-card] img")).toHaveCount(2);
  await expect(atelier.getByTestId("ink-anat6-expression-contact-sheet").locator("svg")).toHaveCount(6);
  await page.screenshot({fullPage:true,animations:"disabled",
    path:info.outputPath("anat6-scholar-source-led-neutral.png")});

  await atelier.getByRole("combobox",{name:"Source-led character"}).selectOption("shepherd");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-source-object","Tsinghua Su Wu · 1874");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-headwear","wrapped-hood");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-beard","long");
  await atelier.getByRole("combobox",{name:"Source-led expression"}).selectOption("sad");
  await expect(portrait).toHaveAttribute("data-km-expr1-emotion","sad");

  await atelier.getByRole("combobox",{name:"Source-led character"}).selectOption("zhong-kui");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-source-object","Met 2002.208.2");
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-headwear","loose-hair");
  await atelier.getByRole("combobox",{name:"Source-led expression"}).selectOption("angry");
  await expect(portrait).toHaveAttribute("data-km-expr1-emotion","angry");
  const yaw=atelier.getByRole("slider",{name:"Source-led head turn"});
  await yaw.evaluate(el=>{
    const input=el as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    setter?.call(input,"20");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(portrait).toHaveAttribute("data-km-ink-anat6-yaw","20");
  await page.screenshot({fullPage:true,animations:"disabled",
    path:info.outputPath("anat6-zhong-kui-angry-yaw20.png")});
});
