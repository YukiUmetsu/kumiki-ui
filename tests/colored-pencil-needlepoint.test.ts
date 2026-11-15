import {describe,expect,it} from "vitest";
import type {PencilPhotoMark} from "../src/video/colored-pencil-photo";
import {
  buildPencilNeedlepointSkinContact,isPencilNeedlepointZone,
} from "../src/video/colored-pencil-needlepoint";

const stroke:Readonly<PencilPhotoMark>=Object.freeze({
  x:55.15,y:62.7,controlX:59.9,controlY:60.15,
  endX:64.2,endY:63.6,color:"#a77869",
  width:2.65,alpha:.245,pass:2 as const,
});
const midpoint=(m:PencilPhotoMark)=>[
  .25*m.x+.5*m.controlX+.25*m.endX,
  .25*m.y+.5*m.controlY+.25*m.endY,
];
describe("ArtCraft v15 fine sharp-point portrait skin",()=>{
  it("preserves exact original at 0% without repainting other materials",()=>{
    expect(isPencilNeedlepointZone("face-optical-weave")).toBe(true);
    for(const zone of ["hair-fibre","face-scumble","face-value",
      "face-form","facial-planes","measured-features","iris-near"]){
      expect(isPencilNeedlepointZone(zone)).toBe(false);
    }
    const disabled=buildPencilNeedlepointSkinContact(stroke,0);
    expect(disabled).toEqual([stroke]);
    expect(disabled[0]).toBe(stroke);
    expect(buildPencilNeedlepointSkinContact(stroke,0.02)).toEqual([stroke]);
  });
  it("deposits bounded short lateral needles and retains original crisp color",()=>{
    const full=buildPencilNeedlepointSkinContact(stroke,1,19);
    expect(full).toHaveLength(9);
    expect(full[full.length-1]).toBe(stroke);
    expect(buildPencilNeedlepointSkinContact(stroke,.5,19)).toHaveLength(5);
    const [x,y]=midpoint(stroke);
    const dx=stroke.endX-stroke.x,dy=stroke.endY-stroke.y;
    const len=Math.hypot(dx,dy);
    const nx=-dy/len,ny=dx/len;
    let positive=0,negative=0;
    for(const nib of full.slice(0,-1)){
      const [a,b]=midpoint(nib);
      const shift=(a-x)*nx+(b-y)*ny;
      if(shift>0)positive++;else negative++;
      expect(Math.abs(shift)).toBeLessThan(stroke.width*1.2);
      expect(Math.abs(shift)).toBeGreaterThan(stroke.width*.20);
      expect(nib.color).toBe(stroke.color);
      expect(nib.pass).toBe(stroke.pass);
      expect(nib.width).toBeGreaterThan(0);
      expect(nib.width).toBeLessThan(stroke.width*.55);
      expect(nib.alpha).toBeGreaterThan(0);
      expect(nib.alpha).toBeLessThan(stroke.alpha);
      expect([nib.x,nib.y,nib.controlX,nib.controlY,
        nib.endX,nib.endY].every(Number.isFinite)).toBe(true);
    }
    expect(positive).toBe(4);
    expect(negative).toBe(4);
    expect(Object.isFrozen(stroke)).toBe(true);
  });
  it("remains deterministic per source fibre across stage order and seeks",()=>{
    const original={...stroke};
    const a=buildPencilNeedlepointSkinContact(stroke,.75,271);
    expect(a).toEqual(buildPencilNeedlepointSkinContact(stroke,.75,271));
    expect(a).not.toEqual(buildPencilNeedlepointSkinContact(stroke,.75,272));
    expect(stroke).toEqual(original);
    expect(a[a.length-1]).toBe(stroke);
    // No separate raster, source pixels, paint filter or invented texture
    // is returned: only individually authored quadratic pigment strokes.
    expect(a.every(n=>!("data" in n)&&!("image" in n)&&!("raster" in n)))
      .toBe(true);
  });
  it("fails closed on unsupported pressure, seeds, and corrupt geometry",()=>{
    expect(()=>buildPencilNeedlepointSkinContact(stroke,1.01))
      .toThrow(RangeError);
    expect(()=>buildPencilNeedlepointSkinContact(stroke,-.01))
      .toThrow(RangeError);
    expect(()=>buildPencilNeedlepointSkinContact(stroke,NaN))
      .toThrow(RangeError);
    expect(()=>buildPencilNeedlepointSkinContact(stroke,.5,-1))
      .toThrow(RangeError);
    expect(()=>buildPencilNeedlepointSkinContact({...stroke,x:Infinity},1))
      .toThrow(RangeError);
    expect(()=>buildPencilNeedlepointSkinContact({...stroke,color:"red"},1))
      .toThrow(RangeError);
    expect(()=>buildPencilNeedlepointSkinContact({...stroke,alpha:0},1))
      .toThrow(RangeError);
    expect(buildPencilNeedlepointSkinContact({
      ...stroke,endX:stroke.x,endY:stroke.y,controlX:stroke.x,
      controlY:stroke.y,
    },1)).toHaveLength(1);
  });
});
