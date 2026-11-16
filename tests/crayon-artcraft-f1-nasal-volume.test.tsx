import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_NOSE_VOLUME_IDS,CRAYON_F1_NOSE_VOLUME_ANCHORS,
  crayonF1ConstructNasalVolume} from "../src/video/crayon-artcraft-f1-nasal-volume";
import {Cc0NasalVolume,Cc0NasalVolumeWholeFace}
  from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft F1 V21 source anatomical nose volume (unapproved)",()=>{
  const get=(scene:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
    scene.elements.find(e=>e.id===id);
  const ids=new Set<string>(CRAYON_F1_NOSE_VOLUME_IDS);

  it("keeps V20 controls, entire original figure, paper and animation unchanged",()=>{
    const baseline=crayonCc0FaceStudy();
    const prev=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"});
    const candidate=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    for(const scene of [baseline,prev,candidate])
      expect(inspectCrayonScene(scene)).toEqual([]);
    expect(candidate.elements).toHaveLength(prev.elements.length);
    for(const key of ["seed","width","height","durationFrames",
      "camera","paper","paperTooth"] as const)
      expect(candidate[key]).toEqual(prev[key]);
    expect(candidate.elements.filter(e=>!ids.has(e.id))).toEqual(
      prev.elements.filter(e=>!ids.has(e.id)));
    for(const id of CRAYON_F1_NOSE_VOLUME_IDS){
      const a=get(prev,id),b=get(candidate,id);
      if(a?.kind!=="wax"||b?.kind!=="wax")
        throw Error("Missing F1 volume "+id);
      expect(b.parentId).toEqual(a.parentId);
      expect(b.clipToParent).toEqual(a.clipToParent);
      expect(b.timing).toEqual(a.timing);
      expect(b.deposition).toBe("stroke-built");
      expect(b.coverage).toBe("open");
      expect(b.nibStyle).toBe("dry");
      expect(b.featherContacts).toBe(true);
      expect(b.blendRadius).toBeGreaterThan(6);
      // V21b deliberately attenuates the root and both broad sidewalls
      // after actual native V21 pixels failed as an oversized dark hatch.
      // Enforce their *upper* pressure bound instead of accidentally
      // requiring stronger wax (which would reintroduce the rejected smear).
      if(["nose-root","nose-sidewall","nose-sidewall-form"].includes(id)){
        expect(b.markStrength).toBeGreaterThanOrEqual(.2);
        expect(b.markStrength).toBeLessThan(.3);
      }else{
        expect(b.markStrength).toBeGreaterThan(.3);
      }
      expect(b.spacing).toBeGreaterThanOrEqual(4);
      expect(b.outlineOpacity).toBe(0);
      expect(b.d.includes("C")).toBe(true);
    }
    expect(new Set(candidate.elements.map(e=>e.id)).size)
      .toBe(candidate.elements.length);
  });

  it("preserves exact V20 nostril rims and builds asymmetric 3/4 cartilage volumes",()=>{
    const prev=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    for(const side of ["near","far"] as const){
      for(const id of ["naris-shadow-"+side,"alar-roof-"+side])
        expect(get(next,id)).toEqual(get(prev,id));
    }
    const root=get(next,"nose-root"),dorsum=get(next,"nose-dorsum");
    const near=get(next,"nose-alar-near"),far=get(next,"nose-alar-far");
    const septum=get(next,"nose-septal-transition");
    if(root?.kind!=="wax"||dorsum?.kind!=="wax"||near?.kind!=="wax"||
       far?.kind!=="wax"||septum?.kind!=="wax")
      throw Error("Missing nasal morphology");
    expect(root.bounds.y).toBeLessThan(dorsum.bounds.y);
    const sidewall=get(next,"nose-sidewall-form");
    if(sidewall?.kind!=="wax")throw Error("Missing source sidewall");
    // A rejected V21 148px dark hatch ran from nose root to cheek.
    // Keep the feathered source-sidewall locally bounded and warmer.
    expect(sidewall.bounds.height).toBeLessThan(110);
    expect(sidewall.bounds.y).toBeGreaterThan(540);
    expect(sidewall.markStrength).toBeLessThan(.3);
    expect(dorsum.bounds.height).toBeGreaterThan(near.bounds.height);
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(near.angle).not.toBe(far.angle);
    expect(near.colors).not.toEqual(far.colors);
    expect(septum.bounds.x).toBeLessThan(far.bounds.x);
    expect(CRAYON_F1_NOSE_VOLUME_ANCHORS).toMatchObject({
      boneRoot:[357,531],bulb:[409,612],septalTurn:[431,646],
    });
    expect(Cc0NasalVolume.name).toContain("!dev");
    expect(Cc0NasalVolumeWholeFace.name).toContain("unapproved");
  });

  it("fails closed for altered anatomy, duplicate and reapplication",()=>{
    const original=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"});
    const candidate=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    expect(()=>crayonF1ConstructNasalVolume(original.elements.filter(e=>
      e.id!=="nose-root"))).toThrow(RangeError);
    const root=get(original,"nose-root");
    if(!root)throw Error("No root");
    expect(()=>crayonF1ConstructNasalVolume([...original.elements,root]))
      .toThrow(RangeError);
    expect(()=>crayonF1ConstructNasalVolume(candidate.elements))
      .toThrow(RangeError);
  });

  it("renders native wax, not photo overlay, SVG image or smooth filter",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of CRAYON_F1_NOSE_VOLUME_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).not.toContain("<image");
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-contact-clumps="wax"');
  });
});
