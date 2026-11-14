import { test, expect } from "@playwright/test";

const story="/iframe.html?id=film-art-watercolour-master-studies--master-craft-study&viewMode=story";
const scenes=[
  {name:"Botanical observation",kind:"vein"},
  {name:"Light on water",kind:"reflection"},
  {name:"Architectural shadows",kind:"masonry"},
] as const;

for(const output of ["landscape","portrait"] as const){
  test("WM6 "+output+": original painterly anatomy, water and architecture",async({page},info)=>{
    await page.goto(story);
    await page.evaluate(()=>document.fonts.ready);
    await page.getByRole("combobox",{name:"Master studies output"}).selectOption(output);
    await page.getByRole("checkbox",{name:"Full-canvas watercolor artwork"}).check();
    const craft=page.locator("[data-km-watercolour-craft]");
    const canvas=page.getByRole("img",{name:/original watercolor illustration/});
    for(const [i,study] of scenes.entries()){
      await page.getByRole("button",{name:study.name}).click();
      await expect(craft).toHaveAttribute("data-km-craft-detail","1");
      await expect(craft.locator("path").first()).toBeVisible();
      await expect(craft.locator('path[data-km-craft-kind="'+study.kind+'"]').first()).toBeVisible();
      const count=Number(await craft.getAttribute("data-km-craft-marks"));
      expect(count).toBeGreaterThan(90);
      expect(count).toBeLessThan(1000);
      await canvas.screenshot({animations:"disabled",
        path:info.outputPath("wm6-"+output+"-"+i+"-full-detail.png")});
    }
    // The slider changes structure, not watercolor simulation state.
    const slider=page.getByRole("slider",{name:"Fine brush craftsmanship"});
    await slider.evaluate(node=>{
      const field=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("No input setter");
      setter.call(field,"0");
      field.dispatchEvent(new Event("input",{bubbles:true}));
      field.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await expect(craft).toHaveAttribute("data-km-craft-detail","0");
    await expect(craft.locator("path")).toHaveCount(0);
    await expect(page.locator("[data-km-subject-pigment] svg")).toBeVisible();
    await canvas.screenshot({animations:"disabled",
      path:info.outputPath("wm6-"+output+"-zero-detail.png")});
  });
}
