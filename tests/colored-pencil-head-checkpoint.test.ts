import {describe,it,expect} from "vitest";
import {
  makePencilHeadAnnotationCheckpoint,restorePencilHeadAnnotationCheckpoint,
  type PencilHeadCheckpointImages,
} from "../src/video/colored-pencil-head-checkpoint";
import {
  emptyHeadAnnotations,annotatedPoint,annotatedTone,
} from "../src/video/colored-pencil-head-annotation";

const imageSet:PencilHeadCheckpointImages={
  source:{name:"original.jpg",sha256:"a".repeat(64),
    dimensions:{width:1280,height:960}},
  output:{name:"native.png",sha256:"b".repeat(64),
    dimensions:{width:960,height:540}},
};
const source={url:"https://commons.wikimedia.org/wiki/File:Source.jpg",
  license:"CC-BY-4.0",credit:"Author"};
function partial(){
  let session=emptyHeadAnnotations();
  session=annotatedPoint(session,"source","cranial-apex",
    {x:324,y:108},imageSet.source.dimensions);
  session=annotatedPoint(session,"output","cranial-apex",
    {x:420,y:210},imageSet.output.dimensions);
  session=annotatedTone(session,"source","highlight",
    {x:250,y:160},{x:310,y:225},imageSet.source.dimensions);
  session=annotatedTone(session,"output","highlight",
    {x:310,y:240},{x:350,y:270},imageSet.output.dimensions);
  return session;
}
describe("ArtCraft pencil head private checkpoint is not photographic evidence",()=>{
  it("round-trips independently observed partial source/output marks, not pixels",()=>{
    const original=partial();
    const checkpoint=makePencilHeadAnnotationCheckpoint(original,imageSet,source);
    const json=JSON.stringify(checkpoint);
    expect(json).toContain("pencil-head-annotation-checkpoint/v1");
    for(const forbidden of ["meanRgb","imageData","data:image",
      "artistApproved","sourcePixels"]){
      expect(json).not.toContain(forbidden);
    }
    const restored=restorePencilHeadAnnotationCheckpoint(
      JSON.parse(json),imageSet);
    expect(restored.session).toEqual(original);
    expect(restored.reference).toEqual(source);
    expect(restored.session.source.landmarks[0].x).not
      .toBe(restored.session.output.landmarks[0].x);
    expect(restored.session).not.toBe(original);
  });
  it("restores even when filenames change, never when source bytes or image dimensions change",()=>{
    const checkpoint=makePencilHeadAnnotationCheckpoint(
      partial(),imageSet,source);
    const changedName={...imageSet,
      source:{...imageSet.source,name:"renamed-local-copy.jpg"}};
    expect(restorePencilHeadAnnotationCheckpoint(checkpoint,changedName)
      .session.source.landmarks).toHaveLength(1);
    const changedDigest={...imageSet,
      source:{...imageSet.source,sha256:"c".repeat(64)}};
    expect(()=>restorePencilHeadAnnotationCheckpoint(checkpoint,changedDigest))
      .toThrow(/image bytes/i);
    const swapped={source:imageSet.output,output:imageSet.source};
    expect(()=>restorePencilHeadAnnotationCheckpoint(checkpoint,swapped))
      .toThrow(/image bytes/i);
    const resized={...imageSet,output:{...imageSet.output,
      dimensions:{width:959,height:540}}};
    expect(()=>restorePencilHeadAnnotationCheckpoint(checkpoint,resized))
      .toThrow(/dimensions/i);
  });
  it("fails closed on forged fields, unknown IDs, duplicates and malicious ROIs",()=>{
    const base=makePencilHeadAnnotationCheckpoint(partial(),imageSet,source);
    const edit=()=>JSON.parse(JSON.stringify(base));
    const extra=edit();
    extra.photoData="data:image/png;base64,....";
    expect(()=>restorePencilHeadAnnotationCheckpoint(extra,imageSet))
      .toThrow(/fields/i);
    const injected=edit();
    injected.annotations.source.landmarks[0].pixels=[1,2,3];
    expect(()=>restorePencilHeadAnnotationCheckpoint(injected,imageSet))
      .toThrow(/fields/i);
    const duplicate=edit();
    duplicate.annotations.source.landmarks.push({
      ...duplicate.annotations.source.landmarks[0]});
    expect(()=>restorePencilHeadAnnotationCheckpoint(duplicate,imageSet))
      .toThrow(/duplicate/i);
    const unknown=edit();
    unknown.annotations.source.landmarks[0].id="eye-near";
    expect(()=>restorePencilHeadAnnotationCheckpoint(unknown,imageSet))
      .toThrow(/unknown/i);
    const overlap=edit();
    overlap.annotations.source.tones.push({id:"light",
      rect:{x:260,y:170,width:40,height:40}});
    expect(()=>restorePencilHeadAnnotationCheckpoint(overlap,imageSet))
      .toThrow(/overlap/i);
    const outOfBounds=edit();
    outOfBounds.annotations.output.landmarks[0].x=9999;
    expect(()=>restorePencilHeadAnnotationCheckpoint(outOfBounds,imageSet))
      .toThrow(/bounds/i);
  });
  it("does not treat incomplete provenance, future schemas or invalid licenses as art approval",()=>{
    const checkpoint=makePencilHeadAnnotationCheckpoint(
      emptyHeadAnnotations(),imageSet,{url:"",license:"",credit:""});
    expect(restorePencilHeadAnnotationCheckpoint(checkpoint,imageSet)
      .session.source.landmarks).toHaveLength(0);
    expect(JSON.stringify(checkpoint)).not.toContain("approved");
    expect(()=>restorePencilHeadAnnotationCheckpoint({
      ...checkpoint,format:"pencil-head-annotation-checkpoint/v2",
    },imageSet)).toThrow(/version/i);
    expect(()=>makePencilHeadAnnotationCheckpoint(emptyHeadAnnotations(),
      imageSet,{url:"http://unsafe.example",license:"CC0-1.0",
        credit:"Someone"})).toThrow(/HTTPS/i);
    expect(()=>makePencilHeadAnnotationCheckpoint(emptyHeadAnnotations(),
      imageSet,{url:"",license:"invented",credit:""}))
      .toThrow(/license/i);
  });
});
