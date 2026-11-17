import {useEffect,useState} from "react";
import type {ChangeEvent} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {shanshuiBodyFit} from "./ink-shanshui-full-body";
import {shanshuiFaceAssets} from "./ink-shanshui-face-plates";
import {READER_FACE_LANDMARKS} from "./ink-shanshui-reader-face";
import {inkReaderExpressionStudy,READER_INK_EMOTIONS} from
  "./ink-shanshui-reader-expression";
import {inkReaderCueFrame,readerInkCueWeight,READER_INK_CUE} from
  "./ink-shanshui-expression-cue";
import {readerInkGaze,readerInkEyeApertures} from
  "./ink-shanshui-reader-gaze";
import type {ReaderInkEmotion,ReaderInkLids,ReaderInkMouth,
  ReaderInkExpressionStudy} from "./ink-shanshui-reader-expression";
import {readerFaceAnatomy,READER_FACE_ANAT1_POINTS} from
  "./ink-shanshui-reader-anatomy";
import {readerInkPortraitGlazes,READER_INK_GLAZE_REGIONS} from
  "./ink-shanshui-reader-glazes";
import type {ReaderInkGlazeRegion} from "./ink-shanshui-reader-glazes";
import type {CharacterPathShape} from "../../registry/character/definition";
import {READER_CROWN_STRUCTURE,readerCrownRegions} from "./ink-shanshui-reader-crown";
type Eyes="open"|"soft"|"closed";
type Mouth="rest"|"aa"|"oh"|"mm"|"smile";
type AnatomyReview="full"|"wash"|"bones";
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
  const [anatomyReview,setAnatomyReview]=useState<AnatomyReview>("full");
  const [glazeRegion,setGlazeRegion]=useState<ReaderInkGlazeRegion|"all">("all");
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
  const volume=readerFaceAnatomy(detail);
  const glazes=readerInkPortraitGlazes({
    nearCanthus:READER_FACE_ANAT1_POINTS["endocanthion.R"],
    farCanthus:READER_FACE_ANAT1_POINTS["endocanthion.L"],
    sellion:READER_FACE_ANAT1_POINTS.sellion,
    noseTip:READER_FACE_ANAT1_POINTS.pronasale,
    nearCheek:READER_FACE_ANAT1_POINTS["zygion.R"],
    farCheek:READER_FACE_ANAT1_POINTS["zygion.L"],
    chin:READER_FACE_ANAT1_POINTS.menton,
  },detail);
  // The original ANAT1 planes are unchanged in path count and drawing
  // order. The additional source glaze passes are appended to that array.
  const originalPlaneCount=volume.planes.length-
    Object.values(glazes).reduce((sum,shapes)=>sum+shapes.length,0);
  const originalPlanes=volume.planes.slice(0,originalPlaneCount);
  // The comparative proof must use the ACTUAL pre-anatomy live face:
  // not only the opaque head fill. Otherwise the masseter, jaw contour,
  // philtrum and original ink fibres disappear from both proof panels,
  // falsely presenting an easier/toy painting than the production asset.
  // scrollReaderFacePortrait appends planes and nose after source face.
  const sourceFaceBeforeAnatomy=parts.face.kind==="shapes"?
    parts.face.shapes.filter((shape):shape is CharacterPathShape=>
      shape.type==="path").slice(0,
        -volume.planes.length-volume.nose.length):[];
  const faceBase=parts.face.kind==="shapes"?
    parts.face.shapes.filter((shape):shape is CharacterPathShape=>
      shape.type==="path"&&shape.fill==="$skin").slice(-1):[];
  const anatomyMarks=(marks:readonly CharacterPathShape[])=>
    marks.map((shape,index)=>shape.type==="path"?
      <path key={index} d={shape.d}
        fill={colour(shape.fill)} stroke={colour(shape.stroke)}
        strokeWidth={shape.strokeWidth??1}
        opacity={shape.opacity??1}
        strokeLinecap="round" strokeLinejoin="round"/>:null);
  const fit=shanshuiBodyFit("river-scholar");
  /** The film head is NOT in illustration coordinates after source fitting.
   * A raw viewBox around y=90..148 once rendered only the sitter's chin
   * because headRest maps face-space y=100 to output y≈84. Build the
   * Storybook inspection camera from the SAME rigged head transform
   * (including its asymmetric scale and downward head rotation).
   * Visual comparison without an actual visible face is a false pass.
   */
  const fittedFaceWindow=(bounds:readonly [number,number,number,number],
    marginX:number,marginY:number)=>{
    const [x0,y0,x1,y1]=bounds;
    const angle=(fit.headRest.rotation??0)*Math.PI/180;
    const cs=Math.cos(angle),sn=Math.sin(angle);
    const sx=fit.headRest.scaleX??1,sy=fit.headRest.scaleY??1;
    const project=(x:number,y:number):readonly [number,number]=>{
      const dx=(x-139)*sx,dy=(y-124)*sy;
      return [139+(fit.headRest.x??0)+cs*dx-sn*dy,
        124+(fit.headRest.y??0)+sn*dx+cs*dy];
    };
    const points=[
      project(x0,y0),project(x1,y0),
      project(x0,y1),project(x1,y1),
    ];
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs)-marginX,top=Math.min(...ys)-marginY;
    const right=Math.max(...xs)+marginX,bottom=Math.max(...ys)+marginY;
    return [left,top,right-left,bottom-top]
      .map(x=>Number(x.toFixed(3))).join(" ");
  };
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
      <label style={{display:"grid",gap:5}}>Face structure review
        <select aria-label="Face structure review" value={anatomyReview}
          style={style} onChange={e=>
            setAnatomyReview(e.target.value as AnatomyReview)}>
          <option value="full">Skin planes + facial features</option>
          <option value="wash">Soft ink planes only</option>
          <option value="bones">ANAT1 eyes, nose, mouth only</option>
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>Historic face glaze inspection
        <select aria-label="Face glaze region" value={glazeRegion}
          style={style} onChange={e=>setGlazeRegion(
            e.target.value as ReaderInkGlazeRegion|"all")}>
          <option value="all">All six original-source regions</option>
          {READER_INK_GLAZE_REGIONS.map(id=><option key={id} value={id}>
            {id}</option>)}
        </select>
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
          viewBox={fittedFaceWindow([112,89,166,137],4,5)}
          style={{...box,height:266}}>
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
      <section data-testid="reader-ink-native-viseme-atlas"
        style={{gridColumn:"1 / -1"}}>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · five original speech cels · identical source mouth camera
        </h2>
        <p style={{fontSize:12,lineHeight:1.6,color:"#715d48",maxWidth:1020}}>
          Rest, open AA, rounded OH, closed MM and smile retain the
          original three-quarter ANAT1 mouth pose and head calibration.
          The moving source face, chin and nose remain beneath each
          inspected cel. Separate translucent cavity, vermilion edge,
          philtrum and reflected lower lip paint distinguish AA/OH
          from pasted opaque black lozenges. Select a cel to update
          the actual film-face preview above.
        </p>
        <div style={{display:"grid",gap:10,
          gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))"}}>
          {(["rest","aa","oh","mm","smile"] as const).map(state=>{
            const asset=parts["mouth-"+state];
            const strokes=asset?.kind==="shapes"?asset.shapes.length:0;
            const correctedMouthY=fit.facialRest.mouth.y??0;
            return <figure key={state}
              data-km-ink-viseme-study={state}
              style={{margin:0,padding:7,border:"1px solid #d4bfa3",
                background:"#f7eedc",borderRadius:4}}>
              <svg data-km-ink-viseme-camera={state} role="img"
                aria-label={"Original reader source-face "+state+" lip cel"}
                viewBox={fittedFaceWindow([
                  131,118.6+correctedMouthY,
                  152.5,139.2+correctedMouthY,
                ],1.8,1.3)}
                style={{display:"block",width:"100%",height:200,
                  background:"#f7eedc"}}>
                <g transform={pose(fit.headRest,139,124)}>
                  <g data-km-ink-viseme-base="">{shapes("face")}</g>
                  <g data-km-ink-viseme-part={state}
                    transform={pose(fit.facialRest.mouth,142,124)}>
                    {shapes("mouth-"+state)}
                  </g>
                </g>
              </svg>
              <figcaption style={{font:"12px system-ui",padding:"5px 2px"}}>
                <button type="button" onClick={()=>setMouth(state)}
                  aria-label={"Inspect "+state.toUpperCase()+" mouth cel"}
                  aria-pressed={mouth===state}
                  style={{...style,width:"100%",cursor:"pointer",
                    fontWeight:mouth===state?700:500}}>
                  {state.toUpperCase()} · {strokes} independent marks
                </button>
              </figcaption>
            </figure>;
          })}
        </div>
      </section>
      <section>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · ANAT1 facial volume and ink-bone inspection
        </h2>
        <svg data-testid="reader-face-plane-study" role="img"
          aria-label="Original ANAT1-anchored three-quarter reader facial planes"
          viewBox={fittedFaceWindow([106,68,170,147],4.5,3.5)}
          style={{...box,height:300}}>
          <g transform={pose(fit.headRest,139,124)}>
            <g data-km-reader-anatomy-region="opaque-head">
              {anatomyMarks(faceBase)}
            </g>
            <g data-km-reader-anatomy-region="wash"
              opacity={anatomyReview==="bones"?.08:1}>
              {anatomyMarks(volume.planes)}
            </g>
            <g data-km-reader-anatomy-region="nose"
              opacity={anatomyReview==="wash"?.08:1}>
              {anatomyMarks(volume.nose)}
            </g>
            <g data-km-reader-anatomy-region="near-far-eyes"
              opacity={anatomyReview==="wash"?.08:1}>
              {anatomyMarks(eyes==="open"?volume.eyesOpen:
                eyes==="soft"?volume.eyesSoft:volume.eyesClosed)}
              {eyes!=="closed"&&anatomyMarks([
                ...volume.nearPupil,...volume.farPupil])}
            </g>
            <g data-km-reader-anatomy-region="lips"
              opacity={anatomyReview==="wash"?.08:1}>
              {anatomyMarks(volume.lips)}
            </g>
            {showPoints&&Object.entries(READER_FACE_ANAT1_POINTS)
              .filter(([id])=>["sellion","pronasale","subnasale",
                "stomion","menton","zygion.R","zygion.L",
                "endocanthion.R","endocanthion.L"].includes(id))
              .map(([id,[x,y]])=>
                <circle key={id} data-km-anat1-face-point={id}
                  cx={x} cy={y} r=".48" fill="#b33f30"/>)}
          </g>
        </svg>
        <p style={{fontSize:12,lineHeight:1.6,color:"#715d48"}}>
          Compare graded wash, skeletal feature lines and the finished
          anatomical composition. The same original face anatomy powers
          every blinking and speaking cel. The 3/4 view retains far-side
          foreshortening; this is not a generic mirrored frontal mask.
          All guide landmarks use Kumiki ANAT1 anatomical naming.
        </p>
      </section>
      <section data-testid="reader-ink-glaze-comparison">
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · Ming portrait orbital and cheek glaze proof
        </h2>
        <p style={{fontSize:12,lineHeight:1.5,color:"#715d48"}}>
          Two views of the SAME source-fitted ANAT1 portrait. Original
          structural washes on the left; translucent Zeng Jing-inspired
          multi-pass paper-value glazes on the right. Select a source region
          to inspect optical depth, not an invented smooth gradient.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",
          gap:8}}>
          {([false,true] as const).map(layered=><figure key={String(layered)}
            style={{margin:0,minWidth:0}}>
            <svg data-km-ink-glaze-variant={layered?"layered":"original"}
              role="img"
              aria-label={layered?"Reader with live original-source ink glazes":
                "Reader with retained ANAT1 structural ink washes"}
              viewBox={fittedFaceWindow([108,78,168,147],3.6,3.5)}
              style={{width:"100%",height:245,background:"#f7eedc"}}>
              <g transform={pose(fit.headRest,139,124)}>
                <g data-km-ink-glaze-base="">
                  {anatomyMarks(sourceFaceBeforeAnatomy)}
                  {anatomyMarks(originalPlanes)}
                </g>
                {layered&&READER_INK_GLAZE_REGIONS.map(id=>
                  <g key={id} data-km-ink-glaze-region={id}
                    opacity={glazeRegion==="all"||glazeRegion===id?1:.09}>
                    {anatomyMarks(glazes[id])}
                  </g>)}
                {anatomyMarks(volume.nose)}
                {facePart("brows","brow",[140,94])}
                {facePart("eyes","eyes-"+eyes,[140,102])}
                {eyes!=="closed"&&<>
                  {facePart("pupil-left","pupil-left",[128,102])}
                  {facePart("pupil-right","pupil-right",[156,102])}
                </>}
                {facePart("mouth","mouth-"+mouth,[142,124])}
              </g>
            </svg>
            <figcaption style={{fontSize:12,color:"#725b44",marginTop:4}}>
              {layered?"Layered · six anatomical regions":
                "Original · preserved source planes"}
            </figcaption>
          </figure>)}
        </div>
      </section>
      <section data-testid="reader-ink-malar-nose-microscope"
        style={{gridColumn:"1 / -1"}}>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · native cheek and nasal ink-wash microscopy
        </h2>
        <p style={{fontSize:12,color:"#715d48",maxWidth:940,lineHeight:1.55}}>
          Three real source-paint windows at the SAME face orientation and
          pigment detail as the film. Inspect the near malar convexity,
          foreshortened far orbital cheek, and continuous sellion-to-alar
          nasal bridge. Broad feathered tone must read as facial volume,
          not as duplicate parallel stripes or a hard beak. No tracing
          from the historical portrait and no new mask assets.
        </p>
        <div style={{display:"grid",gap:12,
          gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))"}}>
          {([
            {id:"malar-near",title:"Near malar · convex wash",
              bounds:[114,101,143,129]},
            {id:"malar-far",title:"Far malar · receding wash",
              bounds:[145,98,169,131]},
            {id:"nose-bridge",title:"Nasal ridge · alar continuity",
              bounds:[141,95,160,130]},
          ] as const).map(({id,title,bounds})=>
            <figure key={id} data-km-ink-wash-micro={id}
              style={{margin:0,background:"#f7eedc",padding:10,
                border:"1px solid #cdb899",minWidth:0}}>
              <svg data-km-ink-wash-source={id} role="img"
                aria-label={"Live original reader "+title}
                viewBox={fittedFaceWindow(bounds,2,2)}
                style={{display:"block",width:"100%",height:286,
                  background:"#f7eedc"}}>
                <g transform={pose(fit.headRest,139,124)}>
                  <g data-km-ink-wash-native-face="">{shapes("face")}</g>
                  {facePart("brows","brow",[140,94])}
                  {facePart("eyes","eyes-"+eyes,[140,102])}
                  {eyes!=="closed"&&<>
                    {facePart("pupil-left","pupil-left",[128,102])}
                    {facePart("pupil-right","pupil-right",[156,102])}
                  </>}
                  {facePart("mouth","mouth-"+mouth,[142,124])}
                </g>
              </svg>
              <figcaption style={{fontSize:12,color:"#715d48",marginTop:8}}>
                {title} · {glazes[id].length} independent ink passes
              </figcaption>
            </figure>)}
        </div>
      </section>
      <section>
        <h2 style={{font:"500 18px Georgia,serif"}}>
          ArtCraft · live auricular Y-fold and recessed concha
        </h2>
        <svg data-testid="reader-ear-native-study" role="img"
          aria-label="Source-fitted live reader ear helix, forked antihelix and concha"
          viewBox={fittedFaceWindow([109,94,122,121],2.4,2)}
          style={{...box,height:304}}>
          <g transform={pose(fit.headRest,139,124)}>
            <g data-km-reader-ear-layer="opaque-face">{shapes("face")}</g>
            <g data-km-reader-ear-layer="hair">
              {facePart("hair","hair",[140,74])}
            </g>
            <g data-km-reader-ear-layer="cartilage">
              {shapes("reader-ear")}
            </g>
            {showPoints&&READER_FACE_LANDMARKS
              .filter(pt=>pt.name==="exposed-ear"||pt.name==="earlobe")
              .map(pt=><g key={pt.name}
                data-km-reader-ear-landmark={pt.name}>
                <circle cx={pt.x} cy={pt.y} r=".37"
                  fill="#b33f30"/>
                <title>{pt.name}</title>
              </g>)}
          </g>
        </svg>
        <p style={{fontSize:12,lineHeight:1.6,color:"#715d48"}}>
          The production ear, not a new decal. A three-branch antihelix
          diverges around the concha's recessed wash; the helix,
          tragus and lobule keep independent ink weight and fine paper
          highlights. Use brush detail and landmark controls above to
          inspect actual source-linked geometry.
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

/**
 * The SOURCE READER, not a decorative face chart: five deterministic
 * EXPR1 action-unit stops retain the existing ANAT1/source-fitted face
 * and all original per-path brow fibre detail. Three-quarter foreshortening,
 * mouth visemes, ear overlap and the head rig remain in the production art.
 */
function ReaderExpressionLab(){
  const [emotion,setEmotion]=useState<ReaderInkEmotion>("smile");
  const [intensity,setIntensity]=useState(.75);
  const [detail,setDetail]=useState(1);
  const [lidOverride,setLidOverride]=useState<ReaderInkLids|"auto">("auto");
  const [mouthOverride,setMouthOverride]=useState<ReaderInkMouth|"auto">("auto");
  const [cueFrame,setCueFrame]=useState(24);
  const [gazeX,setGazeX]=useState(0);
  const [gazeY,setGazeY]=useState(0);
  const [showAnat1,setShowAnat1]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [reduceMotion,setReduceMotion]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed=(event:MediaQueryListEvent)=>{
      setReduceMotion(event.matches);
      if(event.matches)setPlaying(false);
    };
    setReduceMotion(media.matches);
    media.addEventListener("change",changed);
    return ()=>media.removeEventListener("change",changed);
  },[]);
  useEffect(()=>{
    if(!playing||reduceMotion)return;
    const clock=window.setInterval(()=>setCueFrame(previous=>
      previous>=READER_INK_CUE.frames?0:previous+1),
    1000/READER_INK_CUE.fps);
    return ()=>window.clearInterval(clock);
  },[playing,reduceMotion]);
  const fit=shanshuiBodyFit("river-scholar");
  const pose=(offset:{x?:number;y?:number;rotation?:number;
    scaleX?:number;scaleY?:number},pivot:[number,number])=>
    "translate("+(offset.x??0)+" "+(offset.y??0)+") "+
    "translate("+pivot.join(" ")+") rotate("+(offset.rotation??0)+") "+
    "scale("+(offset.scaleX??1)+" "+(offset.scaleY??1)+") "+
    "translate("+(-pivot[0])+" "+(-pivot[1])+")";
  // Match every close-up to the actual film's head rest transform.
  // A raw source-space viewBox can silently crop out the irises or cap.
  // This shared projector gives face, near and far orbital studies the
  // same rotation, anisotropic scale, and 139,124 native rig pivot.
  const fittedCamera=(x0:number,y0:number,x1:number,y1:number,
    marginX=3.5,marginY=4)=>{
    const angle=(fit.headRest.rotation??0)*Math.PI/180;
    const cs=Math.cos(angle),sn=Math.sin(angle);
    const sx=fit.headRest.scaleX??1,sy=fit.headRest.scaleY??1;
    const project=(x:number,y:number)=>{
      const dx=(x-139)*sx,dy=(y-124)*sy;
      return [139+(fit.headRest.x??0)+cs*dx-sn*dy,
        124+(fit.headRest.y??0)+sn*dx+cs*dy];
    };
    const pts=[project(x0,y0),project(x1,y0),
      project(x0,y1),project(x1,y1)];
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const x=Math.min(...xs)-marginX,y=Math.min(...ys)-marginY;
    return [x,y,Math.max(...xs)-Math.min(...xs)+marginX*2,
      Math.max(...ys)-Math.min(...ys)+marginY*2]
      .map(v=>Number(v.toFixed(3))).join(" ");
  };
  const faceCamera=()=>fittedCamera(108,87,169,143);
  const cueWeight=readerInkCueWeight(cueFrame);
  const main=inkReaderCueFrame(emotion,intensity,cueFrame,detail);
  const brush=(study:ReaderInkExpressionStudy,eyes:ReaderInkLids,
    mouth:ReaderInkMouth,id:string)=>{
    const gaze=readerInkGaze(gazeX,gazeY);
    const apertures=readerInkEyeApertures(study.assets,eyes);
    const clipNear="reader-ink-gaze-"+id+"-near";
    const clipFar="reader-ink-gaze-"+id+"-far";
    const shapes=(name:string)=>{
      const asset=study.assets[name];
      return asset?.kind==="shapes"?asset.shapes.map((shape,i)=>
        shape.type==="path"?<path key={name+i} d={shape.d}
          fill={colour(shape.fill)} stroke={colour(shape.stroke)}
          strokeWidth={shape.strokeWidth??1} opacity={shape.opacity??1}
          strokeLinecap="round" strokeLinejoin="round"/>:null):null;
    };
    const part=(key:string,pivot:[number,number],asset=key,
      offset?:{readonly x:number;readonly y:number},clip?:string)=>{
      const rest=pose(fit.facialRest[key as keyof typeof fit.facialRest],pivot);
      // The SVG clipPath must share the pupil's OWN source-local space.
      // Applying the mask to a parent head-transformed group made actual
      // Chromium irises vanish despite correct DOM path/count tests.
      const travel="translate("+(offset?.x??0)+" "+(offset?.y??0)+")";
      return <g data-km-ink-expression-part={key} transform={rest}>
        {clip?
          <g data-km-ink-iris-window="" clipPath={"url(#"+clip+")"}>
            <g data-km-ink-iris-travel="" transform={travel}>
              {shapes(asset)}
            </g>
          </g>:
          shapes(asset)}
      </g>;
    };
    return <g data-km-ink-expression-paint=""
      transform={pose(fit.headRest,[139,124])}>
      <defs>
        {apertures&&<>
          <clipPath id={clipNear} clipPathUnits="userSpaceOnUse">
            <path d={apertures.near}/>
          </clipPath>
          <clipPath id={clipFar} clipPathUnits="userSpaceOnUse">
            <path d={apertures.far}/>
          </clipPath>
        </>}
      </defs>
      <g data-km-ink-expression-part="face">{shapes("face")}</g>
      {part("hair",[140,74])}
      <g data-km-ink-expression-part="reader-ear">{shapes("reader-ear")}</g>
      {part("brows",[140,94],"brow")}
      {part("eyes",[140,102],"eyes-"+eyes)}
      {apertures&&<>
        <g data-km-ink-iris-occlusion="near">
          {part("pupil-left",[128,102],"pupil-left",gaze.near,clipNear)}
        </g>
        <g data-km-ink-iris-occlusion="far">
          {part("pupil-right",[156,102],"pupil-right",gaze.far,clipFar)}
        </g>
      </>}
      {part("mouth",[142,124],"mouth-"+mouth)}
    </g>;
  };
  const eyes=lidOverride==="auto"?main.lids:lidOverride;
  const mouth=mouthOverride==="auto"?main.mouth:mouthOverride;
  return <main data-testid="shanshui-expr1-reader-studio"
    style={{background:"#f0e6d4",minHeight:"100vh",padding:24,
      color:"#403328",font:"14px/1.6 system-ui"}}>
    <h1 style={{font:"400 31px Georgia,serif",margin:"0 0 9px"}}>
      Young reader · EXPR1 facial expression atelier
    </h1>
    <p style={{maxWidth:840,margin:"0 0 18px"}}>
      EXPR1 FACS muscle action units deform the existing ANAT1 reader's
      individual eyebrow fibres and add restrained facial creases. The
      actual fitted face, ear, crown, irises and five speaking cels remain
      editable. This is a reference-guided art study, not an approved
      historical-portrait likeness.
    </p>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"end",
      marginBottom:22}}>
      <label style={{display:"grid",gap:5}}>EXPR1 emotion
        <select aria-label="EXPR1 emotion" value={emotion}
          onChange={e=>setEmotion(e.target.value as ReaderInkEmotion)}>
          {READER_INK_EMOTIONS.map(id=><option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>
        EXPR1 intensity {Math.round(intensity*100)}%
        <input aria-label="EXPR1 intensity" type="range" min="0" max="1"
          step=".05" value={intensity}
          onChange={e=>setIntensity(Number(e.target.value))}/>
      </label>
      <label style={{display:"grid",gap:5}}>
        EXPR1 motion frame {cueFrame}/{READER_INK_CUE.frames}
        <input aria-label="EXPR1 motion frame" type="range"
          min="0" max={READER_INK_CUE.frames} step="1" value={cueFrame}
          onChange={e=>{setCueFrame(Number(e.target.value));setPlaying(false);}}/>
      </label>
      <button type="button" disabled={reduceMotion}
        aria-label={playing?"Pause EXPR1 cue":"Play EXPR1 cue"}
        aria-pressed={playing}
        onClick={()=>setPlaying(was=>!was)}>
        {playing?"Pause cue":"Play cue"}
      </button>
      <button type="button" onClick={()=>{setPlaying(false);setCueFrame(0);}}>
        Reset cue
      </button>
      <label style={{display:"grid",gap:5}}>Ink detail {Math.round(detail*100)}%
        <input aria-label="EXPR1 ink detail" type="range" min="0" max="1"
          step=".05" value={detail}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
      <label style={{display:"grid",gap:5}}>
        ANAT1 iris gaze horizontal {gazeX.toFixed(2)}
        <input aria-label="EXPR1 iris gaze horizontal" type="range"
          min="-1" max="1" step=".05" value={gazeX}
          onChange={e=>setGazeX(Number(e.target.value))}/>
      </label>
      <label style={{display:"grid",gap:5}}>
        ANAT1 iris gaze vertical {gazeY.toFixed(2)}
        <input aria-label="EXPR1 iris gaze vertical" type="range"
          min="-1" max="1" step=".05" value={gazeY}
          onChange={e=>setGazeY(Number(e.target.value))}/>
      </label>
      <button type="button" onClick={()=>{setGazeX(0);setGazeY(0);}}>
        Reset gaze
      </button>
      <label style={{display:"flex",gap:7,alignItems:"center"}}>
        <input aria-label="Show EXPR1 ANAT1 facial landmarks" type="checkbox"
          checked={showAnat1} onChange={e=>setShowAnat1(e.target.checked)}/>
        ANAT1 measured facial anchors
      </label>
      <label style={{display:"grid",gap:5}}>Eyelid override
        <select aria-label="EXPR1 eyelids" value={lidOverride}
          onChange={e=>setLidOverride(e.target.value as ReaderInkLids|"auto")}>
          {(["auto","open","soft","closed"] as const).map(id=>
            <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>Viseme override
        <select aria-label="EXPR1 viseme" value={mouthOverride}
          onChange={e=>setMouthOverride(e.target.value as ReaderInkMouth|"auto")}>
          {(["auto","rest","aa","oh","mm","smile"] as const).map(id=>
            <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
    </div>
    <div style={{display:"grid",gap:18,
      gridTemplateColumns:"repeat(auto-fit,minmax(275px,1fr))",maxWidth:1050}}>
      <section>
        <h2 style={{font:"500 19px Georgia,serif"}}>Production head · full silhouette</h2>
        <svg data-testid="reader-expr1-full" role="img"
          aria-label="Full original source-fitted reader with EXPR1 expression"
          viewBox="96 26 91 125"
          style={{width:"100%",height:400,background:"#f7eedc"}}>
          {brush(main,eyes,mouth,"live-full")}
        </svg>
      </section>
      <section>
        <h2 style={{font:"500 19px Georgia,serif"}}>ANAT1 eye / mouth microcamera</h2>
        <svg data-testid="reader-expr1-micro" role="img"
          aria-label="EXPR1 muscle expression near-eye, brow, nose, cheek and mouth"
          viewBox={faceCamera()}
          style={{width:"100%",height:400,background:"#f7eedc"}}>
          {brush(main,eyes,mouth,"live-micro")}
          {showAnat1&&<g data-km-ink-expression-anat1=""
            pointerEvents="none" transform={pose(fit.headRest,[139,124])}>
            {Object.entries(READER_FACE_ANAT1_POINTS).map(([name,[x,y]])=>
              <g data-km-ink-anat1-anchor={name} key={name}>
                <circle cx={x} cy={y} r=".58" fill="#b3402e"
                  stroke="#f7eedc" strokeWidth=".2"/>
                <title>{name}: {x}, {y}</title>
              </g>)}
          </g>}
        </svg>
      </section>
    </div>
    <section data-testid="reader-expr1-iris-microscope"
      aria-label="Native ANAT1 individual iris and upper-lid closeups"
      style={{maxWidth:1050,marginTop:22}}>
      <h2 style={{font:"500 21px Georgia,serif"}}>
        Native ANAT1 iris / eyelid microscopy · separate near and far orbits
      </h2>
      <p style={{fontSize:12,maxWidth:900,color:"#715b46"}}>
        Original ink, not a detached icon: each iris remains source-painted,
        bounded by its unequal open/soft-lid aperture and linked to its own
        gaze rig. The limbal dry-brush strokes remain inside each iris,
        never becoming a second dark pupil. Blink and gaze controls above
        also apply here at the same frame.
      </p>
      <div style={{display:"grid",gap:14,
        gridTemplateColumns:"repeat(auto-fit,minmax(255px,1fr))"}}>
        <figure style={{margin:0}}>
          <svg data-testid="reader-expr1-iris-near" role="img"
            aria-label="ANAT1 original near eye with iris ink-rim and occluding eyelid"
            // ANAT1 pupil rig has its OWN source-space y correction.
            // Do not frame the unposed raw eye: native Chromium showed
            // only ear/cheek wash, with the actual iris out of shot.
            viewBox={fittedCamera(118,
              99.4+(fit.facialRest["pupil-left"].y??0),
              137,111.2+(fit.facialRest["pupil-left"].y??0),1.2,1.1)}
            style={{display:"block",width:"100%",height:235,background:"#f7eedc"}}>
            {brush(main,eyes,mouth,"iris-near")}
          </svg>
          <figcaption style={{fontSize:12,marginTop:5}}>
            Near orbit · larger source eye, stronger lid/iris contact
          </figcaption>
        </figure>
        <figure style={{margin:0}}>
          <svg data-testid="reader-expr1-iris-far" role="img"
            aria-label="ANAT1 original foreshortened far eye with iris ink-rim and occluding eyelid"
            viewBox={fittedCamera(147.5,
              98.8+(fit.facialRest["pupil-right"].y??0),
              166.7,110.6+(fit.facialRest["pupil-right"].y??0),1.2,1.1)}
            style={{display:"block",width:"100%",height:235,background:"#f7eedc"}}>
            {brush(main,eyes,mouth,"iris-far")}
          </svg>
          <figcaption style={{fontSize:12,marginTop:5}}>
            Far orbit · narrower perspective, lighter secondary limbus
          </figcaption>
        </figure>
      </div>
    </section>
    <h2 style={{font:"500 21px Georgia,serif",marginTop:24}}>
      Action-unit motion keyframes · same face and lighting
    </h2>
    <div data-testid="reader-expr1-frames"
      style={{display:"grid",gridTemplateColumns:
        "repeat(auto-fit,minmax(145px,1fr))",gap:10,maxWidth:1050}}>
      {[0,.25,.5,.75,1].map(weight=>{
        const frame=inkReaderExpressionStudy(emotion,weight,detail);
        return <figure key={weight} style={{margin:0}}>
          <svg data-km-ink-expression-frame={weight} role="img"
            aria-label={"Original reader emotion "+emotion+" at "+weight*100+" percent"}
            viewBox={faceCamera()}
            style={{width:"100%",height:205,background:"#f7eedc"}}>
            {brush(frame,lidOverride==="auto"?frame.lids:lidOverride,
              mouthOverride==="auto"?frame.mouth:mouthOverride,
              "intensity-"+Math.round(weight*100))}
          </svg>
          <figcaption style={{fontSize:12}}>
            {Math.round(weight*100)}% · {emotion}
          </figcaption>
        </figure>;
      })}
    </div>
    <section data-testid="reader-expr1-emotion-atlas" aria-label="ANAT1 and EXPR1 original reader emotion atlas">
      <h2 style={{font:"500 21px Georgia,serif",margin:"26px 0 6px"}}>
        One sitter, five EXPR1 action-unit poses · matched ink and camera
      </h2>
      <p style={{fontSize:12,color:"#715b46",maxWidth:1000,margin:"0 0 12px"}}>
        Every panel paints the same original three-quarter ANAT1 face, ear,
        hair fibres, source eye windows and lip geometry. Only EXPR1 muscle
        actions and restrained ink creases differ. The five views share the
        selected intensity and pigment detail, independent of the film cue.
        Select a pose to inspect it in the full-size motion controls.
      </p>
      <div style={{display:"grid",gap:12,maxWidth:1050,
        gridTemplateColumns:"repeat(auto-fit,minmax(174px,1fr))"}}>
        {READER_INK_EMOTIONS.map(id=>{
          const sample=inkReaderExpressionStudy(id,intensity,detail);
          const selected=emotion===id;
          return <figure key={id} data-km-ink-expression-emotion={id}
            style={{margin:0,minWidth:0,padding:8,background:"#f7eedc",
              border:selected?"2px solid #8c6b50":"2px solid #d3bea2"}}>
            <svg data-km-ink-expression-atlas-svg={id} role="img"
              aria-label={"Original source reader in "+id+" EXPR1 pose"}
              viewBox={faceCamera()}
              style={{width:"100%",height:205,display:"block"}}>
              {brush(sample,sample.lids,sample.mouth,"atlas-"+id)}
            </svg>
            <figcaption style={{display:"grid",gap:5,marginTop:8}}>
              <button type="button" aria-pressed={selected}
                aria-label={"Select "+id+" EXPR1 expression"}
                onClick={()=>{setEmotion(id);setCueFrame(24);setPlaying(false);}}
                style={{padding:"7px 9px",background:"#eee1c9",
                  border:"1px solid #bda68a",color:"#47382a"}}>
                {id}
              </button>
              <output data-km-ink-expression-metrics={id}
                style={{fontSize:11,lineHeight:1.55,color:"#6a513d"}}>
                Inner brow {sample.features.browInner.toFixed(2)}
                {" · "}lid {sample.features.eyeOpen.toFixed(2)}×
                {" · "}cheek {sample.features.cheekRaise.toFixed(2)}
                {" · "}lip {sample.features.mouthCorner.toFixed(2)}
              </output>
            </figcaption>
          </figure>;
        })}
      </div>
    </section>
    <h2 style={{font:"500 21px Georgia,serif",marginTop:24}}>
      Film-time facial transition · 24 fps / four seconds
    </h2>
    <div data-testid="reader-expr1-cue-frames"
      style={{display:"grid",gridTemplateColumns:
        "repeat(auto-fit,minmax(125px,1fr))",gap:10,maxWidth:1050}}>
      {[0,6,12,60,72,84,96].map(frame=>{
        const sampled=inkReaderCueFrame(emotion,intensity,frame,detail);
        return <figure key={frame} style={{margin:0}}>
          <svg data-km-ink-cue-frame={frame} role="img"
            aria-label={"EXPR1 film cue frame "+frame+" "+emotion}
            viewBox={faceCamera()}
            style={{width:"100%",height:165,background:"#f7eedc"}}>
            {brush(sampled,lidOverride==="auto"?sampled.lids:lidOverride,
              mouthOverride==="auto"?sampled.mouth:mouthOverride,
              "cue-"+frame)}
          </svg>
          <figcaption style={{fontSize:12}}>Frame {frame} · {
            Math.round(readerInkCueWeight(frame)*100)}%</figcaption>
        </figure>;
      })}
    </div>
    {reduceMotion&&<p style={{fontSize:12}}>
      Reduced motion is enabled. Manual frame scrubbing remains available.
    </p>}
    <output data-testid="reader-expr1-diagnostics" style={{display:"block",
      maxWidth:1050,fontSize:12,marginTop:16}}>
      EXPR1 · brow inner {main.features.browInner.toFixed(3)} eye-widths;
      brow outer {main.features.browOuter.toFixed(3)};
      lid opening {main.features.eyeOpen.toFixed(2)}×;
      cheek raise {main.features.cheekRaise.toFixed(3)};
      lip corner {main.features.mouthCorner.toFixed(3)};
      selected {eyes} lids / {mouth} viseme.
      Active crease regions: {main.activeCreases.join(", ")||"none"}.
      Cue frame {cueFrame} · {Math.round(cueWeight*100)}% eased activation.
      Gaze ({gazeX.toFixed(2)}, {gazeY.toFixed(2)}) with asymmetric orbital masks.
    </output>
    <p style={{maxWidth:1050,fontSize:12,color:"#756149"}}>
      Three-quarter perspective and ink-flow strokes are drawn in the source
      head coordinate system, not a mirrored front-face mask. Cue motion
      is opt-in to this Storybook study and does not overwrite the original
      film expression track. Review native 960×540 playback before sign-off.
    </p>
  </main>;
}

const meta={title:"Video production/Film Looks/Chinese Ink/Shanshui Reader Face Studio",
  id:"video-ink-reader-face",component:ReaderFaceStudio,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof ReaderFaceStudio>;
export default meta;
export const ThreeQuarterFaceStudy:StoryObj<typeof meta>={
  name:"Reader face · anatomy and eyelid/viseme study",
};
export const ReaderExpressionArtCraft:StoryObj<typeof meta>={
  name:"EXPR1 expression atelier · source-fitted FACS keyframes",
  render:()=> <ReaderExpressionLab/>,
};
export const ThreeFacesComparison:StoryObj<typeof meta>={
  name:"Three figure faces · ArtCraft comparison",
  render:()=> <ThreeFacesArtCraft/>,
};
