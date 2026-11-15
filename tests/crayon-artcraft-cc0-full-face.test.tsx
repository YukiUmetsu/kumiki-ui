import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT}
  from "../src/video/crayon-artcraft-portrait-audit";
import {CRAYON_F1_FACE_PROOF,CRAYON_F1_FACE_PARTS,
  crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import meta,{Cc0RegisteredFullFace}
  from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft F1 registered CC0 face experiment",()=>{
  it("uses the actual frozen source dimensions, rights and all 18 source anchors",()=>{
    const source=CRAYON_PORTRAIT_AUDIT.source;
    expect(CRAYON_F1_FACE_PROOF).toMatchObject({
      width:608,height:1082,sourceSha256:source.sha256,
      url:source.link,rights:"CC0 1.0",
    });
    expect(CRAYON_F1_FACE_PROOF.sourceLandmarks)
      .toEqual(CRAYON_PORTRAIT_AUDIT.sourcePoints);
    expect(Object.keys(CRAYON_F1_FACE_PROOF.sourceLandmarks)).toHaveLength(18);
    expect(CRAYON_F1_FACE_PROOF.review).toMatch(/Unapproved/);
  });
  it("validates opaque, semantically connected 3/4 planes without inventing B1 body",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(scene.width).toBe(608);
    expect(scene.height).toBe(1082);
    expect(scene.seed).toBe(441501);
    const ids=scene.elements.map(e=>e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const id of CRAYON_F1_FACE_PARTS)expect(ids).toContain(id);
    const part=(id:string)=>scene.elements.find(e=>e.id===id);
    for(const id of ["face-outline","neck-attached","hair-back",
      "hair-left-curtain","hair-right-curtain","sclera-near","sclera-far",
      "lip-upper","lip-lower","oral-opening"]){
      const el=part(id);
      expect(el?.kind).toBe("wax");
      if(el?.kind!=="wax")throw new Error("Missing region "+id);
      expect(el.coverage).toBe("opaque");
      expect(el.deposition).toBe("stroke-built");
      expect(el.underpaintTooth).toBeGreaterThan(0);
    }
    expect(part("iris-near")).toMatchObject({
      kind:"wax",parentId:"sclera-near",clipToParent:true});
    expect(part("iris-far")).toMatchObject({
      kind:"wax",parentId:"sclera-far",clipToParent:true});
    expect(part("pupil-near")).toMatchObject({
      kind:"wax",parentId:"iris-near",clipToParent:true});
    expect(part("pupil-far")).toMatchObject({
      kind:"wax",parentId:"iris-far",clipToParent:true});
    expect(part("nose-alar-near")).toMatchObject({
      kind:"wax",coverage:"open",clipToParent:true,
      parentId:"face-outline"});
    expect(part("mouth-teeth")).toMatchObject({
      kind:"wax",parentId:"oral-opening",clipToParent:true});
    expect(ids.filter(x=>x.startsWith("hair-fiber-flow-")).length)
      .toBeGreaterThanOrEqual(17);
    expect(ids.filter(x=>x.startsWith("brow-fibers-")).length)
      .toBeGreaterThanOrEqual(6);
    expect(part("trouser-leg-left")).toBeUndefined();
    expect(part("sleeve-left-roll")).toBeUndefined();
    expect(meta.tags).toContain("!dev");
    expect(Cc0RegisteredFullFace.name).toMatch(/ArtCraft experiment/);
  });
  it("regresses the inspected smile-slot, isolated nostril rings and scratched wig",()=>{
    const spec=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>spec.elements.find(e=>e.id===id);
    const slit=get("oral-opening");
    const teeth=get("mouth-teeth");
    const upper=get("lip-upper");
    const lower=get("lip-lower");
    const back=get("hair-back");
    const left=get("hair-left-curtain");
    const right=get("hair-right-curtain");
    for(const el of [slit,teeth,upper,lower,back,left,right])
      expect(el?.kind).toBe("wax");
    if(!slit||slit.kind!=="wax"||!teeth||teeth.kind!=="wax"||
      !upper||upper.kind!=="wax"||!lower||lower.kind!=="wax")
      throw new Error("ArtCraft facial value volume missing");
    // Actual Chromium V1 rendered a broad white tooth slash. Keep a small
    // undercut interrupted by muted teeth rather than a geometry sticker.
    expect(slit.bounds.height).toBeLessThan(50);
    expect(teeth.bounds.height).toBeLessThan(27);
    expect(upper.bounds.height).toBeLessThan(70);
    expect(lower.bounds.height).toBeLessThan(65);
    expect(teeth.parentId).toBe("oral-opening");
    expect(teeth.clipToParent).toBe(true);
    for(const el of [back,left,right]){
      if(el?.kind!=="wax")throw new Error("Missing rooted hair mass");
      expect(el.markStrength).toBeLessThan(.3);
      expect(el.coverage).toBe("opaque");
    }
    for(const id of ["nostril-contact-near","nostril-contact-far"]){
      const el=get(id);
      expect(el?.kind).toBe("contour");
      if(el?.kind!=="contour")throw new Error("Unattached nostril");
      expect(el.d).not.toContain("Z");
      expect(el.d).not.toContain("z");
      expect(el.parentId).toBe("face-outline");
    }
  });
  it("retains source-directed wax fiber geometry while batching under scene budget",()=>{
    const scene=crayonCc0FaceStudy({detail:1});
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(scene.elements.length).toBeLessThanOrEqual(240);
    const ids=scene.elements.map(e=>e.id);
    const n=(prefix:string)=>ids.filter(id=>id.startsWith(prefix)).length;
    expect(n("hair-rooted-left-")).toBe(6);
    expect(n("hair-rooted-right-")).toBe(6);
    expect(n("hair-rooted-crown-")).toBe(6);
    const d=scene.elements.filter(x=>x.id.startsWith("hair-rooted-"));
    expect(d).toHaveLength(18);
    const countStrands=(key:string)=>d.filter(x=>x.id.startsWith(key))
      .reduce((sum,el)=>sum+(el.kind==="contour"?
        (el.d.match(/M-?[0-9]+/g)??[]).length:0),0);
    expect(countStrands("hair-rooted-left-")).toBe(85);
    expect(countStrands("hair-rooted-right-")).toBe(130);
    expect(countStrands("hair-rooted-crown-")).toBe(52);
    for(const el of d){
      expect(el.kind).toBe("contour");
      if(el.kind!=="contour")throw new Error("Missing source hair fiber");
      expect(el.clipToParent).toBe(true);
      expect(["hair-left-curtain","hair-right-curtain","hair-back"])
        .toContain(el.parentId);
      expect(el.width).toBeGreaterThan(.25);
      expect(el.width).toBeLessThan(1.3);
      expect(el.opacity).toBeGreaterThan(.2);
      expect(el.opacity).toBeLessThan(.8);
      expect(el.d).toMatch(/^M-?[0-9]+/);
      expect(el.d).toContain(" C");
    }
    const sparse=crayonCc0FaceStudy({detail:.5});
    expect(inspectCrayonScene(sparse)).toEqual([]);
    expect(sparse.elements.filter(x=>x.id.startsWith("hair-rooted-")))
      .toHaveLength(18);
    expect(crayonCc0FaceStudy({detail:1})).toEqual(scene);
  });
  it("keeps an exact independent source graph only in explicit anatomy mode",()=>{
    const wax=crayonCc0FaceStudy({view:"wax",detail:.5});
    const construction=crayonCc0FaceStudy({view:"anatomy",detail:.5});
    expect(inspectCrayonScene(wax)).toEqual([]);
    expect(inspectCrayonScene(construction)).toEqual([]);
    expect(wax.elements.filter(e=>e.id.startsWith("source-face-landmark-")))
      .toHaveLength(0);
    const annotated=construction.elements.filter(e=>
      e.id.startsWith("source-face-landmark-"));
    expect(annotated).toHaveLength(18);
    expect(construction.elements.filter(e=>
      e.id.startsWith("source-face-link-")).length).toBeGreaterThan(10);
    expect(construction.elements.filter(e=>
      !e.id.startsWith("source-face-"))).toEqual(wax.elements);
    const html=renderToStaticMarkup(<CrayonScene spec={wax} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="face-outline"');
    expect(html).toContain('data-km-crayon-element="oral-opening"');
    expect(html).toContain('data-km-crayon-underpaint="opaque"');
    expect(html).toBe(renderToStaticMarkup(<CrayonScene spec={wax} frame={299}/>));
  });
  it("rejects invalid settings without silently simplifying high-value regions",()=>{
    expect(()=>crayonCc0FaceStudy({detail:NaN})).toThrow();
    expect(()=>crayonCc0FaceStudy({detail:0})).toThrow();
    expect(()=>crayonCc0FaceStudy({detail:1.3})).toThrow();
    expect(()=>crayonCc0FaceStudy({view:"freehand" as "wax"})).toThrow();
  });
});
