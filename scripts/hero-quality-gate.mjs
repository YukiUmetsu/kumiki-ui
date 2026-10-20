#!/usr/bin/env node
/** Deterministic quality-evidence gate: no GPU, browser, LLM, CV or network.
 * Validates independently reviewed 3D hero release approvals by checking
 * exact source and screenshot file hashes and PNG dimensions. No new
 * approvals are inferred from having attractive meshes or generated PNGs.
 * Usage: npm run hero:quality
 */
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
const relative=(value,base)=>{
  if(typeof value!=="string" || value.startsWith("/") ||
     value.includes("\\") || !value.split("/").every(p=>p&&p!=="."&&p!=="..") ||
     !value.startsWith(base))
    throw new Error("Invalid approval evidence path: "+String(value));
  return value;
};
const fileAt=async path=>{
  const abs=resolve(root,path);
  const real=await realpath(abs);
  if(!real.startsWith(root+sep))throw new Error("Evidence points outside project root: "+path);
  return readFile(real);
};
const hash=data=>createHash("sha256").update(data).digest("hex");
const fail=message=>{throw new Error("Hero approval gate: "+message);};
const source="docs/verification/hero-approvals.json";
const manifest=JSON.parse((await fileAt(source)).toString("utf8"));
if(manifest.schemaVersion!==1||!Array.isArray(manifest.approvals))
  fail("Unsupported review manifest schema.");
const seen=new Set();
const views=["front","quarter","side","detail"];
for(const record of manifest.approvals){
  if(!record||record.decision!=="approved"||typeof record.kind!=="string"||
     !record.kind.trim()||seen.has(record.kind))
    fail("An approval needs a unique named asset.");
  seen.add(record.kind);
  if(typeof record.reviewer!=="string"||!record.reviewer.trim()||
     typeof record.notes!=="string"||!record.notes.trim()||
     !/^\\d{4}-\\d{2}-\\d{2}$/.test(record.reviewedAt)||
     !Number.isFinite(Date.parse(record.reviewedAt+"T00:00:00Z")))
    fail(record.kind+": missing reviewer, valid review date or review notes.");
  if(!Array.isArray(record.referenceUrls)||!record.referenceUrls.length)
    fail(record.kind+": no photographic source references.");
  for(const url of record.referenceUrls){
    let ref;try{ref=new URL(url);}catch{fail(record.kind+": invalid reference URL.");}
    if(ref.protocol!=="https:"||ref.pathname.length<2)
      fail(record.kind+": reference must be a specific HTTPS source page.");
  }
  if(!Array.isArray(record.sourceFiles)||!record.sourceFiles.length)
    fail(record.kind+": no pinned source files.");
  const sources=new Set();
  for(const file of record.sourceFiles){
    if(!file || !/^[0-9a-f]{64}$/i.test(file.sha256))
      fail(record.kind+": bad source digest.");
    relative(file.path,"registry/");
    if(sources.has(file.path))fail(record.kind+": duplicate source file.");
    sources.add(file.path);
    if(hash(await fileAt(file.path))!==file.sha256.toLowerCase())
      fail(record.kind+": source changed since approval: "+file.path);
  }
  if(!Array.isArray(record.captures)||record.captures.length!==views.length)
    fail(record.kind+": exactly four reviewed capture views required.");
  const captured=new Set();
  for(const frame of record.captures){
    if(!views.includes(frame?.view)||captured.has(frame.view))
      fail(record.kind+": capture view duplicated or unknown.");
    captured.add(frame.view);
    if(!Number.isSafeInteger(frame.width)||frame.width<1||
       !Number.isSafeInteger(frame.height)||frame.height<1||
       !/^[0-9a-f]{64}$/i.test(frame.sha256))
      fail(record.kind+": invalid capture dimensions or checksum.");
    relative(frame.path,"docs/verification/assets/");
    if(!frame.path.endsWith(".png"))fail(record.kind+": capture must be PNG.");
    const bytes=await fileAt(frame.path);
    if(bytes.length<24||
      !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
      bytes.readUInt32BE(16)!==frame.width||bytes.readUInt32BE(20)!==frame.height)
      fail(record.kind+": capture PNG header/dimensions mismatch: "+frame.path);
    if(hash(bytes)!==frame.sha256.toLowerCase())
      fail(record.kind+": capture changed since approval: "+frame.path);
  }
  if(views.some(view=>!captured.has(view)))
    fail(record.kind+": missing mandatory camera comparison view.");
}
process.stdout.write("Hero quality evidence: "+seen.size+" human-approved assets verified; "+
  "unapproved assets remain WIP. No image/LLM checks were run.\\n");
