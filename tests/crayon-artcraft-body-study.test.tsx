import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonArtcraftBodyStudy,CRAYON_BODY_OBSERVED,
  CRAYON_BODY_REFERENCE} from "../src/video/crayon-artcraft-body-study";
import artcraftMeta,{SourceMeasuredBodyStudy}
  from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft source-studied adult body (research-only)",()=>{
  it("keeps the single Crayon Storybook folder quarantined from polished galleries",()=>{
    expect(artcraftMeta.title).toBe("Video production/Film Looks/Crayon/ArtCraft Adult Face Lab");
    expect(artcraftMeta.tags).toContain("!dev");
    expect(SourceMeasuredBodyStudy.name).toContain("ArtCraft experiment");
    expect(CRAYON_BODY_REFERENCE.license).toBe("CC BY-SA 4.0");
    expect(CRAYON_BODY_REFERENCE.caveat).toMatch(/not source-pixel/);
  });
  it("measures a complete nonuniform shoulder/hip/knee/ankle anchor graph",()=>{
    expect(Object.keys(CRAYON_BODY_OBSERVED).length).toBe(22);
    for(const p of Object.values(CRAYON_BODY_OBSERVED)){
      expect(p[0]).toBeGreaterThanOrEqual(0);
      expect(p[0]).toBeLessThanOrEqual(669);
      expect(p[1]).toBeGreaterThanOrEqual(0);
      expect(p[1]).toBeLessThanOrEqual(1000);
    }
    const a=CRAYON_BODY_OBSERVED;
    expect(a.crown[1]).toBeLessThan(a.chin[1]);
    expect(a.chin[1]).toBeLessThan(a.shoulder_left[1]);
    expect(a.waist_left[1]).toBeLessThan(a.crotch[1]);
    expect(a.crotch[1]).toBeLessThan(a.knee_left[1]);
    expect(a.knee_left[1]).toBeLessThan(a.ankle_left[1]);
    expect(a.ankle_left[1]).toBeLessThan(a.toe_left[1]);
    // Natural pose is deliberately asymmetric, not mirrored capsule legs.
    expect(a.knee_left[0]+a.knee_right[0]).not.toBe(2*a.crotch[0]);
    expect(a.shoulder_right[0]-a.shoulder_left[0])
      .toBeGreaterThan(a.hip_right[0]-a.hip_left[0]);
  });
  it("preserves opaque semantic volume parts and distinct cloth/hand detail",()=>{
    const spec=crayonArtcraftBodyStudy();
    expect(inspectCrayonScene(spec)).toEqual([]);
    expect(spec).toMatchObject({width:669,height:1000,seed:11837,durationFrames:300});
    const hair=spec.elements.find(e=>e.id==="hair-back");
    expect(hair?.kind).toBe("wax");
    if(hair?.kind!=="wax")throw new Error("Short hair source mass missing");
    // Source B1 has short layered hair, not the original invented bob whose
    // side cap dropped to the jaw and below the neck line.
    expect(hair.bounds.height).toBeLessThan(150);
    expect(hair.bounds.width).toBeLessThan(165);
    expect(spec.elements.find(e=>e.id==="left-sideburn")).toBeDefined();
    expect(spec.elements.find(e=>e.id==="right-sideburn")).toBeDefined();
    // A neutral face is an explicitly blocked construction reference, NOT
    // an implicitly approved fabricated portrait with symbol eyes.
    expect(spec.elements.find(e=>/face-eye|face-mouth|face-nose/.test(e.id)))
      .toBeUndefined();
    const ids=spec.elements.map(e=>e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const id of [
      "hair-back","neck","face-blockout","arm-right-forearm",
      "hand-right","arm-left","hand-left","crotch-and-pelvis",
      "trouser-leg-left","trouser-leg-right",
      "shoe-left","shoe-right","shirt-main",
      "sleeve-left-roll","sleeve-right-roll",
      "left-cuff-overlap","right-cuff-overlap",
      "collar-left","collar-right","placket",
      "left-breast-pocket","right-breast-pocket",
      "shirt-button-0","hand-left-finger-crease",
      "hand-right-knuckles","denim-fold-0","hair-rooted-flow",
      "left-shoe-sole","right-shoe-sole"]){
      expect(ids).toContain(id);
    }
    const body=spec.elements.filter(e=>e.kind==="wax" &&
      ["hand-left","hand-right","shirt-main","trouser-leg-left",
       "trouser-leg-right","shoe-left","shoe-right"].includes(e.id));
    expect(body).toHaveLength(7);
    expect(body.every(x=>x.kind==="wax"&&x.coverage==="opaque"&&
      x.deposition==="stroke-built")).toBe(true);
    expect(ids.filter(id=>id.startsWith("shirt-woven-pinstripe-")).length)
      .toBeGreaterThan(18);
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="hand-left"');
    expect(html).toContain('data-km-crayon-element="hand-right"');
    expect(html).toContain('data-km-crayon-underpaint="opaque"');
    expect(html).toBe(renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>));
  });
  it("uses source anchors only in the explicit construction inspection view",()=>{
    const construction=crayonArtcraftBodyStudy({view:"construction",detail:.3});
    const painted=crayonArtcraftBodyStudy({view:"painted",detail:.3});
    expect(inspectCrayonScene(construction)).toEqual([]);
    expect(inspectCrayonScene(painted)).toEqual([]);
    expect(construction.elements.filter(e=>e.id.startsWith("body-source-landmark-")))
      .toHaveLength(22);
    expect(construction.elements.filter(e=>e.id.startsWith("body-source-bone-")).length)
      .toBeGreaterThanOrEqual(18);
    expect(painted.elements.find(e=>e.id.startsWith("body-source-landmark-")))
      .toBeUndefined();
    const common=(spec:typeof painted)=>spec.elements.filter(e=>
      !e.id.startsWith("body-source-"));
    expect(common(construction)).toEqual(common(painted));
  });
  it("rejects invalid variant settings instead of silently deleting anatomy",()=>{
    expect(()=>crayonArtcraftBodyStudy({detail:0})).toThrow();
    expect(()=>crayonArtcraftBodyStudy({detail:NaN})).toThrow();
    expect(()=>crayonArtcraftBodyStudy({detail:1.01})).toThrow();
    expect(()=>crayonArtcraftBodyStudy({view:"wrong" as "painted"})).toThrow();
  });
});
