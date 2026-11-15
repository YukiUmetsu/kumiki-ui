import {test,expect} from "@playwright/test";
const story="/iframe.html?id=film-art-watercolour-two-character-film--painted-ensemble&viewMode=story";
for(const output of ["portrait","landscape"] as const){
  test("WC14 two watercolor actors "+output+": opacity, independent motion and native proof",async({page},info)=>{
    await page.goto(story);
    await page.evaluate(()=>document.fonts.ready);
    await page.getByRole("combobox",{name:"Ensemble output"}).selectOption(output);
    await expect(page.getByText("Two lives on a single sheet")).toBeVisible();
    const svg=page.locator("svg[data-km-watercolour-illustration]");
    await expect(svg).toBeVisible({timeout:20000});
    for(const frame of [0,185,231,255]){
      await page.getByRole("button",{name:"Frame "+frame,exact:true}).click();
      await expect(svg).toHaveAttribute("data-km-watercolour-illustration-frame",String(frame));
      if(frame!==0)await svg.screenshot({animations:"disabled",
        path:info.outputPath("wc14-"+output+"-f"+frame+".png")});
    }
    for(const name of ["a-face-foundation","b-face-foundation",
      "a-clothing-opaque-base","b-clothing-opaque-base"]){
      await expect(svg.locator('[data-km-watercolour-part="'+name+
        '"] > path[data-km-watercolour-composite="normal"]')).toHaveCount(1);
    }
    await expect(svg.locator('clipPath[id*="-clip-a-near-eye-inset"]')).toHaveCount(1);
    await expect(svg.locator('clipPath[id*="-clip-b-near-eye-inset"]')).toHaveCount(1);
    await page.getByRole("button",{name:"Frame 185",exact:true}).click();
    await expect(svg.locator('[data-km-watercolour-part="a-near-closed-eye"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-watercolour-part="b-near-closed-eye"]')).toHaveCount(0);
    await page.getByRole("button",{name:"Frame 231",exact:true}).click();
    await expect(svg.locator('[data-km-watercolour-part="b-near-closed-eye"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-watercolour-part="a-near-closed-eye"]')).toHaveCount(0);
    await page.getByRole("combobox",{name:"First sitter"}).selectOption("sitter-b");
    await page.getByRole("button",{name:"Frame 255",exact:true}).click();
    await expect(svg.locator('[data-km-watercolour-part="a-rebuilt-human-sitter-b"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-watercolour-part="b-rebuilt-human-sitter-b"]')).toHaveCount(1);
    await page.getByRole("combobox",{name:"First sitter"}).selectOption("sitter-a");
    await page.getByRole("checkbox",{name:"Ensemble reduced motion"}).check();
    await page.getByRole("button",{name:"Frame 0",exact:true}).click();
    await expect(svg.locator('[data-km-watercolour-part="a-face-foundation"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-watercolour-part="b-face-foundation"]')).toHaveCount(1);
  });
}
