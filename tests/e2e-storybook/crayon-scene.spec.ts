import { expect, test } from "@playwright/test";

for(const [name,id,aspect] of [
  ["water","video-crayon-scene-engine--water-cycle","landscape"],
  ["town","video-crayon-scene-engine--storybook-town","landscape"],
  ["chart","video-crayon-scene-engine--illustrated-data","landscape"],
  ["water-portrait","video-crayon-scene-engine--water-cycle-portrait","portrait"],
] as const){
  test("CRAYON1 custom "+name+" scene produces bounded textured SVG",async({page},info)=>{
    await page.goto("/iframe.html?id="+id+"&viewMode=story");
    const scene=page.locator("svg[data-km-crayon-scene]");
    await expect(scene).toBeVisible();
    await expect(scene).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    await expect(scene.locator("[data-km-crayon-element]").first()).toBeVisible();
    await expect(scene.locator("[data-km-crayon-wax]").first()).toBeAttached();
    await page.evaluate(()=>document.fonts.ready);
    await scene.screenshot({path:info.outputPath("crayon-custom-"+name+"-239.png"),animations:"disabled"});
    await page.getByRole("button",{name:"First wax"}).click();
    await expect(scene).toHaveAttribute("data-km-crayon-frame","72");
    const earlier=await scene.screenshot({animations:"disabled"});
    await page.getByRole("button",{name:"Finished page"}).click();
    await expect(scene).toHaveAttribute("data-km-crayon-frame","239");
    const later=await scene.screenshot({animations:"disabled"});
    expect(earlier).not.toEqual(later);
  });
}
