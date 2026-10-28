import { expect, test } from "@playwright/test";
import { SCENE_IDS } from "../../src/components/video/scene-template-fixtures";

/** Browser geometry and seek-parity checks for every installed scene recipe.
 * This tests actual DOM/images, not just the serializable frame evaluator.
 */
for (const recipe of SCENE_IDS) {
  for (const aspect of ["16:9","9:16"] as const) {
    test(`${recipe} renders all key phases in ${aspect} without broken assets`, async ({page},info) => {
      await page.goto("/iframe.html?id=motion-scene-templates--"+recipe+"&viewMode=story");
      const stage=page.locator('[data-km-scene-recipe="'+recipe+'"]');
      await expect(stage).toBeVisible();
      await page.getByRole("button",{name:aspect,exact:true}).click();
      for (const [frame,phase] of [[0,"establish"],[25,"focus"],[55,"reveal"],[90,"resolve"],[119,"resolve"]] as const) {
        await page.getByRole("button",{name:"Frame "+frame,exact:true}).click();
        await expect(stage).toHaveAttribute("data-km-frame",String(frame));
        await expect(stage).toHaveAttribute("data-km-scene-phase",phase);
        const metrics=await stage.evaluate(el=>{
          const r=el.getBoundingClientRect();
          const headings=[...el.querySelectorAll("h2")].map(node=>{
            const h=node.getBoundingClientRect();
            return {left:h.left,right:h.right,top:h.top,bottom:h.bottom};
          });
          const images=[...el.querySelectorAll("img")].map(img=>({
            src:img.currentSrc,loaded:img.complete&&img.naturalWidth>0,
          }));
          return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,headings,images};
        });
        expect(metrics.width).toBeGreaterThan(100);
        expect(metrics.height).toBeGreaterThan(100);
        if(aspect==="16:9")expect(metrics.width/metrics.height).toBeCloseTo(16/9,1);
        else expect(metrics.height/metrics.width).toBeCloseTo(16/9,1);
        for(const image of metrics.images)expect(image.loaded).toBe(true);
        for(const heading of metrics.headings) {
          expect(heading.left).toBeGreaterThanOrEqual(metrics.left-2);
          expect(heading.right).toBeLessThanOrEqual(metrics.right+2);
          expect(heading.top).toBeGreaterThanOrEqual(metrics.top-2);
          expect(heading.bottom).toBeLessThanOrEqual(metrics.bottom+2);
        }
        if(frame===55||frame===119)await stage.screenshot({
          path:info.outputPath(recipe+"-"+aspect.replace(":","x")+"-"+frame+".png"),
          animations:"disabled",
        });
      }
      // Non-animated fallback preserves the active phase and content.
      await page.getByLabel("Reduced motion").check();
      await expect(stage).toHaveAttribute("data-km-frame","119");
    });
  }
}

test("all scene recipes provide a seekable VideoExportStage handshake",async ({page})=>{
  for (const recipe of SCENE_IDS) {
    await page.goto("/iframe.html?id=motion-scene-template-capture--"+recipe+"&viewMode=story&kmExport=1");
    const manifest=await page.evaluate(async()=>{
      const api=window.__kmVideoExport;
      if(!api)throw Error("VideoExportStage API not mounted");
      await api.seek(90);
      return {id:api.manifest.id,frames:api.manifest.durationFrames,
        assets:api.manifest.assets?.map(asset=>({id:asset.id,licenseRef:asset.licenseRef}))};
    });
    expect(manifest.id).toContain(recipe);
    expect(manifest.frames).toBe(120);
    expect(manifest.assets?.every(asset=>Boolean(asset.licenseRef))).toBe(true);
    await expect(page.locator("[data-km-video-capture]")).toHaveAttribute("data-frame","90");
  }
});
