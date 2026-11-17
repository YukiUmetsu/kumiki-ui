import {describe,expect,it} from "vitest";
import {
  createDryPencilHeadPlate,projectMeasuredHeadContours,
  observedLightSkinSupport,pencilSkinFibreFlow,
  HEAD_STORYBOARD_PHASES,selectHeadStoryboardStrokes,
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
    expect(plate.featureDepth).toBe(.85);
    expect(plate.skinCoverage).toBe(.70);
    expect(plate.facialPlaneCounts["lip-vermilion"]).toBeGreaterThanOrEqual(0);
    expect(plate.facialPlaneCounts["nasal-alar"]).toBeGreaterThanOrEqual(0);
    expect(plate.materialCounts["facial-planes"]).toBe(
      plate.facialPlaneCounts["lip-vermilion"]+
      plate.facialPlaneCounts["nasal-alar"]);
    expect(plate.crop.width).toBeGreaterThan(280);
    expect(plate.crop.height).toBeGreaterThan(300);
    expect(plate.fiveValueCounts.reduce((a,b)=>a+b,0)).toBeGreaterThan(100);
    expect(plate.materialCounts["face-value"]).toBeGreaterThan(150);
    expect(plate.materialCounts["face-chroma"]).toBeGreaterThan(150);
    expect(plate.materialCounts["face-optical-weave"]).toBeGreaterThan(300);
    expect(plate.skinWeaveEvidence.pigments).toBe(
      plate.materialCounts["face-optical-weave"]);
    expect(plate.skinWeaveDepth).toBe(.70);
    expect(plate.skinWeaveEvidence.protectedAnatomy).toBeGreaterThan(0);
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
  },15000);
  it("suppresses garden-colored hair and responds to changed source material",()=>{
    const hair=createDryPencilHeadPlate(source(),guides,71);
    const garden=createDryPencilHeadPlate(source(true),guides,71);
    expect(garden.materialCounts["hair-mass"]).toBe(0);
    expect(garden.materialCounts["hair-fibre"]).toBe(0);
    expect(garden.materialCounts["hair-occlusion"]).toBe(0);
    expect(hair.materialCounts["hair-occlusion"]).toBeGreaterThan(30);
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


describe("ArtCraft anatomy-connected colored-pencil fibre flow",()=>{
  it("transitions across measured facial planes without a ruled diagonal",()=>{
    const d=Math.hypot(
      guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
      guides.eyeNearCenter[1]-guides.eyeFarCenter[1]);
    const near:readonly[number,number]=[
      guides.noseBridge[0]+d*.16,guides.noseBridge[1]+d*.11,
    ];
    const other:readonly[number,number]=[
      near[0]+d*.004,near[1]+d*.004,
    ];
    const first=pencilSkinFibreFlow(near,guides,d,0);
    const neighbour=pencilSkinFibreFlow(other,guides,d,0);
    const chroma=pencilSkinFibreFlow(near,guides,d,1);
    const form=pencilSkinFibreFlow(near,guides,d,2);
    expect(Math.abs(first.angle-neighbour.angle)).toBeLessThan(.12);
    expect(chroma.angle-first.angle).toBeCloseTo(.61,9);
    expect(form.angle-first.angle).toBeCloseTo(-.34,9);
    expect(chroma.curvature).toBeLessThan(first.curvature);
    const cheek=pencilSkinFibreFlow([
      guides.noseBridge[0]-d*.7,guides.noseBridge[1]+d*.3,
    ],guides,d,0);
    const bridge=pencilSkinFibreFlow([
      guides.noseBridge[0],guides.noseBridge[1]+d*.15,
    ],guides,d,0);
    expect(Math.abs(cheek.angle-bridge.angle)).toBeGreaterThan(.45);
    expect([first,neighbour,chroma,form,cheek,bridge].every(v=>
      Number.isFinite(v.angle)&&Number.isFinite(v.curvature)&&
      Math.abs(v.curvature)<.25)).toBe(true);
    expect(pencilSkinFibreFlow(near,guides,d,0)).toEqual(first);
    expect(()=>pencilSkinFibreFlow([NaN,2],guides,d,0))
      .toThrow(RangeError);
    expect(()=>pencilSkinFibreFlow(near,guides,0,0))
      .toThrow(RangeError);
  });
  it("provides deterministic 0–100% Storybook fibre A/B without changing the anatomy",()=>{
    const photo=source(),copy=new Uint8ClampedArray(photo.data);
    const legacy=createDryPencilHeadPlate(photo,guides,271,.65,.85,.7,0);
    const woven=createDryPencilHeadPlate(photo,guides,271,.65,.85,.7,1);
    expect(legacy.fibreFlowStrength).toBe(0);
    expect(woven.fibreFlowStrength).toBe(1);
    expect(legacy.geometry).toEqual(woven.geometry);
    expect(legacy.materialCounts).toEqual(woven.materialCounts);
    expect(legacy.strokes.length).toBe(woven.strokes.length);
    const skin=(p:typeof legacy)=>p.strokes.filter(m=>
      m.zone==="face-value"||m.zone==="face-chroma"||
      m.zone==="face-scumble");
    expect(skin(legacy).length).toBeGreaterThan(250);
    expect(skin(legacy).some((m,i)=>
      m.controlX!==skin(woven)[i].controlX||
      m.controlY!==skin(woven)[i].controlY)).toBe(true);
    const hair=(p:typeof legacy)=>p.strokes.filter(m=>
      m.zone==="hair-mass"||m.zone==="hair-fibre"||
      m.zone==="hair-occlusion");
    expect(hair(legacy)).toEqual(hair(woven));
    expect(photo.data).toEqual(copy);
    expect(createDryPencilHeadPlate(photo,guides,271,.65,.85,.7,1))
      .toEqual(woven);
    expect(()=>createDryPencilHeadPlate(photo,guides,271,.65,.85,.7,NaN))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(photo,guides,271,.65,.85,.7,-.1))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(photo,guides,271,.65,.85,.7,1.1))
      .toThrow(RangeError);
  },20000);
  it("retains separate dry marks and monotonic four-shot reveals",()=>{
    const plate=createDryPencilHeadPlate(source(),guides,271,.85);
    for(const zone of ["face-value","face-chroma","face-scumble"] as const){
      const marks=plate.strokes.filter(m=>m.zone===zone);
      expect(marks.length).toBeGreaterThan(50);
      expect(marks.every(m=>m.alpha>0&&m.alpha<=.56&&
        m.width>0&&Number.isFinite(m.controlX)&&
        Number.isFinite(m.controlY))).toBe(true);
    }
    expect(plate.rasterUnderpainting).toBe(false);
    const stages=HEAD_STORYBOARD_PHASES.map(p=>
      selectHeadStoryboardStrokes(plate.strokes,p.id));
    for(let i=1;i<stages.length;i++)
      expect(stages[i].length).toBeGreaterThan(stages[i-1].length);
  },15000);
});
describe("ArtCraft source-observed luminous skin is not unpigmented paper",()=>{
  it("preserves real light-face pigment while reserving actual ivory highlights",()=>{
    const malar=observedLightSkinSupport(202/255);
    const nasal=observedLightSkinSupport(199/255);
    const paper=observedLightSkinSupport(242/255);
    expect(malar.density).toBeGreaterThan(.68);
    expect(malar.opacity).toBeGreaterThan(.81);
    expect(nasal.density).toBeGreaterThan(malar.density);
    expect(paper.density).toBeLessThan(.2);
    expect(paper.opacity).toBeLessThan(.38);
    expect(observedLightSkinSupport(.79)).toEqual(
      {density:.72,opacity:.85});
    expect(observedLightSkinSupport(.94).density).toBeCloseTo(.17,8);
    for(const x of [-.01,1.01,NaN,Infinity])
      expect(()=>observedLightSkinSupport(x)).toThrow(RangeError);
  });
});
describe("ArtCraft four-shot production storyboard and pencil scumbling",()=>{
  it("constructs four chronological, strictly increasing paper-only mark families",()=>{
    const plate=createDryPencilHeadPlate(source(),guides,271,.85);
    const phases=HEAD_STORYBOARD_PHASES.map(stage=>
      selectHeadStoryboardStrokes(plate.strokes,stage.id));
    expect(HEAD_STORYBOARD_PHASES).toHaveLength(4);
    expect(phases.map(p=>p.length).every(n=>n>500)).toBe(true);
    for(let i=0;i<phases.length-1;i++){
      expect(phases[i].length).toBeLessThan(phases[i+1].length);
      // Future stages only add authored pigment: no erase/photo
      // substitution as the animation progresses.
      expect(phases[i].every(mark=>phases[i+1].includes(mark))).toBe(true);
    }
    expect(phases[3]).toEqual(plate.strokes);
    expect(phases[0].every(m=>
      m.zone==="face-value"||m.zone==="hair-mass"&&m.pass===0)).toBe(true);
    expect(phases[1].some(m=>m.zone==="face-chroma")).toBe(true);
    expect(phases[2].some(m=>m.zone==="face-scumble")).toBe(true);
    expect(phases[2].some(m=>m.zone==="face-form")).toBe(true);
    expect(phases[2].some(m=>m.zone==="hair-occlusion")).toBe(true);
    expect(phases[2].some(m=>m.zone==="hair-fibre")).toBe(false);
    expect(phases[3].some(m=>m.zone==="hair-fibre")).toBe(true);
    expect(phases[3].some(m=>m.zone==="measured-features")).toBe(true);
    expect(()=>selectHeadStoryboardStrokes(plate.strokes,
      "nonsense" as never)).toThrow(RangeError);
  },15000);
  it("face coverage softens pencil tooth without touching hair, geometry or source",()=>{
    const img=source(),copy=new Uint8ClampedArray(img.data);
    const unblended=createDryPencilHeadPlate(img,guides,271,.65,.85,0);
    const blended=createDryPencilHeadPlate(img,guides,271,.65,.85,.9);
    const mean=(p:typeof unblended,zone:string)=>
      p.strokes.filter(mark=>mark.zone===zone)
        .reduce((sum,mark,_,all)=>sum+mark.width/all.length,0);
    expect(blended.strokes.length).toBe(unblended.strokes.length);
    expect(mean(blended,"face-value")).toBeGreaterThan(
      mean(unblended,"face-value")+.20);
    expect(mean(blended,"face-chroma")).toBeGreaterThan(
      mean(unblended,"face-chroma")+.15);
    expect(mean(blended,"measured-features")).toBeCloseTo(
      mean(unblended,"measured-features"),7);
    expect(blended.materialCounts).toEqual(unblended.materialCounts);
    expect(blended.geometry).toEqual(unblended.geometry);
    expect(img.data).toEqual(copy);
    expect(createDryPencilHeadPlate(img,guides,271,.65,.85,.9))
      .toEqual(blended);
    expect(()=>createDryPencilHeadPlate(img,guides,271,.65,.85,-.01))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,guides,271,.65,.85,1.01))
      .toThrow(RangeError);
  },15000);
  it("scumble is controllable, deterministic, doesn't mutate photo pixels",()=>{
    const img=source(),original=new Uint8ClampedArray(img.data);
    const raw=createDryPencilHeadPlate(img,guides,271,0);
    const finished=createDryPencilHeadPlate(img,guides,271,.85);
    expect(raw.materialCounts["face-scumble"]).toBe(0);
    expect(finished.materialCounts["face-scumble"]).toBeGreaterThan(60);
    expect(finished.strokes.length).toBeGreaterThan(raw.strokes.length);
    expect(finished.scumbleStrength).toBe(.85);
    expect(createDryPencilHeadPlate(img,guides,271,.85)).toEqual(finished);
    expect(img.data).toEqual(original);
    expect(()=>createDryPencilHeadPlate(img,guides,271,-.01))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,guides,271,Number.NaN))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,guides,271,1.2))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,guides,271,.5,-.02))
      .toThrow(RangeError);
    expect(()=>createDryPencilHeadPlate(img,guides,271,.5,1.01))
      .toThrow(RangeError);
  },15000);
});
