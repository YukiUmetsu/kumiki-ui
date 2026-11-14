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
  {name:"dragon village three actors",id:"video-crayon-scene-engine--dragon-village",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"dragon village portrait",id:"video-crayon-scene-engine--dragon-village-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"dragon anatomy detail",id:"video-crayon-scene-engine--dragon-anatomy-detail",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"castle masonry detail",id:"video-crayon-scene-engine--castle-masonry-detail",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"dragon anatomy portrait detail",id:"video-crayon-scene-engine--dragon-anatomy-detail-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
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


test("dragon village choreography: late wing flap, blinking dragon and responsive owl",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--dragon-village&viewMode=story");
  const scene=page.locator('svg[data-km-crayon-scene]');
  const dragon=scene.locator('[data-km-crayon-element="dragon-body"]');
  const wing=scene.locator('[data-km-crayon-element="dragon-wing-near"]');
  const owl=scene.locator('[data-km-crayon-element="owl-body"]');
  const friend=scene.locator('[data-km-crayon-element="friend-body"]');
  await expect(dragon).toBeAttached();
  await expect(owl).toBeAttached();
  await expect(friend).toBeAttached();
  await expect(wing).toHaveAttribute("data-km-crayon-motion-lag","7");
  await page.getByRole("button",{name:"Towers rise"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","58");
  await expect(scene.locator('[data-km-crayon-element="castle-clock"]')).toBeAttached();
  await page.getByRole("button",{name:"Wings unfurl"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","155");
  const openWing=await wing.getAttribute("transform");
  await scene.screenshot({path:info.outputPath("dragon-village-wing-open.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Dragon reacts"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","207");
  await expect(scene.locator('[data-km-crayon-element="dragon-eyelid"]')).toHaveAttribute("data-km-crayon-pose","blink");
  expect(await wing.getAttribute("transform")).not.toEqual(openWing);
  await scene.screenshot({path:info.outputPath("dragon-village-dragon-reacts.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Friends answer"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","260");
  await scene.screenshot({path:info.outputPath("dragon-village-friends-answer.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Wings unfurl"}).click();
  expect(await wing.getAttribute("transform")).toBe(openWing);
});
test("dragon village portrait composition and independent cast variant",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-scene-engine--dragon-village-portrait&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  await expect(scene).toHaveAttribute("viewBox","0 0 540 960");
  await page.getByRole("button",{name:"Friends answer"}).click();
  await scene.screenshot({path:info.outputPath("dragon-village-portrait-friends.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Final pose"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","329");
  await scene.screenshot({path:info.outputPath("dragon-village-portrait-final.png"),animations:"disabled"});
  await page.goto("/iframe.html?id=video-crayon-scene-engine--dragon-village-duo&viewMode=story");
  const duo=page.locator("svg[data-km-crayon-scene]");
  await expect(duo.locator('[data-km-crayon-element="owl-body"]')).toHaveCount(0);
  await expect(duo.locator('[data-km-crayon-element="friend-body"]')).toBeAttached();
  await expect(duo.locator('[data-km-crayon-element="dragon-body"]')).toBeAttached();
});


test("dragon and architecture close-ups expose actual craft geometry and distinct stable cameras",async({page},info)=>{
  const frames=[
    {id:"dragon-anatomy-detail",name:"dragon-close",kind:"dragon-flank-scale-field"},
    {id:"castle-masonry-detail",name:"castle-close",kind:"castle-carved-voussoir-arch"},
    {id:"dragon-anatomy-detail-portrait",name:"dragon-portrait-close",kind:"dragon-neck-overlapping-scutes"},
  ];
  for(const item of frames){
    await page.goto("/iframe.html?id=video-crayon-scene-engine--"+item.id+"&viewMode=story");
    const svg=page.locator("svg[data-km-crayon-scene]");
    const target=svg.locator('[data-km-crayon-element="'+item.kind+'"]');
    await expect(target).toBeAttached();
    await page.getByRole("button",{name:"Friends answer"}).click();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","260");
    await expect(svg.locator('[data-km-crayon-camera]')).toHaveCount(1);
    const transform=await svg.locator('[data-km-crayon-camera]').getAttribute("transform");
    expect(transform).toContain("scale(");
    const d=await target.locator("path").first().getAttribute("d");
    expect(d?.length).toBeGreaterThan(80);
    await svg.screenshot({path:info.outputPath(item.name+"-260.png"),animations:"disabled"});
  }
});


test("all crayon Storybook pages appear under one Film Looks / Crayon folder",async({page})=>{
  const response=await page.request.get("/index.json");
  expect(response.ok()).toBe(true);
  const index=await response.json() as {
    entries: Record<string,{id:string;title:string;type:string}>;
  };
  const all=Object.values(index.entries).filter(entry=>entry.type==="story");
  for(const metaId of ["video-crayon-scene-engine",
    "video-crayon-storybook","video-crayon-material-studies"]){
    const stories=all.filter(entry=>entry.id.startsWith(metaId+"--"));
    expect(stories.length).toBeGreaterThan(0);
    for(const entry of stories)
      expect(entry.title).toMatch(/^Video production\/Film Looks\/Crayon\//);
  }
});

test("opaque wax optical regression: background cannot bleed through finished character",async({page},info)=>{
  async function inspect(id:string,shot:string){
    await page.goto("/iframe.html?id=video-crayon-material-studies--"+id+"&viewMode=story");
    const svg=page.locator("svg[data-km-crayon-optics]");
    await expect(svg).toBeVisible();
    await expect(svg.locator('[data-km-crayon-coverage="open"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-crayon-coverage="opaque"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
    const pixels=await page.evaluate(async()=>{
      const svg=document.querySelector('svg[data-km-crayon-optics]');
      if(!svg)throw new Error("Missing optical proof SVG");
      const serialized=new XMLSerializer().serializeToString(svg);
      const url=URL.createObjectURL(new Blob([serialized],
        {type:"image/svg+xml;charset=utf-8"}));
      try {
        const image=new Image();
        image.src=url;
        await image.decode();
        const canvas=document.createElement("canvas");
        canvas.width=960;canvas.height=540;
        const context=canvas.getContext("2d");
        if(!context)throw new Error("Canvas is unavailable");
        context.drawImage(image,0,0,960,540);
        const rgb=(x:number,y:number)=>
          Array.from(context.getImageData(x,y,1,1).data).slice(0,3);
        // Matching interior cheek positions, not outlines or blinking eyes.
        return {open:rgb(285,340),opaque:rgb(656,340)};
      } finally {URL.revokeObjectURL(url);}
    });
    await svg.screenshot({path:info.outputPath(shot+".png"),animations:"disabled"});
    return pixels;
  }
  const blue=await inspect("layer-coverage-comparison","wax-coverage-cobalt");
  const coral=await inspect("layer-coverage-coral","wax-coverage-coral");
  const difference=(a:number[],b:number[])=>
    a.reduce((sum,channel,i)=>sum+Math.abs(channel-b[i]),0);
  expect(difference(blue.open,coral.open)).toBeGreaterThan(65);
  expect(difference(blue.opaque,coral.opaque)).toBeLessThan(9);
});
