import { expect, test } from "@playwright/test";

/** Real Chromium captures of the actual Storybook renderer, never a hand-built mockup. */
for (const [subject, aspect, storyId] of [
  ["lantern", "landscape", "video-crayon-storybook--lantern-trail"],
  ["lantern", "portrait", "video-crayon-storybook--lantern-portrait"],
  ["garden", "landscape", "video-crayon-storybook--one-little-seed"],
  ["garden", "portrait", "video-crayon-storybook--garden-portrait"],
] as const) {
  test("crayon "+subject+" / "+aspect+" draws repeatable physical wax", async ({page},info)=>{
    await page.goto("/iframe.html?id="+storyId+"&viewMode=story");
    const svg=page.locator('svg[data-km-crayon-storybook]');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    await expect(svg).toHaveAttribute("data-km-crayon-story",subject);
    await expect(svg.locator("[data-km-crayon-paper]")).toHaveCount(1);
    await expect(svg.locator("[data-km-crayon-wax]").first()).toBeAttached();
    await page.evaluate(()=>document.fonts.ready);

    const chapters=[
      {name:"Restart",frame:0},
      {name:"2 · Scene emerges",frame:156},
      {name:"3 · Wax drawing",frame:270},
      {name:"4 · Final page",frame:419},
    ];
    const captures:Buffer[]=[];
    for (const chapter of chapters) {
      await page.getByRole("button",{name:chapter.name,exact:true}).click();
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(chapter.frame));
      const png=await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-"+subject+"-"+aspect+"-"+chapter.frame+".png")});
      captures.push(png);
    }
    expect(captures[0]).not.toEqual(captures[1]);
    expect(captures[1]).not.toEqual(captures[2]);
    expect(captures[2]).not.toEqual(captures[3]);

    // Return to a prior frame after newer frames: paper/scumble must remain fixed.
    await page.getByRole("button",{name:"2 · Scene emerges",exact:true}).click();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","156");
    const again=await svg.screenshot({animations:"disabled"});
    expect(again).toEqual(captures[1]);

    const rect=await svg.evaluate(node=>{
      const b=node.getBoundingClientRect();
      return {width:b.width,height:b.height};
    });
    expect(rect.width).toBeGreaterThan(200);
    expect(rect.height/rect.width).toBeCloseTo(aspect==="portrait"?16/9:9/16,1);
    if(subject==="lantern") await expect(svg.locator("[data-km-crayon-fox]")).toHaveCount(1);
    else await expect(svg.locator("[data-km-crayon-bloom]")).toHaveCount(3);
  });
}
