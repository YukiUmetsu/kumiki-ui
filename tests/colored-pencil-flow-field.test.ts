import {describe,expect,it} from "vitest";
import {createPencilFlowField} from "../src/video/colored-pencil-flow-field";
import {createPencilPhotoStudy} from "../src/video/colored-pencil-photo";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

function stripe(width:number,height:number,horizontal:boolean,inverted=false){
  const luma=new Float32Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const first=horizontal?y<height/2:x<width/2;
    luma[y*width+x]=(first!==inverted)?0.15:.90;
  }
  return luma;
}
function tangentMark(s:{x:number;y:number;endX:number;endY:number}):number{
  const dx=s.endX-s.x,dy=s.endY-s.y;
  return Math.atan2(dy,dx);
}
describe("ArtCraft structure tensor: local pencil stroke direction",()=>{
  it("tracks the tangent of a real vertical edge instead of random diagonal hatch",()=>{
    const w=96,h=80;
    const field=createPencilFlowField(stripe(w,h,false),w,h);
    const at=(x:number,y:number)=>y*w+x;
    for(const yy of [8,20,40,70]){
      const p=at(w/2,yy);
      expect(field.edge[p]).toBeGreaterThan(.3);
      expect(field.coherence[p]).toBeGreaterThan(.85);
      expect(Math.abs(Math.sin(field.tangent[p]))).toBeGreaterThan(.95);
    }
    expect(field.edge[at(4,40)]).toBeLessThan(.03);
  });
  it("tracks a horizontal edge and is invariant to its contrast sign",()=>{
    const w=80,h=96;
    const a=createPencilFlowField(stripe(w,h,true),w,h);
    const b=createPencilFlowField(stripe(w,h,true,true),w,h);
    for(const xx of [8,20,40,69]){
      const idx=48*w+xx;
      expect(a.coherence[idx]).toBeGreaterThan(.85);
      expect(Math.abs(Math.cos(a.tangent[idx]))).toBeGreaterThan(.95);
      expect(a.edge[idx]).toBeCloseTo(b.edge[idx],4);
      expect(Math.abs(Math.cos(b.tangent[idx]))).toBeGreaterThan(.95);
    }
  });
  it("preserves flat paper without spuriously extracting tangents",()=>{
    const w=88,h=56;
    const output=createPencilFlowField(new Float32Array(w*h).fill(.5),w,h);
    expect(output.edge.every(x=>x===0)).toBe(true);
    expect(output.coherence.every(x=>x===0)).toBe(true);
    expect(output.tangent.every(x=>Number.isFinite(x))).toBe(true);
    expect(()=>createPencilFlowField(new Float32Array([.5]),w,h)).toThrow(RangeError);
    const bad=new Float32Array(w*h).fill(.5);bad[100]=NaN;
    expect(()=>createPencilFlowField(bad,w,h)).toThrow(RangeError);
  });
  it("conditions real pigment strokes to vertical and horizontal input features",()=>{
    const w=192,h=128;
    const data=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=4*(y*w+x),dark=x<w/2;
      data[i]=dark?29:218;data[i+1]=dark?38:214;
      data[i+2]=dark?49:204;data[i+3]=255;
    }
    const image:PencilPhotoPixels={width:w,height:h,data};
    const scene=createPencilPhotoStudy(image,{density:2,seed:291,edges:.95});
    const edges=scene.strokes.filter(s=>Math.abs(s.x-w/2)<5);
    expect(edges.length).toBeGreaterThan(5);
    // Near the sharp vertical feature, aligned microstrokes run alongside it.
    const coherent=edges.filter(s=>Math.abs(Math.sin(tangentMark(s)))>.80);
    expect(coherent.length/edges.length).toBeGreaterThan(.45);
    expect(scene.strokes).toEqual(createPencilPhotoStudy(image,{density:2,seed:291,edges:.95}).strokes);
    expect(scene.strokes.every(s=>Number.isFinite(s.controlX)&&Number.isFinite(s.controlY))).toBe(true);
  });
});
