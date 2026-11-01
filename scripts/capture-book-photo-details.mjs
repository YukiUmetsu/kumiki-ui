#!/usr/bin/env node
/** WebGL closeups of the final film's decoded CC0 photo materials.
 * Build and serve Storybook first; honor KUMIKI_BROWSER_EXECUTABLE when set.
 */
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const options=Object.fromEntries(process.argv.slice(2).filter(arg=>arg.startsWith("--")&&arg.includes("="))
  .map(arg=>{const [name,...value]=arg.slice(2).split("=");return [name,value.join("=")];}));
const out=resolve(options.out??"dist/book-photo-details");
const port=Number(options.port??6006);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,
  executablePath:process.env.KUMIKI_BROWSER_EXECUTABLE||undefined,
  args:["--disable-dev-shm-usage"]});
const files=[];
try{
  const page=await browser.newPage({viewport:{width:1024,height:620},deviceScaleFactor:1});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  for(const story of ["photographic-cover-closeup","photographic-spread-closeup"]){
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=motion-scene-book-3d--${story}&viewMode=story`,
      {waitUntil:"domcontentloaded",timeout:120000});
    await page.locator('[data-km-book-textures="ready"]').waitFor({timeout:120000});
    await page.waitForFunction(()=>document.querySelector("[data-km-hero-viewer] canvas")?.width>0,
      undefined,{timeout:120000});
    await page.waitForTimeout(950);
    const path=join(out,`${story}.png`);
    await page.locator("[data-km-physical-book-3d]").screenshot({path,timeout:60000});
    files.push(path);
    console.log(`Captured ${story}: ${path}`);
  }
  if(errors.length)throw Error(`WebGL page errors: ${[...new Set(errors)].join("; ")}`);
}finally{await browser.close();}
const proof=join(out,"photo-closeup-pair.jpg");
const ff=spawnSync("ffmpeg",["-y","-loglevel","error","-i",files[0],"-i",files[1],
  "-filter_complex","[0:v]scale=640:360[a];[1:v]scale=640:360[b];[a][b]hstack=inputs=2",
  "-frames:v","1","-q:v","3",proof],{encoding:"utf8"});
if(ff.status!==0)throw Error(ff.stderr||"Cannot assemble photo-closeup proof");
console.log(`Pair: ${proof}`);
