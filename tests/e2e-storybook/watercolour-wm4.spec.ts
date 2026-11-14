import { test, expect } from "@playwright/test";

const story="/iframe.html?id=film-art-watercolour-master-studies--master-craft-study&viewMode=story";

for(const output of ["landscape","portrait"] as const){
  test("WM4 "+output+": real 3-scene material and reference-guided art proof",async({page},info)=>{
    await page.goto(story);
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole("heading",{name:"Three studies in light, water and detail"})).toBeVisible();
    await page.getByRole("combobox",{name:"Master studies output"}).selectOption(output);
    const labels=["Botanical observation","Light on water","Architectural shadows"];
    const surface=page.locator("svg[data-km-wet-paper]");
    for(let i=0;i<labels.length;i++){
      await page.getByRole("button",{name:labels[i]}).click();
      await expect(surface).toBeVisible();
      await expect(surface).toHaveAttribute("viewBox",output==="portrait"?"0 0 540 960":"0 0 960 540");
      await expect(surface).toHaveAttribute("data-km-wet-paper-frame","355");
      await expect(surface).toHaveAttribute("data-km-wet-paper-phase","dry");
      await expect(page.locator('[data-km-wet-pigment-field] > path').first()).toBeVisible();
      expect(await page.locator('[data-km-wet-pigment-field] > rect').count()).toBe(0);
      await surface.locator("..").screenshot({
        animations:"disabled",
        path:info.outputPath("wm4-"+output+"-"+labels[i].toLowerCase().replace(/ /g,"-")+".png"),
      });
    }
    await page.getByRole("button",{name:"Botanical observation"}).click();
    const range=page.getByRole("slider",{name:"Master studies film frame"});
    const setFrame=async(frame:number)=>{
      await range.evaluate((node,value)=>{
        const input=node as HTMLInputElement;
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        if(!setter)throw Error("range input setter unavailable");
        setter.call(input,String(value));
        input.dispatchEvent(new Event("input",{bubbles:true}));
        input.dispatchEvent(new Event("change",{bubbles:true}));
      },frame);
    };
    for(const frame of [80,155,240,355]){
      await setFrame(frame);
      await expect(surface).toHaveAttribute("data-km-wet-paper-frame",String(frame));
      await surface.locator("..").screenshot({
        animations:"disabled",
        path:info.outputPath("wm4-"+output+"-botanical-frame-"+frame+".png"),
      });
    }
    await page.getByRole("checkbox",{name:"Master studies reduced motion"}).check();
    await setFrame(0);
    await expect(surface).toHaveAttribute("data-km-wet-paper-phase","dry");
  });
}
