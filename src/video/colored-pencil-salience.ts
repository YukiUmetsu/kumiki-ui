import type { PencilPhotoPixels } from "./colored-pencil-photo";
import type { PencilFlowField } from "./colored-pencil-flow-field";

/**
 * Relative salience is NOT semantic segmentation. It removes distracting
 * background hatching by comparing border palette with colour/edge-rich
 * features. The optional user focus knob reduces it when photographs differ.
 */
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const median=(v:number[])=>{
  v.sort((a,b)=>a-b);
  return v[Math.floor(v.length/2)]??128;
};
const paper=[250,245,237] as const;
export interface PencilSalience {
  attention:Float32Array;
  background:readonly [number,number,number];
  photographedBounds:readonly [number,number,number,number];
}
export function createPencilSalience(input:PencilPhotoPixels,flow:PencilFlowField):PencilSalience{
  const {width:w,height:h,data}=input;
  if(w!==flow.width||h!==flow.height||data.length!==w*h*4)
    throw new RangeError("Salience needs an aligned photograph and structure tensor.");
  let minX=w,maxX=0,minY=h,maxY=0,nonPaper=0;
  const isImage=(x:number,y:number)=>{
    const i=(y*w+x)*4;
    return Math.abs(data[i]-paper[0])+Math.abs(data[i+1]-paper[1])+
      Math.abs(data[i+2]-paper[2])>36;
  };
  // Exclude source-to-page letterboxing before sampling border palette.
  for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
    if(isImage(x,y)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);nonPaper++;}
  }
  if(nonPaper<8){
    return {attention:new Float32Array(w*h),
      background:[paper[0],paper[1],paper[2]],photographedBounds:[0,0,w,h]};
  }
  const bounds:[number,number,number,number]=[minX,minY,
    Math.min(w-1,maxX+1),Math.min(h-1,maxY+1)];
  const [x0,y0,x1,y1]=bounds;
  const border:[number[],number[],number[]]=[[],[],[]];
  const append=(x:number,y:number)=>{
    if(!isImage(x,y))return;
    const i=(y*w+x)*4;
    for(let c=0;c<3;c++)border[c].push(data[i+c]);
  };
  const bw=Math.max(1,x1-x0),bh=Math.max(1,y1-y0);
  for(let t=0;t<=48;t++){
    const x=clamp(Math.round(x0+bw*t/48),0,w-1);
    const y=clamp(Math.round(y0+bh*t/48),0,h-1);
    append(x,clamp(Math.round(y0+bh*.02),0,h-1));
    append(x,clamp(Math.round(y1-bh*.02),0,h-1));
    append(clamp(Math.round(x0+bw*.02),0,w-1),y);
    append(clamp(Math.round(x1-bw*.02),0,w-1),y);
  }
  const bg:[number,number,number]=[
    median(border[0]),median(border[1]),median(border[2]),
  ];
  const cell=8,cw=Math.ceil(w/cell),ch=Math.ceil(h/cell);
  const cores=new Float32Array(cw*ch);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    if(!isImage(x,y))continue;
    const i=y*w+x,j=i*4;
    const dist=Math.hypot(data[j]-bg[0],data[j+1]-bg[1],data[j+2]-bg[2])/442;
    // Border-adjacent background textures must not enter a broad subject
    // halo simply because their nearest feather is high contrast.
    const score=clamp((dist-.135)*5.2 + flow.edge[i]*.055,0,1);
    const z=Math.floor(y/cell)*cw+Math.floor(x/cell);
    cores[z]=Math.max(cores[z],score);
  }
  const smoothed=new Float32Array(cw*ch);
  for(let cy=0;cy<ch;cy++)for(let cx=0;cx<cw;cx++){
    let high=0;
    for(let vy=-1;vy<=1;vy++)for(let vx=-1;vx<=1;vx++){
      const ax=clamp(cx+vx,0,cw-1),ay=clamp(cy+vy,0,ch-1);
      const falloff=vx===0&&vy===0?1:.57;
      high=Math.max(high,cores[ay*cw+ax]*falloff);
    }
    smoothed[cy*cw+cx]=clamp((high-.13)/.62,0,1);
  }
  const attention=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(x<x0||x>x1||y<y0||y>y1||!isImage(x,y))continue;
    const px=x/cell-.5,py=y/cell-.5;
    const xL=clamp(Math.floor(px),0,cw-1),xR=clamp(xL+1,0,cw-1);
    const yT=clamp(Math.floor(py),0,ch-1),yB=clamp(yT+1,0,ch-1);
    const u=clamp(px-xL,0,1),v=clamp(py-yT,0,1);
    const top=smoothed[yT*cw+xL]*(1-u)+smoothed[yT*cw+xR]*u;
    const bottom=smoothed[yB*cw+xL]*(1-u)+smoothed[yB*cw+xR]*u;
    const i=y*w+x,j=i*4;
    const dist=Math.hypot(data[j]-bg[0],data[j+1]-bg[1],
      data[j+2]-bg[2])/442;
    // The local colour-distance must itself substantiate a subject pixel.
    // Dilation may suggest an adjacent beak but must NEVER fill an arbitrary
    // 16-pixel green/dark halo outside the actual blue/orange bird contour.
    const direct=clamp((dist-.10)*5.6,0,1);
    const nearby=top*(1-v)+bottom*v;
    attention[i]=clamp(direct*(.52+.48*nearby)+
      Math.min(.19,flow.edge[i]*.22)*nearby,0,1);
  }
  return {attention,background:bg,photographedBounds:bounds};
}
