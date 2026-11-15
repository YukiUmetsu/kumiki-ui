/** Private browser proof of the actual WM1+WM4 painting, not Storybook source. */
import {mkdir} from "node:fs/promises";
import {resolve,join} from "node:path";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {chromium} from "playwright";
import {createServer} from "vite";

const dir=resolve(process.argv.find(s=>s.startsWith("--out="))?.slice(6) ??
  "dist/wc19-unapproved-eye");
await mkdir(dir,{recursive:true});
const vite=await createServer({configFile:false,server:{middlewareMode:true},
  appType:"custom",logLevel:"error"});
let browser;
try{
  const {ExperimentalWatercolourEyeBrushPage}=await vite.ssrLoadModule(
    "/src/video/experimental/watercolour-eye-brush-page.tsx");
  browser=await chromium.launch({headless:true});
  const errors=[];
  const render=async(frame,scale,name)=>{
    const page=await browser.newPage({viewport:{width:640,height:480},
      deviceScaleFactor:scale});
    page.on("pageerror",e=>errors.push(String(e)));
    const html=renderToStaticMarkup(React.createElement(
      ExperimentalWatercolourEyeBrushPage,{frame,seed:83}));
    if(!html.includes("data-km-brush-stroke=")||!html.includes("data-km-wet-paper="))
      throw Error("This proof did not invoke the actual watercolor brush AND pigment.");
    await page.setContent("<!doctype html><html><head><meta charset='utf-8'>"+
      "<style>*{box-sizing:border-box}html,body{padding:0;margin:0;overflow:hidden;"+
      "background:#F7F0E5;width:640px;height:480px}</style></head><body>"+html+"</body></html>");
    await page.screenshot({path:join(dir,name),animations:"disabled"});
    if(frame===420){
      const crops={
        "iris":[345,187,522,330],
        "brow":[183,69,553,207],
        "upper-lid":[167,189,542,296],
        "lower-lid":[157,247,548,379],
        "skin":[161,281,566,453],
      };
      for(const [part,[x1,y1,x2,y2]] of Object.entries(crops)){
        await page.screenshot({path:join(dir,"wc19-"+part+"-3x.png"),
          clip:{x:x1,y:y1,width:x2-x1,height:y2-y1},animations:"disabled"});
      }
    }
    await page.close();
  };
  await render(83,1,"wc19-wet-gesture-native.png");
  await render(180,1,"wc19-partially-dry-native.png");
  await render(420,1,"wc19-dry-eye-native.png");
  await render(420,3,"wc19-dry-eye-3x.png");
  if(errors.length)throw Error(errors.join("\n"));
  console.log("WC19: real wet and dry WM1/WM4 strokes captured, NOT artist-approved.");
}finally{
  await browser?.close();
  await vite.close();
}
