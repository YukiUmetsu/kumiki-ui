import {describe,expect,it} from "vitest";
import {createPencilFlowField} from "../src/video/colored-pencil-flow-field";
import {createPencilSalience} from "../src/video/colored-pencil-salience";
import {createPencilPhotoStudy} from "../src/video/colored-pencil-photo";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

/** A colour-identified animal with dark beak surrounded by blurred olive image. */
function source():PencilPhotoPixels{
  const w=120,h=80,data=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const j=4*(y*w+x),white=x<8||x>=112;
    const bird=x>=52&&x<=90&&y>=19&&y<=63;
    const bill=x>=34&&x<52&&y>=30&&y<33;
    const r=white?250:bird?193:bill?30:50;
    const g=white?245:bird?101:bill?37:68;
    const b=white?237:bird?37:bill?48:43;
    data[j]=r;data[j+1]=g;data[j+2]=b;data[j+3]=255;
  }
  return {width:w,height:h,data};
}
const average=(v:Float32Array,w:number,rect:readonly[number,number,number,number])=>{
  let sum=0,count=0;const[x0,y0,x1,y1]=rect;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){sum+=v[y*w+x];count++;}
  return sum/count;
};
describe("ArtCraft foreground pigment attention",()=>{
  it("retains high-chroma animal forms but suppresses uniform green backdrop hatch",()=>{
    const p=source();
    const luma=new Float32Array(p.width*p.height);
    for(let i=0;i<luma.length;i++)luma[i]=
      (.2126*p.data[4*i]+.7152*p.data[4*i+1]+.0722*p.data[4*i+2])/255;
    const flow=createPencilFlowField(luma,p.width,p.height);
    const result=createPencilSalience(p,flow);
    expect(result.photographedBounds[0]).toBeGreaterThanOrEqual(7);
    expect(result.photographedBounds[2]).toBeLessThan(113);
    expect(result.attention.length).toBe(p.width*p.height);
    const bird=average(result.attention,p.width,[60,28,80,50]);
    const backdrop=average(result.attention,p.width,[15,10,30,20]);
    const bill=average(result.attention,p.width,[40,30,48,33]);
    expect(bird).toBeGreaterThan(.58);
    expect(backdrop).toBeLessThan(.35);
    expect(bird).toBeGreaterThan(backdrop+.40);
    // A narrow beak earns a small local feature score; broad dilation would
    // restore the ugly 8–16px dark halo around the whole kingfisher.
    expect(bill).toBeGreaterThan(.025);
    expect(result.attention[0]).toBe(0); // ivory letterbox
    expect(result.background[1]).toBeGreaterThan(50);
    expect(result).toEqual(createPencilSalience(p,flow));
  });

  it("preserves colour distinction and deposits more fine lines on the animal",()=>{
    const p=source(),s=createPencilPhotoStudy(p,{density:2,focus:.95});
    const count=(r:readonly[number,number,number,number])=>
      s.strokes.filter(m=>m.x>=r[0]&&m.x<r[2]&&m.y>=r[1]&&m.y<r[3]).length/
      ((r[2]-r[0])*(r[3]-r[1]));
    const bird=count([55,20,90,62]),background=count([15,10,35,50]);
    expect(bird).toBeGreaterThan(background*2.2);
    const birdPixel=(44*p.width+70)*4,backgroundPixel=(12*p.width+22)*4;
    // Colour distinction is warmth (red minus blue): the orange bird stays
    // clearly warmer than the olive backdrop. Since #297 the backdrop keeps
    // a floor of its real pigment, so its blue channel is no longer lifted
    // toward paper; comparing raw blue values measured only that fade.
    const warmth=(px:Uint8ClampedArray,i:number)=>px[i]-px[i+2];
    expect(warmth(s.pigment,birdPixel)).toBeGreaterThan(warmth(s.pigment,backgroundPixel)+70);
    expect(s.pigment[0]).toBeGreaterThanOrEqual(240);
    const noFocus=createPencilPhotoStudy(p,{density:2,focus:0});
    expect(noFocus.pigment).not.toEqual(s.pigment);
    // Focus still lifts the backdrop toward paper.
    expect(s.pigment[backgroundPixel+2]).toBeGreaterThan(noFocus.pigment[backgroundPixel+2]+15);
    expect(noFocus.strokes).not.toEqual(s.strokes);
  });

  it("rejects inconsistent flow/image dimensions",()=>{
    const p=source(),lum=new Float32Array(p.width*p.height).fill(.4);
    const f=createPencilFlowField(lum,p.width,p.height);
    expect(()=>createPencilSalience({...p,height:p.height+1},f)).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy(p,{focus:1.2})).toThrow(RangeError);
  });
});
