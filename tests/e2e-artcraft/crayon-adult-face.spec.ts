import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy} from "../../src/video/crayon-artcraft-adult-face-fixtures";
import {crayonCc0NearEyeStudy} from "../../src/video/crayon-artcraft-cc0-near-eye";
import {AdultFaceArtcraftWorkbench} from "../../src/video/crayon-artcraft-adult-face.stories";

/** Only exact React-native CRAYON1 renders may serve as visual evidence.
 * This workflow produces viewable image files and machine-checks the DOM.
 * Art-director approval is separate and is NOT implied by a green job.
 */
for(const item of [
  {aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960},
] as const){
  test("ArtCraft source-native adult face render: "+item.aspect,async({page},info)=>{
    const spec=crayonAdultFaceStudy(item.aspect);
    const art=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
    await page.setViewportSize({width:item.width,height:item.height});
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.setContent("<!doctype html><html><body style='margin:0;padding:0;width:"+
      item.width+"px;height:"+item.height+"px;overflow:hidden'>"+art+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox",
      "0 0 "+item.width+" "+item.height);
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    for(const part of ["adult-face","left-upper-lid","right-upper-lid",
      "nose-alar-wing","lip-upper-volume","hair-back","coat-collar-left"]){
      await expect(svg.locator('[data-km-crayon-element="'+part+'"]')).toBeAttached();
    }
    await expect(svg.locator('[data-km-crayon-element="adult-face"] [data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
    expect(errors).toEqual([]);
    // The proof remains a screenshot of the actual native renderer, never
    // a hand-created approximation or a source reference pasted onto canvas.
    const shot=await svg.screenshot({type:"jpeg",quality:77,
      path:info.outputPath("native-adult-face-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    // A compact browser-rendered thumbnail can be inspected directly by the
    // QA agent from GitHub job logs without copying third-party source art.
    // The full resolution capture is retained as the workflow artifact.
    console.log("ARTCRAFT_RENDER_JPEG:"+item.aspect+":"+shot.toString("base64"));
    // Semantic, source-framed evidence for ArtCraft eye construction and
    // pigment-blend review; do not infer quality from attached DOM elements.
    const eyeCrop=item.aspect==="landscape"?
      {x:380,y:112,width:198,height:119}:
      {x:119,y:171,width:300,height:158};
    const eyes=await page.screenshot({clip:eyeCrop,type:"jpeg",quality:84,
      path:info.outputPath("artcraft-eyes-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    console.log("ARTCRAFT_EYE_JPEG:"+item.aspect+":"+eyes.toString("base64"));
    const featureCrop=item.aspect==="landscape"?
      {x:415,y:216,width:132,height:112}:
      {x:167,y:351,width:215,height:234};
    const nasal=await page.screenshot({clip:featureCrop,type:"jpeg",quality:84,
      path:info.outputPath("artcraft-nose-mouth-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    console.log("ARTCRAFT_NOSE_JPEG:"+item.aspect+":"+nasal.toString("base64"));
    for(const garmentId of ["coat-sleeve-cap-near","coat-sleeve-cap-far",
      "shirt-lace-ruffle-left","shirt-lace-ruffle-right",
      "coat-collar-felt-near","coat-collar-felt-far",
      "scarf-overlap-fold"]){
      await expect(svg.locator('[data-km-crayon-element="'+garmentId+'"]'))
        .toBeAttached();
    }
    const textileCrop=item.aspect==="portrait"?
      {x:22,y:559,width:496,height:310}:
      {x:303,y:301,width:354,height:210};
    const cloth=await page.screenshot({clip:textileCrop,type:"jpeg",
      quality:87,path:info.outputPath("artcraft-garment-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    console.log("ARTCRAFT_GARMENT_JPEG:"+item.aspect+":"+cloth.toString("base64"));
    // Actual legacy-proportion negative control, captured with the same
    // renderer and viewport rather than a manipulated illustrative image.
    // This makes the macro-anatomy decision independently reviewable.
    if(item.aspect==="portrait"){
      const rejected=crayonAdultFaceStudy("portrait",{headScaleY:1});
      const rejectedMarkup=renderToStaticMarkup(createElement(CrayonScene,{
        spec:rejected,frame:299,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0;padding:0;width:"+
        item.width+"px;height:"+item.height+"px;overflow:hidden'>"+
        rejectedMarkup+"</body></html>");
      const oldPortrait=page.locator("svg[data-km-crayon-scene]");
      await expect(oldPortrait).toBeVisible();
      const oldShot=await oldPortrait.screenshot({type:"jpeg",quality:77,
        path:info.outputPath("rejected-uncompressed-portrait-299.jpg"),
        animations:"disabled"});
      console.log("ARTCRAFT_OLD_HEAD_JPEG:"+oldShot.toString("base64"));
    }
    const neutralScene=crayonAdultFaceStudy(item.aspect,{expression:"neutral"});
    const neutralSvg=renderToStaticMarkup(createElement(CrayonScene,{
      spec:neutralScene,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0;padding:0;width:"+
      item.width+"px;height:"+item.height+"px;overflow:hidden'>"+
      neutralSvg+"</body></html>");
    const neutral=page.locator("svg[data-km-crayon-scene]");
    await expect(neutral).toBeVisible();
    await expect(neutral.locator('[data-km-crayon-element="forelock-loose-curl"]')).toBeAttached();
    await expect(neutral.locator('[data-km-crayon-element="cheek-malar-crayon-red"]')).toBeAttached();
    const neutralShot=await neutral.screenshot({type:"jpeg",quality:80,
      path:info.outputPath("native-adult-neutral-"+item.aspect+"-299.jpg"),
      animations:"disabled"});
    console.log("ARTCRAFT_NEUTRAL_JPEG:"+item.aspect+":"+neutralShot.toString("base64"));
  });
}

/**
 * Frozen ArtCraft v7 reference-review surface in the EXISTING Crayon Storybook
 * page. The measured CC0 source photograph is external; the native candidate
 * is rendered directly from React. Neither SSR nor a green browser screenshot
 * can approve likeness or assert that the original photo JPEG was preserved.
 */
test("ArtCraft source-referenced portrait audit remains rejected and isolated",
  async({page},info)=>{
    await page.setViewportSize({width:1180,height:1060});
    const markup=renderToStaticMarkup(createElement(AdultFaceArtcraftWorkbench,{
      aspect:"portrait",detail:1,expression:"warm",headScaleY:.82,
      startFrame:299,playbackRate:1,loop:false,inspection:"full",
      referenceReview:true,showCandidateLandmarks:true,
    }));
    const errors:string[]=[];
    page.on("pageerror",err=>errors.push(err.message));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      markup+"</body></html>");
    const audit=page.locator('[data-km-crayon-portrait-audit="REJECT"]');
    await expect(audit).toBeVisible();
    await expect(audit).toContainText("17/18");
    await expect(audit).toContainText("4/5");
    const reference=page.locator('img[alt*="CC0 photographic anatomy reference"]');
    await expect(reference).toHaveCount(1);
    await expect(page.locator('[data-km-crayon-portrait-landmark]')).toHaveCount(18);
    const native=page.locator('[data-km-crayon-source-review="on"] svg[data-km-crayon-scene]');
    await expect(native).toHaveAttribute("data-km-crayon-frame","299");
    await native.screenshot({path:info.outputPath("cc0-audit-native-crayon-portrait.png"),
      animations:"disabled"});
    // Record the complete review surface for actual artist scrutiny. The
    // external image is a reference preview, not a registered image overlay.
    await page.locator('[data-km-crayon-source-review="on"]').screenshot({
      path:info.outputPath("cc0-audit-side-by-side-lab.png"),animations:"disabled"});
    expect(errors).toEqual([]);
  });

for(const mode of [{aspect:"landscape",width:960,height:540},
  {aspect:"portrait",width:540,height:960}] as const){
  test("ArtCraft CC0 native wax eye specimen "+mode.aspect,async({page},info)=>{
    const spec=crayonCc0NearEyeStudy(mode.aspect);
    const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
    await page.setViewportSize({width:mode.width,height:mode.height});
    const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
    await page.setContent("<!doctype html><body style='margin:0'>"+html+"</body>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const name of ["eye-skin","brow-root","eye-sclera","eye-iris","eye-pupil",
      "upper-lid-overhang","lower-lid-flesh","upper-lashes"]){
      await expect(svg.locator('[data-km-crayon-element="'+name+'"]')).toBeAttached();
    }
    await svg.screenshot({path:info.outputPath("cc0-eye-wax-"+mode.aspect+"-299.png"),
      animations:"disabled"});
    expect(errors).toEqual([]);
  });
}
