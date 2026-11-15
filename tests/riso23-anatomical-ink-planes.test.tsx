import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {inspectRisoCharacterMesh,evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {inspectRisoPrint} from "../registry/video/print-plates";
import {createRisoScreenGeometry} from "../registry/video/riso-screening";
import type {RisoPrintSpec} from "../registry/video/print-plates";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";

const subjects=[
  {actor:COURIER,sheet:RISO_COURIER_SHEET},
  {actor:PAPER_ARTIST,sheet:RISO_PAPER_ARTIST_SHEET},
] as const;
const regions=["orbital-tone-planes","zygomatic-tone-planes","jaw-shadow-planing"] as const;
const engravings=["eye-iris-grain","eye-lower-orbit-engraving"] as const;
const stressed=[46,78,160,198] as const;

describe("RISO23 actual-render-informed facial tone and microink layout",()=>{
  it("the production print contract permits an actual two-unit fine screen, rejects subpixel alias-prone pitches",()=>{
    const fine=createRisoScreenGeometry({cell:2,mode:"am",density:.33,
      dotGain:0,seed:38,plateIndex:0});
    expect(fine.tileSize).toBe(2);
    expect(fine.dots).toHaveLength(1);
    expect(fine.dots[0].r).toBeGreaterThan(.4);
    expect(fine.dots[0].r).toBeLessThan(1);
    const fm=createRisoScreenGeometry({cell:2,mode:"fm",density:.33,
      dotGain:0,seed:38,plateIndex:0});
    expect(fm.tileSize).toBe(16);
    expect(fm.dots.length).toBeGreaterThan(15);
    for(const cell of [1.99,0,-1,NaN,Infinity])
      expect(()=>createRisoScreenGeometry({cell,mode:"am",density:.33,
        dotGain:0,seed:38,plateIndex:0})).toThrow(RangeError);
    const spec:RisoPrintSpec={
      version:1,width:640,height:360,paper:"#F6EDDD",seed:38,startFrame:0,passFrames:1,gapFrames:0,
      plates:[{id:"blue",color:"#255B8E",opacity:1,dotCell:2,dotAngle:-12,registration:[0,0]},
        {id:"red",color:"#D65641",opacity:1,dotCell:2,dotAngle:17,registration:[.5,-.4]}],
    };
    expect(inspectRisoPrint(spec)).toEqual([]);
    expect(inspectRisoPrint({...spec,plates:spec.plates.map(p=>({...p,dotCell:1.99}))})
      .some(issue=>issue.code==="plate-cell")).toBe(true);
  });

  it.each(subjects)("$actor.id: valid large tonal planes and non-sampling-limited eye engraving",({actor,sheet})=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    expect(inspectRisoCharacterMesh(actor,sheet)).toEqual([]);
    const mapped=new Set(sheet.regions.flatMap(r=>r.parts));
    for(const id of regions){
      const part=actor.parts.find(p=>p.id===id)!;
      expect(part,id).toBeDefined();
      expect(part.joint,id).toBe("head");
      expect(part.plate).toBe("red");
      expect(part.paint,id).toBe("screen");
      expect(part.knockoutOnly).not.toBe(true);
      expect(part.opacity??1).toBe(1);
      const paths=flattenRisoSvgPath(part.d);
      expect(paths,id).toHaveLength(2);
      expect(mapped.has(id)).toBe(true);
      // Each area is much larger than one of the 1–2 unit engraving ribbons;
      // a screen intended to simulate physical grain must have room for dots.
      for(const region of paths){
        expect(Math.abs(risoContourSignedArea(region.points)),id).toBeGreaterThan(12);
        const xs=region.points.map(p=>p[0]),ys=region.points.map(p=>p[1]);
        expect(Math.max(...xs)-Math.min(...xs),id).toBeGreaterThan(7);
        expect(Math.max(...ys)-Math.min(...ys),id).toBeGreaterThan(7);
      }
    }
    for(const id of engravings){
      const part=actor.parts.find(p=>p.id===id)!;
      expect(part.paint,id).toBe("solid");
      expect(part.plate,id).toBe("red");
    }
  });

  it("Courier and Paper Artist retain individually drawn bone/face form planes",()=>{
    for(const id of regions){
      expect(COURIER.parts.find(p=>p.id===id)?.d,id)
        .not.toBe(PAPER_ARTIST.parts.find(p=>p.id===id)?.d);
    }
    for(const actor of [COURIER,PAPER_ARTIST]){
      expect(actor.parts.filter(p=>p.id==="face"&&p.knockoutOnly)).toHaveLength(1);
      expect(actor.parts.every(p=>(p.opacity??1)===1)).toBe(true);
    }
  });

  it.each(subjects)("$actor.id: plane contour topologies and independent joints survive stress poses",({actor,sheet})=>{
    for(const frame of stressed){
      const pose=evaluateRisoCharacter(actor,frame);
      const parts=new Map(pose.parts.map(p=>[p.id,p]));
      const face=parts.get("face")!;
      for(const id of regions){
        const contour=parts.get(id)!;
        expect(contour.transform,id).toBe(face.transform);
        expect(contour.d).toBe(actor.parts.find(p=>p.id===id)!.d);
      }
      const mesh=evaluateRisoCharacterMesh(actor,sheet,frame,{maxEdgeLength:8});
      const names=actor.id==="courier"
        ? ["screen-orbit-left","screen-orbit-right","screen-cheek-left",
            "screen-cheek-right","screen-jaw-left","screen-jaw-right"]
        : [...regions];
      for(const id of names){
        const r=mesh.regions.find(p=>p.id===id)!;
        expect(r,id).toBeDefined();
        expect(r.contourArea,id).toBeGreaterThan(12);
        expect(r.triangleArea,id).toBeGreaterThan(10);
        expect(r.triangleArea,id).toBeLessThan(r.contourArea*1.05);
      }
      expect(evaluateRisoCharacter(actor,frame)).toEqual(pose);
    }
  });

  it.each(subjects)("$actor.id: real spot master renders wide screened tone and thin continuous red marks",({actor})=>{
    const ink=renderToStaticMarkup(createElement(RisoCharacterInk,{
      spec:actor,frame:198,plateId:"red",paint:{solid:"#D65641",dots:"url(#riso-test-dots)"},
    }));
    const separate=renderToStaticMarkup(createElement(RisoCharacterInk,{
      spec:actor,frame:198,plateId:"blue",paint:{solid:"#255B8E",dots:"url(#riso-test-dots)"},
    }));
    for(const id of regions){
      expect(ink).toContain('data-km-riso-part="'+id+'"');
      expect(separate).not.toContain('data-km-riso-part="'+id+'"');
      expect(ink).toMatch(new RegExp('data-km-riso-part="'+id+'"[^>]+fill="url\\(#riso-test-dots\\)"'));
    }
    for(const id of engravings)
      expect(ink).toMatch(new RegExp('data-km-riso-part="'+id+'"[^>]+fill="#D65641"'));
    expect(ink).toContain('data-km-riso-paper-clearance="face"');
  });
});
