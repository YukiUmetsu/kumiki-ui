import {useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {
  InkAnatomyCharacterFigure,
  type InkAnatomyCharacter,
} from "./ink-anatomy-character-figure";
import {
  InkReferenceCharacterRedraw,
  INK_REFERENCE_EXPRESSIONS,
} from "./ink-reference-character-redraw";
import type {InkReferenceExpression} from "./ink-reference-character-redraw";

const page={minHeight:"100vh",padding:24,background:"#e9dfce",color:"#302a23",
  fontFamily:"system-ui,sans-serif"} as const;
const panel={background:"#f5ecdd",border:"1px solid #cbbda8",padding:14,
  boxShadow:"0 8px 22px #493c2920"} as const;
const label={display:"grid",gap:6,fontSize:13,fontWeight:650} as const;
const select={padding:8,border:"1px solid #b8a68c",background:"#faf2e3",
  color:"#302a23",fontSize:13} as const;
const sources=[
  {
    id:"lu-dongbin",
    title:"Standing figure of Lü Dongbin · Ming dynasty",
    image:"https://ids.si.edu/ids/iiif/FS-5908_09/full/full/0/default.jpg",
    href:"https://asia-archive.si.edu/object/F1916.580/",
    credit:"Smithsonian, Freer Gallery of Art, F1916.580 · ink and color on silk · 1368–1644 · CC0.",
    note:"Full-length hanging-scroll scale, head-to-body ratio, robe column, sleeve gravity and the way the figure is held together by a few long, directional garment strokes. Used for silhouette and brush-language study, not for copying the immortal, face or prop.",
    alt:"Ming dynasty hanging scroll depicting the standing figure of Lü Dongbin."
  },
  {
    id:"loc-pipe",
    title:"An old Chinese man with his pipe · 1860",
    image:"https://upload.wikimedia.org/wikipedia/commons/1/1f/An_old_Chinese_man_with_his_pipe%2C_half-length_portrait%2C_facing_front%2C_sitting_at_a_table%2C_holding_a_pipe_LCCN2004679126.jpg",
    href:"https://www.loc.gov/item/2004679126/",
    credit:"Library of Congress, LCCN 2004679126 · charcoal and lead white on tan paper · no known restrictions on publication; Public Domain Mark 1.0.",
    note:"The pipe hand is the main anatomy reference: wrist-to-palm continuity, thumb opposition, index/middle-finger contact, curled ring/little fingers, pipe axis and sleeve mass around the wrist. The resting hand supplies a second relaxed-hand comparison.",
    alt:"1860 charcoal drawing of an older Chinese man holding a long pipe."
  },
  {
    id:"met-gentleman",
    title:"Portrait of a Gentleman · 16th–17th century",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/48939/2269991/main-image",
    href:"https://www.metmuseum.org/art/collection/search/48939",
    credit:"The Metropolitan Museum of Art, 51.39.4 · ink and color on silk · Public Domain / Open Access.",
    note:"Study of long-beard silhouette, headwear, sleeve-to-torso continuity, broad robe mass and seated weight. The red official robe and rank badge are deliberately not copied.",
    alt:"Ming dynasty portrait of a seated gentleman in a red robe."
  },
  {
    id:"met-scholar",
    title:"Portrait of a Scholar · 17th–18th century",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/48941/2275579/main-image",
    href:"https://www.metmuseum.org/art/collection/search/48941",
    credit:"The Metropolitan Museum of Art, 29.20.1 · ink and color on paper · Public Domain / Open Access.",
    note:"A quieter scholar portrait for headwear, plain garment proportion, face-to-body scale and low-contrast ink/color handling. It is a seated portrait, not a standing anatomy template.",
    alt:"17th–18th century Chinese hanging-scroll portrait of a scholar."
  },
] as const;

function AnatomyFigureAtelier(){
  const [character,setCharacter]=useState<InkAnatomyCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkReferenceExpression>("neutral");
  const [intensity,setIntensity]=useState(.8);
  const [detail,setDetail]=useState(1);
  return <main style={page} data-testid="ink-anat4-atelier">
    <p style={{fontSize:11,letterSpacing:2,fontWeight:750}}>
      CHINESE INK / ANAT4 / ANATOMY-LED FIGURE REDRAW
    </p>
    <h1 style={{font:"normal 36px Georgia,serif",margin:"8px 0 12px"}}>
      Rebuild the figure from anatomy, then translate it into ink
    </h1>
    <p style={{maxWidth:1100,lineHeight:1.7}}>
      This is a new full-figure construction from the ANAT1 body lattice, clinical
      joint posing and an articulated five-finger grip. It does not trace or reuse
      the previous standing-figure artwork. The head microscope is a separate
      ANAT1/EXPR1 redraw, so expression geometry and full-body gesture can be
      judged independently.
    </p>
    <div style={{display:"flex",gap:22,alignItems:"end",flexWrap:"wrap",margin:"18px 0 22px"}}>
      <label style={label}>Character
        <select aria-label="ANAT4 character" style={select} value={character}
          onChange={e=>setCharacter(e.target.value as InkAnatomyCharacter)}>
          <option value="scholar">Scholar · staff grip</option>
          <option value="elder">Elder · pipe grip</option>
        </select>
      </label>
      <label style={label}>Facial expression
        <select aria-label="ANAT4 expression" style={select} value={emotion}
          onChange={e=>setEmotion(e.target.value as InkReferenceExpression)}>
          {INK_REFERENCE_EXPRESSIONS.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label style={label}>Expression intensity · {intensity.toFixed(2)}
        <input aria-label="ANAT4 intensity" type="range" min="0" max="1" step=".05"
          value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/>
      </label>
      <label style={label}>Brush detail · {Math.round(detail*100)}%
        <input aria-label="ANAT4 brush detail" type="range" min=".25" max="1" step=".05"
          value={detail} onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(320px,1.2fr) minmax(260px,.8fr)",gap:20,alignItems:"start"}}>
      <section style={panel} data-testid="ink-anat4-full-figure">
        <h2 style={{font:"normal 24px Georgia,serif",margin:"0 0 8px"}}>
          {character==="scholar"?"Scholar · bamboo staff":"Elder · pipe grip"}
        </h2>
        <p style={{fontSize:12,lineHeight:1.6}}>
          ANAT1 supplies the body surface, joint landmarks, hand mesh and
          depth-aware contours. The robe is rebuilt around the posed shoulder,
          elbow, wrist, hip and ankle anchors; INK1 supplies pressure-varying
          folds, broken dry-brush edges and paper gaps.
        </p>
        <div style={{maxWidth:460,margin:"0 auto"}}>
          <InkAnatomyCharacterFigure character={character} detail={detail}/>
        </div>
      </section>
      <section style={panel} data-testid="ink-anat4-face-study">
        <h2 style={{font:"normal 24px Georgia,serif",margin:"0 0 8px"}}>
          Face and expression microscope
        </h2>
        <p style={{fontSize:12,lineHeight:1.6}}>
          Same selected character, same expression control. EXPR1 moves the
          anatomical brow, eyelid, cheek, nose, mouth and jaw geometry; Chinese
          ink is applied after the deformation.
        </p>
        <div style={{maxWidth:340,margin:"0 auto"}}>
          <InkReferenceCharacterRedraw character={character} emotion={emotion}
            intensity={intensity} detail={detail}/>
        </div>
        <p style={{fontSize:11,letterSpacing:1,fontWeight:700}}>
          ANAT1 468-POINT FACE · EXPR1 {emotion.toUpperCase()}
        </p>
      </section>
    </div>
    <section style={{marginTop:28}}>
      <h2 style={{font:"normal 27px Georgia,serif"}}>New full-figure, garment and hand references</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        {sources.map(source=><article key={source.id} style={panel}>
          <div style={{height:250,background:"#e5dac8",display:"grid",placeItems:"center"}}>
            <img src={source.image} alt={source.alt} loading="lazy"
              referrerPolicy="no-referrer"
              style={{maxWidth:"100%",maxHeight:250,objectFit:"contain"}}/>
          </div>
          <h3 style={{font:"normal 18px Georgia,serif",margin:"12px 0 5px"}}>{source.title}</h3>
          <p style={{fontSize:11,color:"#6c6256",lineHeight:1.5}}>{source.credit}</p>
          <p style={{fontSize:12,lineHeight:1.6}}>{source.note}</p>
          <a href={source.href} target="_blank" rel="noreferrer"
            style={{fontSize:12,color:"#514537"}}>Open collection record ↗</a>
        </article>)}
      </div>
    </section>
    <section style={{...panel,marginTop:22}}>
      <h2 style={{font:"normal 23px Georgia,serif",marginTop:0}}>Canonical identity is unchanged</h2>
      <p style={{fontSize:13,lineHeight:1.7}}>
        Misty Hermit, Riverside Scholar and Mountain Trail from the three approved teacher paintings
        remain the identity/pose ground truth. The new Smithsonian, LOC and Met works are craft
        references only. Their original teacher-image files are not staged in this repository or the
        accessible file library, so this ANAT4 construction is an anatomy/gesture study, not an
        identity-matched replacement.
      </p>
    </section>
    <section style={{...panel,marginTop:22}}>
      <h2 style={{font:"normal 23px Georgia,serif",marginTop:0}}>Anatomy and acceptance notes</h2>
      <ul style={{lineHeight:1.75,fontSize:13,paddingLeft:20}}>
        <li>The body lattice is a MakeHuman/ANSUR-derived construction scaffold. Its Asian ancestry morph is a coarse model axis, not a validated historical Chinese anthropometric norm or a claim about either sitter.</li>
        <li>The pipe grip uses the ANAT1 finger skeleton with separate MCP/PIP/DIP flexion and thumb CMC/MCP/IP opposition. The LOC drawing informs contact direction; it is not traced.</li>
        <li>The Smithsonian and Met references are used for figure scale, robe silhouette and material language. Costume details and individual likenesses are not copied.</li>
        <li>This is an experimental anatomy-to-ink study, not an approved production character. The ArtCraft source-hash, independent 18-landmark/value-plane comparison and 1×/3× visual gate remain open.</li>
      </ul>
    </section>
  </main>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/ANAT4 Anatomy-led Full Figure",
  id:"video-ink-anat4-anatomy-led-full-figure",component:AnatomyFigureAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof AnatomyFigureAtelier>;
export default meta;
export const FullFigureAnatomyStudy:StoryObj<typeof meta>={
  name:"ANAT1 body × EXPR1 face × INK1 robe and grip",
};
