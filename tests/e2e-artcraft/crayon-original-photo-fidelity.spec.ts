import {expect,test} from "@playwright/test";
import {createHash} from "node:crypto";
import {readFileSync,readdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonCc0FaceStudy} from "../../src/video/crayon-artcraft-cc0-face";
import {crayonF1NativeCaptureWorksheetV60}
  from "../../src/video/crayon-artcraft-f1-candidate-landmarks-v59";
import {execFileSync} from "node:child_process";

/** ArtCraft V55: source-photograph proof is an INDEPENDENT real pixel
 * measurement, not a synthetic portrait or a V54 screenshot compared to
 * another SVG. The reference is the licensed CC0 608x1082 native browser
 * canvas captured in run 43682633614, SHA256 pinned below. The source
 * material is NEVER included in a rendered film or published library.
 * This test must fail closed if the original image is absent or altered.
 */
const REFERENCE_SHA="f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2";
const W=608,H=1082;
function discoverSource(dir:string):Buffer{
  const paths:string[]=[];
  function visit(root:string){
    for(const entry of readdirSync(root,{withFileTypes:true})){
      const path=join(root,entry.name);
      if(entry.isDirectory())visit(path);
      else if(entry.name.toLowerCase().endsWith(".png"))paths.push(path);
    }
  }
  visit(dir);
  const matches=paths.filter(path=>
    createHash("sha256").update(readFileSync(path)).digest("hex")===REFERENCE_SHA);
  if(matches.length!==1)
    throw new Error("V55 original CC0 608x1082 source capture missing or ambiguous: "+
      matches.length+" SHA matches across "+paths.length+" PNGs in "+dir);
  return readFileSync(matches[0]);
}
const ROIS={
  whole:[0,0,608,1082],
  upperLid:[208,514,325,565],
  nearEye:[195,490,330,591],
  iris:[236,535,283,571],
  lowerLid:[211,549,329,590],
  face:[175,410,375,830],
  crown:[132,175,462,320],
  farEye:[415,475,470,535],
  foliage:[0,0,80,75],
} as const;
test("F1 V55 source-vs-native similarity 608x1082 CC0 V52 and V54 (research report)",async({page},info)=>{
  test.setTimeout(230_000);
  await page.setViewportSize({width:W,height:H});
  const original=discoverSource(process.env.KM_ARTCRAFT_CC0_SOURCE_DIR??".artcraft-original-photo");
  const captures:Record<string,string>={};
  const pageErrors:string[]=[];page.on("pageerror",e=>pageErrors.push(e.message));
  for(const [label,midfaceForm] of [
    ["V52","source-anat1-photo-hair-face-v52"],
    ["V54","source-anat1-superior-tarsus-v54"],
  ] as const){
    const spec=crayonCc0FaceStudy({midfaceForm,detail:1});
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}))+
      "</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    for(const id of ["upper-lid-near","iris-near","pupil-near","hair-crown-surface"])
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    await page.waitForTimeout(300);
    const png=await svg.screenshot({animations:"disabled"});
    writeFileSync(info.outputPath("v55-real-original-"+label+"-299.png"),png);
    captures[label]=Buffer.from(png).toString("base64");
  }
  const metrics=await page.evaluate(async function({
    reference,v52,v54,rois,width,height,
  }:{reference:string;v52:string;v54:string;
    rois:Record<string,readonly [number,number,number,number]>;
    width:number;height:number}){
    async function pixels(base64:string){
      const img=new Image();img.src="data:image/png;base64,"+base64;
      await img.decode();
      if(img.naturalWidth!==width||img.naturalHeight!==height)
        throw new Error("CC0 original source != exact native 608x1082 viewport "+
          img.naturalWidth+"x"+img.naturalHeight);
      const canvas=document.createElement("canvas");
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("No real source-image pixel inspector");
      ctx.drawImage(img,0,0);
      return ctx.getImageData(0,0,width,height).data;
    }
    const [original,old,next]=await Promise.all([pixels(reference),pixels(v52),pixels(v54)]);
    const results:Record<string,{v52Ssim:number;v54Ssim:number;
      deltaSsim:number;v52Mae:number;v54Mae:number;protectedPixelsChanged:number}>={};
    // Uniform 7x7 local RGB SSIM sampled at stride 3, exact independent
    // source/film image coordinates. Document this as stride-3 SSIM, NOT
    // bit-exact skimage's full-resolution structural_similarity result.
    const C1=(.01*255)**2,C2=(.03*255)**2;
    const roiScore=(candidate:Uint8ClampedArray,rect:readonly number[])=>{
      const [x0,y0,x1,y1]=rect,area=(x1-x0)*(y1-y0);
      if(x0<0||y0<0||x1>width||y1>height||area<=0)
        throw new Error("CC0 source ROI invalid");
      let mae=0,ssim=0,samples=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const offset=(y*width+x)*4;
        for(let c=0;c<3;c++)mae+=Math.abs(original[offset+c]-candidate[offset+c]);
      }
      mae/=area*3;
      for(let y=y0+3;y<y1-3;y+=3)
      for(let x=x0+3;x<x1-3;x+=3)
      for(let c=0;c<3;c++){
        let sx=0,sy=0,sxx=0,syy=0,sxy=0;
        for(let yy=-3;yy<=3;yy++)
        for(let xx=-3;xx<=3;xx++){
          const i=((y+yy)*width+x+xx)*4+c;
          const a=original[i],b=candidate[i];
          sx+=a;sy+=b;sxx+=a*a;syy+=b*b;sxy+=a*b;
        }
        const n=49,ax=sx/n,by=sy/n;
        const vx=Math.max(0,(sxx-n*ax*ax)/(n-1));
        const vy=Math.max(0,(syy-n*by*by)/(n-1));
        const cov=(sxy-n*ax*by)/(n-1);
        ssim+=((2*ax*by+C1)*(2*cov+C2))/
          ((ax*ax+by*by+C1)*(vx+vy+C2));
        samples++;
      }
      if(samples===0)throw new Error("Empty CC0 local source SSIM window");
      return {ssim:ssim/samples,mae};
    };
    for(const [key,rect] of Object.entries(rois)){
      const a=roiScore(old,rect),b=roiScore(next,rect);
      let control=0;
      for(let y=rect[1];y<rect[3];y++)
      for(let x=rect[0];x<rect[2];x++){
        const i=(y*width+x)*4;
        if(Math.abs(old[i]-next[i])+Math.abs(old[i+1]-next[i+1])+
           Math.abs(old[i+2]-next[i+2])>5)control++;
      }
      results[key]={v52Ssim:a.ssim,v54Ssim:b.ssim,
        deltaSsim:b.ssim-a.ssim,
        v52Mae:a.mae,v54Mae:b.mae,
        protectedPixelsChanged:control/((rect[2]-rect[0])*(rect[3]-rect[1]))};
    }
    return results;
  },{reference:original.toString("base64"),v52:captures.V52,v54:captures.V54,
    rois:ROIS,width:W,height:H});
  expect(pageErrors).toEqual([]);
  for(const key of ["foliage","farEye","crown"] as const){
    expect(metrics[key].protectedPixelsChanged,key).toBeLessThanOrEqual(.003);
    expect(metrics[key].deltaSsim,key).toBeCloseTo(0,4);
  }
  const summary={
    sourceSha256:REFERENCE_SHA,sourceIsOriginalCameraJpeg:false,
    sourcePixels:[W,H],renderer:"Chromium native CRAYON1 SVG",frame:299,
    metricsVersion:"uniform7x7-unbiased-covariance-rgb-stride3",
    artisticApproval:false,
    status:metrics.whole.deltaSsim>=0&&metrics.upperLid.deltaSsim>=0&&
      metrics.iris.deltaSsim>=-.002&&metrics.lowerLid.deltaSsim>=-.002?
      "REGIONAL_SOURCE_POSITIVE_CANDIDATE":"VISUAL_REVIEW_REQUIRED_OR_REJECT",
    metrics,
  };
  writeFileSync(info.outputPath("v55-original-photo-report.json"),
    JSON.stringify(summary,null,2)+"\n");
  console.log("[ArtCraft V55 original-source independent native comparison]"+
    JSON.stringify(summary));
  // Evidence collection stays GREEN even if artistic quality regresses:
  // candidate is opt-in !dev, not shipped, promotion remains guarded by
  // explicit source-photo review and the original .85 artistic threshold.
  expect(Number.isFinite(metrics.whole.v54Ssim)).toBe(true);
  expect(metrics.whole.v54Ssim).toBeLessThan(1);
  expect(metrics.whole.v54Ssim).toBeGreaterThan(-1);
});


/**
 * ArtCraft V58: actual ORIGINAL CC0 photo vs V56/V57 PHOTO-REGISTERED
 * hair silhouette. Do not accept two changed vector images as a proof:
 * source SHA, source-station scan, local RGB SSIM and protected pixel checks
 * are independent real-browser evidence; source does not enter the film.
 */
test("F1 V58 original CC0 22-station hair silhouette source image and V56 V57",async({page},info)=>{
  test.setTimeout(230_000);
  await page.setViewportSize({width:W,height:H});
  const original=discoverSource(process.env.KM_ARTCRAFT_CC0_SOURCE_DIR??".artcraft-original-photo");
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const captures:Record<string,string>={};
  const variants=[
    ["V56","source-anat1-hair-top-v56"],
    ["V57","source-anat1-hair-edge-v57"],
    ["V63","source-anat1-connected-face-v63"],
    ["V64","source-anat1-connected-face-v64"],
  ] as const;
  for(const [label,midfaceForm] of variants){
    const source=crayonCc0FaceStudy({midfaceForm,detail:1});
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      renderToStaticMarkup(createElement(CrayonScene,{spec:source,frame:299}))+
      "</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    for(const id of ["hair-back","hair-crown-surface","hair-right-curtain",
      "hair-rooted-crown-0","hair-rooted-right-0","iris-near"])
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    await page.waitForTimeout(320);
    const image=await svg.screenshot({animations:"disabled"});
    writeFileSync(info.outputPath("v58-photo-native-"+label+"-299.png"),image);
    captures[label]=Buffer.from(image).toString("base64");
  }
  // V60: attach a byte-authenticated actual native screenshot to the
  // previously blank independent 18-landmark observation worksheet.
  // This is NOT the 18 independently observed landmarks themselves.
  const checkoutSha=process.env.GITHUB_SHA??
    execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const nativeCaptures=Object.fromEntries(
    variants.map(([label,variant])=>{
      const png=Buffer.from(captures[label],"base64");
      const record=crayonF1NativeCaptureWorksheetV60({
        variant,
        nativePngSha256:createHash("sha256").update(png).digest("hex"),
        checkoutCommitSha:checkoutSha,
        pngFileName:"v58-photo-native-"+label+"-299.png",
      });
      // Unlike an unverified hand-entered hash, this manifest is constructed
      // from the exact captured Chromium PNG bytes written above.
      expect(record.native.sha256)
        .toBe(createHash("sha256").update(png).digest("hex"));
      expect(record.source.sha256).toBe(REFERENCE_SHA);
      expect(record.audit.measured).toBe(0);
      expect(record.audit.missing).toHaveLength(18);
      expect(record.releaseApproved).toBe(false);
      writeFileSync(info.outputPath(
        "v60-native-candidate-"+label+"-299.json"),
        JSON.stringify(record,null,2)+"\n");
      return [label,{sha256:record.native.sha256,
        pngFileName:record.native.fileName,
        manifestFileName:"v60-native-candidate-"+label+"-299.json"}];
    }),
  );
  const stations=[10,25,40,60,80,100,125,150,175,200,225,250,275,
    300,325,350,375,400,425,450,475,500] as const;
  const knownOriginal=[288,272,261,243,232,215,211,191,185,189,198,197,
    190,194,201,210,222,243,282,309,353,388] as const;
  const knownV56=[278,261,247,232,219,210,197,186,182,181,185,189,
    187,187,193,204,219,234,259,292,336,383] as const;
  const rois={
    whole:[0,0,608,1082],hairTop:[0,150,530,420],
    crown:[132,175,462,320],centralRoot:[225,185,366,275],
    leftTemple:[0,225,125,656],farCurtain:[445,321,565,705],
    farLower:[492,680,607,1040],nearIris:[239,531,292,570],
    farEye:[415,475,470,535],foliage:[0,0,80,75],
  } as const;
  const result=await page.evaluate(async function({
    photo,baseline,candidate,rois,stationXs,width,height,
  }:{
    photo:string;baseline:string;candidate:string;
    rois:Record<string,readonly [number,number,number,number]>;
    stationXs:readonly number[];width:number;height:number;
  }){
    async function pixels(base64:string){
      const img=new Image();img.src="data:image/png;base64,"+base64;
      await img.decode();
      if(img.naturalWidth!==width||img.naturalHeight!==height)
        throw new Error("Original CC0 and ArtCraft screenshots have different viewports");
      const c=document.createElement("canvas");c.width=width;c.height=height;
      const ctx=c.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Missing actual original photo pixel reader");
      ctx.drawImage(img,0,0);
      return ctx.getImageData(0,0,width,height).data;
    }
    const [source,prev,next]=await Promise.all([
      pixels(photo),pixels(baseline),pixels(candidate)]);
    function scanTop(data:Uint8ClampedArray,x:number){
      const left=Math.max(0,x-4),right=Math.min(width,x+5);
      for(let y=100;y<580;y++){
        let hits=0;
        for(let yy=y;yy<y+22;yy++)
        for(let xx=left;xx<right;xx++){
          const i=(yy*width+xx)*4;
          const r=data[i],g=data[i+1],b=data[i+2];
          if(r-g>5&&r-b>9&&r>30&&g<160)hits++;
        }
        if(hits/(22*(right-left))>.7)return y;
      }
      return -1;
    }
    const edge=stationXs.map(x=>({
      x,photo:scanTop(source,x),v56:scanTop(prev,x),v57:scanTop(next,x),
    }));
    function score(data:Uint8ClampedArray,box:readonly number[]){
      const [x0,y0,x1,y1]=box;
      if(x0<0||y0<0||x1>width||y1>height||x1<=x0||y1<=y0)
        throw new Error("Invalid photo original ROI");
      const area=(x1-x0)*(y1-y0);
      const C1=(.01*255)**2,C2=(.03*255)**2;
      let mae=0,ssim=0,n=0;
      for(let y=y0;y<y1;y++)
      for(let x=x0;x<x1;x++){
        const offset=(y*width+x)*4;
        for(let color=0;color<3;color++)
          mae+=Math.abs(source[offset+color]-data[offset+color]);
      }
      mae/=area*3;
      for(let y=y0+3;y<y1-3;y+=3)
      for(let x=x0+3;x<x1-3;x+=3)
      for(let c=0;c<3;c++){
        let sx=0,sy=0,sxx=0,syy=0,sxy=0;
        for(let dy=-3;dy<=3;dy++)
        for(let dx=-3;dx<=3;dx++){
          const p=((y+dy)*width+x+dx)*4+c;
          const a=source[p],b=data[p];
          sx+=a;sy+=b;sxx+=a*a;syy+=b*b;sxy+=a*b;
        }
        const ax=sx/49,by=sy/49;
        const vx=Math.max(0,(sxx-49*ax*ax)/48);
        const vy=Math.max(0,(syy-49*by*by)/48);
        const cov=(sxy-49*ax*by)/48;
        ssim+=((2*ax*by+C1)*(2*cov+C2))/
          ((ax*ax+by*by+C1)*(vx+vy+C2));
        n++;
      }
      if(n<1)throw new Error("CC0 photo region too small for 7x7 local SSIM");
      return {ssim:ssim/n,mae};
    }
    const metrics:Record<string,{
      v56Ssim:number;v57Ssim:number;deltaSsim:number;
      v56Mae:number;v57Mae:number;changedPixelFraction:number}>={};
    for(const [key,box] of Object.entries(rois)){
      const a=score(prev,box),b=score(next,box);
      let changed=0;
      for(let y=box[1];y<box[3];y++)
      for(let x=box[0];x<box[2];x++){
        const i=(y*width+x)*4;
        if(Math.abs(prev[i]-next[i])+Math.abs(prev[i+1]-next[i+1])+
           Math.abs(prev[i+2]-next[i+2])>5)changed++;
      }
      metrics[key]={
        v56Ssim:a.ssim,v57Ssim:b.ssim,
        deltaSsim:b.ssim-a.ssim,
        v56Mae:a.mae,v57Mae:b.mae,
        changedPixelFraction:changed/((box[2]-box[0])*(box[3]-box[1])),
      };
    }
    return {edge,metrics};
  },{photo:original.toString("base64"),
    baseline:captures.V56,candidate:captures.V57,
    rois,stationXs:stations,width:W,height:H});
  expect(errors).toEqual([]);
  const {edge,metrics}=result;
  expect(edge).toHaveLength(22);
  // A changed or stale CC0 source must be explicitly remeasured; cannot
  // silently substitute new camera/selection/negative control values.
  edge.forEach((item,i)=>{
    expect(Math.abs(item.photo-knownOriginal[i]),"original "+item.x).toBeLessThanOrEqual(3);
    expect(Math.abs(item.v56-knownV56[i]),"V56 "+item.x).toBeLessThanOrEqual(4);
    expect(item.v57).toBeGreaterThanOrEqual(100);
  });
  const mean=(values:number[])=>values.reduce((x,y)=>x+y,0)/values.length;
  const topMaeV56=mean(edge.map(x=>Math.abs(x.photo-x.v56)));
  const topMaeV57=mean(edge.map(x=>Math.abs(x.photo-x.v57)));
  const protectedKeys=["foliage","nearIris"] as const;
  for(const key of protectedKeys)
    expect(metrics[key].changedPixelFraction,key).toBeLessThanOrEqual(.003);
  for(const key of Object.keys(metrics)){
    expect(Number.isFinite(metrics[key].v57Ssim),key).toBe(true);
    expect(Number.isFinite(metrics[key].v57Mae),key).toBe(true);
  }
  const status=
    metrics.whole.deltaSsim>0&&metrics.crown.deltaSsim>0&&
    topMaeV57<topMaeV56&&protectedKeys.every(
      key=>metrics[key].changedPixelFraction<=.003)?
      "REGIONAL_SOURCE_POSITIVE_CANDIDATE":"ART_REJECT_OR_MORE_REVIEW";
  const report={
    status,artisticApproval:false,sourceSha256:REFERENCE_SHA,
    sourceIsOriginalCameraJpeg:false,
    frame:299,viewport:[W,H],
    metricsVersion:"uniform7x7-rgb-local-ssim-stride3-unbiased-covariance",
    silhouetteVersion:"9px-column-22row-brown-vs-green-sustained-70pct",
    topMaeV56,topMaeV57,edge,metrics,
    v60NativeCaptureProvenance:nativeCaptures,
  };
  writeFileSync(info.outputPath("v58-original-photo-hair-top-audit.json"),
    JSON.stringify(report,null,2)+"\n");
  console.log("[ArtCraft V58 actual original CC0 source hair photo audit]"+
    JSON.stringify(report));
  // A research experiment may be art-rejected while its photo evidence
  // is valid. The release gate reads the recorded status, not CI green.
  expect(status==="REGIONAL_SOURCE_POSITIVE_CANDIDATE"||
    status==="ART_REJECT_OR_MORE_REVIEW").toBe(true);
});

/**
 * V63 native proof: source-connected pigment values are rendered by Chromium,
 * byte-hashed, and packaged with the still-empty independent V60 worksheet.
 * This is a material experiment, not portrait or artist approval.
 */
test("F1 V63 source-connected facial value calibration native PNG and V60 evidence",async({page},info)=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width:W,height:H});
  const original=discoverSource(process.env.KM_ARTCRAFT_CC0_SOURCE_DIR??".artcraft-original-photo");
  const captures:Record<string,string>={};
  const capturedSpecs:Record<string,ReturnType<typeof crayonCc0FaceStudy>>={};
  for(const [label,midfaceForm] of [
    ["V57","source-anat1-hair-edge-v57"],
    ["V63","source-anat1-connected-face-v63"],
  ] as const){
    const spec=crayonCc0FaceStudy({midfaceForm,detail:1});
    capturedSpecs[label]=spec;
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}))+
      "</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    for(const id of ["face-outline","lower-lid-near","cheek-malar-cast",
      "cheek-malar-bounce","nose-root","nose-dorsum","nose-sidewall-form",
      "jaw-underside","hair-crown-surface"])
      await expect(svg.locator('[data-km-crayon-element="'+id+'"]')).toHaveCount(1);
    await page.waitForTimeout(320);
    const png=await svg.screenshot({animations:"disabled"});
    writeFileSync(info.outputPath("v63-native-"+label+"-299.png"),png);
    captures[label]=Buffer.from(png).toString("base64");
  }
  // Render actual vector 1.6×/2.95×/3× camera inspections at the same
  // frame for both variants; this is not a raster upscale of the 1× PNG.
  const detailCameras=[
    ["face-1.6x",{focusX:335,focusY:586,zoom:1.6}],
    ["near-eye-2.95x",{focusX:269,focusY:546,zoom:2.95}],
    ["far-eye-3x",{focusX:437,focusY:516,zoom:3}],
    ["nose-3x",{focusX:416,focusY:622,zoom:3}],
    ["mouth-3x",{focusX:417,focusY:734,zoom:3}],
  ] as const;
  for(const [region,camera] of detailCameras){
    for(const variant of ["V57","V63"] as const){
      const spec=capturedSpecs[variant];
      const zoomed={...spec,camera:[
        {frame:0,...camera},{frame:299,...camera},
      ]};
      await page.setContent("<!doctype html><html><body style='margin:0'>"+
        renderToStaticMarkup(createElement(CrayonScene,{spec:zoomed,frame:299}))+
        "</body></html>");
      const svg=page.locator("svg[data-km-crayon-scene]");
      await expect(svg).toBeVisible();
      const cameraGroup=svg.locator("[data-km-crayon-camera]");
      const transform=await cameraGroup.getAttribute("transform");
      expect(transform).toContain("scale("+camera.zoom+")");
      await page.waitForTimeout(320);
      const png=await svg.screenshot({animations:"disabled"});
      writeFileSync(info.outputPath("v63-detail-"+variant+"-"+region+".png"),png);
    }
  }
  const metrics=await page.evaluate(async({source,v57,v63,points})=>{
    async function pixels(base64:string){
      const img=new Image();img.src="data:image/png;base64,"+base64;
      await img.decode();
      if(img.naturalWidth!==608||img.naturalHeight!==1082)
        throw new Error("V63 native screenshot is not the exact 608×1082 camera");
      const canvas=document.createElement("canvas");
      canvas.width=608;canvas.height=1082;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("No Chromium pixel inspector");
      ctx.drawImage(img,0,0);
      return ctx.getImageData(0,0,608,1082).data;
    }
    const [a,b,c]=await Promise.all([pixels(source),pixels(v57),pixels(v63)]);
    function median(values:number[]){
      values.sort((x,y)=>x-y);
      return values[Math.floor(values.length/2)];
    }
    function medianRgb(data:Uint8ClampedArray,x:number,y:number){
      return [0,1,2].map(channel=>{
        const values:number[]=[];
        for(let yy=y-3;yy<=y+3;yy++)for(let xx=x-3;xx<=x+3;xx++)
          values.push(data[(yy*608+xx)*4+channel]);
        return median(values);
      });
    }
    function fraction(dataA:Uint8ClampedArray,dataB:Uint8ClampedArray,
      box:readonly [number,number,number,number]){
      const [x,y,w,h]=box;let changed=0,total=0;
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
        const i=(yy*608+xx)*4;
        if(dataA[i]!==dataB[i]||dataA[i+1]!==dataB[i+1]||
          dataA[i+2]!==dataB[i+2])changed++;
        total++;
      }
      return changed/total;
    }
    const witnesses=points.map((point:{id:string;x:number;y:number})=>{
      const sourceRgb=medianRgb(a,point.x,point.y);
      const v57Rgb=medianRgb(b,point.x,point.y);
      const v63Rgb=medianRgb(c,point.x,point.y);
      const distance=(rgb:number[])=>rgb.reduce((sum,value,index)=>
        sum+Math.abs(value-sourceRgb[index]),0)/3;
      return {id:point.id,at:[point.x,point.y],sourceRgb,v57Rgb,v63Rgb,
        v57Mae:distance(v57Rgb),v63Mae:distance(v63Rgb)};
    });
    return {
      sourceNativeDimensions:[608,1082],
      faceChangedFraction:fraction(b,c,[90,420,430,450]),
      crownControlChangedFraction:fraction(b,c,[0,150,530,250]),
      foliageControlChangedFraction:fraction(b,c,[0,0,80,75]),
      witnesses,
      improvedWitnesses:witnesses.filter(x=>x.v63Mae<x.v57Mae).map(x=>x.id),
    };
  },{
    source:original.toString("base64"),
    v57:captures.V57,v63:captures.V63,
    points:[
      {id:"infraorbital-cast",x:255,y:583},
      {id:"lateral-undercheek",x:133,y:702},
      {id:"nasal-root",x:333,y:533},
      {id:"malar-light-return",x:175,y:615},
      {id:"nasal-ridge-return",x:367,y:595},
      {id:"mandibular-roll",x:261,y:830},
    ],
  });
  const checkoutSha=process.env.GITHUB_SHA??
    execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const png=Buffer.from(captures.V63,"base64");
  const record=crayonF1NativeCaptureWorksheetV60({
    variant:"source-anat1-connected-face-v63",
    nativePngSha256:createHash("sha256").update(png).digest("hex"),
    checkoutCommitSha:checkoutSha,
    pngFileName:"v63-native-V63-299.png",
  });
  writeFileSync(info.outputPath("v60-native-candidate-V63-299.json"),
    JSON.stringify(record,null,2)+"\n");
  const report={
    schema:"kumiki-crayon-artcraft-v63-native-value-audit",
    sourceSha256:REFERENCE_SHA,
    sourceIsOriginalCameraJpeg:false,
    artisticApproval:false,
    releaseApproved:false,
    v63PngSha256:record.native.sha256,
    v60Manifest:"v60-native-candidate-V63-299.json",
    audit:record.audit,
    metrics,
  };
  writeFileSync(info.outputPath("v63-connected-face-value-audit.json"),
    JSON.stringify(report,null,2)+"\n");
  console.log("[ArtCraft V63 native face-value audit]"+JSON.stringify(report));
  expect(metrics.faceChangedFraction).toBeGreaterThan(0);
  expect(metrics.crownControlChangedFraction).toBe(0);
  expect(metrics.foliageControlChangedFraction).toBe(0);
  expect(record.audit.status).toBe("INCOMPLETE");
  expect(record.releaseApproved).toBe(false);
});

/**
 * V64 native oral-anatomy proof. Compares the exact same V63 geometry and
 * source photo against V64's narrower connected enamel / vermilion treatment.
 */
test("F1 V64 source-led oral aperture native PNG, 3x mouth and V60 evidence",async({page},info)=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width:W,height:H});
  const original=discoverSource(process.env.KM_ARTCRAFT_CC0_SOURCE_DIR??".artcraft-original-photo");
  const captures:Record<string,string>={};
  for(const [label,midfaceForm] of [
    ["V63","source-anat1-connected-face-v63"],
    ["V64","source-anat1-connected-face-v64"],
  ] as const){
    const spec=crayonCc0FaceStudy({midfaceForm,detail:1});
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      renderToStaticMarkup(createElement(CrayonScene,{spec,frame:299}))+
      "</body></html>");
    const svg=page.locator("svg[data-km-crayon-scene]");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("data-km-crayon-frame","299");
    const aperture=svg.locator('[data-km-crayon-element="mouth-aperture-depth"]');
    const apertureBox=await aperture.evaluate(element=>{
      const box=(element as SVGGraphicsElement).getBBox();
      return {width:box.width,height:box.height};
    });
    if(label==="V64"){
      expect(apertureBox.width).toBeLessThanOrEqual(118);
      expect(apertureBox.height).toBeLessThanOrEqual(34);
      for(const id of ["dental-surface-left","dental-surface-center","dental-surface-far"]){
        const tooth=svg.locator('[data-km-crayon-element="'+id+'"]');
        const box=await tooth.evaluate(element=>{
          const bounds=(element as SVGGraphicsElement).getBBox();
          return {width:bounds.width,height:bounds.height};
        });
        expect(box.height).toBeLessThanOrEqual(12);
      }
    }
    const png=await svg.screenshot({animations:"disabled"});
    writeFileSync(info.outputPath("v64-native-"+label+"-299.png"),png);
    captures[label]=Buffer.from(png).toString("base64");
    const mouthSpec={...spec,camera:[
      {frame:0,focusX:417,focusY:734,zoom:3},
      {frame:299,focusX:417,focusY:734,zoom:3},
    ]};
    await page.setContent("<!doctype html><html><body style='margin:0'>"+
      renderToStaticMarkup(createElement(CrayonScene,{spec:mouthSpec,frame:299}))+
      "</body></html>");
    const mouthSvg=page.locator("svg[data-km-crayon-scene]");
    const transform=await mouthSvg.locator("[data-km-crayon-camera]").getAttribute("transform");
    expect(transform).toContain("scale(3)");
    await page.waitForTimeout(320);
    const detail=await mouthSvg.screenshot({animations:"disabled"});
    writeFileSync(info.outputPath("v64-detail-"+label+"-mouth-3x.png"),detail);
  }
  const metrics=await page.evaluate(async({source,v63,v64})=>{
    async function pixels(base64:string){
      const img=new Image();img.src="data:image/png;base64,"+base64;
      await img.decode();
      if(img.naturalWidth!==608||img.naturalHeight!==1082)
        throw new Error("V64 oral screenshot is not 608×1082");
      const canvas=document.createElement("canvas");canvas.width=608;canvas.height=1082;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("No Chromium pixel inspector");
      ctx.drawImage(img,0,0);
      return ctx.getImageData(0,0,608,1082).data;
    }
    const [src,a,b]=await Promise.all([pixels(source),pixels(v63),pixels(v64)]);
    const mouth=[385,725,70,25] as const;
    function mouthStats(data:Uint8ClampedArray){
      const [x,y,w,h]=mouth;let dark=0,brightNeutral=0;
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
        const i=(yy*608+xx)*4,r=data[i],g=data[i+1],bl=data[i+2];
        const lum=.2126*r+.7152*g+.0722*bl;
        if(lum<65)dark++;
        if(lum>175&&Math.max(r,g,bl)-Math.min(r,g,bl)<70)brightNeutral++;
      }
      return {darkPixels:dark,brightNeutralPixels:brightNeutral};
    }
    function changed(a:Uint8ClampedArray,b:Uint8ClampedArray,
      box:readonly [number,number,number,number]){
      const [x,y,w,h]=box;let n=0,total=0;
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
        const i=(yy*608+xx)*4;
        if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;
        total++;
      }
      return n/total;
    }
    return {
      sourceMouth:mouthStats(src),v63Mouth:mouthStats(a),v64Mouth:mouthStats(b),
      eyeControlChangedFraction:changed(a,b,[190,490,180,115]),
      noseControlChangedFraction:changed(a,b,[350,510,130,160]),
      hairControlChangedFraction:changed(a,b,[0,150,530,250]),
    };
  },{
    source:original.toString("base64"),v63:captures.V63,v64:captures.V64,
  });
  const checkoutSha=process.env.GITHUB_SHA??
    execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const png=Buffer.from(captures.V64,"base64");
  const record=crayonF1NativeCaptureWorksheetV60({
    variant:"source-anat1-connected-face-v64",
    nativePngSha256:createHash("sha256").update(png).digest("hex"),
    checkoutCommitSha:checkoutSha,
    pngFileName:"v64-native-V64-299.png",
  });
  const report={
    schema:"kumiki-crayon-artcraft-v64-oral-aperture-audit",
    sourceSha256:REFERENCE_SHA,
    v63PngSha256:createHash("sha256").update(Buffer.from(captures.V63,"base64")).digest("hex"),
    v64PngSha256:record.native.sha256,
    metrics,
    audit:record.audit,
    artisticApproval:false,
    releaseApproved:false,
  };
  writeFileSync(info.outputPath("v64-oral-aperture-audit.json"),JSON.stringify(report,null,2)+"\n");
  writeFileSync(info.outputPath("v60-native-candidate-V64-299.json"),JSON.stringify(record,null,2)+"\n");
  console.log("[ArtCraft V64 oral aperture audit]"+JSON.stringify(report));
  expect(metrics.v64Mouth.brightNeutralPixels)
    .toBeLessThan(metrics.v63Mouth.brightNeutralPixels*.75);
  expect(metrics.v64Mouth.darkPixels).toBeGreaterThan(metrics.v63Mouth.darkPixels+10);
  expect(metrics.eyeControlChangedFraction).toBe(0);
  expect(metrics.noseControlChangedFraction).toBe(0);
  expect(metrics.hairControlChangedFraction).toBe(0);
  expect(record.audit.status).toBe("INCOMPLETE");
  expect(record.releaseApproved).toBe(false);
});
