import { test, expect } from "@playwright/test";
const id="video-production-film-looks-paper-craft--director";
for(const aspect of ["landscape","portrait"] as const){
  test("paper director "+aspect+" four real cut-paper film chapters",async({page},info)=>{
    const errors:string[]=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto("/iframe.html?id="+id+"&viewMode=story&args=aspect:"+aspect+";medium:layered;seed:37;motion:0.7");
    const stage=page.locator('svg[data-km-paper-director="material-paper-tour"]');
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("data-km-paper-shot","botanical-wing");
    const moth=stage.locator('[data-km-paper-parent="moth-abdomen"]');
    expect(await moth.count()).toBeGreaterThan(8);
    const seek=page.getByRole("slider",{name:"Scrub complete paper film"});
    await seek.focus();await seek.press("Home");
    await seek.press("ArrowRight");
    // Fixed seek to a cut and inspect actual native paper overlay.
    await page.getByRole("button",{name:/01 · Woodland/}).click();
    await seek.focus(); await seek.press("PageUp");
    await page.getByRole("button",{name:/02 · Botanical/}).click();
    const curtain=page.locator('svg[data-km-paper-curtain]');
    await expect(curtain).toHaveAttribute("data-km-paper-phase","opening");
    await expect(curtain.locator('path[fill="#E8CEAA"]')).toHaveCount(1);
    await page.locator('[data-km-paper-film]').screenshot({
      path:info.outputPath("paper-curtain-"+aspect+".png"),animations:"disabled"
    });
    await page.getByRole("button",{name:/03 · Canal houses/}).click();
    await expect(stage).toHaveAttribute("data-km-paper-shot","city-layering");
    await expect(stage).toHaveAttribute("data-km-paper-frame","0");
    const initialProgress=await stage.locator("[data-km-paper-layer]").evaluateAll(nodes=>
      nodes.map(n=>n.getAttribute("data-km-paper-progress")));
    expect(initialProgress.every(p=>p==="1.0000")).toBe(true);
    await page.getByRole("button",{name:/04 · Camera/}).click();
    await expect(stage).toHaveAttribute("data-km-paper-shot","constructed-device");
    await expect(stage).toHaveAttribute("data-km-paper-frame","0");
    const scrub=page.getByRole("slider",{name:"Scrub complete paper film"});
    await scrub.focus();
    await scrub.press("End");
    await expect(stage).toHaveAttribute("data-km-paper-frame","239");
    await expect(stage.locator("[data-km-paper-camera]")).toHaveCount(1);
    const cuts=stage.locator("[data-km-paper-layer]");
    expect(await cuts.count()).toBeGreaterThan(20);
    const colors=await cuts.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-stock")));
    expect(colors.every(c=>/^#[0-9a-fA-F]{6}$/.test(c??""))).toBe(true);
    await stage.screenshot({path:info.outputPath("paper-director-"+aspect+".png"),animations:"disabled"});
    expect(errors).toEqual([]);
  });
}
