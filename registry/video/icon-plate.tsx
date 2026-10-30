import type { CSSProperties } from "react";

export interface IconPlateProps {
  name: string;
  claim: string;
  /** Only provide a mark with confirmed rights. Missing mark renders original ledger geometry. */
  markSrc?: string;
  markAlt?: string;
  width?: number;
  height?: number;
  /** Logical geometry inside the subject box, independent of CSS scale. */
  canvasWidth?: number;
  canvasHeight?: number;
  style?: CSSProperties;
}
function wrapName(name: string): string[] {
  if (name.length <= 23) return [name];
  const words=name.split(/\s+/), lines=[""];
  for (const word of words) {
    const last=lines.length-1;
    if (lines[last] && (lines[last]+" "+word).length > 22 && lines.length < 2) lines.push(word);
    else lines[last] += (lines[last] ? " " : "")+word;
  }
  return lines;
}
export function IconPlate({name,claim,markSrc,markAlt,width=980,height=640,canvasWidth=980,canvasHeight=640,style}:IconPlateProps) {
  if (!name.trim() || name.length>40 || !claim.trim()) throw new Error("IconPlate requires a name (1–40 characters) and a nonempty sourced claim.");
  if (![width,height].every(n=>Number.isFinite(n)&&n>0)) throw new Error("IconPlate dimensions must be positive.");
  if (![canvasWidth,canvasHeight].every(n=>Number.isFinite(n)&&n>0)) throw new Error("IconPlate canvas dimensions must be positive.");
  const center=canvasWidth/2, markY=84, markSize=280;
  const lines=wrapName(name);
  return <svg data-km-icon-plate="" data-mark={markSrc ? "provided" : "generic"}
    role="img" aria-label={name+": "+claim} viewBox={"0 0 "+canvasWidth+" "+canvasHeight} width={width} height={height}
    preserveAspectRatio="xMidYMid meet" style={{display:"block",width:"100%",height:"100%",...style}}>
    {markSrc ? <image href={markSrc} x={center-140} y={markY} width={markSize} height={markSize}
      aria-label={markAlt??name} preserveAspectRatio="xMidYMid meet"/> :
      <g data-km-generic-ledger="" transform={"translate("+(center-140)+" 84)"} fill="none">
        <rect x="16" y="8" width="248" height="264" rx="24" fill="#224e62" stroke="#9fe0d1" strokeWidth="9"/>
        <path d="M68 8V272" stroke="#a7e3d8" strokeWidth="9"/>
        <path d="M106 70H223M106 120H223M106 170H223M106 220H223"
          stroke="#e7f5ed" strokeWidth="13" strokeLinecap="round"/>
        <path d="M149 63V228" stroke="#e7f5ed" strokeOpacity=".3" strokeWidth="5"/>
      </g>}
    {lines.map((line,i)=><text key={i} x={center} y={411+i*43} textAnchor="middle"
      fontSize="35" fontWeight="700" fill="#f2f5f7" fontFamily="system-ui, sans-serif">{line}</text>)}
    <text x={center} y={lines.length===1?503:532} textAnchor="middle" fontSize="28"
      fill="#bed2d8" fontFamily="system-ui, sans-serif" textLength={claim.length>48?870:undefined}
      lengthAdjust={claim.length>48?"spacing":undefined}>{claim}</text>
  </svg>;
}
