import {useEffect,useMemo,useRef,useState} from "react";
import {compileFilm} from "../../registry/video/film-document";
import {FilmStage} from "../../registry/video/film-stage";
import {RISO_CINEMATIC_FILM} from "./riso-cinematic-film";
import {RISO_CINEMATIC_BEATS} from "./riso-cinematic-timeline";
import {renderRisoCinematicFilmSlot} from "./riso-cinematic-slot";
import type {RisoAspect} from "./riso-print-demo";

const shots=RISO_CINEMATIC_BEATS.map((beat,i)=>({
  ...beat,start:RISO_CINEMATIC_BEATS.slice(0,i)
    .reduce((sum,b)=>sum+b.duration,0),
}));
const total=shots.reduce((sum,b)=>sum+b.duration,0);
/** RISO64 invokes the SAME production FilmStage + same slot adapter
 * as the portable five-shot source film. Preview owns only transport. */
export function RisoCinematicStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(0);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [playing,setPlaying]=useState(false);
  const initial=useRef(0);
  const compiled=useMemo(()=>compileFilm(RISO_CINEMATIC_FILM,{outputId:aspect}),[aspect]);
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now();
    let raf=0;
    const next=(now:number)=>{
      const at=Math.min(total-1,initial.current+Math.floor((now-start)*24/1000));
      setFrame(at);
      if(at===total-1)setPlaying(false);
      else raf=requestAnimationFrame(next);
    };
    raf=requestAnimationFrame(next);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{
    compiled.diagnostics.map(item=>item.path+": "+item.message).join("\n")
  }</pre>;
  const film=compiled.film;
  const current=[...shots].reverse().find(beat=>frame>=beat.start)!;
  return <main data-km-riso64-studio="" data-km-riso64-frame={frame}
    data-km-riso64-aspect={aspect} data-km-riso64-playing={String(playing)}
    style={{minHeight:"100vh",padding:22,display:"grid",gap:14,
      alignContent:"start",background:"#EBE2D2",color:"#293E53",
      font:"14px/1.5 system-ui,sans-serif"}}>
    <header style={{maxWidth:850}}>
      <div style={{fontWeight:800,letterSpacing:2,fontSize:12}}>
        RISOGRAPH / RISO64 / REAL FIVE-SHOT PRODUCTION FILM
      </div>
      <h1 style={{font:"700 28px Georgia,serif",margin:"5px 0"}}>
        Two drums · one impression · source-native cinematic study
      </h1>
      <p style={{margin:0}}>
        Paper-close camera, an independent cobalt master, a vermilion second pass,
        ink overprint close-up and a finished original plate. 12 seconds, 24 fps.
        All shots use the production FilmStage renderer and physical ink masters.
      </p>
    </header>
    <div data-km-riso64-film-stage=""
      style={{width:film.width,height:film.height,maxWidth:"100%",
        background:"#F2E9D6",overflow:"hidden",boxShadow:"0 12px 32px #24314224"}}>
      <FilmStage film={film} frame={frame} renderObject={()=>null}
        reducedMotion={reducedMotion} renderSlot={renderRisoCinematicFilmSlot}/>
    </div>
    <section aria-label="RISO64 cinematic film controls"
      style={{display:"flex",alignItems:"center",gap:13,flexWrap:"wrap",maxWidth:960}}>
      <label>Output
        <select aria-label="RISO64 output aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 / 960 × 540</option>
          <option value="portrait">9:16 / 540 × 960</option>
        </select>
      </label>
      <button type="button" aria-label={playing?"RISO64 pause film":"RISO64 play film"}
        onClick={()=>{
          if(!playing){initial.current=frame>=total-1?0:frame;setFrame(initial.current);}
          setPlaying(!playing);
        }} style={{border:0,borderRadius:4,padding:"9px 16px",
          color:"#F2E9D6",background:"#293E53",fontWeight:700,cursor:"pointer"}}>
        {playing?"Pause":frame>=total-1?"Replay":"Play"} / 24fps
      </button>
      <label>Absolute film frame {frame} / {total-1}
        <input type="range" min={0} max={total-1} value={frame}
          aria-label="RISO64 absolute film frame" onChange={e=>{
            setPlaying(false);setFrame(Number(e.target.value));
          }}/>
      </label>
      <label>
        <input type="checkbox" aria-label="RISO64 reduce motion"
          checked={reducedMotion} onChange={e=>setReducedMotion(e.target.checked)}/>
        Reduced motion (static full impression)
      </label>
    </section>
    <nav aria-label="RISO64 cinematic shot navigation"
      style={{display:"flex",gap:8,flexWrap:"wrap",maxWidth:1030}}>
      {shots.map(({id,start},i)=><button type="button" key={id}
        aria-label={"RISO64 shot "+(i+1)+" "+id}
        aria-pressed={current.id===id}
        onClick={()=>{setPlaying(false);setFrame(start);}}
        style={{font:"600 12px system-ui",padding:"7px 10px",
          background:current.id===id?"#293E53":"#FFF9ED",
          color:current.id===id?"#FFF9ED":"#293E53",
          border:"1px solid #A2A7A5",borderRadius:4,cursor:"pointer"}}>
        {i+1} · {id.replace(/-/g," ")}
      </button>)}
    </nav>
    <p style={{margin:0,fontSize:12}}>
      Shot {shots.indexOf(current)+1} of 5 · {current.id} · 288 frames / 12 seconds.
      No audio and no measured physical press profile. The original native
      paper-open fibre cuts, 20 source cubics and two ink drums remain unchanged.
    </p>
  </main>;
}
