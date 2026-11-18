import {useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {
  InkReferenceCharacterRedraw,INK_REFERENCE_EXPRESSIONS,
} from "./ink-reference-character-redraw";
import type {InkReferenceExpression} from "./ink-reference-character-redraw";

const page={minHeight:"100vh",padding:24,background:"#e9dfce",color:"#2e2a24",
  fontFamily:"system-ui,sans-serif"} as const;
const control={display:"grid",gap:6,fontSize:13,fontWeight:600} as const;
const select={padding:8,border:"1px solid #b8a68c",background:"#faf2e3",
  color:"#2e2a24",fontSize:13} as const;
const card={background:"#f5ecdd",border:"1px solid #cbbda8",padding:14,
  boxShadow:"0 8px 22px #493c2920"} as const;
const sources=[
  {
    id:"scholar",
    title:"Chentung Liang Cheng · 1903",
    image:"https://upload.wikimedia.org/wikipedia/commons/a/a8/Chentung_Liang_Cheng_cph.3a44343.jpg",
    href:"https://commons.wikimedia.org/wiki/File:Chentung_Liang_Cheng_cph.3a44343.jpg",
    credit:"Library of Congress, cph.3a44343 · Public Domain Mark / no known publication restrictions.",
    note:"Three-quarter head turn, unequal eye foreshortening, moustache roots, nose-to-cheek transition and a natural shoulder/neck relationship. Used for anatomy and gaze only; not as a costume or likeness template.",
    alt:"1903 three-quarter seated photographic portrait of Chentung Liang Cheng."
  },
  {
    id:"elder",
    title:"Elderly Chinese man, possibly a scholar · 1860",
    image:"https://cdn.loc.gov/service/pnp/cph/3b30000/3b32000/3b32400/3b32425r.jpg",
    href:"https://commons.wikimedia.org/wiki/File:Elderly_Chinese_man,_possibly_a_scholar,_three-quarter_length_portrait,_seated,_facing_front,_holding_pipe_in_right_hand;_includes_Chinese_language_characters_on_back_LCCN2011660679.jpg",
    credit:"Library of Congress, LCCN 2011660679 · no known restrictions on publication; public-domain work.",
    note:"Older facial planes and beard silhouette. Seated balance, robe weight and the pipe-holding hand are logged for the next full-body/hand pass; the hand reference is useful for thumb opposition and finger contact, not for copying the original drawing.",
    alt:"1860 charcoal drawing of an elderly Chinese man, possibly a scholar, seated and holding a pipe."
  },
  {
    id:"beard",
    title:"Three-quarter face portrait of a bearded man · 1860",
    image:"https://cdn.loc.gov/service/pnp/cph/3c30000/3c36000/3c36900/3c36970v.jpg",
    href:"https://commons.wikimedia.org/wiki/File:Three-quarter_face_portrait_of_man_with_beard_LCCN2006688331.jpg",
    credit:"Library of Congress, LCCN 2006688331 · Public Domain Mark 1.0; no known restrictions on publication.",
    note:"High-resolution beard-root direction, moustache-to-cheek transition, orbital shadow and three-quarter light. The sitter's identity and ethnicity are not asserted; this is a facial-hair and lighting study only.",
    alt:"1860 hand-coloured tintype, three-quarter face portrait of an unidentified bearded man."
  },
] as const;

function ReferenceAtelier(){
  const [emotion,setEmotion]=useState<InkReferenceExpression>("neutral");
  const [intensity,setIntensity]=useState(.8);
  const [detail,setDetail]=useState(1);
  return <main style={page} data-testid="ink-anat3-reference-atelier">
    <p style={{fontSize:11,letterSpacing:2,fontWeight:700}}>
      ORIGINAL CHINESE INK / ANAT3 / INDEPENDENT REFERENCE-LED REDRAW
    </p>
    <h1 style={{font:"normal 36px Georgia,serif",margin:"8px 0 12px"}}>
      Character anatomy from source, not from the existing cast
    </h1>
    <p style={{maxWidth:1050,lineHeight:1.7}}>
      Two new character-head studies are constructed from the ANAT1 468-point
      facial mesh and EXPR1 expression deformation. Projected landmarks drive
      the face contour, eyes, brows, nose and lips; FACS drives gaze and
      expression creases. No prior Shanshui or ANAT2 portrait paths are reused.
      Historical ink painting remains the style anchor; archival photographs
      supply anatomy and light, not a likeness to reproduce.
    </p>
    <div style={{display:"flex",gap:22,alignItems:"end",flexWrap:"wrap",margin:"18px 0 22px"}}>
      <label style={control}>Expression
        <select aria-label="Reference redraw expression" style={select}
          value={emotion} onChange={e=>setEmotion(e.target.value as InkReferenceExpression)}>
          {INK_REFERENCE_EXPRESSIONS.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label style={control}>Expression intensity · {intensity.toFixed(2)}
        <input aria-label="Reference redraw intensity" type="range" min="0" max="1"
          step=".05" value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/>
      </label>
      <label style={control}>Ink detail · {Math.round(detail*100)}%
        <input aria-label="Reference redraw detail" type="range" min=".25" max="1"
          step=".05" value={detail} onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(260px,1fr))",gap:20}}>
      <section style={card} data-testid="ink-anat3-scholar">
        <h2 style={{font:"normal 24px Georgia,serif",margin:"0 0 6px"}}>Scholar · three-quarter study</h2>
        <p style={{fontSize:12,lineHeight:1.55,minHeight:58}}>
          Built around the 1903 three-quarter facial turn: narrow moustache,
          anatomically projected eye foreshortening, a tall scholar headcloth and a restrained
          cotton cross-collar. The sitter is not reproduced.
        </p>
        <div style={{maxWidth:360,margin:"0 auto"}}>
          <InkReferenceCharacterRedraw character="scholar" emotion={emotion}
            intensity={intensity} detail={detail}/>
        </div>
        <p style={{fontSize:11,letterSpacing:1,fontWeight:700}}>
          ANAT1 LANDMARKS · EXPR1 {emotion.toUpperCase()}
        </p>
      </section>
      <section style={card} data-testid="ink-anat3-elder">
        <h2 style={{font:"normal 24px Georgia,serif",margin:"0 0 6px"}}>Elder · beard and lower-face study</h2>
        <p style={{fontSize:12,lineHeight:1.55,minHeight:58}}>
          A separate, broader face and lower-third construction: rounded cap,
          deepened malar/jaw wash, split beard locks and age creases. The
          1860 charcoal drawing informs age and beard structure; seated gesture, sleeve gravity and pipe-hand contact are studied separately in ANAT4.
        </p>
        <div style={{maxWidth:360,margin:"0 auto"}}>
          <InkReferenceCharacterRedraw character="elder" emotion={emotion}
            intensity={intensity} detail={detail}/>
        </div>
        <p style={{fontSize:11,letterSpacing:1,fontWeight:700}}>
          ANAT1 LANDMARKS · EXPR1 {emotion.toUpperCase()}
        </p>
      </section>
    </div>
    <section style={{marginTop:28}}>
      <h2 style={{font:"normal 27px Georgia,serif"}}>Newly studied source references</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(220px,1fr))",gap:16}}>
        {sources.map(source=><article key={source.id} style={card}>
          <div style={{height:270,background:"#e5dac8",display:"grid",placeItems:"center"}}>
            <img src={source.image} alt={source.alt} loading="lazy"
              referrerPolicy="no-referrer"
              style={{maxWidth:"100%",maxHeight:270,objectFit:"contain"}}/>
          </div>
          <h3 style={{font:"normal 18px Georgia,serif",margin:"12px 0 5px"}}>{source.title}</h3>
          <p style={{fontSize:11,color:"#6c6256",lineHeight:1.5}}>{source.credit}</p>
          <p style={{fontSize:12,lineHeight:1.6}}>{source.note}</p>
          <a href={source.href} target="_blank" rel="noreferrer"
            style={{fontSize:12,color:"#514537"}}>Open source record ↗</a>
        </article>)}
      </div>
    </section>
    <section style={{...card,marginTop:22}}>
      <h2 style={{font:"normal 23px Georgia,serif",marginTop:0}}>Identity continuity</h2>
      <p style={{fontSize:13,lineHeight:1.7}}>
        The three approved teacher paintings remain the canonical identity and pose ground truth:
        Misty Hermit, Riverside Scholar and Mountain Trail. These archival sitters are separate
        anatomy and brush-craft references only; this study is not a replacement or an identity match.
        The approved source paintings are not staged in this repository or the accessible file library,
        so no source-relative landmark or pose claim is made here.
      </p>
    </section>
    <section style={{...card,marginTop:22}}>
      <h2 style={{font:"normal 23px Georgia,serif",marginTop:0}}>Style and craft decisions</h2>
      <ul style={{lineHeight:1.75,fontSize:13,paddingLeft:20}}>
        <li>Style anchor: <a href="https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/" target="_blank" rel="noreferrer">Zeng Jing, Portrait of Pan Qintai (1621)</a>. The museum image is linked, not embedded or traced.</li>
        <li>Comparative composition: <a href="https://www.metmuseum.org/art/collection/search/48941" target="_blank" rel="noreferrer">The Met, Portrait of a Scholar (17th–18th century)</a>, Open Access / Public Domain.</li>
        <li>ANAT1 drives the facial topology and landmark placement; EXPR1 moves the actual feature mesh and supplies expression marks. The ink renderer translates those curves into soft mogu planes and sparse, tapered brush contours.</li>
        <li>No demographic face norm is applied: ANAT1 has no validated East-Asian reference norm. The two shapes use provisional millimetre-space landmark morphs, pending source-pixel annotation.</li>
        <li>These are research redraws, not approved production assets. The formal ArtCraft portrait gate still requires a source-image hash, independently annotated landmarks/value planes and 1×/3× visual review.</li>
      </ul>
    </section>
  </main>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/ANAT3 Reference-led Character Redraw",
  id:"video-ink-anat3-reference-led-redraw",component:ReferenceAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof ReferenceAtelier>;
export default meta;
export const ScholarAndElderReferenceRedraw:StoryObj<typeof meta>={
  name:"ANAT1 × EXPR1 · two independent source-led character redraws",
};
