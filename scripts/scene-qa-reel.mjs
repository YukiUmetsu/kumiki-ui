#!/usr/bin/env node
/**
 * Assemble actual VideoExportStage captures into a reviewable 26-recipe reel.
 * Inputs must be exported MP4s; this never synthesizes or substitutes a scene.
 * Usage: node scripts/scene-qa-reel.mjs <directory>
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const ids = [
  "question-reveal","hidden-detail","process-journey","before-after",
  "side-by-side","cause-effect","scale-reveal","context-to-detail",
  "layered-cutaway","build-and-connect","transform-and-track","time-evolution",
  "data-story","consequence-chain","decision-branch","worked-example",
  "demonstration","guided-inspection","character-discovery","evidence-reveal",
  "follow-subject-through-sections","environment-reveal","page-turn-story",
  "orbit-world","timeline-journey","glass-data-reveal",
];
if (process.argv.length !== 3) throw Error("Usage: node scripts/scene-qa-reel.mjs <output-directory>");
const dir = resolve(process.argv[2]), segments = join(dir,"reel-segments");
await mkdir(segments,{recursive:true});
async function run(bin,args) {
  await new Promise((ok,fail)=>{
    const p=spawn(bin,args,{stdio:"inherit"});
    p.once("error",fail);
    p.once("close",code=>code===0?ok():fail(new Error(bin+" failed: "+code)));
  });
}
function quotePath(value) {return "'"+value.replaceAll("'","'\\''")+"'";}
function title(id) {return id.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ");}
const chapters = [";FFMETADATA1"];
const timings=[];
let elapsed=0;
for (let i=0;i<ids.length;i++){
  const id=ids[i], input=join(dir,id+".mp4");
  await stat(input); // strict: never claim a missing recipe is represented
  const output=join(segments,String(i+1).padStart(2,"0")+".mp4");
  // Normalize aspect ratio without cropping: source can be landscape or portrait.
  // Labels occupy a fixed lower band outside the original capture.
  const vf=[
    "scale=960:486:force_original_aspect_ratio=decrease",
    "pad=960:486:(ow-iw)/2:(oh-ih)/2:color=0x111b2b",
    "pad=960:540:0:0:color=0x111b2b",
    "drawbox=x=0:y=486:w=960:h=54:color=0x14273c:t=fill",
    "drawtext=textfile="+join(segments,"label-"+i+".txt").replaceAll("\\","/")+
      ":fontcolor=white:fontsize=22:x=20:y=503",
  ].join(",");
  await writeFile(join(segments,"label-"+i+".txt"),
    String(i+1).padStart(2,"0")+"/26  "+title(id)+"   |   "+id+"   |   actual component capture\n");
  await run("ffmpeg",["-hide_banner","-loglevel","error","-y","-i",input,
    "-vf",vf,"-an","-r","30","-c:v","libx264","-preset","veryfast",
    "-pix_fmt","yuv420p","-crf","21","-movflags","+faststart",output]);
  const p=spawn("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",output],{stdio:["ignore","pipe","inherit"]});
  let data="";for await(const chunk of p.stdout)data+=chunk;
  const duration=Number(data.trim());if(!Number.isFinite(duration)||duration<=0)throw Error("Invalid duration "+id);
  const start=Math.round(elapsed*1000),end=Math.round((elapsed+duration)*1000);
  chapters.push("[CHAPTER]","TIMEBASE=1/1000","START="+start,"END="+end,"title="+String(i+1).padStart(2,"0")+" "+title(id));
  timings.push({recipe:id,video:id+".mp4",startSeconds:elapsed,durationSeconds:duration});
  elapsed+=duration;
}
const list=ids.map((_,i)=>"file "+quotePath(join(segments,String(i+1).padStart(2,"0")+".mp4"))).join("\n")+"\n";
await writeFile(join(segments,"list.txt"),list);
await writeFile(join(segments,"chapters.ffmeta"),chapters.join("\n")+"\n");
await run("ffmpeg",["-hide_banner","-loglevel","error","-y",
  "-f","concat","-safe","0","-i",join(segments,"list.txt"),
  "-i",join(segments,"chapters.ffmeta"),"-map","0:v","-map_metadata","1",
  "-c","copy","-movflags","+faststart",join(dir,"kumiki-26-scene-qa-reel.mp4")]);
const index=["# Kumiki UI | 26 scene recipe QA reel","",
  "This video shows actual captured components, using original self-contained SVG test fixtures.",
  "It does not certify photorealism, production asset rights or premium visual acceptance.",
  "Inspect the individual MP4s for readability, continuity, timing, crop, visual hierarchy and motion.",
  "",
  "| # | Recipe | Reel offset | Individual clip |","|---:|---|---:|---|",
  ...timings.map((x,i)=>"| "+(i+1)+" | "+x.recipe+" | "+x.startSeconds.toFixed(2)+"s | `"+x.video+"` |"),
  "","## QA checklist","",
  "- Check beginning, transformation boundary, end and backward seek on the source story.",
  "- Check 16:9 and 9:16 framing, text and UI-safe space, long/CJK captions, and reduced motion.",
  "- Check media provenance, licenses and original asset quality separately.",
  "- Review individual clips in addition to the montage; reel frame rate and canvas are normalized for comparison.",
  ""];
await writeFile(join(dir,"QA-INDEX.md"),index.join("\n"));
await writeFile(join(dir,"QA-TIMINGS.json"),JSON.stringify(timings,null,2)+"\n");
console.log("Reel complete: "+ids.length+" recipes, "+elapsed.toFixed(2)+" seconds");
