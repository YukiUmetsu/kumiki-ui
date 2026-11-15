import { test,expect } from "@playwright/test";

const story="/iframe.html?id=film-art-watercolour-master-studies--master-craft-study&viewMode=story";
const chapters=["Botanical observation","Light on water","Architectural shadows"] as const;
const selectRange=async(page:import("@playwright/test").Page,value:number)=>{
  const slider=page.getByRole("slider",{name:"Watercolor material depth"});
  await slider.evaluate((node,n)=>{
    const el=node as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Slider setter unavailable");
    setter.call(el,String(n));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },value);
};

for(const ratio of ["landscape","portrait"] as const){
  test("WM7 "+ratio+": material wash, real pigment lifting and zero-depth reversibility",async({page},info)=>{
    await page.goto(story);
    await page.evaluate(()=>document.fonts.ready);
    await page.getByRole("combobox",{name:"Master studies output"}).selectOption(ratio);
    await page.getByRole("checkbox",{name:"Full-canvas watercolor artwork"}).check();
    const canvas=page.getByRole("img",{name:/original watercolor illustration/});
    const medium=page.locator("[data-km-masterwork-medium]");
    const engine=page.locator("[data-km-subject-pigment] svg[data-km-wet-paper]");
    for(const [i,title] of chapters.entries()){
      await page.getByRole("button",{name:title}).click();
      await expect(canvas).toBeVisible();
      await expect(engine).toBeVisible();
      await selectRange(page,0);
      await expect(medium).toHaveAttribute("data-km-masterwork-strength","0");
      await expect(medium).toHaveAttribute("data-km-masterwork-marks","0");
      await expect(medium.locator("path")).toHaveCount(0);
      const before=await canvas.screenshot({animations:"disabled",path:
        info.outputPath("wm7-"+ratio+"-"+i+"-previous-pigment.png")});
      await selectRange(page,1);
      await expect(medium).toHaveAttribute("data-km-masterwork-strength","1");
      const marks=Number(await medium.getAttribute("data-km-masterwork-marks"));
      const lifts=Number(await medium.getAttribute("data-km-masterwork-lifts"));
      expect(marks).toBeGreaterThan(65);
      expect(marks).toBeLessThan(301);
      expect(lifts).toBeGreaterThan(5);
      await expect(medium.locator('[data-km-masterwork-kind="transparent-glaze"]').first()).toBeAttached();
      await expect(medium.locator("mask path").first()).toBeAttached();
      const after=await canvas.screenshot({animations:"disabled",path:
        info.outputPath("wm7-"+ratio+"-"+i+"-material-glazes.png")});
      expect(Buffer.compare(before,after)).not.toBe(0);
    }
  });
}
