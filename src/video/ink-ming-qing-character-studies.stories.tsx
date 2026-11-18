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
    id:"scholar-scroll-a",group:"Ming scholar anatomy",
    title:"Twenty-five bust portraits of famous scholars · crop A",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/51810/197276/main-image",
    href:"https://www.metmuseum.org/art/collection/search/51810",fit:"cover",position:"center 52%",
    credit:"Unidentified artist, Ming dynasty, 16th or 17th c. · object 55.37 · ink and color on paper · Public Domain.",
    note:"Compare three separate skull/cap/beard constructions. The left sitter has a broader face and moustache, the center a denser beard, and the right a tall squared hat. The removed labels prevent sitter identification.",
    alt:"Three distinct scholar busts from the Met's Twenty-five bust portraits of famous scholars."
  },
  {
    id:"scholar-scroll-b",group:"Ming scholar anatomy",
    title:"Twenty-five bust portraits of famous scholars · crop B",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/51810/161536/main-image",
    href:"https://www.metmuseum.org/art/collection/search/51810",fit:"cover",position:"center 50%",
    credit:"Unidentified artist, Ming dynasty, 16th or 17th c. · object 55.37 · ink and color on paper · Public Domain.",
    note:"Secondary comparison for hat height, cheek-to-jaw transition, brow rhythm and collar contour. Treat the individual as an anonymous sitter, not a named historical person.",
    alt:"Second detail crop from the Met's Twenty-five bust portraits of famous scholars."
  },
  {
    id:"writer-attendant",group:"Qing court roles",
    title:"Woman at her dressing table",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/910543/2250417/main-image",
    href:"https://www.metmuseum.org/art/collection/search/910543",fit:"contain",position:"center",
    credit:"Attributed to Leng Mei, early 18th c. · object 2024.180 · ink and color on silk · Public Domain.",
    note:"The seated writer and standing attendant are distinct constructions: lowered inward gaze, head inclination, hair ornaments, collar overlaps and hand-to-object relationship. The Met identifies the inkstone and water pot as evidence of the seated subject's writing practice.",
    alt:"The seated writer and standing attendant in the Met's Woman at her dressing table."
  },
  {
    id:"formal-lady",group:"Ming portrait proportion",
    title:"Portrait of a Lady",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/48936/164539/main-image",
    href:"https://www.metmuseum.org/art/collection/search/48936",fit:"contain",position:"center",
    credit:"Unidentified artist, Ming dynasty, late 16th–early 17th c. · object 51.39.1 · ink and color on silk · Public Domain.",
    note:"Formal seated portrait for head-to-robe scale, neck insertion, sleeve volume, hand placement and negative space. The available reproduction is monochrome; no color or pigment claims are inferred.",
    alt:"The seated figure in the Met's Ming-dynasty Portrait of a Lady."
  },
  {
    id:"qing-man",group:"Qing male portrait detail",
    title:"Portrait of a Man",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/51783/2234827/main-image",
    href:"https://www.metmuseum.org/art/collection/search/51783",fit:"cover",position:"center 35%",
    credit:"Jiang Yun (Chinese, 1847–1919), 19th c. · object 52.177.8 · ink and color on paper · Public Domain.",
    note:"New male reference for the rounded cap, temple-to-cheek transition, moustache/goatee separation, fur mass, blue under-robe and large sleeve volumes. Qing-period clothing is not copied onto the Ming scholar.",
    alt:"Jiang Yun's Qing-dynasty Portrait of a Man."
  },
  {
    id:"qing-lady",group:"Qing female portrait detail",
    title:"Portrait of a Lady",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/51780/2234806/main-image",
    href:"https://www.metmuseum.org/art/collection/search/51780",fit:"cover",position:"center 50%",
    credit:"Jiang Jun, 19th c. · object 52.177.5 · ink and color on paper · Public Domain.",
    note:"New close study for hairline and bun silhouette, floral ornaments, earrings, high embroidered collar, sleeve borders and hand-to-object scale. The face remains delicate without becoming featureless.",
    alt:"Jiang Jun's Qing-dynasty Portrait of a Lady."
  },
  {
    id:"ming-court-ladies",group:"Ming attendants and group hierarchy",
    title:"Court ladies and attendant",
    image:"https://ids.si.edu/ids/deliveryService?id=FS-8197_07&max=1200",
    href:"https://asia-archive.si.edu/object/F1916.135/",fit:"contain",position:"center",
    credit:"School of Tang Yin, formerly attributed to Su Hanchen, 16th c. · F1916.135 · ink and color on silk · Smithsonian CC0.",
    note:"Three court women establish role hierarchy through different head tilts, pinned hair masses, small facial marks and garment lengths. This aged, low-contrast reproduction is used for contour and pose only, not precise color measurement.",
    alt:"The three court women and attendant in the Smithsonian's Ming-dynasty Court ladies and attendant."
  },
  {
    id:"man-and-servant",group:"Ming/Qing figure hierarchy",
    title:"Portrait of a man and his servant",
    image:"https://upload.wikimedia.org/wikipedia/commons/f/fc/Portrait_of_a_man_and_his_servant.jpg",
    href:"https://asia-archive.si.edu/object/F1918.9/",fit:"contain",position:"center",
    credit:"Unidentified artist, 17th c., Ming or Qing dynasty · F1918.9 · ink and color on silk · Smithsonian CC0.",
    note:"New role-scale reference: a dominant seated figure and smaller servant share one visual space without reusing the same head/body ratios. Study the sitter's cap, beard, broad robe and the attendant's relative scale; no sitter identity is asserted.",
    alt:"The principal sitter and smaller servant in the Smithsonian's Portrait of a man and his servant."
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
            ?"Objects 55.37 + 52.177.8: square Ming scholar cap, tapered jaw, separate cheek growth, moustache and split chin beard. Qing fur and collar details are reference-only, not transferred to the Ming costume."
            :character==="writer"
              ?"Objects 2024.180 + 52.177.5: lowered inward gaze, narrow oval face, pinned coil, floral ornament, earrings and embroidered collar bands."
              :"Objects 2024.180 + F1916.135: a separate attendant head inclination and gaze, paired hair pins, smaller compositional role and independently shaped collar."}
        </p>
        <div style={{maxWidth:440,margin:"0 auto"}}>
          <div data-testid="ink-anat5-selected-portrait">
            <InkMingQingCharacterStudy character={character} emotion={emotion}
              intensity={intensity} detail={detail} yaw={yaw}/>
          </div>
        </div>
        <p style={{fontSize:11,letterSpacing:1,fontWeight:700,marginBottom:0}}>
          ANAT1 LANDMARKS · EXPR1 {emotion.toUpperCase()} · {character==="scholar"?"SOURCES 55.37 / 52.177.8":character==="writer"?"SOURCES 2024.180 / 52.177.5":"SOURCES 2024.180 / F1916.135"}
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
    <section style={{...card,marginTop:20}} data-testid="ink-anat5-face-detail-review">
      <h2 style={{font:"normal 25px Georgia,serif",margin:"0 0 6px"}}>
        Facial anatomy detail crop · 3× inspection
      </h2>
      <p style={{fontSize:12,lineHeight:1.65,maxWidth:1050}}>
        This is the same source-derived mesh and expression pose in a tighter camera, not a second
        character redraw. Inspect the near/far eyelids, brow roots, alar wings, nostrils, philtrum,
        vermilion border, ear folds, hairline and beard attachment at enlarged scale.
      </p>
      <div style={{maxWidth:620,margin:"0 auto"}}>
        <InkMingQingCharacterStudy character={character} emotion={emotion}
          intensity={intensity} detail={detail} yaw={yaw} view="face"/>
      </div>
    </section>
    <section style={{marginTop:26}}>
      <h2 style={{font:"normal 27px Georgia,serif"}}>Newly studied museum references</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        {sources.map(source=><article key={source.id} style={card}
          data-km-ink-anat5-reference-card={source.id}>
          <p style={{fontSize:10,letterSpacing:1,fontWeight:700,color:"#766958",margin:"0 0 8px"}}>
            {source.group.toUpperCase()}
          </p>
          <div style={{height:270,background:"#e5dac8",display:"grid",placeItems:"center",overflow:"hidden"}}>
            <img data-km-ink-anat5-reference-image={source.id} src={source.image} alt={source.alt}
              loading="eager" decoding="async" referrerPolicy="no-referrer"
              style={{display:"block",width:"100%",height:"100%",objectFit:source.fit,objectPosition:source.position}}/>
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
