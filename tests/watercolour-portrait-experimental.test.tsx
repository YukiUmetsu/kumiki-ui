import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WatercolourIllustration,inspectWatercolourArtwork}
  from "../registry/video/watercolour-illustration";
import type {WatercolourArtPart} from "../registry/video/watercolour-illustration";
import {
  experimentalWatercolourPortrait,EXPERIMENTAL_FACE_REGION_PLAN,
} from "../src/video/experimental/watercolour-portrait-study";

function parts(p:WatercolourArtPart):WatercolourArtPart[]{
  return p.kind==="group"?[p,...p.children.flatMap(parts)]:[p];
}

describe("WC17 experimental portrait stays internal until numeric/artistic review",()=>{
  it("constructs a valid original, static, code-authored watercolor painting",()=>{
    const a=experimentalWatercolourPortrait();
    expect(a.version).toBe(1);
    expect([a.width,a.height]).toEqual([550,688]);
    expect(inspectWatercolourArtwork(a)).toEqual([]);
    const all=a.parts.flatMap(parts);
    const ids=all.map(p=>p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(all.length).toBeGreaterThan(65);
    expect(all.every(p=>p.startFrame===undefined&&p.keys===undefined)).toBe(true);
    for(const id of ["face-primary-opaque","connected-near-ear","nose-side-warm",
      "nasal-root-violet","near-eye-lid-clipping","far-eye-lid-clipping",
      "near-upper-lid-structured","far-upper-lid-structured",
      "upper-lip-uneven-umber","lower-lip-plump-light","jaw-underplane",
      "crown-swept-fringe","head-back-umber-volume","cloth-opaque-support"]){
      expect(ids).toContain(id);
    }
    for(const id of ["face-primary-opaque","head-back-umber-volume",
      "cloth-opaque-support","near-eye-opaque-sclera","far-eye-opaque-sclera"]){
      const node=all.find(p=>p.id===id);
      expect(node?.kind).toBe("path");
      if(node?.kind==="path"){
        expect(node.composite).toBe("normal");
        expect(node.opacity).toBeGreaterThan(.8);
      }
    }
    expect(all.filter(p=>p.kind==="path"&&p.technique==="wash").length)
      .toBeGreaterThan(45);
    expect(all.filter(p=>p.kind==="path"&&p.technique==="drybrush").length)
      .toBeGreaterThan(9);
  });
  it("keeps left and right iris paths inside distinct original anatomical clips",()=>{
    const p=experimentalWatercolourPortrait().parts.flatMap(parts);
    const a=p.find(x=>x.id==="near-eye-lid-clipping");
    const b=p.find(x=>x.id==="far-eye-lid-clipping");
    expect(a?.kind).toBe("group");
    expect(b?.kind).toBe("group");
    if(a?.kind!=="group"||b?.kind!=="group")return;
    expect(a.clipPath).toMatch(/C.*Q.*Z/);
    expect(b.clipPath).toMatch(/C.*Q.*Z/);
    expect(a.clipPath).not.toBe(b.clipPath);
    expect(a.children.map(p=>p.id)).toEqual([
      "near-eye-opaque-sclera","near-iris-occluded",
      "near-pupil-occluded","near-pupil-illumination",
    ]);
  });
  it("requires full-frame and exact eye/nose/mouth/edge source regions",()=>{
    expect(Object.keys(EXPERIMENTAL_FACE_REGION_PLAN).sort()).toEqual([
      "far-eye","full-face","hairline","jaw","mouth","near-eye","nose",
    ]);
    for(const box of Object.values(EXPERIMENTAL_FACE_REGION_PLAN)){
      expect(box[2]-box[0]).toBeGreaterThanOrEqual(60);
      expect(box[3]-box[1]).toBeGreaterThanOrEqual(40);
    }
    const a=renderToStaticMarkup(<WatercolourIllustration
      spec={experimentalWatercolourPortrait()} frame={0}/>);
    expect(a).toContain('data-km-watercolour-part="near-eye-lid-clipping"');
    expect(a).toContain('data-km-watercolour-part="far-eye-lid-clipping"');
    expect(a).toContain('data-km-watercolour-part="face-primary-opaque"');
    expect(a).not.toContain("NaN");
    expect(a).not.toContain("Infinity");
    expect(a).not.toContain("image href");
    expect(a).toBe(renderToStaticMarkup(<WatercolourIllustration
      spec={experimentalWatercolourPortrait()} frame={0}/>));
  });
  it("fails closed on invalid pigments and does not leak the abandoned WC13 sitters",()=>{
    expect(()=>experimentalWatercolourPortrait(-1)).toThrow(RangeError);
    const art=experimentalWatercolourPortrait(9);
    const invalid={...art,parts:art.parts.slice(0,1).map(p=>
      p.kind==="group"?{...p,id:"bad_id"}:p)} as typeof art;
    expect(inspectWatercolourArtwork(invalid).length).toBeGreaterThan(0);
    const markup=renderToStaticMarkup(<WatercolourIllustration spec={art} frame={0}/>);
    expect(markup).not.toContain("rebuilt-human");
    expect(markup).not.toContain("sitter-a");
    expect(markup).not.toContain("sitter-b");
  });
});
