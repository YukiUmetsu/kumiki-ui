import {expect,test} from "@playwright/test";

const path="/iframe.html?id=video-production-film-looks-paper-craft--moonlit-lantern&viewMode=story";
test("portrait prince review loupe keeps his face in the review viewport in each chapter",async({page},info)=>{
  await page.goto(path+"&args=aspect:portrait;motion:0;medium:layered");
  await page.addStyleTag({content:'[data-royal-inspection-target] { transition: none !important; }'});
  const loupe=page.locator('[data-royal-inspection-target="prince"]');
  await page.getByRole("button",{name:"Inspect prince · 3×",exact:true}).click();
  for(const [index,chapter] of [null,/02 · Follow the little lights/,/03 · A light shared/].entries()){
    if(chapter)await page.getByRole("button",{name:chapter}).click();
    await expect.poll(async()=>{
      const viewport=await loupe.locator("..").boundingBox();
      const head=await loupe.locator('[data-km-paper-layer="prince-head"] > g > path').first().boundingBox();
      if(!viewport||!head)return Infinity;
      return Math.abs((head.x+head.width/2)-(viewport.x+viewport.width/2))/viewport.width;
    },{timeout:3000}).toBeLessThan(.1);
    await loupe.locator("..").screenshot({path:info.outputPath(`prince-loupe-chapter-${index+1}.png`),animations:"disabled"});
  }
});
test("reduced motion keeps chapter navigation usable without playback or animated loupe",async({page},info)=>{
  await page.goto(path+"&args=aspect:portrait;motion:0.75;medium:layered;reducedMotion:true");
  const stage=page.locator('svg[data-km-paper-director="the-moonlit-lantern"]');
  await expect(page.getByRole("button",{name:"Play story"})).toBeDisabled();
  await expect(page.getByRole("slider",{name:"Scrub fairy tale"})).toBeDisabled({timeout:3000});
  for(const [chapter,shot] of [[/01 ·/,"the-hushed-orchard"],[/02 ·/,"the-fox-guides"],[/03 ·/,"the-lantern-awakens"]] as const){
    await page.getByRole("button",{name:chapter}).click();
    await expect(stage).toHaveAttribute("data-km-paper-shot",shot);
    await expect(page.locator("[data-km-paper-curtain]")).toHaveCount(0);
    await stage.screenshot({path:info.outputPath(`still-${shot}.png`),animations:"disabled"});
  }
  await expect(page.getByText("Choose a chapter to view its still pose.")).toBeVisible();
  await page.getByRole("button",{name:"Inspect prince · 3×",exact:true}).click();
  await expect(page.locator('[data-royal-inspection-target="prince"]')).toHaveCSS("transition-duration","0s");
});
for(const aspect of ["landscape","portrait"] as const){
  test("original royal paper fairy tale "+aspect+" renders all three acts with connected cutout actors",async({page},info)=>{
    const errors:string[]=[];
    page.on("pageerror",err=>errors.push(err.message));
    await page.goto(path+"&args=aspect:"+aspect+";motion:0.75;medium:layered");
    const stage=page.locator('svg[data-km-paper-director="the-moonlit-lantern"]');
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("viewBox",
      aspect==="portrait"?"0 0 540 960":"0 0 960 540");
    await expect(stage.locator('[data-km-paper-layer="princess-bodice"]')).toBeVisible();
    await expect(stage.locator('[data-km-paper-layer="prince-coat"]')).toBeVisible();
    await expect(stage.locator('[data-km-paper-layer="fox-body"]')).toBeVisible();
    await expect(stage.locator('[data-km-paper-layer="rabbit-body"]')).toBeVisible();
    await expect(stage.locator('[data-km-paper-layer="deer-body"]')).toBeVisible();
    await expect(stage.locator('[data-km-paper-layer="owl-body"]')).toBeVisible();
    const subjects=stage.locator("[data-km-paper-layer]");
    expect(await subjects.count()).toBeLessThanOrEqual(128);
    expect(await subjects.count()).toBeGreaterThan(88);
    await stage.screenshot({path:info.outputPath("royal-act1-"+aspect+".png"),animations:"disabled"});
    const second=page.getByRole("button",{name:/02 · Follow the little lights/});
    await second.click();
    await expect(stage).toHaveAttribute("data-km-paper-shot","the-fox-guides");
    await expect(stage).toHaveAttribute("data-km-paper-frame","18");
    await expect(page.locator("[data-km-paper-curtain]")).toHaveCount(0);
    await stage.screenshot({path:info.outputPath("royal-act2-"+aspect+".png"),animations:"disabled"});
    const third=page.getByRole("button",{name:/03 · A light shared/});
    await third.click();
    await expect(stage).toHaveAttribute("data-km-paper-shot","the-lantern-awakens");
    await expect(stage.locator('[data-km-paper-layer="lantern-star"]')).toBeVisible();
    await expect(stage).toHaveAttribute("data-km-paper-frame","18");
    await expect(page.locator("[data-km-paper-curtain]")).toHaveCount(0);
    await stage.screenshot({path:info.outputPath("royal-act3-"+aspect+".png"),animations:"disabled"});
    // A story-level review loupe magnifies the same actual art, without
    // creating a parallel screenshot/mock character implementation.
    for(const who of ["princess","prince"] as const){
      await page.getByRole("button",{name:who==="princess"?"Inspect princess · 3×":"Inspect prince · 3×",exact:true}).click();
      const loupe=page.locator('[data-royal-inspection-target="'+who+'"]');
      await expect(loupe).toHaveCSS("transform",/matrix/);
      // Screenshot the fixed film viewport, not the larger transformed child.
      await loupe.locator("..").screenshot({
        path:info.outputPath("royal-face-review-"+who+"-"+aspect+".png"),
        animations:"disabled"});
    }
    await page.getByRole("button",{name:"Full stage"}).click();
    await expect(page.locator('[data-royal-inspection-target="stage"]')).toHaveAttribute(
      "style",/transform:\s*none/);
    const scrub=page.getByRole("slider",{name:"Scrub fairy tale"});
    await scrub.focus();
    await scrub.press("End");
    await expect(stage).toHaveAttribute("data-km-paper-frame","239");
    const stocks=await subjects.evaluateAll(nodes=>nodes.map(x=>x.getAttribute("data-km-paper-stock")));
    expect(stocks.every(x=>/^#[a-fA-F0-9]{6}$/.test(x??""))).toBe(true);
    expect(errors).toEqual([]);
  });
}
test("portrait deer remains within the paper stage across all chapters",async({page})=>{
  await page.goto(path+"&args=aspect:portrait;motion:0.75;medium:layered");
  const stage=page.locator('svg[data-km-paper-director="the-moonlit-lantern"]');
  for(const chapter of [null,/02 · Follow the little lights/,/03 · A light shared/]){
    if(chapter) await page.getByRole("button",{name:chapter}).click();
    const bounds=await stage.boundingBox();
    expect(bounds).not.toBeNull();
    for(const id of ["deer-body","deer-head","deer-antlers"]){
      const part=await stage.locator(`[data-km-paper-layer="${id}"] > g > path`).first().boundingBox();
      expect(part,id).not.toBeNull();
      expect(part!.x+part!.width,id).toBeLessThanOrEqual(bounds!.x+bounds!.width-2);
    }
  }
});

test("portrait fox is visible and clear of the prince's boots",async({page})=>{
  await page.goto(path+"&args=aspect:portrait;motion:0.75;medium:layered");
  const stage=page.locator('svg[data-km-paper-director="the-moonlit-lantern"]');
  const slider=page.getByRole("slider",{name:"Scrub fairy tale"});
  for(const frame of [30,130,270,370,510,610,710]){
    await slider.fill(String(frame));
    const bounds=await stage.boundingBox();
    const fox=await stage.locator('[data-km-paper-layer="fox-body"] > g > path').first().boundingBox();
    for(const id of ["fox-tail","fox-head"]){
      const part=await stage.locator(`[data-km-paper-layer="${id}"] > g > path`).first().boundingBox();
      expect(part,id).not.toBeNull();
      expect(part!.x,id).toBeGreaterThanOrEqual(bounds!.x);
      expect(part!.x+part!.width,id).toBeLessThanOrEqual(bounds!.x+bounds!.width);
    }
    const boot=await stage.locator('[data-km-paper-layer="prince-right-boot"] > g > path').first().boundingBox();
    expect(bounds).not.toBeNull();expect(fox).not.toBeNull();expect(boot).not.toBeNull();
    expect(fox!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(fox!.x+fox!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width);
    const overlaps=fox!.x < boot!.x+boot!.width && fox!.x+fox!.width > boot!.x &&
      fox!.y < boot!.y+boot!.height && fox!.y+fox!.height > boot!.y;
    expect(overlaps,`frame ${frame}`).toBe(false);
  }
});

test("portrait deer body stays clear of the prince's coat in early scenes",async({page})=>{
  await page.goto(path+"&args=aspect:portrait;motion:0.75;medium:layered");
  const stage=page.locator('svg[data-km-paper-director="the-moonlit-lantern"]');
  const slider=page.getByRole("slider",{name:"Scrub fairy tale"});
  for(const frame of [30,130,270,370]){
    await slider.fill(String(frame));
    const deer=await stage.locator('[data-km-paper-layer="deer-body"] > g > path').first().boundingBox();
    const coat=await stage.locator('[data-km-paper-layer="prince-coat"] > g > path').first().boundingBox();
    expect(deer).not.toBeNull();expect(coat).not.toBeNull();
    const overlaps=deer!.x < coat!.x+coat!.width && deer!.x+deer!.width > coat!.x &&
      deer!.y < coat!.y+coat!.height && deer!.y+deer!.height > coat!.y;
    expect(overlaps,`frame ${frame}`).toBe(false);
  }
});

test("landscape fox does not overlap the prince's hand or boots",async({page})=>{
  await page.goto(path+"&args=aspect:landscape;motion:0.75;medium:layered");
  const stage=page.locator('svg[data-km-paper-director="the-moonlit-lantern"]');
  const slider=page.getByRole("slider",{name:"Scrub fairy tale"});
  for(const frame of [130,370,610]){
    await slider.fill(String(frame));
    const bounds=await stage.boundingBox();
    for(const foxId of ["fox-body","fox-head","fox-tail"]){
      const fox=await stage.locator(`[data-km-paper-layer="${foxId}"] > g > path`).first().boundingBox();
      expect(fox,foxId).not.toBeNull();expect(bounds).not.toBeNull();
      expect(fox!.x,foxId).toBeGreaterThanOrEqual(bounds!.x);
      expect(fox!.x+fox!.width,foxId).toBeLessThanOrEqual(bounds!.x+bounds!.width);
      for(const actorId of ["prince-left-hand","prince-right-hand","prince-left-boot","prince-right-boot"]){
        const actor=await stage.locator(`[data-km-paper-layer="${actorId}"] > g > path`).first().boundingBox();
        expect(actor,actorId).not.toBeNull();
        const overlaps=fox!.x < actor!.x+actor!.width && fox!.x+fox!.width > actor!.x &&
          fox!.y < actor!.y+actor!.height && fox!.y+fox!.height > actor!.y;
        expect(overlaps,`${frame} ${foxId}/${actorId}`).toBe(false);
      }
    }
  }
});

test("prince upper lid overlaps the eye aperture in both formats",async({page})=>{
  for(const aspect of ["landscape","portrait"]){
    await page.goto(path+"&args=aspect:"+aspect+";motion:0.75;medium:layered");
    await page.getByRole("slider",{name:"Scrub fairy tale"}).fill("610");
    const eye=page.locator('[data-km-paper-layer="prince-eye-white"] > g > path').first();
    await expect(eye).toBeVisible();
    const covered=await page.evaluate(()=>{
      const aperture=document.querySelector<SVGGeometryElement>('[data-km-paper-layer="prince-eye-white"] > g > path');
      const ink=document.querySelector<SVGGeometryElement>('[data-km-paper-layer="prince-eye-brow"] > g > path');
      if(!aperture||!ink)throw Error("Prince eye stock is missing");
      const box=aperture.getBBox();
      return ink.isPointInFill(new DOMPoint(box.x+box.width*.5,box.y+box.height*.2));
    });
    expect(covered,aspect+" upper lid must overlap the aperture").toBe(true);
  }
});
