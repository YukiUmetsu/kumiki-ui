/**
 * Private WC17 visual proof. Does not register a Storybook story or publish a
 * FilmStage human. Generates real browser screenshots of the React/SVG asset.
 * Review these images at native resolution and 3x before considering release.
 */
import {mkdir} from "node:fs/promises";
import {join,resolve} from "node:path";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {chromium} from "playwright";
import {createServer} from "vite";

const out=resolve(process.argv.find(s=>s.startsWith("--out="))?.slice(6)
  ?? "dist/wc17-private-portrait");
await mkdir(out,{recursive:true});
const server=await createServer({
  configFile:false,
  server:{middlewareMode:true},appType:"custom",
  logLevel:"error",
});
let browser;
try{
  const {experimentalWatercolourPortrait}=await server.ssrLoadModule(
    "/src/video/experimental/watercolour-portrait-study.ts");
  const {WatercolourIllustration}=await server.ssrLoadModule(
    "/registry/video/watercolour-illustration.tsx");
  const spec=experimentalWatercolourPortrait(83);
  const svg=renderToStaticMarkup(React.createElement(WatercolourIllustration,
    {spec,frame:0,reducedMotion:true}));
  if(!svg.includes("near-eye-lid-clipping")||!svg.includes("face-primary-opaque"))
    throw new Error("Unapproved study did not render anatomy");
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:550,height:688},
    deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.setContent("<!doctype html><html><head><meta charset='utf-8'>"+
    "<style>*{box-sizing:border-box}html,body{width:100%;height:100%;"+
    "margin:0;padding:0;overflow:hidden;background:#F5EEE5}"+
    "svg{display:block}</style></head><body>"+svg+"</body></html>");
  await page.screenshot({path:join(out,"wc17-private-full-native.png"),
    animations:"disabled"});
  await page.screenshot({path:join(out,"wc17-private-face-native.png"),
    clip:{x:172,y:76,width:279,height:367},animations:"disabled"});
  const regions={
    "near-eye":[244,170,353,249],
    "far-eye":[352,164,440,252],
    nose:[303,226,418,312],
    mouth:[324,306,421,373],
    hairline:[74,0,441,226],
    jaw:[168,290,466,487],
  };
  for(const [id,[x1,y1,x2,y2]] of Object.entries(regions)){
    await page.screenshot({path:join(out,"wc17-private-"+id+"-3x.png"),
      clip:{x:x1,y:y1,width:x2-x1,height:y2-y1},
      scale:"css",animations:"disabled"});
  }
  await page.setViewportSize({width:1100,height:1376});
  await page.locator("svg").evaluate(el=>{
    el.style.width="1100px";el.style.height="1376px";
  });
  await page.screenshot({path:join(out,"wc17-private-full-2x.png"),
    animations:"disabled"});
  if(errors.length)throw new Error("Browser exceptions: "+errors.join("\n"));
  console.log("WC17 PRIVATE proof only; not approved, not a public Storybook asset.");
  console.log("Generated native and 2x browser screenshots in "+out);
}finally{
  await browser?.close();
  await server.close();
}
