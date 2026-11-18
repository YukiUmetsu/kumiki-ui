import {useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {
  InkSourceLedCharacterPortrait,INK_SOURCE_LED_CHARACTERS,INK_SOURCE_LED_EXPRESSIONS,
} from "./ink-source-led-character-portraits";
import type {InkSourceLedCharacter,InkSourceLedExpression} from "./ink-source-led-character-portraits";

const page={minHeight:"100vh",padding:26,background:"#e9dfce",color:"#302c25",
  fontFamily:"system-ui,sans-serif"} as const;
const card={background:"#f5ecdd",border:"1px solid #cbbda8",padding:15,
  boxShadow:"0 8px 22px #493c2920"} as const;
const control={display:"grid",gap:6,fontSize:12,fontWeight:650,minWidth:160} as const;
const select={padding:8,border:"1px solid #b8a68c",background:"#faf2e3",
  color:"#2e2a24",fontSize:13} as const;

const labels:Record<InkSourceLedCharacter,string>={
  scholar:"Staff-bearing scholar",
  shepherd:"Su Wu · the shepherd",
  "zhong-kui":"Zhong Kui · the eccentric scholar",
};
const notes:Record<InkSourceLedCharacter,string>={
  scholar:"Chen Hongshou's compact, archaistic standing scholar and Ren Yi's scholar-on-a-rock inform the long face, fine beard roots, cap silhouette and measured robe folds. The staff/brush source is a pose and costume reference, not a traced figure.",
  shepherd:"Ren Yi's 1874 Su Wu is seated with greying temples, a distant steadfast gaze and a scepter. The hood and robe use forceful nail-head-rat-tail and bent-reed line rhythms; the portrait studies age, eye weight and a long light beard.",
  "zhong-kui":"Ren Yi's 1883 Zhong Kui is an elegant, eccentric scholar rather than a generic demon-queller: blossom in the hair, broad facial mass, full beard, book-reading gaze and voluminous robe. The drawing treats him as a legendary character, not a sitter likeness.",
};

const sources=[
  {
    id:"cma-scholar-staff-brush",
    title:"Scholar with Staff and Brush",
    artist:"Chen Hongshou · Ming dynasty · 1598/99–1652",
    href:"https://www.clevelandart.org/art/1979.27.2.19",
    image:"https://www.clevelandart.org/_next/image?q=75&url=https%3A%2F%2Fpiction.clevelandart.org%2Fcma%2Fump.di%3Fe%3DA4B5064B2A8B79132898AD3A2616A0F41867FC27DE083007E31F929723CA9111%26s%3D24247294%26se%3D399313166%26v%3D3%26f%3D1979.27.2.19_o2.jpg&w=3840",
    rights:"Cleveland Museum of Art Open Access; copy, modification and distribution are permitted.",
    role:"Standing pose · staff and brush · cap · fine figure contour",
    note:"A miniature bearded scholar in a tan robe and black cap stands on a grassy mound holding a staff and brush. Fine contours and the deliberately reduced scale are essential; do not inflate the source into a generic heroic body.",
  },
  {
    id:"met-zhong-kui",
    title:"Zhong Kui",
    artist:"Ren Yi (Ren Bonian) · dated 1883",
    href:"https://www.metmuseum.org/art/collection/search/37393?showOnly=openAccess",
    image:"https://collectionapi.metmuseum.org/api/collection/v1/iiif/37393/2269186/main-image",
    rights:"The Metropolitan Museum of Art Open Access; Public Domain.",
    role:"Head and beard · blossom ornament · seated scholar · robe volume",
    note:"The Met describes an elegant, eccentric scholar with a blossom in his hair, reading beside archaic bronzes, flowers and fruit. Ren Yi adapts Chen Hongshou's figural language rather than the usual ferocious demon-queller pose.",
  },
  {
    id:"tsinghua-su-wu",
    title:"Su Wu the Shepherd",
    artist:"Ren Yi (Ren Bonian) · 1874 · Qing dynasty",
    href:"https://www.artmuseum.tsinghua.edu.cn/en/cpsj_english/gndc/gcxy/201605/t20160526_1116.shtml",
    image:null,
    rights:"Tsinghua University Art Museum collection record; reproduction rights are not stated, so the image is not embedded.",
    role:"Age · far gaze · seated torso · scepter · hood and robe line",
    note:"The museum describes grey temples, a far-reaching gaze, a stretched seated body and a scepter. It specifically identifies fine facial contour lines, nail-head-rat-tail drawing and bent-reed drawing in the hood and clothing.",
  },
  {
    id:"met-scholar-rock",
    title:"Scholar on a Rock",
    artist:"Ren Yi (Ren Bonian) · ca. 1880 · object 1986.267.49",
    href:"https://www.metmuseum.org/art/collection/search/39715?showOnly=openAccess",
    image:null,
    rights:"The Metropolitan Museum of Art; Public Domain. The image endpoint was unreliable during this pass.",
    role:"Walking-stick gesture · reading gaze · scalloped silhouette · robe folds",
    note:"The Met's publication describes the scholar resting on a garden rock, his walking stick propped in the stone and his attention fixed on a book. The patterned robe folds and blank ground make silhouette and negative space legible.",
  },
] as const;

function SourceLedAtelier(){
  const [character,setCharacter]=useState<InkSourceLedCharacter>("scholar");
  const [emotion,setEmotion]=useState<InkSourceLedExpression>("neutral");
  const [intensity,setIntensity]=useState(.88);
  const [detail,setDetail]=useState(1);
  const [yaw,setYaw]=useState(0);
  return <main style={page} data-testid="ink-anat6-source-led-atelier">
    <p style={{fontSize:11,letterSpacing:2,fontWeight:750}}>
      CHINESE INK / ANAT6 / SOURCE-LED CHARACTER REBUILD
    </p>
    <h1 style={{font:"normal 38px Georgia,serif",margin:"8px 0 10px"}}>
      New characters, drawn from the references
    </h1>
    <p style={{maxWidth:1160,lineHeight:1.75,fontSize:14}}>
      These are independent redraws from newly researched Ming and Qing figure paintings.
      They do not reuse the earlier Shanshui cast or ANAT2–ANAT5 character paths. ANAT1 supplies
      the 468-point face topology and measured landmarks; EXPR1 drives brows, lids, cheeks, jaw
      and mouth as one connected expression system. The result is an original study, not a
      historical sitter likeness or a traced museum image.
    </p>
    <div style={{display:"flex",gap:18,alignItems:"end",flexWrap:"wrap",margin:"20px 0"}}>
      <label style={control}>Character
        <select aria-label="Source-led character" style={select} value={character}
          onChange={e=>setCharacter(e.target.value as InkSourceLedCharacter)}>
          {INK_SOURCE_LED_CHARACTERS.map(x=><option key={x} value={x}>{labels[x]}</option>)}
        </select>
      </label>
      <label style={control}>Facial expression
        <select aria-label="Source-led expression" style={select} value={emotion}
          onChange={e=>setEmotion(e.target.value as InkSourceLedExpression)}>
          {INK_SOURCE_LED_EXPRESSIONS.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label style={control}>Expression intensity · {intensity.toFixed(2)}
        <input aria-label="Source-led expression intensity" type="range" min="0" max="1" step=".05"
          value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/>
      </label>
      <label style={control}>Head turn · {yaw}°
        <input aria-label="Source-led head turn" type="range" min="-35" max="35" step="1"
          value={yaw} onChange={e=>setYaw(Number(e.target.value))}/>
      </label>
      <label style={control}>Material detail · {Math.round(detail*100)}%
        <input aria-label="Source-led material detail" type="range" min=".25" max="1" step=".05"
          value={detail} onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"minmax(300px,1.05fr) minmax(300px,1fr)",gap:20,alignItems:"start"}}>
      <section style={card}>
        <h2 style={{font:"normal 26px Georgia,serif",margin:"0 0 7px"}}>{labels[character]}</h2>
        <p style={{fontSize:12,lineHeight:1.7,minHeight:76}}>{notes[character]}</p>
        <div data-testid="ink-anat6-selected-portrait" style={{maxWidth:470,margin:"0 auto"}}>
          <InkSourceLedCharacterPortrait character={character} emotion={emotion}
            intensity={intensity} detail={detail} yaw={yaw}/>
        </div>
        <p style={{fontSize:10,letterSpacing:1.1,fontWeight:750,marginBottom:0}}>
          ANAT1 468-POINT TOPOLOGY · EXPR1 {emotion.toUpperCase()} · {character.toUpperCase()}
        </p>
      </section>
      <section style={card}>
        <h2 style={{font:"normal 26px Georgia,serif",margin:"0 0 7px"}}>Expression construction</h2>
        <p style={{fontSize:12,lineHeight:1.7}}>
          Six expressions are redrawn on the same source-specific head. The eyelid opening,
          brow tension, cheek lift, nasolabial folds, lip corners and jaw movement remain linked.
        </p>
        <div data-testid="ink-anat6-expression-contact-sheet"
          style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(90px,1fr))",gap:10}}>
          {INK_SOURCE_LED_EXPRESSIONS.map(x=><article key={x} style={{background:"#eee4d4",padding:6}}>
            <InkSourceLedCharacterPortrait character={character} emotion={x}
              intensity={.88} detail={.72} yaw={yaw}/>
            <p style={{fontSize:10,fontWeight:750,textAlign:"center",margin:"4px 0"}}>{x.toUpperCase()}</p>
          </article>)}
        </div>
      </section>
    </div>

    <section style={{marginTop:28}}>
      <h2 style={{font:"normal 28px Georgia,serif"}}>Newly researched source paintings</h2>
      <p style={{maxWidth:1120,fontSize:13,lineHeight:1.7}}>
        References are separated by the job they perform: face and beard, pose and prop,
        costume construction, gesture, and line character. Only the two rights-cleared image
        sources are embedded. Other records remain link-only where reproduction rights or a
        stable image endpoint are not established.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16}}>
        {sources.map(source=><article key={source.id} style={card}
          data-km-ink-anat6-reference-card={source.id}>
          <div style={{height:250,background:"#e5dac8",display:"grid",placeItems:"center",overflow:"hidden"}}>
            {source.image
              ? <img src={source.image} alt={source.title+" by "+source.artist}
                  loading="lazy" referrerPolicy="no-referrer"
                  style={{maxWidth:"100%",maxHeight:250,objectFit:"contain"}}/>
              : <div style={{padding:20,textAlign:"center",color:"#786c5d"}}>
                  <div style={{font:"normal 38px Georgia,serif",opacity:.65}}>墨</div>
                  <div style={{fontSize:11,letterSpacing:1.1,fontWeight:750}}>MUSEUM RECORD · LINK ONLY</div>
                </div>}
          </div>
          <h3 style={{font:"normal 19px Georgia,serif",margin:"12px 0 5px"}}>{source.title}</h3>
          <p style={{fontSize:11,color:"#6c6256",lineHeight:1.5}}>{source.artist}</p>
          <p style={{fontSize:11,color:"#6c6256",lineHeight:1.5}}>{source.rights}</p>
          <p style={{fontSize:11,fontWeight:750,letterSpacing:.5}}>{source.role}</p>
          <p style={{fontSize:12,lineHeight:1.65}}>{source.note}</p>
          <a href={source.href} target="_blank" rel="noreferrer"
            style={{fontSize:12,color:"#514537"}}>Open museum record ↗</a>
        </article>)}
      </div>
    </section>

    <section style={{...card,marginTop:22}}>
      <h2 style={{font:"normal 23px Georgia,serif",marginTop:0}}>Redraw decisions</h2>
      <ul style={{fontSize:13,lineHeight:1.8,paddingLeft:20,marginBottom:0}}>
        <li>Scholar: elongated face, narrow jaw, tall cap, separate moustache and tapered beard; costume rhythm follows the small-scale Ming figure rather than a modern robe template.</li>
        <li>Su Wu: older eyelids and temples, far gaze, wrapped hood, pale long beard and stretched vertical face; the figure's steadfastness is expressed through gaze and jaw, not an exaggerated grimace.</li>
        <li>Zhong Kui: broad cheek/jaw mass, strong nose, full beard, loose hair and blossom; the source's eccentric scholarly demeanor is retained instead of the usual aggressive demon-queller stereotype.</li>
        <li>ANAT1 local landmark morphs preserve one coherent face topology; EXPR1 FACS deformation changes connected facial regions instead of swapping mouth stickers.</li>
        <li>Beard roots, hair direction, ears, neck, collar, robe folds and paper grain are separate material layers with deterministic detail.</li>
      </ul>
    </section>
    <section style={{...card,marginTop:16}}>
      <h2 style={{font:"normal 22px Georgia,serif",marginTop:0}}>Acceptance boundary</h2>
      <p style={{fontSize:12,lineHeight:1.7,marginBottom:0}}>
        Research-only. These historical paintings are style and character references, not source
        photographs for a likeness claim. The ArtCraft portrait gate remains open until source-relative
        landmark registration and independent 1×/3× visual review are complete. No production-quality
        or sitter-identity claim is made here.
      </p>
    </section>
  </main>;
}

const meta={
  title:"Video production/Film Looks/Chinese Ink/ANAT6 Source-led Character Portraits",
  id:"video-ink-anat6-source-led-character-portraits",
  component:SourceLedAtelier,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof SourceLedAtelier>;
export default meta;
export const SourceLedQingCharacterPortraits:StoryObj<typeof meta>={
  name:"ANAT1 × EXPR1 · new Ming/Qing character redraws",
};
