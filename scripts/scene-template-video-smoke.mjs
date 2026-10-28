#!/usr/bin/env node
/**
 * Source-only video export verification for the 26 semantic scene recipes.
 * Uses Kumiki's existing VideoExportStage + export-video.mjs + ffprobe.
 * It deliberately exports only two post-reveal frames from each template:
 * browser geometry and full-scene transitions are separately inspected by
 * tests/e2e-storybook/scene-templates.spec.ts.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RECIPES=[
  "question-reveal","hidden-detail","before-after","side-by-side","cause-effect",
  "scale-reveal","context-to-detail","layered-cutaway","build-and-connect",
  "transform-and-track","time-evolution","data-story","consequence-chain",
  "decision-branch","worked-example","demonstration","guided-inspection",
  "character-discovery","evidence-reveal","environment-reveal","page-turn-story",
  "orbit-world","timeline-journey","glass-data-reveal",
];
function run(program,args,options={}) {
  return new Promise((resolve,reject)=>{
    const proc=spawn(program,args,{stdio:"inherit",...options});
    proc.on("error",reject);
    proc.on("exit",code=>code===0?resolve():reject(new Error(program+" exited "+code+" for "+args.join(" "))));
  });
}
async function untilAvailable() {
  const deadline=Date.now()+90000;
  while(Date.now()<deadline) {
    try {
      const response=await fetch("http://127.0.0.1:6006/iframe.html");
      if(response.ok)return;
    } catch { /* Storybook is still starting */ }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error("Storybook did not become available at localhost:6006");
}
const directory=await mkdtemp(join(tmpdir(),"km-scene-exports-"));
const server=spawn("npm",["run","storybook","--","--host","127.0.0.1","--ci"],{stdio:"inherit"});
let completed=0;
try{
  await untilAvailable();
  const stories=[
    ...RECIPES.map(id=>({id,story:"motion-scene-template-capture--"+id})),
    {id:"follow-subject-through-sections",story:"motion-follow-subject-through-sections--capture"},
    {id:"process-journey",story:"motion-process-journey-capture--default"},
  ];
  for(const {id,story} of stories){
    const output=join(directory,id+".mp4");
    await run(process.execPath,["scripts/export-video.mjs","--story="+story,"--startFrame=90",
      "--frames=2","--output="+output]);
    const file=await stat(output);
    if(file.size<1000)throw new Error("Video output is implausibly small: "+id);
    completed++;
    process.stdout.write("Verified "+completed+"/"+stories.length+": "+id+" ("+file.size+" bytes)\n");
  }
  if(completed!==26)throw new Error("Not every scene exported.");
  process.stdout.write("Video exports PASS: 26/26 stories with ffprobe verification.\n");
} finally {
  server.kill("SIGTERM");
  await rm(directory,{recursive:true,force:true});
}
