import {test,expect} from "@playwright/test";

test("ANAT5 portrait atelier exposes new references and live expressions",async({page},info)=>{
  await page.goto("/iframe.html?id=video-ink-anat5-ming-qing-character-studies--source-led-portrait-atlas&viewMode=story",
    {waitUntil:"domcontentloaded"});
  const atelier=page.getByTestId("ink-anat5-portrait-atelier");
  await expect(atelier).toBeVisible();
  const portrait=atelier.getByTestId("ink-anat5-selected-portrait").locator("svg");
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-source-object","55.37");
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-source","met-55.37-rightmost-sitter");
  await expect(atelier.locator("[data-km-ink-anat5-reference-card]")).toHaveCount(8);
  const referenceImages=atelier.locator("[data-km-ink-anat5-reference-image]");
  await expect(referenceImages).toHaveCount(8);
  await expect(atelier.locator('[data-km-ink-anat5-reference-image][loading="eager"]')).toHaveCount(8);
  await expect.poll(async()=>referenceImages.evaluateAll(images=>
    images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0)
  )).toBe(true);
  expect(await portrait.getAttribute("data-km-ink-anat5-source-references")).toContain("Met 55.37");
  await expect(atelier.locator('[data-testid="ink-anat5-expression-contact-sheet"] svg')).toHaveCount(6);
  const faceReview=atelier.getByTestId("ink-anat5-face-detail-review").locator("svg");
  await expect(faceReview).toHaveAttribute("data-km-ink-anat5-view","face");
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-scholar-neutral.png")});
  await faceReview.screenshot({animations:"disabled",path:info.outputPath("anat5-scholar-face-3x.png")});
  await atelier.getByRole("combobox",{name:"Historical character"}).selectOption("writer");
  await expect(portrait)
    .toHaveAttribute("data-km-ink-anat5-source-object","2024.180");
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-source","met-2024.180-seated-writer");
  expect(await portrait.getAttribute("data-km-ink-anat5-source-references")).toContain("benchmark only");
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-writer-neutral.png")});
  await faceReview.screenshot({animations:"disabled",path:info.outputPath("anat5-writer-face-3x.png")});
  await atelier.getByRole("combobox",{name:"Facial expression"}).selectOption("smile");
  await expect(portrait).toHaveAttribute("data-km-expr1-emotion","smile");
  await atelier.getByRole("combobox",{name:"Historical character"}).selectOption("attendant");
  await expect(portrait)
    .toHaveAttribute("data-km-ink-anat5-hair-style","attendant-high-bun");
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-source","met-2024.180-standing-attendant");
  expect(await portrait.getAttribute("data-km-ink-anat5-source-references")).toContain("hierarchy benchmark only");
  await atelier.getByRole("combobox",{name:"Facial expression"}).selectOption("fear");
  await expect(portrait).toHaveAttribute("data-km-expr1-emotion","fear");
  await atelier.getByRole("slider",{name:"Expression intensity"}).evaluate(el=>{
    const input=el as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    setter?.call(input,"0.55");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await atelier.getByRole("slider",{name:"Head turn"}).evaluate(el=>{
    const input=el as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    setter?.call(input,"15");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await expect(portrait).toHaveAttribute("data-km-ink-anat5-yaw","15");
  await page.screenshot({fullPage:true,animations:"disabled",path:info.outputPath("anat5-attendant-fear.png")});
  await faceReview.screenshot({animations:"disabled",path:info.outputPath("anat5-attendant-face-3x.png")});
});
