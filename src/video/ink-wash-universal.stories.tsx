import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { InkWashScene } from "../../registry/video/ink-wash-story-react";
import { createInkFilmDocument, INK_LOOKS } from "../../registry/video/ink-wash-story";
import type { InkFilmPlan, InkLayerPlan, InkLookId } from "../../registry/video/ink-wash-story";
import type { InkWashSpec, InkStroke } from "../../registry/video/ink-wash";
import mountainsDusk from "../../assets/photos/look-plates/mountains-dusk.jpg?url";

/** A general education/documentary/title film from original drawings plus a repository CC0 photograph.
 * A consumer replaces the semantic renderLayer callback with their own footage, UI, actors, or 3D.
 */
type Output = "landscape" | "portrait";
const OUTPUTS = [{ id: "landscape", width: 960, height: 540 }, { id: "portrait", width: 540, height: 960 }] as const;
const durations = [140, 180, 160] as const;
const TOTAL = durations.reduce((a,b)=>a+b,0);
const common = { reveal: "brush" as const, seed: 91, startFrame: 8, durationFrames: 39 };
function filmPlan(): InkFilmPlan {
  return {id:"ink-water-explainer", fps:30, outputs:OUTPUTS, shots:[
    {id:"prologue",label:"Water moves through the landscape",durationFrames:durations[0],
      camera:{keyframes:[{frame:0,x:0,y:0,zoom:1},{frame:139,x:-14,y:3,zoom:1.055}]},
      layers:[
        {id:"hero-photo",reveal:"bloom",origin:[.64,.53],startFrame:7,durationFrames:82,seed:17,treatment:"wash",parallax:.45},
        {id:"opening-type",...common,startFrame:27,durationFrames:40,seed:91,treatment:"original",parallax:0},
      ]},
    {id:"explanation",label:"Three steps in the water cycle",durationFrames:durations[1],
      camera:{keyframes:[{frame:0,x:0,y:0,zoom:1},{frame:179,x:-11,y:0,zoom:1.04}]},
      layers:[
        {id:"diagram",reveal:"brush",direction:"right",seed:25,startFrame:10,durationFrames:73,parallax:.88},
        {id:"diagram-labels",reveal:"bloom",origin:[.48,.45],seed:31,startFrame:48,durationFrames:60,parallax:0},
      ]},
    {id:"finale",label:"An ink thought resolves on paper",durationFrames:durations[2],
      layers:[
        {id:"final-type",reveal:"brush",direction:"right",seed:67,startFrame:17,durationFrames:46,parallax:0},
        {id:"fine-print",reveal:"bloom",origin:[.5,.78],seed:39,startFrame:66,durationFrames:36,parallax:0},
      ]},
  ]};
}
const FILM = filmPlan();
const DOCUMENT = createInkFilmDocument(FILM);
function subjectSpec(width:number,height:number,look:InkLookId,shotId:string):InkWashSpec {
  const theme = INK_LOOKS[look],short=Math.min(width,height);
  const stroke=(id:string, pts:readonly (readonly [number,number,number])[],
    tone:number,w:number,wet:number,start:number,brush:"upright"|"oblique"="upright"):InkStroke => ({
    id,points:pts.map(([x,y,pressure])=>({x:x*width,y:y*height,pressure})),
    tone,width:w*short/540,water:wet,load:.84,brush,tipInk:brush==="oblique"?.8:.48,
    startFrame:start,drawFrames:36,spreadFrames:20,dryFrames:28,
  });
  const strokes = shotId==="prologue" ? [
    stroke("horizon-low",[[-.04,.83,.08],[.15,.79,.24],[.38,.82,.11],[.59,.77,.28],[1.05,.79,.03]],.25,29,.94,14,"oblique"),
    stroke("sky-arc",[[.28,.19,.01],[.42,.12,.18],[.61,.15,.05]],.16,18,.92,28,"oblique"),
    stroke("shore-one",[[.06,.90,.02],[.2,.88,.24],[.34,.89,.03]],.6,6,.13,55),
  ] : shotId==="explanation" ? [
    stroke("riverbed",[[.08,.78,.04],[.26,.81,.46],[.46,.76,.62],[.7,.84,.39],[.94,.78,.03]],.27,40,.92,26,"oblique"),
    stroke("distant-mist",[[.09,.23,.03],[.3,.21,.26],[.51,.19,.30],[.71,.21,.04]],.13,61,.97,14,"oblique"),
  ] : [
    stroke("closing-mark",[[.19,.72,.06],[.37,.68,.50],[.64,.71,.50],[.83,.68,.03]],.43,12,.31,38),
    stroke("closing-wash",[[.14,.78,.08],[.48,.76,.26],[.85,.81,.05]],.16,38,.89,49,"oblique"),
  ];
  return {
    version:1,width,height,paper:theme.paper,ink:theme.ink,accent:theme.accent,
    seed:51,absorption:theme.absorption,grain:theme.grain,strokes,
  };
}
function frameText(portrait:boolean, text:string, top:string, size:number, subtitle?:string):ReactNode {
  return <div style={{position:"absolute",inset:0,padding:portrait?"14% 9%":"11% 9%",color:"#232922"}}>
    <div style={{position:"absolute",left:"9%",top, maxWidth:"85%",display:"grid",gap:12}}>
      <div style={{font:"700 13px/1.3 system-ui",letterSpacing:3.2,color:"#7D473B"}}>INK / FIELD NOTES</div>
      <div style={{font:"500 "+size+"px/1.09 Georgia,'Times New Roman',serif",letterSpacing:-1.4,
        textWrap:"balance"}}>{text}</div>
      {subtitle&&<div style={{font:"15px/1.55 system-ui",maxWidth:portrait?390:620,color:"#3E4941"}}>{subtitle}</div>}
    </div>
  </div>;
}
/** Original source image with deliberate soft masking, not represented as hand-painted imagery. */
function MediaLandscape({portrait}:{portrait:boolean}) {
  return <div style={{position:"absolute",inset:0}}>
    <img src={mountainsDusk} alt="Distant mountains in muted dusk light"
      style={{position:"absolute",left:portrait?"8%":"39%",top:portrait?"27%":"10%",
        width:portrait?"84%":"55%",height:portrait?"41%":"74%",objectFit:"cover",
        maskImage:"linear-gradient(to right,transparent,black 14%,black 87%,transparent),linear-gradient(to bottom,transparent,black 18%,black 83%,transparent)",
        maskComposite:"intersect",WebkitMaskComposite:"source-in",opacity:.83}}/>
    <div style={{position:"absolute",left:"10%",right:"9%",bottom:"14%",height:1,background:"#A59A83",opacity:.8}}/>
  </div>;
}
function ScienceDiagram({portrait,width,height}:{portrait:boolean;width:number;height:number}) {
  // The subject comes from the host, not INK2. Place a legible image-based explainer into the ink scene.
  const nodes=portrait?
    [[.50,.29],[.33,.52],[.67,.75]]:[[.23,.58],[.51,.40],[.78,.60]];
  const names=["EVAPORATION","CONDENSATION","PRECIPITATION"];
  const paths=portrait?[
    "M"+width*.47+" "+height*.31+" Q"+width*.18+" "+height*.39+" "+width*.33+" "+height*.50,
    "M"+width*.38+" "+height*.54+" Q"+width*.78+" "+height*.60+" "+width*.68+" "+height*.71,
  ]:[
    "M"+width*.28+" "+height*.57+" Q"+width*.36+" "+height*.35+" "+width*.46+" "+height*.4,
    "M"+width*.56+" "+height*.41+" Q"+width*.69+" "+height*.37+" "+width*.74+" "+height*.57,
  ];
  const r=Math.min(width,height)*(portrait?.083:.10);
  return <svg role="img" aria-label="Water evaporates, condenses into clouds and falls as rain"
    viewBox={"0 0 "+width+" "+height} width={width} height={height}
    style={{display:"block",position:"absolute",inset:0}}>
    <g fill="none" stroke="#596863" strokeLinecap="round">
      {paths.map((p,i)=><path key={i} d={p} strokeWidth={3.5} strokeDasharray="5 10"/>)}
    </g>
    {nodes.map(([x,y],i)=><g key={i} transform={"translate("+x*width+" "+y*height+")"}>
      <circle r={r*1.02} fill="#E8E4D8" stroke="#4B5551" strokeWidth="2.5" />
      <circle r={r*.88} fill="none" stroke="#7B8A82" strokeDasharray="2 9" strokeWidth="1.5"/>
      {i===0?<><path d={"M0 "+(-r*.7)+" C"+r*.38+" "+(-r*.08)+" "+r*.35+" "+r*.38+
        " 0 "+r*.63+" C"+(-r*.48)+" "+r*.37+" "+(-r*.25)+" "+(-r*.18)+" 0 "+(-r*.7)}
        fill="#536F74" opacity=".85"/></>:
      i===1?<><path d={"M"+(-r*.7)+" 0 Q"+(-r*.6)+" "+(-r*.5)+" 0 "+(-r*.4)+
        " Q"+r*.6+" "+(-r*.52)+" "+r*.65+" 0 Q"+r*.76+" "+r*.35+
        " "+r*.1+" "+r*.3+" H"+(-r*.57)+" Q"+(-r*.9)+" "+r*.18+" "+(-r*.7)+" 0"} fill="#75847A"/></>:
      <><path d={"M"+(-r*.58)+" "+(-r*.43)+" L"+r*.52+" "+(-r*.43)}
        stroke="#6D8077" strokeWidth="4" strokeLinecap="round"/>
        {[-.5,0,.5].map(t=><path key={t} d={"M"+r*t+" "+(-r*.18)+" l"+r*.14+" "+r*.56}
          stroke="#546A75" strokeWidth="4" strokeLinecap="round"/>)}</>}
      <circle r="2" fill="#3E5148" />
    </g>)}
    {names.map((name,i)=><text key={name} x={nodes[i][0]*width} y={nodes[i][1]*height+r+(portrait?35:33)}
      textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight={700}
      fontSize={portrait?12:14} letterSpacing="1.7" fill="#37443D">{name}</text>)}
  </svg>;
}
function renderMedia(layer:InkLayerPlan,shotId:string,width:number,height:number):ReactNode {
  const portrait=height>width;
  switch(layer.id){
    case "hero-photo":return <MediaLandscape portrait={portrait}/>;
    case "opening-type":return frameText(portrait,"Everything flows",portrait?"9%":"11%",portrait?51:68,
      "A visual journey told through water, paper and ink.");
    case "diagram":return <ScienceDiagram portrait={portrait} width={width} height={height}/>;
    case "diagram-labels":return frameText(portrait,"A cycle without end",portrait?"9%":"9%",portrait?33:47);
    case "final-type":return frameText(portrait,"Every river begins",portrait?"21%":"20%",portrait?56:72,
      "A small change becomes part of something vast.");
    case "fine-print":return <div style={{position:"absolute",left:"9%",right:"9%",top:"73%",
      borderTop:"1px solid #A09D8F",paddingTop:16,font:"600 14px/1.5 system-ui",
      letterSpacing:1.2,color:"#434B44"}}>REVEAL · INK · SPACE · TIME</div>;
    default:throw new Error("Unknown ink shot "+shotId+" visual layer: "+layer.id);
  }
}
function InkFilm({frame,output,look}:{frame:number;output:Output;look:InkLookId}) {
  const compiled=useMemo(()=>compileFilm(DOCUMENT,{outputId:output}),[output]);
  const specMap=useMemo(()=>{
    const dimensions=OUTPUTS.find(o=>o.id===output)!;
    return Object.fromEntries(FILM.shots.map(shot=>[shot.id,
      subjectSpec(dimensions.width,dimensions.height,look,shot.id)]));
  },[look,output]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(i=>i.message).join("\n")}</pre>;
  return <FilmStage film={compiled.film} frame={frame} renderObject={()=>null} reducedMotion={false}
    renderSlot={(slot,context)=>{
      const shot=FILM.shots.find(s=>s.id===slot.props?.shotId);
      if(slot.slot!=="ink-story"||!shot)throw new Error("Unrecognized INK2 shot.");
      const spec=specMap[shot.id];
      return <InkWashScene spec={spec} shot={shot} frame={context.frame}
        renderLayer={layer=>renderMedia(layer,shot.id,spec.width,spec.height)}
        label={shot.label}>
        <div style={{position:"absolute",left:"9%",bottom:"5%",right:"9%",
          display:"flex",justifyContent:"space-between",font:"700 10px/1.5 system-ui",
          color:"#595E56",letterSpacing:1.2}}>
          <span>WATER / INK STUDY</span><span>{shot.id.toUpperCase()} · {Math.floor(context.frame/30)+1}s</span>
        </div>
      </InkWashScene>;
    }}/>
}
function Studio() {
  const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false);
  const [output,setOutput]=useState<Output>("landscape");
  const [look,setLook]=useState<InkLookId>("literati");
  useEffect(()=>{
    if(!playing)return;
    const started=performance.now(),initial=frame;
    let request=0;
    const tick=(now:number)=>{
      const next=Math.min(TOTAL-1,initial+Math.floor((now-started)*.03));
      setFrame(next);
      if(next<TOTAL-1)request=requestAnimationFrame(tick);else setPlaying(false);
    };
    request=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(request);
    // Capture starting frame on Play, not the ticker's changing state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const dimensions=OUTPUTS.find(o=>o.id===output)!;
  const scale=output==="portrait"?.68:.88;
  const button={padding:"10px 16px",minHeight:42,borderRadius:6,
    background:"#F8F6F1",border:"1px solid #B9B7AB",
    color:"#303831",font:"600 14px system-ui",cursor:"pointer"} as const;
  return <main style={{minHeight:"100vh",background:"#EAE8E0",padding:22,
    font:"15px/1.5 system-ui",color:"#292F2A",display:"grid",justifyItems:"start",gap:14}}>
    <h1 style={{font:"500 31px/1.2 Georgia,serif",margin:0}}>An ink film about anything.</h1>
    <p style={{margin:0,maxWidth:800}}>Three independently directed shots: mixed-source documentary image,
      technical explainer, and typographic closing. Edit the look, framing, and exact film frame.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <label>Visual direction <select aria-label="Visual direction" value={look}
        onChange={e=>setLook(e.target.value as InkLookId)} style={{display:"block",minHeight:40}}>
        {Object.keys(INK_LOOKS).map(id=><option key={id} value={id}>{id}</option>)}</select></label>
      <label>Output <select aria-label="Output" value={output}
        onChange={e=>setOutput(e.target.value as Output)} style={{display:"block",minHeight:40}}>
        <option value="landscape">16:9</option><option value="portrait">9:16</option>
      </select></label>
    </div>
    <div style={{width:dimensions.width*scale,height:dimensions.height*scale,
      overflow:"hidden",boxShadow:"0 16px 40px rgba(27,32,25,.18)",background:"#F3EFE3"}}>
      <div style={{width:dimensions.width,height:dimensions.height,
        transform:"scale("+scale+")",transformOrigin:"0 0"}}>
        <InkFilm frame={frame} output={output} look={look}/>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:12,maxWidth:840,width:"100%"}}>
      <button type="button" style={{...button,background:"#293A32",color:"white"}}
        onClick={()=>{if(frame===TOTAL-1)setFrame(0);setPlaying(v=>!v);}}>
        {playing?"Pause":"Play film"}</button>
      <label style={{flex:1,minWidth:260}}>Frame {frame} / {TOTAL-1}
        <input type="range" aria-label="Ink film frame" min={0} max={TOTAL-1} value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}
          style={{width:"100%"}}/>
      </label>
    </div>
    <nav aria-label="Film chapters" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {([["Documentary",60],["Explainer",230],["Editorial end",407]] as const).map(([name,at])=>
        <button key={name} type="button" style={button}
          onClick={()=>{setPlaying(false);setFrame(at);}}>{name}</button>)}
    </nav>
  </main>;
}
const EXPORT_MANIFEST:VideoExportManifest={schemaVersion:1,id:"ink-any-topic-study",
  width:960,height:540,durationFrames:TOTAL,fps:{num:30,den:1}};
function ExportDemo(){
  const [frame,setFrame]=useState(0);
  return <VideoExportStage manifest={EXPORT_MANIFEST} frame={frame} onSeek={setFrame}>
    <InkFilm frame={frame} output="landscape" look="literati"/>
  </VideoExportStage>;
}
const meta={title:"Video production/Chinese Ink Wash Universal",
  id:"video-ink-any-topic",component:Studio,parameters:{layout:"fullscreen"}} satisfies Meta<typeof Studio>;
export default meta;
export const Interactive:StoryObj<typeof meta>={name:"Ink style · Documentary, diagram and titles"};
export const ProductionExport:StoryObj<typeof ExportDemo>={
  name:"Ink style · Multi-genre film export", render:()=> <ExportDemo/>,
};
