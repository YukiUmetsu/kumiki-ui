import {describe,expect,it} from "vitest";
import {createOpticalIrisPencil}
  from "../src/video/colored-pencil-iris-optics";
import {createPortraitEyeAperture,mapCC0WomanPortraitFeatures}
  from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const paperSource=():PencilPhotoPixels=>{
  const width=900,height=506,data=new Uint8ClampedArray(width*height*4);
  for(let k=0;k<data.length;k+=4){
    data[k]=215;data[k+1]=190;data[k+2]=174;data[k+3]=255;
  }
  return {width,height,data};
};
const shadedIrises=(withGlint=false):PencilPhotoPixels=>{
  const image=paperSource();
  for(const eye of ["near","far"] as const){
    const lid=createPortraitEyeAperture(guides,eye);
    const rx=lid.span*(eye==="near"?.195:.17),ry=rx*.85;
    const cx=lid.center[0],cy=lid.center[1];
    for(let y=Math.floor(cy-ry-3);y<=Math.ceil(cy+ry+3);y++){
      for(let x=Math.floor(cx-rx-3);x<=Math.ceil(cx+rx+3);x++){
        const u=(x-cx)/rx,v=(y-cy)/ry,r=u*u+v*v;
        if(r>1)continue;
        const pupil=r<.18,limbus=r>.79;
        const upperShade=y<cy-ry*.2;
        const [red,green,blue]=pupil?[25,22,24]:
          limbus?[48,36,31]:upperShade?[73,49,42]:[100,65,54];
        const k=4*(y*image.width+x);
        image.data[k]=red;image.data[k+1]=green;
        image.data[k+2]=blue;
      }
    }
    if(withGlint&&eye==="near"){
      const x=Math.round(cx+1),y=Math.round(cy-2);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const k=4*((y+dy)*image.width+(x+dx));
        image.data[k]=251;image.data[k+1]=246;image.data[k+2]=241;
      }
    }
  }
  return image;
};
const chroma=(p:PencilPhotoPixels,x:number,y:number)=>{
  const k=4*(Math.round(y)*p.width+Math.round(x));
  return (.2126*p.data[k]+.7152*p.data[k+1]+.0722*p.data[k+2])/255;
};
describe("ArtCraft photographic iris/pupil radial colored-pencil fibers",()=>{
  it("fails closed on feature-only guesses, blank portraits and disabled control",()=>{
    const blank=paperSource();
    const noContrast=createOpticalIrisPencil(blank,guides,271,1);
    expect(noContrast.marks).toHaveLength(0);
    expect(noContrast.eyes).toHaveLength(2);
    expect(noContrast.eyes.every(e=>e.sourceContrast<.075)).toBe(true);
    const disabled=createOpticalIrisPencil(shadedIrises(),guides,271,0);
    expect(disabled.marks).toHaveLength(0);
    expect(disabled.eyes).toHaveLength(0);
    expect(disabled.rasterUnderpainting).toBe(false);
    expect(disabled.sourceRequired).toBe(true);
  });
  it("draws actual photo-supported partial limbus, radial iris and pupil separately",()=>{
    const image=shadedIrises();
    const bytes=new Uint8ClampedArray(image.data);
    const proof=createOpticalIrisPencil(image,guides,271,.85);
    expect(proof.eyes).toHaveLength(2);
    for(const eye of proof.eyes){
      expect(eye.sourceContrast).toBeGreaterThan(.15);
      expect(eye.ringNibCount).toBeGreaterThan(8);
      expect(eye.radialNibCount).toBeGreaterThan(60);
      expect(eye.pupilNibCount).toBeGreaterThan(70);
    }
    expect(proof.marks.length).toBeGreaterThan(300);
    expect(proof.marks.length).toBeLessThan(5500);
    for(const m of proof.marks){
      expect(m.alpha).toBeGreaterThan(0);
      expect(m.alpha).toBeLessThanOrEqual(.56);
      expect(m.width).toBeGreaterThan(0);
      expect(m.pass).toBe(2);
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/);
      expect([m.x,m.y,m.controlX,m.controlY,m.endX,m.endY]
        .every(Number.isFinite)).toBe(true);
      // Every whole nib belongs to an actual optically dark point.
      expect(chroma(image,m.x,m.y)).toBeLessThan(.82);
      expect(chroma(image,m.endX,m.endY)).toBeLessThan(.82);
    }
    expect(image.data.every((v,i)=>v===bytes[i])).toBe(true);
    expect(createOpticalIrisPencil(image,guides,271,.85)).toEqual(proof);
    expect(createOpticalIrisPencil(image,guides,272,.85).marks)
      .not.toEqual(proof.marks);
  },15000);
  it("preserves photographed corneal reflections and validates runtime contracts",()=>{
    const source=shadedIrises(true);
    const proof=createOpticalIrisPencil(source,guides,43,1);
    expect(proof.eyes[0].reserveCount).toBeGreaterThan(0);
    expect(proof.highlightReserves).toBeGreaterThan(0);
    expect(proof.marks.length).toBeGreaterThan(100);
    // Glint pixels are NEVER promoted into a colored pencil stroke root.
    for(const m of proof.marks){
      expect(chroma(source,m.x,m.y)).toBeLessThan(.91);
    }
    expect(()=>createOpticalIrisPencil({
      ...source,data:new Uint8ClampedArray(0)},guides)).toThrow(RangeError);
    expect(()=>createOpticalIrisPencil(source,{
      ...guides,eyeNearCenter:[Number.NaN,2],
    })).toThrow(RangeError);
    expect(()=>createOpticalIrisPencil(source,guides,0,-.1))
      .toThrow(RangeError);
    expect(()=>createOpticalIrisPencil(source,guides,2147483648,1))
      .toThrow(RangeError);
  });
});
