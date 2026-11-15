import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {evaluateRisoCharacterMesh,inspectRisoCharacterMesh,risoMeshBounds} from "../registry/video/riso-proportion-mesh";
import {RisoCharacterInk,RisoCharacterKnockout} from "../registry/video/riso-character-react";
import {flattenRisoSvgPath} from "../registry/video/riso-path-geometry";
import {RisoPrint} from "../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../registry/video/print-plates";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET} from "../src/video/riso-human-ensemble";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";

const newParts=["eye-canthus-shapes","eye-lash-wedges","eye-iris-grain","eye-lower-orbit-engraving"] as const;
const poses=[46,78,160,198] as const;
const actors=[{actor:COURIER,sheet:RISO_COURIER_SHEET},
  {actor:PAPER_ARTIST,sheet:RISO_PAPER_ARTIST_SHEET}] as const;
const partsAt=(actor:typeof COURIER,frame:number)=>
  new Map(evaluateRisoCharacter(actor,frame).parts.map(part=>[part.id,part]));

describe("RISO21 ArtCraft v9 distinct source-authoring eye features",()=>{
  it.each(actors)("$actor.id: preserves valid independent opaque print models",({actor,sheet})=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    expect(inspectRisoCharacterMesh(actor,sheet)).toEqual([]);
    const mapped=new Set(sheet.regions.flatMap(r=>r.parts));
    const oldEyes=new Set(["eye-upper-lid-folds","eye-lower-lids","iris-left","iris-right",
      "eye-left","eye-right","eye-line"].filter(id=>actor.parts.some(p=>p.id===id)));
    expect(oldEyes.size).toBeGreaterThanOrEqual(4);
    for(const id of newParts){
      const part=actor.parts.find(p=>p.id===id);
      expect(part,id).toBeDefined();
      expect(part!.joint).toBe("head");
      expect(part!.knockoutOnly).not.toBe(true);
      expect(part!.opacity??1).toBe(1);
      expect(part!.d).toMatch(/^M.+Z$/);
      expect((part!.d.match(/[CQ]/g)??[]).length,id).toBeGreaterThanOrEqual(5);
      expect(part!.expressions?.blink,id).toMatch(/^M.+Z$/);
      expect(mapped.has(id),id).toBe(true);
    }
    expect(actor.parts.find(p=>p.id==="eye-iris-grain")!.plate).toBe("red");
    // RISO23 actual Chromium review: small irises cannot hold a 6-unit dot
    // screen. Solid separated-red engraving is intentional, not a regression.
    expect(actor.parts.find(p=>p.id==="eye-iris-grain")!.paint).toBe("solid");
    expect(actor.parts.find(p=>p.id==="eye-lower-orbit-engraving")!.paint).toBe("solid");
    for(const name of ["orbital-tone-planes","zygomatic-tone-planes","jaw-shadow-planing"]){
      expect(actor.parts.find(p=>p.id===name)?.paint).toBe("screen");
      expect(actor.parts.find(p=>p.id===name)?.plate).toBe("red");
    }
    for(const name of ["eye-lash-wedges","eye-canthus-shapes"])
      expect(actor.parts.find(p=>p.id===name)?.paint).toBe("solid");
  });

  it("Courier and Paper Artist use different source curves, not a mirrored/copy-pasted face",()=>{
    for(const id of newParts){
      const c=COURIER.parts.find(p=>p.id===id)!;
      const p=PAPER_ARTIST.parts.find(p=>p.id===id)!;
      expect(c.d,id).not.toEqual(p.d);
      expect(c.expressions?.blink,id).not.toEqual(p.expressions?.blink);
    }
  });

  it.each(actors)("$actor.id: constrains all new detail to actual source face envelope in every film pose",({actor,sheet})=>{
    for(const frame of poses){
      const mesh=evaluateRisoCharacterMesh(actor,sheet,frame,{maxEdgeLength:8});
      const source=mesh.regions.find(region=>region.id===(actor.id==="courier"?"head-shape":"face"))!;
      const bounds=risoMeshBounds(source.outline);
      const ocularIds=actor.id==="courier"
        ? ["eye-canthus-left","eye-canthus-right","eye-lash-left","eye-lash-right",
          "iris-screen-left","iris-screen-right","orbit-hatching-left","orbit-hatching-right"]
        : [...newParts];
      for(const id of ocularIds){
        const region=mesh.regions.find(r=>r.id===id)!;
        expect(region,id).toBeDefined();
        expect(region.contourArea,id).toBeGreaterThan(.01);
        expect(region.triangleArea,id).toBeGreaterThan(0);
        expect(region.triangleArea,id).toBeLessThanOrEqual(region.contourArea*1.05);
        const inkBounds=risoMeshBounds(region.outline);
        expect(inkBounds.x,id).toBeGreaterThan(bounds.x-2);
        expect(inkBounds.y,id).toBeGreaterThan(bounds.y-2);
        expect(inkBounds.x+inkBounds.width,id).toBeLessThan(bounds.x+bounds.width+2);
        expect(inkBounds.y+inkBounds.height,id).toBeLessThan(bounds.y+bounds.height+2);
      }
    }
  });

  it.each(actors)("$actor.id: blinks retain distinct joint-local source ink and deterministic reverse seeking",({actor})=>{
    const neutral=partsAt(actor,46), blink=partsAt(actor,78);
    for(const id of newParts){
      const original=actor.parts.find(p=>p.id===id)!;
      const draw=neutral.get(id)!;
      expect(draw.transform).toBe(neutral.get("face-outline")!.transform);
      expect(blink.get(id)!.transform).toBe(blink.get("face-outline")!.transform);
      expect(draw.d).toBe(original.d);
      expect(blink.get(id)!.d,id).not.toBe(original.d);
      expect(flattenRisoSvgPath(blink.get(id)!.d).length,id+" subpath continuity")
        .toBe(flattenRisoSvgPath(original.d).length);
    }
    const first=evaluateRisoCharacter(actor,160);
    evaluateRisoCharacter(actor,46);
    expect(evaluateRisoCharacter(actor,160)).toEqual(first);
  });

  it.each(["landscape","portrait"] as const)("%s: native isolated-ink preview stays opaque with both actors",aspect=>{
    const width=aspect==="portrait"?360:640,height=aspect==="portrait"?640:360;
    const spec:RisoPrintSpec={
      version:1,width,height,paper:"#F6EDDD",seed:38,startFrame:0,passFrames:1,gapFrames:0,
      plates:[{id:"blue",color:"#255B8E",opacity:1,dotCell:6,dotAngle:-12,registration:[0,0]},
        {id:"red",color:"#D65641",opacity:1,dotCell:6,dotAngle:17,registration:[.5,-.4]}],
    };
    for(const {actor} of actors){
      const headParts=actor.parts.filter(p=>p.joint==="head").map(p=>p.id);
      const layer={
        id:"head",
        knockout:createElement(RisoCharacterKnockout,{spec:actor,frame:160,x:width*.5,y:height*.5,
          scale:1.2,onlyPartIds:headParts}),
        artworks:{
          blue:(paint:{solid:string;dots:string})=>createElement(RisoCharacterInk,
            {spec:actor,frame:160,plateId:"blue",paint,x:width*.5,y:height*.5,scale:1.2,onlyPartIds:headParts}),
          red:(paint:{solid:string;dots:string})=>createElement(RisoCharacterInk,
            {spec:actor,frame:160,plateId:"red",paint,x:width*.5,y:height*.5,scale:1.2,onlyPartIds:headParts}),
        },
      };
      const render=(visiblePlateIds?:string[])=>renderToStaticMarkup(createElement(RisoPrint,{
        spec,frame:239,artworks:{blue:()=>null,red:()=>null},foregroundLayers:[layer],
        visiblePlateIds,screenMode:"fm",screenDensity:.33,dotGain:.2,
      }));
      const both=render(),blue=render(["blue"]),red=render(["red"]);
      expect(both).toContain(`viewBox="0 0 ${width} ${height}"`);
      expect(both).toContain('data-km-riso-paper-knockout="head"');
      expect(both).toContain('data-km-riso-part="eye-canthus-shapes"');
      expect(both).toContain('data-km-riso-part="eye-iris-grain"');
      expect(both).not.toContain('opacity="0.5"');
      expect(blue).not.toContain('data-km-riso-part="eye-iris-grain"');
      expect(red).not.toContain('data-km-riso-part="eye-lash-wedges"');
      expect(both).toContain("mix-blend-mode:multiply");
    }
  });
});
