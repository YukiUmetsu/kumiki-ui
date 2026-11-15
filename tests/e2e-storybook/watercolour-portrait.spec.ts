import {test,expect} from "@playwright/test";
const story="/iframe.html?id=film-art-watercolour-portrait--naturalist-portrait&viewMode=story";

for(const output of ["portrait","landscape"] as const){
  test("WC11 original watercolor human portrait "+output+": painting, anatomy, blink and glazing",async({page},info)=>{
    await page.goto(story);
    await page.evaluate(()=>document.fonts.ready);
    await page.getByRole("combobox",{name:"Portrait output"}).selectOption(output);
    const svg=page.locator("svg[data-km-watercolour-illustration]");
    await expect(svg).toBeVisible({timeout:20000});
    await expect(page.getByText("Where the light touches the face")).toBeVisible();
    await expect(page.getByRole("button",{name:"Play watercolor portrait"})).toBeVisible();
    const frame=(f:number)=>page.getByRole("button",{name:"Frame "+f,exact:true}).click();
    for(const f of [0,140,185,255,319,359]){
      await frame(f);
      await expect(svg).toHaveAttribute("data-km-watercolour-illustration-frame",String(f));
      if(f===140||f===255||f===319){
        await svg.screenshot({animations:"disabled",
          path:info.outputPath("wc11-"+output+"-f"+f+".png")});
      }
    }
    await frame(255);
    for(const id of ["opaque-face-volume","nose-tip","upper-lip",
      "near-iris","far-pupil","hair-opaque-back","rooted-shoulders-and-clothing"])
      await expect(page.locator('[data-km-watercolour-part="'+id+'"]')).toHaveCount(1);
    // The face MUST obscure the previously painted dark rear hair.
    await expect(page.locator('[data-km-watercolour-part="opaque-face-volume"] > path[data-km-watercolour-composite="normal"]')).toHaveCount(1);
    await expect(page.locator('[data-km-watercolour-part="near-sclera"] > path[data-km-watercolour-composite="normal"]')).toHaveCount(1);
    const before=await svg.screenshot({animations:"disabled"});
    await page.getByRole("checkbox",{name:"Optical portrait glazing"}).uncheck();
    await expect(page.locator('[data-km-watercolour-optical-glaze="opaque-face-volume"]'))
      .toHaveCount(0);
    const after=await svg.screenshot({animations:"disabled",
      path:info.outputPath("wc11-"+output+"-flat.png")});
    expect(before.equals(after)).toBe(false);
    await page.getByRole("checkbox",{name:"Optical portrait glazing"}).check();
    await expect(page.locator('[data-km-watercolour-optical-glaze="opaque-face-volume"]'))
      .toHaveCount(1);
    await svg.screenshot({animations:"disabled",
      path:info.outputPath("wc11-"+output+"-glazed.png")});
    await page.getByRole("checkbox",{name:"Fine facial details"}).uncheck();
    await expect(page.locator('[data-km-watercolour-part="near-pupil"]')).toHaveCount(0);
    await page.getByRole("checkbox",{name:"Fine facial details"}).check();
    await expect(page.locator('[data-km-watercolour-part="near-pupil"]')).toHaveCount(1);
    await page.getByRole("checkbox",{name:"Reduced motion"}).check();
    await frame(0);
    await expect(svg).toBeVisible();
    await expect(page.locator('[data-km-watercolour-part="opaque-face-volume"]')).toHaveCount(1);
  });
}
