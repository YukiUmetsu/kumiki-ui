import { expect, test } from "@playwright/test";

/** Cheap real-browser sanity proof; exhaustive frame suites run only on demand. */
const samples=[
  {name:"storybook night",id:"video-crayon-storybook--lantern-trail",attr:"data-km-crayon-storybook",aspect:"landscape"},
  {name:"storybook garden portrait",id:"video-crayon-storybook--garden-portrait",attr:"data-km-crayon-storybook",aspect:"portrait"},
  {name:"science data scene",id:"video-crayon-scene-engine--water-cycle",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"chart data scene",id:"video-crayon-scene-engine--illustrated-data",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"acting landscape",id:"video-crayon-scene-engine--character-performance",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"acting portrait",id:"video-crayon-scene-engine--character-performance-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
] as const;
for(const sample of samples) {
  test("crayon real-browser smoke: "+sample.name,async({page},info)=>{
    await page.goto("/iframe.html?id="+sample.id+"&viewMode=story");
    const svg=page.locator("svg["+sample.attr+"]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",sample.aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    await page.evaluate(()=>document.fonts.ready);
    await expect(svg.locator("[data-km-crayon-wax]").first()).toBeAttached();
    await svg.screenshot({animations:"disabled",path:info.outputPath(sample.id+".png")});
  });
}

test("crayon acting mouth and eyes switch named poses at exact exposure frames",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--character-performance&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const mouth=scene.locator('[data-km-crayon-element="mouth"]');
  const eye=scene.locator('[data-km-crayon-element="left-eye"]');
  await page.getByRole("button",{name:"Speech begins"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","90");
  await expect(mouth).toHaveAttribute("data-km-crayon-pose","ee");
  await scene.screenshot({path:info.outputPath("acting-90.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Smile"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","176");
  await expect(eye).toHaveAttribute("data-km-crayon-pose","smile");
  await scene.screenshot({path:info.outputPath("acting-176.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Speech begins"}).click();
  await expect(mouth).toHaveAttribute("data-km-crayon-pose","ee");
});
