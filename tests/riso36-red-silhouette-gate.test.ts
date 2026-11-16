import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {
  inspectRiso36RedFingerSilhouettes,
  riso36ContourClearance,riso36WorldContour,
} from "../src/video/riso36-red-silhouette-gate";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const sourceFrames=[0,46,96,126,144,159,160,165,166,177,178,185,186,198,205,239];
describe("RISO36 native red silhouette / actual paper-white print contours",()=>{
  it("measures actual closed SVG outlines, not only axis or axis-aligned boxes",()=>{
    const square=[[0,0],[2,0],[2,2],[0,2]] as const;
    const distant=[[4,0],[6,0],[6,2],[4,2]] as const;
    const tangent=[[2,0],[4,0],[4,2],[2,2]] as const;
    const crossing=[[1,1],[3,1],[3,3],[1,3]] as const;
    const nested=[[.4,.4],[.8,.4],[.8,.8],[.4,.8]] as const;
    const rotated=[[3,3],[4,4],[3,5],[2,4]] as const;
    expect(riso36ContourClearance(square,distant)).toBeCloseTo(2,5);
    expect(riso36ContourClearance(distant,square)).toBeCloseTo(2,5);
    expect(riso36ContourClearance(square,tangent)).toBe(0);
    expect(riso36ContourClearance(square,crossing)).toBe(0);
    expect(riso36ContourClearance(square,nested)).toBe(0);
    expect(riso36ContourClearance(square,rotated)).toBeGreaterThan(0);
  });
  it("samples actual evaluated matrices, including nonuniform orientation",()=>{
    const pts=riso36WorldContour("M0 0 L2 0 L2 3 L0 3 Z",
      "matrix(0 1 -1 0 10 20)");
    expect(pts.length).toBe(4);
    expect(pts[0]).toEqual([10,20]);
    expect(pts.some(p=>p[0]===7&&p[1]===22)).toBe(true);
    expect(()=>riso36WorldContour("M0 0 L2 0 L2 3 Z","rotate(90)")).toThrow();
  });
  it.each(actors)("%s: all four original hands have animated full red geometry",actor=>{
    for(const side of sides){
      for(const frame of sourceFrames){
        const m=inspectRiso36RedFingerSilhouettes(actor,frame,side);
        expect(m.sourcePartCount).toBe(12);
        expect(m.pairs.map(p=>p.pair)).toEqual([
          "index-middle","middle-ring","ring-pinky"]);
        expect(m.screening).toContain("closed red source SVG contours");
        for(const p of m.pairs){
          for(const property of ["sourceInkGap","distalInkGap","middleInkGap","proximalInkGap"] as const){
            expect(Number.isFinite(p[property])).toBe(true);
            expect(p[property]).toBeGreaterThanOrEqual(0);
          }
          expect(p.crossInkContacts).toBeGreaterThanOrEqual(0);
          expect(p.crossInkContacts).toBeLessThanOrEqual(9);
          expect(p.sourceInkGap).toBeLessThanOrEqual(p.distalInkGap+1e-7);
        }
        expect(m.crossInkContacts).toBe(m.pairs.reduce((n,p)=>n+p.crossInkContacts,0));
        expect(inspectRiso36RedFingerSilhouettes(actor,frame,side)).toEqual(m);
      }
    }
  });
  it.each(actors)("%s: no missing printable source between contact and release",actor=>{
    for(const side of sides){
      for(let frame=124;frame<=206;frame+=2){
        const m=inspectRiso36RedFingerSilhouettes(actor,frame,side);
        expect(m.sourcePartCount,actor.id+" "+side+" at frame "+frame).toBe(12);
        expect(Number.isFinite(m.minimumDistalGap)).toBe(true);
      }
    }
  });
});
