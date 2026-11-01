#!/usr/bin/env node
/** Entirely original, deterministic 48 kHz book-film soundtrack.
 * The noise is filtered paper/cloth synthesis, not a third-party recording.
 * node scripts/build-epic-book-audio.mjs <output-dir>
 * Requires ffmpeg to mix Kumiki's two declared cue lanes.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createAudioMixManifest, audioMixFfmpegArgs } from "../registry/video/audio-visual-cue.ts";

const folder=process.argv[2];
if(!folder)throw Error("Provide an output directory for the original soundtrack.");
const directory=resolve(folder);
if(await access(join(directory,"mix.wav")).then(()=>true,()=>false))
  throw Error("An audio mix already exists there; choose a new revision directory.");
await mkdir(directory,{recursive:true});
const RATE=48000,LENGTH=10,SAMPLES=RATE*LENGTH;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
let seed=0x9162ace0;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};

function renderTrack(processSample){
  const result=new Float32Array(SAMPLES);
  for(let n=0;n<SAMPLES;n++)result[n]=processSample(n/RATE,n);
  return result;
}
// Whispering uncoated paper has a long soft body, airy scuffs and tiny
// transient grain. A pair of causal filters prevents white-noise hiss.
const rustle=(start,duration,volume,frequency)=>{
  let low=0,mid=0;
  const highCut=1-Math.exp(-2*Math.PI*frequency/RATE);
  const baseCut=1-Math.exp(-2*Math.PI*520/RATE);
  return (time)=>{
    const n=noise();low+=baseCut*(n-low);mid+=highCut*(n-mid);
    const p=(time-start)/duration;
    if(p<0||p>=1)return 0;
    const envelope=Math.pow(Math.sin(Math.PI*p),.9);
    const movement=.63+.24*Math.sin(2*Math.PI*p*6)+.13*Math.sin(2*Math.PI*p*15);
    return volume*envelope*movement*(.47*mid+.7*low);
  };
};
const cover=rustle(.59,1.17,.22,1200);
const pageOne=rustle(2.82,2.57,.19,2600);
const pageTwo=rustle(6.85,2.45,.22,2900);
const edges=[2.98,3.41,4.02,4.68,7.03,7.61,8.30,8.91];
const fx=renderTrack(t=>{
  let sample=cover(t)+pageOne(t)+pageTwo(t);
  // A brief, dull leather-hinge creak during the board opening.
  const hinge=clamp((t-.65)/.8);
  if(hinge>0&&hinge<1)sample+=.021*Math.sin(2*Math.PI*(112*t+70*t*t))*Math.sin(Math.PI*hinge);
  // Fibre taps when the page changes curvature. No single-click digital spikes.
  for(const edge of edges){const d=t-edge;
    if(d>=0&&d<.058)sample+=.068*Math.exp(-80*d)*(Math.sin(2*Math.PI*850*d)+.3*Math.sin(2*Math.PI*2100*d));}
  // Book landing softly on the desk at the very end.
  const d=t-9.57;
  if(d>=0&&d<.25)sample+=.06*Math.sin(2*Math.PI*97*d)*Math.exp(-26*d);
  return sample;
});
// Spare original D-minor felt-key motif: detuned sine/overtones with a
// long, mellow release and restrained harmonic motion. No samples/music files.
const notes=[
  {t:.40,hz:146.832,amp:.06,len:2.8},
  {t:1.62,hz:174.614,amp:.051,len:3.0},
  {t:3.05,hz:220,amp:.044,len:2.5},
  {t:5.42,hz:261.626,amp:.043,len:3.2},
  {t:7.45,hz:293.665,amp:.046,len:2.2},
  {t:8.88,hz:220,amp:.027,len:1.2},
];
const music=renderTrack(t=>{
  let sum=0;
  for(const n of notes){
    const dt=t-n.t;
    if(dt<0||dt>n.len)continue;
    const env=smooth(dt/.018)*Math.pow(1-smooth(dt/n.len),1.3);
    const phase=2*Math.PI*n.hz*dt;
    const fundamental=Math.sin(phase)+.17*Math.sin(2*phase+.03)+.055*Math.sin(3*phase+.07);
    const companion=.07*Math.sin(2*Math.PI*(n.hz*.998)*dt);
    sum+=n.amp*env*(fundamental+companion);
  }
  return sum;
});
function wavFile(samples){
  const stereo=2, bytes=2,header=44;
  const data=Buffer.allocUnsafe(header+SAMPLES*stereo*bytes);
  data.write("RIFF",0);data.writeUInt32LE(data.byteLength-8,4);
  data.write("WAVEfmt ",8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);
  data.writeUInt16LE(stereo,22);data.writeUInt32LE(RATE,24);
  data.writeUInt32LE(RATE*stereo*bytes,28);data.writeUInt16LE(stereo*bytes,32);
  data.writeUInt16LE(16,34);data.write("data",36);data.writeUInt32LE(SAMPLES*stereo*bytes,40);
  for(let i=0;i<SAMPLES;i++){
    const mono=clamp(samples[i],-1,1);
    // Small stereo depth without a channel-delay echo or correlation collapse.
    const previous=i>73?samples[i-73]:0;
    data.writeInt16LE(Math.round(mono*29491),44+i*4);
    data.writeInt16LE(Math.round(clamp(.88*mono+.12*previous,-1,1)*29491),46+i*4);
  }
  return data;
}
await writeFile(join(directory,"paper-and-leather.wav"),wavFile(fx));
await writeFile(join(directory,"felt-keys.wav"),wavFile(music));
const cues={id:"epic-book-original-score",fps:{num:30,den:1},durationFrames:300,
  lanes:[
    {id:"paper",kind:"sfx",startFrame:0,assetRef:"paper-and-leather.wav",gainDb:7},
    {id:"score",kind:"music",startFrame:0,assetRef:"felt-keys.wav",gainDb:7},
  ],
};
const manifest=createAudioMixManifest(cues);
await writeFile(join(directory,"cues.json"),JSON.stringify(cues,null,2)+"\n");
await writeFile(join(directory,"mix-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
const args=audioMixFfmpegArgs(manifest,"mix.wav",{sampleRate:RATE});
await new Promise((done,fail)=>{
  const child=spawn("ffmpeg",args,{cwd:directory,stdio:["ignore","ignore","pipe"]});
  let errors="";child.stderr.on("data",data=>{errors+=data;});
  child.once("error",fail);child.once("close",code=>code===0?done():fail(Error(errors.slice(-1400))));
});
console.log(`Original 10-second stereo book soundtrack: ${join(directory,"mix.wav")}`);
