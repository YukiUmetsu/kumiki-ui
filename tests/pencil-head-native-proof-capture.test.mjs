import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import {
  captureHeadPhotoEvidence,
  measureExactLocalImage,
} from "../scripts/pencil-head-native-proof-capture.mjs";

let browser,dir,src,render,chromiumUnavailable=false;
const bands=[
  ["highlight",[230,210,195]],
  ["light",[190,160,150]],
  ["halftone",[142,112,105]],
  ["core-shadow",[45,40,50]],
  ["reflected-light",[97,85,80]],
];
const rois=bands.map(([id],i)=>({
  id,rect:{x:i*40+5,y:12,width:28,height:28},
}));

before(async()=>{
  try{
    browser=await chromium.launch({headless:true});
  }catch(error){
    if(!String(error).includes("Executable doesn't exist"))throw error;
    // Changed-contracts intentionally has no Chromium install to save CI.
    // The focused foundation-proof job installs it and runs ALL these tests.
    chromiumUnavailable=true;
    return;
  }
  dir=await mkdtemp(path.join(tmpdir(),"pencil-head-photo-proof-"));
  const page=await browser.newPage();
  try {
    const data=await page.evaluate(bands=>{
      const canvas=document.createElement("canvas");
      canvas.width=200;canvas.height=120;
      const ctx=canvas.getContext("2d");
      bands.forEach(([,rgb],i)=>{
        ctx.fillStyle="rgb("+rgb.join(",")+")";
        ctx.fillRect(i*40,0,40,120);
      });
      return canvas.toDataURL("image/png").split(",")[1];
    },bands);
    const bytes=Buffer.from(data,"base64");
    src=path.join(dir,"source.png");
    render=path.join(dir,"native-render.png");
    await writeFile(src,bytes);
    // Different actual PNG bytes, identical sampled native value bands.
    // A one-pixel external mark belongs outside all 5 measurement ROIs.
    const shifted=await page.evaluate(b64=>{
      const image=new Image();
      image.src="data:image/png;base64,"+b64;
      return new Promise((resolve,reject)=>{
        image.onload=()=>{
          const c=document.createElement("canvas");
          c.width=image.width;c.height=image.height;
          const ctx=c.getContext("2d");
          ctx.drawImage(image,0,0);
          ctx.fillStyle="#123456";ctx.fillRect(198,118,1,1);
          resolve(c.toDataURL("image/png").split(",")[1]);
        };
        image.onerror=reject;
      });
    },data);
    await writeFile(render,Buffer.from(shifted,"base64"));
  }finally{await page.close();}
});

after(async()=>{
  if(browser)await browser.close();
  if(dir)await rm(dir,{recursive:true,force:true});
});

test("native browser decodes exact local PNG bytes and samples 5 genuine pixel regions",async(t)=>{
  if(chromiumUnavailable){t.skip("Chromium image proof runs in foundation-proof");return;}
  const r=await measureExactLocalImage({file:src,tones:rois},browser);
  const original=await readFile(src);
  assert.equal(r.sha256,createHash("sha256").update(original).digest("hex"));
  assert.equal(r.width,200);assert.equal(r.height,120);
  assert.deepEqual(r.tones.map(t=>t.id),bands.map(([id])=>id));
  for(let i=0;i<bands.length;i++){
    assert.deepEqual(r.tones[i].meanRgb,bands[i][1]);
    assert.deepEqual(r.tones[i].rect,rois[i].rect);
  }
});

test("captures evaluator-compatible independent photo/native render without reusing source pixels",async(t)=>{
  if(chromiumUnavailable){t.skip("Chromium image proof runs in foundation-proof");return;}
  const points=[{id:"cranial-apex",x:78,y:6}];
  const r=await captureHeadPhotoEvidence({
    sourceFile:src,renderFile:render,
    source:{url:"https://example.org/source",license:"CC0-1.0",
      credit:"Studio Photographer"},
    sourceLandmarks:points,outputLandmarks:points,
    sourceTones:rois,outputTones:rois,
  },browser);
  assert.notEqual(r.source.sha256,r.output.sha256);
  assert.equal(r.source.width,200);assert.equal(r.output.height,120);
  assert.equal(r.source.url,"https://example.org/source");
  assert.deepEqual(r.sourceLandmarks,points);
  assert.deepEqual(r.outputLandmarks,points);
  assert.deepEqual(r.outputTones[3].meanRgb,[45,40,50]);
  assert.deepEqual(r.sourceTones[0].meanRgb,[230,210,195]);
  assert.equal("imageBytes" in r,false);
});

test("fails closed for pixels outside bounds, overlaps, file lies and unsupported file types",async(t)=>{
  if(chromiumUnavailable){t.skip("Chromium image proof runs in foundation-proof");return;}
  await assert.rejects(
    measureExactLocalImage({file:src,tones:[{id:"invalid",
      rect:{x:190,y:110,width:18,height:18}}]},browser),
    /outside|bounds/i);
  await assert.rejects(
    measureExactLocalImage({file:src,tones:[rois[0],
      {...rois[1],rect:{x:8,y:16,width:15,height:15}}]},browser),
    /overlap/i);
  const bad=path.join(dir,"fake.jpg");
  await writeFile(bad,"This is not JPEG data");
  await assert.rejects(
    measureExactLocalImage({file:bad,tones:rois},browser),
    /PNG|JPEG|signature|image/i);
  await assert.rejects(
    measureExactLocalImage({file:src,tones:[{id:"bogus",
      rect:{x:0,y:0,width:0,height:0}}]},browser),
    /rect|width|height/i);
});
