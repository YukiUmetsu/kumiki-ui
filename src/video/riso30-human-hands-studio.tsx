import {useMemo,useState} from "react";
import {RisoCharacterInk,RisoCharacterKnockout} from "../../registry/video/riso-character-react";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {RisoPrint} from "../../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../../registry/video/print-plates";
import {COURIER} from "./riso-character-demo";
import {PAPER_ARTIST} from "./riso-human-ensemble";
import {RISO30_ANAT1_HAND,inspectRisoHandArtcraft,layoutRisoHandArtcraft} from "./riso-hand-artcraft";
import {riso53InspectSourceDepth} from "./riso53-palmar-depth-composition";
import {inspectRiso54WebReserves} from "./riso54-interdigital-paper-reserve";
import type {RisoHandSide} from "./riso-hand-artcraft";
import {RISO31_ANAT1_REFERENCE,riso31Inspect} from "./riso31-finger-phalanges";
import {inspectRiso32ThumbIp,RISO32_THUMB_ANAT1} from "./riso32-thumb-ip";
import {inspectRiso33HandFan} from "./riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "./riso36-red-silhouette-gate";
import {inspectRiso39OpposedPaperPinch} from "./riso39-opposed-paper-pinch";
import {inspectRiso41InkPressure} from "./riso41-contact-pressure";
import {inspectRiso42SupportingDigits} from "./riso42-support-digits-gesture";
import {riso52ExpectedOriginalSourceIds} from "./riso52-folded-terminal-source";

type PlateMode="both"|"blue"|"red";
type GestureFrame=0|46|126|144|154|156|160|166|178|186|198|239;
const FRAME_OPTIONS:readonly {frame:GestureFrame;label:string}[]=[
  {frame:0,label:"Opening · anatomical rest"},
  {frame:46,label:"Relaxed fingers"},
  {frame:126,label:"Prepare to receive"},
  {frame:144,label:"Hand approaches"},
  {frame:154,label:"Thenar web approaches paper"},
  {frame:156,label:"Thumb/index web compression"},
  {frame:160,label:"Pinch / paper contact"},
  {frame:166,label:"Receiver peak PIP flexion"},
  {frame:178,label:"Fingertip release"},
  {frame:186,label:"Receiver releases"},
  {frame:198,label:"Settled smile"},
  {frame:239,label:"Final source hold"},
];
const aspect={width:446,height:482};
const printSpec:RisoPrintSpec={
  version:1,width:aspect.width,height:aspect.height,paper:"#FAEDDC",
  seed:38,startFrame:0,passFrames:1,gapFrames:0,
  plates:[
    {id:"blue",color:"#255B8E",opacity:1,dotCell:5,dotAngle:-12,registration:[0,0]},
    {id:"red",color:"#D65641",opacity:1,dotCell:5,dotAngle:17,registration:[.5,-.4]},
  ],
};

/** NOT a raster close-up. Screen density, source finger placement, layering,
 * measured neck/arm continuity and paper knockout all come from the exact
 * character spec and RisoPrint's independent production ink masters. */
function HandPrintPanel({actor,side,frame,plate,zoom,showRig,density}:{
  actor:RisoCharacterSpec;side:RisoHandSide;frame:GestureFrame;
  plate:PlateMode;zoom:number;showRig:boolean;density:number;
}){
  const pose=useMemo(()=>evaluateRisoCharacter(actor,frame),[actor,frame]);
  const palm=pose.joints.find(j=>j.id===side+"-hand");
  if(!palm)throw new Error("RISO30 missing original hand "+actor.id+" "+side);
  const inkPartIds=useMemo(()=>actor.parts.filter(p=>
    p.id.startsWith(side+"-glove")||p.id===side+"-finger-joint-lines"||
    p.id==="cuff-"+side||p.id===side+"-forearm"||
    p.id===side+"-wrist-underprint-clearance").map(p=>p.id),[actor,side]);
  const region=inspectRisoHandArtcraft(actor,frame,side);
  const bones=riso31Inspect(actor,frame,side);
  const riso53Overlap=riso53InspectSourceDepth(actor.parts,
    actor.id as "courier"|"paper-artist");
  const riso53VisibleSourceOrder=side===riso53Overlap.side?
    riso53Overlap.farRedBehind:0;
  const riso54Web=(actor.id==="courier"&&side==="right")||
    (actor.id==="paper-artist"&&side==="left")?
    inspectRiso54WebReserves(actor,frame):null;
  const mainPalmSource=pose.parts.find(p=>p.id===side+"-glove");
  const mcpPlateSource=pose.parts.find(p=>p.id===side+"-glove-knuckle-arc");
  const riso51MorphParts=actor.parts.filter(p=>
    p.id.startsWith(side+"-glove")&&p.pathKeys?.length&&!p.knockoutOnly).length;
  const riso51PalmChanged=mainPalmSource?.d!==actor.parts.find(p=>p.id===side+"-glove")?.d;
  const riso52TerminalPairs=riso52ExpectedOriginalSourceIds(side).filter(id=>
    actor.parts.some(p=>p.id===id&&p.pathKeys?.length)).length/2;
  const mcpSourcePlaneCount=(mcpPlateSource?.d.match(/[Mm]/g)??[]).length;
  const palmSourceCubicCount=(mainPalmSource?.d.match(/[Cc]/g)??[]).length;
  // Exact live anatomical source stations, not a visual proxy or an
  // after-render pixel measurement. 1.0 = unprojected ANAT1 source.
  const supportProjectionRatio=bones.filter(b=>b.digit!=="index").reduce((sum,b)=>
    sum+b.rootLength/b.expectedProximal+
      b.intermediateLength/b.expectedIntermediate,0)/6;
  // RISO54: the camera incidence estimate is a *derived* 2D projection
  // angle from each live moving ANAT1 segment, not a calibrated 3D camera.
  const riso54MeanRayAngle=bones.filter(b=>b.digit!=="index")
    .flatMap(b=>[b.rootLength/b.expectedProximal,
      b.intermediateLength/b.expectedIntermediate])
    .reduce((sum,ratio)=>sum+Math.acos(Math.max(-1,Math.min(1,ratio)))*180/Math.PI,0)/6;
  const thumb=inspectRiso32ThumbIp(actor,frame,side);
  const spacing=inspectRiso33HandFan(actor,frame,side);
  const redInk=useMemo(()=>inspectRiso36RedFingerSilhouettes(actor,frame,side),[actor,frame,side]);
  const pinch=useMemo(()=>inspectRiso39OpposedPaperPinch(actor,frame,side),[actor,frame,side]);
  const inkPressure=useMemo(()=>inspectRiso41InkPressure(actor,frame,side),[actor,frame,side]);
  const support=useMemo(()=>inspectRiso42SupportingDigits(actor,frame,side),[actor,frame,side]);
  // Frame the real articulated five-finger and forearm envelope: the
  // Artist's hand rotates almost horizontally at 160f, so wrist-centering
  // alone clipped source fingertips even though the actor had them.
  const camera=layoutRisoHandArtcraft(pose,side,zoom,aspect.width,aspect.height);
  const {x,y}=camera;
  return <article data-km-riso30-hand={actor.id+"-"+side}
    data-km-riso30-hand-frame={frame}
    data-km-riso30-hand-parts={region.sourceCount}
    data-km-riso30-hand-artcraft={String(region.actuallyEngraved)}
    data-km-riso31-segments={bones.reduce((n,j)=>n+j.phalanxPathCount,0)}
    data-km-riso31-actual-flexion={String(bones.every(j=>j.exactRedSource))}
    data-km-riso49-support-projection-ratio={supportProjectionRatio.toFixed(3)}
    data-km-riso54-mean-source-camera-ray-deg={riso54MeanRayAngle.toFixed(2)}
    data-km-riso50-source-mcp-planes={mcpSourcePlaneCount}
    data-km-riso50-palm-cubics={palmSourceCubicCount}
    data-km-riso51-live-source-morph-parts={riso51MorphParts}
    data-km-riso52-cobalt-red-terminal-pairs={riso52TerminalPairs}
    data-km-riso51-palm-projected={String(riso51PalmChanged)}
    data-km-riso53-original-red-support-behind-palm={riso53VisibleSourceOrder}
    data-km-riso54-native-web-reserves={riso54Web?.sourceCount??0}
    data-km-riso54-moving-web-cubics={riso54Web?.reserves.reduce((n,p)=>n+p.curveCount,0)??0}
    data-km-riso32-ip-articulated={String(thumb.independentRedSegments)}
    data-km-riso32-ip-flexion={thumb.ipLocalAngle.toFixed(2)}
    data-km-riso33-minimum-axis-gap={spacing.minimumAxisGap.toFixed(3)}
    data-km-riso33-axis-intersections={spacing.intersectingAxisPairs.length}
    data-km-riso36-minimum-distal-ink-gap={redInk.minimumDistalGap.toFixed(3)}
    data-km-riso36-ink-contacts={redInk.crossInkContacts}
    data-km-riso36-source-contours={redInk.sourcePartCount}
    data-km-riso39-thumb-index-tip-gap={pinch.tipDistance.toFixed(3)}
    data-km-riso39-thumb-index-ink-gap={pinch.sourceInkGap.toFixed(3)}
    data-km-riso39-pip-curl={pinch.indexLocalPipCurl.toFixed(2)}
    data-km-riso41-actual-red-pad-gap={inkPressure.inkGap.toFixed(3)}
    data-km-riso41-press-ink={inkPressure.pressure.toFixed(3)}
    data-km-riso42-support-pip-flex={support.meanSupportFlex.toFixed(3)}
    data-km-riso42-support-red-bones={support.movingRedSourceCount}
    data-km-riso30-crop-margin={camera.marginX.toFixed(2)}
    data-km-riso30-effective-scale={camera.scale.toFixed(2)}
    style={{border:"1px solid #CBB9A4",borderRadius:7,padding:13,background:"#FFF7E9"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:9}}>
      <strong style={{fontSize:16}}>{actor.id==="courier"?"Courier · donor":"Paper Artist · receiver"}</strong>
      <span style={{fontSize:12,color:"#53717E"}}>{side} hand / {frame}f</span>
    </div>
    <div data-km-riso30-native-plate={plate} style={{width:"100%",overflow:"hidden"}}>
      <RisoPrint spec={printSpec} frame={239} screenMode="am"
        paperGrain={.55} misregistration={.22} screenDensity={density}
        dotGain={.04} visiblePlateIds={plate==="both"?undefined:[plate]}
        artworks={{blue:()=>null,red:()=>null}}
        label={"RISO32 anatomically jointed print master "+actor.id+" "+side}
        foregroundLayers={[{
          id:actor.id+"-"+side+"-anatomy",
          knockout:<RisoCharacterKnockout spec={actor} frame={frame}
            x={x} y={y} scale={camera.scale} spread={1.2}
            onlyPartIds={inkPartIds}/>,
          artworks:{
            blue:paint=><RisoCharacterInk spec={actor} frame={frame}
              plateId="blue" x={x} y={y} scale={camera.scale} paint={paint}
              showRig={showRig} onlyPartIds={inkPartIds}/>,
            red:paint=><RisoCharacterInk spec={actor} frame={frame}
              plateId="red" x={x} y={y} scale={camera.scale} paint={paint}
              onlyPartIds={inkPartIds}/>,
          },
        }]}
        style={{display:"block",width:"100%",height:"auto"}}/>
    </div>
    <p style={{fontSize:12,margin:"9px 0 0",color:"#55727E",lineHeight:1.5}}>
      {region.sourceCount} original hand source paths; five authentic digits,
      12 source-red anatomical phalanges with asymmetric pad/plane/tip silhouettes, a separate opposed moving thumb IP pad,\n      four distinct MCP cobalt crests, screened anatomical tendon pressure,
      joint-local engraved creases and attached nail rims. Every mark remains a spot-colour print master.
      Measured adjacent bone-axis gap: {spacing.minimumAxisGap.toFixed(1)} source units
      (bone-axis only). Actual red stencil fingertip gap:
      {redInk.minimumDistalGap.toFixed(1)} source units;
      {redInk.crossInkContacts} cross-digit ink-contacts across 27 section pairs.
      Original red contact: {inkPressure.inkGap.toFixed(2)} source units, physical ink
      pressure cue {(inkPressure.pressure*100).toFixed(0)}%.
      Thumb–index original moving tip distance: {pinch.tipDistance.toFixed(1)} source units;
      closed red tip ink gap: {pinch.sourceInkGap.toFixed(1)} source units;
      three support fingers mean PIP flex {support.meanSupportFlex.toFixed(1)}° with
      {support.movingRedSourceCount} moving red source segments.
      This is 2D projected anatomy before print registration, not a human-likeness or 3D contact approval.
    </p>
  </article>;
}

export function Riso30HumanHandsWorkbench(){
  const [frame,setFrame]=useState<GestureFrame>(160);
  const [plate,setPlate]=useState<PlateMode>("both");
  const [zoom,setZoom]=useState(6.2);
  const [density,setDensity]=useState(.40);
  const [rig,setRig]=useState(false);
  const [swap,setSwap]=useState(false);
  const subjects=swap
    ? [{actor:COURIER,side:"left" as const},{actor:PAPER_ARTIST,side:"right" as const}]
    : [{actor:COURIER,side:"right" as const},{actor:PAPER_ARTIST,side:"left" as const}];
  return <main data-km-riso30-hands-story="" data-km-riso30-frame={frame}
    data-km-riso30-ink={plate} style={{background:"#EFE4D1",color:"#284A60",
      font:"14px system-ui,sans-serif",minHeight:"100vh",padding:20}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <header style={{padding:"6px 0 16px"}}>
        <div style={{letterSpacing:2,fontSize:12,fontWeight:800}}>RISOGRAPH · ARTCRAFT / ANAT1 · RISO54</div>
        <h1 style={{font:"700 28px Georgia,serif",margin:"7px 0 8px"}}>
          Human hands / ink-carved gesture & paper contact</h1>
        <p style={{maxWidth:930,margin:0,lineHeight:1.55}}>
          Original actor source vectors, live 240-frame figure rig and authentic two-spot-ink paper printing.
          Study ANAT1's metacarpal fan, thenar insertion, varied nail beds and individual digit pressure;
          never a pasted anatomical photograph or postprocessed print texture.
        </p>
      </header>
      <section aria-label="RISO30 original hand controls"
        style={{display:"flex",gap:17,flexWrap:"wrap",alignItems:"end",padding:"7px 0 18px"}}>
        <label>Handoff pose
          <select aria-label="RISO30 gesture frame" value={frame}
            onChange={e=>setFrame(Number(e.target.value) as GestureFrame)}
            style={{display:"block",padding:8,minHeight:36}}>
            {FRAME_OPTIONS.map(o=><option value={o.frame} key={o.frame}>{o.label} · {o.frame}</option>)}
          </select></label>
        <label>Physical ink
          <select aria-label="RISO30 ink plate" value={plate}
            onChange={e=>setPlate(e.target.value as PlateMode)}
            style={{display:"block",padding:8,minHeight:36}}>
            <option value="both">Both physical plates</option>
            <option value="blue">Blue only</option><option value="red">Red only</option>
          </select></label>
        <label>Source zoom · {zoom.toFixed(1)}×
          <input aria-label="RISO30 source zoom" type="range" min={4.8} max={7.4} step={.2}
            value={zoom} onChange={e=>setZoom(Number(e.target.value))}
            style={{display:"block",width:145}}/></label>
        <label>Printed dot coverage · {Math.round(density*100)}%
          <input aria-label="RISO30 dot coverage" type="range" min={.2} max={.7} step={.05}
            value={density} onChange={e=>setDensity(Number(e.target.value))}
            style={{display:"block",width:160}}/></label>
        <label style={{display:"flex",gap:5,alignItems:"center"}}>
          <input type="checkbox" aria-label="RISO30 show source joints" checked={rig}
            onChange={e=>setRig(e.target.checked)}/> Source joints</label>
        <label style={{display:"flex",gap:5,alignItems:"center"}}>
          <input type="checkbox" aria-label="RISO30 compare opposite hands" checked={swap}
            onChange={e=>setSwap(e.target.checked)}/> Compare opposite hands</label>
      </section>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:18}}>
        {subjects.map(({actor,side})=><HandPrintPanel key={actor.id+"-"+side}
          actor={actor} side={side} frame={frame} plate={plate} zoom={zoom}
          showRig={rig} density={density}/>)}
      </div>
      <footer style={{padding:"14px 0",fontSize:12,lineHeight:1.5}}>
        Anatomical basis: Kumiki ANAT1 hand surface form ({RISO30_ANAT1_HAND.anatomicalKnuckleIds.join(", ")});
        source grade S + measured ANSUR median hand length {RISO30_ANAT1_HAND.handLengthMedianMm} mm
        (population reference, NOT this stylized figure's identity).
        Frontal 2D four-finger flexion gain {Math.round(RISO31_ANAT1_REFERENCE.projectedPinchFactor*100)}% of ANAT1 pinch ROM;
        thumb IP {Math.round(RISO32_THUMB_ANAT1.projectionFactor*100)}% of canonical fist flexion (not photo likeness).
        <span style={{marginLeft:10}}>Authored film strokes retain the original contact and release chronology.</span>
      </footer>
    </div>
  </main>;
}
