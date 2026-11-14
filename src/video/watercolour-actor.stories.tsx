import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { inspectWatercolourActorTrack } from "../../registry/video/watercolour-actor";
import { inspectPaintedComposition } from "../../registry/video/painted-composition";
import { validateCharacterDefinition } from "../../registry/character/validate";
import { evaluateCharacter } from "../../registry/character/evaluate";
import { PaintedTravellerPage, TRAVELLER, TRAVELLER_CUES, TRAVELLER_INSTANCE,
  TRAVELLER_MATERIAL, travellerTrack } from "./watercolour-actor-demo";
import type { TravellerFilmCustomization } from "./watercolour-actor-demo";
import { paintedDemoSpec } from "./painted-composition-demo";
import type { PaintedOutput } from "./painted-composition-demo";
import { WATERCOLOUR_ACTOR_FILM } from "./watercolour-actor-film";
import { WatercolourFilmViewport, WatercolourParameterEditor,
  WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

const FRAME_COUNT=430;
const control={font:"600 14px system-ui",border:"1px solid #C2B7A8",background:"#FFFCF5",
  color:"#3C4B4B",padding:"8px 12px",minHeight:42,borderRadius:9} as const;
const chapters=[
  {frame:0,name:"Intro"},{frame:155,name:"First step"},{frame:204,name:"Stride"},
  {frame:272,name:"Approach"},{frame:304,name:"Wave"},{frame:336,name:"Speak"},
  {frame:403,name:"Hold"},
] as const;

function validateActorOptions(candidate:unknown,output:PaintedOutput):string[]{
  const errors=inspectJsonObject(candidate);
  if(errors.length)return errors;
  const value=candidate as TravellerFilmCustomization;
  if(!value.track||!value.definition||!value.instance||!value.material||
    !Array.isArray(value.cues)||!value.background)
    return ["Supply track, definition, instance, material, cues and background."];
  const expected=output==="landscape"?{width:960,height:540}:{width:540,height:960};
  try{
    errors.push(...inspectWatercolourActorTrack(value.track).map(p=>"track"+p));
    if(value.track.stage.width!==expected.width||value.track.stage.height!==expected.height)
      errors.push("Track stage dimensions must match the selected output.");
    if(value.background.width!==expected.width||value.background.height!==expected.height)
      errors.push("Background dimensions must match the selected output.");
    errors.push(...inspectPaintedComposition(value.background).map(x=>x.path+": "+x.message));
    errors.push(...validateCharacterDefinition(value.definition)
      .filter(x=>x.severity==="error").map(x=>"Character "+x.code+": "+x.message));
    if(value.instance.instanceId!==value.track.id ||
      value.instance.characterId!==value.definition.characterId ||
      value.instance.revision!==value.definition.revision)
      errors.push("Track/instance/definition identities and revisions must match.");
    const material=value.material;
    if(!Number.isSafeInteger(material.seed)||material.seed<0||material.seed>2147483647 ||
      ![material.tooth,material.bleed,material.granulation]
        .every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=1))
      errors.push("Material needs a 31-bit seed and bounded tooth, bleed and granulation.");
    if(value.cues.length>500||
      value.cues.some(c=>!c||typeof c.id!=="string"||
        !Number.isSafeInteger(c.startFrame)||c.startFrame<0||
        c.instanceId!==value.instance?.instanceId))
      errors.push("Cues must have IDs, nonnegative integer start frames and matching performer IDs.");
    if(value.paperColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(value.paperColor))
      errors.push("Paper color must be six-digit hex.");
    if(value.text&&Object.values(value.text).some(s=>typeof s!=="string"||s.length>200))
      errors.push("Text fields must be strings of 200 characters or fewer.");
    if(errors.length===0){
      for(const frame of [0,155,304,336]){
        const state=evaluateCharacter(value.definition,value.instance,value.cues,frame);
        errors.push(...state.diagnostics.filter(x=>x.severity==="error")
          .map(x=>"At frame "+frame+": "+x.message));
      }
    }
  }catch(e){errors.push("Invalid character configuration: "+String(e));}
  return errors;
}

function WatercolourCharacterLab(){
  const [frame,setFrame]=useState(320);
  const [playing,setPlaying]=useState(false);
  const [output,setOutput]=useState<PaintedOutput>("landscape");
  const [reduced,setReduced]=useState(false);
  const [seed,setSeed]=useState(TRAVELLER_MATERIAL.seed);
  const [tooth,setTooth]=useState(TRAVELLER_MATERIAL.tooth);
  const [granulation,setGranulation]=useState(TRAVELLER_MATERIAL.granulation);
  const [bleed,setBleed]=useState(TRAVELLER_MATERIAL.bleed);
  const [stepLift,setStepLift]=useState(8);
  const [lean,setLean]=useState(1.65);
  const [cadence,setCadence]=useState<1|2|3>(2);
  const [showShadow,setShowShadow]=useState(true);
  const [showActor,setShowActor]=useState(true);
  const [showTypography,setShowTypography]=useState(true);
  const [paperColor,setPaperColor]=useState("#F5EFE5");
  const [line1,setLine1]=useState("Every journey");
  const [line2,setLine2]=useState("begins in colour.");
  const [custom,setCustom]=useState<TravellerFilmCustomization|null>(null);
  const compiled=useMemo(()=>compileFilm(WATERCOLOUR_ACTOR_FILM,{outputId:output}),[output]);
  const defaults=useMemo<TravellerFilmCustomization>(()=>({
    track:{...travellerTrack(output),cadenceFrames:cadence,stepLift,leanDegrees:lean},
    definition:TRAVELLER,instance:TRAVELLER_INSTANCE,cues:TRAVELLER_CUES,
    material:{seed,tooth,granulation,bleed},background:paintedDemoSpec("nature",output,103),
    showShadow,showActor,showTypography,paperColor,
    text:{kicker:"PAINTED CHARACTERS / 01",line1,line2,
      subtitle:"A character walks through a world made of layered washes."},
  }),[output,seed,tooth,granulation,bleed,stepLift,lean,cadence,
    showShadow,showActor,showTypography,paperColor,line1,line2]);
  const options=custom??defaults;
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now(),initial=frame;
    let id=0;
    const tick=(now:number)=>{
      const next=Math.min(FRAME_COUNT-1,initial+Math.floor((now-start)*30/1000));
      setFrame(next);
      if(next<FRAME_COUNT-1)id=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(id);
    // UI transport only; the performer always receives an absolute FilmStage frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(x=>x.message).join("\n")}</pre>;
  const film=compiled.film;
  return <main style={{minHeight:"100vh",background:"#ECE5DA",color:"#344448",
    fontFamily:"system-ui,sans-serif",padding:23,display:"grid",gap:15,alignContent:"start"}}>
    <header style={{maxWidth:950}}>
      <small style={{letterSpacing:2.3,color:"#896E60",fontWeight:800}}>
        WM3 / WATERCOLOUR CHARACTER PERFORMANCE
      </small>
      <h1 style={{font:"italic 500 38px/1.1 Georgia,serif",margin:"9px 0"}}>
        A character made of paint
      </h1>
      <p style={{maxWidth:800,lineHeight:1.55}}>
        Play and scrub an original rigged traveller performing steps, a wave, gaze, facial expression,
        blink and speech. Tune body motion, redraw cadence, part material and typography in real time.
        For individual poses, rig parts, palette, cues and background layers, use the complete JSON editor.
      </p>
    </header>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <label style={{display:"grid",gap:4,fontWeight:650}}>
        Film aspect
        <select aria-label="Film aspect" style={control} value={output}
          onChange={e=>{setPlaying(false);setOutput(e.target.value as PaintedOutput);setCustom(null);}}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={{display:"grid",gap:4,fontWeight:650}}>
        Redraw cadence
        <select aria-label="Redraw cadence" style={control} value={cadence}
          onChange={e=>{setCustom(null);setCadence(Number(e.target.value) as 1|2|3);}}>
          <option value={1}>On ones · 30 fps</option>
          <option value={2}>On twos · 15 fps</option>
          <option value={3}>On threes · 10 fps</option>
        </select>
      </label>
      <WatercolourSlider label="Paint granulation" value={granulation}
        onChange={v=>{setCustom(null);setGranulation(v);}}/>
      <WatercolourSlider label="Paint bleed" value={bleed}
        onChange={v=>{setCustom(null);setBleed(v);}}/>
      <WatercolourSlider label="Cotton-paper tooth" value={tooth}
        onChange={v=>{setCustom(null);setTooth(v);}}/>
      <WatercolourSlider label="Step height" value={stepLift} min={0} max={30} step={1}
        format={v=>v.toFixed(0)+" px"} onChange={v=>{setCustom(null);setStepLift(v);}}/>
      <WatercolourSlider label="Body lean" value={lean} min={0} max={12} step={.25}
        format={v=>v.toFixed(2)+"°"} onChange={v=>{setCustom(null);setLean(v);}}/>
      <label style={{display:"grid",gap:4,fontWeight:650}}>Paper seed
        <input aria-label="Character material seed" type="number" min={0} max={2147483647}
          style={{...control,width:105}} value={seed}
          onChange={e=>{setCustom(null);setSeed(Math.max(0,Math.min(2147483647,
            Math.floor(Number(e.target.value)||0))));}}/>
      </label>
      <label style={{display:"grid",gap:4,fontWeight:650,fontSize:13}}>Paper colour
        <input aria-label="Character paper colour" type="color" value={paperColor}
          onChange={e=>{setCustom(null);setPaperColor(e.target.value);}}
          style={{height:42,width:76}}/>
      </label>
    </div>
    <div style={{display:"flex",gap:15,flexWrap:"wrap",alignItems:"center",maxWidth:1000}}>
      {([
        {label:"Character",value:showActor,set:setShowActor},
        {label:"Contact shadow",value:showShadow,set:setShowShadow},
        {label:"Titles",value:showTypography,set:setShowTypography},
        {label:"Reduced motion",value:reduced,set:setReduced},
      ] as const).map(toggle=><label key={toggle.label}
        style={{display:"flex",alignItems:"center",gap:7,fontWeight:650,fontSize:13,minHeight:32}}>
        <input type="checkbox" aria-label={toggle.label} checked={toggle.value}
          onChange={e=>{setPlaying(false);setCustom(null);toggle.set(e.target.checked);}}/>
        {toggle.label}
      </label>)}
      <label style={{display:"grid",gap:3,fontWeight:650,fontSize:13}}>Title, line one
        <input style={control} aria-label="Title line one" value={line1}
          onChange={e=>{setCustom(null);setLine1(e.target.value.slice(0,80));}}/>
      </label>
      <label style={{display:"grid",gap:3,fontWeight:650,fontSize:13}}>Title, line two
        <input style={control} aria-label="Title line two" value={line2}
          onChange={e=>{setCustom(null);setLine2(e.target.value.slice(0,80));}}/>
      </label>
    </div>
    <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
      <button type="button" style={control} onClick={()=>{
        if(playing){setPlaying(false);return;}
        if(frame>=FRAME_COUNT-1)setFrame(0);
        setPlaying(true);
      }}>{playing?"Pause":"Play character film"}</button>
      {chapters.map(({frame:at,name})=><button type="button" key={at} style={control}
        onClick={()=>{setPlaying(false);setFrame(at);}}>{name}</button>)}
    </div>
    <label style={{display:"grid",gap:6,maxWidth:990,fontWeight:700}}>
      Absolute film frame: {frame} / {FRAME_COUNT-1}
      <input aria-label="Character film frame" type="range" min={0} max={FRAME_COUNT-1}
        value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <WatercolourFilmViewport width={film.width} height={film.height}>
      {scale=><FilmStage film={film} frame={frame} renderObject={()=>null} reducedMotion={reduced}
        renderSlot={(content,ctx)=>{
          if(content.slot!=="watercolour-actor")throw new Error("Unknown watercolor actor film slot");
          return <PaintedTravellerPage output={output} frame={ctx.frame}
            options={options} reducedMotion={ctx.reducedMotion}/>;
        }}
        style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor key={output} title="Character, rig, cues and painted scene"
      value={options} validate={candidate=>validateActorOptions(candidate,output)}
      onApply={value=>{setPlaying(false);setCustom(value);}}
      onReset={()=>{setPlaying(false);setCustom(null);}}
      notes="Includes every character asset and palette, instance, locomotion key, performance cue,
      background wash, paper and text value. Quick controls restore their values after editing."/>
    <p style={{maxWidth:890,margin:0,fontSize:13,lineHeight:1.5,color:"#667470"}}>
      Rigged actions are evaluated through the same character engine as production export; the preview
      does not duplicate animation timing. This is a customizable visual-QA fixture, not final art approval.
    </p>
  </main>;
}
const meta={title:"Video Production/Film Looks/Watercolour & Brush",id:"film-art-watercolour-character",
  component:WatercolourCharacterLab,parameters:{layout:"fullscreen"}} satisfies Meta<typeof WatercolourCharacterLab>;
export default meta;
type Story=StoryObj<typeof meta>;
export const PaintedCharacterPerformance:Story={render:()=> <WatercolourCharacterLab/>};
