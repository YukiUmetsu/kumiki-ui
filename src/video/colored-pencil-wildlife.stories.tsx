import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { PencilScene } from "../../registry/video/colored-pencil-scene-react";
import { pencilWildlifeScene } from "./colored-pencil-wildlife";
import type { PencilAspect } from "../../registry/video/colored-pencil";
import { COLOR_PENCIL_WILDLIFE_FILM } from "./colored-pencil-wildlife-film";

const meta = {
  title: "Video Production/Film Looks/Colour-pencil/Wildlife",
  id: "video-colored-pencil-wildlife",
  component: PencilScene,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PencilScene>;
export default meta;

const label = { display:"grid", gap:5, font:"600 13px system-ui", minWidth:147 } as const;
const button = {padding:"9px 14px", minHeight:42, border:"1px solid #B6B1A7",
  borderRadius:7, background:"#FAF4E8", cursor:"pointer",
  color:"#384951", font:"600 13px system-ui"} as const;

/** Transport belongs only to Storybook. The drawing remains a pure function of absolute frames. */
function WildlifeStudio({ filmView = false }: { filmView?: boolean }) {
  const [aspect, setAspect] = useState<PencilAspect>("landscape");
  const [paperTooth, setTooth] = useState(.68);
  const [detail, setDetail] = useState<"full" | "study">("full");
  const [inspection, setInspection] = useState<"composition" | "wing" | "eye" | "breast" | "foot">("composition");
  const [frame, setFrame] = useState(285);
  const [speed, setSpeed] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scene = useMemo(() => pencilWildlifeScene({aspect, paperTooth, detail}),
    [aspect, paperTooth, detail]);
  const compiled = useMemo(() => compileFilm(COLOR_PENCIL_WILDLIFE_FILM, {outputId:aspect}),
    [aspect]);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const start = performance.now(), offset = frame;
    let raf = 0;
    const next = (now: number) => {
      const at = Math.min(419, offset + Math.floor((now - start) * .03 * speed));
      setFrame(at);
      if (at < 419) raf = requestAnimationFrame(next);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(next);
    return () => cancelAnimationFrame(raf);
    // Transport resumes at the selected checkpoint after Play, not during seek.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reducedMotion, speed]);
  // Inspection zoom is Storybook-only; FilmStage/export always sees the same art.
  // World coordinates are derived from the existing authored actor placement.
  const point = inspection === "wing" ? [147, 157] :
    inspection === "breast" ? [115, 160] :
    inspection === "foot" ? [134, 213] : [112, 95];
  const placement = aspect === "landscape" ?
    {x:475 + 1.65 * point[0], y:84 + 1.65 * point[1], w:960, h:540} :
    {x:78 + 1.72 * point[0], y:267 + 1.72 * point[1], w:540, h:960};
  const zoom = inspection === "wing" ? 2.5 : inspection === "breast" ? 3.1 :
    inspection === "foot" ? 4.2 : 3.4;
  const artworkStyle = inspection === "composition" || filmView ? undefined : {
    transform:"translate(" + (50 - 100 * zoom * placement.x / placement.w).toFixed(3) +
      "%, " + (50 - 100 * zoom * placement.y / placement.h).toFixed(3) +
      "%) scale(" + zoom + ")",
    transformOrigin:"top left",
  };
  const step = frame < 70 ? "Graphite construction" :
    frame < 188 ? "Cobalt and copper feather deposition" :
    frame < 255 ? "Rachis, barbs and glass-black eye" :
    "Head tilt, blink, layered wing and tail performance";
  return <main style={{ minHeight:"100vh", padding:24,
    display:"grid", alignContent:"start", gap:16, background:"#EAE5D9",
    color:"#344750", font:"15px/1.5 system-ui" }}>
    <header style={{maxWidth:920}}>
      <div style={{letterSpacing:1.8, fontSize:12, fontWeight:700, color:"#69847E"}}>
        MATERIAL-NATIVE COLOUR PENCIL / ORIGINAL WILDLIFE ART
      </div>
      <h1 style={{font:"600 34px Georgia, serif", margin:"8px 0"}}>
        The Blue Kingfisher — ArtCraft Study
      </h1>
      <p style={{margin:0,maxWidth:820}}>
        Rebuilt original kingfisher with eleven authored anatomical regions: long tapered
        beak, short crown fibres, copper breast, overlapping feather coverts, layered wings, eye, tail and
        planted feet. The old round bird and copper songbird are no longer rendered.
        All pigment remains fixed in paper coordinates during frame seeking.
      </p>
    </header>
    <section aria-label="Pencil wildlife controls"
      style={{display:"flex", flexWrap:"wrap", alignItems:"end", gap:14}}>
      <label style={label}>Aspect ratio
        <select aria-label="Wildlife aspect" value={aspect}
          onChange={e => {setPlaying(false);setAspect(e.target.value as PencilAspect);}}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={label}>Illustration details
        <select aria-label="Feather detail" value={detail}
          onChange={e=>setDetail(e.target.value as typeof detail)}>
          <option value="full">Full fibre and feather study</option>
          <option value="study">Reduced mark density</option>
        </select>
      </label>
      <label style={label}>Paper tooth · {Math.round(paperTooth*100)}%
        <input aria-label="Wildlife paper tooth" type="range" min="0" max="1" step=".05"
          value={paperTooth} onChange={e=>setTooth(Number(e.target.value))}/>
      </label>
      {!filmView && <label style={label}>Inspect at high magnification
        <select aria-label="Wildlife inspection" value={inspection}
          onChange={e=>{setPlaying(false);setInspection(e.target.value as typeof inspection);}}>
          <option value="composition">Whole composition</option>
          <option value="wing">Wing microstructure</option>
          <option value="breast">Breast plumage and paper tooth</option>
          <option value="foot">Foot and perch contact</option>
          <option value="eye">Eye and eyelid</option>
        </select>
      </label>}
      <label style={label}>Playback speed
        <select aria-label="Wildlife playback speed" value={speed}
          onChange={e=>setSpeed(Number(e.target.value))}>
          <option value={.5}>0.5×</option><option value={1}>1×</option>
          <option value={1.5}>1.5×</option><option value={2}>2×</option>
        </select>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8,minHeight:42,fontSize:14}}>
        <input type="checkbox" checked={reducedMotion}
          onChange={e=>{setReducedMotion(e.target.checked);setPlaying(false);}}/>
        Reduced motion
      </label>
    </section>
    <div style={{display:"grid",gap:9,maxWidth:960}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        <button type="button" style={button} onClick={()=>{
          if(frame>=419)setFrame(0);
          setPlaying(previous=>!previous);
        }}>{playing?"Pause":frame>=419?"Replay":"Play the film"}</button>
        {([["Construction",55],["Colour",172],["Detail",250],["Blink",278],
          ["Hold",419]] as const).map(([text,at])=>
          <button type="button" key={text} style={button} onClick={()=>{
            setPlaying(false);setFrame(at);
          }}>{text}</button>)}
      </div>
      <label style={{display:"grid",gap:6,font:"600 13px system-ui"}}>
        Frame {frame}/419 · {step}
        <input aria-label="Wildlife frame" type="range" min={0} max={419}
          value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
    </div>
    <div style={{width:aspect==="landscape"?960:540,
      height:aspect==="landscape"?540:960, maxWidth:"100%",
      overflow:"hidden", position:"relative", background:"#FAF5EC",
      boxShadow:"0 18px 46px #554E4730"}}>
      {filmView ? compiled.ok ?
        <FilmStage film={compiled.film} frame={frame}
          renderObject={()=>null} reducedMotion={reducedMotion}
          renderSlot={(content,context)=>{
            if (content.slot!=="colored-pencil-wildlife")
              throw new RangeError("Unexpected wildlife film slot");
            const offset=content.props?.offsetFrame;
            if(typeof offset!=="number" || !Number.isSafeInteger(offset))
              throw new RangeError("Invalid wildlife film offset");
            return <PencilScene scene={scene} frame={offset+context.frame}
              reducedMotion={context.reducedMotion}/>;
          }}/> :
        <pre role="alert">{compiled.diagnostics.map(x=>x.message).join("\n")}</pre> :
        <PencilScene scene={scene} frame={frame} reducedMotion={reducedMotion}
          style={artworkStyle}/>} 
    </div>
    <p style={{maxWidth:790,margin:0,fontSize:13,color:"#6D7872"}}>
      Original side-view kingfisher with anatomical fibre tracts and layered feathers,
      not copied or traced from a source artist. Inspect Wing, Breast, Foot and Eye
      at close range without altering exports.
      Posed features and pencil deposition are deterministic. Technical tests do not certify
      feature-film illustration quality; review actual exports at full resolution.
    </p>
  </main>;
}

export const IllustratedWildlife: StoryObj<typeof meta> = {
  name:"Kingfisher · ArtCraft drawing and performance",
  args:{scene:pencilWildlifeScene({aspect:"landscape"}),frame:285},
  render:()=> <WildlifeStudio/>,
};
export const FilmStageProof: StoryObj<typeof meta> = {
  name:"Kingfisher · FD1 three-shot film proof",
  args:{scene:pencilWildlifeScene({aspect:"landscape"}),frame:285},
  render:()=> <WildlifeStudio filmView/>,
};
