import {describe,expect,it} from "vitest";
import {buildColoredPencilDryContact,isPencilSkinContactZone}
  from "../src/video/colored-pencil-dry-contact";
import type {PencilPhotoMark} from "../src/video/colored-pencil-photo";

const full:PencilPhotoMark={
  x:24,y:16,controlX:36,controlY:8,endX:49,endY:35,
  color:"#a86a65",alpha:.37,width:1.62,pass:1,
};
const xy=(m:PencilPhotoMark,t:number)=>{
  const u=1-t;
  return [u*u*m.x+2*u*t*m.controlX+t*t*m.endX,
    u*u*m.y+2*u*t*m.controlY+t*t*m.endY];
};
const liesOnCurve=(m:PencilPhotoMark,p:readonly number[])=>{
  let closest=Infinity;
  for(let i=0;i<=10000;i++){
    const q=xy(m,i/10000);
    closest=Math.min(closest,Math.hypot(q[0]-p[0],q[1]-p[1]));
  }
  return closest;
};
describe("ArtCraft tactile colored-pencil nib contact",()=>{
  it("has byte-identical legacy mode and preserves source fine strokes",()=>{
    expect(buildColoredPencilDryContact(full,0)).toEqual([full]);
    expect(buildColoredPencilDryContact(full,0)[0]).toBe(full);
    expect(isPencilSkinContactZone("face-value")).toBe(true);
    expect(isPencilSkinContactZone("face-chroma")).toBe(true);
    expect(isPencilSkinContactZone("face-form")).toBe(true);
    expect(isPencilSkinContactZone("face-scumble")).toBe(true);
    for(const zone of ["hair-fibre","hair-occlusion","measured-features",
      "facial-planes"])expect(isPencilSkinContactZone(zone)).toBe(false);
  });
  it("builds real curve-tangent pressure contacts, no separate pixel image",()=>{
    const marks=buildColoredPencilDryContact(full,.9,271);
    expect(marks.length).toBeGreaterThanOrEqual(3);
    expect(marks.length).toBeLessThanOrEqual(5);
    expect(marks[0].x).toBe(full.x);
    expect(marks[0].endX).toBe(full.endX);
    expect(marks[0].alpha).toBeLessThan(full.alpha);
    for(const m of marks){
      expect(m.color).toBe(full.color);
      expect(m.pass).toBe(full.pass);
      expect(m.alpha).toBeGreaterThan(0);
      expect(m.width).toBeGreaterThan(0);
      expect(liesOnCurve(full,[m.x,m.y])).toBeLessThan(.012);
      expect(liesOnCurve(full,[m.endX,m.endY])).toBeLessThan(.012);
      // Midpoint remains on the same original curve, not a linearly
      // faceted substitute (avoid wrong quadratic subinterval math).
      const center=xy(m,.5);
      expect(liesOnCurve(full,center)).toBeLessThan(.012);
    }
    expect(marks.slice(1).some(m=>m.width!==full.width)).toBe(true);
    expect(marks.slice(1).some(m=>m.alpha!==marks[1].alpha)).toBe(true);
    expect(buildColoredPencilDryContact(full,.9,271)).toEqual(marks);
    expect(buildColoredPencilDryContact(full,.9,272)).not.toEqual(marks);
    expect(full).toEqual({
      x:24,y:16,controlX:36,controlY:8,endX:49,endY:35,
      color:"#a86a65",alpha:.37,width:1.62,pass:1,
    });
  });
  it("rejects malformed pressure and leaves tiny nibs bounded",()=>{
    const tiny={...full,x:10,y:10,controlX:10.2,controlY:10.1,
      endX:10.4,endY:10.3};
    expect(buildColoredPencilDryContact(tiny,1)).toHaveLength(3);
    for(const tooth of [-.1,1.1,NaN,Infinity])
      expect(()=>buildColoredPencilDryContact(full,tooth))
        .toThrow(RangeError);
    expect(()=>buildColoredPencilDryContact({...full,width:0},1))
      .toThrow(RangeError);
    expect(()=>buildColoredPencilDryContact({...full,x:NaN},1))
      .toThrow(RangeError);
    expect(()=>buildColoredPencilDryContact(full,.5,-1))
      .toThrow(RangeError);
  });
});
