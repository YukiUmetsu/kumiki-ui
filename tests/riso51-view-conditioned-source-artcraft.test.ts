import {describe,expect,it} from "vitest";
import {evaluateRisoPathMorph,inspectRisoPathMorph} from "../registry/video/riso-path-morph";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {
  RISO51_VIEW_CONTRACT,riso51ProjectPalmarPoint,riso51ProjectPalmarPath,
} from "../src/video/riso51-view-conditioned-source";

describe("RISO51 RISO2 source-Bézier morph safety",()=>{
  const base="M0 0 C2 0 3 2 4 4 Q5 7 8 6 L0 8 Z";
  const end="M1 1 C3 0 3 6 6 6 Q8 4 7 7 L1 10 Z";
  const samples=[{frame:0,d:base,easing:"ease" as const},
    {frame:20,d:end},{frame:40,d:base}];
  it("morphs actual source C/Q/L control points continuously and holds distinct native cels",()=>{
    expect(inspectRisoPathMorph(base,samples,48)).toBeNull();
    expect(evaluateRisoPathMorph(samples,0)).toBe(base);
    expect(evaluateRisoPathMorph(samples,20)).toBe(end);
    expect(evaluateRisoPathMorph(samples,40)).toBe(base);
    const halfway=evaluateRisoPathMorph(samples,10);
    expect(halfway).not.toBe(base);
    expect(halfway).not.toBe(end);
    const loops=flattenRisoSvgPath(halfway,.1);
    expect(loops).toHaveLength(1);
    expect(loops[0].closed).toBe(true);
    expect(loops[0].points.length).toBeGreaterThanOrEqual(10);
  });
  it("rejects incompatible commands, rogue inks, unsorted source keys and arc flags",()=>{
    const run=(keys:typeof samples)=>inspectRisoPathMorph(base,keys,48);
    expect(run([{frame:0,d:base},{frame:20,d:"M1 1 L8 6 Z"}])).toMatch(/topology/);
    expect(run([{frame:0,d:base},{frame:20,d:end},{frame:19,d:base}])).toMatch(/increasing/);
    expect(run([{frame:1,d:base},{frame:20,d:end}])).toMatch(/frame 0/);
    expect(run([{frame:0,d:base},{frame:48,d:end}])).toMatch(/timeline/);
    expect(run([{frame:0,d:base},{frame:20,d:end+" <script>"}])).toMatch(/topology/);
    expect(inspectRisoPathMorph("M0 0 A4 3 0 1 0 6 7 Z",
      [{frame:0,d:"M0 0 A4 3 0 1 0 6 7 Z"},
       {frame:10,d:"M0 0 A6 3 0 1 0 6 7 Z"}],48)).toMatch(/arc/);
    const broken={...COURIER,parts:COURIER.parts.map(p=>
      p.id==="right-glove"?{...p,pathKeys:[
        {frame:0,d:p.d},{frame:160,d:"M0 0 L1 1 Z"}]}:p)};
    expect(inspectRisoCharacter(broken).some(i=>i.path.endsWith("/pathKeys"))).toBe(true);
  });
});

const actors=[
  {spec:COURIER,active:"right",inactive:"left"},
  {spec:PAPER_ARTIST,active:"left",inactive:"right"},
] as const;
const animatedParts=(side:string)=>[
  side+"-glove",side+"-glove-knuckle-arc",
  ...["middle","ring","pinky"].flatMap(d=>[
    side+"-glove-"+d,side+"-glove-"+d+"-middle-phalanx",
  ]),
];
describe("RISO51 independent two-human ORIGINAL moving print sources",()=>{
  it("retains opposite-hand old art while morphing exactly eight physical source-contours per actor",()=>{
    for(const {spec,active,inactive} of actors){
      expect(inspectRisoCharacter(spec,["red","blue"])).toEqual([]);
      const authored=spec.parts.filter(p=>p.pathKeys);
      expect(authored.map(p=>p.id).sort()).toEqual(animatedParts(active).sort());
      for(const p of authored){
        expect(p.pathKeys?.map(k=>k.frame)).toEqual([...RISO51_VIEW_CONTRACT.genuineSourceViewFrames]);
        expect(p.pathKeys?.[0].d).toBe(p.d);
        expect(inspectRisoPathMorph(p.d,p.pathKeys!,240)).toBeNull();
        expect(p.plate==="red"||p.plate==="blue").toBe(true);
        expect(p.paint).toBe("solid");
      }
      for(const p of spec.parts.filter(p=>p.id.startsWith(inactive+"-glove")))
        expect(p.pathKeys).toBeUndefined();
      const rest=evaluateRisoCharacter(spec,0);
      const approach=evaluateRisoCharacter(spec,148);
      const contact=evaluateRisoCharacter(spec,160);
      // RISO2 cadence=2 samples 205 at cel 204; the authored f205
      // release key is therefore fully printed at cel 206, not 205.
      const released=evaluateRisoCharacter(spec,206);
      for(const id of animatedParts(active)){
        const source=spec.parts.find(p=>p.id===id)!;
        const p0=rest.parts.find(p=>p.id===id)!;
        const p148=approach.parts.find(p=>p.id===id)!;
        const p160=contact.parts.find(p=>p.id===id)!;
        expect(p0.d).toBe(source.d);
        expect(p148.d).not.toBe(source.d);
        expect(p148.d).not.toBe(p160.d);
        expect(p160.d).not.toBe(source.d);
        expect(p160.plate).toBe(source.plate);
        if(spec.id==="courier")
          expect(released.parts.find(p=>p.id===id)!.d).toBe(source.d);
        else
          expect(released.parts.find(p=>p.id===id)!.d).not.toBe(source.d);
      }
    }
  });

  it("creates a sloping rather than circular far-side MCP, moving BLUE and RED on the same drawn plane",()=>{
    const [neutralX,neutralY]=riso51ProjectPalmarPoint(-9,19,"right","courier",0);
    const [contactX,contactY]=riso51ProjectPalmarPoint(-9,19,"right","courier",1);
    expect(neutralX).toBe(-9);
    expect(neutralY).toBe(19);
    expect(contactX).toBeLessThan(-10.5);
    expect(contactY).toBeLessThan(15);
    const [radialX,radialY]=riso51ProjectPalmarPoint(9,19,"right","courier",1);
    expect(radialX).toBeGreaterThan(9);
    expect(radialY).toBeGreaterThan(19);
    for(const {spec,active} of actors){
      const palm=spec.parts.find(p=>p.id===active+"-glove")!;
      const crest=spec.parts.find(p=>p.id===active+"-glove-knuckle-arc")!;
      const palm160=evaluateRisoCharacter(spec,160).parts.find(p=>p.id===palm.id)!;
      const crest160=evaluateRisoCharacter(spec,160).parts.find(p=>p.id===crest.id)!;
      expect(palm160.d).toBe(riso51ProjectPalmarPath(palm.d,active,spec.id as "courier"|"paper-artist",1));
      expect(crest160.d).toBe(riso51ProjectPalmarPath(crest.d,active,spec.id as "courier"|"paper-artist",1));
      const neutral=flattenRisoSvgPath(palm.d,.15);
      const contact=flattenRisoSvgPath(palm160.d,.15);
      expect(neutral).toHaveLength(1);
      expect(contact).toHaveLength(1);
      expect(contact[0].closed).toBe(true);
      expect(Math.abs(risoContourSignedArea(contact[0].points))).toBeGreaterThan(170);
      expect(contact[0].points.length).toBeGreaterThan(40);
      expect(crest160.d.match(/C/g)).toHaveLength(16);
    }
  });

  it("keeps 12 independently bent RED segments, two real stencil inks and strict true hand-axis gap",()=>{
    for(const {spec,active} of actors)for(let frame=0;frame<240;frame+=2){
      const parts=evaluateRisoCharacter(spec,frame).parts;
      const fingers=inspectRiso36RedFingerSilhouettes(spec,frame,active);
      expect(fingers.sourcePartCount).toBe(12);
      expect(parts.filter(p=>p.id.startsWith(active+"-glove")).some(p=>p.plate==="red")).toBe(true);
      expect(parts.filter(p=>p.id.startsWith(active+"-glove")).some(p=>p.plate==="blue")).toBe(true);
      expect(inspectRiso33HandFan(spec,frame,active).minimumAxisGap).toBeGreaterThan(3);
      if(frame>=146&&frame<=186){
        const g=parts.find(p=>p.id===active+"-glove")!;
        expect(g.d.match(/C/g)).toHaveLength(16);
      }
    }
    for(const aspect of ["landscape","portrait"] as const)
    for(const frame of [156,160,166,178]){
      const film=evaluateRisoHumanEnsemble(frame,aspect);
      for(const {spec,active} of actors){
        if(frame===160||frame===166){
          const ink=inspectRiso44PrintedIndexContact(spec,frame,active,
            spec.id==="courier"?film.first:film.second,film.sheet);
          expect(ink.redIndexAreaTouchesPaper).toBe(true);
          expect(ink.thumbUnderPaper).toBe(true);
        }
      }
    }
  });
});
