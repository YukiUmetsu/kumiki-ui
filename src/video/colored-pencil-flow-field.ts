/**
 * ArtCraft reference-conditioned local mark-flow field.
 *
 * A raw Sobel direction at one pixel flips violently around fur, beak edges,
 * photography noise and highlighted feather streaks. Average the *structure
 * tensor* instead: all signed edge directions in a local 3x3 neighborhood
 * contribute to a stable, orientation-only shaft. This preserves an actual
 * source feature's local tangent while rejecting sign reversals and isolated
 * pixel noise. No AI model or proprietary tracing assets.
 */
export interface PencilFlowField {
  width:number;
  height:number;
  /** Tangent to a locally coherent source edge, in radians. */
  tangent:Float32Array;
  /** Contrast/feature confidence, 0..1. */
  edge:Float32Array;
  /** Directional coherence, 0..1. In flat zones hatch instead. */
  coherence:Float32Array;
}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));

/** Deterministic, frame-invariant dense structure tensor; maximum 2048². */
export function createPencilFlowField(luma:Float32Array,
  width:number,height:number):PencilFlowField {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
    width<8||height<8||width>2048||height>2048||
    !(luma instanceof Float32Array)||luma.length!==width*height)
    throw new RangeError("Invalid source dimensions for pencil-flow field.");
  for(let i=0;i<luma.length;i++){
    if(!Number.isFinite(luma[i])||luma[i]<0||luma[i]>1)
      throw new RangeError("Source luminance must be 0..1.");
  }
  const gx=new Float32Array(luma.length),gy=new Float32Array(luma.length);
  const at=(x:number,y:number)=>luma[
    clamp(y,0,height-1)*width+clamp(x,0,width-1)
  ];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    const a=at(x-1,y-1),b=at(x,y-1),c=at(x+1,y-1);
    const d=at(x-1,y),e=at(x+1,y);
    const f=at(x-1,y+1),g=at(x,y+1),h=at(x+1,y+1);
    gx[i]=(c+2*e+h-a-2*d-f)/8;
    gy[i]=(f+2*g+h-a-2*b-c)/8;
  }
  const tangent=new Float32Array(luma.length);
  const edge=new Float32Array(luma.length);
  const coherence=new Float32Array(luma.length);
  const weights=[1,2,1];
  const index=(x:number,y:number)=>
    clamp(y,0,height-1)*width+clamp(x,0,width-1);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    let xx=0,xy=0,yy=0;
    for(let v=-1;v<=1;v++)for(let u=-1;u<=1;u++){
      const j=index(x+u,y+v);
      const weight=weights[u+1]*weights[v+1]/16;
      const dx=gx[j],dy=gy[j];
      xx+=dx*dx*weight;
      xy+=dx*dy*weight;
      yy+=dy*dy*weight;
    }
    const anisotropy=Math.hypot(xx-yy,2*xy);
    const energy=xx+yy;
    const i=y*width+x;
    tangent[i]=.5*Math.atan2(2*xy,xx-yy)+Math.PI*.5;
    coherence[i]=clamp(anisotropy/(energy+1e-8),0,1);
    edge[i]=clamp(Math.sqrt(energy)*6,0,1);
  }
  return {width,height,tangent,edge,coherence};
}
