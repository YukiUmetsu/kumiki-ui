#!/usr/bin/env node
/** Agent-friendly, local, deterministic catalog discovery.
 * Examples:
 *   npm run catalog:find -- --query="ATM" --renderer=three
 *   npm run catalog:find -- --query="loan" --format=json
 *   npm run catalog:find -- --id=object:finance:credit-card:2d --format=json
 *   npm run catalog:find -- --all --format=json > catalog.json
 *   npm run catalog:check
 */
import { prepareCatalog, validateCatalog } from "./catalog-data.mjs";
import { searchCatalog, searchCatalogPartial } from "../src/catalog/catalog-core.ts";

function parse(args){
  const out={};
  const allowed=new Set(["query","format","domain","renderer","type","limit","id"]);
  for(const arg of args){
    if(arg==="--all"||arg==="--check"){
      const key=arg.slice(2);
      if(out[key])throw Error("Repeated flag "+arg);
      out[key]=true;continue;
    }
    const match=/^--([\w-]+)=(.*)$/.exec(arg);
    if(!match||!allowed.has(match[1])||out[match[1]]!==undefined)
      throw Error("Unexpected catalog argument: "+arg);
    out[match[1]]=match[2];
  }
  if(out.check&&Object.keys(out).length>1)throw Error("--check must be used alone.");
  if(out.format!==undefined&&out.format!=="json"&&out.format!=="text")
    throw Error("Use --format=json or --format=text.");
  if(out.limit!==undefined&&(!/^\d+$/.test(out.limit)||Number(out.limit)<1||
    Number(out.limit)>10000))throw Error("--limit must be 1–10000.");
  return out;
}
const flags=parse(process.argv.slice(2));
if(flags.check){
  const {entries,stories,errors}=validateCatalog();
  if(errors.length)throw Error("Catalog parity FAILED:\n  - "+errors.join("\n  - "));
  console.log("Catalog OK: "+entries.length+" indexed entries; "+stories.size+
    " verified Storybook stories; no LLM, network or screenshots.");
}else{
  const entries=prepareCatalog();
  if(flags.id&&!entries.some(e=>e.id===flags.id))
    throw Error("Catalog entry not found: "+flags.id);
  const known=(key)=>[...new Set(entries.map(e=>e[key]))];
  for(const key of ["type","renderer","domain"]){
    if(flags[key]&&!known(key).includes(flags[key]))
      throw Error("Unknown catalog "+key+": "+flags[key]+". Valid: "+known(key).join(", "));
  }
  const results=flags.id?entries.filter(e=>e.id===flags.id):searchCatalog(entries,{
    query:flags.all?"":flags.query??"",
    domain:flags.domain,renderer:flags.renderer,type:flags.type,
    limit:flags.all?undefined:Number(flags.limit??20),
  });
  // Strict search found nothing: offer the closest entries, labelled with the words they do not cover.
  const partial=!results.length&&flags.query?searchCatalogPartial(entries,{
    query:flags.query,domain:flags.domain,renderer:flags.renderer,type:flags.type,limit:Number(flags.limit??20),
  }):[];
  if(flags.format==="json")console.log(JSON.stringify({
    schemaVersion:1,matching:results.length,total:entries.length,results,
    ...(partial.length?{partialMatches:partial.map(row=>({id:row.entry.id,title:row.entry.title,
      domain:row.entry.domain,matched:row.matched,missing:row.missing}))}:{}),
  },null,2));
  else {
    console.log(results.length+" / "+entries.length+" catalog entries");
    for(const row of partial)console.log("partial: "+row.entry.id+"  "+row.entry.title+"  (missing: "+row.missing.join(", ")+")");
    for(const e of results){
      console.log(e.id+"  ["+e.renderer+" / "+e.domain+"] "+e.title);
      console.log("  source: "+e.files.join(", "));
      console.log("  registry: "+e.registryItem+"; install order: "+e.installOrder.join(" → "));
      if(e.storyId)console.log("  Storybook: "+e.storyId);
      if(e.guidance){
        console.log("  jobs: "+e.guidance.jobs.join(", "));
        console.log("  use: "+e.guidance.use);
        console.log("  avoid: "+e.guidance.avoid);
        console.log("  settings: "+e.guidance.settings);
      }
      if(e.review==="not-reviewed")console.log(e.renderer==="three"?"  3D status: NOT visually approved":"  Visual review: pending");
    }
  }
}
