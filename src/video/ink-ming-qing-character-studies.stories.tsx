import {useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {
  InkMingQingCharacterStudy,INK_MING_QING_CHARACTERS,INK_MING_QING_EXPRESSIONS,
} from "./ink-ming-qing-character-studies";
import type {InkMingQingCharacter,InkMingQingExpression} from "./ink-ming-qing-character-studies";

const page={minHeight:"100vh",padding:24,background:"#e9dfce",color:"#302c25",
  fontFamily:"system-ui,sans-serif"} as const;
const card={background:"#f5ecdd",border:"1px solid #cbbda8",padding:14,
  boxShadow:"0 8px 22px #493c2920"} as const;
const control={display:"grid",gap:6,fontSize:12,fontWeight:650,minWidth:160} as const;
const select={padding:8,border:"1px solid #b8a68c",background:"#faf2e3",
  color:"#2e2a24",fontSize:13} as const;
const sources=[
  {
    id:"scholar-scroll-a",
    title:"Twenty-five bust portraits of famous scholars · crop A",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/51810/197276/main-image",
    href:"https://www.metmuseum.org/art/collection/search/51810",
    credit:"Unidentified artist, Ming dynasty, 16th–17th c. · object 55.37 · ink and color on paper · Public Domain.",
    note:"Three different heads in one scroll. Study head silhouette, beard root direction, eye/brow variation and the tall dark hat without assigning an identity.",
    alt:"Detail crop from the Met's Twenty-five bust portraits of famous scholars, showing three individual scholar portraits."
  },
  {
    id:"scholar-scroll-b",
    title:"Twenty-five bust portraits of famous scholars · crop B",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/51810/161536/main-image",
    href:"https://www.metmuseum.org/art/collection/search/51810",
    credit:"Unidentified artist, Ming dynasty, 16th–17th c. · object 55.37 · ink and color on paper · Public Domain.",
    note:"Comparative head and beard study. The scroll's labels were removed before acquisition; the redraw does not claim to identify any sitter.",
    alt:"Second detail crop from the Met's Twenty-five bust portraits of famous scholars."
  },
  {
    id:"writer-and-attendant",
    title:"Woman at her dressing table",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/910543/2250417/main-image",
    href:"https://www.metmuseum.org/art/collection/search/910543",
    credit:"Attributed to Leng Mei, early 18th c. · object 2024.180 · ink and color on silk · Public Domain.",
    note:"Separate the seated writer from the standing attendant: head angle, lowered gaze, pinned hair, collar overlap and garment volume are not interchangeable.",
    alt:"The seated woman and standing attendant in the Met's Woman at her dressing table."
  },
  {
    id:"formal-lady",
    title:"Portrait of a Lady",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/48936/164539/main-image",
    href:"https://www.metmuseum.org/art/collection/search/48936",
    credit:"Unidentified artist, Ming dynasty, late 16th–early 17th c. · object 51.39.1 · ink and color on silk · Public Domain.",
    note:"Comparative formal head/neck alignment, head-to-robe scale and negative space. The available reproduction is monochrome.",
    alt:"The formal seated figure in the Met's Portrait of a Lady."
  },
] as const;

function ReferenceAtelier(){
  const [character,setCharacter]=useState<InkMingQingCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkMingQingExpression>("neutral");
  const [intensity,setIntensity]=useState(.86);
  const [detail,setDetail]=useState(1);
  const [yaw,setYaw]=useState(0);
  const characterLabels:Record<InkMingQingCharacter,string>={
    scholar:"Dark-bearded scholar",
    writer:"Seated writer",
    attendant:"Standing attendant",
  };
  return <main style={page} data-testid="ink-anat5-portrait-atelier">
    <p style={{fontSize:11,letterSpacing:2,fontWeight:700}}>
      CHINESE INK / ANAT5 / NEW MING-QING CHARACTER STUDIES
    </p>
    <h1 style={{font:"normal 36px Georgia,serif",margin:"8px 0 10px"}}>
      Character anatomy from the source
    </h1>
    <p style={{maxWidth:1120,lineHeight:1.7,fontSize:14}}>
      Three new portrait constructions begin from the museum references below, not from the existing
      Shanshui cast or earlier ANAT2/ANAT3 character paths. ANAT1 supplies the 468-point facial
      topology and measured landmarks; EXPR1 drives the brows, lids, cheeks, jaw and mouth as a
      connected expression system. The drawings are original interpretations, not sitter likenesses.
    </p>
    <div style={{display:"flex",gap:18,alignItems:"end",flexWrap:"wrap",margin:"20px 0"}}>
      <label style={control}>Historical character
        <select aria-label="Historical character" style={select} value={character}
          onChange={e=>setCharacter(e.target.value as InkMingQingCharacter)}>
          {INK_MING_QING_CHARACTERS.map(x=><option key={x} value={x}>{characterLabels[x]}</option>)}
        </select>
      </label>
      <label style={control}>Facial expression
        <select aria-label="Facial expression" style={select} value={emotion}
          onChange={e=>setEmotion(e.target.value as InkMingQingExpression)}>
          {INK_MING_QING_EXPRESSIONS.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label style={control}>Expression intensity · {intensity.toFixed(2)}
        <input aria-label="Expression intensity" type="range" min="0" max="1" step=".05"
          value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/>
      </label>
      <label style={control}>Head turn · {yaw}°
        <input aria-label="Head turn" type="range" min="-35" max="35" step="1"
          value={yaw} onChange={e=>setYaw(Number(e.target.value))}/>
      </label>
      <label style={control}>Ink detail · {Math.round(detail*100)}%
        <input aria-label="Ink detail" type="range" min=".25" max="1" step=".05"
          value={detail} onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(280px,1.1fr) minmax(280px,1fr)",gap:20,alignItems:"start"}}>
      <section style={card}>
        <h2 style={{font:"normal 25px Georgia,serif",margin:"0 0 6px"}}>{characterLabels[character]}</h2>
        <p style={{fontSize:12,lineHeight:1.6,minHeight:40}}>
          {character==="scholar"
            ?"Object 55.37: tall scholar cap, individual beard roots, elongated lower face and a separate moustache-to-cheek transition."
            :character==="writer"
              ?"Object 2024.180: lowered inward gaze, compact oval face, pinned coil, fine escaping hair and a softer crossed collar."
              :"Object 2024.180: a distinct attendant face and head inclination, double-pin hair arrangement and asymmetric collar folds."}
        </p>
        <div style={{maxWidth:440,margin:"0 auto"}}>
          <InkMingQingCharacterStudy character={character} emotion={emotion}
            intensity={intensity} detail={detail} yaw={yaw}/>
        </div>
        <p style={{fontSize:11,letterSpacing:1,fontWeight:700,marginBottom:0}}>
          ANAT1 LANDMARKS · EXPR1 {emotion.toUpperCase()} · SOURCE OBJECT {character==="scholar"?"55.37":"2024.180"}
        </p>
      </section>
      <section style={card}>
        <h2 style={{font:"normal 25px Georgia,serif",margin:"0 0 6px"}}>Expression anatomy</h2>
        <p style={{fontSize:12,lineHeight:1.6}}>
          Same character and camera, six expressions. Brow, eyelid, cheek, nasolabial, lip and jaw
          movement comes from EXPR1 deformation rather than interchangeable mouth stickers.
        </p>
        <div data-testid="ink-anat5-expression-contact-sheet"
          style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(90px,1fr))",gap:10}}>
          {INK_MING_QING_EXPRESSIONS.map(x=><article key={x} style={{background:"#eee4d4",padding:6}}>
            <InkMingQingCharacterStudy character={character} emotion={x}
              intensity={.88} detail={.78} yaw={yaw}/>
            <p style={{fontSize:10,fontWeight:700,textAlign:"center",margin:"4px 0"}}>{x.toUpperCase()}</p>
          </article>)}
        </div>
      </section>
    </div>
    <section style={{marginTop:26}}>
      <h2 style={{font:"normal 27px Georgia,serif"}}>Newly studied museum references</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        {sources.map(source=><article key={source.id} style={card}
          data-km-ink-anat5-reference-card={source.id}>
          <div style={{height:250,background:"#e5dac8",display:"grid",placeItems:"center"}}>
            <img src={source.image} alt={source.alt} loading="lazy" referrerPolicy="no-referrer"
              style={{maxWidth:"100%",maxHeight:250,objectFit:"contain"}}/>
          </div>
          <h3 style={{font:"normal 18px Georgia,serif",margin:"12px 0 5px"}}>{source.title}</h3>
          <p style={{fontSize:11,color:"#6c6256",lineHeight:1.5}}>{source.credit}</p>
          <p style={{fontSize:12,lineHeight:1.6}}>{source.note}</p>
          <a href={source.href} target="_blank" rel="noreferrer"
            style={{fontSize:12,color:"#514537"}}>Open museum object record ↗</a>
        </article>)}
      </div>
    </section>
    <section style={{...card,marginTop:20}}>
      <h2 style={{font:"normal 22px Georgia,serif",marginTop:0}}>Additional motion reference</h2>
      <p style={{fontSize:13,lineHeight:1.7,marginBottom:0}}>
        <a href="https://www.metmuseum.org/art/collection/search/49460" target="_blank" rel="noreferrer">
          Ren Xun, Scholar in the Wind (ca. 1880), object 1986.267.45
        </a>
        {" "}is retained as a garment-motion benchmark. The Met describes its animated, modulated
        contours and twisting heavy robe; the image endpoint was unreliable during this pass, so
        it is not used for pixel-level geometry.
      </p>
    </section>
    <section style={{...card,marginTop:20}}>
      <h2 style={{font:"normal 22px Georgia,serif",marginTop:0}}>Construction rules</h2>
      <ul style={{fontSize:13,lineHeight:1.75,paddingLeft:20,marginBottom:0}}>
        <li>ANAT1 raw face topology; source-specific local landmark morphs only. No unrelated demographic norm.</li>
        <li>3D yaw projection preserves unequal near/far eye width and visible feature curves.</li>
        <li>Separate headwear/hair, beard roots, ears, neck, collar and robe folds. No single silhouette reused for all three characters.</li>
        <li>Wet washes remain irregular and low-opacity; hair/beard fibers are rooted and tapered, not parallel bars.</li>
        <li>Research redraws only. Production acceptance still requires source-relative 1×/3× review.</li>
      </ul>
    </section>
  </main>;
}

const meta={
  title:"Video production/Film Looks/Chinese Ink/ANAT5 Ming-Qing Character Studies",
  id:"video-ink-anat5-ming-qing-character-studies",
  component:ReferenceAtelier,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof ReferenceAtelier>;
export default meta;
export const SourceLedPortraitAtlas:StoryObj<typeof meta>={
  name:"ANAT1 × EXPR1 · source-led portrait and expression atlas",
};
