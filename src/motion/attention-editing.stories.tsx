import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileCameraDive, evaluateCameraDive, compileSearchEvidence, evaluateSearchEvidence, compileImpactAccent, evaluateImpactAccent } from "../../registry/motion/attention-editing-treatments";
import { compileExactValueCascade, evaluateCaptionImpact, compileSpeedCurve, inspectLoopContinuity } from "../../registry/motion/attention-editing-compositions";
import { compileHookVariant, compileBeatMontage } from "../../registry/motion/attention-editing-recipes";

type Topic = "energy" | "computing" | "logistics";
type Treatment = "hook" | "impact-text" | "beat-montage" | "speed-ramp" | "evidence" | "split" | "value-cascade" | "camera-dive" | "match" | "search-evidence" | "impact-accent" | "loop-bridge" | "contradiction";
const topicData: Record<Topic,{name:string; title:string; metric:string; query:string; evidence:string; subjects:string[]}> = {
  energy: {name:"Energy",title:"THE HIDDEN COST",metric:"$1,280",query:"What is included in this energy bill?",evidence:"Line item: maintenance",subjects:["house","invoice"]},
  computing: {name:"Computing",title:"WHERE TIME GOES",metric:"180 ms",query:"Why is this request slow?",evidence:"Trace: network wait",subjects:["server","trace"]},
  logistics: {name:"Logistics",title:"A FASTER ROUTE?",metric:"42 stops",query:"How do routes change with grouping?",evidence:"Route record: distance",subjects:["vehicle","route"]},
};
const treatments: Treatment[]=["hook","impact-text","beat-montage","speed-ramp","evidence","split","value-cascade","camera-dive","match","search-evidence","impact-accent","loop-bridge","contradiction"];
function AttentionEditingShowcase(){
  const [topic,setTopic]=useState<Topic>("energy");
  const [treatment,setTreatment]=useState<Treatment>("camera-dive");
  const [frame,setFrame]=useState(45);
  const [portrait,setPortrait]=useState(true);
  const [reducedMotion,setReducedMotion]=useState(false);
  const d=topicData[topic], width=portrait?1080:1920,height=portrait?1920:1080, fps={num:30,den:1};
  const camera=useMemo(()=>compileCameraDive({
    id:"dive",fps,durationFrames:120,subjectId:"detail",stage:{width,height},
    contextBounds:{x:0,y:0,width,height},
    targetBounds:{x:width*.38,y:height*.46,width:width*.23,height:height*.18},
    arrivalHoldFrames:36,maxZoom:8,
  }),[width,height]);
  const search=useMemo(()=>compileSearchEvidence({id:"source",fps,durationFrames:120,
    query:d.query,claimId:"question",result:{id:"source",title:"Illustrative source",summary:d.evidence,illustrative:true},typingFrames:60}),[d]);
  const accent=useMemo(()=>compileImpactAccent({id:"hit",fps,durationFrames:120,subjectId:"hero",eventId:"explanation",purpose:"reveal",kind:"punch-scale",amplitude:.6}),[]);
  const total=useMemo(()=>compileExactValueCascade({id:"total",fps,durationFrames:120,unit:"sample-units",basis:"one illustrative scenario",
    claimedTotalMinor:"1280",terms:[{id:"base",label:"Base",valueMinor:"700",unit:"sample-units",factRef:"demo"},
      {id:"part",label:"Service",valueMinor:"380",unit:"sample-units",factRef:"demo"},
      {id:"fee",label:"Additional",valueMinor:"200",unit:"sample-units",factRef:"demo"}]}),[]);
  const hook=useMemo(()=>compileHookVariant({id:"hook",fps,durationFrames:120,strategy:"unexpected-reveal",claimId:"hidden",payoffId:"payoff",subjectIds:d.subjects,surprise:"Hidden cost"}),[d]);
  const montage=useMemo(()=>compileBeatMontage({id:"montage",fps,durationFrames:120,subjectIds:d.subjects,beats:[{id:"a",frame:24},{id:"b",frame:54},{id:"c",frame:84}]}),[d]);
  const ramp=useMemo(()=>compileSpeedCurve({id:"speed",outputFrames:120,sourceIn:0,sourceOut:240,
    keys:[{at:0,speed:2.5},{at:.4,speed:.35},{at:.7,speed:.35},{at:1,speed:2}]}),[]);
  const loop=useMemo(()=>inspectLoopContinuity({start:{camera:{x:0,y:0,scale:1},subjects:[{id:"hero",x:0,y:0,scale:1,rotation:0,opacity:1}],narrativePayoffShown:true},
    second:{camera:{x:0,y:0,scale:1},subjects:[{id:"hero",x:1,y:0,scale:1,rotation:0,opacity:1}],narrativePayoffShown:true},
    penultimate:{camera:{x:0,y:0,scale:1},subjects:[{id:"hero",x:-1,y:0,scale:1,rotation:0,opacity:1}],narrativePayoffShown:true},
    end:{camera:{x:0,y:0,scale:1},subjects:[{id:"hero",x:0,y:0,scale:1,rotation:0,opacity:1}],narrativePayoffShown:true}}),[]);
  const f=Math.max(0,Math.min(119,frame));
  const a=evaluateImpactAccent(accent,f,reducedMotion);
  const c=evaluateCameraDive(camera,f,reducedMotion);
  const s=evaluateSearchEvidence(search,f,reducedMotion);
  const type=evaluateCaptionImpact({startFrame:0,endFrame:120,entryFrames:22,style:"overshoot",peakScale:1.17},f,reducedMotion);
  const x=width/2,y=height/2,large=portrait?75:85;
  const captionY=height*.79;
  const font=portrait?64:78;
  const background="#101B2C",ink="#F4F8FF",muted="#91A6C2",accentColor="#E7BE68",cyan="#6AD5D1";
  const commonSubject=()=>{
    const house = topic==="energy";
    if(house) return <g transform={"translate("+(x-180)+" "+(y-190)+")"}>
      <path d="M0 130 L180 5 L360 130" fill="#35577A" stroke={cyan} strokeWidth="10" strokeLinejoin="round"/><rect x="40" y="130" width="280" height="230" rx="8" fill="#274361"/>
      <rect x="140" y="230" width="80" height="130" fill="#1A293F"/><rect x="65" y="185" width="65" height="65" fill="#8FC9D4"/>
      <rect x="245" y="185" width="55" height="65" fill="#8FC9D4"/></g>;
    if(topic==="computing") return <g transform={"translate("+(x-175)+" "+(y-200)+")"}>
      <rect x="0" y="0" width="350" height="395" rx="30" fill="#243A55" stroke={cyan} strokeWidth="9"/>
      {[0,1,2,3].map(i=><g key={i}><rect x="33" y={35+i*88} width="280" height="66" rx="10" fill="#13243A"/>
      <circle cx="278" cy={68+i*88} r="13" fill={i===2?accentColor:cyan}/></g>)}</g>;
    return <g transform={"translate("+(x-200)+" "+(y-160)+")"}>
      <path d="M0 260H400" stroke="#6E8CAC" strokeWidth="14"/><rect x="40" y="65" width="275" height="200" rx="12" fill="#35577A"/>
      <path d="M310 150H365L405 210V263H310Z" fill="#456C88"/><circle cx="115" cy="267" r="34" fill="#13243A" stroke={cyan} strokeWidth="11"/>
      <circle cx="345" cy="267" r="34" fill="#13243A" stroke={cyan} strokeWidth="11"/></g>;
  };
  const focus=()=>{
    if(treatment==="search-evidence")return <g>
      <rect x={width*.09} y={height*.3} width={width*.82} height="116" rx="26" fill="#263951" stroke={cyan} strokeWidth="4"/>
      <text x={width*.13} y={height*.3+74} fill={ink} fontSize={portrait?32:42}>{s.visibleQuery.slice(0,portrait?28:52)}{s.cursorVisible?"|":""}</text>
      {s.showResult&&<g><rect x={width*.09} y={height*.41} width={width*.82} height="240" rx="24" fill="#20324B"/>
      <text x={width*.13} y={height*.41+85} fill={cyan} fontSize={font*.63}>ILLUSTRATIVE RESULT</text>
      <text x={width*.13} y={height*.41+160} fill={ink} fontSize={font*.53}>{d.evidence}</text></g>}
      </g>;
    if(treatment==="split")return <g>
      <path d={"M"+(x)+" "+height*.26+"V"+height*.7} stroke="#51617C" strokeWidth="8"/>
      <rect x={width*.12} y={height*.41} width={width*.28} height={height*.16} rx="20" fill="#335A75"/>
      <rect x={width*.6} y={height*.36} width={width*.28} height={height*.21} rx="20" fill="#367E7B"/>
      <text x={width*.16} y={height*.65} fill={ink} fontSize={font*.55}>OPTION A</text>
      <text x={width*.64} y={height*.65} fill={ink} fontSize={font*.55}>OPTION B</text></g>;
    if(treatment==="value-cascade")return <g>
      {total.prefixes.map((p,i)=><g key={p.id} opacity={f>=i*26+10?1:.18}>
        <rect x={width*.12} y={height*.33+i*100} width={width*.65} height="70" rx="12" fill={i===2?"#357E7E":"#29445D"}/>
        <text x={width*.16} y={height*.33+i*100+49} fill={ink} fontSize={font*.58}>{p.id.toUpperCase()} · {p.totalMinor}</text>
      </g>)}</g>;
    if(treatment==="beat-montage"){
      const b=montage.beats.find(v=>f>=v.startFrame&&f<v.endFrame);
      return <g>{commonSubject()}<text x={x} y={height*.69} textAnchor="middle" fill={cyan} fontSize={font}>SHOT {montage.beats.indexOf(b??montage.beats[0])+1}</text></g>;
    }
    if(treatment==="speed-ramp") return <g>{commonSubject()}<text x={x} y={height*.7} textAnchor="middle" fill={cyan} fontSize={font*.64}>
      SOURCE FRAME {Math.round(ramp.remap[f]?.sourceFrame??0)}</text></g>;
    if(treatment==="camera-dive")return <g clipPath="url(#attentionView)"><g transform={"translate("+c.pose.x+" "+c.pose.y+") scale("+c.pose.scale+")"}>
      <rect width={width} height={height} fill="#152942"/><path d={"M0 "+y+"H"+width} stroke="#344D68" strokeWidth="10"/>
      {commonSubject()}<rect x={width*.38} y={height*.46} width={width*.23} height={height*.18} rx="22" fill="none" stroke={accentColor} strokeWidth="18"/>
      </g></g>;
    if(treatment==="evidence")return <g>{commonSubject()}<rect x={width*.21} y={height*.32} width={width*.58} height={height*.39} fill="none" stroke={cyan} strokeWidth={f>35?9:0} rx="15"/></g>;
    if(treatment==="impact-accent")return <g transform={"translate("+a.offset.x+" "+a.offset.y+") translate("+x+" "+y+") scale("+a.scale+") translate("+(-x)+" "+(-y)+")"}>{commonSubject()}</g>;
    if(treatment==="match")return <g opacity={f<58?1:Math.max(0,(75-f)/17)}>{commonSubject()}</g>;
    if(treatment==="loop-bridge")return <g transform={"translate("+(Math.sin(f/119*Math.PI*2)*18)+" 0)"}>{commonSubject()}</g>;
    if(treatment==="contradiction")return <g>{commonSubject()}{f>48&&<text x={x} y={height*.67} textAnchor="middle" fontSize={font} fill={accentColor}>BUT WHY?</text>}</g>;
    return <g>{commonSubject()}</g>;
  };
  const plan = treatment==="hook"?hook:treatment==="beat-montage"?montage:treatment==="camera-dive"?camera.plan:treatment==="search-evidence"?search.plan:treatment==="impact-accent"?accent.plan:treatment==="value-cascade"?total.plan:undefined;
  const fieldStyle={background:"#1B2D44",color:"#EAF3FF",border:"1px solid #42607B",borderRadius:8,padding:"9px 12px",fontSize:14};
  return <div style={{fontFamily:"system-ui,sans-serif",background:"#101722",color:"#F3F7FF",minHeight:"100vh",padding:24}}>
    <h2 style={{fontSize:25,margin:"0 0 6px"}}>Attention Editing Recipes</h2>
    <p style={{color:"#ADBCD0",margin:"0 0 20px"}}>Scrub any frame. Source claims and amounts are illustrative test fixtures.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:20}}>
      <label>Topic <select aria-label="Topic" value={topic} onChange={e=>setTopic(e.target.value as Topic)} style={fieldStyle}>{Object.keys(topicData).map(t=><option key={t} value={t}>{topicData[t as Topic].name}</option>)}</select></label>
      <label>Recipe <select aria-label="Recipe" value={treatment} onChange={e=>setTreatment(e.target.value as Treatment)} style={fieldStyle}>{treatments.map(t=><option key={t}>{t}</option>)}</select></label>
      <label>Aspect <select aria-label="Aspect" value={portrait?"portrait":"landscape"} onChange={e=>setPortrait(e.target.value==="portrait")} style={fieldStyle}><option>portrait</option><option>landscape</option></select></label>
      <label><input type="checkbox" checked={reducedMotion} onChange={e=>setReducedMotion(e.target.checked)}/> Reduced motion</label>
    </div>
    <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div style={{maxWidth:portrait?360:700,flex:"1 1 320px"}}>
        <svg role="img" aria-label={treatment+" preview for "+d.name} viewBox={"0 0 "+width+" "+height} style={{width:"100%",borderRadius:20,overflow:"hidden",display:"block"}}>
          <defs><clipPath id="attentionView"><rect width={width} height={height}/></clipPath></defs>
          <rect width={width} height={height} fill={background}/>
          <circle cx={x} cy={y} r={large*4} fill="#203753" opacity=".38"/>
          <text x={width*.1} y={height*.15} fill={muted} fontSize={font*.45} fontWeight="700" letterSpacing="3">VISUAL EXPLAINER · {d.name.toUpperCase()}</text>
          {focus()}
          <g transform={"translate("+x+" "+captionY+") scale("+(treatment==="impact-text"?type.scale:1)+") translate("+(-x)+" "+(-captionY)+")"}>
            <text x={x} y={captionY} fill={ink} fontSize={font} textAnchor="middle" fontWeight="800">{d.title}</text>
          </g>
          <text x={x} y={captionY+100} fill={accentColor} fontSize={font*.85} textAnchor="middle" fontWeight="800">{d.metric}</text>
          <text x={x} y={height*.92} fill={muted} fontSize={font*.35} textAnchor="middle">DEMONSTRATION · NOT SOURCED FINANCIAL DATA</text>
        </svg>
        <div style={{display:"flex",gap:12,alignItems:"center",marginTop:16}}>
          <button style={fieldStyle} onClick={()=>setFrame(0)}>Start</button>
          <input aria-label="Frame" type="range" min={0} max={119} value={frame} onChange={e=>setFrame(Number(e.target.value))} style={{flex:1}}/>
          <span style={{fontVariantNumeric:"tabular-nums",minWidth:60}}>{f}/119</span>
        </div>
      </div>
      <div style={{flex:"1 1 230px",maxWidth:490,fontSize:14}}>
        <h3 style={{marginTop:0}}>Frame-addressable recipe</h3>
        <p>Current treatment: <b>{treatment}</b>. Deterministic seek, independent portrait/landscape dimensions and reduced-motion evaluation.</p>
        <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",borderRadius:12,padding:15,background:"#1A2839",color:"#BAD4E6"}}>
          {JSON.stringify({frame:f,beat:plan?.beats.find(b=>f>=b.startFrame&&f<b.endFrame)?.id,diagnostics:plan?.diagnostics,
            camera:treatment==="camera-dive"?c.pose:undefined,
            footageSourceFrame:treatment==="speed-ramp"?ramp.remap[f]?.sourceFrame:undefined,
            loopGrade:treatment==="loop-bridge"?loop.grade:undefined,
            searchResult:treatment==="search-evidence"?s.showResult:undefined},null,2)}
        </pre>
        <p style={{color:"#9FAFC3"}}>The visual subjects in this story are deliberately simplified fixtures. Real footage, sourced evidence, captions, camera rigs and 3D hero assets remain owned by their existing Kumiki adapters.</p>
      </div>
    </div>
  </div>;
}
const meta={title:"Motion/Attention Editing Recipes",component:AttentionEditingShowcase,parameters:{layout:"fullscreen"}} satisfies Meta<typeof AttentionEditingShowcase>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Studio:Story={};
