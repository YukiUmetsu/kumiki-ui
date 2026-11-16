import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy,CRAYON_F1_FACE_PROOF}
  from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V30_SURFACE_IDS,CRAYON_F1_V30_CONTOUR_ANCHORS,
  crayonF1RebuildMalarMandible}
  from "../src/video/crayon-artcraft-f1-mandibular-turn";
import {Cc0MandibularTurnV30}
  from "../src/video/crayon-artcraft-adult-face.stories";

const part=(elements:readonly CrayonElement[],id:string)=>elements.find(e=>e.id===id);
const changed=new Set<string>(CRAYON_F1_V30_SURFACE_IDS);

describe("ArtCraft F1 V30 native crayon photographed 3/4 jaw and cheek",()=>{
  it("preserves all previous V29 anatomy, every micro-layer and exact original 300-frame film",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-orbital-hood"});
    const current=crayonCc0FaceStudy({midfaceForm:"source-mandibular-turn"});
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(current)).toEqual([]);
    expect(CRAYON_F1_V30_SURFACE_IDS).toHaveLength(4);
    expect(current.elements).toHaveLength(previous.elements.length);
    expect(current.elements.filter(e=>!changed.has(e.id))).toEqual(
      previous.elements.filter(e=>!changed.has(e.id)));
    for(const key of ["width","height","durationFrames","seed","paper",
      "paperTooth","camera","id"] as const)expect(current[key]).toEqual(previous[key]);
    for(const id of changed){
      const prior=part(previous.elements,id),next=part(current.elements,id);
      if(prior?.kind!=="wax"||next?.kind!=="wax")throw Error(id);
      expect(next.d).not.toEqual(prior.d);
      expect(next.parentId).toBe(prior.parentId);
      expect(next.clipToParent).toBe(prior.clipToParent);
      expect(next.timing).toEqual(prior.timing);
      expect(next.motion).toEqual(prior.motion);
      expect(next.pivot).toEqual(prior.pivot);
      expect(next.colors).toEqual(prior.colors);
      expect(next.underpaintGradient).toEqual(prior.underpaintGradient);
      expect(next.underpaintTooth).toEqual(prior.underpaintTooth);
      expect(next.markStrength).toEqual(prior.markStrength);
      expect(next.markLength).toEqual(prior.markLength);
      expect(next.d.match(/M/g)).toHaveLength(1);
      expect(next.d.match(/C/g)?.length).toBeGreaterThanOrEqual(5);
      expect(next.d).toMatch(/^M[\d.\s]+C.*Z$/);
    }
  });
  it("locks original photo registered cheek and asymmetric chin in one Bézier silhouette",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-mandibular-turn"});
    const outline=part(scene.elements,"face-outline");
    const jaw=part(scene.elements,"jaw-underside");
    const cast=part(scene.elements,"cheek-malar-cast");
    if(outline?.kind!=="wax"||jaw?.kind!=="wax"||cast?.kind!=="wax")
      throw Error("Missing face, jaw or malar anatomy");
    expect(CRAYON_F1_FACE_PROOF.sourceSha256)
      .toBe("f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(outline.d).toContain("398 858");
    expect(outline.d).toContain("80 681");
    const sourceLeft=CRAYON_F1_V30_CONTOUR_ANCHORS.photographedLeftMost;
    const drawnLeft=CRAYON_F1_V30_CONTOUR_ANCHORS.nearVisibleCheek;
    expect(Math.hypot(sourceLeft[0]-drawnLeft[0],sourceLeft[1]-drawnLeft[1]))
      .toBeLessThanOrEqual(9);
    expect(CRAYON_F1_V30_CONTOUR_ANCHORS.sourceChin)
      .toEqual(CRAYON_F1_FACE_PROOF.sourceLandmarks.chin);
    expect(outline.bounds.x).toBeLessThan(81);
    expect(outline.bounds.y).toBeLessThan(288);
    expect(outline.bounds.x+outline.bounds.width).toBeGreaterThan(501);
    expect(outline.bounds.y+outline.bounds.height).toBeGreaterThan(858);
    expect(jaw.d).toContain("398 858");
    expect(jaw.featherContacts).toBe(true);
    expect(jaw.blendRadius).toBeGreaterThan(18);
    expect(cast.d).toContain("157 725");
    expect(cast.featherContacts).toBe(true);
    expect(cast.blendRadius).toBeGreaterThan(15);
  });
  it("rejects missing, duplicate, wrong kind, invalid clip or double application",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-orbital-hood"});
    const finished=crayonCc0FaceStudy({midfaceForm:"source-mandibular-turn"});
    const first=part(scene.elements,"face-outline");
    if(!first)throw Error("Missing skin");
    expect(()=>crayonF1RebuildMalarMandible(
      scene.elements.filter(e=>e.id!=="chin-plane"))).toThrow(RangeError);
    expect(()=>crayonF1RebuildMalarMandible([...scene.elements,first]))
      .toThrow(RangeError);
    expect(()=>crayonF1RebuildMalarMandible(
      scene.elements.map(e=>e.id==="chin-plane"?
        {...e,kind:"contour"} as CrayonElement:e))).toThrow(RangeError);
    expect(()=>crayonF1RebuildMalarMandible(
      scene.elements.map(e=>e.id==="jaw-underside"?
        {...e,parentId:"neck-attached"}:e))).toThrow(RangeError);
    expect(()=>crayonF1RebuildMalarMandible(finished.elements)).toThrow(RangeError);
  });
  it("preserves low-detail opt-in combinations, native renderer and quarantined Storybook",()=>{
    expect(Cc0MandibularTurnV30.name).toContain("!dev");
    for(const jawNeckForm of ["baseline","source-contour"] as const){
      const scene=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-mandibular-turn",
        eyeContact:"source-shade",jawNeckForm});
      expect(inspectCrayonScene(scene)).toEqual([]);
      expect(scene.durationFrames).toBe(300);
      const native=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      for(const id of changed)
        expect(native).toContain('data-km-crayon-element="'+id+'"');
      expect(native).toContain("data-km-crayon-paper-contact-wax");
      expect(native).not.toContain("<image");
      expect(native).not.toContain("<foreignObject");
    }
  },40_000);
});
