import {useMemo,useState} from "react";
import {compileFilm} from "../../registry/video/film-document";
import {FilmStage} from "../../registry/video/film-stage";
import {RISO_DRY_BRUSH_FILM} from "./riso-dry-brush-film";
import {renderRisoBrushFilmSlot} from "./riso-brush-film-slot";
import type {RisoAspect} from "./riso-print-demo";
import type {RisoBrushPlate} from "./riso-brush-studio";

/** RISO63 uses the real existing FD1 compositor and EXACT production
 * slot adapter; unlike a detached demo, the same JSON drives MP4 exports. */
export function RisoDryBrushFilmStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(120);
  const [plate,setPlate]=useState<RisoBrushPlate>("both");
  const [reducedMotion,setReducedMotion]=useState(false);
  const output=useMemo(()=>compileFilm(RISO_DRY_BRUSH_FILM,{outputId:aspect}),[aspect]);
  if(!output.ok)return <pre role="alert">{
    output.diagnostics.map(item=>item.path+": "+item.message).join("\n")
  }</pre>;
  const film=output.film;
  return <main data-km-riso63-film-studio="" data-km-riso63-aspect={aspect}
    data-km-riso63-frame={frame} data-km-riso63-plate={plate}
    style={{padding:20,display:"grid",gap:13,minHeight:"100vh",
      alignContent:"start",background:"#EAE0CF",
      font:"14px/1.5 system-ui,sans-serif",color:"#253F57"}}>
    <header>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:2}}>
        RISOGRAPH / RISO63 / REAL FILMSTAGE CAPTURE
      </div>
      <h1 style={{font:"700 29px Georgia,serif",margin:"5px 0"}}>
        Dry-brush currents · 10-second production film
      </h1>
      <p style={{margin:0,maxWidth:760}}>
        Actual 24 fps Film Document and its production ink-slot resolver.
        The separate source masters, pressure edges and paper-white fibre
        channels are identical to the export path, not a screenshot filter.
      </p>
    </header>
    <div data-km-riso63-film-preview=""
      style={{width:film.width,height:film.height,maxWidth:"100%",background:"#F2E9D6"}}>
      <FilmStage film={film} frame={frame} renderObject={()=>null}
        reducedMotion={reducedMotion}
        renderSlot={(content,context)=>renderRisoBrushFilmSlot(
          {...content,props:{...content.props,plate}},context
        )}/>
    </div>
    <section aria-label="RISO63 production film controls"
      style={{display:"flex",gap:13,flexWrap:"wrap",maxWidth:1000,alignItems:"end"}}>
      <label>Film output
        <select aria-label="RISO63 output aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">960 × 540 / 16:9</option>
          <option value="portrait">540 × 960 / 9:16</option>
        </select>
      </label>
      <label>Spot master (preview isolation)
        <select aria-label="RISO63 preview plate" value={plate}
          onChange={e=>setPlate(e.target.value as RisoBrushPlate)}>
          <option value="both">Both ink masters (export default)</option>
          <option value="blue">Cobalt master only</option>
          <option value="red">Vermilion master only</option>
        </select>
      </label>
      <label>Absolute film frame {frame} / 239
        <input type="range" min={0} max={239} value={frame}
          aria-label="RISO63 absolute film frame"
          onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label>
        <input type="checkbox" aria-label="RISO63 reduce motion"
          checked={reducedMotion} onChange={e=>setReducedMotion(e.target.checked)}/>
        Reduced source motion
      </label>
    </section>
    <p style={{fontSize:12,maxWidth:820}}>
      Portable file: examples/film/riso-dry-brush-native.film.json.
      The 240-frame export prints both masters; preview-only separation
      overrides do not change the portable film. No physical press proof.
    </p>
  </main>;
}
