import {useEffect,useState} from "react";
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
        </select>
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
          intensity={intensity} detail={detail} view={view}/>
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

const meta={title:"Video production/Film Looks/Chinese Ink/ANAT2 Independent Portrait Rebuild",
  id:"video-ink-anat2-portrait-rebuild",component:RebuildAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof RebuildAtelier>;
export default meta;
export const PortraitRebuild:StoryObj<typeof meta>={name:"Fresh painted figure · anatomy + expression"};
export const TwoCharactersAndFiveExpressions:StoryObj<typeof meta>={
  name:"Two original figures · five expression comparison",
  render:()=> <IndependentExpressionAtlas/>,
};
export const FilmTimeFaceMotion:StoryObj<typeof meta>={
  name:"24 fps facial acting and source-space microscopes",
  render:()=> <FacialMotionProof/>,
};
