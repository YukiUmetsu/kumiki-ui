import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {inspectRisoCharacterMesh,evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {flattenRisoSvgPath,risoContourSignedArea,risoPointInContour} from "../registry/video/riso-path-geometry";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";

const subjects=[{actor:COURIER,sheet:RISO_COURIER_SHEET},
  {actor:PAPER_ARTIST,sheet:RISO_PAPER_ARTIST_SHEET}] as const;
const detailParts=[
  "ear-helix-fold","ear-concha-pocket","ear-tragus-root","ear-lobule-seam",
  "nasal-sidewall-line","nasal-ala-fold","upper-lip-engraving",
  "nasolabial-flow","labiomental-crease",
] as const;
const blue=new Set(["ear-helix-fold","ear-tragus-root","upper-lip-engraving","labiomental-crease"]);
const facialExpressions=[46,78,160,198] as const;

describe("RISO25 ArtCraft v9 ear and expression-linked midface printing",()=>{
  it.each(subjects)("$actor.id: valid physically authored source parts and head-local mesh",({actor,sheet})=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    expect(inspectRisoCharacterMesh(actor,sheet)).toEqual([]);
    const meshParts=new Set(sheet.regions.flatMap(r=>r.parts));
    for(const id of detailParts){
      const part=actor.parts.find(p=>p.id===id)!;
      expect(part,id).toBeDefined();
      expect(part.joint,id).toBe("head");
      expect(part.knockoutOnly,id).not.toBe(true);
      expect(part.paint,id).toBe("solid"); // engraving below a 2-unit screen cell cannot be halftoned
      expect(part.opacity??1,id).toBe(1);
      expect(part.plate,id).toBe(blue.has(id)?"blue":"red");
      expect(meshParts.has(id),id).toBe(true);
      const contours=flattenRisoSvgPath(part.d);
      expect(contours.length,id).toBe(id==="nasolabial-flow"?2:1);
      for(const contour of contours){
        expect(contour.closed,id).toBe(true);
        expect(Math.abs(risoContourSignedArea(contour.points)),id).toBeGreaterThan(.05);
      }
    }
    for(const id of ["upper-lip-engraving","nasolabial-flow","labiomental-crease"]){
      const shape=actor.parts.find(p=>p.id===id)!;
      for(const expression of ["speak","smile"]){
        expect(shape.expressions?.[expression],id).toBeDefined();
        expect(flattenRisoSvgPath(shape.expressions![expression]).length,id)
          .toBe(flattenRisoSvgPath(shape.d).length);
      }
    }
  });

  it.each(subjects)("$actor.id: the ear shell is connected, contoured and its subfeatures remain local",({actor})=>{
    const shell=actor.parts.find(p=>p.id==="ear-left")!;
    const outline=flattenRisoSvgPath(shell.d)[0].points;
    const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    expect(maxX-minX).toBeGreaterThan(9);
    expect(maxY-minY).toBeGreaterThan(17);
    expect(flattenRisoSvgPath(shell.d)[0].closed).toBe(true);
    for(const id of ["ear-helix-fold","ear-concha-pocket","ear-tragus-root","ear-lobule-seam"]){
      const part=actor.parts.find(p=>p.id===id)!;
      const samples=flattenRisoSvgPath(part.d).flatMap(c=>c.points);
      expect(samples.every(p=>p[0]>=minX-1.5&&p[0]<=maxX+2),id).toBe(true);
      expect(samples.every(p=>p[1]>=minY-1.5&&p[1]<=maxY+1.5),id).toBe(true);
    }
  });

  it.each(subjects)("$actor.id: new nose/lip/cheek ink is anatomically inside the face silhouette",({actor})=>{
    const face=flattenRisoSvgPath(actor.parts.find(p=>p.id==="face")!.d)[0].points;
    for(const id of ["nasal-sidewall-line","nasal-ala-fold","upper-lip-engraving",
      "nasolabial-flow","labiomental-crease"]){
      const part=actor.parts.find(p=>p.id===id)!;
      const samples=flattenRisoSvgPath(part.d).flatMap(c=>c.points);
      const inFace=samples.filter(p=>risoPointInContour(p,face)).length/samples.length;
      expect(inFace,id+" inside face fraction="+inFace.toFixed(3)).toBeGreaterThan(.85);
    }
  });

  it("Courier and Paper Artist have genuinely independent ear and facial mark geometry",()=>{
    for(const id of ["ear-left",...detailParts]){
      expect(COURIER.parts.find(p=>p.id===id)!.d,id)
        .not.toBe(PAPER_ARTIST.parts.find(p=>p.id===id)!.d);
    }
    expect(COURIER.parts.find(p=>p.id==="face")?.d)
      .not.toBe(PAPER_ARTIST.parts.find(p=>p.id==="face")?.d);
  });

  it.each(subjects)("$actor.id: blink/speak/smile keep lip inks attached and mesh source triangulated",({actor,sheet})=>{
    for(const frame of facialExpressions){
      const pose=evaluateRisoCharacter(actor,frame);
      const parts=new Map(pose.parts.map(part=>[part.id,part]));
      for(const id of detailParts){
        expect(parts.get(id)?.transform,id).toBe(parts.get("face")?.transform);
      }
      const mesh=evaluateRisoCharacterMesh(actor,sheet,frame,{maxEdgeLength:9});
      for(const id of detailParts){
        const matching=mesh.regions.filter(region=>region.parts.includes(id));
        expect(matching.length,id).toBeGreaterThanOrEqual(1);
        expect(matching.some(r=>r.contourArea>0.05&&r.triangleArea>0.01),id).toBe(true);
      }
      expect(evaluateRisoCharacter(actor,frame)).toEqual(pose);
    }
    const neutral=evaluateRisoCharacter(actor,46).parts.find(p=>p.id==="upper-lip-engraving")!;
    const speaking=evaluateRisoCharacter(actor,160).parts.find(p=>p.id==="upper-lip-engraving")!;
    const smiling=evaluateRisoCharacter(actor,198).parts.find(p=>p.id==="upper-lip-engraving")!;
    expect(speaking.d).not.toBe(neutral.d);
    expect(smiling.d).not.toBe(speaking.d);
  });

  it.each(subjects)("$actor.id: dual-color ink masters preserve original paper and separated detail",({actor})=>{
    for(const frame of [46,160,198]){
      const selected=actor.parts.filter(p=>p.joint==="head").map(p=>p.id);
      for(const plateId of ["blue","red"]){
        const svg=renderToStaticMarkup(createElement(RisoCharacterInk,{
          spec:actor,frame,plateId,
          onlyPartIds:selected,paint:{solid:plateId==="blue"?"#255B8E":"#D65641",dots:"url(#dots)"},
        }));
        for(const id of detailParts){
          if((blue.has(id)?"blue":"red")===plateId)
            expect(svg,id).toContain('data-km-riso-part="'+id+'"');
          else expect(svg,id).not.toContain('data-km-riso-part="'+id+'"');
        }
        expect(svg).not.toContain("feGaussianBlur");
      }
    }
  });
});
