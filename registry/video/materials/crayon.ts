/** Pure, frame-addressable wax-crayon deposition. No randomness, timers, filters or canvas state. */
export interface CrayonBounds { x: number; y: number; width: number; height: number }
export type CrayonNibStyle = "rounded" | "tapered";
/** A quadratic centerline retained alongside the older SVG stroke contract. */
export type CrayonNibArc = readonly [number, number, number, number, number, number];
export interface CrayonMark {
  d: string; scumble: string; scrape: string; width: number; tone: number;
  pressure: number; index: number;
  /** Curves used for variable-width nib contact, in authored drawing coordinates. */
  nibArcs: readonly CrayonNibArc[];
}
export interface CrayonOptions { seed: number; pressure: number; spacing?: number; passes?: number }
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
        const segmentCount = Math.max(2,Math.ceil(groupWidth / (32 + rand(16)*19)));
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
          const taper = .16 + crayonHash(options.seed,index,120+part)*.32;
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
        marks.push({
          d, scumble, scrape, nibArcs, index, pressure: p,
          tone: toneSample < .73 ? 0 : toneSample < .94 ? 1 : 2,
          width: 2.1 + p * 3.9 + rand(15) * 1.1,
        });
      }
    }
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
