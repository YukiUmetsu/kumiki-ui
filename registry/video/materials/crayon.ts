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
        const patchX = bounds.x - 16 + group * groupWidth + (rand(4) - .5) * 13;
        const patchY = bounds.y - spacing + row * spacing + layer * spacing * .36 + (rand(5) - .5) * spacing * 1.4;
        const segmentCount = Math.max(2, Math.ceil(groupWidth / 42));
        const segmentWidth = groupWidth / segmentCount;
        const lean = (rand(6) - .5) * 19;
        const d = Array.from({length:segmentCount}, (_,part) => {
          const shortfall = 2 + crayonHash(options.seed,index,120+part)*segmentWidth*.23;
          const x = patchX + segmentWidth*part + (crayonHash(options.seed,index,150+part)-.5)*6;
          const endX = x + segmentWidth - shortfall;
          const y = patchY + (crayonHash(options.seed,index,190+part)-.5)*spacing*1.25;
          const startY = y - lean*.5;
          const endY = y + lean*.5;
          const curvature = (crayonHash(options.seed,index,230+part)-.5)*7;
          return "M "+x.toFixed(2)+" "+startY.toFixed(2)+" Q "+
            ((x+endX)/2).toFixed(2)+" "+(y+curvature).toFixed(2)+" "+
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
          d, scumble, scrape, index, pressure: p,
          tone: toneSample < .73 ? 0 : toneSample < .94 ? 1 : 2,
          width: 2.1 + p * 3.9 + rand(15) * 1.1,
        });
      }
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
