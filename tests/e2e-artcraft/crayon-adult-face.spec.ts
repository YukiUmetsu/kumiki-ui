import {expect,test} from "@playwright/test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy} from "../../src/video/crayon-artcraft-adult-face-fixtures";
import {crayonCc0NearEyeStudy} from "../../src/video/crayon-artcraft-cc0-near-eye";
import {crayonPaperContactSwatches} from "../../src/video/crayon-artcraft-paper-contact-fixtures";
import {crayonArtcraftBodyStudy} from "../../src/video/crayon-artcraft-body-study";
import {crayonCc0FaceStudy,CRAYON_F1_EYE_INSPECTION} from "../../src/video/crayon-artcraft-cc0-face";
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

/** Same CRAYON1 engine, geometry and seed in both panels.
 * Only the opt-in contact finish changes. Native Chromium pixels are required:
 * DOM assertions and green test status are not artistic validation.
 */
test("ArtCraft two-up hand-laid crayon wax versus polished wax reference",
  async({page},info)=>{
    const smooth=crayonCc0NearEyeStudy("landscape",1,"smooth");
    const hand=crayonCc0NearEyeStudy("landscape",1,"stroke-built");
    await page.setViewportSize({width:1300,height:780});
    const panel=(name:string,spec:typeof hand,frame:number)=>
      createElement("figure",{style:{margin:0,width:"620px"}},
        createElement("figcaption",{style:{font:"bold 16px Arial",padding:"10px"}},name),
        createElement("div",{style:{width:"620px",height:"349px"}},
          createElement(CrayonScene,{spec,frame})));
    const markup=renderToStaticMarkup(createElement("main",
      {style:{display:"flex",gap:"12px",background:"#f7ecdc",padding:"12px"}},
      panel("Legacy smooth wax",smooth,299),
      panel("Stroke-built crayon contacts",hand,299)));
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      markup+"</body></html>");
    await expect(page.locator('g[data-km-crayon-deposition="smooth"]').first()).toBeAttached();
    await expect(page.locator('g[data-km-crayon-deposition="stroke-built"]').first()).toBeAttached();
    await expect(page.locator('g[data-km-crayon-cross-contact="second"]').first()).toBeAttached();
    await expect(page.locator('[data-km-crayon-underpaint="opaque"]').first()).toBeAttached();
    const captures=page.locator("svg[data-km-crayon-scene]");
    await expect(captures).toHaveCount(2);
    await page.locator("main").screenshot({
      path:info.outputPath("crayon-wax-contact-before-after.png"),animations:"disabled"});
    expect(errors).toEqual([]);
  });

/** Absolute film frames for a fixed paper-contact source: inspect the SAME
 * genuine CRAYON1 SVG, not an animated CSS or regenerated stand-in. Each
 * capture records pigment shape continuity at an unchanged camera/seed.
 * Passing DOM checks does not assert authentic crayon craftsmanship.
 */
test("ArtCraft wax nib partial-contact timeline at native resolution",
  async({page},info)=>{
    const spec=crayonPaperContactSwatches(.82,974);
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.setViewportSize({width:960,height:318});
    for(const frame of [62,92,122,158] as const){
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      await expect(svg.locator('[data-km-crayon-deposition="stroke-built"]'))
        .toHaveCount(5);
      await svg.screenshot({path:info.outputPath(
        "crayon-wax-contact-timeline-"+frame+".png"),animations:"disabled"});
    }
    expect(errors).toEqual([]);
  });

/** Source-independent paper material contact bench: actual native Chromium
 * captures at light and firm pressure, on light and dark layered grounds.
 */
for(const pressure of [.32,.82]){
  test("ArtCraft real paper-height contact proof pressure "+pressure,
    async({page},info)=>{
      const spec=crayonPaperContactSwatches(pressure,974);
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:239}));
      const errors:string[]=[];
      page.on("pageerror",error=>errors.push(error.message));
      await page.setViewportSize({width:960,height:318});
      await page.setContent("<!doctype html><html><body style='margin:0;width:960px;height:318px'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame","239");
      await expect(svg.locator('[data-km-crayon-deposition="stroke-built"]')).toHaveCount(5);
      await expect(svg.locator('[data-km-crayon-contact-clumps="wax"]')).toHaveCount(5);
      await expect(svg.locator('[data-km-crayon-element="dark-paper-ground"]'+
        ' [data-km-crayon-underpaint="opaque"]')).toBeAttached();
      await expect(svg.locator('[data-km-crayon-element="light-wax-over-dark"]'+
        ' [data-km-crayon-underpaint="opaque"]')).toBeAttached();
      await svg.screenshot({path:info.outputPath("crayon-paper-height-contact-"+pressure+".png"),
        animations:"disabled"});
      expect(errors).toEqual([]);
    });
}


/** Source-studied whole-body geometry captured ONLY from native CRAYON1.
 * ArtCraft v7 artistic approval remains blocked: the reference photograph
 * itself is not presented as a finished crayon rendering.
 */
for(const view of ["painted","construction"] as const){
  test("ArtCraft source-studied full-body wax "+view,
    async({page},info)=>{
      const spec=crayonArtcraftBodyStudy({view,detail:1});
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      const errors:string[]=[];
      page.on("pageerror",e=>errors.push(e.message));
      await page.setViewportSize({width:669,height:1000});
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
      for(const id of ["shirt-main","hand-left","hand-right",
        "trouser-leg-left","trouser-leg-right","shoe-left","shoe-right"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toBeAttached();
      }
      if(view==="construction"){
        await expect(svg.locator('[data-km-crayon-element^="body-source-landmark-"]'))
          .toHaveCount(22);
      } else {
        await expect(svg.locator('[data-km-crayon-element^="body-source-landmark-"]'))
          .toHaveCount(0);
      }
      await svg.screenshot({path:info.outputPath(
        "crayon-body-source-study-"+view+"-299.png"),animations:"disabled"});
      if(view==="painted"){
        const early=renderToStaticMarkup(createElement(CrayonScene,{
          spec,frame:155,
        }));
        await page.setContent("<!doctype html><body style='margin:0'>"+
          early+"</body>");
        await page.locator("svg[data-km-crayon-scene]").screenshot({
          path:info.outputPath("crayon-body-source-study-painted-155.png"),
          animations:"disabled",
        });
      }
      expect(errors).toEqual([]);
    });
}


/**
 * CC0 source-space anatomical reconstruction. Native 608x1082 portrait at
 * frames 120 (planes), 210 (iris/nose) and 299 (all drawn). The source
 * photo is independently reviewed; browser capture is NOT an approval.
 */
for(const view of ["wax","anatomy"] as const){
  test("ArtCraft native source-registered F1 full-face "+view,
    async({page},info)=>{
    // This intentionally captures eleven distinct production-frame and
    // macro inspection proofs (each re-renders thousands of wax contacts).
    // Avoid a false 60-second timeout on a passing, deterministic suite.
    if(view==="wax")test.slow();
    const spec=crayonCc0FaceStudy({view,detail:1});
    await page.setViewportSize({width:608,height:1082});
    const exceptions:string[]=[];
    page.on("pageerror",e=>exceptions.push(e.message));
    for(const frame of view==="wax"?[120,210,299]:[299]){
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      await expect(svg.locator('[data-km-crayon-element="face-outline"]'))
        .toBeAttached();
      if(frame===299 && view==="wax"){
        // Browser proof of the real V4 failure: wax contact clumps were
        // clipped at the polygon while its under-glaze feathered.
        await expect(svg.locator(
          '[data-km-crayon-feather-contacts="open-wax"]')).toHaveCount(25);
        await expect(svg.locator(
          '[data-km-crayon-contact-feather-mask]')).toHaveCount(25);
        await expect(svg.locator(
          '[data-km-crayon-opaque-burnish]')).toHaveCount(7);
        for(const id of ["socket-near","socket-far",
          "eye-orbital-undercut-near","eye-orbital-undercut-far",
          "neck-submandibular-cast","neck-cervical-turn",
          "lip-upper","oral-opening","lip-lower"]){
          await expect(svg.locator(
            '[data-km-crayon-element="'+id+'"] [data-km-crayon-feather-contacts="open-wax"]'))
            .toBeAttached();
        }
        await expect(svg.locator(
          '[data-km-crayon-element="face-outline"] [data-km-crayon-feather-contacts]'))
          .toHaveCount(0);
      }
      if(frame===299){
        for(const id of ["iris-near","iris-far","nose-alar-near",
          "nose-alar-far","naris-shadow-near","naris-shadow-far",
          "oral-opening","mouth-aperture-depth",
          "dental-surface-left","dental-surface-center","dental-surface-far",
          "labial-upper-value","labial-lower-value",
          "neck-submandibular-cast","hair-right-curtain",
          "lip-upper","lip-lower"]){
          await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
            .toBeAttached();
        }
      }
      await expect(svg.locator(
        '[data-km-crayon-element^="source-face-landmark-"]'))
        .toHaveCount(view==="anatomy"?18:0);
      await svg.screenshot({path:info.outputPath(
        "crayon-f1-cc0-source-registered-"+view+"-"+frame+".png"),
        animations:"disabled"});
    }
    if(view==="wax"){
      // Actual Chromium crops: inspect source-space curvature at the
      // cheek-root and lower locks. These are evidence, NOT art signoff.
      for(const [name,focusX,focusY] of [
        ["left",75,670],["right",513,670],
      ] as const){
        const focused={...spec,camera:[
          {frame:0,focusX,focusY,zoom:2.15},
          {frame:299,focusX,focusY,zoom:2.15},
        ]};
        const html=renderToStaticMarkup(createElement(CrayonScene,{
          spec:focused,frame:299,
        }));
        await page.setContent("<!doctype html><html><body style='margin:0'>"+
          html+"</body></html>");
        const svg=page.locator("svg[data-km-crayon-scene]");
        await expect(svg.locator('[data-km-crayon-element^="hair-rooted-"]'))
          .toHaveCount(18);
        await expect(svg.locator(
          '[data-km-crayon-element^="hair-rooted-"] [data-km-crayon-fiber-contact="dry-wax"]'))
          .toHaveCount(12);
        await expect(svg.locator(
          '[data-km-crayon-element^="lash-contact-"] [data-km-crayon-fiber-contact="dry-wax"]'))
          .toHaveCount(2);
        await svg.screenshot({path:info.outputPath(
          "crayon-f1-source-rooted-hair-"+name+"-macro-299.png"),
          animations:"disabled"});
        if(name==="right"){
          // Independent negative control: same F1 geometry, same camera,
          // same frame, but the preceding vector-smooth contour material.
          const lineSpec={...crayonCc0FaceStudy({
            view:"wax",detail:1,fiberMaterial:"line",
          }),camera:focused.camera};
          const lineHtml=renderToStaticMarkup(createElement(CrayonScene,{
            spec:lineSpec,frame:299,
          }));
          await page.setContent("<!doctype html><html><body style='margin:0'>"+
            lineHtml+"</body></html>");
          const lineSvg=page.locator("svg[data-km-crayon-scene]");
          await expect(lineSvg.locator(
            '[data-km-crayon-element^="hair-rooted-"] [data-km-crayon-fiber-contact="dry-wax"]')).toHaveCount(0);
          await expect(lineSvg.locator(
            '[data-km-crayon-element^="lash-contact-"] [data-km-crayon-fiber-contact="dry-wax"]')).toHaveCount(2);
          await lineSvg.screenshot({path:info.outputPath(
            "crayon-f1-source-rooted-hair-right-line-control-299.png"),
            animations:"disabled"});
        }
      }
    }
    if(view==="wax"){
      // Native 608×1082 F1 anatomical source coordinates; zoom is a
      // camera crop only and never changes wax geometry or source anchors.
      const anatomical={...spec,camera:[
        {frame:0,focusX:415,focusY:675,zoom:2.65},
        {frame:299,focusX:415,focusY:675,zoom:2.65},
      ]};
      for(const frame of [210,299]){
        const html=renderToStaticMarkup(createElement(CrayonScene,{
          spec:anatomical,frame,
        }));
        await page.setContent("<!doctype html><html><body style='margin:0'>"+
          html+"</body></html>");
        const svg=page.locator("svg[data-km-crayon-scene]");
        for(const id of ["nose-septal-transition","nose-tip-underlight",
          "lip-cupid-tubercles","lip-lower-core-shadow"]){
          await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
            .toBeAttached();
        }
        await svg.screenshot({path:info.outputPath(
          "crayon-f1-source-alar-mouth-macro-"+frame+".png"),
          animations:"disabled"});
      }
    }
    if(view==="wax"){
      // Immutable source-space evidence: each eye cropped independently
      // through a fixed camera at native 608×1082 resolution. Rendering
      // a source-registered path ≠ art-director approval.
      for(const item of [
        {name:"near",...CRAYON_F1_EYE_INSPECTION.near},
        {name:"far",...CRAYON_F1_EYE_INSPECTION.far},
      ] as const){
        const focused={...spec,camera:[
          {frame:0,focusX:item.focusX,focusY:item.focusY,zoom:item.zoom},
          {frame:299,focusX:item.focusX,focusY:item.focusY,zoom:item.zoom},
        ]};
        for(const frame of item.name==="near"?[210,299]:[299]){
          const html=renderToStaticMarkup(createElement(CrayonScene,{
            spec:focused,frame,
          }));
          await page.setContent("<!doctype html><html><body style='margin:0'>"+
            html+"</body></html>");
          const svg=page.locator("svg[data-km-crayon-scene]");
          for(const id of ["iris-"+item.name,"pupil-"+item.name,
            "upper-lid-"+item.name,"lash-root-"+item.name,
            "lash-contact-"+item.name,"lower-lid-"+item.name]){
            await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
              .toBeAttached();
          }
          await svg.screenshot({path:info.outputPath(
            "crayon-f1-source-"+item.name+"-eye-macro-"+frame+".png"),
            animations:"disabled"});
        }
      }
    }
    expect(exceptions).toEqual([]);
  });
}

/** Browser-native A/B proof: same documented camera, seed, timeline and
 * every original wax path; the only difference is source-side scleral shade.
 * This is a material experiment, not art approval or portrait likeness.
 */
test("F1 source sclera contact vs exact baseline at native near-eye camera",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errorMessages:string[]=[];
  page.on("pageerror",error=>errorMessages.push(error.message));
  const focus=CRAYON_F1_EYE_INSPECTION.near;
  const shots:Uint8Array[]=[];
  for(const eyeContact of ["baseline","source-shade","source-value"] as const){
    const spec=crayonCc0FaceStudy({eyeContact});
    const framed={...spec,camera:[
      {frame:0,...focus},{frame:299,...focus},
    ]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{
      spec:framed,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["sclera-near","iris-near","pupil-near",
      "upper-lid-near","lash-root-near"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
        .toBeAttached();
    }
    const shade=svg.locator(
      '[data-km-crayon-element^="sclera-outer-contact-"],'+
      '[data-km-crayon-element="sclera-inner-contact-near"]');
    await expect(svg.locator(
      '[data-km-crayon-element^="tarsal-shelf-"]')).toHaveCount(
        eyeContact==="source-value"?2:0);
    await expect(shade).toHaveCount(eyeContact==="baseline"?0:3);
    await expect(svg.locator(
      '[data-km-crayon-contact-feather-mask]')).toHaveCount(
        eyeContact==="baseline"?20:25);
    shots.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-sclera-"+eyeContact+"-near-299.png"),
      animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[1])))
    .not.toBe(0);
  expect(Buffer.compare(Buffer.from(shots[1]),Buffer.from(shots[2])))
    .not.toBe(0);
  expect(errorMessages).toEqual([]);
});

/** The exact photograph-aligned CRAYON1 midface is source-authored geometry.
 * Baseline & candidate share every eye, hair and source-landmark primitive.
 * Native screenshot presence/difference verifies the A/B, not artistic quality.
 */
test("ArtCraft F1 nasal-lip wax volume vs unmodified midface native A/B",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const images:Uint8Array[]=[];
  const focus={focusX:415,focusY:675,zoom:2.65};
  for(const midfaceForm of ["baseline","source-volume"] as const){
    const original=crayonCc0FaceStudy({
      eyeContact:"baseline",midfaceForm,
    });
    const spec={...original,camera:[
      {frame:0,...focus},{frame:299,...focus},
    ]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{
      spec,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["nasal-alar-attachment-near","naris-shadow-near",
      "naris-shadow-far","lip-upper","oral-opening",
      "mouth-aperture-depth","lip-lower","dental-surface-center"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
        .toBeAttached();
    }
    await expect(svg.locator(
      '[data-km-crayon-element="dental-arch-connected-wax"]')).toHaveCount(
        midfaceForm==="source-volume"?1:0);
    for(const id of ["lip-upper-body-wax","lip-lower-body-wax"]){
      const lip=svg.locator('[data-km-crayon-element="'+id+'"]');
      await expect(lip).toHaveCount(midfaceForm==="source-volume"?1:0);
      if(midfaceForm==="source-volume"){
        await expect(lip.locator(
          '[data-km-crayon-underpaint-gradient]')).toHaveCount(1);
      }
    }
    images.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-midface-"+midfaceForm+"-299.png"),animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(images[0]),Buffer.from(images[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** Actual-pixel ArtCraft F1 native lash root A/B. This is a source-guided
 * density experiment, not a finished professional wax eye. No raster
 * interpolation, photo filter or synthetic lashes stamped over hair.
 */
test("F1 near-eye wax lash roots sparse vs clustered 1:1 source-native Chromium",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  const focus=CRAYON_F1_EYE_INSPECTION.near;
  const captures:Uint8Array[]=[];
  for(const lashFinish of ["sparse","rooted"] as const){
    const base=crayonCc0FaceStudy({
      eyeContact:"source-shade",midfaceForm:"baseline",lashFinish,
    });
    const spec={...base,camera:[{frame:0,...focus},{frame:299,...focus}]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{
      spec,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg.locator(
      '[data-km-crayon-element^="lash-contact-"] [data-km-crayon-fiber-contact="dry-wax"]'
    )).toHaveCount(2);
    captures.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-native-near-lashes-"+lashFinish+"-299.png"
    ),animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** ArtCraft 9.1: screenshot evidence for actual jaw silhouette / neck cast.
 * The review is intentionally against the SAME frame 299 and camera.
 * This pixel difference is NOT a likeness or artistry approval gate.
 */
test("F1 source jaw-neck wax vs exact prior contour native A/B",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:312,focusY:871,zoom:2.4};
  const captures:Uint8Array[]=[];
  for(const jawNeckForm of ["baseline","source-contour"] as const){
    const original=crayonCc0FaceStudy({
      view:"wax",eyeContact:"baseline",midfaceForm:"baseline",
      lashFinish:"sparse",jawNeckForm,
    });
    const spec={...original,camera:[
      {frame:0,...focus},{frame:299,...focus},
    ]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{
      spec,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["face-outline","jaw-underside","chin-plane",
      "neck-attached","neck-submandibular-cast","neck-cervical-turn"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
        .toBeAttached();
    }
    await expect(svg.locator(
      '[data-km-crayon-element="neck-submandibular-cast"] '+
      '[data-km-crayon-feather-contacts="open-wax"]')).toHaveCount(1);
    captures.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-jaw-neck-"+jawNeckForm+"-299.png"),
      animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** ArtCraft: only source-observed brow wax changes. Native screen-space
 * geometry at 3x under exactly one camera. Screenshot difference is
 * evidence of a reversible material experiment, NOT artistic acceptance.
 */
test("F1 source-rooted eyebrow wax vs unchanged wash, actual 3x Chromium",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:265,focusY:481,zoom:3};
  const shots:Uint8Array[]=[];
  for(const browForm of ["baseline","source-rooted"] as const){
    const original=crayonCc0FaceStudy({
      view:"wax",browForm,eyeContact:"baseline",
      midfaceForm:"baseline",jawNeckForm:"baseline",
    });
    const spec={...original,camera:[{frame:0,...focus},{frame:299,...focus}]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{
      spec,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg.locator('[data-km-crayon-element="brow-superciliary-near"]'))
      .toBeAttached();
    for(const id of ["source-brow-feather-near","source-brow-wax-near",
      "source-brow-vein-near","source-brow-fibers-near","source-brow-feather-far",
      "source-brow-wax-far","source-brow-vein-far","source-brow-fibers-far"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
        .toHaveCount(browForm==="source-rooted"?1:0);
    }
    if(browForm==="source-rooted"){
      await expect(svg.locator('[data-km-crayon-element="source-brow-vein-near"] '+
        '[data-km-crayon-underpaint-gradient]')).toHaveCount(1);
      await expect(svg.locator('[data-km-crayon-element="source-brow-fibers-near"] '+
        '[data-km-crayon-fiber-contact="dry-wax"]')).toHaveCount(1);
    }
    shots.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-brow-"+browForm+"-source-299.png"),animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});


/**
 * Original F1 wax drawing experiment, exact-viewport A/B.
 * Source-value remains an unchanged negative control. The new upper tarsal
 * mass must actually show up in a native 608x1082 Chromium screenshot.
 * A screenshot is visual evidence, NEVER art-director approval.
 */
test("F1 tarsal wax sculpture near/far source-vs-previous native crop",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const side of ["near","far"] as const){
    const focus=CRAYON_F1_EYE_INSPECTION[side];
    const shots:Uint8Array[]=[];
    for(const eyeContact of ["source-value","source-sculpt"] as const){
      const old=crayonCc0FaceStudy({
        detail:1,eyeContact,lashFinish:"rooted",
        midfaceForm:"baseline",jawNeckForm:"baseline",browForm:"baseline",
      });
      const spec={...old,camera:[{frame:0,...focus},{frame:299,...focus}]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
      const newPaint=svg.locator('[data-km-crayon-element^="source-socket-turn-"],'+
        '[data-km-crayon-element^="source-tarsal-burnish-"],'+
        '[data-km-crayon-element^="source-infraorbital-wax-"]');
      await expect(newPaint).toHaveCount(eyeContact==="source-sculpt"?6:0);
      for(const id of ["iris-"+side,"pupil-"+side,"tarsal-shelf-"+side,
        "lash-root-"+side,"lash-contact-"+side]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toBeAttached();
      }
      shots.push(await svg.screenshot({path:info.outputPath(
        "crayon-f1-"+side+"-tarsal-"+eyeContact+"-299.png"),
        animations:"disabled"}));
    }
    expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[1])))
      .not.toBe(0);
  }
  // A genuine progressing draw-in is still required: no paint may pop
  // into place as a photographic overlay at the final frame.
  const midpoint=crayonCc0FaceStudy({
    eyeContact:"source-sculpt",lashFinish:"rooted",detail:1,
    midfaceForm:"baseline",browForm:"baseline",jawNeckForm:"baseline",
  });
  for(const frame of [120,210]){
    const spec={...midpoint,camera:[
      {frame:0,...CRAYON_F1_EYE_INSPECTION.near},
      {frame:299,...CRAYON_F1_EYE_INSPECTION.near},
    ]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
    await svg.screenshot({path:info.outputPath(
      "crayon-f1-near-tarsal-sculpt-"+frame+".png"),animations:"disabled"});
  }
  expect(errors).toEqual([]);
});

/**
 * Source-native v12 eyelash tip A/B (ArtCraft REJECT until actual pixels
 * inspected). Unlike generated images, this is the exact CRAYON1 SVG output
 * at the same 608×1082 paper, 299th frame and source-registered camera.
 */
test("F1 ArtCraft photographed short-rooted wax fibers near/far native A/B",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const side of ["near","far"] as const){
    const focus=CRAYON_F1_EYE_INSPECTION[side];
    const outputs:Uint8Array[]=[];
    for(const lashFinish of ["rooted","rooted-flow"] as const){
      const spec=crayonCc0FaceStudy({
        detail:1,eyeContact:"source-sculpt",
        lashFinish,midfaceForm:"baseline",browForm:"baseline",
        jawNeckForm:"baseline",
      });
      const focused={...spec,camera:[{frame:0,...focus},{frame:299,...focus}]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{
        spec:focused,frame:299,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg.locator(
        '[data-km-crayon-element="lash-contact-'+side+'"] '+
        '[data-km-crayon-fiber-contact="dry-wax"]')).toHaveCount(1);
      for(const id of ["tarsal-shelf-"+side,"source-tarsal-burnish-"+side,
        "iris-"+side,"pupil-"+side]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toBeAttached();
      }
      outputs.push(await svg.screenshot({path:info.outputPath(
        "crayon-f1-"+side+"-wax-lash-"+lashFinish+"-299.png"),
        animations:"disabled"}));
    }
    expect(Buffer.compare(Buffer.from(outputs[0]),Buffer.from(outputs[1])))
      .not.toBe(0);
  }
  expect(errors).toEqual([]);
});


/** ArtCraft nasal source volume experiment. A screenshot proves native paint
 * differences, not likeness. Genuine 608x1082 registered CC0 geometry only.
 */
test("F1 attached nasal roof native 3x source A/B, dark cavities and paper tooth",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:416,focusY:626,zoom:3};
  const images:Uint8Array[]=[];
  for(const midfaceForm of ["source-volume","source-alar"] as const){
    const original=crayonCc0FaceStudy({
      eyeContact:"source-shade",midfaceForm,lashFinish:"sparse",
    });
    const spec={...original,camera:[{frame:0,...focus},{frame:299,...focus}]};
    const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    for(const side of ["near","far"]){
      await expect(svg.locator('[data-km-crayon-element="naris-shadow-'+side+'"]'))
        .toBeAttached();
      for(const part of ["alar-roof","alar-septum"]){
        const node=svg.locator('[data-km-crayon-element="'+part+'-'+side+'"]');
        await expect(node).toHaveCount(midfaceForm==="source-alar"?1:0);
        if(midfaceForm==="source-alar"){
          await expect(node.locator(
            '[data-km-crayon-feather-contacts="open-wax"]')).toHaveCount(1);
        }
      }
    }
    images.push(await svg.screenshot({
      path:info.outputPath("crayon-f1-alar-native-"+midfaceForm+"-299.png"),
      animations:"disabled",
    }));
  }
  expect(Buffer.compare(Buffer.from(images[0]),Buffer.from(images[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});


/** Source photo F1 mouth: x351..485/y686..772. This creates exact
 * native Chromium evidence for the medium-native oral reconstruction.
 * Difference alone cannot establish source likeness or ArtCraft quality.
 */
test("F1 source-registered oral wax shape vs prior 2.65x Chromium A/B",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:417,focusY:739,zoom:2.65};
  const frames=[210,299] as const;
  for(const frame of frames){
    const captures:Uint8Array[]=[];
    for(const midfaceForm of ["source-alar","source-oral"] as const){
      const original=crayonCc0FaceStudy({
        eyeContact:"source-shade",midfaceForm,lashFinish:"sparse",
      });
      const spec={...original,camera:[
        {frame:0,...focus},{frame:299,...focus},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      for(const id of ["lip-upper-body-wax","lip-upper","oral-opening",
        "mouth-aperture-depth","dental-surface-center",
        "lip-lower-body-wax","labial-lower-value"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toBeAttached();
      }
      captures.push(await svg.screenshot({
        path:info.outputPath("crayon-f1-oral-"+midfaceForm+"-"+frame+".png"),
        animations:"disabled",
      }));
      if(frame===299&&midfaceForm==="source-oral"){
        const fullHtml=renderToStaticMarkup(createElement(CrayonScene,{
          spec:original,frame:299,
        }));
        await page.setContent("<!doctype html><html><body style='margin:0'>"+
          fullHtml+"</body></html>");
        await page.locator("svg[data-km-crayon-scene]").screenshot({
          path:info.outputPath("crayon-f1-source-oral-full-299.png"),
          animations:"disabled",
        });
      }
    }
    expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[1])))
      .not.toBe(0);
  }
  expect(errors).toEqual([]);
});

/** F1 V16 source tooth-root occlusion native Chromium: real 608x1082 CRAYON1 wax, not an uploaded-photo
 * overlay or postprocessed screenshot. Same CC0 2.65x camera and
 * paper for the two selected modes. Separate artistic approval still
 * required; screenshot difference alone is never a likeness pass.
 */
test("F1 V16 source tooth-root occlusion native Chromium",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:417,focusY:739,zoom:2.65};
  const captures:Uint8Array[]=[];
  for(const midfaceForm of ["source-oral","source-oral-sculpt"] as const){
    const original=crayonCc0FaceStudy({
      eyeContact:"source-shade",midfaceForm,lashFinish:"sparse",
    });
    const spec={...original,camera:[{frame:0,...focus},{frame:299,...focus}]};
    for(const frame of [210,260,299] as const){
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      const shelf=svg.locator(
        '[data-km-crayon-element="upper-vermilion-incisor-overhang"]');
      await expect(shelf).toHaveCount(
        midfaceForm==="source-oral-sculpt"?1:0);
      for(const tooth of ["dental-surface-left","dental-surface-center",
        "dental-surface-far"]){
        await expect(svg.locator(
          '[data-km-crayon-element="'+tooth+'"]')).toBeAttached();
      }
      const shot=await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-f1-v16-"+
          midfaceForm+"-"+frame+".png")});
      if(frame===299)captures.push(shot);
    }
    if(midfaceForm==="source-oral-sculpt"){
      const html=renderToStaticMarkup(createElement(CrayonScene,{
        spec:original,frame:299,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      await page.locator("svg[data-km-crayon-scene]").screenshot({
        animations:"disabled",
        path:info.outputPath("crayon-f1-v16-portrait-full-299.png"),
      });
    }
  }
  expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** F1 V17 source-native nasal cartilage light-to-dark continuity.
 * Same 608x1082 CC0 projection, 3x camera (416,629), same paper,
 * color, seed and pose, with exact before/after snapshots.
 * This is not a picture-quality pass until separately inspected.
 */
test("F1 V17 source-native nasal cartilage light-to-dark continuity",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:417,focusY:629,zoom:3};
  const final:Uint8Array[]=[];
  for(const midfaceForm of ["source-oral-sculpt","source-nose-sculpt"] as const){
    const original=crayonCc0FaceStudy({
      eyeContact:"source-shade",midfaceForm,lashFinish:"sparse",
    });
    const spec={...original,camera:[{frame:0,...focus},{frame:299,...focus}]};
    for(const frame of [210,299] as const){
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      for(const id of ["nose-tip","naris-shadow-near","naris-shadow-far",
        "alar-roof-near","alar-roof-far","alar-septum-near",
        "alar-septum-far"]){
        await expect(svg.locator(
          '[data-km-crayon-element="'+id+'"]')).toBeAttached();
      }
      const shot=await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-f1-v17-nose-"+midfaceForm+"-"+frame+".png")});
      if(frame===299)final.push(shot);
    }
    if(midfaceForm==="source-nose-sculpt"){
      const html=renderToStaticMarkup(createElement(CrayonScene,{
        spec:original,frame:299,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      await page.locator("svg[data-km-crayon-scene]").screenshot({
        animations:"disabled",
        path:info.outputPath("crayon-f1-v17-nose-full-299.png"),
      });
    }
  }
  expect(Buffer.compare(Buffer.from(final[0]),Buffer.from(final[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** F1 V18 physically rooted nasal wax undercoat and hood A/B.
 * Record native wax -- no photograph overlay or generic art filter.
 * Spatial and temporal evidence is necessary but does NOT pass the
 * independent source-based artistic and anatomy fidelity gates.
 */
test("F1 V18 physically rooted nasal wax undercoat and hood A/B",async({page},info)=>{
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const sourceFocus={focusX:417,focusY:629,zoom:3};
  const final:Uint8Array[]=[];
  for(const midfaceForm of ["source-nose-sculpt","source-nasal-depth"] as const){
    const original=crayonCc0FaceStudy({
      eyeContact:"source-shade",midfaceForm,lashFinish:"sparse",
    });
    const macro={...original,camera:[
      {frame:0,...sourceFocus},{frame:299,...sourceFocus},
    ]};
    for(const frame of [210,299] as const){
      const html=renderToStaticMarkup(createElement(CrayonScene,{
        spec:macro,frame,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame",String(frame));
      const ids=["nasal-sidewall-near-underpaint",
        "nasal-sidewall-far-underpaint","nasal-columella-attached-turn",
        "nasal-hood-near-occluder","nasal-hood-far-occluder",
        "nasal-hood-near-dry-contact","nasal-hood-far-dry-contact"];
      for(const id of ids){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toHaveCount(midfaceForm==="source-nasal-depth"?1:0);
      }
      for(const side of ["near","far"])
        await expect(svg.locator(
          '[data-km-crayon-element="naris-shadow-'+side+'"]'))
          .toBeAttached();
      const png=await svg.screenshot({
        animations:"disabled",
        path:info.outputPath("crayon-f1-v18-nasal-"+midfaceForm+"-"+frame+".png"),
      });
      if(frame===299)final.push(png);
    }
    const fullHtml=renderToStaticMarkup(createElement(CrayonScene,{
      spec:original,frame:299,
    }));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      fullHtml+"</body></html>");
    await page.locator("svg[data-km-crayon-scene]").screenshot({
      animations:"disabled",
      path:info.outputPath("crayon-f1-v18-full-"+midfaceForm+"-299.png"),
    });
  }
  expect(Buffer.compare(Buffer.from(final[0]),Buffer.from(final[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** V19: real source-registered 1x/3x wax screenshot artifacts.
 * Evidence of native render only, NOT ArtCraft visual release.
 */
test("F1 V20b joined near/far nasal rim browser A/B against V17/V18",async({page},info)=>{
  // 3 actors × native wax strokes and 1×/3× screenshot rasterization cost
  // more than the 60s default on slower CI. Keep two construction frames
  // for the candidate, final source-registered A/B for both controls.
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  const imgs:Uint8Array[]=[];
  for(const midfaceForm of ["source-nose-sculpt","source-nasal-depth",
    "source-contour-joined"] as const){
    const spec=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const focus of [null,{focusX:417,focusY:629,zoom:3}] as const){
      const candidate=focus?{...spec,camera:[
        {frame:0,...focus},{frame:299,...focus}]}:spec;
      const proofFrames=midfaceForm==="source-contour-joined"?
        [210,299] as const:[299] as const;
      for(const frame of proofFrames){
        const art=renderToStaticMarkup(createElement(CrayonScene,{
          spec:candidate,frame,
        }));
        await page.setContent("<!doctype html><html><body style='margin:0'>"+
          art+"</body></html>");
        const svg=page.locator("svg[data-km-crayon-scene]");
        await expect(svg).toBeVisible();
        for(const side of ["near","far"] as const){
          for(const region of ["naris-shadow","alar-roof",
            "nasal-alar-attachment"])
            await expect(svg.locator('[data-km-crayon-element="'+
              region+"-"+side+'"]')).toHaveCount(1);
        }
        const shot=await svg.screenshot({animations:"disabled",
          path:info.outputPath("crayon-f1-v19-"+(focus?"3x":"1x")+
            "-"+midfaceForm+"-"+frame+".png")});
        if(frame===299&&focus)imgs.push(shot);
      }
    }
  }
  expect(Buffer.compare(Buffer.from(imgs[0]),Buffer.from(imgs[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(imgs[1]),Buffer.from(imgs[2]))).not.toBe(0);
  expect(errors).toEqual([]);
});


/** V21 actual source-projected wax volume: screenshot presence is NOT
 * ArtCraft facial authenticity/texture/temporal approval.
 */
test("F1 V21 nasal volume native Chromium 1x/3x V20 comparison",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  const focus={focusX:417,focusY:629,zoom:3};
  const compared:Uint8Array[]=[];
  for(const midfaceForm of ["source-contour-joined","source-nasal-volume"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    const focused={...original,camera:[
      {frame:0,...focus},{frame:299,...focus},
    ]};
    for(const [zoom,spec] of [
      ["3x",focused],["1x",original],
    ] as const){
      const frame=299;
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
      for(const id of ["nose-root","nose-dorsum","nose-sidewall",
        "nose-tip","nose-alar-near","nose-alar-far",
        "nose-septal-transition","naris-shadow-near","naris-shadow-far"])
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toHaveCount(1);
      const capture=await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-f1-v21-nasal-"+zoom+"-"+midfaceForm+"-299.png")});
      if(zoom==="3x")compared.push(capture);
    }
    if(midfaceForm==="source-nasal-volume"){
      const html=renderToStaticMarkup(createElement(CrayonScene,{
        spec:focused,frame:210,
      }));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      await page.locator("svg[data-km-crayon-scene]").screenshot({
        animations:"disabled",
        path:info.outputPath("crayon-f1-v21-nasal-3x-volume-210.png"),
      });
    }
  }
  expect(Buffer.compare(Buffer.from(compared[0]),Buffer.from(compared[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** V22 exact-source 1×/3× reference A/B, native pixels not aesthetic approval. */
test("F1 V22 near/far nasal wing joined tonal wax at 1x/3x",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const imgs:Uint8Array[]=[];
  for(const midfaceForm of ["source-nasal-volume","source-nasal-value"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:417,focusY:629,zoom:3},
        {frame:299,focusX:417,focusY:629,zoom:3},
      ]};
      const art=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        art+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["nose-sidewall","nose-subalar-contact","nose-alar-near",
        "nose-alar-far","naris-shadow-near","naris-shadow-far"])
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toHaveCount(1);
      imgs.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v22-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(imgs[0]),Buffer.from(imgs[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(imgs[1]),Buffer.from(imgs[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** V23 real source-aligned A/B raster proof; not an aesthetic release gate. */
test("F1 V23 CC0 near/far cavity/roof topology 1x 3x at f299",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const png:Uint8Array[]=[];
  for(const midfaceForm of ["source-nasal-value","source-naris-occlusion"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:417,focusY:629,zoom:3},
        {frame:299,focusX:417,focusY:629,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["naris-shadow-near","naris-shadow-far",
        "alar-roof-near","alar-roof-far","nose-subalar-contact"])
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toHaveCount(1);
      png.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v23-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(png[0]),Buffer.from(png[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(png[1]),Buffer.from(png[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** ArtCraft V24 source-registered 1×/3× physical pigment A/B vs V23.
 * This creates evidence for visual REJECTION, not automatic approval.
 */
test("F1 V24 CC0 nasal light planes, source native 1x and 3x f299",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const png:Uint8Array[]=[];
  for(const midfaceForm of ["source-naris-occlusion","source-nasal-relief"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:417,focusY:629,zoom:3},
        {frame:299,focusX:417,focusY:629,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["nose-tip","nose-dorsum","nose-sidewall-form",
        "nose-septal-transition","naris-shadow-near","naris-shadow-far"])
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toHaveCount(1);
      png.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v24-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(png[0]),Buffer.from(png[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(png[1]),Buffer.from(png[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

test("F1 V25 source native solid volume 1x and 3x f299",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const png:Uint8Array[]=[];const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const midfaceForm of ["source-nasal-relief","source-solid-relief"] as const){
    const base=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?base:{...base,camera:[
        {frame:0,focusX:417,focusY:629,zoom:3},
        {frame:299,focusX:417,focusY:629,zoom:3}]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["nose-tip","nose-dorsum","nose-sidewall-form",
        "nose-septal-transition","naris-shadow-near","naris-shadow-far"])
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
          .toHaveCount(1);
      png.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v25-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(png[0]),Buffer.from(png[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(png[1]),Buffer.from(png[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** Native V26 optical A/B for source core and 1x/3x shape sign-off.
 * Does not mark art accepted; source reference cannot be embedded as texture.
 */
test("F1 V26 late cavity wax 608x1082 native A/B at 1x and 3x",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const renders:Uint8Array[]=[];
  for(const midfaceForm of ["source-solid-relief","source-carved-naris"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:417,focusY:629,zoom:3},
        {frame:299,focusX:417,focusY:629,zoom:3},
      ]};
      const markup=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        markup+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["naris-shadow-near","naris-shadow-far","alar-roof-near","alar-roof-far"])
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      const order=await svg.locator('[data-km-crayon-element^="naris-shadow-"],[data-km-crayon-element^="alar-roof-"]')
        .evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-km-crayon-element")));
      if(midfaceForm==="source-carved-naris")
        for(const side of ["near","far"] as const)
          expect(order.indexOf("alar-roof-"+side)).toBeLessThan(
            order.indexOf("naris-shadow-"+side));
      renders.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v26-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(renders[0]),Buffer.from(renders[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(renders[1]),Buffer.from(renders[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** Source-registered V27: identical native f299 1x/3x negative control A/B. */
test("F1 V27 connected alar wax softness at 1x and 3x f299",async({page},info)=>{
 test.setTimeout(120_000);
 await page.setViewportSize({width:608,height:1082});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 const result:Uint8Array[]=[];
 for(const midfaceForm of ["source-carved-naris","source-fused-naris"] as const){
   const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
   for(const zoom of [1,3] as const){
     const spec=zoom===1?original:{...original,camera:[
       {frame:0,focusX:417,focusY:629,zoom:3},
       {frame:299,focusX:417,focusY:629,zoom:3},
     ]};
     const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
     await page.setContent("<!doctype html><html><body style='margin:0'>"+
       html+"</body></html>");
     const svg=page.locator("svg[data-km-crayon-scene]");
     await expect(svg).toBeVisible();
     for(const id of ["alar-roof-near","alar-roof-far",
       "naris-shadow-near","naris-shadow-far"])
       await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
         .toHaveCount(1);
     result.push(await svg.screenshot({animations:"disabled",
       path:info.outputPath("crayon-v27-"+zoom+"x-"+midfaceForm+"-299.png")}));
   }
 }
 expect(Buffer.compare(Buffer.from(result[0]),Buffer.from(result[2]))).not.toBe(0);
 expect(Buffer.compare(Buffer.from(result[1]),Buffer.from(result[3]))).not.toBe(0);
 expect(errors).toEqual([]);
});

/** Photographed source facial five-zone values; genuine native 1×/3× A/B.
 * Technical screenshot capture is never ArtCraft artistic acceptance.
 */
test("F1 V28 source facial value atlas at 1x and 3x f299",async({page},info)=>{
 test.setTimeout(120_000);
 await page.setViewportSize({width:608,height:1082});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 const result:Uint8Array[]=[];
 for(const midfaceForm of ["source-fused-naris","source-face-values"] as const){
   const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
   for(const zoom of [1,3] as const){
     const spec=zoom===1?original:{...original,camera:[
       {frame:0,focusX:300,focusY:610,zoom:3},
       {frame:299,focusX:300,focusY:610,zoom:3},
     ]};
     const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
     await page.setContent("<!doctype html><html><body style='margin:0'>"+
       html+"</body></html>");
     const svg=page.locator("svg[data-km-crayon-scene]");
     await expect(svg).toBeVisible();
     for(const id of ["cheek-malar-cast","cheek-malar-bounce","cheek-far",
       "socket-near","socket-far"])
       await expect(svg.locator('[data-km-crayon-element="'+id+'"]'))
         .toHaveCount(1);
     result.push(await svg.screenshot({animations:"disabled",
       path:info.outputPath("crayon-v28-"+zoom+"x-"+midfaceForm+"-299.png")}));
   }
 }
 expect(Buffer.compare(Buffer.from(result[0]),Buffer.from(result[2]))).not.toBe(0);
 expect(Buffer.compare(Buffer.from(result[1]),Buffer.from(result[3]))).not.toBe(0);
 expect(errors).toEqual([]);
});

/** V29 ArtCraft corrective macro brow topology vs V28. Screenshot evidence only. */
test("F1 V29 real orbital hood vs V28 at source 1x and 3x f299",async({page},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const renders:Uint8Array[]=[];
  for(const midfaceForm of ["source-face-values","source-orbital-hood"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:315,focusY:515,zoom:3},
        {frame:299,focusX:315,focusY:515,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["socket-near","socket-far","sclera-near","sclera-far",
        "upper-lid-near","upper-lid-far","cheek-malar-cast","naris-shadow-near"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      renders.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v29-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(renders[0]),Buffer.from(renders[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(renders[1]),Buffer.from(renders[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** V30 source photo-calibrated three-quarter cheek/jaw: native evidence,
 * not an ArtCraft likeness certificate. Preserve both source identities.
 */
test("F1 V30 photographed mandibular silhouette vs V29 at 1x and 2.4x",async({page},info)=>{
  test.setTimeout(140_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",err=>errors.push(err.message));
  const images:Uint8Array[]=[];
  for(const midfaceForm of ["source-orbital-hood","source-mandibular-turn"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,2.4] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:300,focusY:761,zoom:2.4},
        {frame:299,focusX:300,focusY:761,zoom:2.4},
      ]};
      const markup=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        markup+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","jaw-underside","chin-plane",
        "cheek-malar-cast","cheek-malar-bounce","socket-near","socket-far",
        "naris-shadow-near","naris-shadow-far","lip-lower"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      const img=await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v30-"+zoom+"x-"+midfaceForm+"-299.png")});
      images.push(img);
    }
  }
  expect(Buffer.compare(Buffer.from(images[0]),Buffer.from(images[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(images[1]),Buffer.from(images[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** F1 V31 ANAT1 468-vertex face projected onto independent photographed
 * source observations. Proof is original native wax pixels, not approval.
 */
test("F1 V31 ANAT1 registered 3D cheek vs V30 at 1x and 3x f299",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  const screenshots:Uint8Array[]=[];
  for(const midfaceForm of ["source-mandibular-turn","source-anat1-malar"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:196,focusY:647,zoom:3},
        {frame:299,focusX:196,focusY:647,zoom:3},
      ]};
      const markup=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        markup+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","cheek-malar-bounce","cheek-malar-cast",
        "socket-near","socket-far","naris-shadow-near","jaw-underside"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      screenshots.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v31-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(screenshots[0]),Buffer.from(screenshots[2])))
    .not.toBe(0);
  expect(Buffer.compare(Buffer.from(screenshots[1]),Buffer.from(screenshots[3])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** V32 exact 608×1082 native CRAYON1 original photo camera A/B.
 * ANAT1 is anatomical geometry, not a substitute for source visual approval.
 */
test("F1 V32 ANAT1 zygoma-to-alar native 1x/3x vs V31 at f299",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  const shots:Uint8Array[]=[];
  for(const midfaceForm of ["source-anat1-malar","source-anat1-midface-bridge"] as const){
    const native=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?native:{...native,camera:[
        {frame:0,focusX:300,focusY:612,zoom:3},
        {frame:299,focusX:300,focusY:612,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","malar-cheek-near","cheek-malar-bounce",
        "nose-sidewall","nose-root","nose-tip","socket-near","socket-far",
        "jaw-underside","chin-plane"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      shots.push(await svg.screenshot({animations:"disabled",path:info.outputPath(
        "crayon-v32-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(shots[1]),Buffer.from(shots[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** ArtCraft F1 V33 ANAT1 nasal bone-to-bulb real native browser evidence.
 * The 468-point 3D framework guides original-source projection only;
 * this is NOT an independently approved face or a photo raster effect.
 */
test("F1 V33 ANAT1 photographed nasal volume 1x/3x vs V32 at f299",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const captures:Uint8Array[]=[];
  for(const midfaceForm of ["source-anat1-midface-bridge",
    "source-anat1-nasal-volume"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:403,focusY:581,zoom:3},
        {frame:299,focusX:403,focusY:581,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","nose-root","nose-dorsum","nose-sidewall-form",
        "nose-tip","nose-tip-reflected-light","naris-shadow-near","naris-shadow-far",
        "socket-near","socket-far","lip-lower","chin-plane"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      captures.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v33-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[2])))
    .not.toBe(0);
  expect(Buffer.compare(Buffer.from(captures[1]),Buffer.from(captures[3])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** Spot-check three native film exposures as a temporal negative control.
 * A full 300-frame artist review remains an independent release blocker.
 */
test("F1 V33 ANAT1 native nose preserves 300-frame scene exposures",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const scene=crayonCc0FaceStudy({detail:.35,midfaceForm:"source-anat1-nasal-volume",
    eyeContact:"source-shade"});
  expect(scene.durationFrames).toBe(300);
  const pngs:Uint8Array[]=[];
  for(const frame of [0,149,299] as const){
    const html=renderToStaticMarkup(createElement(CrayonScene,{spec:scene,frame}));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["face-outline","nose-dorsum","nose-tip","naris-shadow-near"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    }
    pngs.push(await svg.screenshot({animations:"disabled",
      path:info.outputPath("crayon-v33-film-native-"+frame+".png")}));
  }
  expect(Buffer.compare(Buffer.from(pngs[0]),Buffer.from(pngs[2]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** F1 V34 rejected V33's nasal-bridge regression. This independently
 * compares the ANAT1 camera's PHOTO-FITTED native dark cavity/overhang
 * to the original positive-control V32. Green CI != artist approval.
 */
test("F1 V34 ANAT1 continuous attached alar rims source 1x/3x vs V32",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const shots:Uint8Array[]=[];
  for(const midfaceForm of ["source-anat1-midface-bridge",
    "source-anat1-alar-recess"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:416,focusY:635,zoom:3},
        {frame:299,focusX:416,focusY:635,zoom:3},
      ]};
      const markup=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+markup+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","alar-roof-near","naris-shadow-near",
        "alar-roof-far","naris-shadow-far","nose-root","nose-tip",
        "nose-dorsum","socket-near","socket-far","chin-plane"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      shots.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v34-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(shots[1]),Buffer.from(shots[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** V35 source-photo 608×1082 camera vs V32 original native wax, at 1× and
 * 3× with identical source-relative framing. No separate raster/color
 * photo template, no manufactured "art approval" based on browser success.
 */
test("F1 V35 ANAT1 continuous orbital malar five-value field source 1x/3x vs V32",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const captures:Uint8Array[]=[];
  for(const midfaceForm of ["source-anat1-midface-bridge",
    "source-anat1-orbit-malar"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:305,focusY:581,zoom:3},
        {frame:299,focusX:305,focusY:581,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","socket-near","socket-far",
        "malar-cheek-near","cheek-malar-cast","cheek-malar-bounce",
        "nose-root","nose-dorsum","naris-shadow-near","naris-shadow-far",
        "iris-near","iris-far","lip-lower","chin-plane"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      captures.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v35-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[2])))
    .not.toBe(0);
  expect(Buffer.compare(Buffer.from(captures[1]),Buffer.from(captures[3])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});

/** Three temporally different native camera exposures provide a minimal
 * gross-pop baseline. Full natural-speed 300-frame review remains OPEN. */
test("F1 V35 ANAT1 facial value mass native three film exposures",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const scene=crayonCc0FaceStudy({detail:.28,eyeContact:"source-shade",
    midfaceForm:"source-anat1-orbit-malar"});
  const frames:Uint8Array[]=[];
  expect(scene.durationFrames).toBe(300);
  for(const frame of [0,149,299] as const){
    const markup=renderToStaticMarkup(createElement(CrayonScene,{spec:scene,frame}));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+markup+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["face-outline","socket-near","socket-far",
      "malar-cheek-near","nose-root"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    }
    frames.push(await svg.screenshot({animations:"disabled",
      path:info.outputPath("crayon-v35-native-film-"+frame+".png")}));
  }
  expect(Buffer.compare(Buffer.from(frames[0]),Buffer.from(frames[2]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** V36 native shape/value A/B: real Chromium pixels, fixed original photo
 * 608×1082 camera and SOURCE sclera/iris values. Passing browser/Typescript
 * is not equivalent to original identity or independent artist approval.
 */
test("F1 V36 ANAT1 near eye actual photographed tarsal source 1x/3x vs V35",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const captures:Uint8Array[]=[];
  for(const midfaceForm of ["source-anat1-orbit-malar",
    "source-anat1-near-eye"] as const){
    const original=crayonCc0FaceStudy({midfaceForm,eyeContact:"source-shade"});
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:269,focusY:550,zoom:3},
        {frame:299,focusX:269,focusY:550,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","sclera-near","sclera-inner-contact-near","iris-near","pupil-near",
        "upper-lid-near","lash-root-near","lower-lid-near","lower-lid-margin-near",
        "upper-lid-crease-near","socket-near","socket-far","sclera-far",
        "iris-far","naris-shadow-near","lip-lower","hair-left-curtain"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      captures.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v36-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(captures[0]),Buffer.from(captures[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(captures[1]),Buffer.from(captures[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

test("F1 V36 ANAT1 near-eye wax preserves full 300-frame native scene contract",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const scene=crayonCc0FaceStudy({detail:.2,eyeContact:"source-shade",
    midfaceForm:"source-anat1-near-eye"});
  expect(scene.durationFrames).toBe(300);
  const frames:Uint8Array[]=[];
  for(const frame of [0,149,299] as const){
    const html=renderToStaticMarkup(createElement(CrayonScene,{spec:scene,frame}));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["face-outline","sclera-near","iris-near","upper-lid-near"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    }
    frames.push(await svg.screenshot({animations:"disabled",
      path:info.outputPath("crayon-v36-native-film-"+frame+".png")}));
  }
  expect(Buffer.compare(Buffer.from(frames[0]),Buffer.from(frames[2]))).not.toBe(0);
  expect(errors).toEqual([]);
});

/** ArtCraft F1 V37 actual source-photo eyebrow root comparison.
 * Native browser screenshots of the unchanged V36 and the proposed V37
 * original-sitter near-brow, no embedded source pixels or raster overlay.
 */
test("F1 V37 ANAT1 photographed brow mass and 165 wax follicles source 1x/3x vs V36",async({page},info)=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const shots:Uint8Array[]=[];
  for(const midfaceForm of ["source-anat1-near-eye",
    "source-anat1-brow-follicles"] as const){
    const original=crayonCc0FaceStudy({
      midfaceForm,eyeContact:"source-shade",browForm:"baseline",
    });
    for(const zoom of [1,3] as const){
      const spec=zoom===1?original:{...original,camera:[
        {frame:0,focusX:264,focusY:483,zoom:3},
        {frame:299,focusX:264,focusY:483,zoom:3},
      ]};
      const html=renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}));
      await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      for(const id of ["face-outline","brow-superciliary-near","socket-near",
        "sclera-near","sclera-inner-contact-near","iris-near","pupil-near",
        "lash-root-near","lower-lid-near","nose-dorsum","malar-cheek-near",
        "hair-left-curtain","hair-right-curtain"]){
        await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
      }
      if(midfaceForm==="source-anat1-brow-follicles"){
        for(const id of ["source-brow-feather-near","source-brow-wax-near",
          "source-brow-vein-near","source-brow-fibers-near",
          "source-brow-follicles-near","source-brow-flyaways-near",
          "source-brow-fibers-far"]){
          await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
        }
      }
      shots.push(await svg.screenshot({animations:"disabled",
        path:info.outputPath("crayon-v37-"+zoom+"x-"+midfaceForm+"-299.png")}));
    }
  }
  expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[2]))).not.toBe(0);
  expect(Buffer.compare(Buffer.from(shots[1]),Buffer.from(shots[3]))).not.toBe(0);
  expect(errors).toEqual([]);
});

test("F1 V37 ANAT1 source-follicle brow original native 300-frame wax film",async({page},info)=>{
  test.setTimeout(150_000);
  await page.setViewportSize({width:608,height:1082});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const scene=crayonCc0FaceStudy({detail:.2,eyeContact:"source-shade",
    midfaceForm:"source-anat1-brow-follicles"});
  expect(scene.durationFrames).toBe(300);
  const frames:Uint8Array[]=[];
  for(const frame of [0,149,299] as const){
    const html=renderToStaticMarkup(createElement(CrayonScene,{spec:scene,frame}));
    await page.setContent("<!doctype html><html><body style='margin:0'>"+html+"</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    for(const id of ["face-outline","source-brow-wax-near","source-brow-fibers-near",
      "source-brow-follicles-near","sclera-near"]){
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    }
    frames.push(await svg.screenshot({animations:"disabled",
      path:info.outputPath("crayon-v37-native-film-"+frame+".png")}));
  }
  expect(Buffer.compare(Buffer.from(frames[0]),Buffer.from(frames[2]))).not.toBe(0);
  expect(errors).toEqual([]);
});
