#!/usr/bin/env node
/** Explicit, human-reviewed photo-to-render audit for the finance object kit.
 * Captures every 3D asset from its Storybook preview and writes a reference
 * comparison gallery. Does not classify image similarity or certify realism.
 *
 * Usage:
 *   npm run finance:3d:audit
 *   npm run finance:3d:audit -- --limit=5 --output=dist/finance-review
 *   npm run finance:3d:audit -- --kind=credit-card
 * Start Storybook first: npm run storybook
 */
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {chromium} from "playwright";

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
  const match=/^--(limit|output|kind|port)=(.+)$/.exec(arg);
  if(!match)throw new Error("Unexpected audit argument: "+arg);
  return [match[1],match[2]];
}));
const limit=args.limit===undefined?1000:Number(args.limit);
const port=args.port===undefined?6006:Number(args.port);
if(!Number.isSafeInteger(limit)||limit<1||limit>1000)
  throw new Error("--limit must be a positive integer ≤ 1000.");
if(!Number.isSafeInteger(port)||port<1024||port>65535)
  throw new Error("--port must be between 1024 and 65535.");
const root=resolve(args.output??"dist/finance-3d-audit");
const base="http://127.0.0.1:"+port;
const escape=(value)=>String(value).replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;",
}[ch]));
const gallery=new URL(base+"/iframe.html");
gallery.searchParams.set("id","domains-finance-objects--all-objects");
gallery.searchParams.set("viewMode","story");
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({
    viewport:{width:1400,height:920},deviceScaleFactor:1,
    reducedMotion:"no-preference",
  });
  await page.goto(gallery.toString(),{waitUntil:"domcontentloaded"});
  await page.locator("[data-km-finance-audit-ledger]").waitFor({state:"attached",timeout:60000});
  const ledger=JSON.parse(await page.locator("[data-km-finance-audit-ledger]").textContent());
  const selected=args.kind?ledger.filter(item=>item.kind===args.kind):ledger.slice(0,limit);
  if(!selected.length)throw new Error("No finance asset matches --kind="+args.kind);
  await mkdir(root,{recursive:true});
  const result=[];
  for(const [index,asset] of selected.entries()){
    const views=[];
    for(const view of ["front","quarter","side","detail"]){
      const url=new URL(base+"/iframe.html");
      url.searchParams.set("id","domains-finance-objects--bank-3-d");
      url.searchParams.set("viewMode","story");
      url.searchParams.set("kmAsset",asset.kind);
      url.searchParams.set("kmView",view);
      const file=asset.kind+"-"+view+".png";
      let failure="";
      try{
        await page.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:60000});
        await page.waitForFunction(()=>window.__kmVideoExport?.seek,
          null,{timeout:60000});
        await page.evaluate(async()=>{await window.__kmVideoExport.seek(179);});
        const target=page.locator("[data-km-video-capture]");
        if(await target.count()!==1)throw new Error("Missing or duplicated capture surface.");
        if(await target.locator("[role=alert]").count())
          throw new Error("3D preview has a rendering error.");
        await target.screenshot({path:join(root,file),animations:"disabled",
          caret:"hide",timeout:30000});
      }catch(err){failure=String(err);}
      views.push({view,render:failure?"":file,error:failure});
    }
    result.push({asset,views});
    process.stdout.write(`Reviewed capture set ${index+1}/${selected.length}: ${asset.kind}; ${views.filter(v=>v.error).length} failed views\n`);
  }
  const cards=result.map(({asset,views})=>{
    const refs=asset.referencePages.map(href=>
      `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">Open reference photography ↗</a>`
    ).join(" ");
    const checklist=asset.expectedDetails.map(t=>`<li>${escape(t)}</li>`).join("");
    const captures=views.map(({view,render,error})=>
      `<figure><figcaption>${escape(view)} view</figcaption>
      ${render?`<img loading="lazy" alt="${escape(asset.kind)} ${escape(view)} render" src="${escape(render)}">`
        :`<p class="error">${escape(error)}</p>`}</figure>`).join("");
    return `<article><h2>${escape(asset.kind)}</h2><p class="tag">${escape(asset.status)}</p>
      <section class="views">${captures}</section>
      <p><b>Reference photos:</b> ${refs||"Missing — asset cannot be quality-certified."}</p>
      <p><b>Compare:</b></p><ul>${checklist}</ul>
      <p>Review visible anatomy, mechanical assembly, materials and real-world scale
      in all four views. The captures are not automatically passed or graded.</p></article>`;
  }).join("\n");
  const html=`<!doctype html><html lang="en"><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kumiki finance 3D photograph comparison</title>
  <style>
  body{margin:0;padding:36px;background:#091722;color:#EAF5FA;font:15px/1.6 system-ui,sans-serif}
  h1{font-size:30px;letter-spacing:-.03em}p{color:#A7C1CC}b{color:#D5E9F1}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(390px,1fr));gap:20px}
  article{background:#102736;border:1px solid #294A5A;border-radius:16px;padding:18px}
  h2{margin:0 0 8px}.tag{color:#EDC37D;text-transform:uppercase;letter-spacing:.1em;font-size:11px}
  .views{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  figure{margin:0;background:#172D38;padding:5px;border-radius:8px}
  figcaption{font-size:12px;text-transform:uppercase;color:#C6DEEA}
  img{width:100%;height:auto;display:block;background:#172D38}
  a{display:inline-block;color:#98E6D2;margin-right:8px}.error{color:#FA9DAD}
  li{margin:2px 0}small{color:#90AABB}
  </style><h1>Finance Object 3D | Reference Comparison</h1>
  <p>These are <b>uncertified screenshots</b>. Match each view to reference photographs.
  Copyrighted source photos are linked, not reproduced. Reviewer must approve manually
  and record a dated decision; no AI screenshot grader is used.</p>
  <p>Captured ${selected.length} assets × 4 views. ${result.flatMap(x=>x.views).filter(x=>x.error).length} failed views.</p>
  <div class="grid">${cards}</div>
  <footer><small>Generated locally; references and status remain author metadata, not photoreal guarantees.</small></footer></html>`;
  await writeFile(join(root,"index.html"),html,"utf8");
  await writeFile(join(root,"report.json"),JSON.stringify(result,null,2)+"\n","utf8");
  process.stdout.write("Open "+join(root,"index.html")+" for manual photo comparison.\n");
  if(result.some(x=>x.views.some(view=>view.error)))process.exitCode=1;
}finally{
  await browser.close();
}
