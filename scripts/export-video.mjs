#!/usr/bin/env node
/* global window, document */
/** General Kumiki video exporter: one absolute-frame capture protocol -> MP4.
 * Frames are streamed straight into FFmpeg (no PNG spool on disk). Every encoded file goes to a
 * .partial.mp4, is verified with ffprobe (decoded frame count, size, rate, duration), and only then
 * renamed into place. A failed or interrupted export never replaces an existing --output.
 * --segmentSeconds=<n> splits long exports into verified, resumable video segments; a rerun reuses
 * every segment that still verifies and joins them without re-encoding. Audio is muxed once, from the
 * full mix, so it is never re-encoded or offset per segment.
 * Requires local Playwright Chromium, ffmpeg and ffprobe on PATH; no CI browser work.
 * npm run video:export -- --story=<storybook-story-id> --output=dist/video.mp4 [--segmentSeconds=60]
 * Or --url=http://127.0.0.1:6006/iframe.html?id=...&viewMode=story&kmExport=1
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright";
import presets from "../registry/video/platform-presets.json" with { type: "json" };
import {
  concatListText, ffmpegConcatArgs, ffmpegEncodeArgs, ffprobeVerifyArgs, partialPathFor,
  segmentFileName, segmentPlan, verifyExportProbe,
} from "./video-export-core.mjs";

const allowed=new Set(["url","story","output","port","startFrame","frames","audio","preset","segmentSeconds","browser"]);
function parse(args){
  if(args.length===1&&args[0]==="--list-presets"){
    for(const p of presets)process.stdout.write(p.id.padEnd(23)+p.width+"x"+p.height+"  "+p.label+"\n");
    return null;
  }
  const opts={};
  for(const arg of args){
    const match=/^--([\w]+)=(.+)$/.exec(arg);
    if(!match||!allowed.has(match[1])||opts[match[1]]!==undefined)
      throw new Error("Unknown, repeated or malformed flag: "+arg);
    opts[match[1]]=match[2];
  }
  if(Boolean(opts.url)===Boolean(opts.story))
    throw new Error("Specify exactly one of --story=<Storybook ID> or --url=<local preview URL>.");
  const port=Number(opts.port??6006);
  if(!Number.isSafeInteger(port)||port<1024||port>65535)
    throw new Error("--port must be a valid unprivileged port.");
  const base="http://127.0.0.1:"+port;
  const url=opts.story
    ?base+"/iframe.html?id="+encodeURIComponent(opts.story)+"&viewMode=story"
    :opts.url;
  const address=new URL(url);
  // Export mode renders the surface at manifest size; the story's own preview scales it down.
  if(opts.story)address.searchParams.set("kmExport","1");
  if(opts.preset){
    if(!presets.some(p=>p.id===opts.preset))
      throw new Error("Unknown preset "+opts.preset+". Run --list-presets.");
    address.searchParams.set("kmPreset",opts.preset);
  }
  if(!["http:","https:"].includes(address.protocol)||
     !["localhost","127.0.0.1","[::1]"].includes(address.hostname))
    throw new Error("Video exporter accepts local preview URLs only, never a remote webpage.");
  const num=(name,defaultValue)=>{
    const n=Number(opts[name]??defaultValue);
    if(!Number.isSafeInteger(n)||n<0)throw new Error("--"+name+" needs a nonnegative integer.");
    return n;
  };
  // Playwright's bundled Chromium decodes H.264 but not HEVC; --browser=chrome uses the installed Google Chrome, which decodes both.
  if(opts.browser!==undefined&&!["chromium","chrome"].includes(opts.browser))
    throw new Error("--browser must be chromium or chrome.");
  return {url:address.toString(),port,preset:opts.preset,browser:opts.browser??"chromium",
    output:resolve(opts.output??("dist/"+(opts.preset??"kumiki-video")+".mp4")),
    audio:opts.audio?resolve(opts.audio):undefined,
    start:num("startFrame",0),requested:opts.frames===undefined?undefined:num("frames",0),
    segmentSeconds:num("segmentSeconds",0)};
}
/** ffprobe report as parsed JSON. Decodes the whole file to count frames, which is the point. */
const probe=path=>new Promise((resolve,reject)=>{
  const proc=spawn("ffprobe",ffprobeVerifyArgs(path),{stdio:["ignore","pipe","inherit"]});
  let text="";
  proc.stdout.on("data",chunk=>{text+=chunk;});
  proc.once("error",error=>reject(new Error("ffprobe unavailable: "+error.message)));
  proc.once("close",code=>{
    if(code!==0)return reject(new Error("ffprobe exited with code "+code));
    try{resolve(JSON.parse(text));}catch(error){reject(error);}
  });
});
/**
 * Fail before the first frame if the export cannot succeed: a font failed to load, a declared asset is unreachable,
 * a rights reference is missing, or a declared video cannot be decoded by this browser. Nothing is rendered or written.
 */
async function preflight(page,manifest){
  const fonts=await page.evaluate(async()=>{
    await document.fonts?.ready;
    return [...(document.fonts??[])].filter(face=>face.status==="error").map(face=>face.family);
  });
  if(fonts.length)throw new Error("Preflight: font(s) failed to load: "+fonts.join(", ")+".");
  for(const asset of manifest.assets??[]){
    if(!asset.licenseRef||!asset.licenseRef.trim())
      throw new Error('Preflight: asset "'+asset.id+'" has no rights reference (licenseRef). Export refused.');
    const probe=await page.evaluate(({url,kind})=>new Promise(resolve=>{
      // Reachable: a ranged GET for the first byte, so large media is not downloaded just to check it.
      fetch(url,{headers:{Range:"bytes=0-0"}}).then(async response=>{
        if(!response.ok&&response.status!==206)return resolve({ok:false,reason:"HTTP "+response.status});
        if(kind!=="video")return resolve({ok:true});
        // Decodable: this browser must load the first frame of the video.
        const video=document.createElement("video");
        video.muted=true;video.preload="auto";
        const finish=result=>{clearTimeout(timer);video.removeAttribute("src");video.load();resolve(result);};
        const timer=setTimeout(()=>finish({ok:false,reason:"the browser did not decode it within 15 s (codec unsupported?)"}),15000);
        video.addEventListener("loadeddata",()=>finish({ok:true}),{once:true});
        video.addEventListener("error",()=>finish({ok:false,reason:video.error?.message??"decode error"}),{once:true});
        video.src=url;
      }).catch(error=>resolve({ok:false,reason:error.message}));
    }),{url:asset.url,kind:asset.kind});
    if(!probe.ok)throw new Error('Preflight: asset "'+asset.id+'" ('+asset.url+') is not usable: '+probe.reason+'. Export refused.');
  }
  process.stdout.write("Preflight passed"+(manifest.assets?.length?" for "+manifest.assets.length+" asset(s)":"")+".\n");
}
/** Verify a finished file against what was asked for; returns its decoded video stream. */
async function verifyFile(path,expected){
  const report=await probe(path);
  const problems=verifyExportProbe(report,expected);
  if(problems.length)throw new Error("Export failed verification for "+path+": "+problems.join(" "));
  return report.streams.find(s=>s.codec_type==="video");
}
let running;
const runFfmpeg=args=>new Promise((resolve,reject)=>{
  const proc=spawn("ffmpeg",args,{stdio:"inherit"});
  running=proc;
  proc.once("error",error=>reject(new Error("ffmpeg unavailable: "+error.message)));
  proc.once("close",code=>{
    running=undefined;
    if(code===0)resolve();
    else reject(new Error("ffmpeg exited with code "+code));
  });
});
const sha256=path=>new Promise((resolve,reject)=>{
  const hash=createHash("sha256");
  createReadStream(path).on("data",chunk=>hash.update(chunk)).once("error",reject)
    .once("end",()=>resolve(hash.digest("hex")));
});
/** FFmpeg reading PNG frames from stdin. write() waits for drain, so memory stays bounded by one frame. */
function startEncoder(args){
  const proc=spawn("ffmpeg",args,{stdio:["pipe","inherit","inherit"]});
  const closed=new Promise((resolve,reject)=>{
    proc.once("error",error=>reject(new Error("ffmpeg unavailable: "+error.message)));
    proc.once("close",code=>code===0?resolve():reject(new Error("ffmpeg exited with code "+code)));
  });
  // A dead encoder surfaces through write() or finish(); this only prevents an unhandled EPIPE crash.
  proc.stdin.on("error",()=>{});
  closed.catch(()=>{});
  return {
    async write(buffer){
      if(!proc.stdin.write(buffer))await Promise.race([once(proc.stdin,"drain"),closed]);
    },
    finish(){proc.stdin.end();return closed;},
    kill(){if(proc.exitCode===null&&proc.signalCode===null)proc.kill("SIGKILL");},
  };
}
/** PNG width and height from the IHDR chunk, so every frame is checked without decoding it. */
function pngSize(buffer){
  if(buffer.length<24||buffer.readUInt32BE(0)!==0x89504e47)throw new Error("Capture was not a PNG.");
  return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function available(url){
  try{return (await fetch(url,{signal:AbortSignal.timeout(1200)})).ok;}
  catch{return false;}
}
const opts=parse(process.argv.slice(2));
if(!opts)process.exit(0);
// Every encoder output still being written; removed on failure or interruption, never the caller's output.
const activePartials=new Set();
let server,browser,encoder,interruptedBy;
const startedAt=performance.now();
// A signal stops the frame loop at its next step; cleanup then runs in the normal finally path.
const onSignal=signal=>{
  interruptedBy=signal;
  encoder?.kill();
  running?.kill("SIGKILL");
};
process.once("SIGINT",()=>onSignal("SIGINT"));
process.once("SIGTERM",()=>onSignal("SIGTERM"));
const throwIfInterrupted=()=>{
  if(interruptedBy)throw new Error("Export interrupted by "+interruptedBy+".");
};

/** Seek and capture frames [from, from+count) into the encoder. Each PNG is checked against the manifest size. */
async function captureFrames({page,capture,encoderHandle,manifest,errors,from,count,label,stats}){
  for(let i=0;i<count;i++){
    const frame=from+i;
    throwIfInterrupted();
    if(errors.length)throw new Error("Browser encountered: "+errors.join("; "));
    await page.evaluate(async f=>{await window.__kmVideoExport.seek(f);},frame);
    const png=await capture.screenshot({animations:"disabled",caret:"hide",timeout:30000});
    const size=pngSize(png);
    if(size.width!==manifest.width||size.height!==manifest.height)
      throw new Error("Captured "+size.width+"×"+size.height+" at frame "+frame+", but the manifest declares "+
        manifest.width+"×"+manifest.height+". Render the story in export mode (kmExport=1) at manifest size.");
    await encoderHandle.write(png);
    stats.piped+=png.length;
    stats.peakRss=Math.max(stats.peakRss,process.memoryUsage().rss);
    if(i%60===0||i===count-1)
      process.stdout.write("Captured "+(i+1)+"/"+count+" frames"+label+"\n");
  }
}
/** Encode one video file from a frame range. Audio, if any, is added only by the caller. */
async function encodeFile({file,page,capture,manifest,errors,from,count,audioPath,label,stats}){
  const partial=partialPathFor(file);
  activePartials.add(partial);
  encoder=startEncoder(ffmpegEncodeArgs({fps:manifest.fps,outputPath:partial,audioPath,
    startSeconds:audioPath?from/(manifest.fps.num/manifest.fps.den):0,frames:count}));
  try{
    await captureFrames({page,capture,encoderHandle:encoder,manifest,errors,from,count,label,stats});
    await encoder.finish();
  }catch(error){
    encoder.kill();
    throw error;
  }finally{
    encoder=undefined;
  }
  return partial;
}
// Attempts per segment, counting the first. A failed segment is re-rendered from a fresh page.
const SEGMENT_ATTEMPTS=3;
/** A segment left by an earlier run is reused only if it still verifies against this plan. */
async function reusableSegment(file,expected){
  try{
    await stat(file);
    return verifyExportProbe(await probe(file),expected).length===0;
  }catch{return false;}
}

try{
  if(!await available(opts.url)){
    // Storybook auto-launch is supported only for local Storybook iframe pages.
    const parsed=new URL(opts.url);
    if(parsed.pathname!=="/iframe.html"||Number(parsed.port||80)!==opts.port)
      throw new Error("Preview server is not running at "+opts.url+". Start it first.");
    const cli=resolve("node_modules/storybook/dist/bin/dispatcher.js");
    server=spawn(process.execPath,[cli,"dev","-p",String(opts.port),
      "--host","127.0.0.1","--ci"],{stdio:"ignore"});
    let ready=false;
    for(let attempt=0;attempt<90;attempt++){
      if(server.exitCode!==null)throw new Error("Storybook exited during startup.");
      if(await available(opts.url)){ready=true;break;}
      await sleep(1000);
    }
    if(!ready)throw new Error("Local Storybook did not become ready.");
  }
  browser=await chromium.launch({headless:true,...(opts.browser==="chrome"?{channel:"chrome"}:{})});
  const pageOptions={viewport:{width:1400,height:900},deviceScaleFactor:1,reducedMotion:"no-preference"};
  let page=await browser.newPage(pageOptions);
  const errors=[];
  const listen=target=>target.on("pageerror",err=>errors.push(err.message));
  listen(page);
  const openPage=async()=>{
    await page.goto(opts.url,{waitUntil:"domcontentloaded",timeout:60000});
    await page.waitForFunction(()=>typeof window.__kmVideoExport?.seek==="function",
      null,{timeout:60000});
  };
  await openPage();
  const manifest=await page.evaluate(()=>window.__kmVideoExport?.manifest);
  if(manifest?.schemaVersion!==1||!Number.isSafeInteger(manifest.durationFrames)||
    !Number.isSafeInteger(manifest.width)||!Number.isSafeInteger(manifest.height)||
    manifest.durationFrames<1||manifest.width<2||manifest.height<2||
    manifest.width%2||manifest.height%2||
    !Number.isSafeInteger(manifest.fps?.num)||!Number.isSafeInteger(manifest.fps?.den)||
    manifest.fps.num<1||manifest.fps.den<1)
    throw new Error("Story has no valid Kumiki export manifest.");
  if(opts.preset){
    const preset=presets.find(p=>p.id===opts.preset);
    if(manifest.width!==preset.width||manifest.height!==preset.height||
       manifest.preset!==opts.preset)
      throw new Error("Preset "+opts.preset+" needs a "+preset.width+"×"+preset.height+
        " scene that declares manifest.preset. Re-author layout for this format; no blind cropping.");
  }
  await preflight(page,manifest);
  const count=opts.requested??(manifest.durationFrames-opts.start);
  if(!count||opts.start+count>manifest.durationFrames)
    throw new Error("Requested frame range exceeds manifest duration.");
  const fps=manifest.fps.num/manifest.fps.den;
  const duration=count/fps;
  if(opts.preset){
    const preset=presets.find(p=>p.id===opts.preset);
    if(preset.minSeconds!==null&&duration<preset.minSeconds ||
       preset.maxSeconds!==null&&duration>preset.maxSeconds)
      throw new Error("Selected "+opts.preset+" export duration "+duration.toFixed(2)+
        "s falls outside "+(preset.minSeconds??0)+"–"+(preset.maxSeconds??"unrestricted")+"s.");
    if(opts.preset==="tiktok-ads"&&!opts.audio)
      process.stderr.write("Warning: TikTok ad creatives generally require audio.\n");
  }
  const segmentFrames=opts.segmentSeconds*manifest.fps.num/manifest.fps.den;
  if(opts.segmentSeconds&&!Number.isInteger(segmentFrames))
    throw new Error("--segmentSeconds="+opts.segmentSeconds+" is not a whole number of frames at "+
      manifest.fps.num+"/"+manifest.fps.den+" fps.");
  const viewport={width:Math.max(1000,manifest.width+40),height:Math.max(700,manifest.height+40)};
  await page.setViewportSize(viewport);
  let capture=page.locator("[data-km-video-capture]");
  if(await capture.count()!==1)throw new Error("Expected exactly one [data-km-video-capture] element.");
  await mkdir(dirname(opts.output),{recursive:true});
  const target={width:manifest.width,height:manifest.height,fps:manifest.fps};
  const stats={piped:0,peakRss:process.memoryUsage().rss};
  const shared={page,capture,manifest,errors,stats};
  // A crashed page cannot be reloaded, so recovery replaces it: a new page, the same viewport, listeners and capture.
  const replacePage=async()=>{
    await page.close().catch(()=>{});
    page=await browser.newPage(pageOptions);
    listen(page);
    await page.setViewportSize(viewport);
    await openPage();
    capture=page.locator("[data-km-video-capture]");
    if(await capture.count()!==1)throw new Error("Expected exactly one [data-km-video-capture] element.");
    shared.page=page;
    shared.capture=capture;
  };
  let segmentsReused=0,segmentsRendered=0;
  const plan=opts.segmentSeconds?segmentPlan(opts.start,count,segmentFrames):undefined;

  let video;
  throwIfInterrupted();
  if(!plan){
    const partial=await encodeFile({...shared,file:opts.output,from:opts.start,count,audioPath:opts.audio,label:""});
    video=await verifyFile(partial,{...target,frames:count,audio:Boolean(opts.audio)});
    await rename(partial,opts.output);
    activePartials.delete(partial);
  }else{
    // Segments live in a sibling folder keyed by the capture source; a different source starts over.
    const dir=opts.output+".segments", keyPath=join(dir,"key.json");
    const key=JSON.stringify({url:opts.url,target,segmentFrames,start:opts.start});
    if(await readFile(keyPath,"utf8").catch(()=>undefined)!==key){
      await rm(dir,{recursive:true,force:true});
      await mkdir(dir,{recursive:true});
      await writeFile(keyPath,key);
    }
    const files=[];
    for(const segment of plan){
      throwIfInterrupted();
      const file=join(dir,segmentFileName(segment));
      files.push(file);
      const expected={...target,frames:segment.frames,audio:false};
      if(await reusableSegment(file,expected)){segmentsReused+=1;process.stdout.write("Reused verified "+file+"\n");continue;}
      const number=(segment.start-opts.start)/segmentFrames+1;
      const label=" (segment "+number+" of "+plan.length+")";
      for(let attempt=1;;attempt+=1){
        try{
          const partial=await encodeFile({...shared,file,from:segment.start,count:segment.frames,label});
          await verifyFile(partial,expected);
          await rename(partial,file);
          activePartials.delete(partial);
          break;
        }catch(error){
          if(interruptedBy||attempt>=SEGMENT_ATTEMPTS)throw error;
          process.stdout.write("Segment "+number+" failed: "+error.message+" Retrying with a fresh page ("+(attempt+1)+" of "+SEGMENT_ATTEMPTS+").\n");
          await rm(partialPathFor(file),{force:true});
          activePartials.clear();
          errors.length=0;
          await replacePage();
        }
      }
      segmentsRendered+=1;
    }
    throwIfInterrupted();
    const list=join(dir,"list.txt");
    await writeFile(list,concatListText(files));
    const partial=partialPathFor(opts.output);
    activePartials.add(partial);
    await runFfmpeg(ffmpegConcatArgs({fps:manifest.fps,listPath:list,outputPath:partial,
      audioPath:opts.audio,startSeconds:opts.start/fps,frames:count}));
    video=await verifyFile(partial,{...target,frames:count,audio:Boolean(opts.audio)});
    await rename(partial,opts.output);
    activePartials.delete(partial);
    await rm(dir,{recursive:true,force:true});
  }
  const bytes=(await stat(opts.output)).size;
  const seconds=(performance.now()-startedAt)/1000;
  process.stdout.write([
    "Exported "+opts.output+" ("+count+" frames @ "+manifest.fps.num+"/"+manifest.fps.den+" fps)",
    "verified: "+video.nb_read_frames+" decoded frames, "+video.width+"×"+video.height+", "+duration.toFixed(3)+" s",
    "sha256: "+await sha256(opts.output),
    (plan?"segments: "+plan.length+" ("+segmentsRendered+" rendered, "+segmentsReused+" reused), ":"")+
      "output bytes: "+bytes+", frame bytes piped to encoder (never stored): "+stats.piped,
    "node peak RSS: "+(stats.peakRss/1048576).toFixed(0)+" MB, wall time: "+seconds.toFixed(1)+" s",
  ].join("\n")+"\n");
}catch(error){
  if(!interruptedBy)throw error;
  process.stderr.write("Interrupted by "+interruptedBy+": partial output removed; finished segments are kept for a rerun.\n");
  process.exitCode=interruptedBy==="SIGINT"?130:143;
}finally{
  encoder?.kill();
  running?.kill("SIGKILL");
  for(const path of activePartials)await rm(path,{force:true});
  await browser?.close();
  if(server)server.kill("SIGTERM");
}
