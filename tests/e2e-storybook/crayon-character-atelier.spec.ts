import {expect,test} from "@playwright/test";

/** Manual ArtCraft visual evidence, not included in reduced-cost PR CI. */
for(const sample of [
  {label:"landscape",story:"video-crayon-acting--character-performance",
    view:"0 0 960 540"},
  {label:"portrait",story:"video-crayon-acting--character-performance-portrait",
    view:"0 0 540 960"},
  {label:"face-macro",story:"video-crayon-acting--character-face-macro",
    view:"0 0 960 540"},
  {label:"costume-macro",story:"video-crayon-acting--character-costume-macro",
    view:"0 0 960 540"},
] as const){
  test("ArtCraft illustrated Blue Coat: "+sample.label,async({page},info)=>{
    const errors:string[]=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto("/iframe.html?id="+sample.story+"&viewMode=story");
    const art=page.locator("svg[data-km-crayon-scene]");
    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute("viewBox",sample.view);
    await expect(art).toHaveAttribute("data-km-crayon-scene",
      /crayon-atelier-child-acting-/);
    const coat=art.locator('[data-km-crayon-element="coat-body"]');
    const face=art.locator('[data-km-crayon-element="face"]');
    const scarf=art.locator('[data-km-crayon-element="scarf-wrap"]');
    await expect(coat).toBeAttached();
    await expect(face).toBeAttached();
    await expect(scarf).toBeAttached();
    await page.getByRole("button",{name:"Final artwork"}).click();
    await expect(art).toHaveAttribute("data-km-crayon-frame","269");
    await expect(coat.locator('[data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
    await expect(face.locator('[data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
    if(sample.label.includes("macro"))
      await expect(art.locator('[data-km-crayon-element="headline"]')).toHaveCount(0);
    const finished=await art.evaluate(node=>node.outerHTML);
    await art.screenshot({animations:"disabled",
      path:info.outputPath("artcraft-blue-coat-"+sample.label+"-269.png")});
    await page.getByRole("button",{name:"Curiosity"}).click();
    await expect(art).toHaveAttribute("data-km-crayon-frame","70");
    const early=await art.evaluate(node=>node.outerHTML);
    expect(early).not.toEqual(finished);
    await page.getByRole("button",{name:"Final artwork"}).click();
    expect(await art.evaluate(node=>node.outerHTML)).toBe(finished);
    expect(errors).toEqual([]);
  });
}
