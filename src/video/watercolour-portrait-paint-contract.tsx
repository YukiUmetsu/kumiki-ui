import type {CSSProperties} from "react";
import {WatercolourSurface} from "../../registry/video/watercolour-brush-react";
import type {PaintSurfaceSpec,PaintStroke} from "../../registry/video/watercolour-brush";
import {inspectPaintSurface} from "../../registry/video/watercolour-brush";
import {WatercolourWetPaper} from "../../registry/video/watercolour-wet-paper-react";
import type {WetPaperSpec,WetPigmentDrop} from "../../registry/video/watercolour-wet-paper";
import {insideWetPaintArea,inspectWetPaper} from "../../registry/video/watercolour-wet-paper";

/** All semantic roles must be painted with REAL WM1 brush ribbons and REAL
 * WM4 water/pigment transport. An SVG gradient illustration alone cannot pass.
 * This is a medium contract, NOT certification of anatomy or artistic quality.
 */
export const NATIVE_PORTRAIT_REGIONS=[
  "face-volume","near-eye","far-eye","nose","mouth","hair","neck-and-garment",
] as const;
export type NativePortraitRegionId=typeof NATIVE_PORTRAIT_REGIONS[number];
export interface NativePortraitPaintRegion {
  id:NativePortraitRegionId;
  /** Paint mask in the same paper-space coordinates as both render engines. */
  polygon:readonly {x:number;y:number}[];
  /** Named, pressure/time-controlled WM1 contact gestures for this anatomy. */
  strokeIds:readonly string[];
  /** Physical wet pigment sources; never just an SVG gaussian blur. */
  dropIds:readonly string[];
}
export interface NativeWatercolourPortraitSpec {
  version:1;
  width:number;
  height:number;
  paper:{color:string;tooth:number};
  /** WM1: pressure, speed, load, water, bristles, wet/spread/dry phases. */
  brush:PaintSurfaceSpec;
  /** WM4: brush-path deposits, wet front, sediment, edge pooling and reserves. */
  wetPigment:WetPaperSpec;
  regions:readonly NativePortraitPaintRegion[];
}

export function inspectNativePortraitPaint(spec:NativeWatercolourPortraitSpec):string[]{
  if(!spec||spec.version!==1)return ["/version"];
  const errors:string[]=[];
  if(!spec.brush||!spec.wetPigment)return ["/brush","/wetPigment"];
  errors.push(...inspectPaintSurface(spec.brush).map(e=>"/brush"+e.path));
  errors.push(...inspectWetPaper(spec.wetPigment).map(e=>"/wetPigment"+e.path));
  const brush=spec.brush,wet=spec.wetPigment;
  if(brush.medium!=="watercolour")errors.push("/brush/medium-watercolour-required");
  if(spec.width!==brush.width||spec.width!==wet.width||
    spec.height!==brush.height||spec.height!==wet.height)errors.push("/shared-paper/size");
  if(spec.paper?.color!==brush.paper?.color||
    spec.paper?.color!==wet.paper?.color||
    spec.paper?.tooth!==brush.paper?.tooth||
    spec.paper?.tooth!==wet.paper?.tooth)errors.push("/shared-paper/material");
  if(brush.seed!==wet.seed)errors.push("/shared-paper/seed");
  if(!(wet.flow>.1&&wet.edgePooling!==undefined&&wet.edgePooling>.05&&
    wet.granulation>.1))errors.push("/wetPigment/physical-transport");
  if(!wet.reservePaths?.length)errors.push("/wetPigment/paper-reserves");
  if(!Array.isArray(spec.regions)||
    spec.regions.length!==NATIVE_PORTRAIT_REGIONS.length)return [...errors,"/regions/count"];

  const strokes=new Map((brush.strokes??[]).map(s=>[s.id,s]));
  const drops=new Map((wet.drops??[]).map(d=>[d.id,d]));
  const ownedStrokes=new Set<string>(),ownedDrops=new Set<string>();
  const areas=wet.paintAreas??[];
  for(const [index,role] of NATIVE_PORTRAIT_REGIONS.entries()){
    const r=spec.regions[index];
    if(!r||r.id!==role){errors.push("/regions/"+index+"/order");continue;}
    const path="/regions/"+r.id;
    if(!Array.isArray(r.polygon)||r.polygon.length<3||
      r.polygon.length>64||r.polygon.some(p=>!p||
        !Number.isFinite(p.x)||!Number.isFinite(p.y)||
        p.x<0||p.x>spec.width||p.y<0||p.y>spec.height)){
      errors.push(path+"/polygon");continue;
    }
    // WM4 paper areas must be exactly the authored semantic masks. A generic
    // full-frame atmosphere is not equivalent to face-bound wet pigment.
    if(JSON.stringify(areas[index])!==JSON.stringify(r.polygon))
      errors.push(path+"/wet-boundary");
    if(!Array.isArray(r.strokeIds)||r.strokeIds.length<2)
      errors.push(path+"/pressure-strokes");
    else for(const id of r.strokeIds){
      const s:PaintStroke|undefined=strokes.get(id);
      if(!s||ownedStrokes.has(id)){errors.push(path+"/stroke-id");continue;}
      ownedStrokes.add(id);
      const pressure=s.points?.map(p=>p.pressure)??[];
      if(!pressure.length||Math.max(...pressure)-Math.min(...pressure)<.30)
        errors.push(path+"/pressure-variation");
      if(!s.points?.every(p=>insideWetPaintArea(p.x,p.y,[r.polygon])))
        errors.push(path+"/stroke-attachment");
    }
    if(!Array.isArray(r.dropIds)||r.dropIds.length<1)
      errors.push(path+"/wet-deposits");
    else for(const id of r.dropIds){
      const d:WetPigmentDrop|undefined=drops.get(id);
      if(!d||ownedDrops.has(id)){errors.push(path+"/deposit-id");continue;}
      ownedDrops.add(id);
      if(!d.path||d.path.length<3||!d.path.every(p=>
        insideWetPaintArea(p.x,p.y,[r.polygon])))
        errors.push(path+"/real-wet-brush-path");
      if(d.water<.5||d.load<.3)errors.push(path+"/pigment-loading");
    }
  }
  if(ownedStrokes.size!==strokes.size)errors.push("/brush/unattributed-strokes");
  if(ownedDrops.size!==drops.size)errors.push("/wetPigment/unattributed-drops");
  if(![...strokes.values()].some(s=>s.water>=.75&&s.dryBrush<=.25)||
    ![...strokes.values()].some(s=>s.dryBrush>=.45))
    errors.push("/brush/wet-and-dry-gesture-diversity");
  return [...new Set(errors)];
}

/** Material-native composition. It invokes the ACTUAL reusable WM4 and WM1
 * painters; it is not a shape filled with a 'watercolor' SVG filter.
 * Layers share coordinates/seed/paper and remain deterministic at any frame.
 *
 * No default face exists. This primitive is intentionally absent from public
 * Storybook until a reference-led portrait passes independent visual QA.
 */
export function NativeWatercolourPortraitPaint({spec,frame,reducedMotion=false,
  style}:{
  spec:NativeWatercolourPortraitSpec;frame:number;reducedMotion?:boolean;
  style?:CSSProperties;
}){
  const problems=inspectNativePortraitPaint(spec);
  if(problems.length)throw new Error("Invalid native watercolor portrait: "+problems.join(", "));
  return <div data-km-native-watercolour-portrait="" data-km-native-medium="WM1+WM4"
    data-km-native-frame={frame}
    style={{width:spec.width,height:spec.height,position:"relative",
      background:spec.paper.color,overflow:"hidden",...style}}>
    <WatercolourWetPaper spec={spec.wetPigment} frame={frame}
      reducedMotion={reducedMotion} transparentPaper aria-hidden
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
    <WatercolourSurface spec={spec.brush} frame={frame}
      reducedMotion={reducedMotion} transparentPaper
      label="Source-painted watercolor portrait pigment and pressure brush"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
  </div>;
}
