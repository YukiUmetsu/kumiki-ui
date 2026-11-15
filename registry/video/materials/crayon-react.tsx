import { useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import { assertCrayonSgraffito, crayonConstructionWindows, crayonHash, crayonPaperHeight, crayonMarks, crayonNibPath, crayonDryNibPath, crayonProgress, crayonStrokeProgress } from "./crayon";
import type { CrayonBounds, CrayonMarkLength, CrayonNibStyle, CrayonStrokeOrder, CrayonWaxConstruction, CrayonSgraffito } from "./crayon";
import { assertCrayonRedrawOptions, crayonExposureAt, crayonExposureStrokes, crayonWaxEdgeDashes } from "./crayon-exposure";
import type { CrayonRedrawOptions } from "./crayon-exposure";
import type { CrayonVolumeGradient } from "./crayon-scene";

export type CrayonStory = "lantern" | "garden";
export type CrayonAspect = "landscape" | "portrait";
export interface CrayonStorybookProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox"> {
  frame: number;
  story?: CrayonStory;
  aspect?: CrayonAspect;
  seed?: number;
  pressure?: number;
  paperTooth?: number;
  reducedMotion?: boolean;
  /** Whether to paint lettering over the art. Auto-hide in portrait until safe-area proof exists. */
  showEditorial?: boolean;
  style?: CSSProperties;
}
export type WaxProps = {
  d: string; bounds: CrayonBounds; colors: readonly [string, string, string];
  seed: number; pressure: number; tooth: string; frame: number;
  /** Scene-level paper tooth seed shared by every crayon stroke. */
  paperSeed?:number;
  first: number; last: number; reduced: boolean; spacing?: number; angle?: number;
  construction?: CrayonWaxConstruction;
  /** Open scumble for skies/atmosphere; opaque buildup for tangible subjects. */
  coverage?: "open" | "opaque";
  /** Deterministic, spatially blurred pigment glaze underneath directional wax marks. */
  blendRadius?: number;
  /** Opacity of generic tooth marks; zero preserves blocking underpaint. */
  markStrength?: number;
  /** Surface-integrated, opaque multi-pigment underpaint, not flat vector fill. */
  underpaintGradient?:CrayonVolumeGradient;
  /** 0..1 optical paper-tooth color variation on *opaque* wax.
   * Samples page-seeded relief without making the subject transparent. */
  underpaintTooth?:number;
  /** After the drawing completes, repaint small wax daubs on discrete held exposures. */
  redraw?: CrayonRedrawOptions;
  /** Fragmented wax nib trace around the visible outline, 0..1. */
  edgeRoughness?: number;
  /** Independent intensity of the dark drawn edge; zero removes the digital
   * cartoon outline while retaining fully opaque volume and wax texture. */
  outlineOpacity?: number;
  /** After coating, remove selected top wax to show opaque buried pigment. */
  sgraffito?: CrayonSgraffito;
  /** Wax-contact profile. Rounded retains the old constant-width line. */
  nibStyle?: CrayonNibStyle;
  /** Authored stroke sequence; changes draw-in choreography, not pigment. */
  strokeOrder?: CrayonStrokeOrder;
  /** Long gestural strokes (default) or legacy small flecks. */
  markLength?: CrayonMarkLength;
  /** Opt-in drawn contact layers; smooth remains the unchanged default. */
  deposition?: "smooth" | "stroke-built";
};
export type LineProps = { d: string; color: string; width: number; frame: number; first: number; last: number; reduced: boolean; seed: number; opacity?: number };

export function WaxRegion({ d, bounds, colors, seed, paperSeed = 0, pressure, tooth, frame, first, last, reduced, spacing = 9.5, angle = 0, construction, coverage = "open", blendRadius = 0, markStrength = 1, underpaintGradient, underpaintTooth = 0,
  redraw, edgeRoughness = 0, outlineOpacity = 1, sgraffito, nibStyle = "tapered", strokeOrder = "patches", markLength = "long", deposition = "smooth" }: WaxProps) {
  if (!Number.isFinite(angle) || angle < -89 || angle > 89) throw new RangeError("crayon hatch angle must be -89..89 degrees");
  if (coverage !== "open" && coverage !== "opaque") throw new RangeError("crayon coverage must be open or opaque");
  if (underpaintGradient && (
    coverage!=="opaque" ||
    ![underpaintGradient.focusX,underpaintGradient.focusY,underpaintGradient.radius].every(Number.isFinite)||
    underpaintGradient.focusX<0||underpaintGradient.focusX>1||
    underpaintGradient.focusY<0||underpaintGradient.focusY>1||
    underpaintGradient.radius<.2||underpaintGradient.radius>1.5||
    !/^#[0-9a-fA-F]{6}$/.test(underpaintGradient.light)||
    !/^#[0-9a-fA-F]{6}$/.test(underpaintGradient.shadow)
  ))throw new RangeError("crayon underpaintGradient is invalid");
  if (!Number.isFinite(markStrength)||markStrength<0||markStrength>1)
    throw new RangeError("crayon markStrength must be 0..1");
  if (!Number.isFinite(underpaintTooth)||underpaintTooth<0||underpaintTooth>1||
    (underpaintTooth>0&&coverage!=="opaque"))
    throw new RangeError("crayon underpaintTooth must be 0..1 for opaque wax");
  if (!Number.isFinite(blendRadius)||blendRadius<0||blendRadius>18||
    (blendRadius>0&&coverage!=="open"))
    throw new RangeError("crayon blendRadius must be 0..18 for open wax");
  if (nibStyle !== "rounded" && nibStyle !== "tapered" && nibStyle !== "dry")
    throw new RangeError("crayon nib style must be rounded or tapered");
  if (strokeOrder !== "scanline" && strokeOrder !== "patches")
    throw new RangeError("crayon stroke order must be scanline or patches");
  if (markLength !== "long" && markLength !== "short")
    throw new RangeError("crayon mark length must be long or short");
  if (deposition !== "smooth" && deposition !== "stroke-built")
    throw new RangeError("crayon deposition must be smooth or stroke-built");
  const strokeBuilt = deposition === "stroke-built";
  if (!Number.isFinite(edgeRoughness) || edgeRoughness<0 || edgeRoughness>1)
    throw new RangeError("crayon edge roughness out of bounds");
  if (!Number.isFinite(outlineOpacity) || outlineOpacity<0 || outlineOpacity>1)
    throw new RangeError("crayon outline opacity must be 0..1");
  if (redraw) assertCrayonRedrawOptions(redraw);
  if (sgraffito) {
    assertCrayonSgraffito(sgraffito);
    if (coverage!=="opaque")
      throw new RangeError("Crayon sgraffito requires opaque buried pigment");
    if (sgraffito.first < last)
      throw new RangeError("Crayon sgraffito must follow wax deposition");
  }
  const windows=construction ? crayonConstructionWindows(first,last,construction) : null;
  const fillFirst=windows?.fillStart ?? first,fillLast=windows?.fillEnd ?? last;
  const outlineFirst=windows?.outlineStart ?? first,outlineLast=windows?.outlineEnd ?? last;
  const fillProgress = crayonProgress(frame,fillFirst,fillLast,0,1,reduced);
  // The one-stroke curve above completes after only 22% of the interval.
  // Dense subjects must instead follow the entire sequence of deposited wax
  // marks. Keep the historical open-scumble progression unchanged.
  const pigmentProgress = reduced ? 1 : Math.min(1,Math.max(0,
    (frame-fillFirst)/(fillLast-fillFirst)));
  const phase=!construction ? undefined : reduced || frame>=last ? "finished" :
    frame<first ? "pending" :
    construction.order==="outline-first" ? (frame < fillFirst ? "outlining":"pigment") :
      (frame < outlineFirst ? "pigment":"outlining");
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  const size = angle === 0 ? 0 : Math.ceil(Math.hypot(bounds.width,bounds.height));
  const drawBounds = angle === 0 ? bounds : {x:cx-size/2,y:cy-size/2,width:size,height:size};
  const raw = useId(), clip = "waxclip-" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const pores = clip + "-tooth";
  const deposit = clip + "-deposit";
  const blendId = clip + "-soft-glaze";
  const volumeId=clip+"-volume";
  const darkToothMask=clip+"-undercoat-dark";
  const lightToothMask=clip+"-undercoat-light";
  // Physical stroke-built artwork has a flat buried wax body (never see-through)
  // with value carried by overlaid pigment. Avoid glossy airbrush gradients.
  const underpaintFill=strokeBuilt ? colors[0]
    : underpaintGradient ? "url(#"+volumeId+")" : colors[0];
  // Contact pressure changes the opacity of raised paper-grain interruptions.
  // This remains a detail mask for the wax layer, never for opaque underpaint.
  const reliefContact = Number((.26 + (1-pressure)*.67).toFixed(4));
  const scrapeReveal=sgraffito
    ? crayonProgress(frame,sgraffito.first,sgraffito.last,0,1,reduced)
    : 0;
  const marks = useMemo(() => crayonMarks(drawBounds, { seed, pressure, spacing, passes: 2, strokeOrder, markLength }),
    [drawBounds.x, drawBounds.y, drawBounds.width, drawBounds.height, seed, pressure, spacing, strokeOrder, markLength]);
  // Stable painted paper / silhouette; the small reworked pigment strokes are
  // the only parts that redraw on held exposures. No mutable frame history.
  // Only the first layer of authored wax strokes drives the dense undercoat
  // while the drawing is still in progress. Do not reveal it with a vertical
  // rectangle: pigment arrives where the crayon nib actually traveled.
  const depositMarks = useMemo(() => marks.slice(0, Math.ceil(marks.length / 2)), [marks]);
  // Dry-contact fragments are computed only for requested dry wax art.
  // Legacy tapered/rounded scenes pay no extra allocation or SVG cost.
  const dryMarks=useMemo(()=>nibStyle==="dry"
    ? marks.map(mark=>crayonDryNibPath(mark,1,strokeBuilt?"hand":"legacy",paperSeed)):[],
    [marks,nibStyle,strokeBuilt,paperSeed]);
  // Cross-grain gestures are deterministic per source region, not per frame.
  const crossAngle=strokeBuilt
    ? (crayonHash(seed,7,1921)<.5 ? -1 : 1)*(9+crayonHash(seed,8,1922)*11)
    : 0;
  const waxStrength=strokeBuilt ? Math.min(1,markStrength*1.22) : markStrength;
  // The final very thin leveling pass closes tooth gaps gradually; the completed
  // silhouette is solid and never permits background objects to ghost through.
  const settlingCoat = pigmentProgress > .82 && pigmentProgress < 1
    ? (pigmentProgress - .82) / .18 : 0;
  const exposure=redraw ? crayonExposureAt(frame,last,redraw,reduced) : 0;
  const exposureStrength=redraw && (reduced||frame>=(redraw.beginFrame??last)) ? redraw.strength : 0;
  const redrawStrokes=useMemo(()=>crayonExposureStrokes(bounds,seed,exposure,exposureStrength),
    [bounds.x,bounds.y,bounds.width,bounds.height,seed,exposure,exposureStrength]);
  const rimDashes=useMemo(()=>edgeRoughness>0 ? crayonWaxEdgeDashes(seed,edgeRoughness) : "",
    [seed,edgeRoughness]);
  return <g data-km-crayon-region="" data-km-crayon-seed={seed} data-km-crayon-build={phase}
    data-km-crayon-coverage={coverage}
    data-km-crayon-deposition={deposition}
    data-km-crayon-exposure={redraw ? exposure : undefined}
    data-km-crayon-stroke-order={strokeOrder}
    data-km-crayon-mark-length={markLength}
    data-km-crayon-outline-opacity={outlineOpacity}
    data-km-crayon-mark-strength={markStrength}
    data-km-crayon-underpaint-tooth={underpaintTooth>0?underpaintTooth:undefined}>
    <defs>
      <clipPath id={clip}><path d={d}/></clipPath>
      {underpaintGradient && !strokeBuilt && <radialGradient id={volumeId}
        cx={(100*underpaintGradient.focusX).toFixed(2)+"%"}
        cy={(100*underpaintGradient.focusY).toFixed(2)+"%"}
        r={(100*underpaintGradient.radius).toFixed(2)+"%"}
        gradientUnits="objectBoundingBox"
        data-km-crayon-underpaint-gradient="">
        <stop offset="0%" stopColor={underpaintGradient.light}/>
        <stop offset="48%" stopColor={colors[0]}/>
        <stop offset="100%" stopColor={underpaintGradient.shadow}/>
      </radialGradient>}
      {coverage==="opaque"&&underpaintTooth>0&&(["dark","light"] as const).map((kind)=>(
        <mask key={kind} id={kind==="dark"?darkToothMask:lightToothMask}
          maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
          x={bounds.x-25} y={bounds.y-25}
          width={bounds.width+50} height={bounds.height+50}>
          <rect x={bounds.x-25} y={bounds.y-25}
            width={bounds.width+50} height={bounds.height+50}
            fill={"url(#"+tooth+"-pigment-"+kind+")"}/>
        </mask>
      ))}
      {blendRadius>0 && <filter id={blendId} filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
        x={bounds.x-3*blendRadius} y={bounds.y-3*blendRadius}
        width={bounds.width+6*blendRadius} height={bounds.height+6*blendRadius}>
        <feGaussianBlur stdDeviation={blendRadius} />
      </filter>}
      {coverage==="opaque" && pigmentProgress>0 && pigmentProgress<1 && <mask id={deposit}
        data-km-crayon-deposit-mask="" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
        x={bounds.x-25} y={bounds.y-25} width={bounds.width+50} height={bounds.height+50}>
        <rect x={bounds.x-25} y={bounds.y-25}
          width={bounds.width+50} height={bounds.height+50} fill="#000"/>
        <g fill="none" stroke="#fff" strokeLinecap="round"
          transform={angle ? "rotate(" + angle + " " + cx + " " + cy + ")" : undefined}>
          {depositMarks.map((mark,i)=>{
            const progress=crayonStrokeProgress(frame,fillFirst,fillLast,i,depositMarks.length,strokeOrder,reduced);
            return progress<=0 ? null : <path key={i} d={mark.d} pathLength={100}
              strokeWidth={Math.max(spacing*1.15, mark.width*1.7)}
              strokeDasharray={100} strokeDashoffset={100*(1-progress)}/>;
          })}
        </g>
      </mask>}
      <mask id={pores} maskUnits="userSpaceOnUse"
        x={bounds.x - 25} y={bounds.y - 25} width={bounds.width + 50} height={bounds.height + 50}>
        <rect x={bounds.x - 25} y={bounds.y - 25}
          width={bounds.width + 50} height={bounds.height + 50}
          fill={"url(#" + tooth + "-texture)"} />
        {/* Same paper coordinates for every overlapping wax layer. Dark ridges
            interrupt light contact more strongly; heavy wax fills the tooth. */}
        <rect x={bounds.x - 25} y={bounds.y - 25}
          width={bounds.width + 50} height={bounds.height + 50}
          fill={"url(#" + tooth + "-relief)"} opacity={reliefContact}
          data-km-crayon-paper-contact={reliefContact} />
        {/* True sgraffito subtracts from the *top* pigmented wax layer
            through its own tooth mask. The separate opaque undercoat is
            deliberately outside this mask, so scraping exposes buried wax
            rather than cutting an alpha hole through the character. */}
        {sgraffito && scrapeReveal>0 && <path d={sgraffito.d}
          fill="none" stroke="#000" strokeWidth={sgraffito.width}
          strokeLinecap="round" strokeLinejoin="round"
          pathLength={100} strokeDasharray={100}
          strokeDashoffset={100*(1-scrapeReveal)}
          data-km-crayon-sgraffito="subtractive"
          data-km-crayon-scrape-progress={scrapeReveal} />}
      </mask>
    </defs>
    {/* Solid underpainting is deposited BEFORE rough wax layers but OUTSIDE the
        tooth mask. Paper/tooth breaks the pigmented highlights, never punches
        transparent holes through a finished character or foreground prop. */}
    {coverage==="opaque" && pigmentProgress>0 && <>
      <path d={d} fill={underpaintFill} clipPath={"url(#"+clip+")"}
        mask={pigmentProgress<1 ? "url(#"+deposit+")" : undefined}
        data-km-crayon-underpaint="opaque" />
      {settlingCoat>0 && <path d={d} fill={underpaintFill}
        opacity={settlingCoat} clipPath={"url(#"+clip+")"}
        data-km-crayon-settling-coat="" />}
      {/* Luminance-masked pigment shows undercoat paper-contact variation
          without cutting see-through holes in the solid wax mass.
          The same deposit mask preserves exact partial drawing coverage. */}
      {underpaintTooth>0 && <g clipPath={"url(#"+clip+")"}
        mask={pigmentProgress<1?"url(#"+deposit+")":undefined}
        data-km-crayon-underpaint-grain="">
        <path d={d} fill={colors[1]} mask={"url(#"+darkToothMask+")"}
          opacity={underpaintTooth*(strokeBuilt?.54+.24*(1-pressure):.28+.16*(1-pressure))}
          data-km-crayon-undercoat-pits="" />
        <path d={d} fill={colors[2]} mask={"url(#"+lightToothMask+")"}
          opacity={underpaintTooth*(strokeBuilt?.46+.2*(1-pressure):.32+.17*(1-pressure))}
          data-km-crayon-undercoat-ridges="" />
      </g>}
    </>}
    {/* The rubbed-over skin tone is feathered before local tooth strokes.
        Parent clipping in CrayonScene prevents any blur from escaping a face. */}
    {coverage==="open" && blendRadius>0 && fillProgress>0 &&
      <path d={d} fill={colors[0]}
        opacity={fillProgress*(construction?.glaze??.58)*(strokeBuilt?.36:1)}
        filter={"url(#"+blendId+")"}
        data-km-crayon-soft-glaze={strokeBuilt?undefined:blendRadius} />}
    <g clipPath={"url(#" + clip + ")"} mask={"url(#" + pores + ")"} data-km-crayon-wax="">
      {coverage==="open" && blendRadius===0 && <path d={d} fill={colors[0]}
        opacity={fillProgress*(construction?.glaze??.58)*(strokeBuilt?.22:1)} />}
      {coverage==="opaque" && <path d={d} fill={colors[2]}
        opacity={pigmentProgress*.09}/>}

      <g transform={angle ? "rotate(" + angle + " " + cx + " " + cy + ")" : undefined}>
      {marks.map((mark, i) => {
        const progress = crayonStrokeProgress(frame, fillFirst, fillLast, i, marks.length, strokeOrder, reduced);
        if (progress <= 0) return null;
        // The second rubbed pass turns around the local contact centroid.
        // No global camera changes, moving flecks or tile-wide strokes.
        const arc=mark.nibArcs[0];
        // Exposed pale wax is a rare, light-pressure edge catch, never
        // bright chalk-like bars uniformly stamped over the skin.
        const pigmentContact=waxStrength*(strokeBuilt&&mark.tone===2?.4:1);
        const secondPass=strokeBuilt && mark.index>=marks.length/2;
        const pivot=arc ? [(arc[0]+arc[4])/2,(arc[1]+arc[5])/2] : [cx,cy];
        const turn=secondPass ? "rotate("+crossAngle.toFixed(2)+" "+
          pivot[0].toFixed(2)+" "+pivot[1].toFixed(2)+")" : undefined;
        return <g key={i} fill="none" strokeLinecap="round" transform={turn}
          data-km-crayon-cross-contact={secondPass?"second":undefined}>
          {nibStyle==="dry" ? <g data-km-crayon-nib="dry">
            {/* A weak wide under-rub holds the colored contact together,
                while disjoint pressure-shaped ribbons catch paper ridges. */}
            <path d={progress>=1?mark.nibD:crayonNibPath(mark,progress)}
              fill={colors[mark.tone]}
              opacity={pigmentContact*(strokeBuilt?.29+.15*mark.pressure:
                coverage==="opaque"?.10+.13*mark.pressure:.06+.10*mark.pressure)}
              data-km-crayon-dry-binder="" />
            <path d={progress>=1?dryMarks[i]:crayonDryNibPath(mark,progress,
                strokeBuilt?"hand":"legacy",paperSeed)}
              fill={colors[mark.tone]}
              opacity={pigmentContact*(strokeBuilt?.49+.23*mark.pressure:
                coverage==="opaque"?.48+.38*mark.pressure:.37+.29*mark.pressure)}
              data-km-crayon-dry-ribbons="" />
          </g> : nibStyle==="tapered" ?
            <path d={progress>=1 ? mark.nibD : crayonNibPath(mark, progress)} fill={colors[mark.tone]}
              data-km-crayon-nib="tapered"
              opacity={markStrength*(coverage==="opaque" ? .32+mark.pressure*.34 : .2+mark.pressure*.24)} /> :
            <path d={mark.d} pathLength={100} stroke={colors[mark.tone]} strokeWidth={mark.width}
              strokeDasharray={100} strokeDashoffset={100 * (1 - progress)}
              data-km-crayon-nib="rounded"
              opacity={markStrength*(coverage==="opaque" ? .32+mark.pressure*.34 : .2+mark.pressure*.24)} />}
          {progress > .8 && <path d={mark.scumble} stroke={colors[(mark.tone + 1) % 3]}
            strokeWidth={1.3 + mark.pressure * 2.3}
            opacity={markStrength*(nibStyle==="dry"?.17:coverage==="opaque"?.41:.31)} />}
          {progress >= 1 && nibStyle!=="dry" && <path d={mark.scrape} stroke="#faefd6"
            strokeWidth={.6 + (1 - mark.pressure) * 1.4} opacity={markStrength*.29} />}
        </g>;
      })}
      </g>
      {redrawStrokes.length>0 && <g
        transform={angle ? "rotate("+angle+" "+cx+" "+cy+")" : undefined}
        fill="none" strokeLinecap="round" data-km-crayon-repaint="">
        {redrawStrokes.map((stroke,i)=><path key={i} d={stroke.d}
          stroke={colors[i%3===0?1:2]} strokeWidth={stroke.width}
          opacity={stroke.opacity}/>)}
      </g>}
    </g>
    {coverage==="opaque" && edgeRoughness>0 && pigmentProgress>=1 &&
      <g pointerEvents="none" fill="none" strokeLinejoin="round"
        strokeLinecap="round" data-km-crayon-frayed-rim="">
        <path d={d} stroke={colors[1]} strokeWidth={.65+edgeRoughness*.65}
          strokeDasharray={rimDashes} opacity={.26+edgeRoughness*.33}
          transform="translate(.7 -.5)"/>
        <path d={d} stroke={colors[2]} strokeWidth={.45+edgeRoughness*.65}
          strokeDasharray={rimDashes} strokeDashoffset="13"
          opacity={.22+edgeRoughness*.32} transform="translate(-.65 .7)"/>
      </g>}
    {construction ? <WaxLine d={d} color={colors[1]} width={2.5+pressure*1.5}
      seed={seed+919} opacity={.65*outlineOpacity} frame={frame} first={outlineFirst} last={outlineLast}
      reduced={reduced} /> :
      <path d={d} fill="none" stroke={colors[1]} strokeWidth={2.5 + pressure * 1.5}
        strokeLinecap="round" strokeLinejoin="round"
        opacity={.38 * outlineOpacity * crayonProgress(frame, first, last, 0, 1, reduced)} />}
  
  </g>;
}

/** Dry double-edged wax lines, not a generic smooth SVG path. */
export function WaxLine({ d, color, width, frame, first, last, reduced, seed, opacity = 1 }: LineProps) {
  const reveal = crayonProgress(frame, first, last, 0, 1, reduced);
  if (reveal <= 0) return null;
  const wiggle = (crayonHash(seed, 9) - .5) * 2;
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} data-km-crayon-line="">
    <path d={d} pathLength={100} stroke={color} strokeWidth={width * 1.55} opacity=".22"
      strokeDasharray={100} strokeDashoffset={100 * (1 - reveal)} />
    <path d={d} pathLength={100} stroke={color} strokeWidth={width}
      strokeDasharray={100} strokeDashoffset={100 * (1 - reveal)} />
    <path d={d} pathLength={100} stroke="#fff2d7" strokeWidth={Math.max(.35, width * .17)}
      strokeDasharray={100} strokeDashoffset={100 * (1 - reveal)} opacity={.14 + wiggle * .08} />
  </g>;
}
export function Paper({ width, height, seed, tooth, strength, color = "#faf1da", pigmentRelief = false, handContact = false }: {
  width: number; height: number; seed: number; tooth: string;
  strength: number; color?: string; pigmentRelief?: boolean;
  /** Denser peak-caught wax clumps; defaults off for all legacy films. */
  handContact?:boolean;
}) {
  const fibers = useMemo(() => Array.from({ length: 480 }, (_, i) => ({
    x: crayonHash(seed, i, 1) * width, y: crayonHash(seed, i, 2) * height,
    dx: 1 + crayonHash(seed, i, 3) * 14, dy: (crayonHash(seed, i, 4) - .5) * 4,
    r: .4 + crayonHash(seed, i, 5) * 1.4,
  })), [seed, width, height]);
  // A finite repeat tile shared by all strokes and surfaces. These asymmetric
  // ridge fragments are seeded on the paper, not on the moving actor. Sampling
  // is invariant to frame, camera, aspect and to the number of wax elements.
  const relief = useMemo(() => Array.from({length:164},(_,i)=>({
    x:crayonHash(seed, i, 101)*144,
    y:crayonHash(seed, i, 102)*144,
    dx:1.1+crayonHash(seed, i, 103)*5.7,
    dy:(crayonHash(seed, i, 104)-.5)*3.4,
    width:.45+crayonHash(seed, i, 105)*1.55,
    depth:.55+crayonHash(seed, i, 106)*.45,
  })),[seed]);
  // Paper ridges are shared by every wax region, so independently painted
  // parts don't receive unrelated stochastic texture. The dark and light
  // cohorts occupy separate paper-contact islands and never cut alpha holes.
  // Batch subpixel-scale paper tooth into six SVG compound paths.
  // Rendering legacy scenes adds six small pattern paths rather than hundreds
  // of per-mark DOM elements. Geometry is fixed to paper seed and strength.
  const pigmentTexture=useMemo(()=>(
    pigmentRelief ? (["dark","light"] as const).map(kind=>{
      const dark=kind==="dark",total=Math.round(strength*(handContact?
        (dark?2900:2500):(dark?860:650)));
      const marks:[string[],string[],string[]]=[[],[],[]];
      const base=dark?1400:1500;
      for(let i=0;i<total;i++){
        const band=Math.floor(crayonHash(seed,i,base+7)*3);
        const x=crayonHash(seed,i,base+1)*176;
        const y=crayonHash(seed,i,base+2)*176;
        // Shared paper height controls where clumped wax can stick. These
        // are actual colored deposits, not a photographic noise overlay.
        const h=handContact?crayonPaperHeight(x,y,seed):.5;
        if(handContact&&(dark?h<.33:h>.67))continue;
        const dx=(dark ? .35 : .25)+crayonHash(seed,i,base+3)*
          (handContact?(dark?2.35:1.8):(dark?1.85:1.25));
        const dy=(crayonHash(seed,i,base+4)-.5)*
          (handContact?(dark?2.1:1.55):(dark?1.6:1.05));
        marks[band].push("M"+x.toFixed(2)+" "+y.toFixed(2)+
          "l"+dx.toFixed(2)+" "+dy.toFixed(2));
      }
      return {kind,paths:marks.map((parts,band)=>({
        d:parts.join(" "),
        width:handContact?
          (dark?.39:.30)+band*(dark?.23:.20):
          (dark?.31:.24)+band*(dark?.17:.14),
        opacity:handContact?.65+band*.12:.50+band*.17,
      }))};
    }) : []
  ),[seed,strength,pigmentRelief,handContact]);
  return <>
    <defs>
      {pigmentTexture.map(({kind,paths})=><pattern key={kind}
        id={tooth+"-pigment-"+kind} width={176} height={176}
        patternUnits="userSpaceOnUse" data-km-crayon-pigment-paper={kind}>
        <rect width={176} height={176} fill="#000"/>
        <g fill="none" stroke="#fff" strokeLinecap="round">
          {paths.map((f,i)=>f.d&&<path key={i} d={f.d}
            opacity={f.opacity} strokeWidth={f.width}/>)}
        </g>
      </pattern>)}
      <pattern id={tooth + "-relief"} width={144} height={144}
        patternUnits="userSpaceOnUse" data-km-crayon-paper-relief="">
        {/* Transparent outside dark contact-resistant ridges. No bright dots
            are painted on top of a finished character or scene. */}
        <g stroke="#151619" fill="none" strokeLinecap="round">
          {relief.slice(0,Math.round(strength*164)).map((f,i)=>
            <path key={i} d={"M"+f.x.toFixed(2)+" "+f.y.toFixed(2)+
              "l"+f.dx.toFixed(2)+" "+f.dy.toFixed(2)}
              opacity={f.depth} strokeWidth={f.width} />)}
        </g>
      </pattern>
      <pattern id={tooth + "-texture"} width={144} height={144} patternUnits="userSpaceOnUse">
        <rect width={144} height={144} fill="#fff"/>
        {/* Small, translucent tooth interruptions, not bright white digital confetti. */}
        {fibers.slice(0, Math.round(strength * 54)).map((f,i) => <g key={i} stroke="#757575" fill="#858585" strokeLinecap="round">
          <path d={"M" + (f.x % 144) + " " + (f.y % 144) + " l" + (f.dx * .29) + " " + (f.dy * .45)}
            strokeWidth={f.r * (.22 + strength*.33)} />
          <circle cx={(f.x + 59) % 144} cy={(f.y + 43) % 144} r={f.r * strength * .44} />
        </g>)}
      </pattern>

    </defs>
    <rect width={width} height={height} fill={color} />
    <g stroke="#b99572" strokeWidth=".6" pointerEvents="none" opacity=".42" data-km-crayon-paper="">
      {fibers.map((f, i) => <path key={i} opacity={.2 + crayonHash(seed, i, 6) * .42}
        d={"M" + f.x + " " + f.y + " l" + f.dx + " " + f.dy} />)}
    </g>
  </>;
}
function Starfield({ width, height, seed, frame, reduced, day }: { width: number; height: number; seed: number; frame: number; reduced: boolean; day: boolean }) {
  const stars = useMemo(() => Array.from({ length: day ? 6 : 26 }, (_, i) => ({
    x: 26 + crayonHash(seed + 30, i, 1) * (width - 52),
    y: 25 + crayonHash(seed + 30, i, 2) * height * .53,
    r: 1.8 + crayonHash(seed + 30, i, 3) * 4.3,
  })), [width, height, seed, day]);
  return <g aria-hidden="true">
    {stars.map((p, i) => <g key={i} opacity={crayonProgress(frame, 55, 148, i, stars.length, reduced) * (day ? .20 : .7)}
      stroke={day ? "#fff3d4" : "#fff1b9"} strokeLinecap="round" fill="none">
      <path d={"M" + (p.x - p.r) + " " + p.y + " l" + (p.r * 2) + " 0 M" + p.x + " " + (p.y - p.r) + " v" + (p.r * 2)} strokeWidth={i % 3 === 0 ? 2 : 1.2}/>
      {i % 5 === 0 && <circle cx={p.x} cy={p.y} r={p.r * 1.8} strokeWidth=".8" strokeDasharray="4 6" />}
    </g>)}
  </g>;
}
function Pine({ x, y, scale, seed, frame, tooth, reduced }: { x: number; y: number; scale: number; seed: number; frame: number; tooth: string; reduced: boolean }) {
  const crown = "M0 -150 C-20 -113 -36 -90 -54 -59 L-37 -62 C-54 -29 -69 -4 -81 17 L-46 6 C-66 31 -74 47 -81 64 Q-1 46 74 63 L43 11 L66 17 L29 -61 L43 -56 Z";
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"}>
    <WaxRegion coverage="opaque" d="M-12 20H12V98H-12Z" bounds={{ x: -12, y: 20, width: 24, height: 80 }} colors={["#795b59", "#4b445d", "#a16f61"]} seed={seed+30} pressure={.76} tooth={tooth} frame={frame} first={130} last={230} reduced={reduced} spacing={6}/>
    <WaxRegion coverage="opaque" d={crown} bounds={{ x: -85, y: -155, width: 170, height: 223 }} colors={["#264d5b", "#213f4f", "#4f7470"]} seed={seed+31} pressure={.85} tooth={tooth} frame={frame} first={105} last={231} reduced={reduced} />
    <WaxLine d="M-22 -80 Q-45 -35 -54 12 M18 -113 Q34 -55 43 5" color="#8ab3a0"
      width={3} seed={seed} frame={frame} first={200} last={243} reduced={reduced} opacity={.58}/>
  </g>;
}
function Fox({ x, y, scale, seed, frame, tooth, reduced }: { x: number; y: number; scale: number; seed: number; frame: number; tooth: string; reduced: boolean }) {
  const orange: [string,string,string] = ["#d87858", "#b85a51", "#f7ad69"];
  const pale: [string,string,string] = ["#f6d1a0", "#fff1d0", "#dbb690"];
  const dark: [string,string,string] = ["#445361", "#344456", "#68748a"];
  const part = (d: string, bounds: CrayonBounds, colors: [string,string,string], id: number, first: number, last: number, spacing = 8.5) =>
    <WaxRegion coverage="opaque" key={id} d={d} bounds={bounds} colors={colors} seed={seed + id * 11} pressure={.87} tooth={tooth} frame={frame} first={first} last={last} reduced={reduced} spacing={spacing}
      redraw={{holdFrames:3,strength:.56,beginFrame:265}} edgeRoughness={.57}/>;
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"} data-km-crayon-fox="">
    {/* The tail is laid down first, under the body. Every painted region is real wax strokes. */}
    {part("M-81 -4 C-138 -83 -224 -66 -216 -12 C-213 53 -160 73 -109 38 Q-118 15 -81 -4Z", {x:-224,y:-87,width:158,height:164}, orange, 1, 178, 260)}
    {part("M-182 -43 Q-224 -55 -216 -12 Q-211 30 -175 50 Q-192 12 -182 -43Z", {x:-226,y:-61,width:63,height:122}, pale, 2, 195, 270)}
    {part("M-107 -15 C-66 -65 18 -59 49 -18 Q85 34 37 62 Q-40 91 -104 55 Q-129 29 -107 -15Z", {x:-133,y:-67,width:215,height:158}, orange, 3, 205, 296)}
    {part("M-85 49 Q-54 56 -44 58 L-49 87 Q-64 96 -86 84Z", {x:-90,y:48,width:52,height:52}, dark, 4, 243, 307, 6)}
    {part("M15 48 L48 44 Q56 63 47 88 Q26 94 13 80Z", {x:9,y:42,width:48,height:56}, dark, 5, 243, 307, 6)}
    {part("M29 -75 L26 -146 Q51 -145 78 -100 L101 -149 Q132 -143 136 -85 Q162 -52 146 -17 Q122 22 68 18 Q22 9 17 -34 Q9 -52 29 -75Z",
      {x:4,y:-157,width:164,height:184}, orange, 6, 236, 318)}
    {part("M36 -135 Q50 -128 62 -100 L42 -102Z M107 -139 Q123 -126 124 -100 L105 -103Z",
      {x:30,y:-143,width:106,height:48}, pale, 7, 246, 310, 5)}
    {part("M35 -25 Q65 -2 91 0 Q119 -6 142 -37 Q158 -12 134 15 Q95 41 49 19Z",
      {x:32,y:-42,width:125,height:91}, pale, 8, 262, 332)}
    <WaxLine d="M68 -60 Q83 -65 91 -60" color="#394358" width={4} frame={frame} first={285} last={330} reduced={reduced} seed={seed+23}/>
    <circle cx={122} cy={-56} r={5.5} fill="#293a50" opacity={crayonProgress(frame, 300, 333, 0, 1, reduced)}/>
    <circle cx={124} cy={-58} r={1.7} fill="#fff4d7" opacity={crayonProgress(frame, 300, 333, 0, 1, reduced)}/>
    <WaxLine d="M134 -31 Q148 -26 159 -38" color="#504153" width={3.1} frame={frame} first={312} last={349} reduced={reduced} seed={seed+25}/>
    <circle cx={154} cy={-39} r={5.3} fill="#4d4150" opacity={crayonProgress(frame, 310, 345, 0, 1, reduced)}/>
    {/* Layered neckerchief and irregular hatching distinguish an illustrated character from a flat icon. */}
    {part("M26 8 Q61 33 105 17 L97 45 Q73 56 46 42 L24 63 L25 41Z",
      {x:18,y:4,width:92,height:65},["#567e99","#315f83","#89abc3"],10,279,357,5)}
    <WaxLine d="M33 33 Q60 46 92 32 M39 42 L21 62" color="#d5dcc8" width={1.7}
      frame={frame} first={314} last={367} reduced={reduced} seed={seed+52} opacity={.72}/>
    <WaxLine d="M49 -47 l-12 -5 M55 -35 l-16 -1 M48 0 l-16 2 M16 -12 l-13 -5"
      color="#f6d8ae" width={2.1} frame={frame} first={291} last={372}
      reduced={reduced} seed={seed+53} opacity={.65}/>
    {/* A loose hand-drawn lantern, never a blur bloom. The rings and lines reveal as crayon marks. */}
    <WaxLine d="M157 -36 Q181 -51 199 -19 L197 6" color="#9a6647" width={4} frame={frame} first={315} last={355} reduced={reduced} seed={seed+29}/>
    {part("M174 3 L220 3 L213 58 Q197 70 180 56Z", {x:173,y:2,width:50,height:70},
      ["#eab758","#f9dc83","#f5b560"], 9, 315, 393, 5.8)}
    <WaxLine d="M173 3 Q196 -6 220 3 M178 57 Q197 69 215 56 M194 2 L194 59" color="#865b5b"
      width={3.1} frame={frame} first={333} last={395} reduced={reduced} seed={seed+30}/>
    {[-55,-28,0,28,55].map((a,i) => <g key={a} transform={"translate(195 29) rotate(" + a + ")"}>
      <WaxLine d="M0 -48 L0 -71" color="#f9d87e" width={i % 2 ? 3 : 4.2} frame={frame}
        first={345+i*3} last={411} reduced={reduced} seed={seed+31+i} opacity={.81}/>
    </g>)}
  </g>;
}
function Bloom({ x,y,scale,seed,frame,tooth,reduced }: { x:number;y:number;scale:number;seed:number;frame:number;tooth:string;reduced:boolean }) {
  const petals = Array.from({length:9}, (_,i)=>i);
  const blossom = "M0 -10 Q-28 -48 -15 -89 Q0 -109 15 -89 Q29 -49 0 -10Z";
  const petalsColor: [string,string,string] = ["#f0a6a8", "#d77594", "#fbd3a8"];
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"} data-km-crayon-bloom="">
    <WaxLine d="M0 -2 Q-17 66 10 140" color="#37776e" width={8} seed={seed} frame={frame} first={166} last={250} reduced={reduced}/>
    <WaxRegion coverage="opaque" d="M-9 76 Q-76 20 -94 64 Q-45 119 -9 95Z" bounds={{x:-98,y:16,width:96,height:106}}
      colors={["#609979","#3d8076","#a1bf83"]} seed={seed+2} pressure={.81} tooth={tooth} frame={frame} first={183} last={280} reduced={reduced}/>
    <WaxRegion coverage="opaque" d="M4 95 Q62 28 96 71 Q48 119 7 110Z" bounds={{x:0,y:27,width:104,height:104}}
      colors={["#609979","#3d8076","#a1bf83"]} seed={seed+3} pressure={.81} tooth={tooth} frame={frame} first={192} last={283} reduced={reduced}/>
    {petals.map((i) => <g key={i} transform={"rotate(" + (i*40 + (crayonHash(seed,i,88)-.5)*12).toFixed(2) + ") scale(" + (0.87+crayonHash(seed,i,89)*.23).toFixed(3) + " " + (0.88+crayonHash(seed,i,90)*.26).toFixed(3) + ")"}>
      <WaxRegion coverage="opaque" d={blossom} bounds={{x:-29,y:-111,width:58,height:103}} colors={petalsColor}
        seed={seed+10+i*3} pressure={.76} tooth={tooth} frame={frame} first={205+i*2} last={319} reduced={reduced} spacing={6}/>
    </g>)}
    {petals.map(i=><g key={"vein-"+i} transform={"rotate("+(i*40+(crayonHash(seed,i,88)-.5)*12).toFixed(2)+") scale("+(0.87+crayonHash(seed,i,89)*.23).toFixed(3)+" "+(0.88+crayonHash(seed,i,90)*.26).toFixed(3)+")"}>
      <WaxLine d="M0 -31 Q-4 -58 0 -88 M-5 -52 L-14 -62 M5 -66 L13 -75"
        color="#fff0ca" width={1.7} seed={seed+i+62}
        frame={frame} first={295+i*2} last={382} reduced={reduced} opacity={.6}/>
    </g>)}
    <WaxRegion coverage="opaque" d="M-28 0 A28 28 0 1 0 28 0 A28 28 0 1 0 -28 0Z"
      bounds={{x:-30,y:-29,width:60,height:60}} colors={["#9f7159","#6e555b","#d7a36d"]}
      seed={seed+40} pressure={.93} tooth={tooth} frame={frame} first={266} last={354} reduced={reduced} spacing={5}/>
    {Array.from({length:11},(_,i)=> {
      const a = i * 2.4, r = 7 + i * 1.4;
      return <circle key={i} cx={Math.cos(a)*r} cy={Math.sin(a)*r} r="2.1" fill="#e8bb7e"
        opacity={crayonProgress(frame,292,375,i,11,reduced)}/>;
    })}
  </g>;
}
/** Hand-sketch details make wide negative space feel worked, without synthetic noise. */
function MeadowDetails({width,height,seed,frame,reduced,day}:{
  width:number;height:number;seed:number;frame:number;reduced:boolean;day:boolean;
}){
  const blades=Array.from({length:28},(_,i)=>{
    const x=22+crayonHash(seed,i,70)*(width-44);
    const y=height*(.77+crayonHash(seed,i,71)*.19);
    const length=8+crayonHash(seed,i,72)*16;
    const tilt=(crayonHash(seed,i,73)-.5)*12;
    return {x,y,length,tilt};
  });
  return <g data-km-crayon-meadow="" aria-hidden="true">
    {blades.map((b,i)=><WaxLine key={i} d={`M${b.x.toFixed(1)} ${b.y.toFixed(1)} q${b.tilt.toFixed(1)} -${(b.length*.7).toFixed(1)} ${b.tilt.toFixed(1)} -${b.length.toFixed(1)}`}
      color={day?"#517967":"#aec3a2"} width={1.2+(i%3)*.6} seed={seed+i}
      frame={frame} first={285+i*2} last={406} reduced={reduced} opacity={day ? .55 : .42}/>)}
    {Array.from({length:13},(_,i)=>{
      const x=30+crayonHash(seed,i,74)*(width-60);
      const y=height*(.72+crayonHash(seed,i,75)*.25);
      const visibility=crayonProgress(frame,330,419,i,13,reduced);
      return <g key={i} fill={day?"#f8d2ac":"#f6dd9d"} opacity={visibility*.75}>
        <circle cx={x} cy={y} r={1.4+(i%3)*.7}/>
        <path d={`M${x-4} ${y}h8M${x} ${y-4}v8`} stroke={day?"#d99a7e":"#f6dd9d"}
          strokeWidth=".9" strokeLinecap="round"/>
      </g>;
    })}
  </g>;
}
function StoryTitle({ width, height, portrait, day, frame, reduced }: { width:number;height:number;portrait:boolean;day:boolean;frame:number;reduced:boolean }) {
  const title = day ? (portrait ? ["ONE", "LITTLE", "SEED"] : ["ONE LITTLE", "SEED"]) : (portrait ? ["FOLLOW", "THE", "GLOW"] : ["FOLLOW", "THE GLOW"]);
  const x = portrait ? 34 : 52;
  const y = portrait ? 112 : 118;
  const ink = day ? "#34455b" : "#fbefcd";
  const titleSize = portrait ? 64 : 74;
  return <g fill={ink} opacity={crayonProgress(frame,60,110,0,1,reduced)} data-km-crayon-title="">
    <text x={x} y={portrait ? 51 : 50} fontFamily="Georgia, 'Times New Roman', serif" fontSize={portrait ? 15 : 16}
      fontWeight="700" letterSpacing={3}>TINY TALES   /   {day ? "02" : "01"}</text>
    <path d={"M" + x + " " + (portrait ? 65 : 64) + " H" + (portrait ? 255 : 404)}
      fill="none" stroke={ink} opacity=".65" strokeWidth="1.6"/>
    {title.map((line,i)=><text key={i} x={x} y={y + i * (portrait ? 72 : 79)}
      fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700"
      fontSize={titleSize} letterSpacing={-2.3}>{line}</text>)}
    <text x={x+3} y={y + title.length * (portrait ? 72 : 79) + 16} fontFamily="Georgia,serif"
      fontSize={portrait ? 20 : 23} fontStyle="italic" opacity=".88">{day ? "A pocketful of beginnings." : "A little light for the long way home."}</text>
    {!portrait && <text x={width-53} y={height-27} textAnchor="end" fontFamily="Georgia,serif"
      fontSize="15" letterSpacing={1.3} fill={day ? "#304d54" : "#f8eccd"}>WAX CRAYON   /   001</text>}
  </g>;
}
export function CrayonStorybook({frame, story = "lantern", aspect = "landscape", seed = 23,
  pressure = .87, paperTooth = .58, reducedMotion = false, showEditorial, style, ...props}: CrayonStorybookProps) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("crayon frame must be a nonnegative integer");
  if (!Number.isSafeInteger(seed)) throw new RangeError("crayon seed must be a safe integer");
  if (!Number.isFinite(pressure) || pressure < 0 || pressure > 1) throw new RangeError("crayon pressure must be in [0,1]");
  if (!Number.isFinite(paperTooth) || paperTooth < 0 || paperTooth > 1) throw new RangeError("crayon paperTooth must be in [0,1]");
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("unknown crayon aspect");
  if (story !== "lantern" && story !== "garden") throw new RangeError("unknown crayon story");
  const portrait = aspect === "portrait", day = story === "garden";
  // In 9:16 the fixed title and tagline can cover the drawn subject or sun.
  // Editorial is opt-in there until a measured composition-specific text
  // safe area exists; 16:9 retains the authored title for compatibility.
  const showStoryEditorial = showEditorial ?? !portrait;
  const W = portrait ? 540 : 960, H = portrait ? 960 : 540;
  const raw = useId(), tooth = "crayonpaper-" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const groundY = H * (portrait ? .76 : .78);
  const skyD = "M0 0 H" + W + " V" + H*.68 + " Q" + W*.76 + " " + H*.59 + " " + W*.50 + " " + H*.67 + " T0 " + H*.61 + "Z";
  const backD = "M0 " + H*.68 + " Q" + W*.23 + " " + H*.48 + " " + W*.44 + " " + H*.67 +
    " Q" + W*.70 + " " + H*.46 + " " + W + " " + H*.65 + " V" + H + " H0Z";
  const hillD = "M0 " + groundY + " Q" + W*.23 + " " + H*.66 + " " + W*.47 + " " + H*.75 +
    " Q" + W*.74 + " " + H*.62 + " " + W + " " + H*.70 + " V" + H + " H0Z";
  const moonX = portrait ? W*.78 : W*.78, moonY = portrait ? 325 : 162;
  const sunR = portrait ? 71 : 89;
  const circle = "M" + (moonX-sunR) + " " + moonY + " a" + sunR + " " + sunR + " 0 1 0 " + (sunR*2) + " 0 a" + sunR + " " + sunR + " 0 1 0 -" + (sunR*2) + " 0Z";
  const foreground = day ? ["#5c9f86","#397f78","#b2c892"] as const : ["#47666d","#294f58","#72927d"] as const;
  const sky = day ? ["#8fbfc7","#6aa5bd","#bbd2c5"] as const : ["#38486f","#263861","#66779a"] as const;
  const far = day ? ["#a9a5b9","#887fa8","#c5bed0"] as const : ["#74899b","#526983","#a2adad"] as const;
  const yellow = day ? ["#f7d27a","#e9a865","#fff0ad"] as const : ["#f7e2a0","#efc778","#fff4c5"] as const;
  const skyBounds = {x:0,y:0,width:W,height:H*.77};
  const totalFrame = Math.min(frame, 419);
  return <svg {...props} role={props["aria-hidden"] ? undefined : "img"} aria-label={props["aria-hidden"] ? undefined :
    (day ? "Wax-crayon storybook scene: flowers grow from a little seed" : "Wax-crayon storybook scene: a fox carries a lantern home")}
    data-km-crayon-storybook="" data-km-crayon-frame={frame} data-km-crayon-story={story}
    viewBox={"0 0 " + W + " " + H} xmlns="http://www.w3.org/2000/svg"
    style={{display:"block",width:"100%",height:"100%",isolation:"isolate",...style}}>
    <Paper width={W} height={H} seed={seed} tooth={tooth} strength={paperTooth}/>
    <WaxRegion d={skyD} bounds={skyBounds} colors={sky} seed={seed+1} pressure={pressure * .66} tooth={tooth} frame={totalFrame} first={0} last={121} reduced={reducedMotion} spacing={11}/>
    <WaxRegion d={circle} bounds={{x:moonX-sunR-4,y:moonY-sunR-4,width:2*sunR+8,height:2*sunR+8}} colors={yellow} seed={seed+2}
      pressure={pressure * .81} tooth={tooth} frame={totalFrame} first={47} last={138} reduced={reducedMotion} spacing={7}/>
    <Starfield width={W} height={H} seed={seed} frame={totalFrame} reduced={reducedMotion} day={day}/>
    <WaxRegion d={backD} bounds={{x:0,y:H*.42,width:W,height:H*.60}} colors={far} seed={seed+3} pressure={pressure * .71}
      tooth={tooth} frame={totalFrame} first={82} last={194} reduced={reducedMotion} spacing={10}/>
    <WaxRegion d={hillD} bounds={{x:0,y:H*.60,width:W,height:H*.4}} colors={foreground} seed={seed+4} pressure={pressure * .77}
      tooth={tooth} frame={totalFrame} first={135} last={260} reduced={reducedMotion} spacing={10}/>
    {day ? <>
      <Bloom x={W*.22} y={H*.74} scale={portrait ? .85 : 1.04} seed={seed+50} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Bloom x={W*.62} y={H*.72} scale={portrait ? 1.11 : 1.27} seed={seed+90} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Bloom x={W*.86} y={H*.80} scale={portrait ? .58 : .68} seed={seed+140} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <WaxLine d={"M" + W*.09 + " " + H*.89 + " Q" + W*.48 + " " + H*.96 + " " + W*.94 + " " + H*.91}
        color="#e8ca9e" width={6} seed={seed+181} frame={totalFrame} first={295} last={400} reduced={reducedMotion} opacity={.8}/>
    </> : <>
      <Pine x={W*.13} y={H*.72} scale={portrait ? 1.07 : 1.08} seed={seed+30} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Pine x={W*.88} y={H*.69} scale={portrait ? .84 : .83} seed={seed+44} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Fox x={portrait ? W*.45 : W*.58} y={portrait ? H*.79 : H*.76} scale={portrait ? .98 : .98}
        seed={seed+80} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <WaxLine d={"M" + W*.05 + " " + H*.90 + " Q" + W*.43 + " " + H*.86 + " " + W*.82 + " " + H*.98}
        color="#caa990" width={9} seed={seed+140} frame={totalFrame} first={220} last={340} reduced={reducedMotion} opacity={.56}/>
    </>}
    <MeadowDetails width={W} height={H} seed={seed+172} frame={totalFrame} reduced={reducedMotion} day={day}/>
    {showStoryEditorial && <StoryTitle width={W} height={H} portrait={portrait} day={day} frame={totalFrame} reduced={reducedMotion}/>}
    {portrait && showStoryEditorial && <g fill={day?"#365265":"#f9ebd2"} fontSize="17" fontFamily="Georgia,serif" letterSpacing="2" opacity=".86">
      <path d={"M33 " + (H-70) + " H" + (W-33)} stroke={day?"#365265":"#f9ebd2"} strokeWidth="1.5" fill="none"/>
      <text x={34} y={H-36}>WAX CRAYON   /   {day?"002":"001"}</text>
    </g>}
  </svg>;
}
