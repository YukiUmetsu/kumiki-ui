import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

/** Seek the film to a frame that has no beat button. */
async function seekFilm(page:Page,frame:number){
  await page.getByRole("slider",{name:"Film frame"}).evaluate((node,n)=>{
    const input=node as HTMLInputElement;
    const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!native)throw new Error("No native range setter");
    native.call(input,String(n));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },frame);
  await expect(page.locator("svg[data-km-crayon-scene]"))
    .toHaveAttribute("data-km-crayon-frame",String(frame));
}
/** Where a painted boot meets the paper on screen, in scene units. */
async function soleOf(boot:Locator){
  return boot.evaluate(node=>{
    const svg=(node as SVGGElement).ownerSVGElement!;
    const page=svg.getBoundingClientRect(),unit=svg.viewBox.baseVal.width/page.width;
    const paint=node.querySelector("[data-km-crayon-underpaint]")!.getBoundingClientRect();
    return {x:(paint.left+paint.width/2-page.left)*unit,y:(paint.bottom-page.top)*unit};
  });
}
/** A planted sole may not slide or leave the ground: 0.05 of a scene unit is far
 * below one pixel, and the measured drift over every stance frame is 0.000. */
function expectPlanted(sole:{x:number;y:number},plant:{x:number;y:number},what:string){
  expect(Math.hypot(sole.x-plant.x,sole.y-plant.y),what).toBeLessThan(.05);
}

/** Cheap real-browser sanity proof; exhaustive frame suites run only on demand. */
const samples=[
  {name:"storybook night",id:"video-crayon-storybook--lantern-trail",attr:"data-km-crayon-storybook",aspect:"landscape"},
  {name:"storybook garden portrait",id:"video-crayon-storybook--garden-portrait",attr:"data-km-crayon-storybook",aspect:"portrait"},
  {name:"science data scene",id:"video-crayon-scene-engine--water-cycle",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"chart data scene",id:"video-crayon-scene-engine--illustrated-data",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"acting landscape",id:"video-crayon-acting--character-performance",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"acting portrait",id:"video-crayon-acting--character-performance-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"walk landscape",id:"video-crayon-walk--character-walk-cycle",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"walk portrait",id:"video-crayon-walk--character-walk-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"two-bone gait landscape",id:"video-crayon-walk--character-two-bone-ik",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"two-bone gait portrait",id:"video-crayon-walk--character-two-bone-ik-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"character draw in landscape",id:"video-crayon-draw-in--character-draw-in",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"character draw in portrait",id:"video-crayon-draw-in--character-draw-in-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"dragon village three actors",id:"video-crayon-dragon--dragon-village",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"dragon village portrait",id:"video-crayon-dragon--dragon-village-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
  {name:"dragon anatomy detail",id:"video-crayon-dragon--dragon-anatomy-detail",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"castle masonry detail",id:"video-crayon-dragon--castle-masonry-detail",attr:"data-km-crayon-scene",aspect:"landscape"},
  {name:"dragon anatomy portrait detail",id:"video-crayon-dragon--dragon-anatomy-detail-portrait",attr:"data-km-crayon-scene",aspect:"portrait"},
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

// #246 (58a0c658) replaced the first character with the Blue Coat child: mouth,
// brows and painted eyelids have their own names, beats and exposure frames.
test("crayon acting mouth and eyes switch named poses at exact exposure frames",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-acting--character-performance&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const mouth=scene.locator('[data-km-crayon-element="mouth-expression"]');
  const brows=["eyebrow-left","eyebrow-right"].map(id=>
    scene.locator('[data-km-crayon-element="'+id+'"]'));
  const lids=["left","right"].map(side=>
    scene.locator('[data-km-crayon-element="eye-'+side+'-blink-wax"]'));
  const face=async(pose:string)=>{
    await expect(mouth).toHaveAttribute("data-km-crayon-pose",pose);
    for(const brow of brows)await expect(brow).toHaveAttribute("data-km-crayon-pose",pose);
  };
  await page.getByRole("button",{name:"Curiosity"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","70");
  await face("wonder");
  await page.getByRole("button",{name:"Blink"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","97");
  for(const lid of lids)await expect(lid).toHaveAttribute("data-km-crayon-drawing","1");
  await seekFilm(page,141);
  await face("base");
  await page.getByRole("button",{name:"Smile"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","176");
  await face("smile");
  for(const lid of lids)await expect(lid).toHaveAttribute("data-km-crayon-drawing","2");
  await scene.screenshot({path:info.outputPath("acting-176.png"),animations:"disabled"});
  // A closed lid is painted over the whole iris, not drawn beside it.
  await seekFilm(page,188);
  for(const [i,side] of (["left","right"] as const).entries()){
    await expect(lids[i]).toHaveAttribute("data-km-crayon-drawing","3");
    const lid=(await lids[i].locator("[data-km-crayon-underpaint]").boundingBox())!;
    const iris=(await scene.locator('[data-km-crayon-element="eye-'+side+'-iris"] '+
      "[data-km-crayon-underpaint]").boundingBox())!;
    expect(lid.x).toBeLessThan(iris.x);
    expect(lid.y).toBeLessThan(iris.y+1);
    expect(lid.x+lid.width).toBeGreaterThan(iris.x+iris.width);
    expect(lid.y+lid.height).toBeGreaterThan(iris.y+iris.height);
  }
  await scene.screenshot({path:info.outputPath("acting-188.png"),animations:"disabled"});
  await seekFilm(page,216);
  await face("concern");
  for(const lid of lids)await expect(lid).toHaveAttribute("data-km-crayon-drawing","4");
  await page.getByRole("button",{name:"Smile"}).click();
  await face("smile");
  for(const lid of lids)await expect(lid).toHaveAttribute("data-km-crayon-drawing","2");
});

test("walk animation plants, releases, and replants the correct foot on keyed story beats",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-walk--character-walk-cycle&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const back=scene.locator('[data-km-crayon-element="boot-back"]');
  const front=scene.locator('[data-km-crayon-element="boot-front"]');
  const coat=scene.locator('[data-km-crayon-element="coat-body"]');
  await page.getByRole("button",{name:"Back-foot lift"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","38");
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  const backStart=await soleOf(back),frontStart=await soleOf(front);
  await seekFilm(page,66);
  await expect(back).not.toHaveAttribute("data-km-crayon-contact","planted");
  await expect(front).toHaveAttribute("data-km-crayon-contact","planted");
  expect((await soleOf(back)).y,"the back foot clears the ground").toBeLessThan(backStart.y-8);
  expectPlanted(await soleOf(front),frontStart,"front foot carries the weight at 66");
  await page.getByRole("button",{name:"Back-foot plant"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","94");
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  await expect(front).toHaveAttribute("data-km-crayon-contact","planted");
  const leg=scene.locator('[data-km-crayon-element="leg-front"]');
  await expect(leg).toHaveAttribute("data-km-crayon-kind","connector");
  const legAtPlant=await leg.locator("path").first().getAttribute("d");
  const backPlant=await soleOf(back),bodyAtPlant=await coat.getAttribute("transform");
  expectPlanted(await soleOf(front),frontStart,"front foot holds until the back foot lands");
  expect(backPlant.y).toBeCloseTo(backStart.y,1);
  expect(backPlant.x).toBeGreaterThan(backStart.x+10);
  await scene.screenshot({path:info.outputPath("walk-94.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Front-foot swing"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","124");
  await expect(front).not.toHaveAttribute("data-km-crayon-contact","planted");
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  expect(await leg.locator("path").first().getAttribute("d")).not.toEqual(legAtPlant);
  expect(await coat.getAttribute("transform")).not.toEqual(bodyAtPlant);
  expectPlanted(await soleOf(back),backPlant,"back foot carries the weight at 124");
  expect((await soleOf(front)).y,"the front foot clears the ground").toBeLessThan(frontStart.y-8);
  await page.getByRole("button",{name:"Front-foot plant"}).click();
  await expect(front).toHaveAttribute("data-km-crayon-contact","planted");
  expectPlanted(await soleOf(back),backPlant,"back foot holds until the front foot lands");
  const frontPlant=await soleOf(front);
  expect(frontPlant.y).toBeCloseTo(frontStart.y,1);
  expect(frontPlant.x).toBeGreaterThan(frontStart.x+20);
  await scene.screenshot({path:info.outputPath("walk-156.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Final plant"}).click();
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  expectPlanted(await soleOf(front),frontPlant,"front foot stays while the back foot closes");
  await page.getByRole("button",{name:"Back-foot plant"}).click();
  await expect(back).toHaveAttribute("data-km-crayon-contact","planted");
  expectPlanted(await soleOf(back),backPlant,"a backward seek lands on the same spot");
});


test("two-bone walk uses analytic knees and eases a releasing planted foot",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-walk--character-two-bone-ik&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const back=scene.locator('[data-km-crayon-element="boot-back"]');
  const front=scene.locator('[data-km-crayon-element="boot-front"]');
  const leg=scene.locator('[data-km-crayon-element="leg-front"]');
  await expect(leg).toHaveAttribute("data-km-crayon-rig","two-bone");
  await page.getByRole("button",{name:"Back-foot plant"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","94");
  const shapeAtStart=await leg.locator("path").first().getAttribute("d");
  expect(shapeAtStart).toMatch(/^M.* L.* L/);
  await page.getByRole("button",{name:"Contact release"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","44");
  await expect(back).toHaveAttribute("data-km-crayon-contact","releasing");
  // Eased release: no frame of the lift-off may jump away from the last plant.
  await seekFilm(page,38);
  let last=await soleOf(back);
  for(let frame=39;frame<=48;frame++){
    await seekFilm(page,frame);
    const next=await soleOf(back);
    expect(Math.hypot(next.x-last.x,next.y-last.y),"release step at "+frame).toBeLessThan(4);
    last=next;
  }
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
  await page.goto("/iframe.html?id=video-crayon-draw-in--character-draw-in&viewMode=story");
  const svg=page.locator("svg[data-km-crayon-scene]");
  const body=svg.locator('[data-km-crayon-element="coat-body"] [data-km-crayon-build]');
  const guide=svg.locator('[data-km-crayon-element="construction-head"]');
  await page.getByRole("button",{name:"Sketch guides"}).click();
  await expect(svg).toHaveAttribute("data-km-crayon-frame","33");
  await expect(guide).toHaveAttribute("data-km-crayon-exit","visible");
  // The guides come before any part of the character is outlined or painted.
  await expect(guide.locator("path").first()).toBeVisible();
  await expect(body).toHaveAttribute("data-km-crayon-build","pending");
  await svg.screenshot({path:info.outputPath("draw-in-guides-33.png"),animations:"disabled"});
  await page.getByRole("button",{name:"First outlines"}).click();
  await expect(svg).toHaveAttribute("data-km-crayon-frame","80");
  await expect(body).toHaveAttribute("data-km-crayon-build","outlining");
  await expect(guide).toHaveAttribute("data-km-crayon-exit","visible");
  await svg.screenshot({path:info.outputPath("draw-in-outlines-80.png"),animations:"disabled"});
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
  await page.goto("/iframe.html?id=video-crayon-draw-in--character-draw-in-portrait&viewMode=story");
  const svg=page.locator("svg[data-km-crayon-scene]");
  const coat=svg.locator('[data-km-crayon-element="coat-body"]');
  const body=coat.locator("[data-km-crayon-build]");
  const guide=svg.locator('[data-km-crayon-element="construction-head"]');
  await expect(svg).toHaveAttribute("viewBox","0 0 540 960");
  await page.getByRole("button",{name:"Sketch guides"}).click();
  await expect(guide).toHaveAttribute("data-km-crayon-exit","visible");
  await svg.screenshot({path:info.outputPath("draw-in-portrait-33.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Wax colour"}).click();
  await expect(body).toHaveAttribute("data-km-crayon-build","pigment");
  await page.getByRole("button",{name:"Layered shading"}).click();
  await expect(body).toHaveAttribute("data-km-crayon-build","finished");
  await expect(guide).toHaveAttribute("data-km-crayon-exit","finished");
  await svg.screenshot({path:info.outputPath("draw-in-portrait-280.png"),animations:"disabled"});
  const still=await coat.getAttribute("transform");
  await page.getByRole("button",{name:"Drawing moves"}).click();
  await expect(svg).toHaveAttribute("data-km-crayon-frame","400");
  expect(await coat.getAttribute("transform")).not.toBe(still);
  await svg.screenshot({path:info.outputPath("draw-in-portrait-400.png"),animations:"disabled"});
});


test("dragon village choreography: late wing flap, blinking dragon and responsive owl",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-dragon--dragon-village&viewMode=story");
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
  await page.goto("/iframe.html?id=video-crayon-dragon--dragon-village-portrait&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  await expect(scene).toHaveAttribute("viewBox","0 0 540 960");
  await page.getByRole("button",{name:"Friends answer"}).click();
  await scene.screenshot({path:info.outputPath("dragon-village-portrait-friends.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Final pose"}).click();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","329");
  await scene.screenshot({path:info.outputPath("dragon-village-portrait-final.png"),animations:"disabled"});
  await page.goto("/iframe.html?id=video-crayon-dragon--dragon-village-duo&viewMode=story");
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
    // #228 (2ca0c5dd) moved the dragon stories out of the scene-engine file.
    await page.goto("/iframe.html?id=video-crayon-dragon--"+item.id+"&viewMode=story");
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
    const head=(actor:"open"|"opaque")=>
      svg.locator('[data-km-crayon-optics-actor="'+actor+'"] > [data-km-crayon-region]');
    for(const actor of ["open","opaque"] as const){
      await expect(head(actor)).toHaveCount(1);
      await expect(head(actor)).toHaveAttribute("data-km-crayon-coverage",actor);
      await expect(head(actor).locator('[data-km-crayon-underpaint="opaque"]'))
        .toHaveCount(actor==="opaque"?1:0);
      // #239 (82bbff08) paints each nose as its own small opaque wax shape, so
      // every head carries exactly one opaque nose beside its own coverage.
      await expect(svg.locator('[data-km-crayon-optics-actor="'+actor+
        '"] [data-km-crayon-optics-nose] > [data-km-crayon-coverage="opaque"]')).toHaveCount(1);
    }
    await expect(svg.locator('[data-km-crayon-coverage="open"]')).toHaveCount(1);
    await expect(svg.locator('[data-km-crayon-coverage="opaque"]')).toHaveCount(3);
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


test("dragon held wax exposures redraw at authored intervals without silhouette jitter",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-dragon--dragon-hand-redraw&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  await expect(scene).toBeVisible();
  await expect(scene).toHaveAttribute("data-km-crayon-frame","221");
  const body=scene.locator('[data-km-crayon-element="dragon-body"]');
  const region=body.locator('[data-km-crayon-region]');
  const layer=body.locator('[data-km-crayon-repaint]');
  const pigment=body.locator('[data-km-crayon-underpaint]');
  await expect(region).toHaveAttribute("data-km-crayon-exposure","20");
  await expect(layer).toHaveCount(1);
  await expect(pigment).toHaveCount(1);
  const d=await pigment.getAttribute("d");
  const sample=async()=>layer.locator("path").first().getAttribute("d");
  const first=await sample();
  const seek=page.getByRole("slider",{name:"Film frame"});
  await seek.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-km-crayon-frame","222");
  await expect(region).toHaveAttribute("data-km-crayon-exposure","21");
  const second=await sample();
  expect(second).not.toEqual(first);
  expect(await pigment.getAttribute("d")).toEqual(d);
  await seek.press("ArrowRight");
  await expect(region).toHaveAttribute("data-km-crayon-exposure","21");
  expect(await sample()).toEqual(second);
  await scene.screenshot({animations:"disabled",path:info.outputPath("wax-redraw-223.png")});
  await page.getByRole("button",{name:"Dragon reacts"}).click();
  await expect(region).toHaveAttribute("data-km-crayon-exposure","13");
  await page.getByRole("button",{name:"Friends answer"}).click();
  await expect(region).toHaveAttribute("data-km-crayon-exposure","40");
});

test("wing silhouettes and bone accents change together while keeping wax opaque",async({page},info)=>{
  await page.goto("/iframe.html?id=video-crayon-dragon--dragon-wing-morph&viewMode=story");
  const scene=page.locator("svg[data-km-crayon-scene]");
  const wing=scene.locator('[data-km-crayon-element="dragon-wing-near"]');
  const ribs=scene.locator('[data-km-crayon-element="dragon-wing-near-ribs"]');
  await expect(scene).toHaveAttribute("data-km-crayon-frame","182");
  await expect(wing).toHaveAttribute("data-km-crayon-drawing","2");
  await expect(ribs).toHaveAttribute("data-km-crayon-drawing","2");
  await expect(wing.locator('[data-km-crayon-underpaint]')).toHaveCount(1);
  await expect(wing.locator('[data-km-crayon-frayed-rim]')).toHaveCount(1);
  await scene.screenshot({animations:"disabled",path:info.outputPath("wing-morph-flexed-182.png")});
  await page.getByRole("button",{name:"Wings unfurl"}).click();
  await expect(wing).toHaveAttribute("data-km-crayon-drawing","1");
  await expect(ribs).toHaveAttribute("data-km-crayon-drawing","1");
  await scene.screenshot({animations:"disabled",path:info.outputPath("wing-morph-stretched-155.png")});
});
