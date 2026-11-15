import { test, expect } from "@playwright/test";

test("ArtCraft portraits, fox anatomy and alpine landscape preserve final frames and macros", async({page},info)=>{
  await page.goto("/iframe.html?id=video-colored-pencil-science--living-subjects-atelier&viewMode=story");
  const svg=page.locator("svg[data-km-colored-pencil]");
  const subject=page.getByRole("combobox",{name:"Living subject"});
  const aspect=page.getByRole("combobox",{name:"Living aspect"});
  const slider=page.getByRole("slider",{name:"Living drawing frame"});
  const inspect=page.getByRole("checkbox",{name:"Living inspect macro"});
  await expect(svg).toBeVisible();
  const seek=async(frame:number)=>{
    await slider.evaluate((node,next)=>{
      const input=node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(input,String(next));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },frame);
    await expect(svg).toHaveAttribute("data-km-pencil-frame",String(frame));
  };
  for(const output of ["landscape","portrait"] as const){
    await aspect.selectOption(output);
    await expect(svg).toHaveAttribute("viewBox",output==="landscape"?
      "0 0 960 540":"0 0 540 960");
    for(const item of ["portrait","fox","valley"] as const){
      await subject.selectOption(item);
      await expect(page.locator("[data-km-living-subject]"))
        .toHaveAttribute("data-km-living-subject",item);
      await seek(330);
      await expect(svg.locator("[data-km-pencil-region]")).not.toHaveCount(0);
      await svg.screenshot({animations:"disabled",
        path:info.outputPath("artcraft-living-"+item+"-"+output+".png")});
      await inspect.check();
      await expect(svg).toHaveAttribute("style",/scale\(/);
      await svg.locator("xpath=..").screenshot({animations:"disabled",
        path:info.outputPath("artcraft-living-"+item+"-macro-"+output+".png")});
      await inspect.uncheck();
      await seek(45);
      await seek(330);
      await expect(svg).toHaveAttribute("data-km-pencil-frame","330");
    }
  }
  await subject.selectOption("portrait");
  await seek(330);
  await expect(svg.locator('[data-km-pencil-support="face-main"]')).toHaveCount(1);
  await expect(svg.locator('[data-km-pencil-support="iris-near"]')).toHaveCount(0);
  await page.getByRole("checkbox",{name:"Living reduced motion"}).check();
  await seek(0);
  await expect(svg.locator('[data-km-pencil-support="face-main"]')).toHaveCount(1);
});
