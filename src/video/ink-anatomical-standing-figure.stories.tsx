import {useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {InkAnatomicalStandingFigure} from "./ink-anatomical-standing-figure";
import type {InkPortraitCharacter,InkPortraitEmotion} from "./ink-anatomical-portrait";
import {INK_PORTRAIT_EMOTIONS,INK_PORTRAIT_CHARACTERS} from "./ink-anatomical-portrait";

const page={minHeight:"100vh",padding:24,background:"#e9dfce",
  color:"#2e2a24",fontFamily:"system-ui,sans-serif"} as const;
const select={padding:8,border:"1px solid #b8a68c",background:"#faf2e3",
  color:"#2e2a24",fontSize:13} as const;
const label={display:"grid",gap:6,fontSize:13,fontWeight:600} as const;

/** Native material/editor studio, not a rendered historical museum image. */
function StandingAtelier(){
  const [character,setCharacter]=useState<InkPortraitCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkPortraitEmotion>("neutral");
  const [headScale,setHeadScale]=useState(.48);
  const [detail,setDetail]=useState(1);
  const [frame,setFrame]=useState(12);
  const [reduced,setReduced]=useState(false);
  return <main data-testid="ink-anat2-standing-figure-studio" style={page}>
    <p style={{fontSize:11,letterSpacing:2,fontWeight:700}}>
      ORIGINAL CHINESE INK / ANAT2 / SOURCE-BUILT FULL STANDING ART HOLD
    </p>
    <h1 style={{font:"normal 35px Georgia,serif",margin:"8px 0 14px"}}>
      Standing late-Ming scholar · source-space figure and live cloth
    </h1>
    <p style={{lineHeight:1.65,maxWidth:960}}>
      An original 540×1080 standing figure in source space, built beneath
      the existing independent ANAT1/EXPR1 painted face and wrapped silk.
      Two fixed sandal soles, continuous long cotton robe, 82 gravity-following
      fibers, 46 dry paper lifts, six separate native INK1 brush gestures,
      five oppositional staff-holding fingers and ten articulated bamboo
      nodes. No pre-existing walking-rig silhouette is duplicated. The feet
      are stationary: this is a standing portrait, not a fake walk cycle.
      This remains experimental, not approved historical craft.
    </p>
    <div style={{display:"flex",flexWrap:"wrap",gap:18,alignItems:"end",marginBottom:20}}>
      <label style={label}>Character
        <select value={character} aria-label="Ink standing character" style={select}
          onChange={e=>setCharacter(e.target.value as InkPortraitCharacter)}>
          {INK_PORTRAIT_CHARACTERS.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={label}>Expression
        <select value={emotion} aria-label="Ink standing emotion" style={select}
          onChange={e=>setEmotion(e.target.value as InkPortraitEmotion)}>
          {INK_PORTRAIT_EMOTIONS.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={label}>Face-to-robe source scale · {headScale.toFixed(2)}
        <input aria-label="Ink standing head scale" type="range" min=".38"
          max=".75" step=".01" value={headScale}
          onChange={e=>setHeadScale(Number(e.target.value))}/>
      </label>
      <label style={label}>Brush detail · {Math.round(detail*100)}%
        <input aria-label="Ink standing detail" type="range" min=".25"
          max="1" step=".05" value={detail}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
      <label style={label}>Absolute frame · {frame}/95
        <input aria-label="Ink standing frame" type="range" min="0"
          max="95" value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label style={label}>Reduced motion
        <input aria-label="Ink standing reduced motion" type="checkbox"
          checked={reduced} onChange={e=>setReduced(e.target.checked)}/>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(300px,540px) minmax(220px,350px)",
      gap:22,alignItems:"start"}}>
      <div data-testid="ink-anat2-standing-live"
        style={{width:"100%",maxWidth:540,
          background:"#f2e6d3",boxShadow:"0 12px 34px #483b2525"}}>
        <InkAnatomicalStandingFigure character={character} emotion={emotion}
          detail={detail} frame={frame} reducedMotion={reduced}
          intensity={.95} headScale={headScale}/>
      </div>
      <aside style={{fontSize:13,lineHeight:1.72}}>
        <h2 style={{font:"normal 22px Georgia,serif"}}>Visual gates · not approved</h2>
        <p>The figure is separately painted in native SVG rather than a
          bitmapped cutout. The complete standing form is matched to the
          smaller head, yet the original eyelid and body painting still need
          critical historical comparison at native and magnified views.</p>
        <p>Staff and fingers require physical contact review at 3×; robe must
          carry a real fold hierarchy and foot pressure. Technical continuity
          tests are NOT an artistic release criterion.</p>
        <a href="https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/"
          rel="noreferrer" target="_blank">UMMA · Zeng Jing, Portrait of Pan Qintai (1621)</a>
      </aside>
    </div>
  </main>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/ANAT2 Original Standing Figure",
  id:"video-ink-anat2-standing-figure",component:StandingAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof StandingAtelier>;
export default meta;
export const CottonRobeAndStaff:StoryObj<typeof meta>={
  name:"Source-built standing figure · hand, 10 bamboo nodes and six native INK1 gestures",
};
