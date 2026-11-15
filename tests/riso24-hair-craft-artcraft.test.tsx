import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {inspectRisoCharacterMesh,evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {flattenRisoSvgPath,risoContourSignedArea,risoPointInContour} from "../registry/video/riso-path-geometry";
import {RisoCharacterInk,RisoCharacterKnockout} from "../registry/video/riso-character-react";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";

const studies=[
  {actor:COURIER,sheet:RISO_COURIER_SHEET,
   white:["cap-paper-ribbons","cap-brim-paper-welt"],
   engrave:["cap-crown-engraving","cap-brim-engraving"],
   expectedIslands:[5,2,6,3],
   baseId:"cap"},
  {actor:PAPER_ARTIST,sheet:RISO_PAPER_ARTIST_SHEET,
   white:["hair-paper-crown","hair-paper-side"],
   engrave:["hair-crown-engravings","hair-side-engravings","hair-fringe-root-ink","hair-temple-shadow-masses"],
   expectedIslands:[3,4,7,6,5,2],
   baseId:"hair-back"},
] as const;
const sampled=[46,78,160,198] as const;

describe("RISO24 ArtCraft v9 scalp flow and real paper-negative hair",()=>{
  it.each(studies)("$actor.id: preserves the original rig and maps every new semantic contour",({actor,sheet,white,engrave,expectedIslands,baseId})=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    expect(inspectRisoCharacterMesh(actor,sheet)).toEqual([]);
    const ids=new Set(actor.parts.map(p=>p.id));
    const mapped=new Set(sheet.regions.flatMap(r=>r.parts));
    expect(ids.has(baseId)).toBe(true);
    const pieces=[...white,...engrave];
    expect(pieces).toHaveLength(expectedIslands.length);
    for(const [i,id] of pieces.entries()){
      const part=actor.parts.find(p=>p.id===id)!;
      expect(part,id).toBeDefined();
      expect(part.joint,id).toBe("head");
      expect(part.knockoutOnly===true,id).toBe(white.includes(id as never));
      expect(part.opacity??1,id).toBe(1);
      expect(part.paint,id).toBe(id==="hair-temple-shadow-masses"?"screen":"solid");
      expect(mapped.has(id),id).toBe(true);
      const contours=flattenRisoSvgPath(part.d);
      expect(contours.length,id).toBe(expectedIslands[i]);
      for(const contour of contours){
        expect(contour.closed,id).toBe(true);
        expect(Math.abs(risoContourSignedArea(contour.points)),id).toBeGreaterThan(.05);
      }
    }
    expect(actor.parts.filter(p=>p.joint==="head").length).toBeGreaterThan(24);
  });

  it.each(studies)("$actor.id: source hair engraving is rooted inside its original cap/bob geometry",({actor,white,engrave})=>{
    // This negative control is independent of screenshot pixels, hatching
    // count and smoothness. It catches *actual* detached printed strokes.
    const base=actor.id==="courier"
      ? ["hair","cap","cap-brim"]
      : ["hair-back","hair-fringe"];
    const parents=base.flatMap(id=>flattenRisoSvgPath(actor.parts.find(p=>p.id===id)!.d)
      .map(path=>path.points));
    for(const id of [...white,...engrave]){
      const part=actor.parts.find(p=>p.id===id)!;
      const points=flattenRisoSvgPath(part.d).flatMap(path=>path.points);
      const inside=points.filter(p=>parents.some(poly=>risoPointInContour(p,poly))).length;
      const fraction=inside/points.length;
      expect(fraction,id+" rooted hair path pixel-plane coverage="+fraction.toFixed(3))
        .toBeGreaterThanOrEqual(.90);
    }
  });

  it("Courier and Paper Artist retain different root/grain/negative-space vocabulary",()=>{
    const cap=COURIER.parts.find(p=>p.id==="cap-paper-ribbons")!;
    const bob=PAPER_ARTIST.parts.find(p=>p.id==="hair-paper-crown")!;
    expect(cap.d).not.toEqual(bob.d);
    expect(COURIER.parts.find(p=>p.id==="cap-crown-engraving")!.plate).toBe("red");
    expect(PAPER_ARTIST.parts.find(p=>p.id==="hair-side-engravings")!.plate).toBe("red");
    expect(PAPER_ARTIST.parts.find(p=>p.id==="hair-paper-side")!.plate).toBe("blue");
  });

  it.each(studies)("$actor.id: white channels genuinely clear earlier ink, engraving remains newly printed",({actor,white,engrave})=>{
    for(const frame of sampled){
      const head=actor.parts.filter(p=>p.joint==="head").map(p=>p.id);
      const props={spec:actor,frame,onlyPartIds:head};
      const blue=renderToStaticMarkup(createElement(RisoCharacterInk,{
        ...props,plateId:"blue",paint:{solid:"#255B8E",dots:"url(#blue-screen)"},
      }));
      const red=renderToStaticMarkup(createElement(RisoCharacterInk,{
        ...props,plateId:"red",paint:{solid:"#D65641",dots:"url(#red-screen)"},
      }));
      const knockout=renderToStaticMarkup(createElement(RisoCharacterKnockout,
        {...props,spread:1.5}));
      for(const id of white){
        // White is a path-specific subtractive MASTER MASK, never a
        // translucent blue-on-blue highlight or a new RGB overlay.
        expect(blue,id).toContain('data-km-riso-paper-clearance="'+id+'"');
        expect(red,id).toContain('data-km-riso-paper-clearance="'+id+'"');
        expect(blue,id).not.toContain('data-km-riso-part="'+id+'"');
        expect(red,id).not.toContain('data-km-riso-part="'+id+'"');
        expect(knockout,id).toContain('data-km-riso-knockout-part="'+id+'"');
      }
      for(const id of engrave){
        const part=actor.parts.find(p=>p.id===id)!;
        const actual=part.plate==="blue"?blue:red;
        const other=part.plate==="blue"?red:blue;
        expect(actual,id).toContain('data-km-riso-part="'+id+'"');
        expect(other,id).not.toContain('data-km-riso-part="'+id+'"');
      }
      // A cropped head-only proof may have no painted ink *before* the face
      // clearance. Courier paints head hair after face; Paper Artist paints
      // blue hair-back before face. Only this latter plate needs the mask.
      // Whole-body films separately include coat/limbs before the face.
      if(actor.id==="paper-artist")
        expect(blue).toContain('data-km-riso-paper-clearance="face"');
      else
        expect(blue).not.toContain('data-km-riso-paper-clearance="face"');
      expect(red).not.toContain('data-km-riso-paper-clearance="face"');
    }
  });

  it.each(studies)("$actor.id: original facial silhouette and new hair parts survive poses and reversed seek",({actor,sheet,white,engrave})=>{
    const face=actor.parts.find(p=>p.id==="face")!;
    expect(face.knockoutOnly).toBe(true);
    const expected=actor.parts.filter(p=>[...white,...engrave].includes(p.id as never));
    for(const frame of sampled){
      const pose=evaluateRisoCharacter(actor,frame);
      const frameParts=new Map(pose.parts.map(p=>[p.id,p]));
      const faceWorld=frameParts.get("face")!.transform;
      for(const part of expected){
        const drawn=frameParts.get(part.id)!;
        expect(drawn.transform,part.id).toBe(faceWorld);
        expect(drawn.d,part.id).toBe(part.d);
      }
      const mesh=evaluateRisoCharacterMesh(actor,sheet,frame,{maxEdgeLength:10});
      for(const part of expected){
        const region=mesh.regions.find(r=>r.id===part.id)!;
        expect(region,part.id).toBeDefined();
        expect(region.contourArea,part.id).toBeGreaterThan(.1);
        expect(region.triangleArea,part.id).toBeGreaterThan(.1);
        expect(region.refinementTargetMet).toBeDefined();
      }
      expect(evaluateRisoCharacter(actor,frame)).toEqual(pose);
    }
    // Facial identities remain the same original code-authored source objects.
    expect(face.d).toMatch(/^M.+Z$/);
  });
});
