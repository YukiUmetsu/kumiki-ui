import { InkBrushCanvas } from "../../registry/video/ink-brush-react";
import type { InkBrushSpec, InkBrushNode, InkBrushStroke } from "../../registry/video/ink-brush";

export type InkAspect = "landscape" | "portrait";
export type InkSubject = "delta" | "branch";
export interface InkPosterProps {
  aspect: InkAspect;
  subject: InkSubject;
  frame: number;
  seed?: number;
  widthScale?: number;
  drynessScale?: number;
  loadScale?: number;
  reducedMotion?: boolean;
  paperTooth?: number;
}
type ControlPoint = readonly [number, number, number, number?];
interface AuthoredMark {
  id: string;
  points: readonly ControlPoint[];
  width: number;
  tone: 0 | 1 | 2 | 3 | 4;
  load: number;
  dryness: number;
}
const mark = (
  id: string, points: readonly ControlPoint[], width: number, tone: AuthoredMark["tone"],
  load: number, dryness: number,
): AuthoredMark => ({ id, points, width, tone, load, dryness });

/** Two unrelated original subjects; all strokes and compositions are designed for this project. */
function deltaMarks(): AuthoredMark[] {
  return [
    mark("main-current", [[-158,-100,.18,1.9],[-108,-72,.9,.6],[-56,-20,1,1.1],[12,8,.85,1.4],[75,65,.9,.75],[151,99,.13,1.8]], 40, 0, .94, .45),
    mark("west-fork", [[-182,8,.08,1.5],[-126,-4,.75,.7],[-61,-16,.96,1],[9,8,.18,1.7]], 26, 1, .79, .69),
    mark("upper-tributary", [[-56,-153,.12,1.7],[-17,-94,.8,.6],[-12,-46,.86,.9],[12,8,.18,1.5]], 26, 1, .8, .7),
    mark("east-fork", [[50,34,.15,1.7],[104,10,.88,.8],[145,-40,.92,1],[184,-58,.08,1.9]], 18, 2, .77, .65),
    mark("lower-tributary", [[65,62,.13,1.8],[55,119,.7,.7],[96,152,.09,1.5]], 18, 2, .73, .54),
    mark("tidal-line-one", [[-197,117,.13,1.7],[-126,126,.48,.8],[-40,121,.46,1.2],[43,138,.45,1.1]], 12, 3, .59, .68),
    mark("tidal-line-two", [[-192,145,.12,1.7],[-98,163,.43,.8],[5,160,.28,1.3],[86,168,.06,1.7]], 8, 4, .66, .42),
    mark("estuary-a", [[105,115,.08,1.6],[150,140,.68,.7],[190,146,.1,1.9]], 13, 1, .68, .82),
    mark("estuary-b", [[99,103,.1,1.3],[151,90,.65,1],[188,99,.1,1.9]], 9, 3, .75, .4),
    mark("bank-a", [[-182,-130,.08,1.9],[-128,-115,.34,.9],[-83,-82,.1,1.6]], 6, 3, .57, .67),
    mark("bank-b", [[-195,-84,.06,2.1],[-152,-66,.35,.9],[-116,-34,.09,1.6]], 5, 4, .56, .53),
    mark("bank-c", [[-28,-176,.09,1.6],[10,-129,.44,.8],[42,-107,.04,1.9]], 8, 3, .62, .65),
    mark("bank-d", [[140,48,.1,1.4],[173,34,.38,1],[192,25,.07,1.7]], 7, 3, .55, .58),
    mark("bank-e", [[-158,71,.1,1.5],[-119,84,.32,.8],[-70,90,.1,1.8]], 6, 4, .5, .56),
    mark("final-current", [[-135,37,.05,1.4],[-72,35,.43,.8],[-23,47,.2,1.6]], 6, 2, .64, .81),
  ];
}
function branchMarks(): AuthoredMark[] {
  const marks: AuthoredMark[] = [
    mark("trunk", [[-8,176,.2,1.6],[-14,113,1,.6],[-32,45,.95,.85],[-21,-43,.8,.9],[5,-141,.06,1.8]], 40, 0, .95, .64),
    mark("branch-left", [[-22,55,.15,1.1],[-92,20,.86,.7],[-158,-14,.11,1.9]], 22, 1, .92, .72),
    mark("branch-right", [[-27,-8,.18,1.2],[49,-62,.78,.75],[139,-91,.07,2]], 20, 1, .83, .68),
    mark("upper-branch", [[-9,-112,.18,1.1],[-66,-142,.66,.7],[-100,-180,.07,1.7]], 15, 2, .79, .55),
    mark("low-twig", [[-12,99,.14,1.3],[63,86,.66,1.0],[120,76,.08,1.8]], 15, 1, .7, .72),
    mark("low-left", [[-22,123,.12,1.3],[-81,100,.75,.8],[-126,74,.06,1.9]], 12, 2, .73, .71),
  ];
  const leaves: readonly [number, number, number, number, number][] = [
    [-150,-17,-184,-60,17],[-146,-18,-172,18,12],[-112,7,-140,-47,13],[-94,17,-99,-40,16],
    [-74,-139,-103,-181,14],[-58,-140,-31,-183,14],[-13,-150,-21,-196,15],[15,-136,38,-175,11],
    [47,-61,64,-113,16],[73,-80,102,-123,17],[110,-88,159,-124,15],[139,-92,191,-117,15],
    [107,80,157,50,17],[94,84,144,111,14],[59,87,68,129,14],[-79,96,-104,63,13],
    [-106,80,-146,43,15],[-112,76,-158,95,12],[-22,34,-67,3,12],[-34,-35,-86,-72,10],
  ];
  leaves.forEach(([x1,y1,x2,y2,w],i) => {
    const bendX = (x1 + x2) / 2 + (i % 2 ? 11 : -10);
    const bendY = (y1 + y2) / 2 - 6;
    marks.push(mark("foliage-" + i, [[x1,y1,.08,1.7],[bendX,bendY,.79,.65],[x2,y2,.05,2.1]],
      w, (i % 4 === 0 ? 0 : i % 3 === 0 ? 3 : 2) as AuthoredMark["tone"],
      .63 + (i % 4) * .08, .40 + (i % 5) * .12));
  });
  return marks;
}

/** Values and geometry are in paper coordinates. Any perspective/camera transform stays external. */
export function inkPosterSpec(
  aspect: InkAspect, subject: InkSubject, seed = 17,
  widthScale = 1, drynessScale = 1, loadScale = 1,
): InkBrushSpec {
  if (!["landscape", "portrait"].includes(aspect) || !["delta", "branch"].includes(subject))
    throw new RangeError("inkPosterSpec requires a known subject and 16:9/9:16 aspect.");
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647)
    throw new RangeError("Ink poster seed must be a nonnegative 31-bit integer.");
  for (const [name, value] of [["widthScale", widthScale], ["drynessScale", drynessScale], ["loadScale", loadScale]] as const)
    if (!Number.isFinite(value) || value < .5 || value > 1.5) throw new RangeError(name + " must be .5..1.5.");
  const portrait = aspect === "portrait", width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  const x0 = portrait ? 270 : 695, y0 = portrait ? 595 : 264, scale = portrait ? 1 : .92;
  const art = subject === "delta" ? deltaMarks() : branchMarks();
  const strokes: InkBrushStroke[] = art.map((s, i) => ({
    id: s.id, width: s.width * widthScale, tone: s.tone,
    load: Math.min(1, s.load * loadScale), dryness: Math.min(1, s.dryness * drynessScale),
    startFrame: 8 + i * 8, durationFrames: i < 6 ? 46 : 33,
    points: s.points.map(([x,y,pressure,pace]): InkBrushNode => ({
      x: x0 + x * scale, y: y0 + y * scale, pressure, pace: pace ?? 1,
    })),
  }));
  return { version: 1, width, height, paper: "#F2EFE4", seed, strokes };
}

const TONE = "#303B3C";
export function InkBrushPoster({
  aspect, subject, frame, seed = 17, widthScale = 1, drynessScale = 1,
  loadScale = 1, reducedMotion = false, paperTooth = .45,
}: InkPosterProps) {
  const spec = inkPosterSpec(aspect, subject, seed, widthScale, drynessScale, loadScale);
  const portrait = aspect === "portrait";
  const title = subject === "delta" ? ["THE", "DELTA", "FORMS"] : ["A", "QUIET", "BRANCH"];
  const subtitle = subject === "delta" ? "PATHWAYS OF WATER / STUDY 01" : "GROWTH AND GRAVITY / STUDY 02";
  const description = subject === "delta" ? "A single line branches into a landscape." : "A stem becomes a canopy of gestures.";
  const x = portrait ? 43 : 55, header = portrait ? 48 : 46;
  const ys = portrait ? [132,207,282] : [148,225,302];
  return <InkBrushCanvas spec={spec} frame={frame} reducedMotion={reducedMotion}
      paperTooth={paperTooth} label={"Ink brush study: " + title.join(" ")}>
    <g data-km-ink-poster-text="" fill={TONE} fontFamily="Arial,Helvetica,sans-serif">
      <rect x={x} y={header - 9} width={27} height={3} />
      <text x={x + 40} y={header} fontSize={12} letterSpacing={2.2} fontWeight={700}>INK FIELD NOTES   /   VOL. 01</text>
      <path d={"M" + x + " " + (header + 15) + "H" + (portrait ? 493 : 915)}
        fill="none" stroke={TONE} strokeWidth={.8} opacity={.42} />
      <g fontFamily="Georgia,Times New Roman,serif" fontSize={portrait ? 66 : 69} fontWeight={600} letterSpacing={-2.1}>
        {title.map((line, i) => <text key={line} x={x} y={ys[i]}>{line}</text>)}
      </g>
      <path d={"M" + x + " " + (portrait ? 304 : 320) + "h" + (portrait ? 330 : 312)}
        fill="none" stroke={TONE} strokeWidth={2.4}/>
      <text x={x} y={portrait ? 333 : 348} fontSize={12} fontWeight={700} letterSpacing={1.1}>{subtitle}</text>
      <text x={x} y={portrait ? 357 : 372} fontSize={portrait ? 11.5 : 11.8} letterSpacing={.15}>{description}</text>
      <path d={"M" + x + " " + (portrait ? 887 : 475) + "H" + (portrait ? 493 : 915)}
        stroke={TONE} strokeWidth={.8} opacity={.6} />
      <text x={x} y={portrait ? 913 : 501} fontSize={11} letterSpacing={1.4}>DEPOSIT / PRESSURE / PAPER</text>
      <text x={x} y={portrait ? 938 : 522} fontSize={10.5} letterSpacing={1.1}>ORIGINAL VECTOR INK · NO IMAGE FILTER</text>
      <text x={portrait ? 441 : 860} y={portrait ? 938 : 522} fontSize={10.5} letterSpacing={1.2}>{subject === "delta" ? "01 / 02" : "02 / 02"}</text>
    </g>
  </InkBrushCanvas>;
}
