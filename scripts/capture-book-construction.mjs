#!/usr/bin/env node
/** Close-up WebGL proof of the book's real spine and folio construction.
 * Build Storybook, serve it on port 6006, then run this script.
 */
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const out=resolve(process.argv.find(v=>v.startsWith("--out="))?.slice(6)??"dist/book-construction");
const port=Number(process.argv.find(v=>v.startsWith("--port="))?.slice(7)??"6006");
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,
  executablePath:process.env.KUMIKI_BROWSER_EXECUTABLE||undefined,
  args:["--disable-dev-shm-usage"]});
const views=["binding-inspection","folio-inspection","folio-raking-inspection","turning-leaf-inspection"];
try {
  const page=await browser.newPage({viewport:{width:1024,height:610},deviceScaleFactor:1});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  for(const name of views){
    const url=`http://127.0.0.1:${port}/iframe.html?id=motion-scene-book-3d--${name}&viewMode=story`;
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:120000});
    const hero=page.locator("[data-km-hero-viewer]");
    await hero.waitFor({state:"visible",timeout:120000});
    await page.waitForFunction(()=>document.querySelector("[data-km-hero-viewer] canvas")?.width>0,
      undefined,{timeout:120000});
    await page.waitForTimeout(1100);
    const path=join(out,`${name}.png`);
    await hero.screenshot({path,timeout:60000});
    console.log(`${name}: ${path}`);
  }
  if(errors.length)throw Error(`WebGL page errors: ${[...new Set(errors)].join("; ")}`);
}finally{await browser.close();}
const result=spawnSync("ffmpeg",["-y","-loglevel","error",
  ...views.flatMap(view=>["-i",join(out,`${view}.png`)]),
  "-filter_complex",views.map((_,i)=>`[${i}:v]scale=640:360[v${i}]`).join(";")+";"+
    "[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|640_0|0_360|640_360",
  "-frames:v","1","-q:v","3",join(out,"construction-contact-sheet.jpg")],{encoding:"utf8"});
if(result.status!==0)throw Error(result.stderr||"Cannot make construction sheet");
console.log(`Contact sheet: ${join(out,"construction-contact-sheet.jpg")}`);
