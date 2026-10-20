import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BusinessObject2D } from "../../registry/domains/business-object-2d";
import { BUSINESS_OBJECTS } from "../../registry/domains/business-object-model";
import type { BusinessObjectKind } from "../../registry/domains/business-object-model";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import { FINANCE_OBJECTS } from "../../registry/domains/finance-object-model";
import type { FinanceObjectKind } from "../../registry/domains/finance-object-model";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import { TECHNOLOGY_OBJECTS } from "../../registry/domains/technology-object-model";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";
import { listIllustrationParts, usePrefersReducedMotion } from "../../registry/domains/illustration-2d";
import type { PartPoses, PartRef } from "../../registry/domains/illustration-2d";

/* Storybook-only demonstrations of the named-part layer. The motions below are
 * written inline on purpose: they show that any motion is a pure function of
 * `frame` → `parts`, not a built-in preset library. */

const FONT="Geist, Inter, system-ui, sans-serif";
const MIDNIGHT="#0A1A26";
const loop=(frame:number,period:number)=>(frame%period)/period;
const wave=(frame:number,period:number,phase=0)=>Math.sin((frame/period+phase)*Math.PI*2);
const ease=(t:number)=>{const x=Math.min(1,Math.max(0,t));return x*x*(3-2*x);};
/** 0 → 1 → 0 over `period` frames, with holds at both ends. */
const pingPong=(frame:number,period:number)=>{const t=loop(frame,period);return ease(t<.5?t*2.4-.1:(1-t)*2.4-.1);};

type Pack="finance"|"business"|"technology";
interface Motion { pack:Pack; kind:string; label:string; poses:(frame:number)=>PartPoses }

const MOTIONS:readonly Motion[]=[
  {pack:"technology",kind:"settings",label:"gear · meshed spin",
    poses:f=>({name,index}:PartRef)=>name==="gear"?{rotate:index===0?f*4:-f*4*8/10+9}:undefined},
  {pack:"technology",kind:"laptop",label:"lid · open, rows · type on",
    poses:f=>({name,index}:PartRef)=>{
      const open=pingPong(f,150);
      if(name==="lid")return {scale:[1,.04+.96*open]};
      if(name==="rows")return {opacity:ease(open*7-index-.5)};
      return undefined;}},
  {pack:"technology",kind:"padlock",label:"shackle · unlock",
    poses:f=>{const t=pingPong(f,120);return {shackle:{translate:[0,-10*t],rotate:-34*ease(t*1.6-.6)},keyhole:{rotate:90*t}};}},
  {pack:"finance",kind:"vault",label:"wheel · turn",
    poses:f=>({wheel:{rotate:f*3}})},
  {pack:"business",kind:"delivery-truck",label:"wheel · roll, truck · bob",
    poses:f=>({name}:PartRef)=>name==="wheel"?{rotate:f*9}:name==="truck"?{translate:[0,wave(f,14)*1.2]}
      :name==="trail"?{opacity:.35+.65*(.5+.5*wave(f,10)),translate:[-4*loop(f,10),0]}:undefined},
  {pack:"business",kind:"deadline",label:"clock hands, bell · ring",
    poses:f=>({name,index}:PartRef)=>name==="hand"?{rotate:index===0?f*6:f/2}
      :name==="bell"?{rotate:loop(f,60)<.2?wave(f,4)*14*(index?-1:1):0}:undefined},
  {pack:"business",kind:"milestone",label:"flag · wave",
    poses:f=>({name,index}:PartRef)=>name==="flag"?{scale:[1+.12*wave(f,24,index*.3),1],rotate:3*wave(f,24,index*.3)}:undefined},
  {pack:"technology",kind:"server-rack",label:"light · blink",
    poses:f=>({name,index}:PartRef)=>name==="light"?{opacity:(Math.floor(f/6)+index*3)%5===0?.2:1}:undefined},
  {pack:"finance",kind:"coin",label:"coin · flip, shadow · squash",
    poses:f=>{const s=Math.cos(f*Math.PI/45);return {coin:{scale:[Math.max(.04,Math.abs(s)),1]},sparkle:{opacity:.5+.5*wave(f,30),scale:.8+.2*wave(f,30)},shadow:{scale:[.75+.25*Math.abs(s),1]}};}},
  {pack:"finance",kind:"risk",label:"needle · sweep",
    poses:f=>({needle:{rotate:-82+80*pingPong(f,140)},badge:{scale:1+.08*Math.max(0,wave(f,20))}})},
  {pack:"technology",kind:"storage-disk",label:"platter · spin, arm · seek",
    poses:f=>({platter:{rotate:f*12},arm:{rotate:-6+10*pingPong(f,90)}})},
  {pack:"technology",kind:"router",label:"wave · broadcast",
    poses:f=>({name,index}:PartRef)=>name==="wave"?{opacity:ease(1-Math.abs(loop(f,40)*3-1-index))}
      :name==="light"?{opacity:(Math.floor(f/8)+index)%3===0?.25:1}:undefined},
  {pack:"technology",kind:"bug",label:"leg · scuttle, antenna · twitch",
    poses:f=>({name,index}:PartRef)=>name==="leg"?{rotate:10*wave(f,12,(index%3)*.33+(index>2?.5:0))*(index>2?-1:1)}
      :name==="antenna"?{rotate:8*wave(f,18,index*.5)}:undefined},
  {pack:"finance",kind:"piggy-bank",label:"coin · drop, tail · wag",
    poses:f=>{const t=loop(f,60);return {coin:{translate:[0,26*ease(t*1.6)],opacity:t>.62?0:1},tail:{rotate:14*wave(f,16)},
      body:{scale:t>.62&&t<.72?[1.03,.97]:1}};}},
  {pack:"technology",kind:"ai-model",label:"node · forward pass",
    poses:f=>({name,index}:PartRef)=>{
      if(name!=="node")return undefined;
      const layer=index<3?0:index<7?1:2,hit=Math.abs(loop(f,60)*3-layer-.5);
      return {scale:1+.22*Math.max(0,1-hit*2.2)};}},
  {pack:"technology",kind:"git-branch",label:"commit · pop in order",
    poses:f=>({name,index}:PartRef)=>name==="commit"?{scale:ease(loop(f,120)*7-index)}:undefined},
  {pack:"finance",kind:"money-printing-press",label:"roller · run, note · feed",
    poses:f=>({name}:PartRef)=>name==="roller"?{rotate:f*10}:name==="note"?{translate:[16*loop(f,30)-8,0]}
      :name==="light"?{opacity:loop(f,20)<.5?1:.35}:undefined},
  {pack:"business",kind:"factory",label:"smoke · rise, gear · spin",
    poses:f=>({name,index}:PartRef)=>{
      if(name==="gear")return {rotate:f*5};
      if(name!=="smoke")return undefined;
      const t=loop(f+index*20,40);
      return {translate:[6*t,-18*t],scale:.7+.6*t,opacity:1-t};}},
  {pack:"business",kind:"target",label:"dart · fly in",
    poses:f=>{const t=ease(loop(f,70)*1.8);return {dart:{translate:[82*(1-t),-54*(1-t)],opacity:t>0?1:0},target:{scale:t>.98&&loop(f,70)<.62?1.04:1}};}},
  {pack:"business",kind:"warehouse",label:"door · roll up",
    poses:f=>({door:{scale:[1,1-.85*pingPong(f,140)]}})},
];

function Illustration({pack,kind,...rest}:{pack:Pack;kind:string;parts?:PartPoses;width:number;height:number;showTitle?:boolean}){
  const spec={id:`parts-${kind}`,kind};
  if(pack==="finance")return <FinanceObject2D spec={spec as {id:string;kind:FinanceObjectKind}} {...rest}/>;
  if(pack==="business")return <BusinessObject2D spec={spec as {id:string;kind:BusinessObjectKind}} {...rest}/>;
  return <TechnologyObject2D spec={spec as {id:string;kind:TechnologyObjectKind}} {...rest}/>;
}

function Page({title,lead,children}:{title:string;lead:ReactNode;children:ReactNode}){
  return <main style={{minHeight:"100vh",background:"#0B141B",color:"#E6F0F5",padding:"24px 16px",fontFamily:FONT}}>
    <header style={{maxWidth:1280,margin:"0 auto 18px"}}>
      <h1 style={{fontSize:24,margin:"0 0 6px"}}>{title}</h1>
      <p style={{color:"#A9BFCC",margin:0,fontSize:15,maxWidth:820,lineHeight:1.5}}>{lead}</p>
    </header>
    <div style={{maxWidth:1280,margin:"0 auto"}}>{children}</div>
  </main>;
}
const tileStyle={margin:0,background:MIDNIGHT,borderRadius:14,padding:"8px 8px 10px",display:"grid",justifyItems:"center",gap:4,
  border:"1px solid #183243"} as const;
const captionStyle={fontSize:13,color:"#8EA9B8",fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace",textAlign:"center"} as const;

/** Frame clock: scrubbable, plays with rAF at 30 fps, never autoplays under reduced motion. */
function useFrameClock(initial:number){
  const reduced=usePrefersReducedMotion();
  const [frame,setFrame]=useState(initial);
  const [playing,setPlaying]=useState(false);
  useEffect(()=>{
    if(!playing||reduced)return;
    let raf=0,last=performance.now(),acc=0;
    const tick=(now:number)=>{
      acc+=now-last;last=now;
      const steps=Math.floor(acc/(1000/30));
      if(steps>0){acc-=steps*(1000/30);setFrame(value=>value+steps);}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing,reduced]);
  return {frame,setFrame,playing:playing&&!reduced,setPlaying,reduced};
}

function FrameDriven(){
  const clock=useFrameClock(42);
  return <Page title="Animated parts · frame-driven"
    lead={<>Every motion here is <code>parts={"{"}poses(frame){"}"}</code> on an unmodified object: named parts are posed as SVG
      transforms about their pivots, so the result is deterministic per frame and exports as a still. Scrub or play.</>}>
    <div style={{display:"flex",gap:16,alignItems:"center",margin:"0 0 16px",flexWrap:"wrap"}}>
      <button type="button" onClick={()=>clock.setPlaying(!clock.playing)} disabled={clock.reduced}
        style={{font:"600 14px/1 "+FONT,padding:"10px 16px",borderRadius:10,border:"1px solid #2D5466",
          background:clock.playing?"#173444":"#4CCDBD",color:clock.playing?"#E6F0F5":"#04211D",cursor:"pointer"}}>
        {clock.playing?"Pause":"Play"}</button>
      <label style={{display:"flex",gap:10,alignItems:"center",fontSize:14}}>
        Frame <input type="range" min={0} max={600} value={clock.frame%601} aria-label="Animation frame"
          onChange={event=>clock.setFrame(Number(event.target.value))} style={{width:280}}/>
        <span style={{fontVariantNumeric:"tabular-nums",width:36}}>{clock.frame%601}</span>
      </label>
      {clock.reduced?<span style={{color:"#F1B75E",fontSize:13}}>Reduced motion is on: autoplay disabled, scrubbing still works.</span>:null}
    </div>
    <div data-km-parts-grid="" style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))"}}>
      {MOTIONS.map(motion=><figure key={motion.kind} style={tileStyle}>
        <Illustration pack={motion.pack} kind={motion.kind} parts={motion.poses(clock.frame)} width={192} height={160}/>
        <figcaption style={captionStyle}>{motion.label}</figcaption>
      </figure>)}
    </div>
  </Page>;
}

const KEYFRAMES=`
@keyframes km-spin { to { transform: rotate(360deg); } }
@keyframes km-wag { 0%,100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }
@keyframes km-blink { 0%,60% { opacity: 1; } 61%,100% { opacity: .2; } }
@keyframes km-lift { 0%,30% { transform: translateY(0); } 50%,80% { transform: translateY(-10px) rotate(-28deg); } 100% { transform: translateY(0); } }
@keyframes km-flip { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(.05); } }
.km-spin { animation: km-spin 3s linear infinite; }
.km-spin-fast { animation: km-spin 1.2s linear infinite; }
.km-wag { animation: km-wag 1.4s ease-in-out infinite; }
.km-blink { animation: km-blink 1.1s steps(1) infinite; }
.km-lift { animation: km-lift 2.6s ease-in-out infinite; }
.km-flip { animation: km-flip 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .km-spin,.km-spin-fast,.km-wag,.km-blink,.km-lift,.km-flip { animation: none; } }
`;
const CSS_DEMOS:readonly {pack:Pack;kind:string;label:string;parts:PartPoses}[]=[
  {pack:"technology",kind:"settings",label:".km-spin on gear",parts:{gear:{className:"km-spin"}}},
  {pack:"finance",kind:"vault",label:".km-spin on wheel",parts:{wheel:{className:"km-spin"}}},
  {pack:"technology",kind:"storage-disk",label:".km-spin-fast on platter",parts:{platter:{className:"km-spin-fast"}}},
  {pack:"business",kind:"delivery-truck",label:".km-spin-fast on wheel",parts:{wheel:{className:"km-spin-fast"}}},
  {pack:"finance",kind:"piggy-bank",label:".km-wag on tail",parts:{tail:{className:"km-wag"}}},
  {pack:"technology",kind:"server-rack",label:".km-blink on light",parts:{light:{className:"km-blink"}}},
  {pack:"technology",kind:"padlock",label:".km-lift on shackle",parts:{shackle:{className:"km-lift"}}},
  {pack:"finance",kind:"coin",label:".km-flip on coin",parts:{coin:{className:"km-flip"}}},
];
function CssKeyframes(){
  return <Page title="Animated parts · CSS keyframes"
    lead={<>The same parts driven only by <code>className</code> and <code>@keyframes</code>. Each part group already carries its
      pivot as <code>transform-origin</code> (with <code>transform-box: view-box</code>), so rotations turn about the axle,
      not the corner. Animations stop under <code>prefers-reduced-motion</code>.</>}>
    <style>{KEYFRAMES}</style>
    <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))"}}>
      {CSS_DEMOS.map(demo=><figure key={demo.kind} style={tileStyle}>
        <Illustration pack={demo.pack} kind={demo.kind} parts={demo.parts} width={192} height={160}/>
        <figcaption style={captionStyle}>{demo.label}</figcaption>
      </figure>)}
    </div>
  </Page>;
}

interface InspectorArgs { pack:Pack; finance:FinanceObjectKind; business:BusinessObjectKind; technology:TechnologyObjectKind }
interface PlottedPart { key:string; label:string; x:number; y:number }
function Inspector({pack,finance,business,technology}:InspectorArgs){
  const kind=pack==="finance"?finance:pack==="business"?business:technology;
  const host=useRef<HTMLDivElement>(null);
  const [plotted,setPlotted]=useState<PlottedPart[]>([]);
  const [focus,setFocus]=useState<string|null>(null);
  useLayoutEffect(()=>{
    const svg=host.current?.querySelector("svg");
    if(!svg)return;
    const root=svg.getScreenCTM();
    if(!root)return;
    const toRoot=root.inverse();
    // Pivots are in each part's local coordinates; map them through the part's
    // screen CTM so nested (scaled/rotated) parts land on the right spot.
    setPlotted(listIllustrationParts(svg).map((part,i)=>{
      const ctm=part.element.getScreenCTM();
      const point=new DOMPoint(part.pivot[0],part.pivot[1]);
      const mapped=ctm?point.matrixTransform(toRoot.multiply(ctm)):point;
      return {key:`${i}`,label:`${part.name}${part.index?`#${part.index}`:""}`,x:mapped.x,y:mapped.y};
    }));
  },[kind,pack]);
  return <Page title="Animated parts · inspector"
    lead="Every named part of the selected object, with its pivot plotted in artboard coordinates. Hover a row to locate it.">
    <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div ref={host} style={{position:"relative",background:MIDNIGHT,borderRadius:16,padding:16,width:480,maxWidth:"100%"}}>
        <Illustration pack={pack} kind={kind} width={480} height={400}/>
        <svg viewBox="0 0 240 200" width={480} height={400} aria-hidden="true"
          style={{position:"absolute",left:16,top:16,overflow:"visible",pointerEvents:"none",maxWidth:"calc(100% - 32px)",height:"auto"}}>
          {plotted.map(part=>{const on=focus===null||focus===part.key;
            return <g key={part.key} opacity={on?1:.18}>
              <circle cx={part.x} cy={part.y} r={on&&focus?4:2.6} fill="none" stroke="#F1B75E" strokeWidth={1.2}/>
              <path d={`M ${part.x-5} ${part.y} H ${part.x+5} M ${part.x} ${part.y-5} V ${part.y+5}`} stroke="#F1B75E" strokeWidth={.8}/>
              {on&&focus?<text x={part.x+6} y={part.y-6} fontSize={8} fill="#F1B75E" fontFamily={FONT}>{part.label}</text>:null}
            </g>;})}
        </svg>
      </div>
      <table style={{borderCollapse:"collapse",fontSize:13,minWidth:260}}>
        <caption style={{textAlign:"left",fontSize:14,color:"#A9BFCC",padding:"0 0 8px"}}>{plotted.length} named parts · {kind}</caption>
        <thead><tr style={{color:"#8EA9B8",textAlign:"left"}}><th style={{padding:"4px 12px 4px 0"}}>part</th><th style={{padding:"4px 0"}}>pivot (x, y)</th></tr></thead>
        <tbody>{plotted.map(part=><tr key={part.key} onMouseEnter={()=>setFocus(part.key)} onMouseLeave={()=>setFocus(null)}
          onFocus={()=>setFocus(part.key)} onBlur={()=>setFocus(null)} tabIndex={0}
          style={{borderTop:"1px solid #183243",background:focus===part.key?"#173444":undefined,cursor:"default"}}>
          <td style={{padding:"5px 12px 5px 0",fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{part.label}</td>
          <td style={{padding:"5px 0",fontVariantNumeric:"tabular-nums",color:"#A9BFCC"}}>{part.x.toFixed(1)}, {part.y.toFixed(1)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </Page>;
}

const meta={title:"Domains/Animated Parts",component:Inspector,parameters:{layout:"fullscreen"},
  argTypes:{
    pack:{control:"inline-radio",options:["finance","business","technology"]},
    finance:{control:"select",options:FINANCE_OBJECTS.map(o=>o.kind),if:{arg:"pack",eq:"finance"}},
    business:{control:"select",options:BUSINESS_OBJECTS.map(o=>o.kind),if:{arg:"pack",eq:"business"}},
    technology:{control:"select",options:TECHNOLOGY_OBJECTS.map(o=>o.kind),if:{arg:"pack",eq:"technology"}},
  },
  args:{pack:"technology",finance:"vault",business:"deadline",technology:"laptop"},
} satisfies Meta<typeof Inspector>;
export default meta;
type Story=StoryObj<typeof meta>;
export const FrameDrivenMotion:Story={render:()=><FrameDriven/>};
export const CssKeyframeMotion:Story={render:()=><CssKeyframes/>};
export const PartInspector:Story={};
