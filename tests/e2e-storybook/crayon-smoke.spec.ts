import { expect, test } from "@playwright/test";

/** Cheap real-browser sanity proof; exhaustive frame suites run only on demand. */
const samples=[
  {name:"storybook night",id:"video-crayon-storybook--lantern-trail",attr:"data-km-crayon-storybook",aspect:"landscape"},
  {name:"storybook garden portrait",id:"video-crayon-storybook--garden-portrait",attr:"data-km-crayon-storybook",aspect:"portrait"},
  {name:"science data scene",id:"video-crayon-scene-engine--water-cycle",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"chart data scene",id:"video-crayon-scene-engine--illustrated-data",attr:"data-km-crayon-scene",aspect:"landscape"},
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
