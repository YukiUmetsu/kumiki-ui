import {useEffect,useState} from "react";
import {InkAnatomicalPortraitFilm,INK_ANAT2_PROOF_FRAMES} from "./ink-anatomical-portrait-film";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {InkAnatomicalPortrait,INK_PORTRAIT_CHARACTERS,INK_PORTRAIT_EMOTIONS,
  inkPortraitAnatomy} from "./ink-anatomical-portrait";
import type {InkPortraitCharacter,InkPortraitEmotion,InkPortraitView} from "./ink-anatomical-portrait";

const inkPage={background:"#e9dfce",color:"#2e2a24",minHeight:"100vh",
  fontFamily:"system-ui, sans-serif",padding:"24px"} as const;
const selectStyle={padding:"7px 11px",fontSize:14,background:"#faf2e3",
  border:"1px solid #b8a68c",color:"#2e2a24",borderRadius:3} as const;
const framed={background:"#f4ebd9",border:"1px solid #c6b59d",
  boxShadow:"0 12px 35px #33281b15"} as const;
const field={display:"grid",gap:5,fontSize:13,fontWeight:600} as const;

function RebuildAtelier(){
  const [character,setCharacter]=useState<InkPortraitCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkPortraitEmotion>("neutral");
  const [intensity,setIntensity]=useState(.85);
  const [detail,setDetail]=useState(1);
  const [headScale,setHeadScale]=useState(.48);
  const [view,setView]=useState<InkPortraitView>("bust");
  const study=inkPortraitAnatomy(character,emotion,intensity);
  return <main style={inkPage}>
    <header style={{maxWidth:1000}}>
      <p style={{letterSpacing:2,fontSize:11,fontWeight:700}}>CHINESE INK / ANAT2 / NEW DRAWING</p>
      <h1 style={{font:"normal 34px Georgia,serif",margin:"10px 0"}}>Independent figure portrait atelier</h1>
      <p style={{maxWidth:850,lineHeight:1.6}}>
        New face mesh, silhouette, headwear, hair, robe and separate ink glazes.
        No paths from the previous Shanshui reader were reused. ANAT1 supplies
        facial bone landmarks; EXPR1 moves the actual drawn eye, brow and lip anatomy.
        Source references: Zeng Jing and Ren Bonian. Experimental art, not approved portrait fidelity.
      </p>
    </header>
    <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"end",margin:"18px 0"}}>
      <label style={field}>Character
        <select aria-label="Ink rebuilt character" value={character} style={selectStyle}
          onChange={e=>setCharacter(e.target.value as InkPortraitCharacter)}>
          {INK_PORTRAIT_CHARACTERS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={field}>Expression
        <select aria-label="Ink rebuilt expression" value={emotion} style={selectStyle}
          onChange={e=>setEmotion(e.target.value as InkPortraitEmotion)}>
          {INK_PORTRAIT_EMOTIONS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={field}>Camera
        <select aria-label="Ink rebuilt camera" value={view} style={selectStyle}
          onChange={e=>setView(e.target.value as InkPortraitView)}>
          <option value="bust">Head and shoulders</option>
          <option value="face">Native face microscope</option>
          <option value="robe">Native robe and sleeve microscope</option>
        </select>
      </label>
      <label style={field}>Head-to-silk anatomy ratio · {headScale.toFixed(2)}
        <input aria-label="Ink rebuilt head scale" type="range"
          min=".38" max=".75" step=".01" value={headScale}
          onChange={e=>setHeadScale(Number(e.target.value))}/>
      </label>
      <label style={field}>EXPR1 intensity · {Math.round(intensity*100)}%
        <input aria-label="Ink rebuilt expression intensity" type="range"
          min="0" max="1" step=".05" value={intensity}
          onChange={e=>setIntensity(Number(e.target.value))}/>
      </label>
      <label style={field}>Brush fibre detail · {Math.round(detail*100)}%
        <input aria-label="Ink rebuilt brush detail" type="range"
          min=".25" max="1" step=".05" value={detail}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
    </div>
    <section style={{display:"grid",gridTemplateColumns:"minmax(230px,600px) minmax(220px,450px)",
      alignItems:"start",gap:24,maxWidth:1120}}>
      <div data-testid="ink-anat2-live" style={framed}>
        <InkAnatomicalPortrait character={character} emotion={emotion}
          intensity={intensity} detail={detail} view={view} headScale={headScale}/>
      </div>
      <div style={{display:"grid",gap:14}}>
        <div style={{...framed,padding:16}}>
          <h2 style={{font:"24px Georgia,serif",margin:"0 0 12px"}}>Facial construction</h2>
          <output data-testid="ink-anat2-metrics" style={{display:"grid",gap:7,fontSize:13}}>
            <span>ANAT1 facial width: {study.measurements.zyZy.toFixed(1)} mm</span>
            <span>ANAT1 nose width: {study.measurements.alAl.toFixed(1)} mm</span>
            <span>ANAT1 eye width: {study.measurements.exEn.toFixed(1)} mm</span>
            <span>EXPR1 inner brow: {study.features.browInner.toFixed(3)} eye widths</span>
            <span>EXPR1 upper lid opening: {study.features.eyeOpen.toFixed(2)}×</span>
            <span>EXPR1 cheek lift: {study.features.cheekRaise.toFixed(3)}</span>
            <span>EXPR1 lip corner: {study.features.mouthCorner.toFixed(3)}</span>
            <span>EXPR1 active creases: {study.expressionMarks.map(x=>x.id).join(", ")||"none"}</span>
          </output>
        </div>
        <div style={{...framed,padding:16,fontSize:13,lineHeight:1.6}}>
          <b>Visual review: ART HOLD</b>
          <p>Evaluate 1×, face microscope and true 960×540 playback against licensed
            original artwork. Technical tests and self-authored vectors do not establish
            likeness or real ink contact with paper.</p>
          <a href="https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/"
            target="_blank" rel="noreferrer" style={{color:"#604c36"}}>Zeng Jing · Pan Qintai (UMMA)</a>
          <p style={{marginBottom:0}}><a href="https://www.cafamuseum.org/en/exhibit/detail/871"
            target="_blank" rel="noreferrer" style={{color:"#604c36"}}>
            Ren Bonian · figure-painting collection (CAFAM)</a></p>
        </div>
      </div>
    </section>
  </main>;
}

function IndependentExpressionAtlas(){
  return <main style={inkPage}>
    <h1 style={{font:"normal 34px Georgia,serif"}}>Two independently redrawn characters · live EXPR1 poses</h1>
    <p>Every cell uses the same renderable character API. These are original ANAT1 heads,
      not clones of the pre-existing film figures. Expressions move mesh vertices.</p>
    {INK_PORTRAIT_CHARACTERS.map(c=><section key={c} data-ink-atlas-character={c}>
      <h2 style={{font:"normal 24px Georgia,serif"}}>{c==="elder"?"Elder hermit":"Young scholar"}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(155px,1fr))",gap:12}}>
        {INK_PORTRAIT_EMOTIONS.map(e=><figure key={e} style={{...framed,margin:0}}>
          <InkAnatomicalPortrait character={c} emotion={e} intensity={.9}
            detail={1} view="face"/>
          <figcaption style={{padding:"8px 10px",fontSize:13,fontWeight:600}}>{e}</figcaption>
        </figure>)}
      </div>
    </section>)}
  </main>;
}

const cue=(f:number)=>{
  const t=Math.max(0,Math.min(96,f));
  const smooth=(x:number)=>x*x*(3-2*x);
  if(t<=12)return smooth(t/12);
  if(t<=60)return 1;
  if(t<=84)return 1-smooth((t-60)/24);
  return 0;
};
function FacialMotionProof(){
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [character,setCharacter]=useState<InkPortraitCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkPortraitEmotion>("smile");
  useEffect(()=>{
    if(!playing)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduced){setPlaying(false);return;}
    const start=performance.now(),first=frame;
    let id=0;
    const tick=(now:number)=>{
      const next=Math.min(96,first+Math.max(0,Math.floor((now-start)*24/1000)));
      setFrame(next);
      if(next>=96){setPlaying(false);return;}
      id=requestAnimationFrame(tick);
    };
    id=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(id);
  },[playing]);
  const intensity=cue(frame);
  return <main style={inkPage}>
    <h1 style={{font:"normal 34px Georgia,serif"}}>Character face motion · 24 fps cue</h1>
    <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap",marginBottom:16}}>
      <label style={field}>Character<select aria-label="Film proof character" value={character}
        style={selectStyle} onChange={e=>{setPlaying(false);setCharacter(e.target.value as InkPortraitCharacter);}}>
        {INK_PORTRAIT_CHARACTERS.map(c=><option key={c}>{c}</option>)}</select></label>
      <label style={field}>Emotion<select aria-label="Film proof emotion" value={emotion}
        style={selectStyle} onChange={e=>{setPlaying(false);setEmotion(e.target.value as InkPortraitEmotion);}}>
        {INK_PORTRAIT_EMOTIONS.filter(e=>e!=="neutral").map(c=><option key={c}>{c}</option>)}</select></label>
      <button type="button" onClick={()=>{if(frame>=96)setFrame(0);setPlaying(!playing);}}
        aria-label={playing?"Pause ink animation":"Play ink animation"} style={selectStyle}>
        {playing?"Pause":"Play"}</button>
      <button type="button" onClick={()=>{setPlaying(false);setFrame(0);}} style={selectStyle}>Reset</button>
    </div>
    <label style={{...field,width:530,maxWidth:"100%"}}>Film frame {frame}/96
      <input type="range" aria-label="Ink rebuilt film frame" min="0" max="96"
        value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <output data-testid="ink-anat2-cue-value">EXPR1 activation {Math.round(intensity*100)}%</output>
    <div data-testid="ink-anat2-film-preview" style={{...framed,width:540,marginTop:15}}>
      <InkAnatomicalPortrait character={character} emotion={emotion}
        intensity={intensity} detail={1}/>
    </div>
    <h2 style={{font:"normal 24px Georgia,serif"}}>Deterministic motion contact sheet</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(110px,1fr))",gap:8}}>
      {[0,6,12,60,72,84,96].map(f=><figure key={f} style={{...framed,margin:0}}>
        <InkAnatomicalPortrait character={character} emotion={emotion}
          intensity={cue(f)} view="face"/>
        <figcaption style={{fontSize:12,padding:8}}>{f}f · {Math.round(cue(f)*100)}%</figcaption>
      </figure>)}
    </div>
  </main>;
}


/** Opt-in original-reference microscope. Museums' paintings are not bundled:
 * users inspect the actual owned/licensed/public-domain image locally. */
function HistoricalSourceDesk(){
  const [source,setSource]=useState<string|null>(null);
  const [sourceName,setSourceName]=useState("");
  const [error,setError]=useState("");
  const [character,setCharacter]=useState<InkPortraitCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkPortraitEmotion>("neutral");
  const [view,setView]=useState<InkPortraitView>("face");
  const [headScale,setHeadScale]=useState(.48);
  const [zoom,setZoom]=useState(1);
  const [panX,setPanX]=useState(0);
  const [panY,setPanY]=useState(0);
  const [overlay,setOverlay]=useState(false);
  const [sourceOpacity,setSourceOpacity]=useState(.5);
  useEffect(()=>()=>{if(source)URL.revokeObjectURL(source);},[source]);
  const loadFile=(file:File|undefined)=>{
    if(!file){return;}
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)){
      setError("Only PNG, JPEG, and WebP images are supported.");
      return;
    }
    setError("");
    setSource(URL.createObjectURL(file));
    setSourceName(file.name);
  };
  const sourceImage=source?<img data-testid="ink-anat2-source-image"
    src={source} alt={"Uploaded historical portrait: "+sourceName}
    style={{display:"block",width:"100%",height:"100%",objectFit:"contain",
      transform:'translate('+panX+'px,'+panY+'px) scale('+zoom+')',
      transformOrigin:"50% 50%"}}/>:
    <p style={{margin:20,textAlign:"center",maxWidth:330,fontSize:14}}>
      Load an original historical painting locally to conduct a real same-camera
      comparison. No photograph is embedded or transmitted by this story.
    </p>;
  const drawing=<InkAnatomicalPortrait character={character} emotion={emotion}
    view={view} detail={1} intensity={.9} headScale={headScale}/>;
  const bustHeight=620-(420+(95-420)*headScale/.69);
  const panel={...framed,aspectRatio:view==="face"?"345 / 419":
    view==="robe"?"430 / 202":"540 / "+bustHeight.toFixed(2),
    width:"min(100%,470px)",position:"relative",overflow:"hidden",
    display:"grid",placeItems:"center"} as const;
  return <main data-testid="ink-anat2-historical-source-desk" style={inkPage}>
    <header>
      <h1 style={{font:"normal 34px Georgia,serif",margin:"4px 0 10px"}}>
        ANAT2 · actual-painting same-camera comparison
      </h1>
      <p style={{maxWidth:1050,lineHeight:1.65}}>
        ART HOLD. Compare an authentic source painting's real face, hair, nose,
        brush loading and garment topology against the independently drawn
        ANAT1+EXPR1 SVG. Controls deliberately expose optical differences;
        synthetic tests never constitute reference validation.
      </p>
    </header>
    <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"end",margin:"18px 0"}}>
      <label style={field}>Original painting (local image)
        <input type="file" aria-label="Ink original source image"
          accept="image/png,image/jpeg,image/webp"
          onChange={e=>loadFile(e.currentTarget.files?.[0])}/>
      </label>
      <label style={field}>ANAT2 figure
        <select aria-label="Ink source review character" value={character}
          style={selectStyle} onChange={e=>setCharacter(e.target.value as InkPortraitCharacter)}>
          {INK_PORTRAIT_CHARACTERS.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={field}>Expression
        <select aria-label="Ink source review expression" value={emotion}
          style={selectStyle} onChange={e=>setEmotion(e.target.value as InkPortraitEmotion)}>
          {INK_PORTRAIT_EMOTIONS.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={field}>Shared inspection camera
        <select aria-label="Ink source review camera" value={view}
          style={selectStyle} onChange={e=>setView(e.target.value as InkPortraitView)}>
          <option value="bust">Figure and garment</option>
          <option value="face">Native face microscope</option>
          <option value="robe">Native robe and sleeves</option>
        </select>
      </label>
      <label style={field}>ANAT2 head/robe proportion · {headScale.toFixed(2)}
        <input type="range" aria-label="Ink source head proportion"
          min=".38" max=".75" step=".01" value={headScale}
          onChange={e=>setHeadScale(Number(e.target.value))}/>
      </label>
      <label style={field}>Reference zoom · {zoom.toFixed(2)}×
        <input aria-label="Ink original source zoom" type="range" min="1" max="4"
          step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>
      </label>
      <label style={field}>Reference horizontal position · {panX}
        <input aria-label="Ink original horizontal pan" type="range" min="-150" max="150"
          value={panX} onChange={e=>setPanX(Number(e.target.value))}/>
      </label>
      <label style={field}>Reference vertical position · {panY}
        <input aria-label="Ink original vertical pan" type="range" min="-150" max="150"
          value={panY} onChange={e=>setPanY(Number(e.target.value))}/>
      </label>
      <label style={{...field,alignSelf:"center"}}>
        <span>Source-image registration overlay</span>
        <input type="checkbox" aria-label="Ink source overlay"
          checked={overlay} onChange={e=>setOverlay(e.target.checked)}/>
      </label>
      <label style={field}>Reference overlay opacity · {Math.round(sourceOpacity*100)}%
        <input type="range" aria-label="Ink source overlay opacity"
          min="0" max="1" step=".05" value={sourceOpacity}
          onChange={e=>setSourceOpacity(Number(e.target.value))}/>
      </label>
    </div>
    {error&&<p role="alert" style={{color:"#8b3326"}}>{error}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(240px,470px))",
      gap:16,alignItems:"start"}}>
      <figure style={{margin:0}}>
        <figcaption style={{marginBottom:8,fontWeight:600}}>
          Original image · {sourceName||"no source provided"}
        </figcaption>
        <div data-testid="ink-anat2-source-window" style={panel}>{sourceImage}</div>
      </figure>
      <figure style={{margin:0}}>
        <figcaption style={{marginBottom:8,fontWeight:600}}>
          Live ANAT2 source-space reconstruction
        </figcaption>
        <div data-testid="ink-anat2-paint-window" style={panel}>
          {drawing}
          {overlay&&source&&<div data-testid="ink-anat2-registration-overlay"
            style={{position:"absolute",inset:0,opacity:sourceOpacity,pointerEvents:"none",
              overflow:"hidden",mixBlendMode:"multiply"}}>
            {sourceImage}
          </div>}
        </div>
      </figure>
    </div>
    <p style={{maxWidth:920,fontSize:13,lineHeight:1.6}}>
      Reference imagery stays on this device and is released on unmount.
      The image pan and zoom are manually controlled; the panels are not automatically
      registered, and a matching viewBox does not establish historic likeness.
      Compare visible true nose alae, eyelid occlusion, chin/lip relief, pigment
      feathering, separated beard locks, and the direction of each cloth fold.
    </p>
    <p style={{fontSize:13}}>
      Original studies:{" "}
      <a href="https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/"
        target="_blank" rel="noreferrer">Zeng Jing · Pan Qintai (UMMA)</a>
      {" · "}
      <a href="https://commons.wikimedia.org/wiki/File:Zeng_Jing_(Tseng_Ching)_-_Portrait_of_Pan_Qintai_-_Google_Art_Project.jpg"
        target="_blank" rel="noreferrer">
        Pan Qintai · high-resolution public-domain original (Wikimedia)
      </a>
      {" · "}
      <a href="https://www.metmuseum.org/art/collection/search/39715"
        target="_blank" rel="noreferrer">Ren Bonian · Scholar on a Rock (Met)</a>
      {" · "}
      <a href="https://www.christies.com.cn/en/lot/ren-yi-ren-bonian-1840-1895-portrait-of-6346442/"
        target="_blank" rel="noreferrer">Ren Yi · Portrait of Yunfeng (Christie's)</a>
    </p>
  </main>;
}

/**
 * Dedicated INK1 pigment-contact test bed: from the original stroke geometry,
 * not a screen-aligned animated texture. All 4 separate authored INK1
 * gestures and their multiple bristles remain live at every microscope zoom.
 */
function RobePressureMicroscopePanel(){
  const [detail,setDetail]=useState(1);
  const [emotion,setEmotion]=useState<InkPortraitEmotion>("neutral");
  return <main data-testid="ink-anat2-robe-pressure-microscope" style={inkPage}>
    <p style={{letterSpacing:2,fontSize:11,fontWeight:700}}>CHINESE INK / ANAT2 / INK1 NATIVE BRUSH</p>
    <h1 style={{font:"normal 34px Georgia,serif",margin:"6px 0"}}>
      Ming folded-silk brushwork · dynamic INK1 microscope
    </h1>
    <p style={{maxWidth:1080,lineHeight:1.65}}>
      Four independent native INK1 pigment gestures per figure:
      unequal loaded and lifted brush widths, pace, opaque core, dry paper pores,
      feathering bristles and transparent underglazes. This is the registered INK1
      implementation, not a newly invented uniform-stroke substitute.
      Compare 1× silhouette coherence with an optically enlarged robe crop.
      Experimental material, NOT approved art.
    </p>
    <div style={{display:"flex",gap:20,flexWrap:"wrap",margin:"16px 0 26px"}}>
      <label style={field}>Paper-fibre and pressure detail · {Math.round(detail*100)}%
        <input aria-label="Ink robe pressure detail" type="range" min=".25"
          max="1" step=".05" value={detail}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
      <label style={field}>Same-person FACS action
        <select aria-label="Ink robe pressure expression" style={selectStyle}
          value={emotion} onChange={e=>setEmotion(e.target.value as InkPortraitEmotion)}>
          {INK_PORTRAIT_EMOTIONS.map(e=><option key={e}>{e}</option>)}
        </select>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(220px,540px))",
      columnGap:20,rowGap:30,maxWidth:1100}}>
      {INK_PORTRAIT_CHARACTERS.map(character=><section key={character}
        data-ink-robe-inspector={character} style={{...framed,overflow:"hidden"}}>
        <h2 style={{font:"normal 23px Georgia,serif",margin:"14px 18px"}}>
          {character==="scholar"?"Young scholar":"Elder scholar"} · cloth microscopy
        </h2>
        <div data-ink-robe-camera="robe">
          <InkAnatomicalPortrait character={character} emotion={emotion}
            intensity={.8} detail={detail} view="robe"/>
        </div>
        <div style={{padding:18,background:"#ede4d5"}}>
          <h3 style={{font:"normal 17px Georgia,serif",margin:"0 0 8px"}}>
            Same drawing · full bust and cap contact
          </h3>
          <div data-ink-robe-camera="bust" style={{maxWidth:330,margin:"auto"}}>
            <InkAnatomicalPortrait character={character} emotion={emotion}
              intensity={.8} detail={detail} view="bust"/>
          </div>
        </div>
      </section>)}
    </div>
    <p style={{fontSize:13,maxWidth:1000,lineHeight:1.6}}>
      Compare the slender crossing lapels, irregular sleeve strokes,
      feathered wash, fresh head-to-shoulder proportions and cap shape
      with high-resolution public-domain Chinese figure paintings.
      The physical bristle stroke model is an approximation and may not
      match an original brush's wet-paper response.
    </p>
  </main>;
}

/**
 * FilmStage-sized 24 fps candidate, NOT replacement for existing canonical
 * river-scholar rig. This scene has a genuinely composited transparent
 * original actor between atmosphere and foreground in the Shanshui painter.
 */
function NativeActorFilmProof(){
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [reduced,setReduced]=useState(false);
  const [character,setCharacter]=useState<InkPortraitCharacter>("scholar");
  const [emotion,setEmotion]=useState<Exclude<InkPortraitEmotion,"neutral">>("smile");
  useEffect(()=>{
    if(!playing)return;
    if(reduced||window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      setPlaying(false);return;
    }
    const start=performance.now(),origin=frame;
    let id=0;
    const tick=(now:number)=>{
      const next=Math.min(INK_ANAT2_PROOF_FRAMES-1,
        origin+Math.max(0,Math.floor((now-start)*24/1000)));
      setFrame(next);
      if(next>=INK_ANAT2_PROOF_FRAMES-1)setPlaying(false);
      else id=requestAnimationFrame(tick);
    };
    id=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(id);
  },[playing,reduced]);
  return <main style={inkPage}>
    <p style={{fontSize:11,fontWeight:700,letterSpacing:2}}>
      ANAT2 / NATIVE 960×540 / OPTIONAL ART HOLD
    </p>
    <h1 style={{font:"normal 34px Georgia,serif",margin:"7px 0 13px"}}>
      New figure inside a living Shanshui shot
    </h1>
    <p style={{lineHeight:1.65,maxWidth:990}}>
      Genuine 96-frame opt-in scene: ANAT2 original scholar or elder appears
      as a transparent source-space ink actor over the registered Shanshui
      atmosphere and behind actual painterly foreground, with a single
      deterministic 24-fps EXPR1 facial cue, body sway and breathing.
      This is a cinematographic comparison stage, not proof of historical
      likeness or a replacement for the existing production actor.
    </p>
    <div style={{display:"flex",gap:18,flexWrap:"wrap",alignItems:"end",marginBottom:16}}>
      <label style={field}>Actor
        <select aria-label="Ink ANAT2 film actor" value={character}
          style={selectStyle} onChange={e=>{setPlaying(false);
            setCharacter(e.target.value as InkPortraitCharacter)}}>
          {INK_PORTRAIT_CHARACTERS.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={field}>Expression
        <select aria-label="Ink ANAT2 film emotion" value={emotion}
          style={selectStyle} onChange={e=>{setPlaying(false);
            setEmotion(e.target.value as Exclude<InkPortraitEmotion,"neutral">)}}>
          {INK_PORTRAIT_EMOTIONS.filter(e=>e!=="neutral").map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={{...field,alignSelf:"center"}}>
        <span>Reduced motion</span>
        <input type="checkbox" aria-label="Ink ANAT2 film reduced motion"
          checked={reduced} onChange={e=>{setPlaying(false);setReduced(e.target.checked)}}/>
      </label>
      <button type="button" style={selectStyle}
        onClick={()=>{if(frame>=INK_ANAT2_PROOF_FRAMES-1)setFrame(0);
          setPlaying(!playing);}}
        aria-label={playing?"Pause ANAT2 film":"Play ANAT2 film"}>
        {playing?"Pause":"Play"}
      </button>
    </div>
    <div style={{width:960,maxWidth:"100%",overflowX:"auto"}}>
      <InkAnatomicalPortraitFilm frame={frame} character={character}
        emotion={emotion} reducedMotion={reduced}/>
    </div>
    <label style={{...field,marginTop:16,width:960,maxWidth:"100%"}}>
      Native video frame {frame}/{INK_ANAT2_PROOF_FRAMES-1}
      <input type="range" min="0" max={INK_ANAT2_PROOF_FRAMES-1}
        aria-label="Ink ANAT2 film seek" value={frame}
        onChange={e=>{setPlaying(false);setFrame(Number(e.target.value))}}/>
    </label>
    <p style={{fontSize:13,maxWidth:960,lineHeight:1.65}}>
      Art release gate: compare the actor at 1× and 3× with
      historical paintings; inspect foreground occlusion, physical
      shoulder contact, head-to-robe rhythm and skin wash across all 96 frames.
      Technical or screenshot success does not clear the existing ART HOLD.
    </p>
  </main>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/ANAT2 Independent Portrait Rebuild",
  id:"video-ink-anat2-portrait-rebuild",component:RebuildAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof RebuildAtelier>;
export default meta;
export const PortraitRebuild:StoryObj<typeof meta>={name:"Fresh painted figure · anatomy + expression"};
export const TwoCharactersAndFiveExpressions:StoryObj<typeof meta>={
  name:"Two original figures · five expression comparison",
  render:()=> <IndependentExpressionAtlas/>,
};
export const HistoricalPaintingReview:StoryObj<typeof meta>={
  name:"Authentic portrait reference · local-image A/B and optical overlay (ART HOLD)",
  render:()=> <HistoricalSourceDesk/>,
};
export const RobePressureMicroscope:StoryObj<typeof meta>={
  name:"INK1 loaded silk lapels · sleeve pressure and paper-fibre microscope",
  render:()=> <RobePressureMicroscopePanel/>,
};
export const OriginalFilmActorProof:StoryObj<typeof meta>={
  name:"96-frame real Shanshui composition · new ANAT2 actor (ART HOLD)",
  render:()=> <NativeActorFilmProof/>,
};
export const FilmTimeFaceMotion:StoryObj<typeof meta>={
  name:"24 fps facial acting and source-space microscopes",
  render:()=> <FacialMotionProof/>,
};
