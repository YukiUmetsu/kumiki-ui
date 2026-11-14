import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { InkWash } from "../../registry/video/ink-wash-react";
import { inkExampleSpec } from "./ink-wash-demo";
import type { InkSubject } from "./ink-wash-demo";
import { InkFilm } from "./ink-wash-universal.stories";
import { InkPerformanceFilm, DEFAULT_INK_ACTOR } from "./ink-wash-character.stories";
import type { InkActorFilmControls } from "./ink-wash-character.stories";
import { INK_LOOKS } from "../../registry/video/ink-wash-story";
import type { InkLookId } from "../../registry/video/ink-wash-story";
import {
  DEFAULT_INK_MATERIAL, DEFAULT_INK_CAMERA, DEFAULT_INK_REVEAL,
  configureInkSpec, assertInkMaterialControls, assertInkCameraControls,
  configureInkLayer,
} from "./ink-film-config";
import type { InkMaterialControls, InkCameraControls, InkRevealControls } from "./ink-film-config";

/** Reusable control surface for the SAME renderers used by production Storybook exports.
 * Never replay prerecorded mp4 or fake animation through CSS filters.
 */
export type InkLookMode = "painting" | "documentary" | "character";
type Aspect = "landscape" | "portrait";
const MODES: Record<InkLookMode,{title:string;description:string;total:number;initial:number}> = {
  painting:{title:"Brush painting",description:"Pressure, side-brush, diffusion, dry texture and paper.",
    total:420,initial:190},
  documentary:{title:"Documentary and explainer",description:"Three connected FilmStage shots: footage, diagram and title.",
    total:480,initial:219},
  character:{title:"Character performance",description:"The original articulated traveller walks, looks, speaks and bows.",
    total:330,initial:195},
};
const initialMaterials:Record<InkLookMode,InkMaterialControls> = {
  painting:{...DEFAULT_INK_MATERIAL},
  documentary:{...DEFAULT_INK_MATERIAL,seed:51,
    paper:INK_LOOKS.literati.paper,ink:INK_LOOKS.literati.ink,
    accent:INK_LOOKS.literati.accent,
    grain:INK_LOOKS.literati.grain,absorption:INK_LOOKS.literati.absorption},
  character:{...DEFAULT_INK_MATERIAL,seed:77},
};
type MaterialNumber = "seed"|"absorption"|"grain"|"strokeWidth"|"pressure"|"tone"|"water"|
  "pigmentLoad"|"drawTime"|"drag";
type ColorKey="paper"|"ink"|"accent";
const numericMaterialControls:readonly {id:MaterialNumber;label:string;min:number;max:number;step:number}[]=[
  {id:"seed",label:"Stable pigment seed",min:0,max:9999,step:1},
  {id:"absorption",label:"Xuan paper absorbency",min:0,max:1,step:.01},
  {id:"grain",label:"Paper tooth / fibre",min:0,max:1,step:.01},
  {id:"strokeWidth",label:"Brush width",min:.1,max:3,step:.05},
  {id:"pressure",label:"Nib pressure",min:.1,max:3,step:.05},
  {id:"tone",label:"Ink concentration",min:.1,max:3,step:.05},
  {id:"water",label:"Water dilution",min:0,max:3,step:.05},
  {id:"pigmentLoad",label:"Brush pigment load",min:.1,max:3,step:.05},
  {id:"drawTime",label:"Stroke deposition duration",min:.2,max:4,step:.05},
  {id:"drag",label:"Directional bristle drag",min:0,max:1,step:.01},
];
const numericCameraControls:readonly {id:keyof InkCameraControls;label:string;min:number;max:number;step:number}[]=[
  {id:"zoom",label:"Camera zoom",min:.5,max:2.5,step:.05},
  {id:"panX",label:"Camera pan X",min:-250,max:250,step:1},
  {id:"panY",label:"Camera pan Y",min:-250,max:250,step:1},
];
const numericActorControls:readonly {id:keyof InkActorFilmControls;label:string;min:number;max:number;step:number}[]=[
  {id:"x",label:"Character X",min:-250,max:250,step:1},
  {id:"y",label:"Character Y",min:-250,max:250,step:1},
  {id:"scale",label:"Character scale",min:.5,max:1.5,step:.05},
  {id:"clothBleed",label:"Robe/sleeve wet edge",min:0,max:1,step:.05},
  {id:"faceBleed",label:"Face ink wet edge",min:0,max:1,step:.05},
];
const button:CSSProperties={border:"1px solid #a5aa9f",borderRadius:6,
  background:"#fcfaf4",color:"#2e3931",padding:"9px 14px",
  font:"600 13px system-ui",cursor:"pointer",minHeight:42};
const label:CSSProperties={display:"grid",gap:4,minWidth:167,
  font:"600 12px/1.4 system-ui",color:"#313b33"};
const rangeStyle:CSSProperties={width:"100%",accentColor:"#485d4c"};
const small:CSSProperties={font:"12px/1.45 system-ui",color:"#667168"};

/** A real video studio in Video production/Film Looks. Every displayed knob
 * edits validated native render data; control state survives switching scenes.
 * The JSON pane supports exact precision and sharing an edited setup.
 */
export function InkLooksStudio({initialMode="painting"}:{initialMode?:InkLookMode}) {
  const [mode,setMode]=useState<InkLookMode>(initialMode);
  const [aspect,setAspect]=useState<Aspect>("landscape");
  const [frame,setFrame]=useState(MODES[initialMode].initial);
  const [playing,setPlaying]=useState(false);
  const [playbackRate,setPlaybackRate]=useState(1);
  const [loop,setLoop]=useState(false);
  const [subject,setSubject]=useState<InkSubject>("landscape");
  const [look,setLook]=useState<InkLookId>("literati");
  const [mineral,setMineral]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [materials,setMaterials]=useState(initialMaterials);
  const [cameras,setCameras]=useState<Record<InkLookMode,InkCameraControls>>({
    painting:{...DEFAULT_INK_CAMERA},documentary:{...DEFAULT_INK_CAMERA},
    character:{...DEFAULT_INK_CAMERA},
  });
  const [reveals,setReveals]=useState<Record<InkLookMode,InkRevealControls>>({
    painting:{...DEFAULT_INK_REVEAL},documentary:{...DEFAULT_INK_REVEAL},
    character:{...DEFAULT_INK_REVEAL},
  });
  const [actor,setActor]=useState<InkActorFilmControls>({...DEFAULT_INK_ACTOR});
  const [jsonDraft,setJsonDraft]=useState("");
  const [jsonError,setJsonError]=useState("");
  const [exportVisible,setExportVisible]=useState(false);
  const material=materials[mode],camera=cameras[mode],reveal=reveals[mode];
  const maxFrame=MODES[mode].total-1;
  const updateMaterial=(patch:Partial<InkMaterialControls>)=>{
    setPlaying(false);
    setMaterials(old=>({...old,[mode]:{...old[mode],...patch}}));
  };
  const updateCamera=(patch:Partial<InkCameraControls>)=>{
    setPlaying(false);
    setCameras(old=>({...old,[mode]:{...old[mode],...patch}}));
  };
  const updateReveal=(patch:Partial<InkRevealControls>)=>{
    setPlaying(false);
    setReveals(old=>({...old,[mode]:{...old[mode],...patch}}));
  };
  const updateActor=(patch:Partial<InkActorFilmControls>)=>{
    setPlaying(false);setActor(old=>({...old,...patch}));
  };
  const chooseMode=(next:InkLookMode)=>{
    setPlaying(false);setMode(next);setFrame(MODES[next].initial);setJsonError("");
  };
  const chooseLook=(next:InkLookId)=>{
    const p=INK_LOOKS[next];
    setLook(next);
    updateMaterial({paper:p.paper,ink:p.ink,accent:p.accent,grain:p.grain,absorption:p.absorption});
  };
  const painting=useMemo(()=>configureInkSpec(inkExampleSpec(subject,aspect,47),materials.painting),
    [subject,aspect,materials.painting]);
  // Use the host's single clock and exact integer film frames: preview speed
  // alters frame sampling, never pigment diffusion equations or actor cues.
  useEffect(()=>{
    if(!playing||reducedMotion)return;
    const start=performance.now(),origin=frame;
    let raf=0;
    const tick=(now:number)=>{
      const moved=Math.floor((now-start)*30/1000*playbackRate);
      const next=loop?(origin+moved)%(maxFrame+1):Math.min(maxFrame,origin+moved);
      setFrame(next);
      if(!loop&&next===maxFrame)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
    // Capture the start frame when Play is pressed; subsequent frames must not restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,mode,reducedMotion,playbackRate,loop]);
  const dimensions=aspect==="landscape"?{width:960,height:540,scale:.82}:
    {width:540,height:960,scale:.57};
  const {width,height,scale}=dimensions;
  const activeConfig=useMemo(()=>({material,camera,reveal,actor,
    style:look,subject,aspect,playbackRate,loop,mineral,reducedMotion}),
    [material,camera,reveal,actor,look,subject,aspect,playbackRate,loop,mineral,reducedMotion]);
  const openJSON=()=>{setJsonDraft(JSON.stringify(activeConfig,null,2));setJsonError("");setExportVisible(true);};
  const applyJSON=()=>{
    try {
      const next:unknown=JSON.parse(jsonDraft);
      if(!next||typeof next!=="object"||Array.isArray(next))throw new Error("Expected a JSON configuration object.");
      const data=next as Record<string,unknown>;
      const candidate={...material,...((data.material??{}) as object)} as InkMaterialControls;
      const cam={...camera,...((data.camera??{}) as object)} as InkCameraControls;
      const rev={...reveal,...((data.reveal??{}) as object)} as InkRevealControls;
      const act={...actor,...((data.actor??{}) as object)} as InkActorFilmControls;
      assertInkMaterialControls(candidate);
      assertInkCameraControls(cam);
      configureInkLayer({id:"proof",startFrame:0,durationFrames:50,reveal:"brush"},rev,100);
      if(![act.x,act.y,act.scale,act.clothBleed,act.faceBleed].every(Number.isFinite) ||
        act.x < -250||act.x > 250||act.y < -250||act.y > 250||
        act.scale < .5||act.scale > 1.5||act.clothBleed < 0||act.clothBleed > 1||
        act.faceBleed < 0||act.faceBleed > 1)throw new Error("Invalid actor transform or wet/dry finish.");
      const validatedLook=data.style===undefined?look:data.style as InkLookId;
      if(!Object.prototype.hasOwnProperty.call(INK_LOOKS,validatedLook))
        throw new Error("Unknown ink direction.");
      const validatedAspect=data.aspect===undefined?aspect:data.aspect;
      if(validatedAspect!=="landscape"&&validatedAspect!=="portrait")throw new Error("Invalid aspect.");
      const validatedSubject=data.subject===undefined?subject:data.subject;
      if(validatedSubject!=="landscape"&&validatedSubject!=="bamboo")throw new Error("Invalid painting subject.");
      const validatedSpeed=data.playbackRate===undefined?playbackRate:data.playbackRate;
      if(typeof validatedSpeed!=="number"||!Number.isFinite(validatedSpeed)||validatedSpeed<.25||validatedSpeed>2)
        throw new Error("Playback rate must be 0.25–2.");
      for(const key of ["loop","mineral","reducedMotion"]){
        if(data[key]!==undefined&&typeof data[key]!=="boolean")throw new Error(key+" must be boolean.");
      }
      setPlaying(false);
      setMaterials(old=>({...old,[mode]:candidate}));
      setCameras(old=>({...old,[mode]:cam}));
      setReveals(old=>({...old,[mode]:rev}));
      setActor(act);setLook(validatedLook);setAspect(validatedAspect);
      setSubject(validatedSubject);setPlaybackRate(validatedSpeed);
      if(data.loop!==undefined)setLoop(data.loop as boolean);
      if(data.mineral!==undefined)setMineral(data.mineral as boolean);
      if(data.reducedMotion!==undefined)setReducedMotion(data.reducedMotion as boolean);
      setJsonError("");
    } catch(error){setJsonError(error instanceof Error?error.message:String(error));}
  };
  const materialNumber=(id:MaterialNumber,title:string,min:number,max:number,step:number)=>
    <label key={id} style={label}>{title} <span style={small}>{material[id]}</span>
      <input aria-label={title} style={rangeStyle} type="range"
        min={min} max={max} step={step} value={material[id]}
        onChange={e=>updateMaterial({[id]:Number(e.target.value)})}/>
    </label>;
  const cameraNumber=(id:keyof InkCameraControls,title:string,min:number,max:number,step:number)=>
    <label key={id} style={label}>{title} <span style={small}>{camera[id]}</span>
      <input aria-label={title} style={rangeStyle} type="range"
        min={min} max={max} step={step} value={camera[id]}
        onChange={e=>updateCamera({[id]:Number(e.target.value)})}/>
    </label>;
  const actorNumber=(id:keyof InkActorFilmControls,title:string,min:number,max:number,step:number)=>
    <label key={id} style={label}>{title} <span style={small}>{actor[id]}</span>
      <input aria-label={title} style={rangeStyle} type="range"
        min={min} max={max} step={step} value={actor[id]}
        onChange={e=>updateActor({[id]:Number(e.target.value)})}/>
    </label>;
  return <main data-km-ink-film-looks="" style={{minHeight:"100vh",background:"#eae9e2",
    padding:"clamp(15px,2.5vw,28px)",color:"#29332b",font:"15px/1.5 system-ui",
    display:"grid",gap:15,alignContent:"start"}}>
    <header style={{display:"grid",gap:6,maxWidth:980}}>
      <div style={{font:"700 11px system-ui",letterSpacing:3,color:"#8d5345"}}>VIDEO PRODUCTION / FILM LOOKS / MATERIAL-NATIVE</div>
      <h1 style={{font:"500 clamp(28px,4vw,40px)/1.15 Georgia,serif",margin:0}}>Chinese ink wash · In motion</h1>
      <p style={{margin:0,color:"#59645b",maxWidth:890}}>Three live, frame-accurate animations using the production ink and character renderers.
        Change brush deposition, paper, camera, ink reveal, performance, and output without regenerating artwork.</p>
    </header>
    <div role="group" aria-label="Chinese ink animation studies" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {([["painting","Brush painting"],["documentary","Documentary / explainer"],
        ["character","Character performance"]] as const).map(([m,name])=>
        <button key={m} type="button" aria-pressed={mode===m} onClick={()=>chooseMode(m)}
          style={{...button,background:mode===m?"#35483c":"#fcfaf4",
            color:mode===m?"#fff":"#29332b"}}>{name}</button>)}
    </div>
    <section aria-label="Canvas and material choice" style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end"}}>
      <label style={label}>Ink animation <select aria-label="Ink animation" value={mode}
        onChange={e=>chooseMode(e.target.value as InkLookMode)}
        style={{minHeight:42,background:"#fffdf5",border:"1px solid #a5aa9f"}}>
        <option value="painting">Brush painting</option><option value="documentary">Documentary / explainer</option>
        <option value="character">Character performance</option></select></label>
      <label style={label}>Ink aspect <select aria-label="Ink aspect" value={aspect}
        onChange={e=>{setPlaying(false);setAspect(e.target.value as Aspect);}}
        style={{minHeight:42,background:"#fffdf5",border:"1px solid #a5aa9f"}}>
        <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option></select></label>
      {mode==="painting"&&<label style={label}>Painting subject
        <select aria-label="Ink painting subject" value={subject} onChange={e=>{
          setPlaying(false);setSubject(e.target.value as InkSubject);}}
          style={{minHeight:42,background:"#fffdf5",border:"1px solid #a5aa9f"}}>
          <option value="landscape">Pine and mountains</option><option value="bamboo">Bamboo grove</option>
        </select></label>}
      {mode==="documentary"&&<label style={label}>Paper and ink direction
        <select aria-label="Paper and ink direction" value={look}
          onChange={e=>chooseLook(e.target.value as InkLookId)}
          style={{minHeight:42,background:"#fffdf5",border:"1px solid #a5aa9f"}}>
          {Object.keys(INK_LOOKS).map(id=><option key={id} value={id}>{id}</option>)}
        </select></label>}
      {mode==="character"&&<label style={{...label,display:"flex",gap:8,alignItems:"center"}}>
        <input type="checkbox" checked={mineral} onChange={e=>{setPlaying(false);setMineral(e.target.checked);}}/>
        Mineral-tint costume
      </label>}
      <label style={{...label,display:"flex",gap:8,alignItems:"center"}}>
        <input type="checkbox" checked={reducedMotion} onChange={e=>{setPlaying(false);setReducedMotion(e.target.checked);}}/>
        Reduced motion
      </label>
    </section>
    <div style={{display:"grid",gap:3}}><strong style={{font:"500 20px Georgia,serif"}}>{MODES[mode].title}</strong>
      <span style={{fontSize:13,color:"#5b665c"}}>{MODES[mode].description}</span></div>
    <div data-km-film-looks-ink-preview="" style={{width:width*scale,height:height*scale,maxWidth:"100%",
      background:"#f4f0e5",overflow:"hidden",boxShadow:"0 16px 48px #202d2329"}}>
      <div style={{width,height,transform:"scale("+scale+")",transformOrigin:"top left"}}>
        {mode==="painting"?<div style={{width,height,position:"relative"}}>
          <InkWash spec={painting} frame={frame} reducedMotion={reducedMotion}
            label={subject==="landscape"?"Animated Chinese ink-wash mountain and pine":"Animated Chinese ink-wash bamboo"}/>
          <div style={{position:"absolute",left:"8%",top:"8%",pointerEvents:"none"}}>
            <span style={{color:"#985343",letterSpacing:3,font:"700 12px system-ui"}}>KUMIKI INK STUDY / 01</span>
            <div style={{font:"500 39px Georgia,serif",marginTop:8,color:"#30362f"}}>
              {subject==="landscape"?"Among the pines":"Quiet bamboo"}</div>
          </div>
        </div>:
        mode==="documentary"?<InkFilm frame={frame} output={aspect} look={look}
          material={materials.documentary} camera={cameras.documentary}
          reveal={reveals.documentary} reducedMotion={reducedMotion}/>:
          <InkPerformanceFilm frame={frame} aspect={aspect} mineral={mineral}
            material={materials.character} camera={cameras.character}
            reveal={reveals.character} actor={actor} reducedMotion={reducedMotion}/>}
      </div>
    </div>
    <section aria-label="Playback and timeline" style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:12,maxWidth:940}}>
      <button style={{...button,background:reducedMotion?"#c2c4b9":"#35483c",
        color:reducedMotion?"#39463c":"#fff"}} disabled={reducedMotion} type="button"
        onClick={()=>{if(frame>=maxFrame)setFrame(0);setPlaying(v=>!v);}}>
        {playing?"Pause":"Play animation"}</button>
      <button type="button" style={button} onClick={()=>{setPlaying(false);setFrame(0);}}>Restart</button>
      <label style={{...label,flex:1,minWidth:240}}>
        Ink film frame · <output aria-label="Current ink frame">{frame}</output> / {maxFrame}
        <input style={rangeStyle} aria-label="Ink film frame" type="range" min={0} max={maxFrame}
          value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <label style={{...label,minWidth:140}}>Playback speed
        <select aria-label="Playback speed" value={playbackRate}
          onChange={e=>{setPlaying(false);setPlaybackRate(Number(e.target.value));}}
          style={{minHeight:40,background:"#fcfaf4"}}>
          {[.25,.5,.75,1,1.25,1.5,2].map(x=><option key={x} value={x}>{x}×</option>)}
        </select></label>
      <label style={{...label,display:"flex",gap:6,alignItems:"center"}}>
        <input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Loop playback
      </label>
    </section>
    <nav aria-label="Ink animation keyframes" style={{display:"flex",flexWrap:"wrap",gap:7}}>
      {(mode==="painting"?[["Initial paper",0],["Mountain wash",85],["Brush marks",190],["Settled painting",375]]:
        mode==="documentary"?[["Opening",57],["Explainer",226],["Closing",415]]:
        [["Walk",80],["Greet",160],["Speak",192],["Bow",285],["Hold",324]])
        .map(([name,at])=><button type="button" key={String(name)} style={button}
          onClick={()=>{setPlaying(false);setFrame(Number(at));}}>{name}</button>)}
    </nav>
    <details style={{background:"#f5f3eb",padding:"13px 17px",border:"1px solid #c2c3b8",borderRadius:8,maxWidth:1100}}>
      <summary style={{cursor:"pointer",font:"600 16px Georgia,serif"}}>Art direction · Full native material controls</summary>
      <p style={{fontSize:13,color:"#5b665c",maxWidth:950}}>Every change rebuilds native ink-mark data, paper absorption and tonal geometry. It is not a grayscale film filter.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:18}}>
        {(["paper","ink","accent"] as const).map((key:ColorKey)=><label key={key} style={label}>
          {key==="paper"?"Paper stock":key==="ink"?"Ink pigment":"Cinnabar accent"}
          <input aria-label={key+" color"} type="color" value={material[key]}
            onChange={e=>updateMaterial({[key]:e.target.value})}
            style={{width:90,height:36,border:"none",background:"transparent"}}/>
          <span style={small}>{material[key]}</span>
        </label>)}
        <label style={label}>Brush orientation
          <select aria-label="Brush orientation" value={material.orientation}
            onChange={e=>updateMaterial({orientation:e.target.value as InkMaterialControls["orientation"]})}
            style={{minHeight:40}}>
            <option value="authored">Authored per stroke</option>
            <option value="upright">Centre brush</option><option value="oblique">Side brush</option>
          </select></label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:"14px 18px"}}>
        {numericMaterialControls.map(c=>materialNumber(c.id,c.label,c.min,c.max,c.step))}
      </div>
    </details>
    {mode!=="painting"&&<details style={{background:"#f5f3eb",padding:"13px 17px",
      border:"1px solid #c2c3b8",borderRadius:8,maxWidth:1100}}>
      <summary style={{cursor:"pointer",font:"600 16px Georgia,serif"}}>Cinematography · Camera, reveal, parallax</summary>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",
        gap:"14px 18px",paddingTop:16}}>
        {numericCameraControls.map(c=>cameraNumber(c.id,c.label,c.min,c.max,c.step))}
        <label style={label}>Ink reveal kind
          <select aria-label="Ink reveal kind" value={reveal.kind}
            onChange={e=>updateReveal({kind:e.target.value as InkRevealControls["kind"]})}
            style={{minHeight:40}}>
            <option value="authored">Shot-authored</option><option value="brush">Brush sweep</option>
            <option value="bloom">Capillary bloom</option><option value="instant">Immediate</option>
          </select></label>
        <label style={label}>Reveal duration · {reveal.duration}
          <input style={rangeStyle} aria-label="Reveal duration" type="range"
            min={.25} max={3} step={.05} value={reveal.duration}
            onChange={e=>updateReveal({duration:Number(e.target.value)})}/></label>
        <label style={label}>Parallax multiplier · {reveal.parallax}
          <input style={rangeStyle} aria-label="Parallax multiplier" type="range"
            min={0} max={2} step={.05} value={reveal.parallax}
            onChange={e=>updateReveal({parallax:Number(e.target.value)})}/></label>
      </div>
    </details>}
    {mode==="character"&&<details style={{background:"#f5f3eb",padding:"13px 17px",
      border:"1px solid #c2c3b8",borderRadius:8,maxWidth:1100}}>
      <summary style={{cursor:"pointer",font:"600 16px Georgia,serif"}}>Character · Stage transforms and per-part ink</summary>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",
        gap:"14px 18px",paddingTop:16}}>
        {numericActorControls.map(c=>actorNumber(c.id,c.label,c.min,c.max,c.step))}
      </div><p style={small}>Existing gesture, blink, gaze and viseme tracks remain tied to their approved character revision and one absolute film clock.</p>
    </details>}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <button type="button" style={button} aria-expanded={exportVisible} onClick={()=>{
        if(exportVisible)setExportVisible(false);else openJSON();}}> {exportVisible?"Hide config JSON":"View / edit configuration JSON"}</button>
      <button type="button" style={button} onClick={()=>{
        setPlaying(false);
        setMaterials(old=>({...old,[mode]:{...initialMaterials[mode]}}));
        setCameras(old=>({...old,[mode]:{...DEFAULT_INK_CAMERA}}));
        setReveals(old=>({...old,[mode]:{...DEFAULT_INK_REVEAL}}));
        if(mode==="character")setActor({...DEFAULT_INK_ACTOR});
        setJsonError("");
      }}>Reset style parameters</button>
    </div>
    {exportVisible&&<section aria-label="Editable ink configuration" style={{display:"grid",gap:9,maxWidth:860}}>
      <p style={{margin:0,...small}}>Copy and edit this validated native configuration. Applying updates existing controls without changing the original ink artwork or character definition.</p>
      <textarea aria-label="Ink configuration JSON" spellCheck={false} rows={16}
        value={jsonDraft} onChange={e=>setJsonDraft(e.target.value)}
        style={{font:"12px/1.45 ui-monospace,monospace",padding:12,background:"#fffef8",
          color:"#303d34",border:"1px solid #aab0a6",width:"100%",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button type="button" style={button} onClick={applyJSON}>Apply configuration</button>
        {jsonError&&<span role="alert" style={{color:"#953d2c",fontSize:13}}>{jsonError}</span>}
      </div>
    </section>}
    <p style={{margin:0,maxWidth:940,...small}}>Original, independently authored demonstration artwork. Real film-frame scrubbing, not prerecorded video. Complex source artwork, rig parts, viseme timing and footage remain replaceable through Kumiki's underlying typed components.</p>
  </main>;
}
