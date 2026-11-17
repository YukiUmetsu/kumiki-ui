/**
 * ArtCraft Stage-1 head: validate a measured CLI output against the ORIGINAL
 * local image bytes and the artist's currently selected annotation session.
 *
 * A JSON proof file is not trusted merely because it has plausible SHA strings
 * or five RGB triples. All coordinates, rectangles, rights metadata, source
 * and native image byte hashes MUST agree with the two independently loaded
 * files and the live 18+5 annotations. Pixel means still require an honest
 * native capture and independent artist critique: this is NOT a signature,
 * photographic similarity guarantee, biometric system or approval gate.
 */
import {
  HEAD_FIDELITY_LANDMARK_IDS,HEAD_FIDELITY_TONES,
  evaluatePencilHeadFidelity,
  type HeadFidelityPoint,type HeadFidelityTone,
  type PencilHeadFidelityEvidence,type PencilHeadFidelityReport,
} from "./colored-pencil-head-fidelity";
import type {HeadAnnotationProvenance,HeadAnnotationSession} from
  "./colored-pencil-head-annotation";
import type {PencilHeadCheckpointImages} from
  "./colored-pencil-head-checkpoint";

type JsonObject=Record<string,unknown>;
const isObject=(v:unknown):v is JsonObject=>
  v!==null&&typeof v==="object"&&!Array.isArray(v);
const asObject=(v:unknown,label:string):JsonObject=>{
  if(!isObject(v))throw new Error(label+" must be a JSON object");
  return v;
};
const exactKeys=(v:JsonObject,keys:readonly string[],label:string)=>{
  if(Object.keys(v).length!==keys.length||
    Object.keys(v).some(k=>!keys.includes(k))||
    keys.some(k=>!(k in v)))
    throw new Error(label+" has missing or unexpected properties");
};
const int=(v:unknown)=>Number.isSafeInteger(v);
const signature=/^[0-9a-f]{64}$/;
const fail=(what:string):never=>{throw new Error(what);};
const pointIds=new Set<string>(HEAD_FIDELITY_LANDMARK_IDS);
const toneIds=new Set<string>(HEAD_FIDELITY_TONES);
const sides=["source","output"] as const;
type Side=typeof sides[number];
type ImageContext={
  images:PencilHeadCheckpointImages;
  annotations:HeadAnnotationSession;
  reference:HeadAnnotationProvenance;
};
const parseFile=(input:unknown,which:Side,ctx:ImageContext)=>{
  const file=asObject(input,which+" image");
  const source=which==="source";
  exactKeys(file,source?["url","license","credit","width","height","sha256"]:
    ["width","height","sha256"],which+" image");
  const actual=ctx.images[which];
  if(file.width!==actual.dimensions.width||
    file.height!==actual.dimensions.height||
    file.sha256!==actual.sha256||
    typeof file.sha256!=="string"||
    !signature.test(file.sha256))
    fail(which+" exact native dimensions or SHA-256 do not match loaded local image bytes");
  if(source&&(file.url!==ctx.reference.url||
    file.license!==ctx.reference.license||
    file.credit!==ctx.reference.credit))
    fail("Original photographer, license or source URL differs from current artist annotations");
  return file;
};
const parsePoints=(input:unknown,which:Side,ctx:ImageContext)=>{
  if(!Array.isArray(input))
    throw new Error(which+" requires exactly 18 independently placed contour points");
  if(input.length!==HEAD_FIDELITY_LANDMARK_IDS.length)
    throw new Error(which+" requires exactly 18 independently placed contour points");
  const originals=ctx.annotations[which].landmarks;
  if(originals.length!==18)
    fail(which+" live annotation session does not contain 18 points");
  const found=new Set<string>();
  const points:HeadFidelityPoint[]=[];
  for(const item of input){
    const p=asObject(item,which+" landmark");
    exactKeys(p,["id","x","y"],which+" landmark");
    const id=p.id;
    if(typeof id!=="string")
      throw new Error(which+" has duplicate, unknown or non-pixel landmark data");
    if(!pointIds.has(id)||found.has(id)||!int(p.x)||!int(p.y))
      throw new Error(which+" has duplicate, unknown or non-pixel landmark data");
    found.add(id);
    const original=originals.find(x=>x.id===id);
    if(!original||original.x!==p.x||original.y!==p.y)
      fail(which+" landmark "+p.id+" is stale or differs from independent photo annotation");
    points.push({id:p.id as HeadFidelityPoint["id"],
      x:p.x as number,y:p.y as number});
  }
  return points;
};
const parseTones=(input:unknown,which:Side,ctx:ImageContext)=>{
  if(!Array.isArray(input))
    throw new Error(which+" requires five measured nonoverlapping tone samples");
  if(input.length!==HEAD_FIDELITY_TONES.length)
    throw new Error(which+" requires five measured nonoverlapping tone samples");
  const originals=ctx.annotations[which].tones;
  if(originals.length!==5)
    fail(which+" live annotation session does not contain five rectangles");
  const found=new Set<string>();
  const tones:HeadFidelityTone[]=[];
  for(const item of input){
    const tone=asObject(item,which+" measured tone");
    exactKeys(tone,["id","rect","meanRgb"],which+" measured tone");
    const id=tone.id;
    if(typeof id!=="string")
      throw new Error(which+" has duplicate or unknown measured value role");
    if(!toneIds.has(id)||found.has(id))
      throw new Error(which+" has duplicate or unknown measured value role");
    found.add(id);
    const rect=asObject(tone.rect,which+" measured region");
    exactKeys(rect,["x","y","width","height"],which+" measured region");
    const original=originals.find(x=>x.id===id);
    if(!original||Object.keys(original.rect).some(key=>
      !int(rect[key])||rect[key]!==original.rect[key as keyof typeof original.rect]))
      fail(which+" "+id+" value region is stale or differs from independent artist placement");
    const rgb=tone.meanRgb;
    if(!Array.isArray(rgb)||rgb.length!==3||
      rgb.some(n=>!int(n)||n<0||n>255))
      fail(which+" "+id+" requires real 8-bit native sRGB measurements");
    tones.push({
      id:id as HeadFidelityTone["id"],
      rect:{x:rect.x as number,y:rect.y as number,
        width:rect.width as number,height:rect.height as number},
      meanRgb:rgb as [number,number,number],
    });
  }
  return tones;
};

export type ReviewedHeadEvidence={
  /** Even a numerically measurement-ready result is never artist approval. */
  report:PencilHeadFidelityReport;
  sourceLandmarks:HeadFidelityPoint[];
  outputLandmarks:HeadFidelityPoint[];
  sourceTones:HeadFidelityTone[];
  outputTones:HeadFidelityTone[];
};

export function reviewMeasuredHeadEvidence(
  data:unknown,ctx:ImageContext,
):ReviewedHeadEvidence{
  const root=asObject(data,"Measured evidence");
  exactKeys(root,["source","output","sourceLandmarks","outputLandmarks",
    "sourceTones","outputTones"],"Measured evidence");
  const source=parseFile(root.source,"source",ctx);
  const output=parseFile(root.output,"output",ctx);
  const sourceLandmarks=parsePoints(root.sourceLandmarks,"source",ctx);
  const outputLandmarks=parsePoints(root.outputLandmarks,"output",ctx);
  const sourceTones=parseTones(root.sourceTones,"source",ctx);
  const outputTones=parseTones(root.outputTones,"output",ctx);
  const proof:PencilHeadFidelityEvidence={
    source:{
      url:source.url as string,license:source.license as string,
      credit:source.credit as string,width:source.width as number,
      height:source.height as number,sha256:source.sha256 as string,
    },
    output:{width:output.width as number,height:output.height as number,
      sha256:output.sha256 as string},
    sourceLandmarks,outputLandmarks,sourceTones,outputTones,
  };
  return {
    report:evaluatePencilHeadFidelity(proof),
    sourceLandmarks,outputLandmarks,sourceTones,outputTones,
  };
}
