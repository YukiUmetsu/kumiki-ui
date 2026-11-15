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
    await page.getByRole("button",{name:/03 · Canal houses/}).click();
    await expect(stage).toHaveAttribute("data-km-paper-shot","city-layering");
    await expect(stage).toHaveAttribute("data-km-paper-frame","0");
    await page.getByRole("slider",{name:"Scrub complete paper film"}).fill("770");
    await expect(stage).toHaveAttribute("data-km-paper-shot","constructed-device");
    await expect(stage).toHaveAttribute("data-km-paper-frame","50");
    await expect(stage.locator("[data-km-paper-camera]")).toHaveCount(1);
    const cuts=stage.locator("[data-km-paper-layer]");
    expect(await cuts.count()).toBeGreaterThan(20);
    const colors=await cuts.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-paper-stock")));
    expect(colors.every(c=>/^#[0-9a-fA-F]{6}$/.test(c??""))).toBe(true);
    await stage.screenshot({path:info.outputPath("paper-director-"+aspect+".png"),animations:"disabled"});
    expect(errors).toEqual([]);
  });
}
