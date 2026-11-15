import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {createRisoScreenGeometry} from "../registry/video/riso-screening";
import {RisoPrint} from "../registry/video/print-plates-react";
import type {RisoCharacterSpec} from "../registry/video/riso-character";
import type {RisoPrintSpec} from "../registry/video/print-plates";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";

const subjects=[COURIER,PAPER_ARTIST] as const;
const samples=[46,78,160,198] as const;
const expectedTone:Record<string,Record<string,"light"|"mid">>={
  courier:{
    "orbital-tone-planes":"mid","face-temple-shadow":"mid","eye-socket-planes":"mid",
    "zygomatic-tone-planes":"light","jaw-shadow-planing":"light","nose-bridge-plane":"light",
    "chin-plane":"light","lip-shadow":"light",
  },
  "paper-artist":{
    "orbital-tone-planes":"mid","temple-tones":"mid",
    "zygomatic-tone-planes":"light","jaw-shadow-planing":"light",
    "cheek-tones":"light","chin-tone":"light",
  },
};
const screenSpec:RisoPrintSpec={version:1,width:360,height:360,paper:"#F6EDDD",
  seed:38,startFrame:0,passFrames:1,gapFrames:0,plates:[
    {id:"blue",color:"#255B8E",opacity:1,dotCell:2,dotAngle:-12,registration:[0,0]},
    {id:"red",color:"#D65641",opacity:1,dotCell:2,dotAngle:17,registration:[.5,-.4]},
  ]};

const ink=(actor:RisoCharacterSpec,frame:number,plateId:string,withTones=true)=>{
  const spec=withTones?actor:{...actor,parts:actor.parts.map(p=>({...p,screenTone:undefined}))};
  return renderToStaticMarkup(createElement(RisoCharacterInk,{
    spec,frame,plateId,onlyPartIds:spec.parts.filter(p=>p.joint==="head").map(p=>p.id),
    paint:{solid:"#D65641",dots:"url(#normal)",lightDots:"url(#light)",midDots:"url(#mid)"},
  }));
};
const partFill=(svg:string,id:string)=>{
  const match=svg.match(new RegExp('<path[^>]*data-km-riso-part="'+id+'"[^>]*>'));
  return match?.[0]??"";
};

describe("RISO26 ArtCraft graded facial spot-master value and source anatomy",()=>{
  it.each(subjects)("$id: source-validated authored facial tone parts",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    const expected=expectedTone[actor.id];
    expect(Object.keys(expected).length).toBeGreaterThanOrEqual(6);
    for(const [id,tone] of Object.entries(expected)){
      const part=actor.parts.find(p=>p.id===id);
      expect(part,id).toBeDefined();
      expect(part?.paint,id).toBe("screen");
      expect(part?.plate,id).toBe("red");
      expect(part?.joint,id).toBe("head");
      expect(part?.screenTone,id).toBe(tone);
      expect(part?.opacity??1,id).toBe(1); // no semitransparent facial overlay
    }
    expect(actor.parts.filter(p=>p.screenTone).map(p=>p.id).sort())
      .toEqual(Object.keys(expected).sort());
    for(const original of ["face","face-outline","iris-left","iris-right",
      actor.id==="courier"?"nose":"nose-bridge"]){
      expect(actor.parts.find(p=>p.id===original)?.d.length).toBeGreaterThan(25);
      expect(actor.parts.find(p=>p.id===original)?.screenTone).toBeUndefined();
    }
  });

  it("rejects unknown value tags and illegal tone metadata on opaque solids",()=>{
    const sample=COURIER.parts.find(p=>p.id==="face-outline")!;
    const wrong={...COURIER,parts:COURIER.parts.map(p=>p.id===sample.id
      ? {...p,screenTone:"light" as const}:p)};
    expect(inspectRisoCharacter(wrong).some(i=>i.path.endsWith("/screenTone"))).toBe(true);
    const invalid={...COURIER,parts:COURIER.parts.map(p=>p.id==="orbital-tone-planes"
      ? {...p,screenTone:"ultraviolet" as "light"}:p)};
    expect(inspectRisoCharacter(invalid).some(i=>i.message.includes("screenTone"))).toBe(true);
  });

  it.each(subjects)("$id: graduated red spots preserve source pose and native eye/ear geometry",actor=>{
    const eyepaths=["iris-left","iris-right","ear-left"];
    for(const frame of samples){
      const original=evaluateRisoCharacter(actor,frame);
      const flat=evaluateRisoCharacter({...actor,parts:actor.parts.map(p=>({...p,screenTone:undefined}))},frame);
      expect(flat.parts.map(p=>p.d)).toEqual(original.parts.map(p=>p.d));
      expect(flat.parts.map(p=>p.transform)).toEqual(original.parts.map(p=>p.transform));
      expect(original.parts.find(p=>p.id==="zygomatic-tone-planes")?.screenTone).toBe("light");
      for(const id of eyepaths){
        expect(original.parts.find(p=>p.id===id)?.d).toBe(flat.parts.find(p=>p.id===id)?.d);
      }
      const red=ink(actor,frame,"red");
      const flatRed=ink(actor,frame,"red",false);
      for(const [id,tone] of Object.entries(expectedTone[actor.id])){
        const candidate=partFill(red,id),baseline=partFill(flatRed,id);
        expect(candidate,id).toContain('data-km-riso-screen-tone="'+tone+'"');
        expect(candidate,id).toContain('fill="url(#'+tone+')"');
        expect(baseline,id).toContain('data-km-riso-screen-tone="normal"');
        expect(baseline,id).toContain('fill="url(#normal)"');
        expect(candidate,id).not.toContain('opacity="0.');
      }
      expect(red).toContain('data-km-riso-paper-clearance=');
      const blue=ink(actor,frame,"blue");
      expect(blue).not.toContain('fill="url(#light)"');
    }
  });

  it("standalone RisoCharacterInk without optional tone handles still renders legacy screens",()=>{
    const svg=renderToStaticMarkup(createElement(RisoCharacterInk,{
      spec:COURIER,frame:46,plateId:"red",
      paint:{solid:"#D65641",dots:"url(#legacy)"},
    }));
    expect(partFill(svg,"zygomatic-tone-planes")).toContain('fill="url(#legacy)"');
    expect(partFill(svg,"orbital-tone-planes")).toContain('fill="url(#legacy)"');
  });

  it.each(["am","fm"] as const)("physically deposited %s dot areas are ordered, co-registered and deterministic",mode=>{
    for(const plateIndex of [0,1]){
      const base={cell:2,mode,dotGain:0,seed:38,plateIndex};
      const master=createRisoScreenGeometry({...base,density:.33});
      const mid=createRisoScreenGeometry({...base,density:.33*.55});
      const light=createRisoScreenGeometry({...base,density:.33*.22});
      expect(light.tileSize).toBe(master.tileSize);
      expect(mid.tileSize).toBe(master.tileSize);
      expect(light).toEqual(createRisoScreenGeometry({...base,density:.33*.22}));
      // Medium must not invent dot positions/motion; same master seed and cell.
      expect(mid).toEqual(createRisoScreenGeometry({...base,density:.33*.55}));
      const circleArea=(dots:readonly {r:number}[])=>
        dots.reduce((total,dot)=>total+Math.PI*dot.r*dot.r,0);
      expect(circleArea(light.dots)).toBeLessThan(circleArea(mid.dots));
      expect(circleArea(mid.dots)).toBeLessThan(circleArea(master.dots));
    }
  });

  it("normal + two fine values render as *opaque* spots on each master",()=>{
    const svg=renderToStaticMarkup(createElement(RisoPrint,{
      spec:screenSpec,frame:239,screenMode:"am",screenDensity:.33,misregistration:.25,paperGrain:0,
      artworks:{blue:()=>null,red:()=>null},
      foregroundLayers:[{id:"courier-face",
        knockout:null,
        artworks:{
          blue:paint=>createElement(RisoCharacterInk,{spec:COURIER,frame:46,plateId:"blue",paint,
            onlyPartIds:COURIER.parts.filter(p=>p.joint==="head").map(p=>p.id)}),
          red:paint=>createElement(RisoCharacterInk,{spec:COURIER,frame:46,plateId:"red",paint,
            onlyPartIds:COURIER.parts.filter(p=>p.joint==="head").map(p=>p.id)}),
        },
      }],
    }));
    expect(svg).toContain("-dots-light-1");
    expect(svg).toContain("-dots-mid-1");
    expect(svg).toContain("-dots-1");
    expect(svg).toContain("data-km-riso-foreground-plate=\"red\"");
    expect(partFill(svg,"zygomatic-tone-planes")).toMatch(/fill="url\(#[^)]+-dots-light-1\)"/);
    expect(partFill(svg,"orbital-tone-planes")).toMatch(/fill="url\(#[^)]+-dots-mid-1\)"/);
    expect(svg).not.toContain('fill-opacity="0.');
    expect(svg).not.toContain("feGaussianBlur");
  });
});
