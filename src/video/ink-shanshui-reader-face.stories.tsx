import {useEffect,useState} from "react";
import type {ChangeEvent} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {shanshuiBodyFit} from "./ink-shanshui-full-body";
import {shanshuiFaceAssets} from "./ink-shanshui-face-plates";
import {READER_FACE_LANDMARKS} from "./ink-shanshui-reader-face";
import {READER_CROWN_STRUCTURE,readerCrownRegions} from "./ink-shanshui-reader-crown";
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
  const [crownRegion,setCrownRegion]=useState("all");
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
  const crown=readerCrownRegions(detail);
  const fit=shanshuiBodyFit("river-scholar");
  const pose=(rest:{x?:number;y?:number;rotation?:number;
    scaleX?:number;scaleY?:number},pivotX:number,pivotY:number)=>
    "translate("+(rest.x??0)+" "+(rest.y??0)+") "+
    "translate("+pivotX+" "+pivotY+") rotate("+(rest.rotation??0)+") "+
    "scale("+(rest.scaleX??1)+" "+(rest.scaleY??1)+") "+
    "translate(-"+pivotX+" -"+pivotY+")";
  const shapesFor=(assets:ReturnType<typeof shanshuiFaceAssets>,key:string)=>{
    const asset=assets[key];
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
  const shapes=(key:string)=>shapesFor(parts,key);
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
      <label style={{display:"grid",gap:5}}>Crown structural region
        <select aria-label="Crown structural region" value={crownRegion}
          style={style} onChange={e=>setCrownRegion(e.target.value)}>
          <option value="all">Entire crown · all connected regions</option>
          {READER_CROWN_STRUCTURE.map(r=>
            <option key={r.id} value={r.id}>{r.id}</option>)}
        </select>
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
            <g data-ink-reader-part="reader-ear">{shapes("reader-ear")}</g>
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
      <section>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · eye, nose and mouth at 6×
        </h2>
        <svg data-testid="reader-anatomy-closeup" role="img"
          aria-label="Native portrait microanatomy with adjustable eyelid and viseme"
          viewBox="112 71 48 34" style={{...box,height:266}}>
          <g transform={pose(fit.headRest,139,124)}>
            <g data-ink-anatomy-feature="base-face">{shapes("face")}</g>
            {facePart("brows","brow",[140,94])}
            <g data-ink-anatomy-feature="eye-apertures">
              {facePart("eyes","eyes-"+eyes,[140,102])}
            </g>
            {eyes!=="closed"&&<>
              <g data-ink-anatomy-feature="near-iris">
                {facePart("pupil-left","pupil-left",[128,102])}
              </g>
              <g data-ink-anatomy-feature="far-iris">
                {facePart("pupil-right","pupil-right",[156,102])}
              </g>
            </>}
            <g data-ink-anatomy-feature="lip-planes">
              {facePart("mouth","mouth-"+mouth,[142,124])}
            </g>
          </g>
        </svg>
        <p style={{fontSize:12,lineHeight:1.6,color:"#715d48"}}>
          Inspect unequal eyelid apertures, individually connected irises,
          nasal ridge and alar wings, philtrum, cheek tonal planes and
          expression-sensitive lips. The eye and mouth controls above drive
          this same production artwork, not a separate static mockup.
        </p>
      </section>
      <section>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · isolated nine-region crown construction
        </h2>
        <svg data-testid="reader-crown-artcraft" role="img"
          aria-label="Source-driven reader cap construction with inspectable regions"
          viewBox="36 24 146 112" style={box}>
          {Object.entries(crown).map(([key,marks])=>
            <g key={key} data-km-reader-crown-region={key}
              opacity={crownRegion==="all"||crownRegion===key?1:.13}>
              {marks.map((shape,i)=><path key={i}
                d={shape.d} fill={colour(shape.fill)}
                stroke={colour(shape.stroke)}
                strokeWidth={shape.strokeWidth??1}
                opacity={shape.opacity??1}
                strokeLinecap="round" strokeLinejoin="round"/>)}
            </g>)}
        </svg>
        <p style={{fontSize:12,color:"#715d48"}}>
          Nine named contour groups follow the teacher's actual overlapped
          cloth masses, brow-band slope and two left-falling silk tails.
          Changing a region highlights its exact source-derived SVG art.
        </p>
      </section>
    </div>
    <section data-testid="shanshui-portrait-lineage"
      style={{marginTop:24,maxWidth:1160}}>
      <h2 style={{font:"500 24px Georgia,serif",margin:"0 0 7px"}}>
        Three distinct portrait identities · same animation controls
      </h2>
      <p style={{fontSize:12,color:"#6e5a44",maxWidth:930}}>
        Independent hermit, reader and traveler anatomy. These are the real
        original source-fitted face assets with the existing head pivots,
        not three recolored copies or reference-image cutouts. Change the
        eyelids, mouth and brush detail above to test all three.
      </p>
      <div style={{display:"grid",gap:14,
        gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))"}}>
        {(["misty-hermit","river-scholar","mountain-trail"] as const)
          .map(scene=>{
            const actorArt=shanshuiFaceAssets(scene,detail);
            const actorFit=shanshuiBodyFit(scene);
            // Normalize *only the inspection camera*. The artwork retains
            // the real source-derived character head scale and pivot; a
            // tiny reader must not be judged beside a 2× larger hermit.
            const scaleX=actorFit.headRest.scaleX??1;
            const scaleY=actorFit.headRest.scaleY??1;
            const centerX=139+(143-139)*scaleX+(actorFit.headRest.x??0);
            // Inspect the true source-fitted topknot, not the hair-group
            // bounding rect: the latter includes intentional flying ribbons
            // outside this tight *face* crop.
            const hairRest=actorFit.facialRest.hair;
            const crownSourceY=scene==="river-scholar"?5:
              scene==="misty-hermit"?35:28;
            const crownLocalY=74+(crownSourceY-74)*
              (hairRest.scaleY??1)+(hairRest.y??0);
            const cameraTopY=Math.min(4,crownLocalY-16);
            const topY=124+(cameraTopY-124)*scaleY+(actorFit.headRest.y??0);
            const portraitWidth=94*scaleX;
            const portraitHeight=(183-cameraTopY)*scaleY;
            const portraitBox=[
              centerX-portraitWidth*.5,topY,
              portraitWidth,portraitHeight,
            ].map(x=>Number(x.toFixed(3))).join(" ");
            const part=(id:keyof typeof actorFit.facialRest,
              key:string,pivot:[number,number])=>
              <g data-km-portrait-part={id}
                transform={pose(actorFit.facialRest[id],...pivot)}>
                {shapesFor(actorArt,key)}
              </g>;
            return <article key={scene} style={{background:"#f8efdc",
              padding:12,border:"1px solid #d4c3a8",borderRadius:6}}>
              <div style={{font:"600 13px system-ui",marginBottom:8}}>
                {scene==="misty-hermit"?"Old hermit · deep-set eyes":
                  scene==="river-scholar"?"Young reader · lowered gaze":
                  "Mountain traveler · windward eyes"}
              </div>
              <svg data-km-scene-face={scene}
                data-km-camera-crown={Number(crownLocalY.toFixed(3))}
                data-km-camera-top={Number(cameraTopY.toFixed(3))}
                role="img" aria-label={"Original "+scene+" ink portrait"}
                viewBox={portraitBox}
                style={{width:"100%",height:335,background:"#f6ead4",
                  border:"1px solid #e2d2ba",borderRadius:3}}>
                <g transform={pose(actorFit.headRest,139,124)}>
                  <g data-km-portrait-part="face">
                    {shapesFor(actorArt,"face")}
                  </g>
                  {part("hair","hair",[140,74])}
                  {scene==="river-scholar"&&
                    shapesFor(actorArt,"reader-ear")}
                  {part("brows","brow",[140,94])}
                  {part("eyes","eyes-"+eyes,[140,102])}
                  {eyes!=="closed"&&<g data-km-portrait-irises="">
                    {part("pupil-left","pupil-left",[128,102])}
                    {part("pupil-right","pupil-right",[156,102])}
                  </g>}
                  {part("mouth","mouth-"+mouth,[142,124])}
                  {part("beard","beard",[139,135])}
                </g>
              </svg>
            </article>;
          })}
      </div>
    </section>
    <p style={{fontSize:12,color:"#76614a",maxWidth:1100}}>
      Teacher-image coordinates are manually interpreted. This is original
      vector portrait design, not a traced photograph. The exact head and
      child-feature transforms are the same as the production scholar rig.
    </p>
  </main>;
}
/** Cross-character ArtCraft proof. One source-fitted asset pipeline for
 * three different identities—no generic face clone, raster overlays, or
 * new Storybook folder. Same facial layers that ship in the 960x540 film.
 */
function ThreeFacesArtCraft(){
  const [detail,setDetail]=useState(1);
  const [eyes,setEyes]=useState<Eyes>("open");
  const [mouth,setMouth]=useState<Mouth>("rest");
  const all=[
    {scene:"misty-hermit" as const,title:"Weathered hermit",note:"Sunken asymmetrical eyes, aged cheek planes, beard and restrained mouth"},
    {scene:"river-scholar" as const,title:"Young scroll reader",note:"Fuller youthful cheeks, open almond lids, delicate nose and wrapped crown"},
    {scene:"mountain-trail" as const,title:"Focused traveler",note:"Angular windward profile, raised outer brow, compact eye relief"},
  ];
  const paint=(scene:"misty-hermit"|"river-scholar"|"mountain-trail")=>{
    const assets=shanshuiFaceAssets(scene,detail);
    const fit=shanshuiBodyFit(scene);
    const paths=(part:string)=>{
      const asset=assets[part];
      if(!asset||asset.kind!=="shapes")return null;
      return asset.shapes.map((shape,k)=>shape.type==="path"
        ?<path key={part+k} d={shape.d} fill={colour(shape.fill)}
          stroke={colour(shape.stroke)} strokeWidth={shape.strokeWidth??1}
          opacity={shape.opacity??1} strokeLinecap="round"
          strokeLinejoin="round"/>
        :null);
    };
    const joint=(part:string,pivot:[number,number],key=part)=>{
      const offset=fit.facialRest[part as keyof typeof fit.facialRest];
      const t="translate("+(offset?.x??0)+" "+(offset?.y??0)+") "+
        "translate("+pivot.join(" ")+") rotate("+(offset?.rotation??0)+") "+
        "scale("+(offset?.scaleX??1)+" "+(offset?.scaleY??1)+") "+
        "translate("+(-pivot[0])+" "+(-pivot[1])+")";
      return <g data-km-three-face-part={part} transform={t}>{paths(key)}</g>;
    };
    return <svg data-km-three-face-scene={scene}
      viewBox="100 25 80 135" role="img"
      aria-label={scene+" original fitted code-painted facial anatomy"}
      style={{width:"100%",height:330,background:"#f5e8d3",border:"1px solid #ceb89a"}}>
      <g data-km-three-face-paint="">
        {paths("face")}
        {joint("hair",[140,74])}
        {paths("reader-ear")}
        {joint("brows",[140,94],"brow")}
        {joint("eyes",[140,102],"eyes-"+eyes)}
        {eyes!=="closed"&&<>
          {joint("pupil-left",[128,102])}
          {joint("pupil-right",[156,102])}
        </>}
        {joint("mouth",[142,124],"mouth-"+mouth)}
        {paths("beard")}
      </g>
    </svg>;
  };
  return <main data-testid="shanshui-three-faces-studio" style={{padding:26,
    background:"#ede2cf",minHeight:"100vh",color:"#352b20",
    font:"14px/1.6 system-ui"}}>
    <h1 style={{font:"400 32px Georgia,serif",margin:"0 0 8px"}}>
      Chinese ink · three distinct portrait identities
    </h1>
    <p style={{maxWidth:840,margin:"0 0 20px"}}>
      Original SVG figure paintings from the production film. ArtCraft
      comparison of facial anatomy, aging, eye expression and line weight.
      Detail and expression controls affect all three portraits together.
    </p>
    <div style={{display:"flex",flexWrap:"wrap",gap:15,marginBottom:22,
      alignItems:"end"}}>
      <label style={{display:"grid",gap:6}}>Portrait craftsmanship · {Math.round(detail*100)}%
        <input aria-label="Three faces detail" type="range" min="0" max="1"
          step=".05" value={detail}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
      <label style={{display:"grid",gap:6}}>Eye state
        <select aria-label="Three faces eyelids" value={eyes}
          onChange={e=>setEyes(e.target.value as Eyes)}>
          <option value="open">Open</option><option value="soft">Half-lid</option>
          <option value="closed">Blink closed</option>
        </select>
      </label>
      <label style={{display:"grid",gap:6}}>Mouth
        <select aria-label="Three faces mouth" value={mouth}
          onChange={e=>setMouth(e.target.value as Mouth)}>
          {(["rest","aa","oh","mm","smile"] as const).map(v=>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",
      maxWidth:1020,gap:18}}>
      {all.map(({scene,title,note})=><section key={scene}
        style={{display:"grid",gap:10,alignContent:"start"}}>
        <h2 style={{font:"500 22px Georgia,serif",margin:0}}>{title}</h2>
        {paint(scene)}
        <p style={{fontSize:12,margin:0,color:"#6b5743"}}>{note}</p>
      </section>)}
    </div>
  </main>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/Shanshui Reader Face Studio",
  id:"video-ink-reader-face",component:ReaderFaceStudio,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof ReaderFaceStudio>;
export default meta;
export const ThreeQuarterFaceStudy:StoryObj<typeof meta>={
  name:"Reader face · anatomy and eyelid/viseme study",
};
export const ThreeFacesComparison:StoryObj<typeof meta>={
  name:"Three figure faces · ArtCraft comparison",
  render:()=> <ThreeFacesArtCraft/>,
};
