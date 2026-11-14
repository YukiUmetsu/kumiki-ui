/** Pure, frame-addressable wax-crayon deposition. No randomness, timers, filters or canvas state. */
export interface CrayonBounds { x: number; y: number; width: number; height: number }
export interface CrayonMark { d: string; scumble: string; scrape: string; width: number; tone: number; pressure: number; index: number }
export interface CrayonOptions { seed: number; pressure: number; spacing?: number; passes?: number }

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
  const rows = Math.ceil(bounds.height / spacing) + 2;
  if (rows * passes > 1200) throw new RangeError("crayon surface would exceed the stroke budget");
  const marks: CrayonMark[] = [];
  for (let layer = 0; layer < passes; layer++) {
    for (let row = 0; row < rows; row++) {
      const index = layer * rows + row;
      const shift = (crayonHash(options.seed, index, 4) - .5) * spacing * 1.8;
      const y = bounds.y - spacing + row * spacing + shift + layer * spacing * .45;
      const slant = (layer ? -1 : 1) * (4 + crayonHash(options.seed, index, 5) * 9);
      const left = bounds.x - 18;
      const right = bounds.x + bounds.width + 18;
      const wobble = (crayonHash(options.seed, index, 6) - .5) * 8;
      // Tiny side-rubbings: many short, uneven strokes deposited into the same tooth.
      // A full-width regular ribbon reads as digital stripes, so a hand lifts between
      // patches and changes pressure, direction and coverage at every short passage.
      const segments = Math.max(2, Math.min(96, Math.ceil(bounds.width / 39)));
      const segmentWidth = (right-left) / segments;
      const d = Array.from({length:segments}, (_,part) => {
        const skew = (crayonHash(options.seed,index,100+part)-.5)*Math.min(12,segmentWidth*.22);
        const gap = (1.5+crayonHash(options.seed,index,230+part)*Math.min(8,segmentWidth*.14));
        const startX = left + segmentWidth*part + skew;
        const endX = left + segmentWidth*(part+1) - gap;
        const jitter=(crayonHash(options.seed,index,400+part)-.5)*Math.min(24,spacing*3.5);
        const angle=(crayonHash(options.seed,index,560+part)-.5)*Math.min(42,segmentWidth*.95);
        const sy = y + slant * (1-2*part/segments) + jitter - angle*.48;
        const ey = y + slant * (1-2*(part+1)/segments) + jitter + angle*.48;
        const midY=(sy+ey)/2+(crayonHash(options.seed,index,700+part)-.5)*5;
        return "M "+startX.toFixed(2)+" "+sy.toFixed(2)+
          " Q "+((startX+endX)/2).toFixed(2)+" "+midY.toFixed(2)+
          " "+endX.toFixed(2)+" "+ey.toFixed(2);
      }).join(" ");
      const grainX = left + bounds.width * (.18 + crayonHash(options.seed, index, 10) * .61);
      const grainY = y + slant * (1 - 2 * ((grainX - left) / (right - left)));
      const grainLen = 15 + crayonHash(options.seed, index, 11) * 66;
      const scumble = "M" + grainX.toFixed(2) + " " + (grainY + 2).toFixed(2) +
        " q" + (grainLen * .48).toFixed(2) + " " + (wobble * .8).toFixed(2) +
        " " + grainLen.toFixed(2) + " " + (wobble * .17).toFixed(2);
      const scrape = "M" + (grainX + 6).toFixed(2) + " " + (grainY - 1.7).toFixed(2) +
        " l" + (grainLen * .43).toFixed(2) + " " + (-wobble * .08).toFixed(2);
      const p = Math.min(1, Math.max(.16, options.pressure * (.77 + crayonHash(options.seed, index, 7) * .36)));
      marks.push({
        d, scumble, scrape, index, pressure: p, tone: crayonHash(options.seed,index,8) < .73 ? 0 : crayonHash(options.seed,index,8) < .92 ? 1 : 2,
        width: 4.5 + p * 5.6 + crayonHash(options.seed, index, 9) * 1.9,
      });
    }
  }
  return marks;
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
