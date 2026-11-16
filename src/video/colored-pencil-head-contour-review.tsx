import {useMemo,useState} from "react";
import type {HeadAnnotationSession,NativeDimensions} from
  "./colored-pencil-head-annotation";
import {inspectPencilHeadContourDifference} from
  "./colored-pencil-head-contour-diagnostics";

export type PencilHeadLocalReviewImage={
  url:string;
  dimensions:NativeDimensions;
};
export type PencilHeadContourReviewProps={
  session:HeadAnnotationSession;
  source:PencilHeadLocalReviewImage|null;
  output:PencilHeadLocalReviewImage|null;
};
type Scope="worst-five"|"all"|"none";
const ink={red:"#9C3730",blue:"#236A84",gray:"#42555C"};
const pct=(n:number)=> (n*100).toFixed(2)+"%";

/** Non-persistent ArtCraft art-review overlay. Does not alter the underlying
 * image, copy photo pixels into the pencil scene, or approve rendering.
 * Reference coordinates are placed on the REAL native frame via isotropic
 * scale and translation, without shape-warping or source-derived tracing.
 */
export function PencilHeadContourReview({
  session,source,output,
}:PencilHeadContourReviewProps){
  const [scope,setScope]=useState<Scope>("worst-five");
  const report=useMemo(()=>inspectPencilHeadContourDifference(
    session,source&&output?{
      source:source.dimensions,output:output.dimensions,
    }:null,
  ),[session,source,output]);
  const sorted=[...report.differences].sort((a,b)=>
    b.distancePixels-a.distancePixels);
  const selected=scope==="none"?[]:scope==="all"?
    report.differences:sorted.slice(0,5);
  const width=output?.dimensions.width??960;
  const height=output?.dimensions.height??540;
  const radius=Math.max(2,width/240);
  return <section data-km-head-contour-review=""
    data-km-artcraft-approval="unapproved"
    data-km-contour-review-state={report.state}
    style={{display:"grid",gap:12,maxWidth:1100,
      background:"#F2F0E9",border:"1px solid #BEBBB3",
      borderRadius:6,padding:18}}>
    <header style={{display:"grid",gap:6}}>
      <h2 style={{margin:0,font:"600 21px Georgia,serif"}}>
        Macro ArtCraft · Original-source versus native-head contour
      </h2>
      <p style={{margin:0,fontSize:13,color:ink.gray,maxWidth:940}}>
        This is a geometry **diagnostic**, not source proof or realism
        approval. Matched 18-point anchors are displayed at the original
        output pixel coordinates. A source reference is aligned with ONLY
        uniform scale and translation from its cranial apex; no horizontal
        stretch, elastic warp, face feature synthesis, or source-photo
        pixels are used in the pencil artwork.
      </p>
    </header>
    {report.state==="incomplete"?<p role="status"
      data-km-contour-review-blocked=""
      style={{margin:0,fontSize:14,color:"#8B3C34"}}>
      BLOCKED: {report.reasons.join("; ")}. Complete independent
      annotations on two genuine local files; a synthetic test fixture
      cannot validate portrait fidelity.
    </p>:<>
      <div data-km-head-contour-numeric-audit=""
        style={{display:"flex",gap:18,flexWrap:"wrap",
          fontSize:13,color:ink.gray}}>
        <span>Isotropic head scale: {report.sourceToOutputScale!.toFixed(3)}×</span>
        <span>18-point RMS: {pct(report.rmsInHeadHeights!) } of head height</span>
        <span>Worst point: {pct(report.maxInHeadHeights!)} of head height</span>
        <span>Cheek-width/height log change:
          {" "}{pct(Math.abs(report.aspectLogChange!))}</span>
      </div>
      <p role="status" style={{margin:0,fontSize:13,color:"#7F3E35"}}>
        {report.reasons.join("; ")}.
        {" "}ART HOLD: numerical proximity is never artist approval.
      </p>
      <label style={{display:"grid",gap:4,maxWidth:290,fontSize:13}}>
        Source-to-render contour vectors
        <select aria-label="Source/render contour vector scope"
          value={scope} onChange={e=>setScope(e.target.value as Scope)}
          style={{background:"white",padding:10,minHeight:40,
            border:"1px solid #C4C0B8",borderRadius:4}}>
          <option value="worst-five">Five largest differences</option>
          <option value="all">All 18 original contour points</option>
          <option value="none">Hide comparison vectors</option>
        </select>
      </label>
      <div style={{maxWidth:720,background:"#E7E4DC",
        border:"1px solid #C2BEB4",overflow:"hidden"}}>
        <div style={{position:"relative",width:"100%"}}>
          <img src={output!.url}
            alt="Actual local native-output screenshot for anatomical source comparison"
            draggable={false}
            style={{display:"block",width:"100%",height:"auto"}}/>
          <svg viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none" pointerEvents="none"
            aria-label="Original source projection and native 18-point error vectors"
            data-km-head-contour-vectors=""
            style={{position:"absolute",width:"100%",height:"100%",
              inset:0,overflow:"hidden"}}>
            {selected.map((point)=>{
              const index=report.differences.findIndex(v=>v.id===point.id)+1;
              return <g key={point.id}
                data-km-head-contour-difference={point.id}>
                <title>{point.id}: {(point.distancePixels).toFixed(2)}
                  original output pixels apart</title>
                <line x1={point.output.x} y1={point.output.y}
                  x2={point.sourceProjected.x}
                  y2={point.sourceProjected.y} stroke={ink.red}
                  strokeWidth={Math.max(1,width/600)} opacity={.82}
                  strokeDasharray={`${radius*1.2} ${radius*.65}`}/>
                <circle cx={point.sourceProjected.x}
                  cy={point.sourceProjected.y}
                  r={radius*1.2} fill="none" stroke={ink.blue}
                  strokeWidth={Math.max(1.3,width/580)}/>
                <circle cx={point.output.x} cy={point.output.y}
                  r={radius*.9} fill={ink.red} stroke="#FFFAEE"
                  strokeWidth={Math.max(.8,width/1100)}/>
                <text x={point.output.x+radius*1.5}
                  y={point.output.y-radius*.8}
                  fontSize={Math.max(10,width/90)}
                  fill="#75271F" stroke="#FFFAEE" strokeWidth={2.3}
                  paintOrder="stroke" fontFamily="system-ui"
                  fontWeight="bold">{index}</text>
              </g>;
            })}
          </svg>
        </div>
      </div>
      <p style={{fontSize:12,margin:0,color:ink.gray}}>
        Blue ring = reference contour after non-warping isotropic
        alignment; red dot = actual generated contour; dashed
        segment = native pixel displacement. The original image stays
        unchanged and the overlay is never exported to film.
      </p>
      <ol data-km-head-contour-ranked=""
        style={{margin:0,paddingLeft:24,fontSize:13,display:"grid",gap:4}}>
        {sorted.slice(0,5).map(p=><li key={p.id}>
          {p.id}: {p.distancePixels.toFixed(2)} native pixels
          {" "}({pct(p.distanceInHeadHeights)} of head height)
        </li>)}
      </ol>
    </>}
  </section>;
}
