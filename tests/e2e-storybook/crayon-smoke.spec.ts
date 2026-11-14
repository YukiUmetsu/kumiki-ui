import { expect, test } from "@playwright/test";

/** Cheap real-browser sanity proof; exhaustive frame suites run only on demand. */
const samples=[
  {name:"storybook night",id:"video-crayon-storybook--lantern-trail",attr:"data-km-crayon-storybook",aspect:"landscape"},
  {name:"storybook garden portrait",id:"video-crayon-storybook--garden-portrait",attr:"data-km-crayon-storybook",aspect:"portrait"},
  {name:"science data scene",id:"video-crayon-scene-engine--water-cycle",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"chart data scene",id:"video-crayon-scene-engine--illustrated-data",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"acting landscape",id:"video-crayon-scene-engine--character-performance",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"acting portrait",id:"video-crayon-scene-engine--character-performance-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"walk landscape",id:"video-crayon-scene-engine--character-walk-cycle",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"walk portrait",id:"video-crayon-scene-engine--character-walk-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"two-bone gait landscape",id:"video-crayon-scene-engine--character-two-bone-ik",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"two-bone gait portrait",id:"video-crayon-scene-engine--character-two-bone-ik-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"character draw in landscape",id:"video-crayon-scene-engine--character-draw-in",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"character draw in portrait",id:"video-crayon-scene-engine--character-draw-in-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
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

test("walk animation plants, releases, and replants the correct foot on keyed story beats",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--character-walk-cycle&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const back=scene.locator('[data-km-crayon-element="foot-back"]');
  const front=scene.locator('[data-km-crayon-element="foot-front"]');
  await page.getByRole("button",{name:"Back-foot lift"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","38");
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  await page.getByRole("button",{name:"Back-foot plant"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","94");
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  await expect(front).toHaveAttribute("data-km-crayon-contact","planted");
  const leg=scene.locator('[data-km-crayon-element="leg-front"]');
  await expect(leg).toHaveAttribute("data-km-crayon-kind","connector");
  const legAtPlant=await leg.locator("path").first().getAttribute("d");
  await scene.screenshot({path:info.outputPath("walk-94.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Front-foot swing"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","124");
  await expect(front).not.toHaveAttribute("data-km-crayon-contact","planted");
  expect(await leg.locator("path").first().getAttribute("d")).not.toEqual(legAtPlant);
  await page.getByRole("button",{name:"Front-foot plant"}).click();
  await expect(front).toHaveAttribute("data-km-crayon-contact","planted");
  await scene.screenshot({path:info.outputPath("walk-156.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Back-foot plant"}).click();
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
});


test("two-bone walk uses analytic knees and eases a releasing planted foot",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--character-two-bone-ik&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const back=scene.locator('[data-km-crayon-element="foot-back"]');
  const front=scene.locator('[data-km-crayon-element="foot-front"]');
  const leg=scene.locator('[data-km-crayon-element="leg-front"]');
  await expect(leg).toHaveAttribute("data-km-crayon-rig","two-bone");
  await page.getByRole("button",{name:"Back-foot plant"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","94");
  const shapeAtStart=await leg.locator("path").first().getAttribute("d");
  expect(shapeAtStart).toMatch(/^M.* L.* L/);
  await page.getByRole("button",{name:"Contact release"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","44");
  await expect(back).toHaveAttribute("data-km-crayon-contact","releasing");
  await page.getByRole("button",{name:"Front-foot swing"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","124");
  await expect(front).not.toHaveAttribute("data-km-crayon-contact","planted");
  const shapeAtSwing=await leg.locator("path").first().getAttribute("d");
  expect(shapeAtSwing).not.toEqual(shapeAtStart);
  await scene.screenshot({path:info.outputPath("two-bone-gait-swing.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Front-foot plant"}).click();
  await expect(front).toHaveAttribute("data-km-crayon-contact","planted");
  await scene.screenshot({path:info.outputPath("two-bone-gait-plant.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Front-foot swing"}).click();
  expect(await leg.locator("path").first().getAttribute("d")).toEqual(shapeAtSwing);
});


test("crayon Storybook wall-clock playback advances, pauses, and restarts",async({page})=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--water-cycle&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  await expect(scene).toHaveAttribute("data-km-crayon-frame","239");
  await page.getByRole("button",{name:"Play animation"}).click();
  await expect.poll(async()=>Number(await scene.getAttribute("data-km-crayon-frame")),
    {timeout:8000}).toBeGreaterThan(3);
  await page.getByRole("button",{name:"Pause animation"}).click();
  const paused=await scene.getAttribute("data-km-crayon-frame");
  await page.waitForTimeout(160);
  await expect(scene).toHaveAttribute("data-km-crayon-frame",paused!);
  await page.getByRole("button",{name:"Restart"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","0");
});


test("drawn-character film builds wax after outlines and clears transient guides",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--character-draw-in&viewMode=story");
  const svg=page.locator("svg[data-km-crayon-scene]");
  const body=svg.locator('[data-km-crayon-element="body"] [data-km-crayon-build]');
  const guide=svg.locator('[data-km-crayon-element="construction-head"]');
  await page.getByRole("button",{name:"Sketch guides"}).click();
  await expect(svg).toHaveAttribute("data-km-crayon-frame","48");
  await expect(guide).toHaveAttribute("data-km-crayon-exit","visible");
  await svg.screenshot({path:info.outputPath("draw-in-guides-48.png"),animations:"disabled"});
  await page.getByRole("button",{name:"First outlines"}).click();
  await expect(body).toHaveAttribute("data-km-crayon-build","outlining");
  await svg.screenshot({path:info.outputPath("draw-in-outlines-146.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Wax colour"}).click();
  await expect(body).toHaveAttribute("data-km-crayon-build","pigment");
  await expect(guide).toHaveAttribute("data-km-crayon-exit","fading");
  await svg.screenshot({path:info.outputPath("draw-in-wax-190.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Complete"}).click();
  await expect(svg).toHaveAttribute("data-km-crayon-frame","449");
  await expect(body).toHaveAttribute("data-km-crayon-build","finished");
  await expect(guide).toHaveAttribute("data-km-crayon-exit","finished");
  await svg.screenshot({path:info.outputPath("draw-in-finished-449.png"),animations:"disabled"});
  await page.getByRole("button",{name:"First outlines"}).click();
  await expect(body).toHaveAttribute("data-km-crayon-build","outlining");
});

test("drawn-character portrait retains separate guide, pigment and acting frames",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--character-draw-in-portrait&viewMode=story");
  const svg=page.locator("svg[data-km-crayon-scene]");
  const body=svg.locator('[data-km-crayon-element="body"] [data-km-crayon-build]');
  await expect(svg).toHaveAttribute("viewBox","0 0 540 960");
  await page.getByRole("button",{name:"Layered shading"}).click();
  await expect(body).toHaveAttribute("data-km-crayon-build","finished");
  await svg.screenshot({path:info.outputPath("draw-in-portrait-280.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Drawing moves"}).click();
  await expect(svg).toHaveAttribute("data-km-crayon-frame","400");
  await svg.screenshot({path:info.outputPath("draw-in-portrait-400.png"),animations:"disabled"});
});
