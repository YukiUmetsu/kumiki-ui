import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { evaluateSceneTemplate } from "./scene-templates";
import type { ImageAsset, LabeledAsset, DataPoint, SceneRecipeId, SceneTemplateFrame, SceneTemplateSpec, FocusRegion } from "./scene-templates";

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
function Word({children,small=false}: {children:ReactNode;small?:boolean}) {
  return <span style={small?styles.note:styles.feature}>{children}</span>;
}
function Tile({children,style}: {children:ReactNode;style?:CSSProperties}) {
  return <div style={{...styles.tile,...style}}>{children}</div>;
}
function Asset({asset, style}: {asset?:ImageAsset;style?:CSSProperties}) {
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
function Chain({items,shown,final}: {items:string[];shown:number;final?:string}) {
  const visible=items.slice(0,Math.max(0,shown));
  return <div style={{...styles.deck,alignItems:"center"}}>
    {visible.map((text,i)=><div key={i} style={{display:"contents"}}>
      {i>0&&<Chevron/>}<Tile><Label>Step {i+1}</Label><Word>{text}</Word></Tile>
    </div>)}
    {final&&shown>=items.length&&<><Chevron/><Tile style={{borderColor:"var(--km-accent, #9fd9ce)"}}><Label>Outcome</Label><Word>{final}</Word></Tile></>}
  </div>;
}
function ChartBars({data,unit,shown,baseline}: {data:DataPoint[];unit:string;shown:number;baseline?:number}) {
  const values=data.map(x=>x.value);
  const origin=Math.min(0,baseline??0,...values),top=Math.max(1,baseline??0,...values);
  const span=Math.max(1e-9,top-origin);
  return <div style={{display:"flex",height:"100%",width:"100%",alignItems:"flex-end",gap:"2.5%",padding:"3% 2% 1%",boxSizing:"border-box",borderBottom:"2px solid rgba(251,255,255,.52)"}}>
    {data.map((d,i)=><div key={d.id} style={{display:"flex",height:"100%",minWidth:0,flex:1,flexDirection:"column",justifyContent:"flex-end",gap:"2%"}}>
      <span style={{fontSize:".66em",textAlign:"center",opacity:i<shown?1:.32,whiteSpace:"nowrap"}}>{i<shown?d.value.toLocaleString()+" "+unit:""}</span>
      <div aria-hidden="true" style={{height:(i<shown?Math.max(2,(Math.abs(d.value-origin)/span)*72):0)+"%",borderRadius:".25em .25em 0 0",background:"var(--km-accent, #9fd9ce)",opacity:.85,transition:"none"}}/>
      <span style={{fontSize:".64em",textAlign:"center",overflowWrap:"anywhere",opacity:i<shown?1:.36}}>{d.label}</span>
    </div>)}
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
  return <div style={{...styles.deck,justifyContent:"center"}}>{items.slice(0,shown).map((item,i)=>
    <ImageTile key={item.id} title={item.label} note={item.note} asset={item.image} style={{boxShadow:i===shown-1?"0 0 0 2px var(--km-accent, #9fd9ce)":"none"}} />)}
  </div>;
}
function TimeStrip({items,active}:{items:{id:string;label:string;date?:string;image?:ImageAsset}[];active:number}) {
  return <div style={{...styles.deck,alignItems:"center",gap:"1%"}}>{items.map((item,i)=>
    <div key={item.id} style={{flex:1,opacity:i>active?.35:1,minWidth:0,borderTop:"3px solid "+(i<=active?"var(--km-accent, #9fd9ce)":"rgba(251,255,255,.28)"),
      display:"flex",paddingTop:".75em",flexDirection:"column",gap:".4em"}}>
      {item.date&&<Label>{item.date}</Label>}<Word>{item.label}</Word>
      {item.image&&<div style={{height:"5em",minHeight:0}}><Asset asset={item.image}/></div>}
    </div>)}
  </div>;
}
function GeometryGraph({nodes,edges,visible}:{nodes:LabeledAsset[];edges:{from:string;to:string;label?:string}[];visible:number}) {
  const count=nodes.length,points=nodes.map((node,i)=>({id:node.id,x:13+74*(count===1?0.5:i/(count-1)),y:44+16*Math.sin(i*2.4)}));
  return <div style={{position:"relative",height:"100%",width:"100%"}}>
    <svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none"
      style={{position:"absolute",width:"100%",height:"100%",inset:0,overflow:"visible"}}>
      {edges.slice(0,Math.max(0,visible-nodes.length)).map((e,i)=>{
        const a=points.find(p=>p.id===e.from),b=points.find(p=>p.id===e.to);
        return a&&b?<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--km-accent, #9fd9ce)" strokeWidth=".6"/>:null;
      })}
    </svg>
    {nodes.map((node,i)=><div key={node.id} data-km-semantic-id={node.id} style={{
      position:"absolute",left:points[i].x+"%",top:points[i].y+"%",transform:"translate(-50%,-50%)",
      width:Math.min(25,72/Math.max(2,count))+"%",minHeight:"20%",opacity:i<visible?1:.17,
      display:"flex",justifyContent:"center",alignItems:"center",textAlign:"center",
      border:"2px solid var(--km-accent, #9fd9ce)",background:"var(--km-surface-canvas, #102133)",
      borderRadius:".7em",padding:".4em",boxSizing:"border-box",fontSize:".76em",overflowWrap:"anywhere"}}>
      {node.label}
    </div>)}
  </div>;
}
function renderScene(spec:SceneTemplateSpec,f:SceneTemplateFrame):ReactNode {
  const show=f.phaseIndex>=2,final=f.phaseIndex===3,active=f.activeItem;
  switch(spec.recipeId) {
    case "question-reveal": return <>
      <Head eyebrow="Question → answer" title={show?spec.content.answer:spec.content.question}/>
      <div style={{...styles.deck,justifyContent:"center"}}>
        <ImageTile asset={show&&spec.content.answerVisual?spec.content.answerVisual:spec.content.subject}
          title={show?"The answer":"Consider the subject"} style={{maxWidth:"75%"}}/>
      </div></>;
    case "hidden-detail": return <>
      <Head eyebrow="Find the overlooked detail" title={show?spec.content.detail:spec.content.context}/>
      <div style={{...styles.deck,justifyContent:"center"}}>
        <Tile style={{padding:".4em",maxWidth:"82%"}}><RegionAsset asset={spec.content.subject} region={spec.content.target} show={f.phaseIndex>=1}/></Tile>
      </div></>;
    case "before-after": return <>
      <Head eyebrow="Same subject · Different states" title={show?"What changed":"Before and after"}
        detail={final?spec.content.changes.join(" · "):undefined}/>
      <div style={styles.deck}><ImageTile asset={spec.content.before.image} title={spec.content.before.label}/>
        <Chevron char="⇢"/><ImageTile asset={show?spec.content.after.image:spec.content.before.image}
          title={show?spec.content.after.label:"Transition"} note={show?spec.content.changes[active%spec.content.changes.length]:undefined}/></div></>;
    case "side-by-side": return <>
      <Head eyebrow="Controlled comparison" title={spec.content.criterion} detail={show?spec.content.comparison:undefined}/>
      <div style={styles.deck}>{spec.content.alternatives.map(a=><ImageTile key={a.id} asset={a.image} title={a.label}
        note={show?a.note:undefined}/>)}</div></>;
    case "cause-effect": return <>
      <Head eyebrow="Mechanism · Not proof of causality" title={spec.content.event}
        detail={final?(spec.content.qualification??spec.content.outcome):spec.content.initial}/>
      <Chain items={[spec.content.initial,spec.content.event,...spec.content.links]} shown={Math.max(1,f.revealedItems+1)}
        final={final?spec.content.outcome:undefined}/></>;
    case "scale-reveal": {
      const ratio=spec.content.subject.quantity/spec.content.reference.quantity;
      const max=Math.max(spec.content.subject.quantity,spec.content.reference.quantity);
      return <><Head eyebrow="Scale comparison" title={spec.content.subject.label+" / "+spec.content.reference.label}
        detail={show?`${ratio.toLocaleString(undefined,{maximumFractionDigits:2})}× reference · ${spec.content.mode} scale`:undefined}/>
        <div style={{...styles.deck,flexDirection:"column",justifyContent:"center"}}>
          {[spec.content.reference,spec.content.subject].map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"2%",height:"32%"}}>
            <span style={{width:"28%",fontSize:".8em"}}>{item.label}<br/>{item.quantity.toLocaleString()} {spec.content.unit}</span>
            <div style={{height:"42%",width:(spec.content.mode==="illustrative"?65:Math.max(2,65*item.quantity/max))+"%",
              borderRadius:".35em",background:i===0?"rgba(244,248,253,.40)":"var(--km-accent, #9fd9ce)",opacity:!show&&i===1?.14:1}}/>
          </div>)}
        </div></>;
    }
    case "context-to-detail": return <>
      <Head eyebrow="Context → detail" title={spec.content.description}/>
      <div style={styles.deck}><Tile style={{padding:".3em"}}><RegionAsset asset={spec.content.context} region={spec.content.target} show={f.phaseIndex>=1}/></Tile>
        {show&&<ImageTile asset={spec.content.detail} title="Detail" />}</div></>;
    case "layered-cutaway": return <>
      <Head eyebrow="Internal structure" title={show?spec.content.relationship:"Outside → inside"}
        detail={spec.content.reconstructed?"Reconstructed illustration":undefined}/>
      <div style={styles.deck}><ImageTile asset={spec.content.object} title="Intact object"/>
        <div style={{flex:1,position:"relative",minWidth:0,perspective:"650px"}}>
          {spec.content.layers.slice(0,f.revealedItems).map((layer,i)=><div key={layer.id}
            style={{position:"absolute",left:(8+i*6)+"%",top:(12+i*8)+"%",width:"70%",height:"68%",
              transform:`rotateY(-15deg) translateZ(${i*8}px)`,opacity:.85,zIndex:i,
              background:"rgba(30,57,78,.82)",border:"2px solid var(--km-accent, #9fd9ce)",
              borderRadius:".4em",display:"flex",flexDirection:"column",alignItems:"center",padding:".4em",
              boxSizing:"border-box"}}>
              <Label>{layer.label}</Label>{layer.image&&<Asset asset={layer.image}/>}
            </div>)}
        </div></div></>;
    case "build-and-connect": return <>
      <Head eyebrow="Assemble a system" title={show?spec.content.result:"Parts and relationships"}/>
      <div style={{...styles.deck,flexDirection:"column"}}><GeometryGraph nodes={spec.content.nodes}
        edges={spec.content.connections} visible={f.revealedItems}/></div></>;
    case "transform-and-track": return <>
      <Head eyebrow="Track the same entities" title={spec.content.changedProperty}/>
      <div style={styles.deck}><Tile><Label>Source</Label><Sequence items={spec.content.source} shown={spec.content.source.length}/></Tile>
        <Chevron/><Tile><Label>Mapped output</Label><Sequence items={spec.content.destination}
          shown={show?spec.content.destination.length:0}/></Tile></div></>;
    case "time-evolution": return <>
      <Head eyebrow="Evolution over time" title={final?spec.content.outcome:spec.content.baseline}/>
      <TimeStrip items={spec.content.milestones} active={f.phaseIndex===0?0:Math.min(active,spec.content.milestones.length-1)}/></>;
    case "data-story": return <>
      <Head eyebrow="Chart · Sourced values" title={spec.content.insight} detail={"Source: "+spec.content.source}/>
      <Tile><ChartBars data={spec.content.data} unit={spec.content.unit} baseline={spec.content.baseline}
        shown={final?spec.content.data.length:f.revealedItems}/></Tile></>;
    case "consequence-chain": return <>
      <Head eyebrow="Downstream consequences" title={spec.content.event}
        detail={final?spec.content.uncertainty:undefined}/>
      <Chain items={spec.content.impacts} shown={f.revealedItems}
        final={final?spec.content.outcome:undefined}/></>;
    case "decision-branch": return <>
      <Head eyebrow="Decision tree" title={spec.content.decision}/>
      <div style={{...styles.deck,alignItems:"center",flexWrap:"wrap"}}>{spec.content.options.map((o,i)=>
        <Tile key={o.id} style={{opacity:i<=active||final?1:.18,flexBasis:"30%",minWidth:"26%"}}>
          <Label>{o.condition}</Label><Word>{o.label}</Word>
          {(show||final)&&<span style={styles.note}>{o.outcome}</span>}
        </Tile>)}</div></>;
    case "worked-example": return <>
      <Head eyebrow="Worked example" title={final?spec.content.result:spec.content.startingCase}/>
      <div style={styles.deck}>{spec.content.operations.slice(0,f.revealedItems).map((o,i)=>
        <Tile key={o.id}><Label>Operation {i+1}</Label><Word>{o.instruction}</Word><span style={styles.note}>{o.intermediate}</span></Tile>)}
        {final&&<Tile style={{borderColor:"var(--km-accent, #9fd9ce)"}}><Label>Result</Label><Word>{spec.content.result} {spec.content.unit}</Word></Tile>}</div></>;
    case "demonstration": return <>
      <Head eyebrow={spec.content.simulated?"Simulated demonstration":"Action demonstration"} title={show?spec.content.result:spec.content.target}/>
      <div style={styles.deck}><ImageTile asset={spec.content.setup} title="Setup" />
        <Tile><Label>Actions</Label>{spec.content.actions.slice(0,Math.max(1,f.revealedItems)).map((x,i)=>
          <div key={i} style={{display:"flex",gap:".55em",alignItems:"center",opacity:i===active?1:.72}}>
          <span style={{color:"var(--km-accent, #9fd9ce)"}}>{i+1}.</span><Word small>{x}</Word></div>)}</Tile></div></>;
    case "guided-inspection": {
      const target=spec.content.targets[active];
      return <><Head eyebrow="Guided inspection" title={final?spec.content.summary:(target?.label??"Establish the whole")}/>
        <div style={styles.deck}><Tile style={{padding:".35em"}}><RegionAsset asset={spec.content.scene}
          region={target?.region??spec.content.targets[0].region} show={f.phaseIndex>=1}/></Tile>
          <Tile style={{flex:"0 0 28%"}}><Label>Targets</Label>{spec.content.targets.map((t,i)=>
            <span key={t.id} style={{...styles.note,opacity:i<=active?1:.3}}>{i+1}. {t.label}</span>)}</Tile></div></>;
    }
    case "character-discovery": return <>
      <Head eyebrow="Character-led discovery" title={final?spec.content.reveal:(show?spec.content.reaction:spec.content.attentionTarget)}/>
      <div style={styles.deck}><ImageTile asset={spec.content.character} title="Presenter" />
        <Chevron/><ImageTile asset={spec.content.subject} title="Discovery subject" /></div></>;
    case "evidence-reveal": return <>
      <Head eyebrow="Claim → supporting evidence" title={spec.content.claim}
        detail={final?(spec.content.qualification??"Evidence supplied by author"):undefined}/>
      <div style={styles.deck}><Tile style={{padding:".35em",minWidth:0}}>
        <div style={{position:"relative",flex:1,minHeight:0}}>{spec.content.region
          ?<RegionAsset asset={spec.content.evidence} region={spec.content.region} show={show}/>
          :<Asset asset={spec.content.evidence}/>}</div>
        </Tile>{show&&<Tile style={{flexBasis:"35%"}}><Label>Source · {spec.content.source}</Label>
          <Word>{spec.content.excerpt}</Word></Tile>}</div></>;
    case "environment-reveal": return <>
      <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
        <Asset asset={spec.content.environment} style={{...styles.image,borderRadius:0}}/>
        <img src={spec.content.foreground.src} alt="" aria-hidden="true" draggable={false}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:1-f.phaseProgress*(f.phaseIndex>=1?0.7:0),
            transform:`scale(${f.reducedMotion?1:1.12-f.phaseProgress*.08})`}}/>
      </div>
      <div style={{position:"relative",display:"flex",height:"100%",width:"100%",justifyContent:"center",alignItems:"center",flexDirection:"column"}}>
        {show&&<div style={{width:"30%",height:"45%",minHeight:0}}><Asset asset={spec.content.focal} style={{...styles.image,objectFit:"contain"}}/></div>}
        {show&&<h2 style={{...styles.title,textShadow:"0 2px 15px #091320",textAlign:"center"}}>{spec.content.title}</h2>}
      </div></>;
    case "page-turn-story": {
      const page=spec.content.pages[Math.max(0,Math.min(active,spec.content.pages.length-1))];
      return <><Head eyebrow="Document journey" title={spec.content.documentTitle}/>
        <div style={{...styles.deck,justifyContent:"center",perspective:"1100px"}}>
          <div style={{display:"flex",width:"74%",height:"100%",boxShadow:"0 2em 3em rgba(0,0,0,.32)",
            borderRadius:".4em",background:"#e9ddc9",color:"#21324a",padding:"1%",boxSizing:"border-box"}}>
            <div style={{flex:1,background:"#f7f1e3",padding:"1em",borderRight:"3px solid #ad997a",
              display:"flex",justifyContent:"center",alignItems:"center",fontWeight:700}}>
              {spec.content.pages[Math.max(0,active-1)]?.heading??spec.content.documentTitle}
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:".3em",padding:".7em",
              transform:`rotateY(${f.reducedMotion?0:(f.phaseIndex===1?-25+f.phaseProgress*25:0)}deg)`,transformOrigin:spec.content.direction==="left"?"left":"right"}}>
              <Label>{page.heading}</Label><div style={{flex:1,minHeight:0}}><Asset asset={page.image}/></div>
              {page.text&&<span style={{fontSize:".58em",overflowWrap:"anywhere"}}>{page.text}</span>}
            </div>
          </div>
        </div></>;
    }
    case "orbit-world": {
      const location=spec.content.locations[active],rad=Math.PI/180;
      const lat=location.latitude*rad, lon=location.longitude*rad;
      const longitude=spec.content.placement==="stylized"?0:lon;
      const cx=50+Math.sin(longitude)*Math.cos(lat)*41;
      const cy=50-Math.sin(lat)*41;
      return <><Head eyebrow={spec.content.placement==="stylized"?"Stylized world journey":"Geographic anchor preview"}
        title={location.label} detail={spec.content.placement==="geographic"?"Illustrative globe projection, not a geographic basemap":undefined}/>
        <div style={{...styles.deck,alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"relative",height:"100%",aspectRatio:"1",maxWidth:"80%",borderRadius:"50%",
            boxShadow:"inset -1.4em -1em 3em rgba(3,12,35,.6), 0 0 2em rgba(95,186,215,.12)",overflow:"hidden",
            background:"radial-gradient(circle at 30% 30%,#559cc1,#08243c)"}}>
            <Asset asset={spec.content.globe} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover",opacity:.88,
              transform:f.reducedMotion?"none":`translateX(${(f.frame/f.durationFrames)*-14}%) scale(1.18)`}}/>
            <div role="presentation" style={{position:"absolute",left:cx+"%",top:cy+"%",width:"5%",aspectRatio:"1",
              transform:"translate(-50%,-50%)",borderRadius:"50%",background:"var(--km-accent, #9fd9ce)",
              boxShadow:"0 0 0 .18em #123651, 0 0 1em #a9eee4"}}/>
          </div>{location.image&&<ImageTile asset={location.image} title={location.label} style={{maxWidth:"25%"}}/>}
          {spec.content.subject&&<div style={{maxWidth:"15%",maxHeight:"40%"}}><Asset asset={spec.content.subject} style={{objectFit:"contain"}}/></div>}
        </div></>;
    }
    case "timeline-journey": return <>
      <Head eyebrow={spec.content.spacing==="elapsed"?"Time-scaled journey":"Milestone journey"} title={spec.content.narrative}
        detail={spec.content.nonLinear?"Non-linear story order":undefined}/>
      <TimeStrip items={spec.content.events} active={Math.min(active,spec.content.events.length-1)}/></>;
    case "glass-data-reveal": return <>
      <div style={{position:"absolute",inset:0}}><Asset asset={spec.content.background} style={{borderRadius:0}}/></div>
      <div style={{position:"relative",height:"100%",width:"100%",display:"flex",flexDirection:"column",gap:"2.5%"}}>
        <Head eyebrow="Layered glass · Data presentation" title="Information in focus"/>
        <div style={{...styles.deck}}>
          {spec.content.panels.slice(0,f.revealedItems).map(p=><div key={p.id} style={{...styles.tile,
            background:"rgba(225,243,255,.15)",backdropFilter:"blur(12px)",
            border:"1px solid rgba(239,251,255,.56)",boxShadow:"0 1em 2em rgba(5,20,30,.16)"}}>
            <Label>{p.label}</Label><Word>{p.text}</Word>
          </div>)}
          {show&&<div style={{...styles.tile,background:"rgba(11,34,57,.78)",backdropFilter:"blur(12px)"}}>
            <ChartBars data={spec.content.data} unit={spec.content.unit} shown={spec.content.data.length}/></div>}
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
}
/** All templates are deterministic: the parent controls the absolute frame. */
export const SceneTemplateView=forwardRef<HTMLDivElement,SceneTemplateViewProps>(
  function SceneTemplateView({spec,frame,reducedMotion,style,...props},ref) {
    const evaluated=evaluateSceneTemplate(spec,frame,reducedMotion);
    return <div {...props} ref={ref} role={props.role??"group"}
      aria-label={props["aria-label"]??spec.recipeId.replaceAll("-"," ")}
      data-km-scene-recipe={spec.recipeId} data-km-scene-phase={evaluated.phase}
      data-km-frame={evaluated.frame} data-km-scene-id={spec.id}
      style={{...styles.stage,aspectRatio:`${spec.width} / ${spec.height}`,
        ...(spec.background?{background:spec.background}:{}),
        ...({"--km-accent":spec.accent??"#9fd9ce"} as CSSProperties),...style}}>
      {renderScene(spec,evaluated)}
    </div>;
  });
