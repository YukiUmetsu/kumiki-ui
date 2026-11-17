import {useMemo,useState} from "react";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoDryBrushInk} from "../../registry/video/riso-dry-brush-react";
import {createRisoBrushGeometry,risoBrushInkPath} from "../../registry/video/riso-dry-brush";
import type {RisoBrushOptions,RisoBrushPoint} from "../../registry/video/riso-dry-brush";
import {createRisoContactTrap} from "../../registry/video/riso-contact-trap";
import {createGuardedRisoContactTrap} from "../../registry/video/riso-stencil-topology";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

const paper="#F2E9D6",cobalt="#2362A0",vermilion="#DD593D";
const pressure=[
  {at:0,width:.025},{at:.14,width:.62},{at:.38,width:1},
  {at:.66,width:.91},{at:.86,width:.5},{at:1,width:.025},
] as const;
const filament=[
  {at:0,width:.015},{at:.19,width:.57},{at:.48,width:.95},
  {at:.78,width:.6},{at:1,width:.02},
] as const;
const p=(x:number,y:number):RisoBrushPoint=>({x,y});

/** New original paired 2-spot source art: separate cubic flow under a common
 * paper datum. Every pressure stop, bristle slit, pore and edge remains native.
 * These are not extra copies of the existing 20 RISO62 editorial strokes. */
export function riso66Source(aspect:RisoAspect,frame:number,seed:number){
  if(!["landscape","portrait"].includes(aspect)||!Number.isSafeInteger(frame)||
    frame<0||frame>239||!Number.isSafeInteger(seed)||seed<0||seed>200000)
    throw new RangeError("RISO66 source needs a 0..239 absolute frame and bounded seed");
  const w=aspect==="landscape"?960:540,h=aspect==="landscape"?540:960;
  const motion=Math.sin(frame/239*Math.PI*2)*3.25;
  const mainStart=p(w*.11,h*.43),mainC1=p(w*.34,h*.29+motion);
  const mainC2=p(w*.62,h*.57-motion*.65),mainEnd=p(w*.89,h*.455);
  const blue:RisoBrushOptions={
    start:mainStart,control1:mainC1,control2:mainC2,end:mainEnd,
    width:34,pressure,dryness:.76,seed,steps:80,
  };
  const red:RisoBrushOptions={
    start:p(mainStart.x,mainStart.y+36),
    control1:p(mainC1.x,mainC1.y+36),
    control2:p(mainC2.x,mainC2.y+36),
    end:p(mainEnd.x,mainEnd.y+36),
    width:31,pressure,dryness:.74,seed:seed+31,steps:80,
  };
  const accent=(kind:"blue"|"red",i:number):RisoBrushOptions=>{
    const isBlue=kind==="blue",top=isBlue ? 0.17 : 0.71;
    const rise=isBlue?-.033:.035;
    const row=i*.058;
    return {
      start:p(w*(.18+i*.05),h*(top+row)),
      control1:p(w*(.34+i*.05),h*(top+row+rise)),
      control2:p(w*(.65-i*.026),h*(top+row-rise*.6)),
      end:p(w*(.80-i*.042),h*(top+row+rise*.4)),
      width:7.3-i*1.05,pressure:filament,
      dryness:.86,seed:seed+(isBlue?180:260)+i*53,steps:80,
    };
  };
  return {blue,red,w,h,blueAccents:[accent("blue",0),accent("blue",1),
    accent("blue",2)],redAccents:[accent("red",0),accent("red",1),
    accent("red",2)]};
}
export interface Riso66PanelProps {
  aspect:RisoAspect;
  frame:number;
  seed:number;
  registered:readonly [number,number];
  enabled:boolean;
  maximumGap:number;
  extension:number;
  overlap:number;
  grain:number;
  master:"both"|"blue"|"red";
  zoom:number;
  id:"before"|"after";
  /** RISO67 opt-in fail-closed actual SVG topology audit. */
  topologyGuard?:boolean;
}
export function Riso66Panel({aspect,frame,seed,registered,enabled,maximumGap,
  extension,overlap,grain,master,zoom,id,topologyGuard=false}:Riso66PanelProps){
  const art=riso66Source(aspect,frame,seed);
  const blue=createRisoBrushGeometry(art.blue);
  const red=createRisoBrushGeometry(art.red);
  const trapOptions={side:"positive" as const,maximumGap,
    maximumExtension:enabled?extension:0,overlap};
  const trap=topologyGuard
    ? createGuardedRisoContactTrap(blue,red,trapOptions)
    : createRisoContactTrap(blue,red,trapOptions);
  const source=risoExampleSpec(aspect,seed);
  const spec={...source,plates:source.plates.map(plate=>({
    ...plate,color:plate.id==="blue"?cobalt:vermilion,
    registration:plate.id==="blue"?[0,0] as const:registered,
  }))};
  const ink={
    blue:()=> <g data-km-riso66-blue-master="">
      <path data-km-riso66-primary-source="" d={risoBrushInkPath(trap.geometry)}
        fill={cobalt} stroke="none" fillRule="evenodd"/>
      {art.blueAccents.map((s,i)=><RisoDryBrushInk key={i} {...s}
        color={cobalt} data-km-riso66-accents="blue"/>)}
      <g fill={cobalt} fontFamily="Arial,sans-serif" fontWeight={700}
        fontSize={12} letterSpacing={2.3}>
        <text x={32} y={38}>INK / MATERIAL / 66</text>
        <text x={32} y={art.h-28}>SELECTIVE MATERIAL EDGE</text>
      </g>
      <path d={`M32 47H${art.w-32} M32 ${art.h-48}H${art.w-32}`}
        fill="none" stroke={cobalt} strokeWidth={.8}/>
    </g>,
    red:()=> <g data-km-riso66-red-master="">
      <RisoDryBrushInk {...art.red} color={vermilion}
        data-km-riso66-neighbor-source=""/>
      {art.redAccents.map((s,i)=><RisoDryBrushInk key={i} {...s}
        color={vermilion} data-km-riso66-accents="red"/>)}
      <text x={art.w-32} y={38} textAnchor="end" fill={vermilion}
        fontSize={11} fontFamily="Arial,sans-serif" letterSpacing={1.4}>
        TWO SEPARATE STENCILS
      </text>
    </g>,
  };
  return <figure data-km-riso66-panel={id}
    data-km-riso66-enabled={String(enabled)}
    data-km-riso66-runs={trap.contactRuns}
    data-km-riso66-matched={trap.matchedStations}
    data-km-riso66-expanded={trap.expandedStations}
    data-km-riso67-guard={topologyGuard?
      ("accepted" in trap && trap.accepted?"accepted":"rejected"):"off"}
    data-km-riso67-paper-holes={trap.geometry.dryPaths.length}
    style={{margin:0,minWidth:0}}>
    <figcaption style={{font:"700 14px system-ui",marginBottom:8}}>
      {id==="before"?"Original adjacent spot inks · no trapping":
        "Source geometry · selectively trapped shared edge"}
    </figcaption>
    <div data-km-riso66-viewport="" style={{aspectRatio:aspect==="landscape"?
      "16 / 9":"9 / 16",width:"100%",overflow:"hidden",
      background:paper,border:"1px solid #877767",boxSizing:"border-box"}}>
      <div data-km-riso66-magnification={zoom} style={{
        width:"100%",transform:"scale("+zoom+")",transformOrigin:"50% 50%"}}>
        <RisoPrint spec={spec} frame={239} paperGrain={grain}
          misregistration={0} artworks={ink}
          visiblePlateIds={master==="both"?undefined:[master]}
          label="Two independent authored Risograph stencils, original dry-fibre texture and optional contact-edge trapping"
          style={{width:"100%",height:"auto"}}/>
      </div>
    </div>
  </figure>;
}
const control={display:"grid",gap:5,minWidth:170,font:"600 13px system-ui"} as const;
/** UI owns preview controls only; all source and contact decisions are pure
 * absolute-frame evaluations for film-seek/export parity. */
export function RisoContactTrapStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160);
  const [seed,setSeed]=useState(66);
  const [enabled,setEnabled]=useState(true);
  const [maxGap,setMaxGap]=useState(12);
  const [extension,setExtension]=useState(6);
  const [overlap,setOverlap]=useState(.8);
  const [x,setX]=useState(2);
  const [y,setY]=useState(1.5);
  const [zoom,setZoom]=useState(3);
  const [grain,setGrain]=useState(.61);
  const [master,setMaster]=useState<"both"|"blue"|"red">("both");
  const shared={aspect,frame,seed,registered:[x,y] as const,
    maximumGap:maxGap,extension,overlap,grain,master,zoom};
  const inspect=useMemo(()=>{
    const art=riso66Source(aspect,frame,seed);
    const base=createRisoBrushGeometry(art.blue);
    const neighbor=createRisoBrushGeometry(art.red);
    return createRisoContactTrap(base,neighbor,{
      side:"positive",maximumGap:maxGap,maximumExtension:extension,overlap});
  },[aspect,frame,seed,maxGap,extension,overlap]);
  return <main data-km-riso66-studio="" data-km-riso66-aspect={aspect}
    data-km-riso66-frame={frame} data-km-riso66-zoom={zoom}
    data-km-riso66-enabled={String(enabled)}
    style={{padding:22,minHeight:"100vh",boxSizing:"border-box",display:"grid",
      alignContent:"start",gap:15,background:"#EBE2D2",color:"#243E54",
      font:"14px/1.5 system-ui,sans-serif"}}>
    <header style={{maxWidth:1060}}>
      <div style={{fontWeight:800,fontSize:12,letterSpacing:1.9}}>
        RISOGRAPH / RISO66 / SOURCE-NATIVE TWO-INK TRAP / NO HUMAN ANATOMY
      </div>
      <h1 style={{font:"700 28px Georgia,serif",margin:"5px 0"}}>
        Measured shared-edge ink trap · preserve every dry-paper opening
      </h1>
      <p style={{margin:0}}>
        Sustained adjacent original pressure ribbons receive a bounded local
        ink extension on one named outer edge. No whole-master dilation:
        all source cubics, pressure stops, grain, long fiber channels and
        individual paper-white pores are preserved in both examples.
      </p>
    </header>
    <section aria-label="RISO66 original native trapped and untrapped artwork"
      style={{display:"grid",gridTemplateColumns:
        "repeat(auto-fit,minmax(min(100%,350px),490px))",gap:17,maxWidth:1110}}>
      <Riso66Panel {...shared} id="before" enabled={false}/>
      <Riso66Panel {...shared} id="after" enabled={enabled}/>
    </section>
    <section aria-label="RISO66 contact, print, camera and source controls"
      style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:14,maxWidth:1100}}>
      <label style={control}>Output
        <select aria-label="RISO66 output aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 / 960 × 540</option>
          <option value="portrait">9:16 / 540 × 960</option>
        </select>
      </label>
      <label style={control}>Physical ink master
        <select aria-label="RISO66 spot master" value={master}
          onChange={e=>setMaster(e.target.value as "both"|"blue"|"red")}>
          <option value="both">Both separate inks</option>
          <option value="blue">Cobalt only</option>
          <option value="red">Vermilion only</option>
        </select>
      </label>
      <label style={control}>Source frame {frame}/239
        <input aria-label="RISO66 absolute source frame" type="range" min={0}
          max={239} value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label style={control}>Max facing-edge gap {maxGap.toFixed(1)}px
        <input aria-label="RISO66 maximum contact gap" type="range" min={1} max={12}
          step={.5} value={maxGap} onChange={e=>setMaxGap(Number(e.target.value))}/>
      </label>
      <label style={control}>Max outward trap {extension.toFixed(1)}px
        <input aria-label="RISO66 maximum trap" type="range" min={0} max={12}
          step={.5} value={extension} onChange={e=>setExtension(Number(e.target.value))}/>
      </label>
      <label style={control}>Local overprint {overlap.toFixed(1)}px
        <input aria-label="RISO66 overlap" type="range" min={0} max={3}
          step={.1} value={overlap} onChange={e=>setOverlap(Number(e.target.value))}/>
      </label>
      <label style={control}>Vermilion displacement x {x.toFixed(1)}px
        <input aria-label="RISO66 red register x" type="range" min={-8} max={8}
          step={.5} value={x} onChange={e=>setX(Number(e.target.value))}/>
      </label>
      <label style={control}>Vermilion displacement y {y.toFixed(1)}px
        <input aria-label="RISO66 red register y" type="range" min={-8} max={8}
          step={.5} value={y} onChange={e=>setY(Number(e.target.value))}/>
      </label>
      <label style={control}>Original paper tooth {grain.toFixed(2)}
        <input aria-label="RISO66 paper grain" type="range" min={0} max={1}
          step={.05} value={grain} onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={control}>Original source seed
        <input aria-label="RISO66 source seed" type="number" min={0} max={200000}
          value={seed} onChange={e=>setSeed(Math.max(0,Math.min(200000,
            Math.trunc(Number(e.target.value)||0))))}/>
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO66 trap enabled" type="checkbox" checked={enabled}
          onChange={e=>setEnabled(e.target.checked)}/>
        Apply source-native shared-edge trap
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO66 3x macro" type="checkbox" checked={zoom===3}
          onChange={e=>setZoom(e.target.checked?3:1)}/>
        3× original SVG macro / 1× full sheet
      </label>
    </section>
    <section aria-label="RISO66 contact topological preflight"
      data-km-riso66-contacts={inspect.contactRuns} style={{
        borderTop:"1px solid #958B7E",paddingTop:12,maxWidth:1110}}>
      <strong>{inspect.contactRuns} sustained facing-edge contact region(s);
        {inspect.expandedStations} source stations qualify</strong>
      <p style={{margin:"5px 0"}}>
        Maximum local positive-ink extension:
        {" "}{inspect.maxAppliedExtension.toFixed(2)} design pixels.
        Physical second-drum register: {x.toFixed(1)}px / {y.toFixed(1)}px.
      </p>
      <p style={{margin:0,fontSize:12}}>
        This is conditional, measured DIGITAL shared-edge geometry. It preserves
        existing paper-open subpaths but is not a blanket proof of zero white
        seams, stencil self-intersection absence on arbitrary art, empirical
        press accuracy or print-color calibration. Dry-fiber material is never
        rebuilt by an SVG blur, morphology filter or raster dilation.
      </p>
    </section>
  </main>;
}
