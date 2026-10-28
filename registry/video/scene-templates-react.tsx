import { createContext, forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { evaluateSceneTemplate } from "./scene-templates";
import type { ImageAsset, LabeledAsset, DataPoint, SceneRecipeId, SceneTemplateFrame, SceneTemplateSpec, FocusRegion } from "./scene-templates";

/** Runtime-only renderer slot. The persisted recipe remains pure JSON. */
export type SceneAssetRenderer = (asset:ImageAsset,frame:SceneTemplateFrame) => ReactNode;
const AssetRendererContext=createContext<{ render:SceneAssetRenderer;frame:SceneTemplateFrame }|null>(null);
const PortraitContext=createContext(false);
const styles = {
  stage: { position:"relative", overflow:"hidden", isolation:"isolate", display:"flex", flexDirection:"column",
    boxSizing:"border-box", width:"100%", containerType:"inline-size", color:"var(--km-text-primary, #f6f4ed)",
    background:"var(--km-surface-canvas, #102133)", padding:"4.5%", fontFamily:"var(--km-font-body, system-ui, sans-serif)",
    fontSize:"clamp(13px, 2cqw, 31px)", lineHeight:1.36 } satisfies CSSProperties,
  title:{ fontSize:"1.72em", fontWeight:760, letterSpacing:"-0.035em", lineHeight:1.12, margin:"0 0 0.55em",
    maxWidth:"26ch", textWrap:"balance" } as CSSProperties,
  label:{ fontSize:".65em", fontWeight:650, textTransform:"uppercase", letterSpacing:".12em", opacity:.75 } as CSSProperties,
  deck:{ display:"flex",flex:1,minHeight:0,alignItems:"stretch",gap:"2.2%",width:"100%" } as CSSProperties,
  tile:{minWidth:0, flex:"1 1 0", border:"1px solid rgba(236,243,250,.22)", borderRadius:".8em",
    background:"rgba(16,36,54,.72)",padding:"1.4em",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:".5em",
    justifyContent:"center",overflow:"hidden"} as CSSProperties,
  note:{fontSize:".83em", opacity:.86, lineHeight:1.45,overflowWrap:"anywhere"} as CSSProperties,
  feature:{ fontSize:"1.15em",fontWeight:720,margin:0,overflowWrap:"anywhere"} as CSSProperties,
  image:{ width:"100%", height:"100%", objectFit:"cover", minHeight:0, borderRadius:".35em" } as CSSProperties,
  line:{ height:2,background:"var(--km-accent, #9fd9ce)",opacity:.8,margin:"1em 0" } as CSSProperties,
} as const;
/**
 * Frame-exact editorial motion helpers. Seekable and interruptible by design:
 * no CSS transitions, no timers, no React state, no dependence on frame history.
 * Each recipe chooses its own meaningful visual motion instead of sharing slides.
 */
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const cinematicEase=(n:number)=>{const t=clamp01(n);return 1-Math.pow(1-t,3);};
const motionAt=(f:SceneTemplateFrame,start:number,end:number)=>
  f.reducedMotion?1:cinematicEase((f.frame-start)/Math.max(1,end-start));
const cueAt=(f:SceneTemplateFrame,n:0|1|2)=>
  // Cue defaults are a quarter, halfway and three quarters, matching ST1.
  f.cueFrames?.[n] ?? [0.25,0.5,0.75][n]*f.durationFrames;
function EditorialMotion({frame,start=0,end=22,fromX=0,fromY=0,scaleFrom=1,tilt=0,minOpacity=0,children,
  style={},name}: {frame:SceneTemplateFrame;start?:number;end?:number;fromX?:number;fromY?:number;
  scaleFrom?:number;tilt?:number;minOpacity?:number;children:ReactNode;style?:CSSProperties;name?:string}) {
  const p=motionAt(frame,start,end);
  return <div data-km-motion={name} data-km-motion-progress={p.toFixed(4)} style={{
    ...style,opacity:minOpacity+(1-minOpacity)*p,transform:`translate3d(${fromX*(1-p)}%,${fromY*(1-p)}%,0) scale(${scaleFrom+(1-scaleFrom)*p}) rotate(${tilt*(1-p)}deg)`,
    transformOrigin:"center center",willChange:"transform, opacity"
  }}>{children}</div>;
}
function KineticMedia({asset,frame,focus,highlight=false,zoom=1.14,name,overlays}:{
  asset:ImageAsset;frame:SceneTemplateFrame;focus?:FocusRegion;highlight?:boolean;zoom?:number;name?:string;
  /** Rendered inside the same camera transform, so authored regions cannot drift. */
  overlays?:ReactNode;
}) {
  const start=cueAt(frame,0),end=cueAt(frame,2);
  const p=motionAt(frame,start,end);
  const centerX=focus?focus.x+focus.width*.5:.5,centerY=focus?focus.y+focus.height*.5:.5;
  // Physical push-in towards the subject. Do not expose blank image edges when
  // the authored focus is close to the frame boundary.
  const scale=1+(zoom-1)*p;
  const desiredX=(.5-centerX)*100*p,desiredY=(.5-centerY)*100*p;
  const maxX=centerX*(scale-1)*100,minX=-(1-centerX)*(scale-1)*100;
  const maxY=centerY*(scale-1)*100,minY=-(1-centerY)*(scale-1)*100;
  const x=Math.max(minX,Math.min(maxX,desiredX));
  const y=Math.max(minY,Math.min(maxY,desiredY));
  return <div data-km-cinematic-media={name} data-km-camera-progress={p.toFixed(4)}
    data-km-camera-zoom={scale.toFixed(4)}
    style={{width:"100%",height:"100%",position:"relative",overflow:"hidden",borderRadius:".4em"}}>
    <div style={{width:"100%",height:"100%",
      transform:`translate3d(${x}%,${y}%,0) scale(${scale})`,
      transformOrigin:`${centerX*100}% ${centerY*100}%`,willChange:"transform"}}>
      <Asset asset={asset}/>
      {focus&&<Focus region={focus} emphasized={highlight&&frame.frame>=cueAt(frame,0)}/>}
      {overlays}
    </div>
  </div>;
}
function ScanBeam({frame,color="var(--km-accent, #9fd9ce)"}:{frame:SceneTemplateFrame;color?:string}){
  const p=motionAt(frame,cueAt(frame,0),cueAt(frame,2));
  return <div aria-hidden="true" data-km-scan-beam="" style={{position:"absolute",inset:0,pointerEvents:"none",
    background:`linear-gradient(90deg,transparent 0%,${color} 50%,transparent 100%)`,
    width:"12%",height:"100%",filter:"blur(.6em)",mixBlendMode:"screen",
    transform:`translateX(${p*850}%)`,opacity:frame.reducedMotion?0:.33*(1-p)}}/>;
}
function Word({children,small=false}: {children:ReactNode;small?:boolean}) {
  return <span style={small?styles.note:styles.feature}>{children}</span>;
}
function Tile({children,style}: {children:ReactNode;style?:CSSProperties}) {
  return <div style={{...styles.tile,...style}}>{children}</div>;
}
function Asset({asset, style}: {asset?:ImageAsset;style?:CSSProperties}) {
  const slot=useContext(AssetRendererContext);
  if(asset && slot) return <div role="img" aria-label={asset.alt} data-km-asset-id={asset.id}
    style={{...styles.image,...style}}>{slot.render(asset,slot.frame)}</div>;
  return asset
    ? <img data-km-asset-id={asset.id} src={asset.src} alt={asset.alt} draggable={false} style={{...styles.image,...style}} />
    : <div aria-hidden="true" style={{width:"100%",height:"100%",border:"1px dashed rgba(245,251,255,.25)",borderRadius:".4em"}} />;
}
function ImageTile({asset,title,note,style}: {asset?:ImageAsset;title?:string;note?:string;style?:CSSProperties}) {
  return <Tile style={style}>{title&&<Word>{title}</Word>}{asset&&<div style={{minHeight:0,flex:1}}><Asset asset={asset}/></div>}{note&&<span style={styles.note}>{note}</span>}</Tile>;
}
function Label({children}: {children:ReactNode}) { return <span style={styles.label}>{children}</span>; }
function Chevron({char="→"}:{char?:string}) {return <span aria-hidden="true" style={{alignSelf:"center",fontSize:"1.65em",opacity:.8}}>{char}</span>;}
function Head({eyebrow,title,detail}: {eyebrow:string;title:string;detail?:string}) {
  return <header style={{flex:"0 0 auto",paddingBottom:"1.25%",minWidth:0}}>
    <Label>{eyebrow}</Label><h2 style={styles.title}>{title}</h2>{detail&&<p style={{...styles.note,margin:"0 0 .4em"}}>{detail}</p>}
  </header>;
}
function Chain({items,shown,final,frame}: {items:string[];shown:number;final?:string;frame:SceneTemplateFrame}) {
  const portrait=useContext(PortraitContext);
  const visible=items.slice(0,Math.max(0,shown));
  return <div style={{...styles.deck,alignItems:"center",flexDirection:portrait?"column":"row"}}>
    {visible.map((text,i)=><div key={i} style={{display:"contents"}}>
      {i>0&&<Chevron/>}<EditorialMotion frame={frame} start={cueAt(frame,0)+(i*6)} end={cueAt(frame,0)+(i*6)+13} fromY={18} scaleFrom={.94} style={{flex:"1 1 0",display:"flex"}} name="causal-step"><Tile><Label>Step {i+1}</Label><Word>{text}</Word></Tile></EditorialMotion>
    </div>)}
    {final&&shown>=items.length&&<><Chevron/><EditorialMotion frame={frame} start={cueAt(frame,2)} end={cueAt(frame,2)+14} fromX={15} style={{flex:"1 1 0",display:"flex"}} name="causal-outcome"><Tile style={{borderColor:"var(--km-accent, #9fd9ce)"}}><Label>Outcome</Label><Word>{final}</Word></Tile></EditorialMotion></>}
  </div>;
}
function ChartBars({data,unit,shown,baseline,frame}: {data:DataPoint[];unit:string;shown:number;baseline?:number;frame:SceneTemplateFrame}) {
  const values=data.map(x=>x.value);
  const min=Math.min(0,baseline??0,...values),max=Math.max(0,baseline??0,...values);
  const span=Math.max(1e-9,max-min);
  // Explicit shared zero axis. Negative values must extend downward, not
  // turn into an unsigned bar that reverses the supplied insight.
  const zeroBottom=18+72*(0-min)/span;
  return <div style={{display:"flex",position:"relative",height:"100%",width:"100%",gap:"2.5%",padding:"3% 2% 1%",
    boxSizing:"border-box"}}>
    <div data-km-zero-baseline="" aria-hidden="true" style={{position:"absolute",left:"2%",right:"2%",
      bottom:zeroBottom+"%",borderTop:"1px solid rgba(245,251,255,.48)",pointerEvents:"none"}}/>
    {data.map((d,i)=>{
      const grow=i<shown?motionAt(frame,cueAt(frame,0)+i*5,cueAt(frame,1)+i*5+14):0;
      const barHeight=Math.abs(d.value)/span*72*grow;
      const bottom=d.value>=0?zeroBottom:zeroBottom-barHeight;
      return <div key={d.id} style={{position:"relative",height:"100%",minWidth:0,flex:1,
        display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <span style={{position:"absolute",top:0,width:"100%",textAlign:"center",
          fontSize:".66em",opacity:i<shown?1:.28,overflowWrap:"anywhere"}}>
          {i<shown?(Math.abs(d.value*grow)<1?d.value*grow:Math.round(d.value*grow*100)/100).toLocaleString()+" "+unit:""}
        </span>
        <div data-km-chart-bar={d.id} aria-hidden="true" style={{position:"absolute",left:"18%",width:"64%",
          bottom:bottom+"%",height:barHeight+"%",
          background:"var(--km-accent, #9fd9ce)",opacity:d.value<0?.56:.9,
          borderRadius:".2em"}}/>
        <span style={{position:"absolute",bottom:0,left:0,right:0,textAlign:"center",fontSize:".64em",
          overflowWrap:"anywhere",opacity:i<shown?1:.36}}>{d.label}</span>
      </div>;
    })}
  </div>;
}
function Focus({region,emphasized=true}:{region:FocusRegion;emphasized?:boolean}) {
  return emphasized?<div aria-hidden="true" data-km-inspection-target="" style={{position:"absolute",
    left:(region.x*100)+"%",top:(region.y*100)+"%",width:(region.width*100)+"%",height:(region.height*100)+"%",
    border:".16em solid var(--km-accent, #9fd9ce)",boxShadow:"0 0 0 999px rgba(10,22,38,.14), 0 0 .8em rgba(154,221,212,.35)",
    borderRadius:".3em",boxSizing:"border-box"}}/>:null;
}
function RegionAsset({asset,region,show}:{asset:ImageAsset;region:FocusRegion;show:boolean}) {
  return <div style={{position:"relative",width:"100%",height:"100%",overflow:"hidden",borderRadius:".4em"}}>
    <Asset asset={asset}/><Focus region={region} emphasized={show}/>
  </div>;
}
function Sequence({items,shown}:{items:LabeledAsset[];shown:number}) {
  const portrait=useContext(PortraitContext);
  return <div style={{...styles.deck,justifyContent:"center",flexDirection:portrait?"column":"row"}}>{items.slice(0,shown).map((item,i)=>
    <ImageTile key={item.id} title={item.label} note={item.note} asset={item.image} style={{boxShadow:i===shown-1?"0 0 0 2px var(--km-accent, #9fd9ce)":"none"}} />)}
  </div>;
}
function TimeStrip({items,active,spacing="equal",frame}:{
  items:{id:string;label:string;date?:string;image?:ImageAsset}[];
  active:number;spacing?:"equal"|"elapsed";frame?:SceneTemplateFrame;
}) {
  const selected=Math.min(active,items.length-1);
  if(spacing==="elapsed" && items.length>1 && items.every(item=>item.date)) {
    const times=items.map(item=>Date.parse(item.date!));
    const min=Math.min(...times),max=Math.max(...times),range=Math.max(1,max-min);
    const x=frame?5+90*frame.frame/Math.max(1,frame.durationFrames-1):5+90*(times[selected]-min)/range;
    return <div style={{position:"relative",height:"100%",width:"100%"}}>
      <div aria-hidden="true" style={{position:"absolute",height:"2px",background:"rgba(245,251,255,.46)",
        top:"55%",left:"5%",right:"5%"}}/>
      {items.map((item,i)=>{
        const x=5+90*(times[i]-min)/range;
        return <div key={item.id} data-km-timeline-event={item.id} data-km-event-x={x}
          style={{position:"absolute",left:x+"%",top:"55%",transform:"translate(-50%,-5%)",
            display:"flex",flexDirection:"column",gap:".2em",alignItems:"center",textAlign:"center",
            width:Math.min(22,88/items.length)+"%",opacity:i>active?.3:1}}>
          <span aria-hidden="true" style={{height:".6em",width:".6em",borderRadius:"50%",
            background:"var(--km-accent, #9fd9ce)",boxShadow:"0 0 0 .2em #17334b"}}/>
          <Label>{item.date}</Label><span style={{fontSize:".77em",overflowWrap:"anywhere"}}>{item.label}</span>
          {item.image&&<div style={{height:"4em",width:"100%"}}><Asset asset={item.image}/></div>}
        </div>;
      })}
      {frame&&<div data-km-timeline-playhead="" data-km-playhead-x={x.toFixed(2)} aria-hidden="true"
        style={{position:"absolute",left:x+"%",top:"51%",width:".72em",height:".72em",
          borderRadius:"50%",background:"var(--km-accent, #9fd9ce)",
          boxShadow:"0 0 1.4em rgba(140,236,224,.84)",transform:"translateX(-50%)",pointerEvents:"none"}}/>}
    </div>;
  }
  return <div style={{...styles.deck,alignItems:"center",gap:"1%",position:"relative"}}>
    {items.map((item,i)=><div key={item.id} data-km-timeline-event={item.id} style={{flex:1,
      opacity:i>active?.35:1,minWidth:0,
      borderTop:"3px solid "+(i<=active?"var(--km-accent, #9fd9ce)":"rgba(251,255,255,.28)"),
      display:"flex",paddingTop:".75em",flexDirection:"column",gap:".4em"}}>
      {item.date&&<Label>{item.date}</Label>}<Word>{item.label}</Word>
      {item.image&&<div style={{height:"5em",minHeight:0}}><Asset asset={item.image}/></div>}
    </div>)}
    {frame&&<div data-km-timeline-playhead="" aria-hidden="true" style={{position:"absolute",
      top:0,left:(frame?Math.max(0,Math.min(100,100*frame.frame/Math.max(1,frame.durationFrames-1))):((selected+.5)/Math.max(1,items.length))*100)+"%",
      width:".6em",height:".6em",transform:"translate(-50%,-40%)",
      borderRadius:"50%",background:"var(--km-accent, #9fd9ce)",
      boxShadow:"0 0 1.2em rgba(129,238,220,.8)",pointerEvents:"none"}}/>}
  </div>;
}
function GeometryGraph({nodes,edges,visible,frame}:{nodes:LabeledAsset[];edges:{from:string;to:string;label?:string}[];visible:number;frame:SceneTemplateFrame}) {
  const portrait=useContext(PortraitContext);
  const count=nodes.length,points=nodes.map((node,i)=>({
    id:node.id,
    x:portrait?50:13+74*(count===1?0.5:i/(count-1)),
    y:portrait?12+76*(count===1?0.5:i/(count-1)):44+16*Math.sin(i*2.4),
  }));
  return <div style={{position:"relative",height:"100%",width:"100%"}}>
    <svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none"
      style={{position:"absolute",width:"100%",height:"100%",inset:0,overflow:"visible"}}>
      {edges.slice(0,Math.max(0,visible-nodes.length)).map((e,i)=>{
        const a=points.find(p=>p.id===e.from),b=points.find(p=>p.id===e.to);
        return a&&b?<line key={i} data-km-animated-connection={i}
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="var(--km-accent, #9fd9ce)" strokeWidth=".6"
          pathLength={1} strokeDasharray={1}
          strokeDashoffset={1-motionAt(frame,cueAt(frame,1)+i*5,cueAt(frame,1)+i*5+16)}/>:null;
      })}
    </svg>
    {nodes.map((node,i)=><div key={node.id} data-km-semantic-id={node.id} style={{
      position:"absolute",left:points[i].x+"%",top:points[i].y+"%",transform:"translate(-50%,-50%)",
      width:Math.min(25,72/Math.max(2,count))+"%",minHeight:"20%",
       opacity:i<visible?motionAt(frame,4+i*5,23+i*5):.12,
       scale:i<visible?String(.8+.2*motionAt(frame,4+i*5,23+i*5)):"0.8",
      display:"flex",justifyContent:"center",alignItems:"center",textAlign:"center",
      border:"2px solid var(--km-accent, #9fd9ce)",background:"var(--km-surface-canvas, #102133)",
      borderRadius:".7em",padding:".4em",boxSizing:"border-box",fontSize:".76em",overflowWrap:"anywhere"}}>
      {node.label}
    </div>)}
  </div>;
}
function renderScene(spec:SceneTemplateSpec,f:SceneTemplateFrame):ReactNode {
  const portrait=spec.height>spec.width;
  const deck:CSSProperties=portrait?{...styles.deck,flexDirection:"column",alignItems:"stretch"}:styles.deck;
  const show=f.phaseIndex>=2,final=f.phaseIndex===3,active=f.activeItem;
  switch(spec.recipeId) {
    case "question-reveal": return <>
      <Head eyebrow="Question → answer" title={spec.content.question}/>
      <div style={{...deck,justifyContent:"center",position:"relative"}}>
        <EditorialMotion name="question-hero" frame={f} start={0} end={cueAt(f,0)} scaleFrom={.82} minOpacity={1}
          fromY={14} style={{width:"73%",minHeight:0,display:"flex"}}>
          <Tile style={{padding:".35em",flex:1,minHeight:0}}>
            <KineticMedia asset={spec.content.subject} frame={f} zoom={1.2} name="question-push-in"/>
            <ScanBeam frame={f}/>
          </Tile>
        </EditorialMotion>
        {show&&<EditorialMotion name="question-answer" frame={f} start={cueAt(f,1)} end={cueAt(f,1)+16}
          fromY={26} scaleFrom={1.16} style={{position:"absolute",inset:"auto 8% 5%",zIndex:2}}>
          <div style={{background:"rgba(7,27,45,.94)",borderLeft:".24em solid var(--km-accent, #9fd9ce)",
            boxShadow:"0 1em 3em rgba(0,0,0,.45)",padding:".9em 1.3em",borderRadius:".35em"}}>
            <Label>Answer</Label><div style={{fontSize:"1.45em",fontWeight:800,letterSpacing:"-.03em"}}>{spec.content.answer}</div>
          </div>
        </EditorialMotion>}
        {show&&spec.content.answerVisual&&<EditorialMotion name="question-answer-visual" frame={f}
          start={cueAt(f,1)+9} end={cueAt(f,1)+24} fromX={15}
          style={{position:"absolute",right:"2%",top:"3%",width:"29%",height:"43%"}}>
            <Asset asset={spec.content.answerVisual}/>
          </EditorialMotion>}
      </div></>;
    case "hidden-detail": return <>
      <Head eyebrow="Find the overlooked detail" title={spec.content.context}
        detail={show?spec.content.detail:undefined}/>
      <div style={{...deck,justifyContent:"center"}}>
        <Tile style={{padding:".4em",maxWidth:"82%",position:"relative"}}>
          <KineticMedia asset={spec.content.subject} frame={f} focus={spec.content.target}
            highlight={true} zoom={1.32} name="hidden-detail-zoom"/>
          <ScanBeam frame={f}/>
        </Tile>
      </div></>;
    case "before-after": {
      const wipe=final?100:f.phaseIndex===2?20+80*f.phaseProgress:
        f.phaseIndex===1?20*f.phaseProgress:0;
      return <><Head eyebrow="One subject · Aligned states" title={show?"What changed":"Before and after"}
          detail={final?spec.content.changes.join(" · "):undefined}/>
        <div style={{...deck,justifyContent:"center"}}>
          <Tile style={{padding:".35em",flex:"0 1 75%"}}>
            <div style={{position:"relative",width:"100%",flex:1,minHeight:0,overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0}}><Asset asset={spec.content.before.image}/></div>
              <div data-km-before-after-wipe="" data-km-wipe-percent={wipe}
                style={{position:"absolute",inset:0,clipPath:`inset(0 ${100-wipe}% 0 0)`}}>
                <Asset asset={spec.content.after.image}/>
              </div>
              <div aria-hidden="true" data-km-comparison-scan-edge=""
                data-km-edge-position={wipe.toFixed(2)}
                style={{position:"absolute",top:0,bottom:0,left:Math.min(99.5,Math.max(.5,wipe))+"%",
                  width:"3px",transform:"translateX(-50%)",zIndex:3,
                  background:"linear-gradient(180deg,#d7fff2,var(--km-accent, #9fd9ce),#d7fff2)",
                  boxShadow:"0 0 .65em .19em rgba(147,241,218,.62),0 0 1.8em .5em rgba(147,241,218,.18)",
                  opacity:!f.reducedMotion&&wipe>1&&wipe<99?1:0,pointerEvents:"none"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",gap:".5em",padding:".4em"}}>
              <Label>{spec.content.before.label}</Label><Label>{spec.content.after.label}</Label>
            </div>
          </Tile>
        </div></>;
    }
    case "side-by-side": return <>
      <Head eyebrow="Controlled comparison" title={spec.content.criterion} detail={show?spec.content.comparison:undefined}/>
      <div style={{...deck,position:"relative"}}>{spec.content.alternatives.map((a,i)=>
        <EditorialMotion key={a.id} frame={f} name="comparison-dolly" start={3+i*4}
          end={cueAt(f,0)+i*4} fromX={i?24:-24} scaleFrom={.89}
          style={{minWidth:0,flex:"1 1 0",display:"flex"}}>
          <ImageTile asset={a.image} title={a.label} note={show?a.note:undefined}
            style={{flex:1,minWidth:0}}/>
        </EditorialMotion>)}
      </div></>;
    case "cause-effect": return <>
      <Head eyebrow="Mechanism · Not proof of causality" title={spec.content.event}
        detail={final?(spec.content.qualification??spec.content.outcome):spec.content.initial}/>
      <Chain items={[spec.content.initial,spec.content.event,...spec.content.links]}
        shown={final?spec.content.links.length+2:Math.max(1,f.revealedItems+1)}
        final={final?spec.content.outcome:undefined} frame={f}/></>;
    case "scale-reveal": {
      const ratio=spec.content.subject.quantity/spec.content.reference.quantity;
      const max=Math.max(spec.content.subject.quantity,spec.content.reference.quantity);
      return <><Head eyebrow="Scale comparison" title={spec.content.subject.label+" / "+spec.content.reference.label}
        detail={show?`${ratio.toLocaleString(undefined,{maximumFractionDigits:2})}× reference · ${spec.content.mode} scale`:undefined}/>
        <div style={{...deck,flexDirection:"column",justifyContent:"center"}}>
          {[spec.content.reference,spec.content.subject].map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"2%",height:"32%"}}>
            <span style={{width:"28%",fontSize:".8em"}}>{item.label}<br/>{Math.round(item.quantity*motionAt(f,i===0?0:cueAt(f,0),i===0?cueAt(f,0):cueAt(f,1))).toLocaleString()} {spec.content.unit}</span>
            <div style={{height:"42%",width:(spec.content.mode==="illustrative"?65:Math.max(2,65*item.quantity/max))+"%",
              borderRadius:".35em",background:i===0?"rgba(244,248,253,.40)":"var(--km-accent, #9fd9ce)",opacity:!show&&i===1?.14:1,
              transform:`scaleX(${motionAt(f,i===0?0:cueAt(f,0),i===0?cueAt(f,0):cueAt(f,1))})`,transformOrigin:"left center",willChange:"transform"}}/>
          </div>)}
        </div></>;
    }
    case "context-to-detail": return <>
      <Head eyebrow="Context → detail" title={spec.content.description}/>
      <div style={deck}>
        <Tile style={{padding:".3em",position:"relative"}}>
          <KineticMedia asset={spec.content.context} frame={f} focus={spec.content.target}
            highlight zoom={1.4} name="context-camera-dive"/>
          <ScanBeam frame={f}/>
        </Tile>
        {show&&<EditorialMotion frame={f} name="context-detail-inset"
          start={cueAt(f,1)} end={cueAt(f,1)+17} fromX={34} scaleFrom={.84}
          style={{minWidth:0,flex:"1 1 0",display:"flex"}}>
          <ImageTile asset={spec.content.detail} title="Detail" style={{flex:1,minWidth:0}}/>
        </EditorialMotion>}
      </div></>;
    case "layered-cutaway": {
      const {layers}=spec.content;
      const exposed=layers.slice(0,f.revealedItems);
      const gap=80/Math.max(1,layers.length);
      return <><Head eyebrow="Internal structure" title={show?spec.content.relationship:"From shell to core"}
        detail={spec.content.reconstructed?"Illustrative reconstructed layers":undefined}/>
        <div style={{...deck,alignItems:"stretch"}}>
          <div style={{flex:1,minHeight:0,position:"relative",borderRadius:".7em",overflow:"hidden",
            border:"1px solid rgba(233,249,251,.2)"}}>
            <Asset asset={spec.content.object}/>
            {f.phaseIndex>=1&&<div aria-hidden="true" style={{position:"absolute",inset:0,
              background:"linear-gradient(90deg,transparent 40%,rgba(5,20,34,.35) 100%)"}}/>}
            <span style={{position:"absolute",left:"4%",bottom:"4%",background:"rgba(9,31,49,.8)",
              padding:".35em .7em",fontSize:".65em"}}>Intact subject</span>
          </div>
          <div data-km-exploded-layers="" style={{flex:1,position:"relative",minHeight:0,perspective:"900px"}}>
            {exposed.map((layer,i)=>{
              const progress=motionAt(f,cueAt(f,0)+i*6,cueAt(f,1)+i*6+10);
              return <div key={layer.id} data-km-cutaway-layer={layer.id}
                style={{position:"absolute",left:"5%",top:(7+i*gap)+"%",width:"88%",height:(Math.max(16,gap*1.15))+"%",
                  border:"2px solid rgba(145,214,204,.78)",borderRadius:".45em",display:"flex",
                  alignItems:"center",gap:".6em",padding:".4em",boxSizing:"border-box",
                  background:"rgba(20,57,75,.88)",overflow:"hidden",
                  transform:`translate3d(${(1-progress)*28}%,0,${(1-progress)*-50}px) rotateY(${(1-progress)*-42}deg)`,
                  opacity:progress}}>
                <div style={{height:"100%",width:"37%",minHeight:0}}>
                  {layer.image?<Asset asset={layer.image}/>:<div aria-hidden="true"
                    style={{height:"100%",border:"1px dashed var(--km-accent, #9fd9ce)"}}/>}
                </div>
                <span style={{...styles.note,fontWeight:700,flex:1}}>{layer.label}</span>
              </div>;
            })}
          </div>
        </div></>;
    }
    case "build-and-connect": return <>
      <Head eyebrow="Assemble a system" title={show?spec.content.result:"Parts and relationships"}/>
      <div style={{...deck,flexDirection:"column"}}><GeometryGraph nodes={spec.content.nodes}
        edges={spec.content.connections} visible={f.revealedItems} frame={f}/></div></>;
    case "transform-and-track": {
      const mapped=spec.content.mapping.map(mapping=>({
        id:mapping.from+"→"+mapping.to,
        source:spec.content.source.find(item=>item.id===mapping.from)!,
        destination:spec.content.destination.find(item=>item.id===mapping.to)!,
      }));
      return <><Head eyebrow="Stable entity tracking" title={spec.content.changedProperty}/>
        <div style={{...deck,alignItems:"stretch"}}>
          {mapped.slice(0,Math.max(1,f.revealedItems)).map((pair,i)=>{
            const progress=motionAt(f,cueAt(f,1)+i*5,cueAt(f,2)+i*5);
            const angle=progress*180;
            return <div key={pair.id} data-km-transform-identity={pair.source.id}
              data-km-transform-angle={angle.toFixed(2)}
              style={{flex:"1 1 0",minWidth:0,perspective:"1000px",position:"relative"}}>
              <div style={{position:"absolute",inset:0,transformStyle:"preserve-3d",
                transform:`rotateY(${angle}deg)`}}>
                <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",display:"flex"}}>
                  <Tile style={{flex:1,borderColor:"rgba(152,219,206,.5)"}}>
                    <Label>Before · {pair.source.id}</Label>
                    <Word>{pair.source.label}</Word>
                    {pair.source.image&&<div style={{flex:1,minHeight:0}}><Asset asset={pair.source.image}/></div>}
                  </Tile>
                </div>
                <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",
                  transform:"rotateY(180deg)",display:"flex"}}>
                  <Tile style={{flex:1,borderColor:"var(--km-accent, #9fd9ce)"}}>
                    <Label>After · same identity</Label>
                    <Word>{pair.destination.label}</Word>
                    {pair.destination.image&&<div style={{flex:1,minHeight:0}}><Asset asset={pair.destination.image}/></div>}
                  </Tile>
                </div>
              </div>
            </div>;
          })}
        </div></>;
    }
    case "time-evolution": {
      const milestone=spec.content.milestones[final?spec.content.milestones.length-1:Math.min(active,spec.content.milestones.length-1)];
      return <><Head eyebrow="Evolution over time" title={final?spec.content.outcome:spec.content.baseline}/>
        <div style={{...deck,flexDirection:"column",minHeight:0}}>
          <div style={{flex:1,minHeight:0,position:"relative",overflow:"hidden"}}>
            {milestone.image
              ?<KineticMedia asset={milestone.image} frame={f} zoom={1.18} name="evolution-camera"/>
              :<Tile><Word>{milestone.label}</Word></Tile>}
            <EditorialMotion name="evolution-caption" frame={f} start={cueAt(f,0)} end={cueAt(f,1)}
              fromY={20} style={{position:"absolute",bottom:"4%",left:"4%",maxWidth:"60%",
                background:"rgba(8,31,49,.88)",padding:".7em",borderLeft:".2em solid var(--km-accent, #9fd9ce)"}}>
              <Label>{milestone.date}</Label><Word>{milestone.label}</Word>
            </EditorialMotion>
          </div>
          <div style={{height:"23%",minHeight:0,flex:"0 0 23%"}}>
            <TimeStrip items={spec.content.milestones} active={final?spec.content.milestones.length-1:Math.min(active,spec.content.milestones.length-1)} frame={f}/>
          </div>
        </div></>;
    }
    case "data-story": return <>
      <Head eyebrow="Chart · Sourced values" title={spec.content.insight} detail={"Source: "+spec.content.source}/>
      <Tile><ChartBars data={spec.content.data} unit={spec.content.unit} baseline={spec.content.baseline}
        shown={final?spec.content.data.length:f.revealedItems} frame={f}/></Tile></>;
    case "consequence-chain": {
      const impacts=spec.content.impacts;
      const positions=impacts.map((item,i)=>{
        if(portrait)return {item,x:30+(i%2)*40,y:19+i*Math.min(16,50/Math.max(1,impacts.length-1))};
        return {item,x:34+52*i/Math.max(1,impacts.length-1),y:32+16*Math.sin(i*2)};
      });
      const origin={x:portrait?50:12,y:portrait?7:48};
      const displayed=positions.slice(0,f.revealedItems);
      return <><Head eyebrow="Cascading consequences" title={spec.content.event}
        detail={final?spec.content.uncertainty:undefined}/>
        <div style={{position:"relative",height:"100%",width:"100%",flex:1,minHeight:0}}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
            style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
            {displayed.map((p,i)=>{
              const from=i===0?origin:positions[i-1];
              return <line key={i} x1={from.x} y1={from.y} x2={p.x} y2={p.y}
                stroke="var(--km-accent, #9fd9ce)" strokeWidth=".55" opacity=".85"
                pathLength={1} strokeDasharray={1} strokeDashoffset={1-motionAt(f,cueAt(f,0)+i*7,cueAt(f,0)+i*7+16)}/>;
            })}
          </svg>
          <div style={{position:"absolute",left:origin.x+"%",top:origin.y+"%",
            transform:"translate(-50%,-50%)",textAlign:"center",fontSize:".7em",maxWidth:"18%"}}>
            <span style={{padding:".5em",borderRadius:"50%",background:"var(--km-accent, #9fd9ce)",
              color:"#09243a"}}>1</span>
            <div style={{marginTop:".55em"}}>Trigger</div>
          </div>
          {displayed.map((p,i)=><div key={i} data-km-cascade-impact={i}
            style={{position:"absolute",left:p.x+"%",top:p.y+"%",
              width:(portrait?"38%":"19%"),transform:`translate(-50%,-50%) scale(${.82+.18*motionAt(f,cueAt(f,0)+i*7,cueAt(f,0)+i*7+16)})`,
              opacity:motionAt(f,cueAt(f,0)+i*7,cueAt(f,0)+i*7+16),
              background:"rgba(18,48,69,.92)",border:"2px solid var(--km-accent, #9fd9ce)",
              borderRadius:".6em",padding:".65em",boxSizing:"border-box",
              fontSize:".8em",overflowWrap:"anywhere"}}>
            <Label>Effect {i+1}</Label><div>{p.item}</div>
          </div>)}
          {final&&<EditorialMotion name="cascade-impact" frame={f} start={cueAt(f,2)} end={cueAt(f,2)+15}
            fromY={20} scaleFrom={1.15} style={{position:"absolute",inset:0,pointerEvents:"none"}}><div data-km-cascade-outcome="" style={{position:"absolute",
            left:portrait?"50%":"79%",top:portrait?"87%":"84%",transform:"translate(-50%,-50%)",
            background:"rgba(136,217,198,.94)",color:"#08283c",borderRadius:".55em",
            padding:".75em",maxWidth:portrait?"82%":"34%",textAlign:"center",
            fontSize:".95em",fontWeight:720,overflowWrap:"anywhere"}}>{spec.content.outcome}</div></EditorialMotion>}
        </div></>;
    }
    case "decision-branch": {
      const options=spec.content.options;
      return <><Head eyebrow="Decision and possible outcomes" title={spec.content.decision}/>
        <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,gap:"1.2em"}}>
          <div style={{display:"flex",justifyContent:"center",flex:"0 0 auto"}}>
            <div style={{background:"var(--km-accent, #9fd9ce)",color:"#0a2638",
              borderRadius:".5em",padding:".55em 1.5em",textAlign:"center",fontWeight:760}}>
              Decision point
            </div>
          </div>
          <div style={{display:"flex",flex:1,minHeight:0,justifyContent:"center",gap:"2%",position:"relative",
            flexDirection:portrait?"column":"row"}}>
            {options.map((option,i)=><div key={option.id} data-km-branch={option.id}
              style={{position:"relative",flex:1,minWidth:0,opacity:(i<=active||final?1:.3)*motionAt(f,cueAt(f,0)+i*6,cueAt(f,1)+i*6),
                transform:`translate3d(${portrait?0:(i-options.length/2)*15*(1-motionAt(f,cueAt(f,0)+i*6,cueAt(f,1)+i*6))}%,${portrait?18*(1-motionAt(f,cueAt(f,0)+i*6,cueAt(f,1)+i*6)):0}%,0) rotateY(${portrait?0:(i-options.length/2)*-12*(1-motionAt(f,cueAt(f,0)+i*6,cueAt(f,1)+i*6))}deg)`,
                background:"rgba(17,47,67,.88)",border:"2px solid var(--km-accent, #9fd9ce)",
                borderRadius:".65em",padding:"1.05em",display:"flex",flexDirection:"column",
                gap:".65em",boxSizing:"border-box",overflowWrap:"anywhere"}}>
              <div style={{position:"absolute",width:portrait?"6%":"2px",height:portrait?"2px":"11%",
                background:"var(--km-accent, #9fd9ce)",
                top:portrait?"50%":"-11%",left:portrait?"-6%":"50%"}} aria-hidden="true"/>
              <Label>{option.condition}</Label>
              <Word>{option.label}</Word>
              {(show||final)&&<div style={{...styles.note,borderTop:"1px solid rgba(242,251,249,.25)",
                paddingTop:".55em",marginTop:"auto"}}>{option.outcome}</div>}
            </div>)}
          </div>
        </div></>;
    }
    case "worked-example": return <>
      <Head eyebrow="Worked example" title={final?spec.content.result:spec.content.startingCase}/>
      <div style={deck}>{spec.content.operations.slice(0,f.revealedItems).map((o,i)=>
        <EditorialMotion key={o.id} name="worked-operation" frame={f} start={cueAt(f,0)+i*7} end={cueAt(f,0)+i*7+18}
          fromY={24} scaleFrom={.87} tilt={-5} style={{flex:"1 1 0",minWidth:0,display:"flex"}}>
        <Tile style={{flex:1}}><Label>Operation {i+1}</Label><Word>{o.instruction}</Word><span style={styles.note}>{o.intermediate}</span></Tile></EditorialMotion>)}
        {final&&<EditorialMotion name="worked-result" frame={f} start={cueAt(f,2)} end={cueAt(f,2)+15}
          fromY={24} scaleFrom={1.12} style={{flex:"1 1 0",minWidth:0,display:"flex"}}>
          <Tile style={{borderColor:"var(--km-accent, #9fd9ce)",flex:1}}><Label>Result</Label><Word>{spec.content.result} {spec.content.unit}</Word></Tile>
        </EditorialMotion>}</div></>;
    case "demonstration": {
      const actionCount=spec.content.actions.length;
      const activeAction=Math.min(actionCount-1,Math.max(0,f.revealedItems-1));
      const currentImage=spec.content.states?.[activeAction]??spec.content.setup;
      const focusRegion=spec.content.actionTargets?.[activeAction]??{x:.45,y:.45,width:.1,height:.1};
      const focusX=(focusRegion.x+focusRegion.width*.5)*100;
      const focusY=(focusRegion.y+focusRegion.height*.5)*100;
      const actionEntry=motionAt(f,cueAt(f,0)+activeAction*8,cueAt(f,0)+activeAction*8+13);
      return <><Head eyebrow={spec.content.simulated?"Simulated action preview":"Action-state demonstration"}
        title={final?spec.content.result:spec.content.target}/>
        <div style={{...deck,alignItems:"stretch"}}>
          <div style={{flex:"1 1 58%",position:"relative",minHeight:0,
            border:"1px solid rgba(242,250,252,.24)",borderRadius:".75em",overflow:"hidden"}}>
            <KineticMedia asset={currentImage} frame={f} focus={focusRegion}
              zoom={1.08} name="demonstration-state"/>
            {f.phaseIndex>0&&<div data-km-demo-action={activeAction}
              data-km-cursor-x={focusX.toFixed(2)} data-km-cursor-y={focusY.toFixed(2)}
              style={{position:"absolute",left:focusX+"%",top:focusY+"%",
                transform:`translate(-50%,-50%) scale(${.5+.5*actionEntry})`,
                width:"1.2em",height:"1.2em",borderRadius:"50%",
                border:".16em solid var(--km-accent, #9fd9ce)",
                boxShadow:`0 0 0 ${(1-actionEntry)*1.4}em rgba(152,226,215,.12), 0 .3em 1.2em rgba(5,20,32,.48)`,
                opacity:actionEntry,background:"rgba(243,251,248,.95)"}}/>}
            {f.phaseIndex>0&&<div aria-hidden="true" style={{
              position:"absolute",left:focusRegion.x*100+"%",top:focusRegion.y*100+"%",
              width:focusRegion.width*100+"%",height:focusRegion.height*100+"%",
              border:".1em solid var(--km-accent, #9fd9ce)",boxSizing:"border-box",
              opacity:actionEntry*.7,borderRadius:".35em",pointerEvents:"none"
            }}/>} 
            {spec.content.simulated&&<div style={{position:"absolute",right:"4%",top:"4%",
              background:"rgba(9,28,42,.86)",fontSize:".68em",padding:".4em .6em"}}>Simulation</div>}
          </div>
          <div style={{flex:"1 1 38%",minWidth:0,display:"flex",flexDirection:"column",gap:".45em",
            justifyContent:"center"}}>
            {spec.content.actions.map((action,i)=><div key={i}
              style={{opacity: i <= activeAction ? 0.95 : 0.25,display:"flex",alignItems:"center",gap:".5em",
                borderLeft:i===activeAction?".18em solid var(--km-accent, #9fd9ce)":".18em solid transparent",
                background:i===activeAction?"rgba(124,206,196,.12)":"transparent",padding:".55em",
                fontSize:".88em"}}>
                <strong>{i+1}.</strong><span>{action}</span>
              </div>)}
            {final&&<div style={{fontSize:".84em",fontWeight:700,padding:".65em",
              background:"rgba(21,80,72,.44)",borderRadius:".4em"}}>{spec.content.result}</div>}
          </div>
        </div></>;
    }
    case "guided-inspection": {
      const selected=spec.content.targets[active]??spec.content.targets[0];
      return <><Head eyebrow="Guided inspection"
        title={final?spec.content.summary:(f.phaseIndex===0?"Examine the full scene":selected.label)}/>
        <div style={{...deck,alignItems:"stretch"}}>
          <Tile style={{padding:".35em",position:"relative"}}>
            <div style={{position:"relative",height:"100%",width:"100%",minHeight:0}}>
              <KineticMedia asset={spec.content.scene} frame={f} focus={selected.region}
                zoom={1.22} name="guided-camera-pan" overlays={
                  spec.content.targets.map((target,i)=><div key={target.id}
                    data-km-inspection-region={target.id}
                    style={{position:"absolute",left:(target.region.x*100)+"%",top:(target.region.y*100)+"%",
                      width:(target.region.width*100)+"%",height:(target.region.height*100)+"%",
                      boxSizing:"border-box",border:"2px solid var(--km-accent, #9fd9ce)",
                      borderRadius:".35em",opacity:final||i===active&&f.phaseIndex>0?1:.12,
                      background:"rgba(135,214,208,.09)",display:"flex",
                      alignItems:"flex-start",justifyContent:"flex-start"}}>
                      {(final||i===active)&&<span style={{fontSize:".68em",background:"rgba(7,28,42,.9)",
                        padding:".25em .5em",maxWidth:"100%",overflowWrap:"anywhere"}}>{i+1}</span>}
                    </div>)
                }/>
              <ScanBeam frame={f}/>
            </div>
          </Tile>
          <Tile style={{flex:portrait?"0 0 24%":"0 0 29%"}}>
            <Label>Points of inspection</Label>
            {spec.content.targets.map((target,i)=><div key={target.id} style={{...styles.note,
              opacity:final||i<=active?1:.35,fontWeight:i===active?750:400}}>
                {i+1}. {target.label}
              </div>)}
          </Tile>
        </div></>;
    }
    case "character-discovery": {
      const anticipation=motionAt(f,0,cueAt(f,0));
      const reaction=motionAt(f,cueAt(f,1),cueAt(f,2));
      const tilt=f.reducedMotion?0:-8*anticipation+12*reaction;
      const bounce=f.reducedMotion?0:Math.sin(f.frame*.33)*1.2*(1-reaction);
      const gesture=f.phaseIndex===1?"Noticing":show?"Reacting":"Exploring";
      return <><Head eyebrow="Character-led discovery"
        title={final?spec.content.reveal:show?spec.content.reaction:spec.content.attentionTarget}/>
        <div style={{...deck,alignItems:"stretch"}}>
          <div style={{flex:1,position:"relative",minHeight:0,display:"flex",justifyContent:"center",
            alignItems:"center",borderRadius:".75em",background:"rgba(18,45,68,.55)"}}>
            <div style={{height:"78%",width:"75%",transform:`translateY(${bounce}%) rotate(${tilt}deg) scale(${1+.035*reaction})`,
              transformOrigin:"50% 80%"}}>
              <Asset asset={spec.content.character} style={{objectFit:"contain"}}/>
            </div>
            <div data-km-character-action={gesture}
              style={{position:"absolute",right:"2%",top:"3%",maxWidth:"49%",fontSize:".7em",
                borderRadius:".9em .9em .9em 0",padding:".6em .85em",
                background:"rgba(238,246,241,.94)",color:"#132f45",fontWeight:680,
                overflowWrap:"anywhere"}}>
              {final?spec.content.reveal:show?spec.content.reaction:spec.content.attentionTarget}
            </div>
          </div>
          <div style={{flex:1,position:"relative",minHeight:0,display:"flex",alignItems:"center",
            justifyContent:"center"}}>
            <div style={{width:"86%",height:"82%",transform:f.reducedMotion?"none":
              `scale(${1.08-.08*motionAt(f,cueAt(f,0),cueAt(f,2))}) rotate(${(1-reaction)*-2}deg)`}}>
              <Asset asset={spec.content.subject}/>
            </div>
            {f.phaseIndex>=1&&<span aria-hidden="true"
              style={{position:"absolute",left:"7%",top:"50%",fontSize:"1.8em",color:"var(--km-accent, #9fd9ce)"}}>↗</span>}
          </div>
        </div></>;
    }
    case "evidence-reveal": return <>
      <Head eyebrow="Claim → supporting evidence" title={spec.content.claim}
        detail={final?(spec.content.qualification??"Evidence supplied by author"):undefined}/>
      <div style={deck}><Tile style={{padding:".35em",minWidth:0}}>
        <div style={{position:"relative",flex:1,minHeight:0}}>{
          <KineticMedia asset={spec.content.evidence} frame={f}
            focus={spec.content.region} highlight={Boolean(spec.content.region)}
            zoom={1.18} name="evidence-camera"/>
          }<ScanBeam frame={f}/></div>
        </Tile>{show&&<EditorialMotion name="evidence-source" frame={f} start={cueAt(f,1)} end={cueAt(f,1)+17}
          fromX={26} scaleFrom={.9} style={{flex:"1 1 35%",minWidth:0,display:"flex"}}>
          <Tile style={{flex:1}}><Label>Source · {spec.content.source}</Label>
            <Word>{spec.content.excerpt}</Word>
          </Tile>
        </EditorialMotion>}</div></>;
    case "environment-reveal": {
      const path=spec.content.camera;
      const t=f.reducedMotion?1:f.frame/Math.max(1,f.durationFrames-1);
      const cam=path?{
        x:path.from.x+(path.to.x-path.from.x)*t,
        y:path.from.y+(path.to.y-path.from.y)*t,
        zoom:path.from.zoom+(path.to.zoom-path.from.zoom)*t,
      }:{x:.5,y:.5,zoom:f.reducedMotion?1:1.1+.08*t};
      const anchor=spec.content.focalAnchor??{x:.5,y:.5};
      return <>
        <div data-km-environment-camera="" data-km-camera-zoom={cam.zoom}
          style={{position:"absolute",inset:0,overflow:"hidden",
            transformOrigin:`${cam.x*100}% ${cam.y*100}%`,
            transform:`scale(${cam.zoom})`,transition:"none"}}>
          <Asset asset={spec.content.environment} style={{...styles.image,borderRadius:0}}/>
          {spec.content.atmosphere&&<div aria-hidden="true"
            style={{position:"absolute",inset:0,background:spec.content.atmosphere.tint,
              opacity:spec.content.atmosphere.opacity}}/>}
          <div aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",
            opacity:f.reducedMotion?0:Math.max(0,1-t*1.05),
            transform:`translate3d(${f.reducedMotion?0:(1-t)*-4}%,${f.reducedMotion?0:(1-t)*6}%,0) scale(${f.reducedMotion?1:1.28-.28*t})`,
            transformOrigin:"center center"}}>
            <Asset asset={spec.content.foreground} style={{borderRadius:0}}/>
          </div>
        </div>
        <div style={{position:"relative",height:"100%",width:"100%"}}>
          {show&&<EditorialMotion name="environment-hero-arrival" frame={f} start={cueAt(f,1)} end={cueAt(f,1)+23}
            fromY={28} scaleFrom={.68} style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          <div data-km-environment-focal="" style={{position:"absolute",
            left:(anchor.x*100)+"%",top:(anchor.y*100)+"%",transform:"translate(-50%,-50%)",
            width:portrait?"44%":"28%",height:"47%"}}>
            <Asset asset={spec.content.focal} style={{...styles.image,objectFit:"contain",
              filter:"drop-shadow(0 1em 1.2em rgba(0,0,0,.3))"}}/>
          </div></EditorialMotion>}
          {show&&<EditorialMotion name="environment-title" frame={f} start={cueAt(f,2)} end={cueAt(f,2)+16}
            fromY={18} style={{position:"absolute",inset:0,pointerEvents:"none"}}><h2 style={{...styles.title,textShadow:"0 2px 15px #091320",textAlign:"center",
            position:"absolute",bottom:"1%",left:"10%",width:"80%",maxWidth:"none"}}>{spec.content.title}</h2></EditorialMotion>}
        </div></>;
    }
    case "page-turn-story": {
      const pages=spec.content.pages;
      const pageSpan=f.durationFrames/pages.length;
      const currentIndex=Math.min(pages.length-1,Math.floor(f.frame/pageSpan));
      const previous=pages[Math.max(0,currentIndex-1)];
      const current=pages[currentIndex];
      const localProgress=(f.frame-currentIndex*pageSpan)/pageSpan;
      const turning=currentIndex>0 && !f.reducedMotion && localProgress<.7;
      // Per-page travel uses absolute composition frame, not a phase counter
      // that would restart halfway through the same page turn.
      const turnProgress=Math.min(1,localProgress/.7);
      const angle=(spec.content.direction==="left"?1:-1)*turnProgress*165;
      return <><Head eyebrow="Editable page-turn story" title={spec.content.documentTitle}/>
        <div style={{...deck,alignItems:"center",justifyContent:"center",perspective:"1200px",minHeight:0}}>
          <div data-km-book-spread="" style={{display:"flex",position:"relative",width:portrait?"98%":"84%",
            height:portrait?"68%":"92%",boxShadow:"0 1.7em 2.8em rgba(0,0,0,.36)",
            borderRadius:".4em",background:spec.content.paper?.color??"#e7ddcb",color:spec.content.paper?.ink??"#203048",padding:".7%",boxSizing:"border-box"}}>
            <div style={{flex:1,background:spec.content.paper?.color??"#f7f2e8",padding:".9em",
              borderRight:"2px solid #c4b59b",display:"flex",flexDirection:"column",gap:".55em",
              minWidth:0,overflow:"hidden"}}>
              <Label>{previous.heading}</Label>
              <div style={{flex:1,minHeight:0}}><Asset asset={previous.image}/></div>
              <span style={{fontSize:".63em",overflowWrap:"anywhere"}}>{previous.text}</span>
            </div>
            <div style={{flex:1,background:spec.content.paper?.color??"#f7f2e8",padding:".9em",
              display:"flex",flexDirection:"column",gap:".55em",minWidth:0,overflow:"hidden"}}>
              <Label>{current.heading}</Label>
              <div style={{flex:1,minHeight:0}}><Asset asset={current.image}/></div>
              <span style={{fontSize:".63em",overflowWrap:"anywhere"}}>{current.text}</span>
            </div>
            <div aria-hidden="true" style={{position:"absolute",left:"48.7%",top:0,bottom:0,width:"2.6%",
              background:"linear-gradient(90deg,rgba(61,45,30,.28),rgba(255,255,255,.32) 45%,rgba(45,30,22,.29))",
              pointerEvents:"none",zIndex:2}}/>
            {turning&&!f.reducedMotion&&<div data-km-turning-page="" data-km-page-angle={angle}
              style={{position:"absolute",top:"1%",bottom:"1%",width:"49%",left:"50%",
                transformOrigin:spec.content.direction==="left"?"right center":"left center",
                transform:`rotateY(${angle}deg)`,transformStyle:"preserve-3d",
                boxShadow:`-.35em .2em 1em rgba(28,28,36,${spec.content.paper?.shadowOpacity??.24})`,
                borderRadius:".25em",boxSizing:"border-box",zIndex:3}}>
                <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",
                  background:spec.content.paper?.color??"#f7f2e8",padding:".65em",boxSizing:"border-box",
                  display:"flex",flexDirection:"column",gap:".5em",overflow:"hidden"}}>
                  <Label>{previous.heading}</Label>
                  <div style={{flex:1,minHeight:0}}><Asset asset={previous.image}/></div>
                  <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",
                    background:`linear-gradient(${angle>0?270:90}deg,rgba(30,25,28,${Math.abs(Math.sin(angle*Math.PI/180))*.35}),transparent 60%)`}}/>
                </div>
                <div aria-hidden="true" style={{position:"absolute",inset:0,backfaceVisibility:"hidden",
                  transform:"rotateY(180deg)",background:spec.content.paper?.color??"#f7f2e8",
                  padding:".65em",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:".5em"}}>
                  <Label>{current.heading}</Label>
                  <div style={{flex:1,minHeight:0}}><Asset asset={current.image}/></div>
                </div>
              </div>}
          </div>
        </div></>;
    }
    case "orbit-world": {
      const location=spec.content.locations[active];
      const rad=Math.PI/180;
      const cameraLatitude=(spec.content.camera?.latitude??(spec.content.placement==="stylized"?0:location.latitude*.25))*rad;
      const cameraLongitude=(spec.content.camera?.longitude??(spec.content.placement==="stylized"?0:location.longitude)+
        (f.reducedMotion?0:(spec.content.camera?.orbitDegrees??12)*(f.phaseProgress-.5)))*rad;
      // Orthographic projection: back-side anchors are occluded rather than
      // drawn as if they were visible through a solid planet.
      const markers=spec.content.locations.map(p=>{
        const latitude=(spec.content.placement==="stylized"?0:p.latitude)*rad;
        const longitude=(spec.content.placement==="stylized"?p.longitude:p.longitude)*rad;
        const delta=longitude-cameraLongitude;
        const x=Math.cos(latitude)*Math.sin(delta);
        const y=Math.cos(cameraLatitude)*Math.sin(latitude)-
          Math.sin(cameraLatitude)*Math.cos(latitude)*Math.cos(delta);
        const z=Math.sin(cameraLatitude)*Math.sin(latitude)+
          Math.cos(cameraLatitude)*Math.cos(latitude)*Math.cos(delta);
        return {...p,visible:z>=0,x:50+x*44,y:50-y*44};
      });
      return <><Head eyebrow={spec.content.placement==="stylized"?"Stylized world journey":"Geographic anchor preview"}
        title={location.label} detail="Illustrative globe projection, not a geographic basemap"/>
        <div style={{...deck,alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"relative",height:"100%",aspectRatio:"1",maxWidth:(spec.content.globeRadiusPercent??80)+"%",borderRadius:"50%",
            boxShadow:"inset -1.4em -1em 3em rgba(3,12,35,.6), 0 0 2em rgba(95,186,215,.12)",overflow:"hidden",
            background:"radial-gradient(circle at 30% 30%,#559cc1,#08243c)"}}>
            <Asset asset={spec.content.globe} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover",opacity:.88,
              transform:f.reducedMotion?"none":`translateX(${(f.frame/f.durationFrames)*-14}%) scale(${1.08+.12*Math.sin(f.frame/f.durationFrames*Math.PI)})`}}/>
            {markers.filter(marker=>marker.visible).map(marker=><div key={marker.id}
              role="presentation" data-km-world-location={marker.id}
              data-km-world-x={marker.x} data-km-world-y={marker.y}
              style={{position:"absolute",left:marker.x+"%",top:marker.y+"%",width:"4%",aspectRatio:"1",
              transform:"translate(-50%,-50%)",borderRadius:"50%",background:"var(--km-accent, #9fd9ce)",
              border:"2px solid #123651",
              boxShadow:"0 0 1em #a9eee4",opacity:marker.id===location.id?1:.55}}/>)}
          </div>{location.image&&<ImageTile asset={location.image} title={location.label} style={{maxWidth:"25%"}}/>}
          {spec.content.subject&&<div data-km-orbiting-subject="" style={{
            position:"absolute",left:`${50+42*Math.cos(f.reducedMotion?0:f.frame/f.durationFrames*2*Math.PI)}%`,
            top:`${65+12*Math.sin(f.reducedMotion?0:f.frame/f.durationFrames*2*Math.PI)}%`,
            width:portrait?"21%":"13%",height:"25%",
            transform:"translate(-50%,-50%)",filter:"drop-shadow(0 .9em 1em rgba(0,0,0,.45))"}}>
            <Asset asset={spec.content.subject} style={{objectFit:"contain"}}/>
          </div>}
        </div></>;
    }
    case "timeline-journey": {
      const current=spec.content.events[active];
      return <><Head eyebrow={spec.content.spacing==="elapsed"?"Elapsed-time media journey":"Event-media journey"}
        title={spec.content.narrative} detail={spec.content.nonLinear?"Deliberately non-linear story order":undefined}/>
        <div style={{...deck,minHeight:0,flex:"1 1 0",gap:"2%",alignItems:"stretch"}}>
          <div style={{flex:1,minHeight:0,position:"relative",overflow:"hidden",borderRadius:".75em",
            border:"1px solid rgba(241,251,255,.3)"}}>
            {current.image&&<Asset asset={current.image} style={{
              transform:f.reducedMotion?"none":`scale(${1.04+f.phaseProgress*.04})`,
              borderRadius:0}}/>}
            <div style={{position:"absolute",left:"5%",bottom:"6%",maxWidth:"80%",
              background:"rgba(9,31,45,.86)",padding:".7em",borderLeft:"4px solid var(--km-accent, #9fd9ce)"}}>
              <Label>{current.date}</Label><Word>{current.label}</Word>
            </div>
          </div>
          <div style={{height:portrait?"23%":"22%",minHeight:0,flex:"0 0 22%",width:"100%"}}>
            <TimeStrip items={spec.content.events.map(event=>({id:event.id,label:event.label,date:event.date}))}
              active={Math.min(active,spec.content.events.length-1)} spacing={spec.content.spacing} frame={f}/>
          </div>
        </div></>;
    }
    case "glass-data-reveal": return <>
      <div style={{position:"absolute",inset:0}}><Asset asset={spec.content.background} style={{borderRadius:0}}/></div>
      <div style={{position:"relative",height:"100%",width:"100%",display:"flex",flexDirection:"column",gap:"2.5%"}}>
        <Head eyebrow="Layered glass · Data presentation" title="Information in focus"/>
        <div style={{...deck}}>
          {spec.content.panels.slice(0,f.revealedItems).map((p,i)=><EditorialMotion key={p.id}
            name="glass-pane-refract" frame={f} start={cueAt(f,0)+i*7} end={cueAt(f,1)+i*7+10}
            fromX={i%2?24:-24} fromY={12} tilt={i%2?-8:8} scaleFrom={.84}
            style={{flex:"1 1 0",minWidth:0,display:"flex",perspective:"900px"}}>
            <div style={{...styles.tile,flex:1,position:"relative",
            background:f.reducedMotion?"rgba(12,35,52,.95)":spec.content.material
              ?`color-mix(in srgb, ${spec.content.material.tint} ${spec.content.material.opacity*100}%, transparent)`
              :"rgba(225,243,255,.15)",
            backdropFilter:f.reducedMotion?"none":`blur(${spec.content.material?.blurPx??12}px)`,
            border:"1px solid "+(spec.content.material?.borderColor??"rgba(239,251,255,.56)"),boxShadow:"0 1em 2em rgba(5,20,30,.16)"}}>
            <div aria-hidden="true" style={{position:"absolute",inset:0,
              background:"linear-gradient(120deg,transparent 18%,rgba(255,255,255,.16) 28%,transparent 37%)",
              pointerEvents:"none"}}/>
            <Label>{p.label}</Label><Word>{p.text}</Word>
          </div></EditorialMotion>)}
          {show&&<div style={{...styles.tile,background:f.reducedMotion?"rgba(11,34,57,.98)":"rgba(11,34,57,.78)",backdropFilter:f.reducedMotion?"none":"blur(12px)"}}>
            <ChartBars data={spec.content.data} unit={spec.content.unit} shown={spec.content.data.length} frame={f}/></div>}
        </div>
      </div></>;
  }
}
/** Composition surface; responsive typography is based on the stage container. */
export interface SceneTemplateViewProps<K extends SceneRecipeId = SceneRecipeId>
  extends Omit<ComponentPropsWithoutRef<"div">,"children"> {
  spec: SceneTemplateSpec<K>;
  frame: number;
  reducedMotion?: boolean;
  /** Host-only adapter for frame-addressable rigs, real 3D renderers or video.
   * Never save a callback inside the serializable recipe specification. */
  renderAsset?: SceneAssetRenderer;
}
/** All templates are deterministic: the parent controls the absolute frame. */
export const SceneTemplateView=forwardRef<HTMLDivElement,SceneTemplateViewProps>(
  function SceneTemplateView({spec,frame,reducedMotion,renderAsset,style,...props},ref) {
    const evaluated=evaluateSceneTemplate(spec,frame,reducedMotion);
    const content=<div {...props} ref={ref} role={props.role??"group"}
      aria-label={props["aria-label"]??spec.recipeId.split("-").join(" ")}
      data-km-scene-recipe={spec.recipeId} data-km-scene-phase={evaluated.phase}
      data-km-frame={evaluated.frame} data-km-scene-id={spec.id}
      style={{...styles.stage,aspectRatio:`${spec.width} / ${spec.height}`,
        ...(spec.safeInsets?{padding:[
          (spec.safeInsets.top*100)+"%",(spec.safeInsets.right*100)+"%",
          (spec.safeInsets.bottom*100)+"%",(spec.safeInsets.left*100)+"%",
        ].join(" ")}:{}),
        ...(spec.background?{background:spec.background}:{}),
        ...({"--km-accent":spec.accent??"#9fd9ce"} as CSSProperties),...style}}>
      {renderScene(spec,evaluated)}
    </div>;
    const wrapped=renderAsset
      ? <AssetRendererContext.Provider value={{render:renderAsset,frame:evaluated}}>{content}</AssetRendererContext.Provider>
      : content;
    return <PortraitContext.Provider value={spec.height>spec.width}>{wrapped}</PortraitContext.Provider>;
  });
