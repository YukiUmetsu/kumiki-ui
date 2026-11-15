import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonPaperTintedWaxBase} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT}
  from "../src/video/crayon-artcraft-portrait-audit";
import {CRAYON_F1_RECONSTRUCTED_MIDFACE_IDS}
  from "../src/video/crayon-artcraft-f1-midface-geometry";
import {CRAYON_F1_RECONSTRUCTED_OCULAR_IDS}
  from "../src/video/crayon-artcraft-f1-ocular-geometry";
import {CRAYON_F1_FACE_PROOF,CRAYON_F1_FACE_PARTS,
  CRAYON_F1_EYE_INSPECTION,crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import meta,{Cc0RegisteredFullFace,crayonF1SourceCssCamera}
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
      "hair-left-curtain","hair-right-curtain","sclera-near","sclera-far"]){
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
    // Source F1 mouth is shut; a paper-bright enamel patch is fabricated.
    expect(part("mouth-teeth")).toBeUndefined();
    for(const id of ["lip-upper","lip-lower","oral-opening"]){
      expect(part(id)).toMatchObject({
        kind:"wax",parentId:"face-outline",clipToParent:true,
        coverage:"open",deposition:"stroke-built"});
    }
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
    const upper=get("lip-upper");
    const lower=get("lip-lower");
    const back=get("hair-back");
    const left=get("hair-left-curtain");
    const right=get("hair-right-curtain");
    for(const el of [slit,upper,lower,back,left,right])
      expect(el?.kind).toBe("wax");
    if(!slit||slit.kind!=="wax"||
      !upper||upper.kind!=="wax"||!lower||lower.kind!=="wax")
      throw new Error("ArtCraft facial value volume missing");
    // A source-crop reinspection proved muted UPPER INCISORS visible.
    // What was false was the earlier continuous PAPER-WHITE ENAMEL STRIPE.
    expect(get("mouth-teeth")).toBeUndefined();
    expect(get("mouth-aperture-depth")).toMatchObject({
      kind:"wax",parentId:"oral-opening",clipToParent:true,coverage:"opaque",
    });
    for(const id of ["dental-surface-left","dental-surface-center",
      "dental-surface-far"]){
      const tooth=get(id);
      expect(tooth).toMatchObject({kind:"wax",
        parentId:"mouth-aperture-depth",clipToParent:true,coverage:"opaque"});
      if(tooth?.kind!=="wax")throw new Error("Source muted tooth missing");
      expect(tooth.bounds.width).toBeLessThan(36);
      expect(tooth.bounds.height).toBeLessThan(31);
      expect(tooth.underpaintTooth).toBeLessThan(.12);
      expect(tooth.colors[2]).not.toBe("#ffffff");
    }
    expect(slit.bounds.height).toBeLessThan(50);
    expect(slit.coverage).toBe("open");
    expect(upper.bounds.height).toBeLessThan(70);
    expect(lower.bounds.height).toBeLessThanOrEqual(72);
    expect(upper.coverage).toBe("open");
    expect(lower.coverage).toBe("open");
    for(const el of [back,left,right]){
      if(el?.kind!=="wax")throw new Error("Missing rooted hair mass");
      expect(el.markStrength).toBeLessThan(.3);
      expect(el.coverage).toBe("opaque");
    }
    // F1 source is painted pressure relief: closed vector ink rings are
    // not faithful nostril structures, even when attached to a face mask.
    for(const id of ["nostril-contact-near","nostril-contact-far",
      "nose-alar-crease-near","nose-alar-crease-far"]){
      const el=get(id);
      expect(el).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open",deposition:"stroke-built"});
      if(el?.kind!=="wax")throw new Error("Missing painted undercut "+id);
      expect(el.blendRadius).toBeGreaterThanOrEqual(2);
      expect(el.markStrength).toBeLessThan(.3);
    }
  });
  it("restores the source-specific strong asymmetrical nostril cores",()=>{
    const spec=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>spec.elements.find(e=>e.id===id);
    const near=get("naris-shadow-near"),far=get("naris-shadow-far");
    for(const x of [near,far]){
      expect(x).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"opaque",deposition:"stroke-built"});
      if(x?.kind!=="wax")throw new Error("Missing nasal air-space mass");
      expect(x.pressure).toBeGreaterThanOrEqual(.88);
      expect(x.underpaintTooth).toBeLessThanOrEqual(.12);
      expect(x.edgeRoughness).toBe(0);
      expect(x.underpaintGradient?.shadow).toMatch(/^#(?:1d161b|24181c)$/);
    }
    if(near?.kind!=="wax"||far?.kind!=="wax")throw Error("bad anatomy");
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(near.bounds.height).toBeLessThan(far.bounds.height);
    expect(near.bounds.x).toBeLessThan(far.bounds.x);
    expect(inspectCrayonScene(spec)).toEqual([]);
  });
  it("renders seven source-curved lip wax fibers with native cubic nib contacts",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const ribs=scene.elements.find(e=>e.id==="lip-lower-wax-ribs");
    expect(ribs).toMatchObject({kind:"contour",
      parentId:"lip-lower",clipToParent:true,
      waxContact:"dry-wax",waxPressure:.44});
    if(ribs?.kind!=="contour")throw Error("Vermilion wax missing");
    expect(ribs.d.match(/M/g)).toHaveLength(7);
    expect(ribs.d.match(/C/g)).toHaveLength(7);
    expect(ribs.d).not.toMatch(/[QqZz]/);
    expect(inspectCrayonScene(scene)).toEqual([]);
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="lip-lower-wax-ribs"');
  });
  it("integrates the photographed submandibular neck cast instead of a black vector jaw stripe",()=>{
    const spec=crayonCc0FaceStudy({view:"wax"});
    for(const id of ["neck-submandibular-cast","neck-cervical-turn"]){
      const e=spec.elements.find(x=>x.id===id);
      expect(e).toMatchObject({kind:"wax",parentId:"neck-attached",
        clipToParent:true,coverage:"open",featherContacts:true,
        deposition:"stroke-built"});
      if(e?.kind!=="wax")throw Error("Missing jaw-rooted neck");
      expect(e.blendRadius).toBeGreaterThanOrEqual(15);
    }
    const jaw=spec.elements.find(x=>x.id==="jaw-underside-contour");
    expect(jaw).toMatchObject({kind:"contour"});
    if(jaw?.kind!=="contour")throw Error("Missing source jaw");
    expect(jaw.opacity).toBeLessThanOrEqual(.1);
  });
  it("reconstructs photographed helix/concha and keeps stud attached to lobe",()=>{
    const spec=crayonCc0FaceStudy({view:"wax"});
    const find=(id:string)=>spec.elements.find(el=>el.id===id);
    for(const id of ["ear-helix-value","ear-concha-shadow",
      "ear-antihelix-reflection","ear-lobe-warmth"]){
      expect(find(id)).toMatchObject({kind:"wax",parentId:"ear-underplane",
        clipToParent:true,coverage:"open"});
    }
    expect(find("ear-stud-setting")).toMatchObject({
      kind:"wax",parentId:"ear-underplane",clipToParent:true,
      coverage:"opaque",deposition:"stroke-built"});
    expect(find("ear-stud-glint")).toMatchObject({
      kind:"wax",parentId:"ear-stud-setting",clipToParent:true,
      coverage:"opaque"});
    const setting=find("ear-stud-setting");
    if(setting?.kind!=="wax")throw new Error("Missing source F1 earring");
    expect(setting.bounds.x).toBeGreaterThan(95);
    expect(setting.bounds.y).toBeGreaterThan(748);
    expect(setting.bounds.y+setting.bounds.height).toBeLessThan(780);
    expect(inspectCrayonScene(spec)).toEqual([]);
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
      expect(["hair-left-curtain","hair-right-curtain","hair-crown-surface"])
        .toContain(el.parentId);
      expect(el.width).toBeGreaterThan(.25);
      expect(el.width).toBeLessThan(1.3);
      expect(el.opacity).toBeGreaterThan(.2);
      expect(el.opacity).toBeLessThan(.8);
      expect(el.d).toMatch(/^M-?[0-9]+/);
      expect(el.d).toContain(" C");
    }
    // The back hair mass includes space behind the face. Crown fibers
    // must clip only to the scalp outside the forehead silhouette;
    // otherwise late-rendered hair strands scribble over skin.
    expect(scene.elements.find(x=>x.id==="hair-crown-surface"))
      .toMatchObject({kind:"wax",coverage:"opaque"});
    const crownFibers=d.filter(x=>x.id.startsWith("hair-rooted-crown-"));
    expect(crownFibers.every(x=>x.parentId==="hair-crown-surface"))
      .toBe(true);
    const crownOther=scene.elements.filter(x=>
      x.id.startsWith("hair-fiber-flow-")&&Number(x.id.split("-").pop())<9);
    expect(crownOther.every(x=>x.parentId==="hair-crown-surface"))
      .toBe(true);
    // The smooth bright hairline is retained as a negative-control A/B,
    // not silently promoted as physical crayon on the F1 artwork.
    expect(d.filter(x=>x.id.startsWith("hair-rooted-left-")||
      x.id.startsWith("hair-rooted-right-"))
      .every(x=>x.kind==="contour"&&x.waxContact==="dry-wax"&&
        x.waxPressure===.78)).toBe(true);
    expect(d.filter(x=>x.id.startsWith("hair-rooted-crown-"))
      .every(x=>x.kind==="contour"&&x.waxContact===undefined)).toBe(true);
    const control=crayonCc0FaceStudy({detail:1,fiberMaterial:"line"});
    expect(inspectCrayonScene(control)).toEqual([]);
    expect(control.elements.filter(x=>x.id.startsWith("hair-rooted-"))
      .every(x=>x.kind==="contour"&&x.waxContact===undefined)).toBe(true);
    const sparse=crayonCc0FaceStudy({detail:.5});
    expect(inspectCrayonScene(sparse)).toEqual([]);
    expect(sparse.elements.filter(x=>x.id.startsWith("hair-rooted-")))
      .toHaveLength(18);
    expect(crayonCc0FaceStudy({detail:1})).toEqual(scene);
  });
  it("anchors lower curtain fibers to the photographed hair flow rather than a random x/y field",()=>{
    const scene=crayonCc0FaceStudy({detail:1});
    const origins=(prefix:string)=>scene.elements
      .filter(el=>el.id.startsWith(prefix))
      .flatMap(el=>el.kind==="contour"?
        [...el.d.matchAll(/M(-?[0-9]+(?:[.][0-9]+)?) +(-?[0-9]+(?:[.][0-9]+)?) +C/g)]
          .map(match=>({x:Number(match[1]),y:Number(match[2])})):[]);
    const right=origins("hair-rooted-right-").filter(p=>p.y>=780);
    const left=origins("hair-rooted-left-").filter(p=>p.y>=750);
    expect(right.length).toBeGreaterThan(12);
    expect(left.length).toBeGreaterThan(8);
    // In F1 source-space the lower curtain has bent around the cheek and
    // occupies a narrow root-connected corridor. Screen-wide scratches
    // violate this attached hair geometry despite being clipped later.
    expect(right.every(p=>p.x>=467&&p.x<=586)).toBe(true);
    expect(left.every(p=>p.x>=24&&p.x<=117)).toBe(true);
  });
  it("preserves attached F1 alar-septal anatomy without nostril glyph rings",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>scene.elements.find(e=>e.id===id);
    for(const id of ["nose-septal-transition","nose-tip-underlight"]){
      const e=get(id);
      expect(e).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open"});
      if(e?.kind!=="wax")throw new Error("Missing attached nasal form: "+id);
      expect(e.bounds.x).toBeGreaterThan(360);
      expect(e.bounds.x+e.bounds.width).toBeLessThan(474);
      expect(e.underpaintTooth??0).toBe(0);
    }
    for(const id of ["nostril-contact-near","nostril-contact-far"]){
      const e=get(id);
      expect(e).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open"});
      if(e?.kind!=="wax")throw new Error("Missing alar relief: "+id);
      expect(e.bounds.height).toBeLessThanOrEqual(20);
      expect(e.blendRadius).toBeGreaterThanOrEqual(2);
    }
    // A source-observed nostril must be supported by alar mass, not two
    // independent dark capsules on otherwise featureless wax paper.
    for(const id of ["nose-alar-near","nose-alar-far"]){
      const e=get(id);
      if(e?.kind!=="wax")throw new Error("Missing photographed cartilage: "+id);
      expect(e.coverage).toBe("open");
      expect(e.blendRadius).toBeGreaterThanOrEqual(6);
      expect(e.markStrength).toBeLessThanOrEqual(.26);
    }
    const sidewall=get("nose-sidewall-form");
    if(sidewall?.kind!=="wax")throw new Error("Missing bridge-to-tip plane");
    expect(sidewall.bounds.width).toBeGreaterThanOrEqual(78);
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("attaches shaded source naris and vermilion to continuous parent facial volume",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const lookup=(id:string)=>scene.elements.find(e=>e.id===id);
    for(const id of ["nasal-alar-attachment-near","nasal-alar-attachment-far",
      "labial-upper-value","labial-lower-value"]){
      expect(lookup(id)).toMatchObject({kind:"wax",coverage:"open",
        parentId:"face-outline",clipToParent:true,
        deposition:"stroke-built",featherContacts:true});
    }
    const i=scene.elements.map(e=>e.id);
    expect(i.indexOf("nasal-alar-attachment-near")).toBeLessThan(
      i.indexOf("naris-shadow-near"));
    expect(i.indexOf("nasal-alar-attachment-far")).toBeLessThan(
      i.indexOf("naris-shadow-far"));
    expect(i.indexOf("labial-upper-value")).toBeLessThan(
      i.indexOf("oral-opening"));
    expect(i.indexOf("labial-lower-value")).toBeLessThan(
      i.indexOf("lip-lower-core-shadow"));
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("renders the F1 oblique partly opened mouth with only segmented muted upper incisors",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>scene.elements.find(e=>e.id===id);
    for(const id of ["lip-cupid-tubercles","lip-lower-core-shadow"]){
      expect(get(id)).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open"});
    }
    const slit=get("oral-opening");
    if(slit?.kind!=="wax")
      throw new Error("Missing source-attached F1 mouth seam");
    expect(get("mouth-teeth")).toBeUndefined();
    for(const id of ["lip-commissure-left","lip-commissure-right"]){
      const e=get(id);
      expect(e).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open"});
      if(e?.kind!=="wax")throw new Error("Missing painted labial corner");
      expect(e.markStrength).toBeLessThan(.3);
    }
    for(const id of ["lip-upper","lip-lower","oral-opening"]){
      expect(get(id)).toMatchObject({kind:"wax",coverage:"open",
        parentId:"face-outline",clipToParent:true});
    }
    expect(slit.pressure).toBeLessThanOrEqual(.7);
    expect(slit.featherContacts).toBe(true);
    expect(slit.colors[0]).not.toBe("#f5ebe1");
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("constructs three source-clipped asymmetric scleral wax contacts and preserves an exact negative control",()=>{
    const candidate=crayonCc0FaceStudy({eyeContact:"source-shade"});
    const baseline=crayonCc0FaceStudy({eyeContact:"baseline"});
    const ids=["sclera-outer-contact-near",
      "sclera-inner-contact-near","sclera-outer-contact-far"];
    const get=(id:string)=>candidate.elements.find(e=>e.id===id);
    const positions=candidate.elements.map(e=>e.id);
    for(const id of ids){
      const e=get(id);
      const parent=id.endsWith("-far")?"sclera-far":"sclera-near";
      expect(e).toMatchObject({kind:"wax",parentId:parent,
        clipToParent:true,coverage:"open",deposition:"stroke-built",
        featherContacts:true,outlineOpacity:0});
      if(e?.kind!=="wax")throw new Error("Missing source eye contact");
      expect(e.blendRadius).toBeGreaterThanOrEqual(2.8);
      expect(e.markStrength).toBeLessThanOrEqual(.17);
      expect(positions.indexOf(parent)).toBeLessThan(positions.indexOf(id));
      expect(positions.indexOf(id)).toBeLessThan(
        positions.indexOf(parent==="sclera-far"?"iris-far":"iris-near"));
      expect(baseline.elements.some(x=>x.id===id)).toBe(false);
    }
    const reconstructed=new Set(CRAYON_F1_RECONSTRUCTED_OCULAR_IDS);
    // Source-reconstruction is strictly local to the documented eye parts.
    // Other facial wax, neck, hair, mouth, body and all frame timelines
    // must remain bitwise-identical to the previous negative control.
    const untouched=candidate.elements.filter(e=>
      !ids.includes(e.id)&&!reconstructed.has(e.id));
    const originalUntouched=baseline.elements.filter(e=>
      !reconstructed.has(e.id));
    expect(untouched).toEqual(originalUntouched);
    for(const id of reconstructed){
      const before=baseline.elements.find(e=>e.id===id);
      const after=candidate.elements.find(e=>e.id===id);
      expect(after).toBeDefined();
      if(!before||!after||!("d" in before)||!("d" in after)||
        !("clipToParent" in before)||!("clipToParent" in after))
        throw new Error("Missing comparable source-constructed wax/lash "+id);
      expect(after.kind).toBe(before.kind);
      expect(after.parentId).toBe(before.parentId);
      expect(after.clipToParent).toBe(before.clipToParent);
      expect(after.d).not.toBe(before.d);
    }
    expect(candidate.elements.length).toBe(baseline.elements.length+3);
    expect(inspectCrayonScene(candidate)).toEqual([]);
    expect(inspectCrayonScene(baseline)).toEqual([]);
    for(const detail of [.2,1]){
      expect(inspectCrayonScene(crayonCc0FaceStudy({detail}))).toEqual([]);
    }
    expect(()=>crayonCc0FaceStudy({eyeContact:"bad" as "baseline"}))
      .toThrow(RangeError);
    const candidateHtml=renderToStaticMarkup(<CrayonScene spec={candidate} frame={299}/>);
    const baselineHtml=renderToStaticMarkup(<CrayonScene spec={baseline} frame={299}/>);
    expect(candidateHtml.match(/data-km-crayon-contact-feather-mask=""/g)?.length)
      .toBe((baselineHtml.match(/data-km-crayon-contact-feather-mask=""/g)?.length??0)+5);
  });
  it("retains exact source midface negative control while building attached alar and dental wax anatomy",()=>{
    const scene=crayonCc0FaceStudy({eyeContact:"baseline",midfaceForm:"source-volume"});
    const baseline=crayonCc0FaceStudy({eyeContact:"baseline",midfaceForm:"baseline"});
    const originals=new Map(baseline.elements.map(e=>[e.id,e]));
    const changed=new Set(CRAYON_F1_RECONSTRUCTED_MIDFACE_IDS);
    expect(scene.elements.length).toBe(baseline.elements.length+1);
    expect(scene.elements.filter(e=>!changed.has(e.id)))
      .toEqual(baseline.elements.filter(e=>!changed.has(e.id)));
    for(const id of changed){
      const candidate=scene.elements.find(e=>e.id===id);
      expect(candidate?.kind).toBe("wax");
      if(id==="dental-arch-connected-wax"){
        expect(originals.has(id)).toBe(false);
        expect(candidate).toMatchObject({kind:"wax",
          parentId:"mouth-aperture-depth",clipToParent:true,
          coverage:"opaque",deposition:"stroke-built"});
      }else{
        const original=originals.get(id);
        if(original?.kind!=="wax"||candidate?.kind!=="wax")
          throw new Error("Missing comparable source wax "+id);
        expect(candidate.parentId).toBe(original.parentId);
        expect(candidate.d).not.toBe(original.d);
      }
    }
    const where=(id:string)=>scene.elements.findIndex(e=>e.id===id);
    expect(where("oral-opening")).toBeLessThan(where("mouth-aperture-depth"));
    expect(where("mouth-aperture-depth")).toBeLessThan(
      where("dental-arch-connected-wax"));
    expect(where("dental-arch-connected-wax")).toBeLessThan(
      where("dental-surface-left"));
    const near=scene.elements.find(e=>e.id==="naris-shadow-near");
    const far=scene.elements.find(e=>e.id==="naris-shadow-far");
    if(near?.kind!=="wax"||far?.kind!=="wax")
      throw new Error("Missing nested nasal wax");
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(near.underpaintGradient?.shadow).toBe("#1d161b");
    const dental=scene.elements.find(e=>e.id==="dental-arch-connected-wax");
    if(dental?.kind!=="wax")throw new Error("Missing dentition underpaint");
    expect(dental.colors[2]).not.toBe("#ffffff");
    expect(dental.underpaintTooth).toBeLessThan(.11);
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(inspectCrayonScene(baseline)).toEqual([]);
    expect(()=>crayonCc0FaceStudy({midfaceForm:"bad" as "baseline"}))
      .toThrow(RangeError);
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="dental-arch-connected-wax"');
    const baselineHtml=renderToStaticMarkup(<CrayonScene spec={baseline} frame={299}/>);
    expect(baselineHtml).not.toContain('data-km-crayon-element="dental-arch-connected-wax"');
  });
  it("preserves F1 narrow anatomical near-eye occlusion rather than a round doll iris",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>scene.elements.find(e=>e.id===id);
    const sclera=get("sclera-near"),iris=get("iris-near");
    const pupil=get("pupil-near");
    if(sclera?.kind!=="wax"||iris?.kind!=="wax"||pupil?.kind!=="wax")
      throw new Error("Missing source F1 near orbit");
    // Locked to Campbell's 608×1082 source screenshot, not a generic
    // evenly centered cartoon eye: the black iris is partially lid-held.
    expect(sclera.bounds.width).toBeLessThanOrEqual(116);
    expect(sclera.bounds.height).toBeLessThanOrEqual(59);
    expect(iris.bounds.x).toBeGreaterThanOrEqual(237);
    expect(iris.bounds.width).toBeLessThanOrEqual(49);
    expect(iris.bounds.height).toBeLessThanOrEqual(42);
    expect(pupil.bounds.width).toBeLessThanOrEqual(23);
    expect(pupil.bounds.width / iris.bounds.width).toBeLessThan(.58);
    expect(iris).toMatchObject({parentId:"sclera-near",clipToParent:true});
    expect(pupil).toMatchObject({parentId:"iris-near",clipToParent:true});
    for(const id of ["upper-lid-near","lower-lid-near",
      "upper-lid-crease-near","lower-lid-margin-near","tear-canthus-near"]){
      expect(get(id)).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open",deposition:"stroke-built"});
    }
    // Very dark, thin source upper lash bands are deposited in real wax.
    // The heavy pigment is intentional but must not expand the scleral
    // mask into a flat full-eye paint capsule.
    expect(get("lash-root-near")).toMatchObject({kind:"wax",
      parentId:"face-outline",clipToParent:true,
      coverage:"opaque",deposition:"stroke-built"});
    const nearLashes=get("lash-contact-near");
    expect(nearLashes).toMatchObject({kind:"contour",
      parentId:"face-outline",clipToParent:true,
      waxContact:"dry-wax",waxPressure:.49});
    if(nearLashes?.kind!=="contour")throw new Error("Missing near wax fibers");
    expect(nearLashes.d.match(/ M/g)?.length).toBeGreaterThanOrEqual(9);
    expect(nearLashes.d).not.toMatch(/[QqZz]/);
    expect(nearLashes.width).toBeLessThan(.45);
    const layers=scene.elements.map(e=>e.id);
    expect(layers.indexOf("iris-near")).toBeLessThan(
      layers.indexOf("upper-lid-near"));
    expect(layers.indexOf("upper-lid-near")).toBeLessThan(
      layers.indexOf("lash-root-near"));
    expect(layers.indexOf("lash-root-near")).toBeLessThan(
      layers.indexOf("hair-right-curtain"));
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("keeps F1 far eye foreshortened and occluded by source hair",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>scene.elements.find(e=>e.id===id);
    const near=get("iris-near"),far=get("iris-far"),pupil=get("pupil-far");
    if(near?.kind!=="wax"||far?.kind!=="wax"||pupil?.kind!=="wax")
      throw new Error("Missing source F1 eye volume");
    // The photographed far iris is mostly dark under the hair curtain,
    // not a small circular iris inside a large invented white ellipse.
    expect(far.bounds.width).toBeGreaterThan(near.bounds.width);
    expect(far.bounds.width).toBeLessThanOrEqual(63);
    expect(far.bounds.height).toBeLessThanOrEqual(37);
    expect(pupil.bounds.width).toBeLessThanOrEqual(22);
    for(const id of ["upper-lid-far","lower-lid-far",
      "upper-lid-crease-far","lower-lid-margin-far"]){
      expect(get(id)).toMatchObject({kind:"wax",
        parentId:"face-outline",clipToParent:true,
        coverage:"open",deposition:"stroke-built"});
    }
    expect(get("lash-root-far")).toMatchObject({kind:"wax",
      parentId:"face-outline",clipToParent:true,
      coverage:"opaque",deposition:"stroke-built"});
    expect(get("lash-contact-far")).toMatchObject({kind:"contour",
      parentId:"face-outline",clipToParent:true,
      waxContact:"dry-wax",waxPressure:.47});
    const layers=scene.elements.map(e=>e.id);
    expect(layers.indexOf("iris-far")).toBeLessThan(
      layers.indexOf("upper-lid-far"));
    expect(layers.indexOf("lash-root-far")).toBeLessThan(
      layers.indexOf("hair-right-curtain"));
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("rejects invalid Storybook/native eye cameras before browser render",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    for(const focus of Object.values(CRAYON_F1_EYE_INSPECTION)){
      expect(focus.zoom).toBeLessThanOrEqual(3);
      expect(inspectCrayonScene({...scene,camera:[
        {frame:0,...focus},{frame:299,...focus},
      ]})).toEqual([]);
    }
    expect(inspectCrayonScene({...scene,camera:[
      {frame:0,focusX:269,focusY:546,zoom:3.35},
      {frame:299,focusX:269,focusY:546,zoom:3.35},
    ]})).not.toEqual([]);
  });
  it("places bilateral orbital cast in true F1 source anatomy before lid and hair",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const get=(id:string)=>scene.elements.find(e=>e.id===id);
    const ids=scene.elements.map(e=>e.id);
    for(const side of ["near","far"] as const){
      const id="eye-orbital-undercut-"+side;
      const e=get(id);
      expect(e).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"open",deposition:"stroke-built"});
      if(e?.kind!=="wax")throw new Error("Missing rooted orbital cast");
      // Native V4 actually exposed harsh boxed charcoal patches around
      // the eye: require broad feathering and bounded pressure rather
      // than rewarding extreme visible patch contrast.
      expect(e.blendRadius).toBeGreaterThanOrEqual(8);
      expect(e.markStrength).toBeLessThanOrEqual(.26);
      expect(ids.indexOf("socket-"+side)).toBeLessThan(ids.indexOf(id));
      expect(ids.indexOf(id)).toBeLessThan(ids.indexOf("sclera-"+side));
      expect(ids.indexOf(id)).toBeLessThan(ids.indexOf("hair-right-curtain"));
    }
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("renders dark eyebrow filaments through native paper-grain contact instead of identical smooth vector arches",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const fibres=scene.elements.filter(e=>e.id.startsWith("brow-fibers-"));
    expect(fibres).toHaveLength(8);
    for(const e of fibres){
      expect(e).toMatchObject({kind:"contour",parentId:"face-outline",
        clipToParent:true,waxContact:"dry-wax",waxPressure:.48});
      if(e.kind!=="contour")throw new Error("Brow lost fiber structure");
      expect(e.d.match(/M/g)?.length).toBeGreaterThanOrEqual(2);
      expect(e.d.match(/C/g)?.length).toBeGreaterThanOrEqual(2);
      expect(e.d).not.toMatch(/[QqZz]/);
      expect(e.width).toBeLessThan(.35);
      expect(e.opacity).toBeLessThanOrEqual(.55);
    }
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("uses measured, non-mirrored source eyelid/iris geometry with true native wax root groups",()=>{
    const scene=crayonCc0FaceStudy({eyeContact:"source-shade"});
    const baseline=crayonCc0FaceStudy({eyeContact:"baseline"});
    const find=(id:string)=>scene.elements.find(e=>e.id===id);
    for(const side of ["near","far"] as const){
      const sclera=find("sclera-"+side),iris=find("iris-"+side);
      const lid=find("upper-lid-"+side),root=find("lash-root-"+side);
      const eyelashes=find("lash-contact-"+side);
      for(const e of [sclera,iris,lid,root]){
        expect(e?.kind).toBe("wax");
        if(e?.kind!=="wax")throw Error("Missing source wax anatomy");
        expect(e.deposition).toBe("stroke-built");
        expect(e.d).toMatch(/^M[0-9]+/);
        expect(e.d).toMatch(/[CQ]/);
      }
      expect(eyelashes).toMatchObject({kind:"contour",
        waxContact:"dry-wax",parentId:"face-outline",clipToParent:true});
      if(eyelashes?.kind!=="contour")throw Error("No wax lash fibers");
      const n=(eyelashes.d.match(/M[0-9]+/g)??[]).length;
      expect(n).toBe(side==="near"?16:8);
      expect((eyelashes.d.match(/C/g)??[]).length).toBe(n);
      expect(eyelashes.waxPressure).toBeLessThan(.52);
    }
    const near=find("iris-near"),far=find("iris-far");
    expect(near?.kind).toBe("wax");expect(far?.kind).toBe("wax");
    if(near?.kind!=="wax"||far?.kind!=="wax")throw Error("Missing iris");
    // Dark, oblique iris itself now occupies less invented eyeball white
    // near the source's x240..282 and x408..463 photographic coordinates.
    expect(near.bounds.x).toBeGreaterThanOrEqual(235);
    expect(near.bounds.x+near.bounds.width).toBeLessThanOrEqual(290);
    expect(far.bounds.x).toBeGreaterThanOrEqual(400);
    expect(far.bounds.x+far.bounds.width).toBeLessThanOrEqual(472);
    // Existing eyelashes are unaltered in a verifiable negative control.
    expect(baseline.elements.find(e=>e.id==="lash-contact-near"))
      .toMatchObject({kind:"contour",waxPressure:.56});
    expect(baseline.elements.find(e=>e.id==="lash-contact-far"))
      .toMatchObject({kind:"contour",waxPressure:.53});
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("feathers directional wax pigment contacts rather than clipping a polygonal orbital sticker",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const soft=["socket-near","socket-far",
      "brow-superciliary-near","brow-superciliary-far",
      "eye-orbital-undercut-near","eye-orbital-undercut-far",
      "lower-lid-near","lower-lid-far",
      "lower-lid-margin-near","lower-lid-margin-far"];
    for(const id of soft){
      expect(scene.elements.find(e=>e.id===id)).toMatchObject({
        kind:"wax",coverage:"open",deposition:"stroke-built",
        featherContacts:true,parentId:"face-outline",clipToParent:true,
      });
    }
    const extra=["neck-submandibular-cast","neck-cervical-turn",
      "nose-sidewall-form","nasal-alar-attachment-near","nasal-alar-attachment-far",
      "labial-upper-value","labial-lower-value",
      "lip-upper","oral-opening","lip-lower"];
    for(const id of extra){
      expect(scene.elements.find(e=>e.id===id)).toMatchObject({
        kind:"wax",coverage:"open",featherContacts:true,
      });
    }
    expect(scene.elements.filter(e=>e.kind==="wax"&&e.featherContacts))
      .toHaveLength(soft.length+extra.length+5);
    for(const id of ["face-outline","hair-back","sclera-near","sclera-far"]){
      expect(scene.elements.find(e=>e.id===id)).toMatchObject({
        kind:"wax",coverage:"opaque",
      });
      expect(scene.elements.find(e=>e.id===id)).not.toHaveProperty("featherContacts",true);
    }
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html.match(/data-km-crayon-feather-contacts="open-wax"/g))
      .toHaveLength(soft.length+extra.length+5);
    expect(html.match(/data-km-crayon-contact-feather-mask=""/g))
      .toHaveLength(soft.length+extra.length+5);
    expect(html.match(/data-km-crayon-paper-contact-wax=""/g)?.length)
      .toBeGreaterThan(40);
    // The feather mask must leave the wax-grain deposits sharp and apply
    // spatially to their OUTER alpha instead. The parent face retains
    // hard clipping for anatomy and no tooth holes in opaque volumes.
    expect(html).toMatch(/data-km-crayon-wax=""/);
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("rejects accidental feathering of solid objects or unsupported open wax",()=>{
    const scene=crayonCc0FaceStudy();
    const base=scene.elements.find(e=>e.id==="socket-near");
    if(base?.kind!=="wax")throw new Error("Missing measured F1 skin");
    for(const invalid of [
      {...base,coverage:"opaque" as const},
      {...base,blendRadius:0},
      {...base,deposition:"smooth" as const},
      {...base,featherContacts:1 as unknown as boolean},
    ]){
      const modified={...scene,elements:scene.elements.map(e=>
        e.id===base.id?invalid:e)};
      expect(inspectCrayonScene(modified).join(" "))
        .toMatch(/featherContacts|blendRadius/);
    }
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
  it("uses physically layered high-pressure dark wax for irises and nostrils only",()=>{
    const scene=crayonCc0FaceStudy({view:"wax"});
    const dark=["iris-near","iris-far","pupil-near","pupil-far",
      "naris-shadow-near","naris-shadow-far","mouth-aperture-depth"];
    for(const id of dark){
      const e=scene.elements.find(e=>e.id===id);
      expect(e).toMatchObject({kind:"wax",coverage:"opaque",
        deposition:"stroke-built"});
      if(e?.kind!=="wax")throw Error("Missing saturated wax");
      expect(e.opaqueBurnish).toBeGreaterThanOrEqual(.83);
      expect(e.opaqueBurnish).toBeLessThanOrEqual(1);
      expect(e.underpaintTooth).toBeLessThanOrEqual(.12);
    }
    expect(scene.elements.filter(e=>e.kind==="wax"&&(e.opaqueBurnish??0)>0))
      .toHaveLength(dark.length);
    const paper="#f4e6d3",pigment="#21171c",pressure=.96;
    const baseline=crayonPaperTintedWaxBase(pigment,paper,pressure);
    expect(baseline).toBe(crayonPaperTintedWaxBase(pigment,paper,pressure,0));
    const saturated=crayonPaperTintedWaxBase(pigment,paper,pressure,1);
    for(const i of [1,3,5]){
      expect(parseInt(saturated.slice(i,i+2),16))
        .toBeLessThan(parseInt(baseline.slice(i,i+2),16));
    }
    expect(()=>crayonPaperTintedWaxBase(pigment,paper,pressure,1.01)).toThrow();
    expect(()=>crayonPaperTintedWaxBase(pigment,paper,pressure,NaN)).toThrow();
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html.match(/data-km-crayon-opaque-burnish="/g)).toHaveLength(7);
    expect(inspectCrayonScene(scene)).toEqual([]);
    const near=scene.elements.find(e=>e.id==="iris-near");
    if(near?.kind!=="wax")throw Error("Missing source eye");
    for(const invalid of [
      {...near,opaqueBurnish:1.5},
      {...near,coverage:"open" as const},
      {...near,deposition:"smooth" as const},
    ]){
      const mutated={...scene,elements:scene.elements.map(e=>
        e.id===near.id?invalid:e)};
      expect(inspectCrayonScene(mutated).join(" ")).toMatch(/opaqueBurnish/);
    }
  });
  it("aligns Storybook original photo crop to exact scene camera at all F1 source regions",()=>{
    const source=crayonCc0FaceStudy({view:"wax"});
    const cameras=[
      {focusX:269,focusY:546,zoom:2.95,expected:"translate(-80.5181%, -98.8632%) scale(2.9500)"},
      {focusX:416,focusY:622,zoom:3,expected:"translate(-155.2632%, -122.4584%) scale(3.0000)"},
      {focusX:417,focusY:734,zoom:3,expected:"translate(-155.7566%, -153.5120%) scale(3.0000)"},
      {focusX:312,focusY:871,zoom:2.4,expected:"translate(-73.1579%, -143.1978%) scale(2.4000)"},
    ] as const;
    for(const c of cameras){
      const spec={...source,camera:[
        {frame:0,focusX:c.focusX,focusY:c.focusY,zoom:c.zoom},
        {frame:299,focusX:c.focusX,focusY:c.focusY,zoom:c.zoom},
      ]};
      expect(crayonF1SourceCssCamera(spec,299)).toBe(c.expected);
      expect(crayonF1SourceCssCamera(spec,0)).toBe(c.expected);
      expect(inspectCrayonScene(spec)).toEqual([]);
    }
    expect(crayonF1SourceCssCamera(source,299))
      .toBe("translate(0.0000%, 0.0000%) scale(1.0000)");
  });
  it("rejects invalid settings without silently simplifying high-value regions",()=>{
    expect(()=>crayonCc0FaceStudy({detail:NaN})).toThrow();
    expect(()=>crayonCc0FaceStudy({detail:0})).toThrow();
    expect(()=>crayonCc0FaceStudy({detail:1.3})).toThrow();
    expect(()=>crayonCc0FaceStudy({view:"freehand" as "wax"})).toThrow();
    expect(()=>crayonCc0FaceStudy({fiberMaterial:"gloss" as "line"})).toThrow();
  });
});
