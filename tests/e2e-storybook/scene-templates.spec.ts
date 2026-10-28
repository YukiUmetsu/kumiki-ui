import { expect, test } from "@playwright/test";
import { SCENE_IDS } from "../../src/components/video/scene-template-fixtures";
import type { SceneRecipeId } from "../../registry/video/scene-templates";

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
        // Capture each semantic beat, not just two static endpoints: the
        // original illustrations/transformations must be inspected in sequence.
        await stage.screenshot({
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


/** The most expressive part of each author-supplied recipe. A static frame
 * compare is not a subjective premium-quality verdict, but it catches a
 * missing frame clock / a motion primitive that never changes its pixels.
 */
const MOTION_WINDOWS = {
  "question-reveal":[0,12],
  "hidden-detail":[30,45],
  "before-after":[55,70],
  "side-by-side":[0,12],
  "cause-effect":[30,45],
  "scale-reveal":[30,45],
  "context-to-detail":[30,45],
  "layered-cutaway":[30,45],
  "build-and-connect":[30,45],
  "transform-and-track":[60,70],
  "time-evolution":[30,45],
  "data-story":[60,78],
  "consequence-chain":[30,45],
  "decision-branch":[30,45],
  "worked-example":[30,45],
  "demonstration":[30,45],
  "guided-inspection":[30,45],
  "character-discovery":[30,45],
  "evidence-reveal":[30,45],
  "environment-reveal":[0,45],
  "page-turn-story":[45,54],
  "orbit-world":[10,40],
  "timeline-journey":[10,40],
  "glass-data-reveal":[35,45],
} as const satisfies Record<SceneRecipeId,readonly [number,number]>;

async function waitForPreviewImages(page: import("@playwright/test").Page) {
  await page.waitForFunction(()=>
    [...document.querySelectorAll<HTMLImageElement>("[data-km-scene-recipe] img")]
      .every(img=>img.complete&&img.naturalWidth>0),
  );
}
async function seekPreviewFrame(page: import("@playwright/test").Page, value: number) {
  const slider=page.locator('input[type="range"]');
  await slider.evaluate((element,frame)=>{
    const input=element as HTMLInputElement;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter)throw new Error("Native range setter is unavailable");
    setter.call(input,String(frame));
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  },value);
}
for (const recipe of SCENE_IDS) {
  test(`${recipe} has real frame-to-frame scene motion, not just a static card`,async({page},info)=>{
    await page.goto("/iframe.html?id=motion-scene-templates--"+recipe+"&viewMode=story");
    const stage=page.locator('[data-km-scene-recipe="'+recipe+'"]');
    await expect(stage).toBeVisible();
    const [early,late]=MOTION_WINDOWS[recipe];
    await seekPreviewFrame(page,early);
    await expect(stage).toHaveAttribute("data-km-frame",String(early));
    await waitForPreviewImages(page);
    const before=await stage.screenshot({animations:"disabled",
      path:info.outputPath(recipe+"-motion-start.png")});
    await seekPreviewFrame(page,late);
    await expect(stage).toHaveAttribute("data-km-frame",String(late));
    await waitForPreviewImages(page);
    const after=await stage.screenshot({animations:"disabled",
      path:info.outputPath(recipe+"-motion-end.png")});
    expect(before.equals(after),"No visible pixel change during the expected motion window for "+recipe).toBe(false);
  });
}


test("character-discovery MP4 capture uses an articulated, rights-clear original rig",async({page},info)=>{
  await page.goto("/iframe.html?id=motion-scene-template-capture--character-discovery&viewMode=story&kmExport=1");
  const puppet=page.locator("[data-km-video-qa-original-rig]");
  await expect(puppet).toBeVisible();
  await expect(puppet.locator("svg")).toBeVisible();
  const capture=page.locator("[data-km-video-capture]");
  for(const frame of [0,30,55,70,95,119]){
    await page.evaluate(async target=>{
      const api=window.__kmVideoExport;
      if(!api)throw Error("Video export handshake is unavailable");
      await api.seek(target);
    },frame);
    await expect(capture).toHaveAttribute("data-frame",String(frame));
    await expect(puppet).toHaveAttribute("data-diagnostics","0");
    await capture.screenshot({animations:"disabled",
      path:info.outputPath("character-rig-capture-"+frame+".png")});
  }
  const manifest=await page.evaluate(()=>window.__kmVideoExport?.manifest);
  expect(manifest?.assets?.every(item=>item.licenseRef==="original-generated-fixture")).toBe(true);
});


test("butterfly scene capture renders real wing beats through portal and depth-wipe transitions",
  async({page},info)=>{
  await page.goto("/iframe.html?id=motion-follow-subject-through-sections--capture&viewMode=story&kmExport=1");
  const stage=page.locator("[data-km-video-capture]");
  const subject=page.locator('[data-km-subject="one-persistent-butterfly"]');
  await expect(subject).toBeVisible();
  const wing=page.locator("[data-km-butterfly-rig]");
  await expect(wing).toBeVisible();
  const steps=[0,55,60,65,71,119,120,126,131,179];
  const scales:number[]=[];
  for(const frame of steps){
    await page.evaluate(async target=>{
      const api=window.__kmVideoExport;
      if(!api)throw Error("Video export API is unavailable");
      await api.seek(target);
    },frame);
    await expect(stage).toHaveAttribute("data-frame",String(frame));
    scales.push(Number(await wing.getAttribute("data-km-wing-scale")));
    if(frame===65) {
      await expect(page.locator("[data-km-follow-subject-scene]"))
        .toHaveAttribute("data-km-scene-transition","portal");
      await expect(page.locator("[data-km-environment=second]"))
        .toHaveAttribute("data-km-reveal-mode","portal");
    }
    if(frame===126){
      await expect(page.locator("[data-km-follow-subject-scene]"))
        .toHaveAttribute("data-km-scene-transition","depth-wipe");
      await expect(page.locator("[data-km-environment=third]"))
        .toHaveAttribute("data-km-reveal-mode","depth-wipe");
    }
    await stage.screenshot({animations:"disabled",
      path:info.outputPath("butterfly-portal-journey-"+frame+".png")});
  }
  expect(new Set(scales).size).toBeGreaterThan(5);
  await expect(subject).toHaveCount(1);
  const manifest=await page.evaluate(()=>window.__kmVideoExport?.manifest);
  expect(manifest?.assets?.every(asset=>Boolean(asset.licenseRef))).toBe(true);
});
