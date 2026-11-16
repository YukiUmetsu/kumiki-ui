import {useMemo,useState} from "react";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoDryBrushInk} from "../../registry/video/riso-dry-brush-react";
import type {RisoBrushOptions,RisoBrushPoint} from "../../registry/video/riso-dry-brush";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

/** RISO62: editorial non-human original brush study. The two drums
 * have independent original cubic vector gestures and micro-fibre relief.
 * Source strokes respond to the 24fps absolute film frame; stock and
 * register never resample when scrubbing backwards. */
type Plate="both"|"blue"|"red";
const P=(x:number,y:number):RisoBrushPoint=>({x,y});
const cobalt="#2362A0",vermilion="#DD593D",paper="#F2E9D6";
const pressure=[
  {at:0,width:.035},{at:.09,width:.33},{at:.24,width:.91},
  {at:.47,width:1},{at:.71,width:.78},{at:.9,width:.36},{at:1,width:.025},
] as const;
const finePressure=[
  {at:0,width:.04},{at:.16,width:.72},{at:.48,width:1},
  {at:.84,width:.5},{at:1,width:.02},
] as const;
const r=(x:number)=>Number(x.toFixed(2));
function RisoBrushArt({aspect,frame,plate,dryness,seed,inkScale,registration,
  grain,animate}:{aspect:RisoAspect;frame:number;plate:Plate;dryness:number;
  seed:number;inkScale:number;registration:number;grain:number;animate:boolean}){
  const portrait=aspect==="portrait",w=portrait?540:960,h=portrait?960:540;
  const spec=useMemo(()=>{
    const source=risoExampleSpec(aspect,seed);
    return {...source,plates:source.plates.map(p=>({...p,
      color:p.id==="blue"?cobalt:vermilion,
      registration:p.id==="blue"?[0,0] as const:[.65,-.45] as const,
    }))};
  },[aspect,seed]);
  const phase=animate?frame/239:0.52;
  const originY=portrait?430:262;
  const brushes=(ink:"blue"|"red")=>{
    const isBlue=ink==="blue",offset=isBlue?0:17;
    return <g data-km-riso62-plate-art={ink}>
      {Array.from({length:isBlue?11:9},(_,i)=>{
        const count=isBlue?11:9;
        const t=i/(count-1),angle=t*Math.PI*1.53+phase*.18+(isBlue?0:.4);
        const large=portrait?178:209;
        const radius=large*(.72+t*.65);
        const sx=w*.51-Math.cos(angle)*radius*.84;
        const sy=originY-Math.sin(angle)*radius*.66;
        const ex=w*.51+Math.cos(angle+.33)*radius*.90;
        const ey=originY+Math.sin(angle+.21)*radius*.73;
        const bend=(isBlue?1:-1)*radius*(.33+.13*Math.sin(i*1.8));
        const options:RisoBrushOptions={
          start:P(sx,sy),control1:P(w*.47+bend,sy-radius*.22),
          control2:P(w*.54-bend,ey+radius*.22),end:P(ex,ey),
          width:inkScale*(isBlue?8.8:7.5)*(1-t*.48),
          pressure:i%3===0?pressure:finePressure,
          dryness:Math.min(1,dryness*(i%4===0?1:.67)),
          seed:seed+offset+i*53,steps:80,
        };
        return <RisoDryBrushInk key={i} {...options}
          color={isBlue?cobalt:vermilion}
          data-km-riso62-original-curve={i}/>;
      })}
      {Array.from({length:19},(_,i)=>{
        const theta=(i*2.399963+phase*.12)+(isBlue?0:.7);
        const rad=(portrait?148:182)*(1+(i%7)*.09);
        const x=w*.51+Math.cos(theta)*rad,y=originY+Math.sin(theta)*rad*.65;
        return <g key={i} fill="none" stroke={isBlue?cobalt:vermilion}
          strokeWidth={i%4===0?1.8:.55} opacity={.78}>
          <path d={"M"+r(x-4)+" "+r(y)+" q4 -"+r(2+i%4)+" 8 0"}/>
          <path d={"M"+r(x)+" "+r(y-2)+" v4"}/>
        </g>;
      })}
    </g>;
  };
  const artworks={
    blue:()=> <g data-km-riso62-source-ink="blue">
      {brushes("blue")}
      <g fill={cobalt} fontFamily="Arial, sans-serif" fontWeight={700}
        letterSpacing={2.4} fontSize={12}>
        <text x={32} y={37}>FIELD NOTES    /    PRINT 62</text>
        <text x={32} y={h-29}>TWO PHYSICAL SPOT MASTERS</text>
      </g>
      <g fill="none" stroke={cobalt} strokeWidth={1}>
        <path d={"M32 46 H"+(w-32)+" M32 "+(h-48)+" H"+(w-32)}/>
      </g>
    </g>,
    red:()=> <g data-km-riso62-source-ink="red">
      {brushes("red")}
      {Array.from({length:9},(_,i)=>{
        const x=w/2+(i-4)*(portrait?31:48),y=originY+(i%3-1)*13;
        return <path key={i} d={"M"+r(x-6)+" "+r(y)+" q5 -7 12 0"}
          fill="none" stroke={vermilion} strokeWidth={1.1}/>;
      })}
      <text x={w-32} y={37} fill={vermilion} textAnchor="end"
        fontSize={11} fontFamily="Arial,sans-serif" letterSpacing={1.4}>
        EDITION    /    2026
      </text>
    </g>,
  };
  return <div data-km-riso62-stage={aspect} data-km-riso62-absolute-frame={frame}
    data-km-riso62-stroke-motion={String(animate)}
    style={{width:"100%",maxWidth:portrait?460:960,
      background:paper,boxShadow:"0 12px 34px #2b30251c"}}>
    <RisoPrint spec={spec} frame={239} artworks={artworks}
      visiblePlateIds={plate==="both"?undefined:[plate]}
      paperGrain={grain} misregistration={registration}
      label="Original Risograph calligraphic current with two true spot inks and paper-white dry-brush fibres"
      style={{width:"100%",height:"auto"}}/>
  </div>;
}
export function RisoBrushStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160);
  const [plate,setPlate]=useState<Plate>("both");
  const [dryness,setDryness]=useState(.73);
  const [inkScale,setInkScale]=useState(1);
  const [registration,setRegistration]=useState(.25);
  const [grain,setGrain]=useState(.58);
  const [seed,setSeed]=useState(62);
  const [animate,setAnimate]=useState(true);
  return <main data-km-riso62-studio="" data-km-riso62-frame={frame}
    data-km-riso62-aspect={aspect} data-km-riso62-plate={plate}
    style={{minHeight:"100vh",padding:22,background:"#EAE0CF",color:"#253F57",
      font:"14px/1.5 system-ui,sans-serif",display:"grid",alignContent:"start",gap:14}}>
    <header style={{maxWidth:920}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:2}}>
        RISOGRAPH  /  ARTCRAFT  /  RISO62  /  NO CHARACTER ANATOMY
      </div>
      <h1 style={{font:"700 29px Georgia,serif",margin:"5px 0"}}>
        Original calligraphic current · physical dry-brush ink
      </h1>
      <p style={{maxWidth:780,margin:0}}>
        A curved pressure-loaded ink ribbon with fine paper-open splinters.
        Each pigment owns its own plate; the dry edges are original editable
        vector contours, never a blur, bitmap, alpha mask or white paint.
      </p>
    </header>
    <RisoBrushArt aspect={aspect} frame={frame} plate={plate}
      dryness={dryness} seed={seed} inkScale={inkScale}
      registration={registration} grain={grain} animate={animate}/>
    <section aria-label="RISO62 source stroke and material controls"
      style={{display:"flex",gap:13,flexWrap:"wrap",maxWidth:1040,alignItems:"end"}}>
      <label>Output
        <select aria-label="RISO62 output aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label>Spot master
        <select aria-label="RISO62 spot ink" value={plate}
          onChange={e=>setPlate(e.target.value as Plate)}>
          <option value="both">Both spot inks</option>
          <option value="blue">Cobalt only</option>
          <option value="red">Vermilion only</option>
        </select>
      </label>
      <label>Source frame {frame}
        <input aria-label="RISO62 absolute frame" type="range" min={0} max={239}
          value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label>Dry fibre {Math.round(dryness*100)}%
        <input aria-label="RISO62 dryness" type="range" min={0} max={1} step={.05}
          value={dryness} onChange={e=>setDryness(Number(e.target.value))}/>
      </label>
      <label>Pressure scale {inkScale.toFixed(2)}×
        <input aria-label="RISO62 pressure width" type="range" min={.5} max={1.7} step={.05}
          value={inkScale} onChange={e=>setInkScale(Number(e.target.value))}/>
      </label>
      <label>Ink registration {registration.toFixed(2)}
        <input aria-label="RISO62 registration" type="range" min={0} max={1} step={.05}
          value={registration} onChange={e=>setRegistration(Number(e.target.value))}/>
      </label>
      <label>Stock tooth {Math.round(grain*100)}%
        <input aria-label="RISO62 paper fibres" type="range" min={0} max={1} step={.05}
          value={grain} onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label>Source seed
        <input aria-label="RISO62 seed" type="number" min={0} max={200000}
          value={seed} onChange={e=>setSeed(Math.max(0,Math.min(200000,Math.floor(+e.target.value||0))))}/>
      </label>
      <label><input type="checkbox" aria-label="RISO62 animate original strokes"
        checked={animate} onChange={e=>setAnimate(e.target.checked)}/>
        Animate drawn source curves</label>
    </section>
    <p style={{fontSize:12,maxWidth:920}}>
      This vector dry-brush construction is an authored print-material study,
      not a microscope-scanned physical press or verified ink-absorption profile.
      Real registration, pressure and paper stock require press proof.
    </p>
  </main>;
}
