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
          '[data-km-crayon-opaque-burnish]')).toHaveCount(8);
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
  for(const eyeContact of ["baseline","source-shade"] as const){
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
    await expect(shade).toHaveCount(eyeContact==="source-shade"?3:0);
    await expect(svg.locator(
      '[data-km-crayon-contact-feather-mask]')).toHaveCount(
        eyeContact==="source-shade"?25:20);
    shots.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-sclera-"+eyeContact+"-near-299.png"),
      animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(shots[0]),Buffer.from(shots[1])))
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
    images.push(await svg.screenshot({path:info.outputPath(
      "crayon-f1-midface-"+midfaceForm+"-299.png"),animations:"disabled"}));
  }
  expect(Buffer.compare(Buffer.from(images[0]),Buffer.from(images[1])))
    .not.toBe(0);
  expect(errors).toEqual([]);
});
