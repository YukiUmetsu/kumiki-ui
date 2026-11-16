/**
 * Private, resumable Stage-1 artist annotations. This is NOT photo fidelity
 * evidence: it never stores image pixels, measured RGB or artist approval.
 * A saved checkpoint can only be restored alongside the exact original image
 * bytes (SHA-256 computed from the user's two local files).
 */
import {
  HEAD_FIDELITY_LANDMARK_IDS,HEAD_FIDELITY_TONES,
  type HeadFidelityLandmarkId,type HeadFidelityToneId,
} from "./colored-pencil-head-fidelity";
import {
  annotatedPoint,annotatedTone,emptyHeadAnnotations,
  type HeadAnnotationSession,type HeadAnnotationProvenance,
  type NativeDimensions,type HeadAnnotationSide,
} from "./colored-pencil-head-annotation";

export type PencilHeadImageFingerprint={
  name:string;sha256:string;dimensions:NativeDimensions;
};
export type PencilHeadCheckpointImages={
  source:PencilHeadImageFingerprint;
  output:PencilHeadImageFingerprint;
};
export type PencilHeadAnnotationCheckpoint={
  format:"pencil-head-annotation-checkpoint/v1";
  images:PencilHeadCheckpointImages;
  reference:HeadAnnotationProvenance;
  annotations:HeadAnnotationSession;
};
const VERSION="pencil-head-annotation-checkpoint/v1";
const SIDES=["source","output"] as const;
const licenses=new Set(["","CC0-1.0","CC-BY-4.0","CC-BY-SA-4.0",
  "CC-BY-3.0","CC-BY-SA-3.0","PDM-1.0","PD-US"]);

function object(value:unknown,name:string):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw new Error(name+" must be an object");
  return value as Record<string,unknown>;
}
function exactKeys(
  value:Record<string,unknown>,keys:readonly string[],name:string,
){
  if(Object.keys(value).some(key=>!keys.includes(key))||
    keys.some(key=>!(key in value)))
    throw new Error(name+" has unsupported or missing fields");
}
function textField(value:unknown,name:string,max=256):string{
  if(typeof value!=="string"||value.length>max)
    throw new Error(name+" must be a short text value");
  return value;
}
function dimensions(value:unknown,name:string):NativeDimensions{
  const v=object(value,name);
  exactKeys(v,["width","height"],name);
  if(!Number.isSafeInteger(v.width)||!Number.isSafeInteger(v.height)||
    (v.width as number)<64||(v.height as number)<64||
    (v.width as number)*(v.height as number)>60_000_000)
    throw new Error(name+" must describe the original image dimensions");
  return {width:v.width as number,height:v.height as number};
}
function fingerprint(value:unknown,name:string):PencilHeadImageFingerprint{
  const v=object(value,name);
  exactKeys(v,["name","sha256","dimensions"],name);
  const imageName=textField(v.name,name+" filename");
  const hash=textField(v.sha256,name+" SHA-256",64);
  if(!imageName||!/^[a-f0-9]{64}$/.test(hash))
    throw new Error(name+" requires a real image fingerprint");
  return {name:imageName,sha256:hash,
    dimensions:dimensions(v.dimensions,name+" dimensions")};
}
function provenance(value:unknown):HeadAnnotationProvenance{
  const v=object(value,"Reference metadata");
  exactKeys(v,["url","license","credit"],"Reference metadata");
  const url=textField(v.url,"Source URL",2048);
  if(url){
    let parsed:URL;
    try{parsed=new URL(url);}catch{throw new Error("Source URL must be HTTPS");}
    if(parsed.protocol!=="https:"||!parsed.hostname||
      parsed.username||parsed.password)
      throw new Error("Source URL must be HTTPS");
  }
  const license=textField(v.license,"Source license",32);
  if(!licenses.has(license))throw new Error("Unsupported source license");
  return {url,license,credit:textField(v.credit,"Photographer credit")};
}
function coordinate(value:unknown,name:string):{x:number;y:number}{
  const v=object(value,name);
  exactKeys(v,["x","y"],name);
  if(!Number.isSafeInteger(v.x)||!Number.isSafeInteger(v.y))
    throw new Error(name+" requires original integer pixel coordinates");
  return {x:v.x as number,y:v.y as number};
}

/** Parse and fully rebuild the annotation model; never trust JSON objects as
 * ready-to-render points. Every ROI must independently pass the original
 * non-overlap/bounds validator and every semantic ID must be unique.
 */
export function restorePencilHeadAnnotationCheckpoint(
  input:unknown,actualImages:PencilHeadCheckpointImages,
):{session:HeadAnnotationSession;reference:HeadAnnotationProvenance}{
  const root=object(input,"Checkpoint");
  exactKeys(root,["format","images","reference","annotations"],"Checkpoint");
  if(root.format!==VERSION)throw new Error("Unsupported checkpoint version");
  const files=object(root.images,"Image fingerprints");
  exactKeys(files,SIDES,"Image fingerprints");
  const stored=Object.fromEntries(SIDES.map(side=>[
    side,fingerprint(files[side],side),
  ])) as PencilHeadCheckpointImages;
  for(const side of SIDES){
    const actual=fingerprint(actualImages[side],side+" current image");
    if(actual.sha256!==stored[side].sha256||
       actual.dimensions.width!==stored[side].dimensions.width||
       actual.dimensions.height!==stored[side].dimensions.height)
      throw new Error(side+" image bytes/dimensions do not match this checkpoint");
  }
  const reference=provenance(root.reference);
  const annotation=object(root.annotations,"Annotations");
  exactKeys(annotation,SIDES,"Annotations");
  let session=emptyHeadAnnotations();
  for(const side of SIDES){
    const values=object(annotation[side],side+" annotations");
    exactKeys(values,["landmarks","tones"],side+" annotations");
    if(!Array.isArray(values.landmarks)||!Array.isArray(values.tones)||
      values.landmarks.length>18||values.tones.length>5)
      throw new Error(side+" annotation count is invalid");
    const seenPoints=new Set<string>(),seenTones=new Set<string>();
    const d=stored[side].dimensions;
    for(const item of values.landmarks){
      const p=object(item,side+" landmark");
      exactKeys(p,["id","x","y"],side+" landmark");
      if(typeof p.id!=="string"||
        !HEAD_FIDELITY_LANDMARK_IDS.includes(p.id as HeadFidelityLandmarkId)||
        seenPoints.has(p.id))throw new Error("Unknown or duplicate landmark ID");
      seenPoints.add(p.id);
      const point=coordinate({x:p.x,y:p.y},side+" landmark");
      session=annotatedPoint(session,side as HeadAnnotationSide,
        p.id as HeadFidelityLandmarkId,point,d);
    }
    for(const item of values.tones){
      const t=object(item,side+" tone");
      exactKeys(t,["id","rect"],side+" tone");
      if(typeof t.id!=="string"||
        !HEAD_FIDELITY_TONES.includes(t.id as HeadFidelityToneId)||
        seenTones.has(t.id))throw new Error("Unknown or duplicate tone ID");
      seenTones.add(t.id);
      const rect=object(t.rect,side+" tone rectangle");
      exactKeys(rect,["x","y","width","height"],side+" tone rectangle");
      const start=coordinate({x:rect.x,y:rect.y},side+" tone start");
      if(!Number.isSafeInteger(rect.width)||!Number.isSafeInteger(rect.height))
        throw new Error("Tone dimensions must be integer pixels");
      const end={x:start.x+(rect.width as number),
        y:start.y+(rect.height as number)};
      session=annotatedTone(session,side as HeadAnnotationSide,
        t.id as HeadFidelityToneId,start,end,d);
    }
  }
  return {session,reference};
}

/** Build a whitelisted, deeply validated checkpoint. Partial 0..18 and
 * 0..5 annotation sets are legal; it never asserts ArtCraft approval.
 */
export function makePencilHeadAnnotationCheckpoint(
  session:HeadAnnotationSession,images:PencilHeadCheckpointImages,
  reference:HeadAnnotationProvenance,
):PencilHeadAnnotationCheckpoint{
  const raw={format:VERSION,images,reference,annotations:session};
  const validated=restorePencilHeadAnnotationCheckpoint(raw,images);
  return {format:VERSION,
    images:{
      source:fingerprint(images.source,"source"),
      output:fingerprint(images.output,"output"),
    },reference:validated.reference,annotations:validated.session};
}
