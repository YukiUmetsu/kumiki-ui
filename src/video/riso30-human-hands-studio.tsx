import {useMemo,useState} from "react";
import {RisoCharacterInk,RisoCharacterKnockout} from "../../registry/video/riso-character-react";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {RisoPrint} from "../../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../../registry/video/print-plates";
import {COURIER} from "./riso-character-demo";
import {PAPER_ARTIST} from "./riso-human-ensemble";
import {RISO30_ANAT1_HAND,inspectRisoHandArtcraft,layoutRisoHandArtcraft} from "./riso-hand-artcraft";
import type {RisoHandSide} from "./riso-hand-artcraft";
import {RISO31_ANAT1_REFERENCE,riso31Inspect} from "./riso31-finger-phalanges";

type PlateMode="both"|"blue"|"red";
type GestureFrame=0|46|126|144|160|166|178|186|198|239;
const FRAME_OPTIONS:readonly {frame:GestureFrame;label:string}[]=[
  {frame:0,label:"Opening · anatomical rest"},
  {frame:46,label:"Relaxed fingers"},
  {frame:126,label:"Prepare to receive"},
  {frame:144,label:"Hand approaches"},
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
    p.id==="cuff-"+side||p.id===side+"-forearm").map(p=>p.id),[actor,side]);
  const region=inspectRisoHandArtcraft(actor,frame,side);
  const bones=riso31Inspect(actor,frame,side);
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
        label={"RISO30 print master "+actor.id+" "+side}
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
      12 red articulated sections across four fingers, individual PIP/DIP blue creases
      and moving nail rims. Every mark remains a spot-colour print master.
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
        <div style={{letterSpacing:2,fontSize:12,fontWeight:800}}>RISOGRAPH · ARTCRAFT / ANAT1 · RISO30</div>
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
        Frontal 2D flexion gain {Math.round(RISO31_ANAT1_REFERENCE.projectedPinchFactor*100)}% of ANAT1 pinch ROM (not photo likeness).
        <span style={{marginLeft:10}}>Authored film strokes retain the original contact and release chronology.</span>
      </footer>
    </div>
  </main>;
}
