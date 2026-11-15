import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {
  NativeWatercolourPortraitPaint,
  NATIVE_PORTRAIT_REGIONS,inspectNativePortraitPaint,
} from "../src/video/watercolour-portrait-paint-contract";
import type {NativeWatercolourPortraitSpec} from "../src/video/watercolour-portrait-paint-contract";
import type {PaintStroke} from "../registry/video/watercolour-brush";
import {evaluatePaintStroke} from "../registry/video/watercolour-brush";
import {evaluateWetPaper} from "../registry/video/watercolour-wet-paper";

/** Synthetic strips are a *renderer contract fixture*, NOT human face art.
 * Source-quality portrait assets need measured anatomy and their own review.
 */
function paperFixture():NativeWatercolourPortraitSpec{
  const width=960,height=540,seed=97;
  const paper={color:"#F6EFE5",tooth:.82};
  const regions=NATIVE_PORTRAIT_REGIONS.map((id,i)=>{
    const x=42+i*126;
    return {id,polygon:[
      {x,y:140},{x:x+104,y:140},{x:x+104,y:280},{x,y:280},
    ],strokeIds:["gesture-"+i+"-wet","gesture-"+i+"-dry"],
    dropIds:["deposit-"+i]};
  });
  const strokes:PaintStroke[]=regions.flatMap((r,i)=>[0,1].map(j=>({
    id:r.strokeIds[j],
    color:j?"#53494E":"#AF786B",
    tone:j?5:3,width:j?16:48,
    water:j?.38:.91,load:j?.78:.66,dryBrush:j?.64:.08,
    startFrame:10+i*9+j*5,drawFrames:36,spreadFrames:42,dryFrames:125,
    points:[
      {x:r.polygon[0].x+12,y:177+j*27,pressure:.12,speed:.66},
      {x:r.polygon[0].x+32,y:188+j*27,pressure:.78,speed:.15},
      {x:r.polygon[0].x+68,y:201+j*27,pressure:.87,speed:.2},
      {x:r.polygon[0].x+90,y:214+j*27,pressure:.10,speed:.71},
    ],
  })));
  const drops=regions.map((r,i)=>({
    id:r.dropIds[0],x:r.polygon[0].x+50,y:204,radius:38,
    pigment:i%2?"#7D8391":"#C28C7B",
    load:.7,water:.83,startFrame:10+i*9,
    path:[
      {x:r.polygon[0].x+16,y:183,pressure:.10},
      {x:r.polygon[0].x+40,y:200,pressure:.85},
      {x:r.polygon[0].x+83,y:225,pressure:.16},
    ],
  }));
  return {version:1,width,height,paper,regions,
    brush:{version:1,medium:"watercolour",width,height,seed,paper,strokes},
    wetPigment:{version:1,width,height,seed,paper,cellSize:24,
      flow:.72,granulation:.81,edgePooling:.71,dryFrames:180,
      reservePaths:["M160 180 L168 180 L168 190 Z"],
      paintAreas:regions.map(r=>r.polygon),drops},
  };
}

describe("Watercolor face contract must use the real WM1/WM4 engines",()=>{
  it("accepts real pressure, paper, dispersion, sediment and region-bound strokes",()=>{
    const spec=paperFixture();
    expect(inspectNativePortraitPaint(spec)).toEqual([]);
    expect(spec.regions.map(x=>x.id)).toEqual([...NATIVE_PORTRAIT_REGIONS]);
    const html=renderToStaticMarkup(<NativeWatercolourPortraitPaint
      spec={spec} frame={280}/>);
    expect(html).toContain('data-km-native-medium="WM1+WM4"');
    expect(html).toContain('data-km-watercolour=""');
    expect(html).toContain('data-km-paint-medium="watercolour"');
    expect(html).toContain('data-km-brush-stroke="gesture-0-wet"');
    expect(html).toContain('data-km-brush-stroke="gesture-6-dry"');
    expect(html).toContain('data-km-deposition=""');
    expect(html).toContain('data-km-wet-spread=""');
    expect(html).toContain('data-km-wet-paper=""');
    expect(html).toContain('data-km-wet-pigment-field=""');
    expect(html).toContain('data-km-pigment-cell=""');
    expect(html).toContain('<clipPath');
    expect(html).toContain('<mask');
    expect(html).not.toContain("NaN");
  });
  it("shows different actual brush paint phases, not a global SVG filter",()=>{
    const spec=paperFixture();
    const wet=spec.brush.strokes[0],dry=spec.brush.strokes[1];
    expect(wet.water).toBeGreaterThan(dry.water);
    expect(wet.dryBrush).toBeLessThan(dry.dryBrush);
    const f0=evaluatePaintStroke(wet,5);
    const mid=evaluatePaintStroke(wet,38);
    const final=evaluatePaintStroke(wet,380);
    expect(f0.deposit).toBe(0);
    expect(mid.deposit).toBeGreaterThan(.8);
    expect(final.settled).toBe(true);
    expect(final.wetness).toBe(0);
    const pigment=evaluateWetPaper(spec.wetPigment,380);
    expect(pigment.totalPigment).toBeGreaterThan(0);
    expect(pigment.settled).toBe(true);
  });
  it("rejects shape-only, missing or fake wet paint as an invalid portrait",()=>{
    const original=paperFixture();
    const missing={...original,brush:undefined} as unknown as NativeWatercolourPortraitSpec;
    expect(inspectNativePortraitPaint(missing)).toContain("/brush");
    const ink={...original,brush:{...original.brush,medium:"ink" as const}};
    expect(inspectNativePortraitPaint(ink)).toContain("/brush/medium-watercolour-required");
    const fake={...original,wetPigment:{...original.wetPigment,
      flow:0,edgePooling:0,granulation:0,reservePaths:[],paintAreas:undefined}};
    expect(inspectNativePortraitPaint(fake)).toEqual(expect.arrayContaining([
      "/wetPigment/physical-transport","/wetPigment/paper-reserves",
      "/regions/face-volume/wet-boundary",
    ]));
    expect(()=>renderToStaticMarkup(
      <NativeWatercolourPortraitPaint spec={fake} frame={280}/>))
      .toThrow(/Invalid native watercolor portrait/);
  });
  it("rejects flat-pressure strokes and strokes detached from their anatomy",()=>{
    const original=paperFixture();
    const flat={...original,brush:{...original.brush,strokes:
      original.brush.strokes.map((s,i)=>i===0?{
        ...s,points:s.points.map(p=>({...p,pressure:.7})),
      }:s)}};
    expect(inspectNativePortraitPaint(flat)).toContain(
      "/regions/face-volume/pressure-variation");
    const outside={...original,brush:{...original.brush,strokes:
      original.brush.strokes.map((s,i)=>i===0?{
        ...s,points:s.points.map((p,j)=>j===1?{...p,x:500}:p),
      }:s)}};
    expect(inspectNativePortraitPaint(outside)).toContain(
      "/regions/face-volume/stroke-attachment");
    const fakeWet={...original,wetPigment:{...original.wetPigment,drops:
      original.wetPigment.drops.map((d,i)=>i===1?{
        ...d,path:undefined,
      }:d)}};
    expect(inspectNativePortraitPaint(fakeWet)).toContain(
      "/regions/near-eye/real-wet-brush-path");
  });
  it("rejects duplicated or unattributed region gestures and non-aligned paper",()=>{
    const original=paperFixture();
    const duplicate={...original,regions:original.regions.map((r,i)=>i===1?
      {...r,strokeIds:[original.regions[0].strokeIds[0],r.strokeIds[1]]}:r)};
    expect(inspectNativePortraitPaint(duplicate)).toContain(
      "/regions/near-eye/stroke-id");
    expect(inspectNativePortraitPaint(duplicate)).toContain("/brush/unattributed-strokes");
    const mismatch={...original,wetPigment:{...original.wetPigment,
      paper:{color:"#FFFFFF",tooth:original.paper.tooth}}};
    expect(inspectNativePortraitPaint(mismatch)).toContain("/shared-paper/material");
  });
});
