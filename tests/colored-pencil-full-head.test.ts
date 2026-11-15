import {describe,expect,it} from "vitest";
import {
  createDryPencilHeadPlate,projectMeasuredHeadContours,
} from "../src/video/colored-pencil-full-head";
import {mapCC0WomanPortraitFeatures} from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const isInside=(x:number,y:number,p:readonly(readonly[number,number])[])=>{
  let inside=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const a=p[i],b=p[j];
    if((a[1]>y)!==(b[1]>y)&&
      x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
};
const source=(suppressHair=false):PencilPhotoPixels=>{
  const width=900,height=506,data=new Uint8ClampedArray(width*height*4);
  const {face,hairOuter}=projectMeasuredHeadContours(guides);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const k=(width*y+x)*4;
    const inFace=isInside(x,y,face);
    const hair=!inFace&&isInside(x,y,hairOuter);
    const shade=Math.round(215-140*Math.min(1,Math.abs(y-265)/240));
    const channels=inFace?
      [shade,Math.round(shade*.83),Math.round(shade*.77)]:
      hair&&!suppressHair?[110,68,42]:[29,82,31];
    data[k]=channels[0];data[k+1]=channels[1];
    data[k+2]=channels[2];data[k+3]=255;
  }
  return {width,height,data};
};
describe("Source-measured ArtCraft full-head geometry (experimental)",()=>{
  it("projects face and rooted hair bounds through the existing 25 licensed source landmarks",()=>{
    const c=projectMeasuredHeadContours(guides);
    expect(c.reference).toBe("cc0-campbell-608x343");
    expect(c.face.length).toBeGreaterThanOrEqual(18);
    expect(c.hairOuter.length).toBeGreaterThanOrEqual(15);
    expect(c.uncertaintySourcePixels).toBeGreaterThan(0);
    expect(c.face.every(p=>p.every(Number.isFinite))).toBe(true);
    expect(c.hairOuter.every(p=>p.every(Number.isFinite))).toBe(true);
    // Jaw/chin must be INSIDE the attached head shape, not a floating oval.
    expect(isInside(guides.chin[0],guides.chin[1]-10,c.face)).toBe(true);
    expect(()=>projectMeasuredHeadContours({
      ...guides,eyeFarCenter:guides.eyeNearCenter,
    })).toThrow(RangeError);
  });
  it("constructs face pigment, clumped hair masses and root-aligned fibres on ivory paper",()=>{
    const plate=createDryPencilHeadPlate(source(),guides,271);
    expect(plate.width).toBe(540);expect(plate.height).toBe(600);
    expect(plate.rasterUnderpainting).toBe(false);
    expect(plate.paperColor).toBe("#FAF5ED");
    expect(plate.crop.width).toBeGreaterThan(280);
    expect(plate.crop.height).toBeGreaterThan(300);
    expect(plate.fiveValueCounts.reduce((a,b)=>a+b,0)).toBeGreaterThan(100);
    expect(plate.materialCounts["face-value"]).toBeGreaterThan(150);
    expect(plate.materialCounts["face-chroma"]).toBeGreaterThan(150);
    expect(plate.materialCounts["hair-mass"]).toBeGreaterThan(100);
    expect(plate.materialCounts["hair-fibre"]).toBeGreaterThan(80);
    expect(plate.materialCounts["measured-features"]).toBeGreaterThan(20);
    expect(plate.strokes.length).toBeGreaterThan(1500);
    expect(plate.strokes.length).toBeLessThan(120000);
    expect(plate.strokes.every((m,i,a)=>[
      m.x,m.y,m.controlX,m.controlY,m.endX,m.endY,m.width,m.alpha,
    ].every(Number.isFinite)&&m.x>=0&&m.x<=540&&m.y>=0&&m.y<=600&&
      m.endX>=0&&m.endX<=540&&m.endY>=0&&m.endY<=600&&
      m.alpha>0&&m.alpha<=.56&&m.width>0&&
      /^#[a-f0-9]{6}$/i.test(m.color)&&
      (i===0||a[i-1].pass<=m.pass))).toBe(true);
    expect("pigment" in plate).toBe(false);
    expect("image" in plate).toBe(false);
    expect(createDryPencilHeadPlate(source(),guides,271)).toEqual(plate);
  });
  it("suppresses garden-colored hair and responds to changed source material",()=>{
    const hair=createDryPencilHeadPlate(source(),guides,71);
    const garden=createDryPencilHeadPlate(source(true),guides,71);
    expect(garden.materialCounts["hair-mass"]).toBe(0);
    expect(garden.materialCounts["hair-fibre"]).toBe(0);
    expect(hair.materialCounts["hair-mass"]).toBeGreaterThan(200);
    expect(hair.strokes).not.toEqual(garden.strokes);
    expect(createDryPencilHeadPlate(source(),guides,72).strokes)
      .not.toEqual(hair.strokes);
  });
  it("fails closed for corrupt dimensions, missing landmarks and unsupported seeds",()=>{
    const img=source();
    expect(()=>createDryPencilHeadPlate({...img,width:NaN},guides))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(
      {...img,data:new Uint8ClampedArray(0)},guides)).toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,{
      ...guides,hairline:[Number.NaN,4],
    })).toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,guides,-1))
      .toThrow(RangeError);
  });
});
