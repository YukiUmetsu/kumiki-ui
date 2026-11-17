import {expect,test} from "@playwright/test";
import {createHash} from "node:crypto";
import {readFileSync,readdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonCc0FaceStudy} from "../../src/video/crayon-artcraft-cc0-face";

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
