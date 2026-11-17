import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V43_SOURCE_PATCHES,CRAYON_F1_V43_PHOTOGRAPHIC_SOURCE,
  crayonF1RebuildPhotoFoliageV43,
} from "../src/video/crayon-artcraft-f1-anat1-photo-foliage-v43";
import {
  Cc0Anat1PhotoFoliageV43,Cc0Anat1PhotoFoliageLeftV43,
  Cc0Anat1PhotoFoliageFarV43,
} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft CC0 V43 actual photographed foliage shadow/highlight silhouette",()=>{
  it("has 19 different photo-derived asymmetric polygons, 13 outer + six light islands",()=>{
    expect(CRAYON_F1_V43_PHOTOGRAPHIC_SOURCE.sha256).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V43_PHOTOGRAPHIC_SOURCE.artApproved).toBe(false);
    expect(CRAYON_F1_V43_PHOTOGRAPHIC_SOURCE.outerPatches).toBe(13);
    expect(CRAYON_F1_V43_PHOTOGRAPHIC_SOURCE.innerPatches).toBe(6);
    expect(CRAYON_F1_V43_SOURCE_PATCHES).toHaveLength(19);
    expect(new Set(CRAYON_F1_V43_SOURCE_PATCHES.map(p=>p.points)).size).toBe(19);
    for(const trace of CRAYON_F1_V43_SOURCE_PATCHES){
      const points=trace.points.split(" ");
      expect(points.length).toBeGreaterThanOrEqual(4);
      expect(points.length).toBeLessThan(70);
      expect(trace.median.length).toBe(3);
      for(const point of points){
        const [x,y]=point.split(",").map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(608);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(1082);
      }
    }
  });

  it("leaves all V41 ANAT1 facial/hair geometry and all V42 non-foliage wax byte-identical",()=>{
    for(const detail of [.2,1] as const){
      const v42=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hedge-v42"});
      const v43=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-photo-foliage-v43"});
      expect(inspectCrayonScene(v42)).toEqual([]);
      expect(inspectCrayonScene(v43)).toEqual([]);
      for(const key of ["id","width","height","seed","paper","paperTooth",
        "durationFrames","camera"] as const)expect(v43[key]).toEqual(v42[key]);
      expect(v43.elements.map(e=>e.id)).toEqual(v42.elements.map(e=>e.id));
      const count=detail===1?19:4;
      const changed:string[]=[];
      for(let i=0;i<v42.elements.length;i++){
        const a=v42.elements[i],b=v43.elements[i];
        if(a.id.startsWith("cc0-hedge-leaf-")){
          if(a.kind!=="wax"||b.kind!=="wax")throw Error("Lost source wax mass");
          expect(b.d).not.toBe(a.d);
          expect(b.d).toMatch(/^M\d/);
          expect(b.d).toContain(" C");
          expect(b.d.endsWith("Z")).toBe(true);
          expect(b.renderLayer).toBe("backdrop");
          expect(b.timing).toEqual(a.timing);
          expect(b.parentId).toBe(a.parentId);
          changed.push(b.id);
        }else if(a.id.startsWith("cc0-hedge-lamina-")){
          if(a.kind!=="contour"||b.kind!=="contour")
            throw Error("Missing native source wax contact");
          expect(b.d).not.toBe(a.d);
          expect(b.clipToParent).toBe(true);
          expect(b.parentId).toBe(a.parentId);
          expect(b.renderLayer).toBe("backdrop");
          expect(b.waxContact).toBe("dry-wax");
          expect(b.timing).toEqual(a.timing);
          changed.push(b.id);
        }else{
          expect(b).toEqual(a);
        }
      }
      expect(changed).toHaveLength(count*2);
      expect(v43.durationFrames).toBe(300);
      expect(v43.elements.filter(x=>x.id.startsWith("hair-rooted-")))
        .toEqual(v42.elements.filter(x=>x.id.startsWith("hair-rooted-")));
    }
  });

  it("rejects missing source photo wax and mangled two-layer botanical contour hierarchy",()=>{
    const v42=crayonCc0FaceStudy({midfaceForm:"source-anat1-hedge-v42"});
    expect(()=>crayonF1RebuildPhotoFoliageV43([])).toThrow(RangeError);
    expect(()=>crayonF1RebuildPhotoFoliageV43(v42.elements.filter(e=>
      e.id!=="cc0-hedge-dark-underpaint"))).toThrow(RangeError);
    expect(()=>crayonF1RebuildPhotoFoliageV43(v42.elements.filter(e=>
      !e.id.startsWith("cc0-hedge-lamina-")))).toThrow(RangeError);
    expect(()=>crayonF1RebuildPhotoFoliageV43([
      ...v42.elements,v42.elements[0],
    ])).toThrow(RangeError);
    const foliage=v42.elements.find(e=>e.id.startsWith("cc0-hedge-leaf-"));
    if(!foliage)throw Error("No photographed foliage parent");
    expect(()=>crayonF1RebuildPhotoFoliageV43(v42.elements.map(el=>
      el.id===foliage.id?{...el,renderLayer:"normal" as const}:el)))
      .toThrow(RangeError);
  });

  it("native Storybook scenes retain dry wax/paper and a true behind-face painter layer",()=>{
    for(const story of [
      Cc0Anat1PhotoFoliageV43,Cc0Anat1PhotoFoliageLeftV43,
      Cc0Anat1PhotoFoliageFarV43,
    ])expect(story.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({detail:.2,
      midfaceForm:"source-anat1-photo-foliage-v43"});
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="cc0-hedge-dark-underpaint"');
    expect(html).toContain('data-km-crayon-element="cc0-hedge-leaf-near-left-broad"');
    expect(html).toContain('data-km-crayon-element="cc0-hedge-lamina-near-left-broad"');
    expect(html).toContain('data-km-crayon-element="face-outline"');
    expect(html).toContain('data-km-crayon-element="iris-near"');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    const hedge=html.indexOf('data-km-crayon-element="cc0-hedge-dark-underpaint"');
    const face=html.indexOf('data-km-crayon-element="face-outline"');
    expect(face).toBeGreaterThan(hedge);
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
