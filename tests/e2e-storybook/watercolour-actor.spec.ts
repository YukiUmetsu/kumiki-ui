import { test, expect } from "@playwright/test";

const url="/iframe.html?id=film-art-watercolour-character--painted-character-performance&viewMode=story";
async function seek(page:import("@playwright/test").Page,frame:number){
  const slider=page.getByRole("slider",{name:"Character film frame"});
  await slider.evaluate((input,f)=>{
    const el=input as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Range input setter unavailable");
    setter.call(el,String(f));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(slider).toHaveValue(String(frame));
  await expect(page.locator('[data-km-watercolour-actor="traveller"]'))
    .toHaveAttribute("data-km-watercolour-actor-frame",String(frame));
  // Wait for React commit and both browser paint/compositor frames. A controlled
  // slider can update before its heavyweight SVG character paint is committed.
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

for(const aspect of ["landscape","portrait"] as const){
  test("WM3 "+aspect+": paint remains on articulated limbs at bookmarked keyframes",async({page},info)=>{
    await page.goto(url);
    if(aspect==="portrait")
      await page.getByRole("combobox",{name:"Film aspect"}).selectOption("portrait");
    const actor=page.locator('[data-km-watercolour-actor="traveller"]');
    await expect(actor).toBeVisible();
    for(const frame of [160,215,310,336,403]){
      await seek(page,frame);
      await expect(actor).toHaveAttribute("data-km-watercolour-actor-frame",String(frame));
      await expect(actor.locator('[data-km-watercolour-character-part]')).not.toHaveCount(0);
      await expect(actor.locator('[data-part="eyes"]')).toBeVisible();
      await expect(actor.locator('[data-part="mouth"]')).toBeVisible();
      if(frame===336 || frame===403)
        await page.locator("[data-km-character-presenter]").screenshot({
          animations:"disabled",path:info.outputPath("wm3-"+aspect+"-"+frame+".png")
        });
    }
    await seek(page,215);
    const before=await actor.screenshot({animations:"disabled"});
    await seek(page,345);
    await seek(page,160);
    await seek(page,215);
    expect(await actor.screenshot({animations:"disabled"})).toEqual(before);
    await page.getByRole("checkbox",{name:"Reduce character motion"}).check();
    await seek(page,0);
    await expect(actor).toHaveAttribute("data-km-watercolour-contact","grounded");
  });
}
