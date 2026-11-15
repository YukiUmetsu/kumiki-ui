/** Pure, frame-addressable wax-crayon deposition. No randomness, timers, filters or canvas state. */
export interface CrayonBounds { x: number; y: number; width: number; height: number }
/** Dry wax splits the nib footprint into pressure-dependent, paper-catching ribbons. */
export type CrayonNibStyle = "rounded" | "tapered" | "dry";
/** Long overlapping rubbing or legacy small fragmented strokes. */
export type CrayonMarkLength = "long" | "short";
/** A sharp tool removes only the upper wax pigment. The solid first pigment
 * layer remains fully opaque, as it does in physical sgraffito.
 * The scratch line is revealed between first and last absolute film frames. */
export interface CrayonSgraffito {
  d:string; width:number; first:number; last:number;
}
export function assertCrayonSgraffito(value:CrayonSgraffito):void {
  if(!value || typeof value.d!=="string" || value.d.length<2 ||
    value.d.length>25000 || !/^[0-9.,+\-\sMmLlHhVvCcSsQqTtAaZzEe]+$/.test(value.d) ||
    !/[Mm]/.test(value.d) ||
    !Number.isFinite(value.width)||value.width<.2||value.width>12||
    !Number.isSafeInteger(value.first)||!Number.isSafeInteger(value.last)||
    value.first<0||value.last<=value.first)
    throw new RangeError("Invalid wax-crayon sgraffito engraving");
}

/** Order of actual colored wax deposits, independent of the mark's shape. */
export type CrayonStrokeOrder = "scanline" | "patches";
/** A quadratic centerline retained alongside the older SVG stroke contract. */
export type CrayonNibArc = readonly [number, number, number, number, number, number];
export interface CrayonMark {
  d: string; scumble: string; scrape: string; width: number; tone: number;
  pressure: number; index: number;
  /** Curves used for variable-width nib contact, in authored drawing coordinates. */
  nibArcs: readonly CrayonNibArc[];
  /** Cached full-contact geometry for repeated film frames. */
  nibD: string;
}
export interface CrayonOptions {
  seed: number; pressure: number; spacing?: number; passes?: number;
  /** Hand-guided local coloring blocks (default) or legacy row-major wipe. */
  strokeOrder?: CrayonStrokeOrder;
  /** Longer coherent rubbing strokes reduce confetti-like wax flecks. */
  markLength?: CrayonMarkLength;
}
/**
 * Physically motivated, authored order of outlining and hand-hatching.
 * Unlike a digital mask wipe, each native wax mark is deposited progressively.
 * This is an optional construction mode; older scenes retain their original look.
 */
export interface CrayonWaxConstruction {
  order: "outline-first" | "fill-first";
  /** Portion of the drawing duration dedicated to tracing the silhouette. */
  outlineFraction: number;
  /** Thin residual flat wax binder; 0 leaves only the textured deposited strokes. */
  glaze: number;
}
export function crayonConstructionWindows(
  first:number,last:number,build:CrayonWaxConstruction,
):{outlineStart:number;outlineEnd:number;fillStart:number;fillEnd:number}{
  if(![first,last,build?.outlineFraction,build?.glaze].every(Number.isFinite) ||
    !Number.isSafeInteger(first)||!Number.isSafeInteger(last)||
    first<0||last-first<3||!["outline-first","fill-first"].includes(build.order)||
    build.outlineFraction<.1||build.outlineFraction>.75||
    build.glaze<0||build.glaze>.45)
    throw new RangeError("Invalid CRAYON1 wax construction windows");
  const outlineFrames=Math.min(last-first-1,Math.max(1,
    Math.round((last-first)*build.outlineFraction)));
  return build.order==="outline-first"
    ?{outlineStart:first,outlineEnd:first+outlineFrames,
      fillStart:first+outlineFrames,fillEnd:last}
    :{fillStart:first,fillEnd:last-outlineFrames,
      outlineStart:last-outlineFrames,outlineEnd:last};
}

export function crayonHash(seed: number, a: number, b = 0): number {
  // Integer mixing keeps renders identical across seeks and JavaScript runtimes.
  let n = (seed | 0) ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
}
export function assertCrayonOptions(options: CrayonOptions): void {
  if (!Number.isSafeInteger(options.seed)) throw new RangeError("crayon seed must be a safe integer");
  if (!Number.isFinite(options.pressure) || options.pressure < 0 || options.pressure > 1)
    throw new RangeError("crayon pressure must be between 0 and 1");
  if (options.spacing !== undefined && (!Number.isFinite(options.spacing) || options.spacing < 4 || options.spacing > 32))
    throw new RangeError("crayon spacing must be between 4 and 32");
  if (options.passes !== undefined && (!Number.isSafeInteger(options.passes) || options.passes < 1 || options.passes > 3))
    throw new RangeError("crayon passes must be between 1 and 3");
  if (options.strokeOrder !== undefined && options.strokeOrder !== "scanline" && options.strokeOrder !== "patches")
    throw new RangeError("crayon stroke order must be scanline or patches");
  if (options.markLength !== undefined && options.markLength !== "long" && options.markLength !== "short")
    throw new RangeError("crayon mark length must be long or short");
}
export function crayonMarks(bounds: CrayonBounds, options: CrayonOptions): CrayonMark[] {
  assertCrayonOptions(options);
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
      bounds.width <= 0 || bounds.height <= 0 || bounds.width > 4096 || bounds.height > 4096)
    throw new RangeError("crayon bounds must be finite, positive and no larger than 4096");
  const spacing = options.spacing ?? 10.5;
  const passes = options.passes ?? 2;
  const rows = Math.ceil(bounds.height / spacing) + 3;
  // Short independent patches get independent pigment and pressure. Coloring a whole
  // horizontal row at once looked like stacked tiles, not wax rubbed by a hand.
  const groups = Math.max(1, Math.ceil(bounds.width / 132));
  if (rows * groups * passes > 2500) throw new RangeError("crayon surface would exceed the stroke budget");
  const marks: CrayonMark[] = [];
  const groupWidth = (bounds.width + 32) / groups;
  for (let layer = 0; layer < passes; layer++) {
    for (let row = 0; row < rows; row++) {
      for (let group = 0; group < groups; group++) {
        const index = layer * rows * groups + row * groups + group;
        const rand = (channel: number) => crayonHash(options.seed, index, channel);
        // A repeated rectilinear grid reads as digital horizontal noise.
        // The two rubbing passes use independent contact jitters and partial
        // cross-grain gestures, as real hand pressure changes on paper tooth.
        const patchX = bounds.x - 16 + group * groupWidth +
          (rand(4) - .5) * Math.min(31,groupWidth*.27);
        const patchY = bounds.y - spacing + row * spacing + layer * spacing * .36 +
          (rand(5) - .5) * spacing * 1.95;
        // Real rubbing gestures traverse a significant local paper area,
        // rather than painting many equally short confetti flecks. A small
        // minority of lifts retain irregular short scumble / hatching.
        // Explicit "short" preserves the legacy treatment for foliage or
        // authored fine detail that benefits from small broken pieces.
        const segmentCount = options.markLength==="short"
          ? Math.max(2,Math.ceil(groupWidth / (32 + rand(16)*19)))
          : rand(16)<.15 ? 4 : 2;
        const segmentWidth = groupWidth / segmentCount;
        // A human maintains one rubbing direction for several strokes before
        // rotating the crayon. Low-frequency gesture fields prevent the noisy,
        // confetti-like orientation changes of fully independent hatch angles.
        const gestureColumns = Math.max(1,Math.ceil(groups/2));
        const gestureCell = Math.floor(row/5)*gestureColumns + Math.floor(group/2);
        const lean = (crayonHash(options.seed,gestureCell,1600+layer)-.5)*35 +
          (rand(6)-.5)*12;
        const nibArcs: CrayonNibArc[] = [];
        const d = Array.from({length:segmentCount}, (_,part) => {
          const taper = options.markLength==="short"
            ? .16 + crayonHash(options.seed,index,120+part)*.32
            : .10 + crayonHash(options.seed,index,120+part)*.27;
          const shortfall = 2 + segmentWidth*taper;
          const x = patchX + segmentWidth*part +
            (crayonHash(options.seed,index,150+part)-.5)*segmentWidth*.19;
          const endX = x + Math.max(3,segmentWidth - shortfall);
          const y = patchY + (crayonHash(options.seed,index,190+part)-.5)*spacing*1.55;
          const startY = y - lean*.5;
          const endY = y + lean*.5 + (crayonHash(options.seed,index,240+part)-.5)*5;
          const curvature = (crayonHash(options.seed,index,230+part)-.5)*9;
          const controlX = (x+endX)/2 +
            (crayonHash(options.seed,index,250+part)-.5)*segmentWidth*.14;
          nibArcs.push([x,startY,controlX,y+curvature,endX,endY]);
          return "M "+x.toFixed(2)+" "+startY.toFixed(2)+" Q "+
            controlX.toFixed(2)+" "+(y+curvature).toFixed(2)+" "+
            endX.toFixed(2)+" "+endY.toFixed(2);
        }).join(" ");
        const grainX = patchX + groupWidth * (.22 + rand(8) * .52);
        const grainY = patchY + (rand(9) - .5) * 5;
        const grainLen = 9 + rand(10) * Math.min(33,groupWidth*.48);
        const scumble = "M" + grainX.toFixed(2) + " " + (grainY + 1.5).toFixed(2) +
          " q" + (grainLen*.5).toFixed(2) + " " + ((rand(11)-.5)*7).toFixed(2) +
          " " + grainLen.toFixed(2) + " " + ((rand(12)-.5)*7).toFixed(2);
        const scrape = "M" + (grainX + 5).toFixed(2) + " " + (grainY - 1).toFixed(2) +
          " l" + (grainLen*.4).toFixed(2) + " " + ((rand(13)-.5)*3).toFixed(2);
        const p = Math.min(1, Math.max(.14, options.pressure * (.65 + rand(7) * .52)));
        const toneSample = rand(14);
        const mark: CrayonMark = {
          d, scumble, scrape, nibArcs, nibD:"", index, pressure: p,
          tone: toneSample < .73 ? 0 : toneSample < .94 ? 1 : 2,
          width: 2.1 + p * 3.9 + rand(15) * 1.1,
        };
        mark.nibD = crayonNibPath(mark);
        marks.push(mark);
      }
    }
  }
  if (options.strokeOrder !== "scanline") {
    // Human drawing is organized into nearby rubbing blocks rather than a
    // left-to-right raster scan. A Morton (Z-curve) tile order visits nearby
    // patches before distant ones, and the nib travels back and forth inside
    // each tile. It never synthesizes new strokes or advances the film clock.
    // Sorting only changes reveal order: each mark retains its original
    // geometry, seed, pressure, ID and complete nib path.
    const rank = (index: number): number => {
      const layer = Math.floor(index / (rows * groups));
      const remainder = index % (rows * groups);
      const row = Math.floor(remainder / groups), group = remainder % groups;
      const block = Math.floor(row / 5), local = row % 5;
      const height = Math.min(5, rows - block * 5);
      let tile = 0;
      // Bounds <=4096, spacing>=4 => at most 206 five-row blocks and 32
      // columns, so eight interleaved coordinate bits are sufficient.
      for (let bit=0; bit<8; bit++) {
        tile += ((group >>> bit) & 1) * 2**(2*bit);
        tile += ((block >>> bit) & 1) * 2**(2*bit+1);
      }
      const line = (group + block) % 2 === 0 ? local : height - 1 - local;
      return layer * 1_000_000 + tile * 5 + line;
    };
    marks.sort((a,b) => rank(a.index) - rank(b.index));
  }
  return marks;
}

/**
 * Pressure-shaped wax contact from the exact quadratic marks used for drawing.
 * Each sub-stroke is a bounded filled ribbon (not a fixed-width SVG line).
 * Width swells through contact and tapers as the nib lifts; both paper-grain
 * asymmetry and geometry are pinned to the mark rather than random per frame.
 *
 * The path is evaluated from an absolute progress fraction. Segments use
 * fixed 1/5 samples, so previous deposits remain spatially stable when seeking
 * or drawing forward; only the advancing tip is recomputed.
 */
export function crayonNibPath(mark: CrayonMark, progress = 1): string {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new RangeError("crayon nib progress must be in [0,1]");
  if (progress === 0) return "";
  const arcCount = mark.nibArcs.length;
  if (arcCount === 0) return "";
  const fix = (n: number) => n.toFixed(2);
  const shapes: string[] = [];
  for (let i = 0; i < arcCount; i++) {
    const exposed = Math.max(0, Math.min(1, progress * arcCount - i));
    if (exposed <= 0) continue;
    const [x0,y0,cx,cy,x1,y1] = mark.nibArcs[i];
    // An advancing nib cannot have more than five fixed deposition steps
    // per short lifted stroke. This caps SVG complexity on large scenes.
    const sampleSteps = Math.ceil(exposed * 5);
    const stops = Array.from({length:sampleSteps+1}, (_,j) =>
      j === sampleSteps ? exposed : j/5);
    const left: string[] = [], right: string[] = [];
    for (let j = 0; j < stops.length; j++) {
      const t = stops[j], inv = 1-t;
      const x = inv*inv*x0 + 2*inv*t*cx + t*t*x1;
      const y = inv*inv*y0 + 2*inv*t*cy + t*t*y1;
      const tx = 2*inv*(cx-x0) + 2*t*(x1-cx);
      const ty = 2*inv*(cy-y0) + 2*t*(y1-cy);
      const length = Math.max(1e-6, Math.hypot(tx,ty));
      const nx = -ty/length, ny = tx/length;
      // A wax nib touches down lightly, flattens under force, then lifts.
      const contact = .36 + .64*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.6);
      const tooth = .86 + .23*crayonHash(mark.index,i*7+j,3101);
      const tip = exposed<1 && j===sampleSteps ? .25 : 1;
      const radius = mark.width * .5 * contact * tooth * tip;
      left.push(fix(x+nx*radius)+" "+fix(y+ny*radius));
      right.push(fix(x-nx*radius)+" "+fix(y-ny*radius));
    }
    shapes.push("M"+left.join("L")+"L"+right.reverse().join("L")+"Z");
  }
  return shapes.join(" ");
}

/**
 * An opt-in fractured wax footprint, not a stipple/noise filter.
 *
 * The same authored quadratic nib footprint is split into up to three
 * thin side-nib contact bands. A few short lifts interrupt a band, exposing
 * the shared paper-space relief. Low force deposits fewer, narrower bands.
 * Everything is derived from the fixed mark index and its pressure; no
 * clocks, random state or raster textures are used.
 *
 * The SVG is bounded to <= 3 bands x 2 lifted fragments per nib arc.
 * Completed geometry is memoized only by dry-mode regions; partial frames
 * regenerate only the active nib and never rearrange painted marks.
 */
/** Deterministic paper-contact height in canonical material coordinates.
 * Smooth, multi-scale paper relief is shared across independent deposits.
 * This is an SVG-oriented approximation, not a wax thickness simulation.
 * Hash cells are keyed to position and the PAPER seed (not mark IDs).
 */
export function crayonPaperHeight(x:number,y:number,paperSeed:number):number{
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isSafeInteger(paperSeed))
    throw new RangeError("Invalid crayon paper coordinates or seed");
  // Repeatable 176-unit paper tile shared by the SVG pigment pattern.
  // Toroidal lattice indexing prevents a digital seam at tile boundaries.
  const field=(cells:number,salt:number)=>{
    const gx=x*cells/176,gy=y*cells/176;
    const ix=Math.floor(gx),iy=Math.floor(gy);
    const sx=gx-ix,sy=gy-iy;
    const smooth=(v:number)=>v*v*(3-2*v);
    const wrap=(i:number)=>((i%cells)+cells)%cells;
    const hash=(i:number,j:number)=>crayonHash(paperSeed,
      (Math.imul(wrap(i),73856093)^Math.imul(wrap(j),19349663))|0,salt);
    const top=hash(ix,iy)+(hash(ix+1,iy)-hash(ix,iy))*smooth(sx);
    const bottom=hash(ix,iy+1)+(hash(ix+1,iy+1)-hash(ix,iy+1))*smooth(sx);
    return top+(bottom-top)*smooth(sy);
  };
  // All strokes on the same page sample the same tactile cell structure.
  return Math.max(0,Math.min(1,.39*field(32,4121)+
    .37*field(88,4122)+.24*field(352,4123)));
}

/** Real wax catches raised paper fibers and forms small cohesive clumps.
 * Generates a few compound SVG paths rather than arbitrary alpha noise.
 * Coordinates and deposition are fixed by the page seed; locally drawn
 * regions contribute only placement/angle/pressure and pigment palette.
 * This intentionally does NOT claim to model the full plastic wax volume.
 */
export function crayonWaxContactClumps(
  bounds:CrayonBounds,seed:number,paperSeed:number,pressure:number,angle=0,
):ReadonlyArray<{tone:1|2;width:number;count:number;d:string}>{
  if(![bounds.x,bounds.y,bounds.width,bounds.height,pressure,angle].every(Number.isFinite)||
    bounds.width<=0||bounds.height<=0||bounds.width>4096||bounds.height>4096||
    pressure<.2||pressure>1||angle< -89||angle>89||
    !Number.isSafeInteger(seed)||!Number.isSafeInteger(paperSeed))
    throw new RangeError("Invalid crayon wax contact clump parameters");
  const area=bounds.width*bounds.height;
  const cell=Math.max(2.8,Math.sqrt(area/660));
  const cols=Math.ceil(bounds.width/cell),rows=Math.ceil(bounds.height/cell);
  const buckets=[[],[],[],[],[],[]] as string[][];
  const fmt=(v:number)=>v.toFixed(2);
  for(let j=0;j<rows;j++){
    for(let i=0;i<cols;i++){
      const k=j*cols+i,rand=(ch:number)=>crayonHash(seed,k,4440+ch);
      const x=bounds.x+(i+.12+.74*rand(1))*bounds.width/cols;
      const y=bounds.y+(j+.12+.74*rand(2))*bounds.height/rows;
      const paper=crayonPaperHeight(x,y,paperSeed);
      // A light nib skips valleys; increased pressure sticks to lower fiber
      // heights. This gives the same page tactile identity across colors.
      if(paper+pressure*.25<.48)continue;
      const tone:1|2=rand(3)<.61?1:2;
      const band=Math.min(2,Math.floor(rand(4)*3));
      const theta=(angle+(rand(5)-.5)*42)*Math.PI/180;
      const length=(1.1+2.3*paper+pressure*2.3)*(.55+.8*rand(6));
      const dx=Math.cos(theta)*length,dy=Math.sin(theta)*length;
      const bow=(rand(7)-.5)*1.9;
      const cx=x+dx*.52-Math.sin(theta)*bow;
      const cy=y+dy*.52+Math.cos(theta)*bow;
      const path="M"+fmt(x)+" "+fmt(y)+"Q"+fmt(cx)+" "+fmt(cy)+
        " "+fmt(x+dx)+" "+fmt(y+dy);
      buckets[(tone-1)*3+band].push(path);
    }
  }
  return buckets.map((parts,index)=>({
    tone:(Math.floor(index/3)+1) as 1|2,
    width:(index%3)*.25+.46+pressure*.28,
    count:parts.length,
    d:parts.join(" "),
  }));
}

/** Small waxy pickups at stroke lift-off, observed in real wax-crayon
 * microscopy. Unlike region-wide sprinkle/clumps, the deposits attach to
 * the actual quadratic nib gesture and share its draw-in timing.
 *
 * The final clump geometry is a deterministic function of the nib arc,
 * contact pressure and canonical paper relief. This is an approximation,
 * not a conservation-of-mass or temperature-dependent wax simulation.
 */
export function crayonStrokeEndPickup(
  mark:CrayonMark,paperSeed:number,progress=1,
):string {
  if(!Number.isSafeInteger(paperSeed)||!Number.isFinite(progress)||
    progress<0||progress>1)
    throw new RangeError("Invalid crayon stroke pickup controls");
  if(progress<=0)return "";
  const out:string[]=[];
  const fmt=(n:number)=>n.toFixed(2);
  for(let i=0;i<mark.nibArcs.length;i++){
    const exposed=Math.max(0,Math.min(1,progress*mark.nibArcs.length-i));
    // Waxy matter piles up mainly when the worn nib lifts from paper.
    if(exposed<.85)continue;
    const [x0,y0,cx,cy,x1,y1]=mark.nibArcs[i];
    const t=.85+.15*Math.min(1,(exposed-.85)/.15);
    const inv=1-t;
    const x=inv*inv*x0+2*inv*t*cx+t*t*x1;
    const y=inv*inv*y0+2*inv*t*cy+t*t*y1;
    const tx=2*inv*(cx-x0)+2*t*(x1-cx);
    const ty=2*inv*(cy-y0)+2*t*(y1-cy);
    const len=Math.max(1e-6,Math.hypot(tx,ty));
    const nx=-ty/len,ny=tx/len,ux=tx/len,uy=ty/len;
    const paper=crayonPaperHeight(x,y,paperSeed);
    const wax=mark.pressure*(.32+.68*paper);
    if(wax<.24)continue;
    // Three overlapping asymmetric lobes, each joined to the existing
    // contact ribbon. Their lopsided, tapered edges are not confetti.
    const base=mark.width*(.14+.18*wax);
    for(let lobe=0;lobe<3;lobe++){
      const rand=(ch:number)=>crayonHash(mark.index,i*13+lobe,5230+ch);
      if(rand(4)>.70+.22*wax)continue;
      const sideways=(lobe-1)*base*.73+(rand(1)-.5)*base*.22;
      const ahead=(lobe-.8)*base*.53;
      const px=x+nx*sideways+ux*ahead;
      const py=y+ny*sideways+uy*ahead;
      const w=base*(.55+.65*rand(2));
      const h=base*(.45+1.25*rand(3));
      const backward=.85*h,forward=.55*h;
      const sx=px-ux*backward,sy=py-uy*backward;
      const ex=px+ux*forward,ey=py+uy*forward;
      out.push("M"+fmt(sx-nx*w)+" "+fmt(sy-ny*w)+
        "Q"+fmt(px-nx*w*1.35)+" "+fmt(py-ny*w*.90)+" "+
        fmt(ex)+" "+fmt(ey)+
        "Q"+fmt(px+nx*w*1.1)+" "+fmt(py+ny*w*.78)+" "+
        fmt(sx+nx*w)+" "+fmt(sy+ny*w)+"Z");
    }
  }
  return out.join(" ");
}

/** Fixed full-stroke arc stations: drawing forward cannot reflow earlier wax.
 * Only the current moving tip is interpolated; prior paper contacts stay
 * pinned to their original world positions and shared paper-height samples.
 * This is intentionally used only for the opt-in hand-contact renderer:
 * legacy dry nib SVG output remains byte-for-byte unchanged.
 */
export function crayonStableNibStops(lo:number,hi:number,end:number):number[]{
  if(![lo,hi,end].every(Number.isFinite)||
    lo<0||lo>=hi||hi>1||end<0||end>1)
    throw new RangeError("Invalid crayon nib sample interval");
  if(end<=lo)return [];
  const fractions=[0,.08,.17,.26,.36,.47,.58,.69,.79,.89,1];
  const stops=fractions.map(f=>lo+(hi-lo)*f)
    .filter(t=>t<=Math.min(end,hi)+1e-10);
  // The advancing tip may move; every completed station must be immutable.
  if(end<hi-1e-10&&
    (stops.length===0||Math.abs(stops[stops.length-1]-end)>1e-10))
    stops.push(end);
  return stops;
}

export function crayonDryNibPath(
  mark:CrayonMark,progress=1,contact:"legacy"|"hand"="legacy",
  paperSeed=0,
):string{
  if(contact!=="legacy"&&contact!=="hand")
    throw new RangeError("Invalid dry nib contact style");
  if(!Number.isSafeInteger(paperSeed))
    throw new RangeError("Invalid crayon paper seed");
  const handmade=contact==="hand";
  if(!Number.isFinite(progress)||progress<0||progress>1)
    throw new RangeError("crayon dry nib progress must be in [0,1]");
  if(progress===0||mark.nibArcs.length===0)return "";
  const fmt=(n:number)=>n.toFixed(2);
  const result:string[]=[];
  const bands=handmade?(mark.pressure>=.78?4:mark.pressure>=.42?3:2):
    mark.pressure>=.78?3:mark.pressure>=.42?2:1;
  for(let arc=0;arc<mark.nibArcs.length;arc++){
    const exposed=Math.min(1,Math.max(0,progress*mark.nibArcs.length-arc));
    if(exposed<=0)continue;
    const [x0,y0,cx,cy,x1,y1]=mark.nibArcs[arc];
    const point=(t:number)=>{
      const inv=1-t;
      const x=inv*inv*x0+2*inv*t*cx+t*t*x1;
      const y=inv*inv*y0+2*inv*t*cy+t*t*y1;
      const tx=2*inv*(cx-x0)+2*t*(x1-cx);
      const ty=2*inv*(cy-y0)+2*t*(y1-cy);
      const len=Math.max(1e-6,Math.hypot(tx,ty));
      return {x,y,nx:-ty/len,ny:tx/len};
    };
    const laneIds=bands===1?[1]:bands===2?[0,2]:
      bands===3?[0,1,2]:[0,1,2,3];
    for(const lane of laneIds){
      const seed=arc*23+lane;
      const liftStart=.035+.12*crayonHash(mark.index,seed,3102);
      const liftEnd=.73+.22*crayonHash(mark.index,seed,3103);
      const lifted=crayonHash(mark.index,seed,3104)<.38;
      const gapStart=.43+.04*crayonHash(mark.index,seed,3105);
      const gapEnd=gapStart+.08+.06*crayonHash(mark.index,seed,3106);
      const ranges=lifted?[[liftStart,gapStart],[gapEnd,liftEnd]]:[[liftStart,liftEnd]];
      const offset=(lane-(bands===4?1.5:1))*(handmade?.22:.28)*mark.width+
        (crayonHash(mark.index,seed,3107)-.5)*mark.width*(handmade?.14:.095);
      for(const [lo,hi] of ranges){
        const end=Math.min(exposed,hi);
        if(end<=lo+.008)continue;
        let left:string[]=[],right:string[]=[];
        const flush=()=>{
          if(left.length>=2)
            result.push("M"+left.join("L")+"L"+right.reverse().join("L")+"Z");
          left=[];right=[];
        };
        // Legacy nibs retain their historical 4 moving samples. Hand-mode
        // contacts instead use FIXED stations of the completed arc: the
        // previous algorithm rescaled the entire ribbon at each seek frame,
        // so colored wax slid around the page during an animated draw-in.
        const samples=handmade
          ? crayonStableNibStops(lo,hi,end)
          : [0,.3,.68,1].map(fraction=>lo+(end-lo)*fraction);
        for(const [j,t] of samples.entries()){
          const pos=point(t);
          // Paper friction makes wax break and veer *within* each contact.
          // No three perfectly parallel ribbons or identical edge thicknesses.
          // The temporary advancing tip can lift lightly; stations behind
          // it retain their full-contact shape when more of the mark arrives.
          const edge=j===0||(handmade ? Math.abs(t-hi)<1e-8 :
            j===samples.length-1);
          const advancingTip=handmade&&j===samples.length-1&&end<hi-1e-8;
          const drift=(crayonHash(mark.index,seed*11+j,3110)-.5)*
            mark.width*(handmade?(edge?.14:.29):(edge?.10:.22));
          // A real worn crayon end touches intermittently; height changes
          // along its side, making long contacts lumpy, not polygonal rulers.
          const taper=edge?(handmade?.23+.25*crayonHash(mark.index,seed+j,3111):.43):
            advancingTip?.36:1;
          const x=pos.x+pos.nx*(offset+drift);
          const y=pos.y+pos.ny*(offset+drift);
          // Adjacent crayon passes sample the SAME paper relief. A high peak
          // receives thicker wax while valleys interrupt side-of-nib contact.
          const paper=handmade?crayonPaperHeight(x,y,paperSeed):1;
          // Low ridges cannot contact a worn nib at light pressure; the
          // paper shows through as short in-stroke discontinuities. Strong
          // pressure bridges more valleys. Only the hand profile uses this.
          const contactFloor=.24+.21*(1-mark.pressure);
          if(handmade&&!edge&&paper<contactFloor){
            flush();
            continue;
          }
          const relief=handmade?
            .12+1.44*paper:
            .59+.57*crayonHash(mark.index,seed+j,3108);
          // Broad worn side-nib wax contacts: observable ribbons are thicker
          // than pencil-tip hatch lines, with valley gaps preserved by
          // the shared paper-height field and per-contact abrasion.
          const thickness=mark.width*(handmade?.14+.10*mark.pressure:
            .065+.043*mark.pressure)*taper*relief;
          const deposit=handmade?(.24+.76*mark.pressure):1;
          const contactWidth=thickness*deposit;
          left.push(fmt(x+pos.nx*contactWidth)+" "+fmt(y+pos.ny*contactWidth));
          right.push(fmt(x-pos.nx*contactWidth)+" "+fmt(y-pos.ny*contactWidth));
        }
        flush();
      }
    }
  }
  return result.join(" ");
}

export function crayonProgress(frame: number, first: number, last: number, index = 0, count = 1, reducedMotion = false): number {
  if (![frame, first, last, index, count].every(Number.isFinite) || first < 0 || last <= first ||
      index < 0 || count < 1 || index >= count)
    throw new RangeError("invalid frame range or stroke index for crayon");
  if (reducedMotion) return 1;
  const time = Math.min(1, Math.max(0, (frame - first) / (last - first)));
  const stagger = count === 1 ? 0 : index / (count - 1) * .78;
  const t = Math.min(1, Math.max(0, (time - stagger) / .22));
  return t * t * (3 - 2 * t);
}

/**
 * Material-native hand-coloring exposure schedule. Unlike a cinematic
 * simultaneous reveal, at most one nib mark is partially deposited at a
 * given instant. Finished marks remain fully stable under absolute seeks.
 * Legacy scanline scenes retain their original overlapping write-on.
 */
export function crayonStrokeProgress(
  frame:number, first:number, last:number, index:number, count:number,
  order:CrayonStrokeOrder, reducedMotion=false,
):number{
  const legacy=crayonProgress(frame,first,last,index,count,reducedMotion);
  if(order!=="scanline" && order!=="patches")
    throw new RangeError("crayon stroke order must be scanline or patches");
  if(order==="scanline" || reducedMotion)return legacy;
  const position=Math.min(1,Math.max(0,(frame-first)/(last-first)))*count-index;
  const t=Math.min(1,Math.max(0,position));
  return t*t*(3-2*t);
}
