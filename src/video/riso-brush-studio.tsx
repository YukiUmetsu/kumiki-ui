import {useEffect,useMemo,useRef,useState} from "react";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoDryBrushInk} from "../../registry/video/riso-dry-brush-react";
import type {RisoBrushOptions,RisoBrushPoint} from "../../registry/video/riso-dry-brush";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

/** RISO62: editorial non-human original brush study. The two drums
 * have independent original cubic vector gestures and micro-fibre relief.
 * Source strokes respond to the 24fps absolute film frame; stock and
 * register never resample when scrubbing backwards. */
export type RisoBrushPlate="both"|"blue"|"red";
type Plate=RisoBrushPlate;
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
/** Independently authored source-cubic gestures: start, loaded handles,
 * release and pressure role. These are not offset copies of a master line.
 * Field composition keeps large open-paper spaces and overlapping arcs. */
type Gesture=readonly [number,number,number,number,number,number,number,number,number];
const landscapeCobalt:readonly Gesture[]=[
  [.08,.21,.27,.08,.55,.11,.88,.20,1.25],
  [.13,.29,.35,.21,.59,.27,.89,.24,.38],
  [.07,.44,.20,.27,.43,.23,.83,.37,2.05],
  [.10,.52,.23,.36,.61,.45,.92,.38,.63],
  [.14,.63,.33,.48,.57,.46,.82,.55,1.35],
  [.07,.75,.25,.58,.59,.63,.93,.68,1.75],
  [.20,.81,.42,.72,.70,.81,.90,.77,.45],
  [.23,.43,.36,.34,.45,.41,.62,.48,.34],
  [.49,.17,.59,.17,.67,.08,.79,.13,.22],
  [.13,.69,.29,.76,.37,.64,.50,.62,.28],
  [.57,.55,.70,.56,.71,.46,.90,.49,.42],
];
const landscapeVermilion:readonly Gesture[]=[
  [.10,.37,.27,.51,.42,.67,.88,.48,1.48],
  [.12,.54,.36,.68,.51,.27,.89,.35,1.82],
  [.19,.77,.25,.58,.59,.73,.91,.60,.75],
  [.33,.21,.39,.33,.56,.45,.65,.34,.60],
  [.31,.73,.46,.84,.71,.58,.82,.72,.37],
  [.10,.57,.23,.52,.34,.57,.45,.64,.40],
  [.49,.33,.63,.23,.68,.37,.83,.32,.35],
  [.16,.83,.33,.78,.48,.79,.64,.86,.24],
  [.61,.58,.71,.61,.78,.51,.90,.55,.29],
];
const portraitCobalt:readonly Gesture[]=[
  [.21,.16,.64,.31,.18,.53,.66,.84,1.90],
  [.37,.14,.70,.34,.24,.63,.73,.88,.82],
  [.15,.24,.55,.40,.13,.59,.53,.76,1.45],
  [.26,.29,.73,.38,.28,.60,.76,.73,.85],
  [.14,.40,.62,.43,.35,.63,.70,.79,.60],
  [.22,.20,.52,.36,.39,.44,.67,.55,.36],
  [.15,.59,.44,.59,.35,.78,.60,.87,1.05],
  [.46,.19,.60,.34,.68,.43,.62,.51,.26],
  [.26,.67,.46,.70,.55,.83,.73,.86,.44],
  [.22,.34,.43,.27,.56,.39,.59,.45,.32],
  [.39,.52,.50,.59,.35,.70,.53,.75,.30],
];
const portraitVermilion:readonly Gesture[]=[
  [.70,.19,.25,.29,.81,.49,.23,.75,1.58],
  [.80,.30,.26,.40,.82,.62,.30,.84,1.30],
  [.74,.24,.35,.35,.75,.49,.48,.66,.96],
  [.59,.14,.54,.30,.78,.41,.49,.56,.60],
  [.78,.45,.27,.57,.69,.72,.35,.83,.90],
  [.57,.26,.50,.44,.66,.55,.58,.65,.42],
  [.70,.56,.47,.60,.48,.79,.42,.89,.36],
  [.51,.39,.34,.44,.51,.55,.36,.63,.28],
  [.68,.73,.57,.81,.44,.82,.35,.86,.26],
];
const cubicPoint=(g:Gesture,t:number,w:number,h:number)=>{
  const s=1-t,a=s*s*s,b=3*s*s*t,c=3*s*t*t,d=t*t*t;
  return P(w*(a*g[0]+b*g[2]+c*g[4]+d*g[6]),
    h*(a*g[1]+b*g[3]+c*g[5]+d*g[7]));
};
export interface RisoBrushArtProps {
  aspect:RisoAspect;
  /** Absolute source frame, 0..239; the production FilmStage owns the clock. */
  frame:number;
  /** Press master progress, independently sampled from the original source motion; default is fully inked. */
  printFrame?:number;
  plate:RisoBrushPlate;
  dryness:number;
  seed:number;
  inkScale:number;
  registration:number;
  grain:number;
  animate:boolean;
  /** Remove preview-only shadows and width caps inside a film output. */
  layout?:"studio"|"film";
}
/** Same source artwork for the Storybook studio AND FD1 capture/export. */
export function RisoBrushArt({aspect,frame,plate,dryness,seed,inkScale,registration,
  grain,animate,printFrame=239,layout="studio"}:RisoBrushArtProps){
  if(!Number.isSafeInteger(printFrame)||printFrame<0||printFrame>239)
    throw new RangeError("RISO64 requires an absolute print frame 0..239.");
  if(!Number.isSafeInteger(frame)||frame<0||frame>239)
    throw new RangeError("RISO63 requires an absolute source frame between 0 and 239.");
  if(!["both","blue","red"].includes(plate)||
    !Number.isFinite(dryness)||dryness<0||dryness>1||
    !Number.isFinite(grain)||grain<0||grain>1||
    !Number.isFinite(registration)||registration<0||registration>1||
    !Number.isFinite(inkScale)||inkScale<.5||inkScale>1.7||
    !Number.isSafeInteger(seed)||seed<0||seed>200000||
    typeof animate!=="boolean"||(layout!=="studio"&&layout!=="film"))
    throw new RangeError("RISO63 requires valid physical spot masters and bounded source controls.");
  const portrait=aspect==="portrait",w=portrait?540:960,h=portrait?960:540;
  const spec=useMemo(()=>{
    const source=risoExampleSpec(aspect,seed);
    return {...source,plates:source.plates.map(p=>({...p,
      color:p.id==="blue"?cobalt:vermilion,
      registration:p.id==="blue"?[0,0] as const:[.65,-.45] as const,
    }))};
  },[aspect,seed]);
  const phase=animate?frame/239:0.52;
  const isPaperSeed=seed;
  const brushes=(ink:"blue"|"red")=>{
    const isBlue=ink==="blue",offset=isBlue?0:17;
    const gestures=portrait?
      (isBlue?portraitCobalt:portraitVermilion):
      (isBlue?landscapeCobalt:landscapeVermilion);
    return <g data-km-riso62-plate-art={ink}>
      {gestures.map((g,i)=>{
        const pulse=Math.sin(phase*Math.PI*2+i*.57)*(8+g[8]*4);
        const options:RisoBrushOptions={
          start:P(g[0]*w,g[1]*h),
          control1:P(g[2]*w+pulse*.43,g[3]*h-pulse*.57),
          control2:P(g[4]*w-pulse*.49,g[5]*h+pulse*.64),
          end:P(g[6]*w,g[7]*h),
          width:inkScale*(isBlue?13:10.5)*g[8],
          pressure:i%3===0?pressure:finePressure,
          dryness:Math.min(1,dryness*(i%5===0?1.16:i%3===0?.96:.81)),
          seed:isPaperSeed+offset+i*53,steps:80,
        };
        return <RisoDryBrushInk key={i} {...options}
          color={isBlue?cobalt:vermilion}
          data-km-riso62-original-curve={i}
          data-km-riso62-gesture-class={g[8]>1?"hero":g[8]<.5?"filament":"body"}/>;
      })}
      {/* All nineteen original press witness marks survive, but now attach to
          a real source stroke, not an unrelated random background scatter. */}
      {Array.from({length:19},(_,i)=>{
        const g=gestures[i%gestures.length];
        const t=.20+.57*((i*.381966)%1);
        const point=cubicPoint(g,t,w,h);
        const side=(i%2?1:-1)*(3+i%4);
        const x=point.x+side,y=point.y-(i%3)*3;
        return <g key={i} fill="none" stroke={isBlue?cobalt:vermilion}
          strokeWidth={i%4===0?1.4:.65} opacity={.78}>
          <path d={"M"+r(x-3)+" "+r(y)+" q3 -"+r(2+i%3)+" 6 0"}/>
          <path d={"M"+r(x)+" "+r(y-1.8)+" v3.6"}/>
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
        // Original nine red editorial echos sit on the source river arcs,
        // preserving the microtype rhythm without anonymous scattered noise.
        const g=portrait?portraitVermilion[i]:landscapeVermilion[i];
        const point=cubicPoint(g,.31+(i%4)*.125,w,h);
        return <path key={i} d={"M"+r(point.x-6)+" "+r(point.y+7)+
          " q5 -7 12 0"} fill="none" stroke={vermilion} strokeWidth={1.1}/>;
      })}
      <text x={w-32} y={37} fill={vermilion} textAnchor="end"
        fontSize={11} fontFamily="Arial,sans-serif" letterSpacing={1.4}>
        EDITION    /    2026
      </text>
    </g>,
  };
  return <div data-km-riso62-stage={aspect} data-km-riso62-absolute-frame={frame}
    data-km-riso62-stroke-motion={String(animate)}
    data-km-riso64-print-frame={printFrame}
    data-km-riso63-film-layout={String(layout==="film")}
    style={{width:"100%",maxWidth:layout==="film"?"none":portrait?460:960,
      background:paper,
      boxShadow:layout==="film"?"none":"0 12px 34px #2b30251c"}}>
    <RisoPrint spec={spec} frame={printFrame} artworks={artworks}
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
  // Storybook-only 24fps preview transport. The reusable stencil components
  // still require an absolute authored frame; no internal runtime clock.
  const [playing,setPlaying]=useState(false);
  const previewStart=useRef(0);
  useEffect(()=>{
    if(!playing)return;
    const started=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(239,previewStart.current+
        Math.floor((now-started)*24/1000));
      setFrame(next);
      if(next>=239)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  const togglePreview=()=>{
    if(!playing){
      previewStart.current=frame>=239?0:frame;
      setFrame(previewStart.current);
      setAnimate(true);
    }
    setPlaying(!playing);
  };
  return <main data-km-riso62-studio="" data-km-riso62-frame={frame}
    data-km-riso62-aspect={aspect} data-km-riso62-plate={plate}
    data-km-riso62-playing={String(playing)}
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
    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <button type="button"
        aria-label={playing?"RISO62 pause preview":"RISO62 play preview"}
        onClick={togglePreview} style={{background:"#253F57",color:paper,
          border:"none",padding:"8px 16px",font:"600 14px system-ui",
          borderRadius:4,cursor:"pointer"}}>
        {playing?"Pause  /  24 fps":frame>=239?"Replay  /  24 fps":"Play  /  24 fps"}
      </button>
      <span aria-live="off" style={{fontSize:13}}>
        {playing?"Playing":"Stopped"} · source frame {frame} / 239
      </span>
    </div>
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
          value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
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
        checked={animate} onChange={e=>{setPlaying(false);setAnimate(e.target.checked);}}/>
        Animate drawn source curves</label>
    </section>
    <p style={{fontSize:12,maxWidth:920}}>
      This vector dry-brush construction is an authored print-material study,
      not a microscope-scanned physical press or verified ink-absorption profile.
      Real registration, pressure and paper stock require press proof.
    </p>
  </main>;
}
