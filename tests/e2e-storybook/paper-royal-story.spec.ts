import {expect,test} from "@playwright/test";

const path="/iframe.html?id=video-production-film-looks-paper-craft--moonlit-lantern&viewMode=story";
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