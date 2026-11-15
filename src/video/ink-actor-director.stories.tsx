import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { InkDirectorFilm, inkDirectorRoute } from "./ink-actor-director-demo";
import { inkRouteAt } from "../../registry/video/ink-actor-director";
import type { DirectorAspect } from "./ink-actor-director-demo";

const document:FilmDocument={
  schemaVersion:1,id:"ink4-continuous-traveler-performance",
  fps:{num:30,den:1},drift:0,
  outputs:[{id:"landscape",width:960,height:540},{id:"portrait",width:540,height:960}],
  scenes:[{id:"walking-gesture-and-hold",recipeId:"slot",durationFrames:420,
    content:{slot:"ink4-traveler",label:"A hand-painted traveler walks, pauses and performs"}}],
};
function Laboratory(){
  const [aspect,setAspect]=useState<DirectorAspect>("landscape");
  const [framing,setFraming]=useState<"wide"|"figure">("figure");
  const [frame,setFrame]=useState(244);
  const [playing,setPlaying]=useState(false);
  const [reduce,setReduce]=useState(false);
  const [foldDetail,setFoldDetail]=useState(1);
  const [foldContrast,setFoldContrast]=useState(.85);
  const [clothAmount,setClothAmount]=useState(.75);
  const compiled=useMemo(()=>compileFilm(document,{outputId:aspect}),[aspect]);
  useEffect(()=>{
    if(!playing||reduce)return;
    const start=performance.now(),initial=frame;
    let raf=0;
    function tick(now:number){
      const next=Math.min(419,initial+Math.floor((now-start)*.03));
      setFrame(next);
      if(next<419)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    }
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
    // Playback is a Storybook-only convenience; production FilmStage has its own absolute clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,reduce]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(d=>d.message).join("\n")}</pre>;
  const film=compiled.film,scale=aspect==="landscape"?1:.66;
  // A viewport crop of the same film: no duplicated actor or separate clock.
  // Under reduced motion the actor holds the completed frame 419; its
  // inspection camera must follow that pose rather than frame-0 travel.
  const cameraPose=inkRouteAt(inkDirectorRoute(aspect),reduce?419:frame);
  const zoom=framing==="figure"?(aspect==="portrait"?1.65:1.38):1;
  const visualScale=scale*zoom;
  const focusX=cameraPose.x,focusY=cameraPose.y-165;
  const dx=framing==="figure"?film.width*scale*.5-focusX*visualScale:0;
  const dy=framing==="figure"?film.height*scale*.5-focusY*visualScale:0;
  const keyframes=[["Arrival",0],["First foot plant",24],["Walking",110],
    ["Hill",198],["Stops",232],["Expression",280],["Ink settles",419]] as const;
  return <main style={{minHeight:"100vh",background:"#E9E5DC",color:"#26342E",
    padding:22,font:"15px/1.5 system-ui,sans-serif",display:"grid",gap:14,alignContent:"start"}}>
    <header style={{maxWidth:940}}>
      <div style={{fontSize:12,letterSpacing:2,color:"#81654d",fontWeight:700}}>INK4 / MATERIAL-NATIVE CHARACTER DIRECTING</div>
      <h1 style={{margin:"5px 0",font:"600 clamp(28px,4vw,40px)/1.16 Georgia,serif"}}>
        A traveler in ink · grounded performance
      </h1>
      <p style={{margin:0,maxWidth:800}}>An original articulated ink character crosses a paper landscape.
        Every stride has separate knees, planted contacts, independent sleeves, face acting,
        and continuous camera-space blocking. Scrub backward: no simulation history is required.</p>
    </header>
    <div style={{display:"flex",alignItems:"center",gap:15,flexWrap:"wrap"}}>
      <label style={{display:"grid",gap:5,fontWeight:600}}>Output
        <select aria-label="Output" value={aspect} onChange={e=>{setPlaying(false);setAspect(e.target.value as DirectorAspect)}}
          style={{padding:"9px",minWidth:150}}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={{display:"grid",gap:5,fontWeight:600}}>Preview framing
        <select aria-label="Director preview framing" value={framing}
          onChange={e=>setFraming(e.target.value as "wide"|"figure")}
          style={{padding:"9px",minWidth:160}}>
          <option value="figure">Figure inspection</option>
          <option value="wide">Full film composition</option>
        </select>
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600,marginTop:20}}>
        <input aria-label="Reduced motion" type="checkbox" checked={reduce}
          onChange={e=>{setPlaying(false);setReduce(e.target.checked)}}/>
        Reduced motion
      </label>
    </div>
    <div style={{display:"flex",gap:15,flexWrap:"wrap",alignItems:"center",maxWidth:890}}>
      <label style={{display:"grid",gap:4,fontWeight:600,fontSize:13}}>
        Garment brush detail: {Math.round(foldDetail*100)}%
        <input aria-label="Garment brush detail" type="range" min="0" max="1" step=".05"
          value={foldDetail} onChange={e=>{setPlaying(false);setFoldDetail(Number(e.target.value))}}/>
      </label>
      <label style={{display:"grid",gap:4,fontWeight:600,fontSize:13}}>
        Fold pigment density: {Math.round(foldContrast*100)}%
        <input aria-label="Fold pigment density" type="range" min="0" max="2" step=".05"
          value={foldContrast} onChange={e=>{setPlaying(false);setFoldContrast(Number(e.target.value))}}/>
      </label>
      <label style={{display:"grid",gap:4,fontWeight:600,fontSize:13}}>
        Cloth follow-through: {Math.round(clothAmount*100)}%
        <input aria-label="Cloth follow-through" type="range" min="0" max="1" step=".05"
          value={clothAmount} onChange={e=>{setPlaying(false);setClothAmount(Number(e.target.value))}}/>
      </label>
      <span style={{fontSize:12,color:"#526056",maxWidth:330}}>
        Original pressure-shaped fabric contours follow the articulated robe and sleeves;
        facial expressions stay on the sharp, dry drawing layer.
      </span>
    </div>
    <div data-testid="ink-director-viewport"
      style={{width:film.width*scale,height:film.height*scale,maxWidth:"100%",
        overflow:"hidden",position:"relative",background:"#F3EFE3",
        boxShadow:"0 16px 34px #403a2d25"}}>
      {/* The fixed viewport clips the translated film. Transforming FilmStage
          itself changed its screenshot bounds, pulling Studio UI into the
          visual-review crop even though the native film was correct. */}
      <div style={{width:film.width,height:film.height,
        transform:"translate("+dx+"px,"+dy+"px) scale("+visualScale+")",
        transformOrigin:"top left"}}>
        <FilmStage film={film} frame={frame} renderObject={()=>null} reducedMotion={reduce}
          renderSlot={(content,context)=>{
            if(content.slot!=="ink4-traveler")throw new Error("Unexpected ink director scene: "+content.slot);
            return <InkDirectorFilm aspect={aspect} frame={context.frame}
              reducedMotion={context.reducedMotion} foldDetail={foldDetail}
              foldContrast={foldContrast} clothAmount={clothAmount}
              showCaption={framing==="wide"}/>;
          }}/>
      </div>
    </div>
    <div style={{maxWidth:960,display:"grid",gap:9}}>
      <label style={{display:"grid",gap:5,fontWeight:600}}>Film frame {frame} / 419
        <input aria-label="Film frame" type="range" min="0" max="419" step="1" value={frame}
          onChange={e=>{setFrame(Number(e.target.value));setPlaying(false)}} />
      </label>
      <nav aria-label="Ink performance checkpoints" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" onClick={()=>{setFrame(frame>=419?0:frame);setPlaying(!playing)}}
          style={{padding:"9px 14px",minHeight:40,border:"1px solid #748079",background:"#29382f",color:"white"}}>
          {playing?"Pause":frame>=419?"Replay":"Play"}
        </button>
        {keyframes.map(([name,value])=><button key={name} type="button"
          onClick={()=>{setFrame(value);setPlaying(false)}}
          style={{padding:"9px 12px",minHeight:40,border:"1px solid #98a199",background:"#fffdf5",color:"#2f3a31"}}>
          {name}</button>)}
      </nav>
    </div>
    <p style={{fontSize:13,maxWidth:880,margin:0,color:"#4f6258"}}>
      IK assumes authored limb lengths and exact rig pivots. This is a performance/structure proof, not film-quality
      character approval: gesture polish, prop contact, live video export and artist reference comparisons remain release gates.
    </p>
  </main>;
}

/** Real export surface: the encoder seeks this one film frame rather than capturing
 * the interactive studio's independent, local Play button state. */
function InkDirectorExport({aspect}:{aspect:DirectorAspect}) {
  const [frame,setFrame]=useState(0);
  const compiled=useMemo(()=>compileFilm(document,{outputId:aspect}),[aspect]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(d=>d.message).join("\n")}</pre>;
  const portrait=aspect==="portrait";
  const manifest:VideoExportManifest={
    schemaVersion:1,id:"ink-director-"+aspect,
    width:portrait?540:960,height:portrait?960:540,
    durationFrames:420,fps:{num:30,den:1},
  };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <FilmStage film={compiled.film} frame={frame} renderObject={()=>null}
      renderSlot={(content,context)=>{
        if(content.slot!=="ink4-traveler")throw new Error("Unexpected ink director export: "+content.slot);
        return <InkDirectorFilm aspect={aspect} frame={context.frame}
          reducedMotion={context.reducedMotion}/>;
      }}/>
  </VideoExportStage>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/Character Director",
  id:"video-ink-character-director",component:InkDirectorFilm,parameters:{layout:"fullscreen"}} satisfies Meta<typeof InkDirectorFilm>;
export default meta;
export const ContinuousWalk:StoryObj<typeof meta>={
  name:"Continuous walk, grounded limbs and expressive hold",
  args:{frame:244,aspect:"landscape"},
  render:()=> <Laboratory/>,
};

export const ProductionExport:StoryObj<typeof InkDirectorExport>={
  name:"INK4 · 16:9 frame-exact video export",render:()=> <InkDirectorExport aspect="landscape"/>,
};
export const PortraitExport:StoryObj<typeof InkDirectorExport>={
  name:"INK4 · 9:16 frame-exact video export",render:()=> <InkDirectorExport aspect="portrait"/>,
};
