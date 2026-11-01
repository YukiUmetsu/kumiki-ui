#!/usr/bin/env node
/* global window */
/** Production Storybook contact proof, with exact film-frame seeks.
 * node scripts/capture-epic-book-stills.mjs --portrait --out=dist/epic-book-review
 * Run after `npm run build-storybook` and the static server on port 6006.
 */
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const values=Object.fromEntries(process.argv.slice(2).filter(a=>a.includes("=")).map(a=>{
  const [key,...parts]=a.split("=");return [key,parts.join("=")];
}));
const portrait=process.argv.includes("--portrait"),port=Number(values["--port"]??6006);
const out=resolve(values["--out"]??`dist/epic-book-proof-${portrait?"portrait":"landscape"}`);
const frames=(values["--frames"]??"0,35,65,110,155,215,260,299").split(",").map(Number);
if(!frames.length||frames.some(n=>!Number.isSafeInteger(n)||n<0||n>=300))
  throw Error("All requested frames must be integers in 0–299.");
await mkdir(out,{recursive:true});
const story=portrait?"epic-book-storytelling-portrait-capture":"epic-book-storytelling-capture";
const storyId=`video-production-scene-templates-3d-everyday-objects--${story}`;
const browser=await chromium.launch({headless:true,
  executablePath:process.env.KUMIKI_BROWSER_EXECUTABLE||undefined,
  args:["--disable-dev-shm-usage"]});
const files=[];
try{
  const page=await browser.newPage({viewport:{width:portrait?590:1000,height:portrait?1030:620}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const address=`http://127.0.0.1:${port}/iframe.html?id=${storyId}&viewMode=story&kmExport=1`;
  await page.goto(address,{waitUntil:"domcontentloaded",timeout:120000});
  await page.waitForFunction(()=>typeof window.__kmVideoExport?.seek==="function",undefined,{timeout:120000});
  const surface=page.locator("[data-km-video-capture]");
  for(const frame of frames){
    await page.evaluate(frame=>window.__kmVideoExport.seek(frame),frame);
    const path=join(out,`${portrait?"portrait":"wide"}-${String(frame).padStart(3,"0")}.png`);
    await surface.screenshot({path,timeout:60000,animations:"disabled"});files.push(path);
    console.log(`Frame ${frame}: ${path}`);
  }
  if(errors.length)throw Error(`WebGL page errors: ${[...new Set(errors)].join("; ")}`);
}finally{await browser.close();}
if(files.length>1){
  const cols=files.length%4===0?4:files.length%3===0?3:files.length%2===0?2:files.length;
  const rows=Math.ceil(files.length/cols);
  const tileW=portrait?270:480,tileH=portrait?480:270;
  const inputs=files.flatMap(f=>["-i",f]);
  const tiles=files.map((_,i)=>`[${i}:v]scale=${tileW}:${tileH}[v${i}]`).join(";");
  const padded=rows*cols-files.length;
  const blank=padded?`;color=c=0x131416:s=${tileW}x${tileH}:d=1[blank]`:"";
  const concat=files.map((_,i)=>`[v${i}]`).join("")+"[blank]".repeat(padded);
  const positions=Array.from({length:rows*cols},(_,i)=>`${i%cols*tileW}_${Math.floor(i/cols)*tileH}`).join("|");
  const output=join(out,"contact-sheet.jpg");
  const ff=spawnSync("ffmpeg",["-y","-loglevel","error",...inputs,"-filter_complex",
    `${tiles}${blank};${concat}xstack=inputs=${rows*cols}:layout=${positions}`,
    "-frames:v","1","-q:v","3",output],{encoding:"utf8"});
  if(ff.status!==0)throw Error(ff.stderr||"Cannot build contact sheet");
  console.log(`Contact sheet: ${output}`);
}
