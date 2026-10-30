import type { CSSProperties, ReactNode } from "react";
import { DeviceFrame } from "./device-frame";
import type { DeviceKind, ScreenHighlight } from "./device-frame";
import { IconPlate } from "./icon-plate";
import { evaluateOneChangeHold } from "./one-change-hold";
import type { OneChangeSample, OneChangeWindow } from "./one-change-hold";

export type SubjectAsset =
  | { mode:"device"; src:string; alt:string; device?:DeviceKind;
      highlight?:ScreenHighlight; appMarkSrc?:string }
  | { mode:"screen"; src:string; alt:string }
  | { mode:"icon"; src?:string; alt?:string; name:string; claim:string }
  | { mode:"scene"; src:string; alt:string; focalPoint?:{x:number;y:number} };
export interface SubjectRect {x:number;y:number;width:number;height:number}
export interface SubjectStageLayout {
  width:number; height:number; subject:SubjectRect|null; explanation:SubjectRect;
  title:SubjectRect; caption:SubjectRect;
}
export function subjectStageLayout(orientation:"landscape"|"portrait", hasSubject:boolean):SubjectStageLayout {
  if (orientation==="landscape") return {
    width:1920,height:1080,
    subject:hasSubject?{x:120,y:220,width:980,height:640}:null,
    explanation:hasSubject?{x:1140,y:220,width:660,height:640}:{x:120,y:220,width:1680,height:640},
    title:{x:120,y:70,width:1680,height:118},
    caption:{x:120,y:968,width:1680,height:76},
  };
  return {
    width:1080,height:1920,
    subject:hasSubject?{x:116,y:420,width:848,height:620}:null,
    explanation:hasSubject?{x:116,y:1090,width:848,height:540}:{x:116,y:420,width:848,height:1210},
    title:{x:116,y:214,width:848,height:152},
    caption:{x:116,y:1714,width:848,height:130},
  };
}
export interface SubjectStageProps {
  frame:number;
  window:OneChangeWindow;
  orientation?:"landscape"|"portrait";
  subject?:SubjectAsset;
  /** Current diagram is passed through unchanged and never downscaled. */
  explanation:ReactNode|((sample:OneChangeSample)=>ReactNode);
  title?:string;
  caption?:string;
  accent?:string;
  background?:string;
  style?:CSSProperties;
  className?:string;
}
function placed(rect:SubjectRect,layout:SubjectStageLayout):CSSProperties {
  return {position:"absolute",left:(rect.x/layout.width*100)+"%",
    top:(rect.y/layout.height*100)+"%",width:(rect.width/layout.width*100)+"%",
    height:(rect.height/layout.height*100)+"%",minWidth:0,minHeight:0};
}
/** Photographic subject first; explanation sits beside/below and owns its own renderer. */
export function SubjectStage({frame,window,orientation="landscape",subject,explanation,title,caption,
  accent="#65dbc7",background="#101a27",style,className}:SubjectStageProps) {
  const sample=evaluateOneChangeHold(window,frame);
  if (!sample.active) return null;
  const layout=subjectStageLayout(orientation,Boolean(subject));
  if (subject?.mode==="scene" && subject.focalPoint &&
      (![subject.focalPoint.x,subject.focalPoint.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))) {
    throw new Error("Scene focal point must use normalized coordinates.");
  }
  const renderedExplanation=typeof explanation==="function"?explanation(sample):explanation;
  const subjectView=subject?.mode==="device"
    ? <DeviceFrame imageSrc={subject.src} alt={subject.alt} device={subject.device}
        highlight={subject.highlight} highlighted={sample.showHighlight} appMarkSrc={subject.appMarkSrc}/>
    : subject?.mode==="icon"
      ? <IconPlate name={subject.name} claim={subject.claim} markSrc={subject.src} markAlt={subject.alt}/>
      : subject
        ? <img src={subject.src} alt={subject.alt} draggable={false}
            style={{width:"100%",height:"100%",display:"block",
              objectFit:subject.mode==="scene"?"cover":"contain",
              objectPosition:subject.mode==="scene"&&subject.focalPoint
                ? (subject.focalPoint.x*100)+"% "+(subject.focalPoint.y*100)+"%" : "center"}}/>
        : null;
  return <div data-km-subject-stage={orientation} data-km-frame={frame}
    data-km-phase={sample.phase} className={className}
    style={{position:"relative",width:"100%",aspectRatio:layout.width+" / "+layout.height,
      overflow:"hidden",background,color:"#edf3f6",fontFamily:"system-ui, sans-serif",...style}}>
    {title&&<div data-km-shot-title="" style={{...placed(layout.title,layout),display:"flex",
      alignItems:"center",fontSize:orientation==="portrait"?"clamp(22px,3.5vw,48px)":"clamp(18px,2.7vw,48px)",
      fontWeight:750,letterSpacing:"-.025em"}}>{title}</div>}
    {subject&&layout.subject&&<div data-km-shot-subject={subject.mode}
      style={{...placed(layout.subject,layout),overflow:"hidden",display:"grid",placeItems:"center",
        background:background,borderRadius:"1.6%"}}>{subjectView}</div>}
    <div data-km-shot-explanation="" style={{...placed(layout.explanation,layout),
      overflow:"hidden",color:"inherit"}}>{renderedExplanation}</div>
    {caption&&sample.showCaption&&<div data-km-shot-caption="" style={{
      ...placed(layout.caption,layout),display:"flex",alignItems:"center",
      fontSize:orientation==="portrait"?"clamp(23px,3.1vw,39px)":"clamp(18px,2vw,32px)",
      lineHeight:1.2,fontWeight:600,color:accent}}>{caption}</div>}
  </div>;
}
