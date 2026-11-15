import {useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {
  WATERCOLOUR_PORTRAIT_REFERENCES,WATERCOLOUR_PORTRAIT_GATE,
} from "./watercolour-portrait-reference-data";
import type {WatercolourPortraitReference} from "./watercolour-portrait-reference-data";

const control={
  border:"1px solid #C8BBB0",borderRadius:8,padding:"10px 13px",font:"600 13px system-ui",
  background:"#FDFBF6",color:"#343E42",minHeight:42,
} as const;
const heading={font:"600 15px/1.3 Georgia,serif",margin:"0 0 9px"} as const;

function LinkedArtwork({reference}:{reference:WatercolourPortraitReference}){
  const [preview,setPreview]=useState<"loading"|"ready"|"unavailable">(
    reference.imageUrl?"loading":"unavailable");
  return <div data-watercolour-reference-preview={reference.id}
    style={{position:"relative",width:"100%",aspectRatio:"4 / 3",
      background:"#E6E0D6",borderRadius:8,overflow:"hidden",display:"grid",
      placeItems:"center"}}>
    {preview!=="ready"&&<div style={{
      padding:23,maxWidth:290,textAlign:"center",
      color:"#625C57",display:"grid",gap:8,fontSize:13,lineHeight:1.5}}>
      <span style={{font:"italic 500 23px Georgia,serif",color:"#735958"}}>
        {reference.artist}
      </span>
      <span style={{fontWeight:700}}>{reference.work}</span>
      <span>
        {preview==="loading"
          ?"External image preview is loading. View the credited source if it is blocked."
          :"The artwork host does not provide a preview here. Open the credited source below."}
      </span>
    </div>}
    {reference.imageUrl&&
      <img src={reference.imageUrl} loading="eager"
        alt={"Research-only artwork: "+reference.work+" by "+reference.artist}
        onLoad={()=>setPreview("ready")}
        onError={()=>setPreview("unavailable")}
        style={{position:"absolute",inset:0,width:"100%",height:"100%",
          objectFit:"contain",background:"#F3F0E9",
          display:preview==="ready"?"block":"none"}}/>}
    <span style={{position:"absolute",left:9,bottom:9,background:"#F7F3E8",
      border:"1px solid #D3C7B8",borderRadius:5,padding:"4px 8px",
      fontSize:11,fontWeight:700,color:"#3B4448"}}>
      REFERENCE ONLY · NOT AN ASSET
    </span>
  </div>;
}

function PortraitReferenceAtelier(){
  const [artist,setArtist]=useState("all");
  const [showResearch,setShowResearch]=useState(true);
  const selected=WATERCOLOUR_PORTRAIT_REFERENCES.filter(
    r=>artist==="all"||r.artist===artist);
  const artists=[...new Set(WATERCOLOUR_PORTRAIT_REFERENCES.map(r=>r.artist))];
  return <main style={{
    minHeight:"100vh",padding:"clamp(16px,3vw,34px)",background:"#EBE8E2",
    color:"#303B40",fontFamily:"system-ui,sans-serif",display:"grid",
    alignContent:"start",gap:24,
  }}>
    <header style={{maxWidth:1050}}>
      <div style={{fontSize:12,fontWeight:750,letterSpacing:2.0,color:"#815C59"}}>
        WATERCOLOR / PORTRAIT RESEARCH ATELIER
      </div>
      <h1 style={{font:"italic 500 clamp(30px,4vw,46px)/1.12 Georgia,serif",
        margin:"9px 0 14px"}}>
        Study the masters before drawing a face
      </h1>
      <p style={{maxWidth:890,lineHeight:1.65,margin:0,fontSize:15}}>
        The previous two generated portraits were rejected for weak anatomy,
        vector-like facial shapes, implausible eye and mouth construction,
        and unconvincing pigment edges. They have been removed from
        production and from the public Storybook. This page contains
        <strong> external masterwork references only</strong>: no generated
        person or copy of artwork is bundled with the project.
      </p>
      <div style={{borderTop:"1px solid #D1C5B9",marginTop:19,paddingTop:13,
        fontSize:13,lineHeight:1.65,maxWidth:875}}>
        <strong>Research gate:</strong> First make one convincing still face;
        verify 100% and 300% eyes, mouth, nose and cheek crops against
        original anatomical references; then proceed to the rig. Unit
        tests and procedural texture are not evidence of portrait craftsmanship.
      </div>
    </header>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:12}}>
      <label style={{display:"grid",gap:7,fontSize:13,fontWeight:700}}>
        Study artist
        <select value={artist} onChange={e=>setArtist(e.target.value)}
          aria-label="Filter watercolor portrait references" style={control}>
          <option value="all">All / {WATERCOLOUR_PORTRAIT_REFERENCES.length} studies</option>
          {artists.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",
        height:42,fontSize:13,fontWeight:650}}>
        <input type="checkbox" checked={showResearch}
          onChange={e=>setShowResearch(e.target.checked)}
          aria-label="Show construction and failure analysis"/>
        Construction and failure analysis
      </label>
    </div>
    <section aria-label="Watercolor masterwork research references"
      style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,370px),1fr))",
        gap:16,maxWidth:1440,alignItems:"start"}}>
      {selected.map(r=><article key={r.id} data-watercolour-reference={r.id}
        style={{padding:16,border:"1px solid #D2C6B9",borderRadius:12,
          background:"#F8F5EE",display:"grid",gap:12}}>
        <LinkedArtwork reference={r}/>
        <div>
          <div style={{fontSize:11,fontWeight:750,letterSpacing:1.0,
            color:"#886B5B",marginBottom:6}}>
            {r.artist.toUpperCase()} · {r.priority==="primary"?"PRIMARY FACE STUDY":"CONTEXT STUDY"}
          </div>
          <h2 style={{...heading,marginBottom:3,fontSize:20}}>{r.work}</h2>
          <div style={{fontSize:12,color:"#626B6B",lineHeight:1.6}}>
            {r.publishedBy} · {r.viewpoint}
          </div>
        </div>
        <div style={{fontSize:13,lineHeight:1.7}}>
          <h3 style={heading}>Visible craftsmanship</h3>
          <p style={{margin:0}}>{r.observed}</p>
        </div>
        {showResearch&&<div style={{borderTop:"1px solid #DDD5CA",paddingTop:10,
          fontSize:13,lineHeight:1.7}}>
          <h3 style={heading}>What the code must construct</h3>
          <p style={{margin:"0 0 10px"}}>{r.construction}</p>
          <h3 style={heading}>Reject if</h3>
          <p style={{margin:0}}>{r.negativeControl}</p>
        </div>}
        <p style={{fontSize:11,lineHeight:1.5,color:"#6D7270",margin:0}}>
          {r.rightsNote}
        </p>
        <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{...control,textAlign:"center",textDecoration:"none",
            display:"block",marginTop:2}}>
          View credited original artwork
        </a>
      </article>)}
    </section>
    <section aria-label="Portrait release criteria"
      style={{maxWidth:1150,borderTop:"1px solid #CDC3B8",
        paddingTop:17,display:"grid",gap:12}}>
      <h2 style={{font:"italic 500 26px Georgia,serif",margin:0}}>
        New human characters are on hold
      </h2>
      <ol style={{lineHeight:1.75,fontSize:14,
        paddingLeft:22,maxWidth:960,margin:"0 0 12px"}}>
        {WATERCOLOUR_PORTRAIT_GATE.minimumEvidence.map(rule=>
          <li key={rule}>{rule}</li>)}
      </ol>
      <p style={{maxWidth:1050,fontSize:13,lineHeight:1.65,margin:0}}>
        Original art geometry, reusable watercolor pigment and film-animation
        infrastructure may remain in the library; the rejected figures are not
        shipped in this Storybook. External artworks are presented solely for
        comparative research. If an artwork host blocks the preview, open the
        credited original link.
      </p>
    </section>
  </main>;
}

const meta={
  title:"Video Production/Film Looks/Watercolour & Brush/02 Portrait Reference Atelier",
  id:"film-art-watercolour-portrait-reference-atlas",
  component:PortraitReferenceAtelier,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof PortraitReferenceAtelier>;
export default meta;
type Story=StoryObj<typeof meta>;
export const MasterworkStudies:Story={
  render:()=> <PortraitReferenceAtelier/>,
};
