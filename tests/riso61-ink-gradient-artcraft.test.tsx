import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {
  createRisoGradientGeometry,risoGradientCoverage,risoGradientDotPath,
} from "../registry/video/riso-gradient-ink";
import type {RisoGradientOptions} from "../registry/video/riso-gradient-ink";
import {RisoGradientInk} from "../registry/video/riso-gradient-ink-react";
import {RisoPrint} from "../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../registry/video/print-plates";

const stops=[
  {at:0,coverage:.10},{at:.34,coverage:.28},
  {at:.62,coverage:.69},{at:1,coverage:.94},
] as const;
const base:RisoGradientOptions={
  x:25,y:30,width:260,height:190,cell:8.25,angle:17,
  seed:53,plateIndex:0,direction:"horizontal",
  stops,irregularity:.6,dotGain:.2,dropout:.03,
};
const get=(opts:Partial<RisoGradientOptions>={})=>
  createRisoGradientGeometry({...base,...opts});

describe("RISO61 — continuous physical-plate variable-density ink",()=>{
  it("constructs detailed nonuniform ink discs instead of a flat stepped alpha gradient",()=>{
    const shape=get();
    expect(shape.dots.length).toBeGreaterThan(650);
    expect(shape.siteCount).toBeGreaterThan(shape.dots.length*.95);
    expect(shape.nominalInkArea).toBeGreaterThan(100);
    expect(shape.dots.every(d=>[d.x,d.y,d.r,d.tone].every(Number.isFinite)&&
      d.r>0&&d.r<=base.cell*.65)).toBe(true);
    const left=shape.dots.filter(d=>d.x<base.x+base.width*.20);
    const right=shape.dots.filter(d=>d.x>base.x+base.width*.80);
    const average=(v:typeof left)=>v.reduce((n,d)=>n+d.r,0)/v.length;
    expect(left.length).toBeGreaterThan(30);
    expect(right.length).toBeGreaterThan(30);
    expect(average(right)).toBeGreaterThan(average(left)*1.6);
    expect(new Set(shape.dots.map(d=>d.r)).size).toBeGreaterThan(60);
    expect(risoGradientDotPath(shape.dots).match(/ a/g)?.length).toBe(shape.dots.length*2);
    expect(risoGradientDotPath(shape.dots)).not.toMatch(/(?:<image|filter|opacity|data:)/);
  });

  it("preserves each paper-fixed site across gain, stop, crop, render order and repeated evaluations",()=>{
    const first=get(),second=get();
    expect(second).toEqual(first);
    const changed=get({dotGain:.5,stops:[{at:0,coverage:.22},{at:1,coverage:.80}]});
    expect(changed.dots.length).toBe(first.dots.length);
    expect(changed.dots.map(d=>[d.x,d.y])).toEqual(first.dots.map(d=>[d.x,d.y]));
    expect(changed.dots.map(d=>d.r)).not.toEqual(first.dots.map(d=>d.r));
    const otherPlate=get({plateIndex:1});
    expect(otherPlate.dots.map(d=>d.x)).not.toEqual(first.dots.map(d=>d.x));
    const otherAngle=get({angle:-25});
    expect(otherAngle.dots.map(d=>[d.x,d.y])).not.toEqual(first.dots.map(d=>[d.x,d.y]));
  });

  it("interpolates multiple authored value planes continuously, even when reversed",()=>{
    expect(risoGradientCoverage(stops,0)).toBeCloseTo(.1);
    expect(risoGradientCoverage(stops,.34)).toBeCloseTo(.28);
    expect(risoGradientCoverage(stops,.48)).toBeCloseTo(.485,3);
    expect(risoGradientCoverage(stops,1)).toBeCloseTo(.94);
    expect(risoGradientCoverage(stops,-2)).toBeCloseTo(.1);
    expect(risoGradientCoverage(stops,3)).toBeCloseTo(.94);
    const reversed=get({stops:[{at:0,coverage:.92},{at:1,coverage:.12}]});
    const near=reversed.dots.filter(d=>d.x<base.x+40);
    const far=reversed.dots.filter(d=>d.x>base.x+base.width-40);
    expect(near.reduce((s,d)=>s+d.r,0)/near.length)
      .toBeGreaterThan(far.reduce((s,d)=>s+d.r,0)/far.length);
    const radial=get({direction:"radial"});
    const centre=radial.dots.filter(d=>
      Math.hypot((d.x-base.x-base.width/2)/(base.width/2),
        (d.y-base.y-base.height/2)/(base.height/2))<.18);
    const rim=radial.dots.filter(d=>
      Math.hypot((d.x-base.x-base.width/2)/(base.width/2),
        (d.y-base.y-base.height/2)/(base.height/2))>.78);
    expect(centre.length).toBeGreaterThan(8);
    expect(rim.length).toBeGreaterThan(60);
    expect(rim.reduce((s,d)=>s+d.r,0)/rim.length)
      .toBeGreaterThan(centre.reduce((s,d)=>s+d.r,0)/centre.length);
  });

  it("honors physical low-tone dropout and preserves black printable masters",()=>{
    const low=get({stops:[{at:0,coverage:.04},{at:1,coverage:.04}],dropout:.08});
    expect(low.dots).toHaveLength(0);
    expect(low.siteCount).toBeGreaterThan(100);
    const full=get({stops:[{at:0,coverage:1},{at:1,coverage:1}],dropout:.1});
    expect(full.dots).toHaveLength(full.siteCount);
    expect(full.nominalInkArea).toBeGreaterThan(0);
  });

  it("rejects malformed stops, nonfinite geometry, wrong ink settings and pathological 4k DOM cost",()=>{
    const invalid:Partial<RisoGradientOptions>[]=[
      {cell:0},{cell:37},{width:11},{height:10000},{seed:NaN},
      {plateIndex:-1},{angle:190},{dotGain:-.01},{irregularity:1.1},
      {direction:"rgb" as RisoGradientOptions["direction"]},
      {dropout:.9},{stops:[{at:.1,coverage:.4},{at:1,coverage:.8}]},
      {stops:[{at:0,coverage:.4},{at:1,coverage:1.2}]},
      {stops:[{at:0,coverage:.4},{at:.6,coverage:.4},{at:.6,coverage:.5},{at:1,coverage:.8}]},
      {width:4096,height:4096,cell:2},
    ];
    for(const patch of invalid)expect(()=>get(patch)).toThrow(RangeError);
    expect(()=>risoGradientCoverage(stops,Infinity)).toThrow(RangeError);
    expect(()=>risoGradientDotPath([{x:0,y:0,r:0,tone:.3}])).toThrow(RangeError);
  });

  it("renders independent registered two-spot screen masters, editable clip geometry and safe unique IDs",()=>{
    const spec:RisoPrintSpec={
      version:1,width:320,height:260,paper:"#F2E9D6",seed:53,
      startFrame:0,passFrames:2,gapFrames:0,
      plates:[
        {id:"blue",color:"#2362A0",opacity:1,dotCell:8,dotAngle:17,registration:[0,0]},
        {id:"red",color:"#DD593D",opacity:1,dotCell:7,dotAngle:-19,registration:[.5,-.4]},
      ],
    };
    const markup=renderToStaticMarkup(
      <RisoPrint spec={spec} frame={9} paperGrain={.55}
        artworks={{
          blue:paint=><RisoGradientInk {...base} color={paint.solid}
            shape="M40 40 C180 20 260 90 275 160 C190 230 60 190 40 40 Z"/>,
          red:paint=><RisoGradientInk {...base} plateIndex={1} angle={-19}
            direction="radial" color={paint.solid}/>,
        }}/>
    );
    expect(markup).toContain('data-km-riso-plate="blue"');
    expect(markup).toContain('data-km-riso-plate="red"');
    expect(markup).toContain('data-km-riso-gradient-ink="horizontal"');
    expect(markup).toContain('data-km-riso-gradient-ink="radial"');
    expect(markup.match(/data-km-riso-gradient-source-path=""/g)).toHaveLength(2);
    const clips=[...markup.matchAll(/<clipPath id="([^"]+)"/g)].map(m=>m[1]);
    expect(new Set(clips).size).toBe(clips.length);
    expect(markup).toContain('mix-blend-mode:multiply');
    expect(markup).not.toMatch(/<foreignObject|<image|feGaussianBlur/);
    expect(()=>renderToStaticMarkup(<RisoGradientInk {...base}
      color="#2362A0" shape="<svg/>"/>)).toThrow(RangeError);
    expect(()=>renderToStaticMarkup(<RisoGradientInk {...base}
      color="gradient(blue)"/>)).toThrow(RangeError);
  });
});
