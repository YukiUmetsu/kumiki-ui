import {test,expect} from "@playwright/test";
const id="video-production-film-looks-paper-craft--director";
for(const aspect of ["landscape","portrait"] as const){
  test("printed-page edit "+aspect+" in real Storybook Chromium",async({page},info)=>{
    const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
    for(const [frame,phase,angle] of [
      [228,"closing","0.000"],[234,"closing",null],
      [239,"closing","88.750"],[240,"opening","91.250"],
      [246,"opening",null],[251,"opening","180.000"],
    ] as const){
      await page.goto("/iframe.html?id="+id+"&viewMode=story&args="+
        "aspect:"+aspect+";pageTurn:true;frame:"+frame+";curtains:true;motion:0.7");
      const turn=page.locator('[data-km-paper-page-turn]');
      await expect(turn).toBeVisible();
      await expect(turn).toHaveAttribute("data-km-paper-phase",phase);
      if(angle!==null)await expect(turn).toHaveAttribute("data-km-paper-angle",angle);
      await expect(turn.locator("svg[data-km-paper-craft]")).toHaveCount(2);
      await expect(turn.locator("[data-km-paper-page-leaf]")).toHaveCount(1);
      await expect(turn.locator("[data-km-paper-next-page]")).toHaveCount(1);
      await page.locator("[data-km-paper-film]").screenshot({
        path:info.outputPath("page-turn-"+aspect+"-"+frame+".png"),animations:"disabled"
      });
    }
    expect(errors).toEqual([]);
  });
}
