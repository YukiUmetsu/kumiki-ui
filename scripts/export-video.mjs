#!/usr/bin/env node
/** General Kumiki video exporter: one absolute-frame capture protocol -> MP4.
 * Requires local Playwright Chromium and ffmpeg on PATH; no CI browser work.
 * npm run video:export -- --story=<storybook-story-id> --output=dist/video.mp4
 * Or --url=http://127.0.0.1:6006/iframe.html?id=...&viewMode=story
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright";
import presets from "../registry/video/platform-presets.json" with { type: "json" };

const allowed=new Set(["url","story","output","port","startFrame","frames","audio","preset"]);
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
  return {url:address.toString(),port,preset:opts.preset,
    output:resolve(opts.output??("dist/"+(opts.preset??"kumiki-video")+".mp4")),
    audio:opts.audio?resolve(opts.audio):undefined,
    start:num("startFrame",0),requested:opts.frames===undefined?undefined:num("frames",0)};
}
const run=(bin,args)=>new Promise((resolve,reject)=>{
  const proc=spawn(bin,args,{stdio:"inherit"});
  proc.once("error",error=>reject(new Error(bin+" unavailable: "+error.message)));
  proc.once("close",code=>code===0?resolve():reject(new Error(bin+" exited with code "+code)));
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function available(url){
  try{return (await fetch(url,{signal:AbortSignal.timeout(1200)})).ok;}
  catch{return false;}
}
const opts=parse(process.argv.slice(2));
if(!opts)process.exit(0);
let server,browser;
const temp=await mkdtemp(join(tmpdir(),"kumiki-video-"));
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
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({
    viewport:{width:1400,height:900},deviceScaleFactor:1,
    reducedMotion:"no-preference",
  });
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(opts.url,{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>typeof window.__kmVideoExport?.seek==="function",
    null,{timeout:60000});
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
  const count=opts.requested??(manifest.durationFrames-opts.start);
  if(!count||opts.start+count>manifest.durationFrames)
    throw new Error("Requested frame range exceeds manifest duration.");
  const duration=count*manifest.fps.den/manifest.fps.num;
  if(opts.preset){
    const preset=presets.find(p=>p.id===opts.preset);
    if(preset.minSeconds!==null&&duration<preset.minSeconds ||
       preset.maxSeconds!==null&&duration>preset.maxSeconds)
      throw new Error("Selected "+opts.preset+" export duration "+duration.toFixed(2)+
        "s falls outside "+(preset.minSeconds??0)+"–"+(preset.maxSeconds??"unrestricted")+"s.");
    if(opts.preset==="tiktok-ads"&&!opts.audio)
      process.stderr.write("Warning: TikTok ad creatives generally require audio.\n");
  }
  const rate=manifest.fps.num+"/"+manifest.fps.den;
  await page.setViewportSize({width:Math.max(1000,manifest.width+40),
    height:Math.max(700,manifest.height+40)});
  const capture=page.locator("[data-km-video-capture]");
  if(await capture.count()!==1)throw new Error("Expected exactly one [data-km-video-capture] element.");
  const filename=index=>join(temp,"frame-"+String(index).padStart(7,"0")+".png");
  for(let i=0;i<count;i++){
    const frame=opts.start+i;
    if(errors.length)throw new Error("Browser encountered: "+errors.join("; "));
    await page.evaluate(async f=>{await window.__kmVideoExport.seek(f);},frame);
    await capture.screenshot({path:filename(i),animations:"disabled",
      caret:"hide",timeout:30000});
    if(i%60===0||i===count-1)
      process.stdout.write("Captured "+(i+1)+"/"+count+" frames\n");
  }
  await mkdir(dirname(opts.output),{recursive:true});
  const fps=manifest.fps.num/manifest.fps.den;
  const ffmpeg=["-nostdin","-y","-framerate",rate,
    "-i",join(temp,"frame-%07d.png")];
  if(opts.audio)ffmpeg.push("-ss",String(opts.start/fps),"-i",opts.audio);
  ffmpeg.push("-c:v","libx264","-crf","19","-preset","medium",
    "-pix_fmt","yuv420p","-r",rate,
    "-t",String(count/fps));
  if(opts.audio)ffmpeg.push("-c:a","aac","-b:a","192k");
  else ffmpeg.push("-an");
  ffmpeg.push("-movflags","+faststart",opts.output);
  await run("ffmpeg",ffmpeg);
  process.stdout.write("Exported "+opts.output+" ("+count+" frames @ "+rate+" fps)\n");
}finally{
  await browser?.close();
  if(server)server.kill("SIGTERM");
  await rm(temp,{recursive:true,force:true});
}
