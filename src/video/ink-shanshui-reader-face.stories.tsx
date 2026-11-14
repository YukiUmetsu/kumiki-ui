import {useEffect,useState} from "react";
import type {ChangeEvent} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {shanshuiBodyFit} from "./ink-shanshui-full-body";
import {shanshuiFaceAssets} from "./ink-shanshui-face-plates";
import {READER_FACE_LANDMARKS} from "./ink-shanshui-reader-face";
type Eyes="open"|"soft"|"closed";
type Mouth="rest"|"aa"|"oh"|"mm"|"smile";
const palette:Record<string,string>={
  "$ink":"#403329","$shadow":"#66513e","$deep":"#937251",
  "$wash":"#bd9d7b","$mist":"#dfcaad","$paper":"#f6ead4",
  "$skin":"#ddc3a5","$skinshade":"#ad8d70","$linen":"#d9c0a0",
};
const colour=(s:string|undefined)=>s?.startsWith("$")?palette[s]??"#49352b":s??"none";
function ReaderFaceStudio(){
  const [detail,setDetail]=useState(1);
  const [eyes,setEyes]=useState<Eyes>("soft");
  const [mouth,setMouth]=useState<Mouth>("rest");
  const [showPoints,setShowPoints]=useState(false);
  const [source,setSource]=useState<string|undefined>();
  const [error,setError]=useState<string|undefined>();
  useEffect(()=>()=>{if(source)URL.revokeObjectURL(source)},[source]);
  const load=(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)){
      setError("Please choose the matching PNG, JPEG or WebP painting.");return;
    }
    setError(undefined);setSource(URL.createObjectURL(file));
  };
  const parts=shanshuiFaceAssets("river-scholar",detail);
  const fit=shanshuiBodyFit("river-scholar");
  const pose=(rest:{x?:number;y?:number;rotation?:number;
    scaleX?:number;scaleY?:number},pivotX:number,pivotY:number)=>
    "translate("+(rest.x??0)+" "+(rest.y??0)+") "+
    "translate("+pivotX+" "+pivotY+") rotate("+(rest.rotation??0)+") "+
    "scale("+(rest.scaleX??1)+" "+(rest.scaleY??1)+") "+
    "translate(-"+pivotX+" -"+pivotY+")";
  const shapes=(key:string)=>{
    const asset=parts[key];
    return asset?.kind==="shapes"?asset.shapes.map((shape,index)=>{
      if(shape.type==="path")return <path key={index} d={shape.d}
        fill={colour(shape.fill)} stroke={colour(shape.stroke)}
        strokeWidth={shape.strokeWidth??1} opacity={shape.opacity??1}
        strokeLinecap="round" strokeLinejoin="round"/>;
      if(shape.type==="ellipse")return <ellipse key={index}
        cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry}
        fill={colour(shape.fill)} stroke={colour(shape.stroke)}
        strokeWidth={shape.strokeWidth??1} opacity={shape.opacity??1}/>;
      return <rect key={index} x={shape.x} y={shape.y}
        width={shape.width} height={shape.height} rx={shape.rx??0}
        fill={colour(shape.fill)} stroke={colour(shape.stroke)}
        strokeWidth={shape.strokeWidth??1} opacity={shape.opacity??1}/>;
    }):null;
  };
  const facePart=(id:string,key:string,pivot:[number,number])=>
    <g data-ink-reader-part={id}
      transform={pose(fit.facialRest[id as keyof typeof fit.facialRest],...pivot)}>
      {shapes(key)}
    </g>;
  const style={padding:"8px 10px",background:"#fdf4e3",
    color:"#413425",borderRadius:5,border:"1px solid #d1bca1"};
  const box={width:"100%",height:470,background:"#f7eedc",
    border:"1px solid #d4bfa3",borderRadius:7};
  return <main style={{background:"#f0e6d4",minHeight:"100vh",
    padding:24,color:"#42352a",fontFamily:"system-ui"}}>
    <header style={{maxWidth:1000,marginBottom:18}}>
      <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",
        color:"#8b6549"}}>Video production / Chinese ink / individual part study</div>
      <h1 style={{font:"400 31px Georgia,serif",margin:"7px 0"}}>
        Young scroll reader · three-quarter face
      </h1>
      <p style={{fontSize:13,lineHeight:1.6,maxWidth:790}}>
        Anatomical study of one figure's face only. Tapered jaw, exposed ear,
        nasal bridge, unequal downcast eyes, upper/lower lids, mouth, wrapped
        topknot, and fine variable-pressure ink lines. Body, hands, robe and
        scene are not changed in this pass.
      </p>
    </header>
    <div style={{display:"flex",flexWrap:"wrap",gap:18,marginBottom:18,
      alignItems:"end"}}>
      <label style={{display:"grid",gap:5}}>Brush detail {Math.round(detail*100)}%
        <input type="range" aria-label="Face craftsmanship" min="0" max="1"
          step=".05" value={detail} style={{width:190}}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
      <label style={{display:"grid",gap:5}}>Eyelid state
        <select aria-label="Face eyelids" value={eyes} style={style}
          onChange={e=>setEyes(e.target.value as Eyes)}>
          <option value="open">Downcast open</option>
          <option value="soft">Thoughtful half-lids</option>
          <option value="closed">Blink closed</option>
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>Mouth viseme
        <select aria-label="Face mouth" value={mouth} style={style}
          onChange={e=>setMouth(e.target.value as Mouth)}>
          {(["rest","aa","oh","mm","smile"] as const).map(x=>
            <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8}}>
        <input type="checkbox" checked={showPoints}
          onChange={e=>setShowPoints(e.target.checked)}/>
        Show portrait landmarks
      </label>
      <label style={{display:"grid",gap:5}}>
        Reference image (local only)
        <input type="file" aria-label="Load scroll reader teacher image"
          accept="image/png,image/jpeg,image/webp" onChange={load}/>
      </label>
    </div>
    {error&&<div role="alert" style={{color:"#a03022"}}>{error}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",
      gap:16,maxWidth:1160}}>
      <section>
        <h2 style={{font:"500 18px Georgia,serif"}}>Teacher painting · face crop</h2>
        <svg data-testid="reader-reference-face" role="img"
          aria-label="Original teacher scroll reader face crop"
          viewBox="445 282 110 130" style={box}>
          {source?
            <image href={source} width="1672" height="941" x="0" y="0"/>:
            <g fill="#806e59" fontSize="5.5">
              <rect x="445" y="282" width="110" height="130"
                fill="#eee1ca"/>
              <text x="500" y="341" textAnchor="middle">
                Load the matching painting above
              </text>
              <text x="500" y="350" textAnchor="middle">
                Images never leave this browser
              </text>
            </g>}
        </svg>
      </section>
      <section>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          Original code-drawn portrait · fitted rig transforms
        </h2>
        <svg data-testid="reader-coded-face" role="img"
          aria-label="Source-informed young reader face construction"
          viewBox="96 26 91 125" style={box}>
          <g transform={pose(fit.headRest,139,124)}>
            <g data-ink-reader-part="face">{shapes("face")}</g>
            {facePart("hair","hair",[140,74])}
            {facePart("brows","brow",[140,94])}
            {facePart("eyes","eyes-"+eyes,[140,102])}
            {eyes!=="closed"&&<g>
              {facePart("pupil-left","pupil-left",[128,102])}
              {facePart("pupil-right","pupil-right",[156,102])}
            </g>}
            {facePart("mouth","mouth-"+mouth,[142,124])}
            {showPoints&&READER_FACE_LANDMARKS.map(pt=>
              <g key={pt.name} data-ink-reader-landmark={pt.name}>
                <circle cx={pt.x} cy={pt.y} r="1.2" fill="#bd382b"/>
                <title>{pt.name}: {pt.x}, {pt.y}</title>
              </g>)}
          </g>
        </svg>
      </section>
    </div>
    <p style={{fontSize:12,color:"#76614a",maxWidth:1100}}>
      Teacher-image coordinates are manually interpreted. This is original
      vector portrait design, not a traced photograph. The exact head and
      child-feature transforms are the same as the production scholar rig.
    </p>
  </main>;
}
const meta={title:"Video production/Film Looks/Chinese Ink/Reader Face Studio",
  id:"video-ink-reader-face",component:ReaderFaceStudio,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof ReaderFaceStudio>;
export default meta;
export const ThreeQuarterFaceStudy:StoryObj<typeof meta>={
  name:"Reader face · anatomy and eyelid/viseme study",
};
