/**
 * INK-FILM1 folk: full figures seen from behind or far off 寫意人物, for a person in a landscape. A swordsman on the height, a lady under an
 * oiled-paper umbrella. The face is turned away; the gesture is the drawing.
 *
 * Both are built the way a figure painter builds one: the body first (joints and contour read off a posed anatomical figure), then the cloth
 * from where it is held up — shoulder, elbow, waist, hip, knee — and from what moves it, wind or a step.
 */
import { inkFbm2 } from "../ink-riso-press";
import type { InkRisoPen, PenNode, PenPoint } from "../ink-riso-pen";
import { inkBloom, inkSide, inkThread } from "../ink-riso-wet";
import type { InkBloomOptions, InkSideOptions } from "../ink-riso-wet";
import { inkGap, inkSweep } from "../ink-riso-hair";
import type { InkGapShape, InkLockNode, InkSweepOptions } from "../ink-riso-hair";
import { inkRandom } from "./ink-brush-kit";
import { inkPaintOrder } from "./ink-cel";
import type { InkPart, InkSubject } from "./ink-cel";
import { inkPlates } from "./ink-pigments";
import type { InkPigment } from "./ink-pigments";
import { inkVeilShape } from "./ink-veil";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a || 1e-9))); return t * t * (3 - 2 * t); };
type Field = (x: number, y: number) => number;
type Tone = number | Field;
type Run = readonly PenPoint[];
/** Points with a pressure run along them: given few pressures, the rest are read between. */
const press = (q: Run, ...k: number[]): PenNode[] => q.map((r, i) => { const t = (i / (q.length - 1)) * (k.length - 1), j = Math.min(k.length - 2, Math.floor(t)); return [r[0], r[1], lerp(k[j], k[j + 1], t - j)] as const; });
/** Tone gathered at a place, long one way. */
const spot = (x: number, y: number, cx: number, cy: number, l: number, s: number, an = 0) => { const c = Math.cos(an), n = Math.sin(an), u = (x - cx) * c + (y - cy) * n, v = -(x - cx) * n + (y - cy) * c; return Math.exp(-((u / l) ** 2) - (v / s) ** 2); };
/** A strip of cloth along a path, `w` wide at full pressure: its outline. */
const strip = (q: readonly PenNode[], w: number): PenPoint[] => { const r = (k: 1 | -1) => q.map((v, i): PenPoint => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = (k * w * (v[2] ?? 1)) / 2; return [v[0] - ((b[1] - a[1]) / l) * d, v[1] + ((b[0] - a[0]) / l) * d]; }); return [...r(1), ...r(-1).reverse()]; };
/** A frame on the page's own units, made larger and tilted about a place. */
const about = (cx: number, cy: number, scale: number, rotate: number) => { const r = (rotate * Math.PI) / 180, c = Math.cos(r), n = Math.sin(r); return { x: cx - scale * (cx * c - cy * n), y: cy - scale * (cx * n + cy * c), scale, rotate }; };
/** Places on a cloth stretched between two of its edges: `u` across, 0 the first edge and 1 the second; `t` along, past 1 it goes on. */
const between = (a: Run, b: Run) => (u: number, t: number): PenPoint => { const n = a.length - 1, x = Math.max(0, Math.min(n - 1e-6, t * n)), i = Math.floor(x), f = x - i + Math.max(0, t - 1) * n, on = (q: Run, k: 0 | 1) => lerp(q[i][k], q[i + 1][k], f); return [lerp(on(a, 0), on(b, 0), u), lerp(on(a, 1), on(b, 1), u)]; };
/** Streaks that run the way a cloth falls: `x`, `y` upright, or round a point it is gathered at. */
const fall = (seed: number, wide = 26, long = 210): Field => (x, y) => inkFbm2(seed, (x + 0.12 * y) / wide, y / long, 2);
const run = (seed: number, degrees: number, wide = 22, long = 190): Field => { const r = (degrees * Math.PI) / 180, c = Math.cos(r), n = Math.sin(r); return (x, y) => inkFbm2(seed, (y * c - x * n) / wide + 40, (x * c + y * n) / long, 2); };
const fan = (seed: number, cx: number, cy: number, wide = 0.09, long = 200): Field => (x, y) => inkFbm2(seed, Math.atan2(y - cy, x - cx) / wide + 40, Math.hypot(x - cx, y - cy) / long, 2);

/** The brushes a figure is painted with, on one pen. Each call takes the next seed, so a part paints the same every time. */
function brushes(p: InkRisoPen, from: number, K = "ink") {
  let s = from;
  const loc = (fn: Tone) => (typeof fn === "number" ? fn : (X: number, Y: number) => Math.max(0, fn(...p.local(X, Y))));
  const side = (q: readonly PenNode[], w: number, o: Partial<InkSideOptions> & { tip: number; belly: number }, plate = K) => inkSide(p, plate, q, w, { bristles: Math.max(6, w * 0.62), ...o, seed: s++ });
  const wash = (plate: string, q: Run, tone: Tone, o: Partial<Omit<InkBloomOptions, "tone" | "soft">> & { soft?: Tone } = {}) => inkBloom(p, plate, p.shape(q), { wander: 1.4, wave: 50, fringe: 0.7, rim: 0.26, rimWidth: 3.5, mottle: 0.36, cloud: 70, ...o, tone: loc(tone), soft: loc(o.soft ?? 1), seed: s++ });
  return {
    /** Paper laid where a thing stands before others. */
    paper: (q: Run, amount: number | Field = 1) => inkVeilShape(p, p.shape(q), amount),
    wash, side,
    /** A thin line, pressed and let go. */
    th: (q: readonly PenNode[], w: number, ink = 0.86, end = ink * 0.55, plate = K) => inkThread(p, plate, q, w, { ink, inkEnd: end, tremor: 0.45, seed: s++ }),
    /** A contour: dark outside, going pale into the form. */
    edge: (q: readonly PenNode[], w: number, sd: 1 | -1 | 0, o: Partial<InkSideOptions> = {}, plate = K) => side(q, w, { tip: 0.95, belly: 0.14, side: sd, head: 0.3, rim: 0.12, dry: 0.05, dryEnd: 0.5, grain: 0.8, ...o }, plate),
    /** A fold: dark in its groove, nothing on its other side, dry where it runs out. */
    fold: (q: readonly PenNode[], w: number, sd: 1 | -1, o: Partial<InkSideOptions> = {}, plate = K) => side(q, w, { tip: 0.92, belly: 0.05, side: sd, head: 0.4, rim: 0.1, dry: 0.06, dryEnd: 0.85, grain: 1, ...o }, plate),
    /** A loaded brush laid on its side and drawn along the cloth, in colour and then in ink. */
    drag: (colour: string, q: readonly PenNode[], w: number, sd: 1 | -1, t: number, k: number, o: Partial<InkSideOptions> = {}) => { side(q, w, { tip: t, belly: 0.02, side: sd, head: 0.15, rim: 0.2, dry: 0.2, dryEnd: 1, bristles: w * 0.4, grain: 0.9, bleed: 1.4, ...o }, colour); side(q, w * 0.9, { tip: k, belly: 0, side: sd, head: 0.15, rim: 0.15, dry: 0.26, dryEnd: 1, bristles: w * 0.4, grain: 1.1, bleed: 1.4, ...o }); },
    /** A plane of wet cloth: colour and ink at a place, streaked the way it falls, its edge dried or lost. */
    water: (colour: string, q: Run, t: Field, k: Field, streak: Field, soft: Tone = 1, o: Partial<Omit<InkBloomOptions, "tone" | "soft">> = {}) => { const f = (fn: Field, g: Field): Field => (x, y) => fn(x, y) * (0.62 + 0.76 * g(x, y)); wash(colour, q, f(t, streak), { soft, wander: 2, wave: 50, rim: 0.34, rimWidth: 4, mottle: 0.3, cloud: 90, ...o }); wash(K, q, f(k, (x, y) => streak(x + 300, y + 90)), { soft, wander: 2, wave: 50, rim: 0.34, rimWidth: 4, mottle: 0.4, cloud: 70, ...o }); },
    /** Paper let into a dark place: a lit ridge, a parting. */
    gap: (plates: readonly string[], q: Run, w: number, shape: InkGapShape = t => Math.sin(Math.PI * t ** 0.7) ** 0.9) => inkGap(p, plates, q, w, shape),
    /** A ribbon: paper under it, then one loaded stroke. */
    ribbon: (plate: string, q: readonly PenNode[], w: number, o: Partial<InkSideOptions> = {}) => { inkVeilShape(p, p.shape(strip(q, w * 0.8))); side(q, w, { tip: 0.97, belly: 0.62, side: 1, head: 0.2, rim: 0.2, dry: 0.03, dryEnd: 0.4, ...o }, plate); },
    lock: (q: readonly InkLockNode[], o: Partial<InkSweepOptions> = {}) => inkSweep(p, K, q, { load: 0.96, root: 0.02, tip: 0.12, edge: [0.06, 0.06], hairs: 3, stray: 1.3, streak: 0.2, hairWidth: 1.2, ...o, seed: s++ }),
  };
}

export interface InkSwordsmanOptions { seed?: number; robe?: InkPigment; sash?: InkPigment; wind?: number; /** A few strokes of rock under his boots (default true). */ ground?: boolean }
/** A swordsman from behind, the wind from the left: a dark short-sleeved coat over a pale robe, hair tied high, a sword across his back. He stands at about [450, 1128]. */
export function inkSwordsman(o: InkSwordsmanOptions = {}): InkSubject {
  const W = 900, H = 1200, seed = o.seed ?? 1, robe = o.robe ?? "indigo", sash = o.sash ?? "cinnabar", wind = o.wind ?? 1, K = "ink", pigs: InkPigment[] = [...new Set<InkPigment>([robe, "peach", sash, "ink"])], all: string[] = pigs, at = (n: number) => seed * 1000 + n;
  // the head is drawn on the figure's own units, then made a little larger and lifted about the nape
  const HEAD = about(492, 270, 1.15, -4);
  const parts: InkPart[] = [
    { id: "ground", box: [270, 1040, 470, 158], draw: ({ page: p }) => {
      if (o.ground === false) return;
      const b = brushes(p, at(10)), lip: Run = [[306, 1148], [350, 1138], [400, 1140], [452, 1136], [500, 1126], [524, 1110], [552, 1104], [596, 1096], [638, 1076], [672, 1084], [702, 1108], [730, 1140]], st = run(seed + 7, 62, 22, 70);
      // a ledge: its lip drawn, its faces dry, its foot let go
      b.wash(K, [...lip, [716, 1180], [600, 1192], [470, 1190], [340, 1184]], (x, y) => (0.14 + 0.42 * ss(0.4, 0.78, st(x, y))) * ss(1186, 1110, y) * ss(300, 350, x) * ss(735, 690, x), { soft: (_x, y) => lerp(1.2, 16, ss(1120, 1160, y)), wander: 2 });
      b.side(press(lip.slice(0, 6), 0.2, 0.9, 0.7, 1, 0.5), 11, { tip: 0.9, belly: 0.2, side: -1, dry: 0.1, dryEnd: 0.6, grain: 1 }); b.side(press(lip.slice(5), 0.6, 1, 0.8, 1, 0.3), 12, { tip: 0.92, belly: 0.2, side: -1, dry: 0.06, dryEnd: 0.8, grain: 1 });
      b.side(press([[524, 1110], [512, 1140], [520, 1186]], 0.6, 1, 0.3), 34, { tip: 0.86, belly: 0.04, side: 1, dry: 0.3, dryEnd: 1, grain: 1.2 }); b.side(press([[690, 1098], [706, 1130], [694, 1184]], 0.5, 1, 0.3), 40, { tip: 0.7, belly: 0.04, side: -1, dry: 0.4, dryEnd: 1, grain: 1.2 });
      for (const [x, y, w] of [[708, 1106, 6], [718, 1116, 4], [312, 1140, 6], [300, 1148, 4], [512, 1114, 5]] as const) b.th([[x, y, 1], [x + 3, y + 2, 0.8]], w, 0.9, 0.8);
    } },
    { id: "arm", box: [310, 296, 140, 420], group: "torso", draw: ({ page: p }) => {
      const b = brushes(p, at(140)), hand: Run = [[358, 602], [390, 604], [394, 626], [400, 650], [402, 670], [398, 684], [394, 686], [390, 698], [385, 700], [380, 708], [374, 706], [366, 686], [358, 662], [354, 632]], q: Run = [[420, 304], [392, 309], [366, 320], [350, 342], [343, 376], [341, 412], [334, 452], [328, 490], [334, 530], [346, 576], [352, 608], [352, 608], [378, 620], [412, 636], [440, 652], [440, 652], [446, 600], [440, 540], [438, 500], [436, 460], [430, 420], [426, 380], [424, 340]], st = fall(seed + 15, 16, 150);
      b.paper(hand); b.wash("peach", hand, x => 0.08 + 0.14 * ss(376, 400, x), { soft: 0.8, wander: 0.1, fringe: 0.3, rim: 0.1 });
      b.th(press([[356, 612], [354, 634], [358, 662], [366, 686], [374, 705]], 0.5, 1, 0.8, 0.8), 2.2, 0.9, 0.8); b.th(press([[374, 705], [380, 708], [385, 700], [390, 698], [394, 686], [398, 684], [402, 670], [400, 650], [394, 626]], 0.7, 0.9, 0.7, 0.9, 1, 0.8, 0.4), 2.1, 0.9, 0.6); b.th(press([[372, 658], [379, 684], [384, 700]], 0.1, 0.8, 0.6), 1.5, 0.7); b.th(press([[383, 654], [389, 678], [390, 696]], 0.1, 0.8, 0.5), 1.5, 0.7); b.th(press([[392, 650], [396, 670], [395, 684]], 0.1, 0.8, 0.5), 1.5, 0.7);
      const white: Run = [[350, 596], [352, 618], [378, 632], [412, 648], [440, 664], [440, 640], [400, 616]]; b.paper(white); b.th(press([[352, 608], [353, 620], [378, 633], [412, 649], [440, 664]], 0.4, 0.9, 0.8, 0.5), 2.2); b.wash(K, white, (x) => 0.16 * ss(390, 440, x), { rim: 0.1 });
      b.paper(q);
      b.water(robe, q, x => 0.5 + 0.4 * ss(350, 410, x), (x, y) => 0.1 + 0.34 * ss(370, 408, x) + 0.46 * ss(404, 420, x) + 0.3 * ss(0.5, 0.74, st(x, y)), st, (x, y) => lerp(1, 3, ss(360, 345, x) * ss(400, 450, y)));
      b.drag(robe, press([[400, 330], [396, 400], [388, 470], [396, 540], [416, 630]], 0.4, 1, 1, 0.9), 40, -1, 0.92, 0.78, { dryEnd: 0.3 });
      b.gap(all, [[356, 360], [346, 420], [338, 480], [340, 540]], 5, t => Math.sin(Math.PI * t) ** 0.5); b.gap(all, [[370, 410], [364, 450], [352, 480]], 4); b.gap(all, [[404, 500], [384, 506], [358, 500]], 3); b.gap(all, [[366, 540], [372, 580], [384, 612]], 4);
      b.fold(press([[404, 478], [384, 492], [350, 494]], 0.7, 1, 0.1), 9, -1, { tip: 1 }); b.fold(press([[406, 512], [384, 520], [352, 514]], 0.7, 1, 0.1), 8, -1, { tip: 1 }); b.fold(press([[352, 520], [366, 570], [372, 612]], 0.3, 1, 0.5), 9, 1, { tip: 1 }); b.fold(press([[392, 530], [402, 580], [414, 630]], 0.3, 1, 0.5), 10, 1, { tip: 1 });
      b.edge(press([[420, 304], [392, 309], [366, 320], [350, 342], [343, 376], [341, 412], [334, 452], [328, 490]], 0.3, 0.9, 1, 0.8, 0.9, 0.4), 8, -1); b.edge(press([[328, 490], [334, 530], [346, 576], [352, 608]], 0.4, 1, 0.8, 0.6), 8, 1, { dry: 0.2 });
      const band: Run = [[348, 588], [352, 608], [378, 620], [412, 636], [440, 652], [436, 634], [408, 618], [376, 602]]; b.wash(K, band, 0.8, { wander: 0.4 }); b.gap(all, [[348, 586], [376, 600], [408, 616], [434, 630]], 1.8, () => 0.8);
    } },
    { id: "boots", box: [370, 960, 290, 190], draw: ({ page: p }) => {
      const b = brushes(p, at(40));
      const boot = (q: Run, sole: Run, line: readonly PenNode[]) => { b.paper(q); b.paper(sole); b.wash(K, q, 0.93, { wander: 0.5, rim: 0.2, mottle: 0.14 }); b.th(line, 2.8, 0.9, 0.7); };
      boot([[540, 960], [600, 960], [594, 1004], [588, 1030], [597, 1046], [615, 1050], [638, 1042], [638, 1042], [636, 1054], [612, 1070], [576, 1084], [540, 1088], [531, 1077], [539, 1044], [538, 1000]], [[533, 1082], [540, 1088], [576, 1084], [612, 1070], [637, 1052], [640, 1060], [615, 1080], [578, 1095], [541, 1100], [531, 1094]], press([[530, 1093], [541, 1101], [578, 1096], [615, 1081], [641, 1061]], 0.6, 1, 0.9, 0.4));
      boot([[390, 960], [452, 960], [447, 1010], [441, 1054], [451, 1070], [468, 1078], [490, 1074], [490, 1074], [489, 1086], [470, 1100], [442, 1112], [403, 1122], [391, 1110], [398, 1072], [392, 1020]], [[391, 1112], [403, 1122], [442, 1112], [470, 1100], [490, 1085], [493, 1093], [473, 1108], [444, 1122], [404, 1135], [389, 1126]], press([[388, 1124], [404, 1136], [444, 1123], [473, 1109], [494, 1094]], 0.6, 1, 0.9, 0.4));
      b.gap([K], [[404, 1002], [404, 1050], [400, 1096]], 4.4, "leaf"); b.gap([K], [[446, 1076], [462, 1084], [480, 1080]], 2.6); b.gap([K], [[400, 1066], [420, 1074], [438, 1064]], 1.8); b.gap([K], [[552, 1006], [550, 1046], [542, 1072]], 3.2, "leaf"); b.gap([K], [[598, 1054], [612, 1058], [626, 1054]], 2.2); b.gap([K], [[542, 1042], [562, 1050], [584, 1038]], 1.6);
    } },
    { id: "skirt", box: [360, 510, 500, 560], motion: [{ kind: "sway", from: [470, 560], to: [660, 1010], amount: 13 * wind, seconds: 3.6, lag: 0.45, power: 1.8, gust: 0.4 }], draw: ({ page: p }) => {
      const b = brushes(p, at(60)), hem: Run = [[388, 996], [398, 1014], [436, 1024], [490, 1038], [540, 1034], [556, 1008], [556, 1008], [584, 1030], [640, 1030], [690, 1004], [694, 976], [694, 976], [742, 980], [788, 944], [822, 884]];
      const q: Run = [[434, 528], [434, 528], [420, 570], [410, 612], [402, 680], [400, 760], [403, 830], [398, 880], [390, 930], [388, 996], ...hem, [822, 884], [740, 846], [672, 770], [628, 690], [596, 610], [566, 530], [566, 530]], st = fall(seed + 6, 18, 300);
      b.paper(q);
      const under = (x: number, y: number) => y - lerp(548, 900, (x - 486) / 282);   // below the coat's lower edge, 0 on it
      b.wash(robe, q, (x, y) => 0.34 * Math.exp(-((Math.max(0, under(x, y) - 6) / 70) ** 2)) + 0.36 * ss(0.3, 0.75, st(x, y)) * ss(840, 1030, y) ** 1.4 + 0.12 * spot(x, y, 520, 850, 200, 28, 1.4) + 0.1 * spot(x, y, 640, 900, 120, 22, 1.15), { rim: 0.06, fringe: 1 });
      b.wash(K, q, (x, y) => 0.3 * Math.exp(-((Math.max(0, under(x, y) - 4) / 36) ** 2)) + 0.16 * ss(0.4, 0.8, st(x + 80, y)) * ss(880, 1030, y) + 0.16 * spot(x, y, 510, 860, 180, 15, 1.4) + 0.12 * spot(x, y, 636, 900, 110, 13, 1.15), { rim: 0.06, fringe: 1 });
      for (const w of [[[556, 1008], [540, 950], [566, 990], [584, 1029]], [[694, 976], [664, 918], [710, 950], [742, 979]]] as const) b.wash(K, w, (_x, y) => 0.1 + 0.46 * ss(w[1][1], w[3][1], y), { soft: 1.4, wander: 0.4, rim: 0.2 });
      b.edge(press([[434, 534], [420, 570], [409, 612], [401, 680], [399, 760], [403, 826]], 0.4, 0.9, 1, 0.9, 0.5, 0.2), 10, 1, { dry: 0.06, dryEnd: 0.7 }); b.edge(press([[403, 806], [402, 846], [396, 890], [388, 940], [387, 1000]], 0.15, 0.9, 1, 0.9, 0.5), 11, 1, { dry: 0.2 });
      b.fold(press([[468, 586], [486, 690], [500, 790], [524, 900], [556, 1008]], 0.3, 1, 0.8, 1, 0.5), 16, 1, { dryEnd: 0.5 }); b.fold(press([[416, 596], [440, 680], [462, 770], [476, 890], [480, 980]], 0.3, 1, 0.7, 0.5, 0.05), 14, 1); b.fold(press([[404, 822], [420, 850], [432, 900], [440, 960]], 0.5, 1, 0.6, 0.05), 11, 1);
      b.fold(press([[584, 780], [614, 850], [656, 920], [694, 976]], 0.1, 0.8, 1, 0.6), 15, 1, { dryEnd: 0.4 }); b.fold(press([[540, 690], [570, 790], [604, 880], [640, 960]], 0.2, 0.9, 0.8, 0.05), 13, 1); b.fold(press([[660, 850], [710, 908], [760, 940]], 0.2, 0.8, 0.05), 11, 1);
      for (const g of [[[444, 552], [442, 580], [430, 610]], [[464, 554], [470, 596]], [[486, 556], [500, 606], [512, 660]], [[454, 552], [456, 570]]] as const) b.fold(press([...g] as unknown as Run, 0.9, 0.8, 0.05), 9, 1);
      b.th(press([[586, 1028], [586, 980], [572, 930]], 0.9, 0.6, 0.05), 2.4); b.th(press([[742, 978], [730, 940], [700, 900]], 0.9, 0.6, 0.05), 2.2);
      b.edge(press(hem.slice(0, 4), 0.4, 1, 0.4), 4.6, 0, { tip: 0.86, belly: 0.5, dryEnd: 0.8 }); b.edge(press(hem.slice(3, 6), 0.2, 0.9, 0.5), 5, 0, { tip: 0.9, belly: 0.6, dryEnd: 0.3 }); b.edge(press(hem.slice(6, 9), 0.6, 1, 0.3), 5, 0, { tip: 0.9, belly: 0.6, dryEnd: 0.7 }); b.edge(press(hem.slice(8, 11), 0.3, 0.9, 0.5), 4.6, 0, { tip: 0.9, belly: 0.6, dryEnd: 0.4 }); b.edge(press(hem.slice(11), 0.5, 1, 0.6), 5, 0, { tip: 0.9, belly: 0.6, dryEnd: 0.3 });
    } },
    { id: "flap", box: [430, 500, 460, 430], motion: [{ kind: "sway", from: [530, 540], to: [820, 760], amount: 22 * wind, seconds: 3, lag: 0.55, power: 1.5, gust: 0.55 }], draw: ({ page: p }) => {
      const b = brushes(p, at(80)), on = between([[560, 520], [600, 552], [660, 600], [730, 636], [800, 650], [866, 632]], [[486, 540], [530, 640], [584, 732], [648, 812], [712, 874], [762, 908]]), st = fan(seed + 8, 490, 480, 0.05, 260), along = (u: number, t0: number, t1: number, n = 7, bow = 0) => Array.from({ length: n }, (_, i): PenPoint => { const f = i / (n - 1); return on(u + bow * Math.sin(Math.PI * f), lerp(t0, t1, f)); });
      // the coat's skirt in three planes, the lowest first; the wind turns a little of the lining out along each hem
      const plane = (u0: number, u1: number, tip: PenPoint, hem: Run, end: number, tone: number, dark: number) => {
        const a = along(u0, 0, 0.94), z = along(u1, 0, end), q: Run = [...a, tip, tip, ...hem, z[6], ...[...z].reverse()], inner: Run = hem.map(([x, y], i): PenPoint => { const k = 13 * Math.sin((Math.PI * (i + 1)) / (hem.length + 1)) ** 0.7; return [x - 0.86 * k, y - 0.4 * k]; });
        b.paper(q);
        b.water(robe, q, () => tone, (x, y) => dark * (0.3 + 0.9 * ss(0.42, 0.7, st(x, y))) + 0.3 * ss(130, 50, Math.hypot(x - 500, y - 500)), st);
        for (const [f, w, sd, e] of [[0.12, 40, -1, 0.9], [0.4, 52, 1, 0.94], [0.64, 50, -1, 0.86], [0.88, 36, 1, 0.9]] as const) b.drag(robe, press(along(lerp(u0, u1, f), 0.04, lerp(0.96, end, f) * e, 8, 0.02), 0.3, 1, 1, 0.9, 0.7), w, sd, 0.92, 0.6 + 0.36 * dark, { dry: 0.1, dryEnd: 0.8, bristles: 14, grain: 1.2 });
        b.gap(all, [tip, ...inner, z[6]], 5, t => Math.sin(Math.PI * t) ** 0.4); const edge: Run = [tip, ...hem, z[6]]; b.paper([...edge, ...[...inner].reverse()]); b.wash(robe, [...edge, ...[...inner].reverse()], 0.12, { wander: 0.2, rim: 0.2 }); b.edge(press(edge, 0.6, 1, 0.7, 0.4), 4.4, 0, { tip: 0.95, belly: 0.6, dryEnd: 0.4 }); b.th(press(inner, 0.5, 0.9, 0.5), 1.8, 0.8, 0.5);
      };
      plane(0.7, 1, [806, 832], [[794, 858], [776, 872], [770, 894]], 0.985, 0.8, 0.56); plane(0.36, 0.72, [846, 738], [[826, 764], [802, 776], [792, 806]], 0.92, 0.94, 0.95); plane(0, 0.38, [868, 632], [[856, 662], [828, 676], [820, 708]], 0.93, 0.9, 0.72);
      b.gap(all, along(0.372, 0.1, 0.95), 5); b.gap(all, along(0.715, 0.06, 0.95), 6); b.gap(all, along(0.14, 0.2, 0.7), 2.6); b.gap(all, along(0.55, 0.3, 0.8), 2.2); b.gap(all, along(0.86, 0.3, 0.7), 2);
      b.fold(press(along(0.395, 0.1, 0.9).reverse(), 0.5, 1, 0.8, 0.1), 11, 1, { tip: 1 }); b.fold(press(along(0.735, 0.06, 0.9).reverse(), 0.5, 1, 0.8, 0.1), 12, 1, { tip: 1 });
      b.edge(press(along(0, 0.02, 0.98), 0.4, 0.9, 0.7, 1, 0.6), 7, -1, { dryEnd: 0.3 }); b.edge(press(along(1, 0.04, 0.99), 0.3, 0.8, 0.9, 0.6), 6, 1, { dryEnd: 0.6 });
    } },
    { id: "robe", box: [390, 280, 320, 350], group: "torso", motion: [{ kind: "breathe", at: [490, 520], amount: 0.008, seconds: 4.4 }], draw: ({ page: p }) => {
      const b = brushes(p, at(160)), q: Run = [[442, 297], [480, 306], [516, 301], [546, 308], [580, 318], [594, 340], [584, 376], [570, 404], [562, 440], [566, 480], [564, 518], [564, 518], [500, 528], [432, 518], [432, 518], [429, 476], [422, 440], [410, 404], [402, 370], [398, 336], [404, 314], [418, 306]];
      b.paper(q);
      const st = fall(seed + 12, 24, 150), side: Run = [[560, 396], [584, 410], [604, 462], [628, 526], [664, 586], [690, 616], [620, 590], [566, 530], [556, 470]];
      b.paper(side); b.wash(robe, side, 0.9, { wander: 0.4 }); b.wash(K, side, (x) => 0.5 + 0.34 * ss(640, 570, x), { wander: 0.4 });
      b.water(robe, q, (x, y) => 0.6 + 0.36 * ss(480, 600, x) - 0.14 * spot(x, y, 450, 380, 46, 26), (x, y) => 0.14 + 0.46 * ss(510, 590, x) + 0.24 * ss(440, 520, y), st);
      b.drag(robe, press([[574, 322], [568, 400], [556, 470], [548, 524]], 0.3, 1, 0.9, 0.7), 66, -1, 0.92, 0.9, { dryEnd: 0.3 }); b.drag(robe, press([[488, 316], [494, 400], [486, 520]], 0.2, 0.9, 0.7), 40, -1, 0.7, 0.54, { dryEnd: 0.7 }); b.drag(robe, press([[416, 330], [428, 420], [440, 516]], 0.4, 0.9, 0.7), 34, 1, 0.8, 0.5, { dryEnd: 0.7 });
      b.gap(all, [[405, 330], [408, 372], [420, 430], [428, 490]], 4, t => Math.sin(Math.PI * t) ** 0.5); b.gap(all, [[440, 470], [452, 500], [462, 518]], 3); b.gap(all, [[540, 440], [524, 490], [512, 520]], 3.4);
      b.fold(press([[418, 430], [444, 474], [478, 510]], 0.4, 1, 0.1), 13, 1, { tip: 1 }); b.fold(press([[430, 480], [448, 504], [468, 518]], 0.4, 1, 0.2), 9, 1, { tip: 1 }); b.fold(press([[562, 424], [536, 474], [508, 516]], 0.4, 1, 0.2), 14, -1, { tip: 1 }); b.fold(press([[412, 412], [446, 410], [478, 424]], 0.6, 0.8, 0.1), 9, 1, { tip: 0.98 });
      b.edge(press([[418, 306], [404, 310]], 0.6, 0.3), 5, 0, { tip: 0.95 }); b.edge(press([[516, 301], [546, 308], [580, 318]], 0.3, 0.9, 0.6), 7, -1);
      b.edge(press([[408, 400], [422, 440], [429, 476], [432, 516]], 0.4, 0.9, 0.6), 6, 1); b.edge(press([[570, 404], [562, 440], [566, 480], [564, 516]], 0.4, 0.9, 0.6), 6, -1);
    } },
    { id: "sleeve", box: [540, 300, 320, 350], group: "torso", motion: [{ kind: "sway", from: [600, 410], to: [820, 520], amount: 14 * wind, seconds: 2.9, lag: 0.5, power: 1.8, gust: 0.5 }], draw: ({ page: p }) => {
      const b = brushes(p, at(120)), top: Run = [[566, 308], [596, 317], [614, 336], [628, 366], [648, 400], [684, 430], [738, 449], [790, 452], [840, 434]], mouth: Run = [[840, 434], [824, 466], [826, 500], [812, 532], [786, 548], [764, 576], [732, 594], [700, 622]], low: Run = [[700, 622], [662, 580], [628, 526], [606, 470], [584, 424], [566, 388]], q: Run = [...top, ...mouth, ...low, [556, 344]], st = run(seed + 18, 34, 20, 170);
      // the white under-sleeve, past the mouth
      const white: Run = [[832, 500], [826, 536], [806, 574], [786, 584], [770, 612], [738, 630], [706, 648], [700, 622], [760, 560]]; b.paper(white); b.wash(K, white, (x, y) => 0.14 * ss(0, -14, 0.6 * (x - 780) + 0.8 * (y - 590)), { rim: 0.1 }); b.th(press([[829, 508], [826, 536], [806, 574], [786, 584], [770, 612], [738, 630], [706, 648]], 0.3, 0.9, 0.7, 1, 0.5), 2.4); b.th(press([[786, 584], [772, 568]], 0.7, 0.2), 1.8); b.th(press([[738, 630], [736, 604]], 0.7, 0.2), 1.8);
      b.paper(q);
      b.water(robe, q, (x, y) => 0.74 + 0.2 * st(x, y) - 0.24 * spot(x, y, 700, 480, 90, 20, 0.4), (x, y) => 0.22 + 0.5 * ss(0.5, 0.74, st(x, y)) + 0.3 * ss(600, 566, x), st);
      b.drag(robe, press([[590, 330], [622, 400], [690, 450], [800, 470]], 0.4, 1, 0.9, 0.6), 40, -1, 0.92, 0.66, { dryEnd: 0.8 }); b.drag(robe, press([[580, 390], [626, 500], [690, 570], [730, 590]], 0.4, 1, 0.9, 0.5), 44, 1, 0.94, 0.9, { dryEnd: 0.5 }); b.drag(robe, press([[610, 440], [670, 500], [740, 530], [804, 530]], 0.3, 1, 1, 0.5), 44, 1, 0.9, 0.8, { dryEnd: 0.6 });
      b.gap(all, [[612, 420], [660, 470], [730, 496], [810, 492]], 6); b.gap(all, [[616, 480], [660, 530], [710, 560], [764, 566]], 5); b.gap(all, [[600, 352], [626, 400], [680, 446]], 3.4);
      b.fold(press([[812, 500], [740, 508], [668, 488], [616, 436]], 0.5, 1, 0.8, 0.1), 10, 1, { tip: 1 }); b.fold(press([[768, 574], [712, 570], [660, 540], [618, 490]], 0.5, 1, 0.8, 0.1), 10, 1, { tip: 1 });
      const band: Run = [...mouth, [692, 610], [724, 583], [754, 565], [778, 538], [802, 524], [815, 498], [813, 468], [828, 440]]; b.wash(K, band, (x, y) => 0.84 + 0.1 * ss(0.4, 0.65, inkFbm2(seed + 9, x / 16, y / 16, 2)), { wander: 0.6 }); b.gap(all, [[826, 440], [811, 468], [813, 498], [800, 522], [776, 535], [752, 562], [722, 580], [690, 607]], 2, t => 0.4 + 0.6 * Math.sin(Math.PI * t)); b.wash(robe, band, 0.4, { wander: 0.6 });
      b.edge(press(top, 0.3, 0.9, 1, 0.6, 0.9, 0.5), 9, -1); b.edge(press([...low].reverse(), 0.3, 1, 0.8, 1, 0.5), 8, 1);
      b.gap(all, [[562, 366], [570, 396], [584, 424], [606, 470]], 3.4, t => Math.sin(Math.PI * t) ** 0.6);
    } },
    { id: "sword", box: [270, 130, 380, 560], group: "torso", draw: c => {
      const p = c.pens({ s: { x: 296, y: 170, scale: 1, rotate: 56 } }).s, b = brushes(p, at(200));
      // along the sword: pommel at 0, guard at 112, scabbard to 556
      const sheath: Run = [[120, -11], [120, -11], [330, -11], [520, -9.5], [552, -8], [558, 0], [552, 8], [520, 9.5], [330, 11], [120, 11], [120, 11]];
      b.paper([[112, -14], [112, -14], [330, -13.5], [540, -12], [561, -5], [561, 5], [540, 12], [330, 13.5], [112, 14], [112, 14]]);
      b.wash(K, sheath, (x, y) => 0.98 - 0.3 * ss(-2, 11, y) + 0.1 * (fan(seed + 2, -200, 0, 0.01, 90)(x, y) - 0.5), { wander: 0.3, rim: 0.2 }); b.gap([K], [[150, -5.5], [300, -5.8], [510, -4.5]], 2.4, t => Math.sin(Math.PI * t) ** 0.6);
      for (const [x, w] of [[122, 16], [256, 9], [396, 9], [530, 24]] as const) { const m: Run = [[x, -12], [x, -12], [x + w, -12], [x + w, -12], [x + w, 12], [x + w, 12], [x, 12], [x, 12]]; b.paper(m); b.wash(K, m, (_x, y) => 0.1 + 0.6 * ss(-4, 12, y), { wander: 0.2, fringe: 0.3 }); b.th([[x, -12, 0.8], [x, 12, 0.8]], 1.8); b.th([[x + w, -12, 0.8], [x + w, 12, 0.8]], 1.8); }
      const grip: Run = [[14, -8], [14, -8], [60, -9], [106, -8], [106, -8], [106, 8], [106, 8], [60, 9], [14, 8], [14, 8]]; b.paper(grip); b.wash(K, grip, (_x, y) => 0.94 - 0.2 * ss(0, -8, y), { wander: 0.3 }); for (let i = 0; i < 6; i++) { b.gap([K], [[18 + i * 15, -8], [30 + i * 15, 8]], 1.8, () => 0.8); b.gap([K], [[30 + i * 15, -8], [18 + i * 15, 8]], 1.8, () => 0.8); }
      const guard: Run = [[106, -13], [108, -24], [116, -29], [123, -21], [124, 0], [123, 21], [116, 29], [108, 24], [106, 13]]; b.paper(guard); b.wash(K, guard, (_x, y) => 0.16 + 0.6 * ss(-8, 24, y), { wander: 0.3, rim: 0.5 }); b.th(press([...guard, guard[0]], 0.8, 1, 0.8), 2.2); b.th(press([[114, -22], [116, 0], [114, 20]], 0.2, 0.9, 0.2), 1.6, 0.6);
      const pommel: Run = [[14, -9], [5, -12], [-4, -9], [-8, 0], [-4, 9], [5, 12], [14, 9]]; b.paper(pommel); b.wash(K, pommel, (_x, y) => 0.14 + 0.6 * ss(-2, 12, y), { wander: 0.2, rim: 0.4 }); b.th(press([...pommel, pommel[0]], 0.8, 1, 0.8), 2);
    } },
    { id: "tassel", box: [270, 120, 190, 170], group: "torso", motion: [{ kind: "sway", from: [296, 170], to: [384, 220], amount: 10 * wind, seconds: 2.3, lag: 0.5, power: 1.4, gust: 0.5 }], draw: ({ page: p }) => {
      const b = brushes(p, at(240)), r = inkRandom(seed + 30);
      b.th(press([[293, 164], [308, 146], [334, 142], [352, 158]], 0.8, 1, 0.8), 2.4, 0.95, 0.9, sash);
      for (let i = 0; i < 14; i++) { const u = i / 13 - 0.5; b.th([[357, 166, 0.7], [370 + r.in(-3, 4) - u * 8, 188 + u * 8, 1], [383 + r.in(-5, 8) - u * 18, 220 + u * 10 + r.in(-9, 6), 0.25]], 2.2, 0.92, 0.7, sash); } b.wash(sash, [[349, 154], [358, 154], [363, 163], [360, 172], [352, 170]], 0.97, { wander: 0.2 }); b.th([[352, 168, 0.8], [362, 164, 0.8]], 1.6, 0.8);
    } },
    { id: "belt", box: [420, 490, 160, 80], group: "torso", draw: ({ page: p }) => {
      const b = brushes(p, at(260)), q: Run = [[429, 506], [429, 506], [498, 520], [567, 508], [567, 508], [570, 540], [570, 540], [498, 554], [430, 540], [430, 540]];
      b.paper(q); b.wash(K, q, (x, y) => 0.9 + 0.1 * (fan(seed + 4, 490, -400, 0.01, 60)(x, y) - 0.5) - 0.2 * spot(x, y, 462, 530, 18, 30), { wander: 0.6 }); b.gap([K], [[432, 511], [498, 525], [566, 513]], 2, t => 0.3 + 0.7 * Math.sin(Math.PI * t)); b.gap([K], [[432, 536], [498, 550], [560, 539]], 1.6, t => 0.2 + 0.8 * Math.sin(Math.PI * t));
      b.ribbon(sash, press([[428, 522], [460, 530], [498, 535], [536, 531], [570, 522]], 0.8, 1, 0.9, 1, 0.8), 6, { side: 0, belly: 0.8 });
    } },
    { id: "tails", box: [520, 490, 330, 330], motion: [{ kind: "sway", from: [560, 525], to: [760, 680], amount: 24 * wind, seconds: 2.6, lag: 0.6, power: 1.5, gust: 0.6 }], draw: ({ page: p }) => {
      const b = brushes(p, at(280)); for (const [q, w] of [[[[562, 522], [590, 574], [636, 600], [676, 656], [734, 684], [770, 730]], 9], [[[564, 522], [598, 552], [640, 566], [690, 600], [752, 606], [806, 640]], 11]] as const) b.ribbon(sash, press(q as unknown as Run, 0.6, 1, 0.8, 1, 0.5), w); b.ribbon(sash, press([[556, 514], [572, 510], [578, 524], [566, 534], [556, 528]], 0.8, 1, 0.8), 8);
    } },
    { id: "head", box: [390, 110, 190, 220], group: "head", draw: c => {
      const p = c.pens({ h: HEAD }).h, b = brushes(p, at(300));
      const neck: Run = [[454, 244], [457, 274], [450, 289], [436, 298], [470, 308], [500, 308], [524, 302], [514, 294], [510, 281], [515, 273], [523, 268], [512, 252], [503, 240], [497, 228], [480, 234], [462, 238]], face: Run = [[505, 180], [530, 176], [535, 183], [537.5, 195], [538, 203], [537, 208], [541, 214], [546, 221], [549.5, 228], [545, 231.5], [547, 238.5], [545, 243], [546, 248], [544.5, 253], [545.5, 261], [540, 268], [531, 272], [520, 268], [508, 250], [498, 236], [494, 210]];
      b.paper(neck); b.paper(face);
      b.wash("peach", neck, x => 0.05 + 0.1 * ss(490, 516, x), { soft: 1, wander: 0, fringe: 0, rim: 0 }); b.wash(K, neck, (x, y) => 0.02 + 0.2 * spot(x, y, 512, 274, 26, 7, 0.5) + 0.1 * ss(474, 452, x) + 0.1 * ss(264, 252, y), { soft: 1, wander: 0, fringe: 0, rim: 0 });
      b.wash("peach", face, (x, y) => 0.05 + 0.1 * spot(x, y, 526, 230, 12, 10), { soft: 1, wander: 0, fringe: 0, rim: 0 }); b.wash(K, face, (x, y) => 0.1 * spot(x, y, 514, 256, 22, 6, 0.75), { soft: 1, wander: 0, fringe: 0, rim: 0 });
      b.th([[531, 176, 0.4], [535, 183, 0.9], [537.5, 195, 1], [538, 203, 0.8], [537, 208, 0.7], [541, 214, 0.9], [546, 221, 1], [549.5, 228, 1], [545, 231.5, 0.7]], 1.8, 0.88, 0.8); b.th([[545, 231.5, 0.6], [547, 238.5, 0.8], [545, 243, 0.8], [546, 248, 0.8], [544.5, 253, 0.7], [545.5, 261, 1], [540, 268, 1], [531, 272, 1], [520, 267, 0.9], [510, 254, 0.6], [503, 243, 0.1]], 1.9, 0.88, 0.6);
      b.th([[539, 197, 0.5], [531, 195, 1], [522, 199, 0.2]], 3, 0.92, 0.6); b.th([[538, 207, 1], [534, 207, 0.9], [529, 210, 0.2]], 2, 0.92, 0.6); b.th([[545, 243, 0.8], [540, 243, 0.1]], 1.3, 0.7, 0.3);
      b.th([[513, 270, 0.1], [510, 281, 0.9], [512, 292, 1], [520, 301, 0.5]], 2, 0.84, 0.6); b.th([[456, 252, 0.3], [457, 274, 1], [451, 289, 0.9], [439, 297, 0.4]], 2.2, 0.86, 0.6); b.th([[496, 254, 0.1], [492, 276, 0.7], [486, 296, 0.1]], 1.4, 0.36, 0.2);
      const hair: Run = [[532, 177], [526, 186], [521, 196], [518, 208], [514, 219], [511, 214], [506, 209], [498, 211], [493, 220], [493, 232], [488, 242], [478, 250], [466, 256], [455, 253], [444, 242], [431, 228], [425, 206], [428, 182], [440, 162], [460, 150], [484, 147], [508, 152], [524, 164]];
      b.paper(hair); b.wash(K, hair, 0.9, { wander: 0.5, rim: 0.1, mottle: 0.2, soft: (_x, y) => 0.9 + 3 * ss(236, 252, y) });
      // combed from the hairline up to the crown
      for (const q of [[[440, 240, 4], [429, 212, 5], [434, 182, 6], [458, 154, 5]], [[454, 260, 5], [440, 224, 7], [442, 186, 7], [462, 154, 5]], [[470, 263, 6], [456, 226, 8], [454, 188, 8], [464, 154, 5]], [[486, 256, 6], [474, 224, 9], [466, 188, 8], [467, 154, 5]], [[494, 236, 4], [488, 208, 7], [478, 180, 7], [470, 154, 5]], [[513, 226, 2], [512, 204, 6], [496, 176, 7], [473, 153, 5]], [[528, 188, 4], [516, 174, 7], [498, 160, 6], [476, 152, 4]], [[530, 172, 2], [512, 158, 5], [492, 151, 4], [476, 150, 3]]] as const) b.lock(q as unknown as InkLockNode[], { load: 0.95, root: 0.2, tip: 0.02, streak: 0.5, hairs: 3, stray: 1.2, hairWidth: 1.2, cover: 0.3 });
      for (const [g, w] of [[[[446, 238], [436, 214], [440, 184], [456, 158]], 1.8], [[[460, 246], [451, 214], [455, 182], [464, 158]], 1.2], [[[516, 206], [507, 188], [494, 170], [478, 157]], 1.4], [[[525, 178], [514, 167], [496, 158], [480, 154]], 1.3], [[[490, 224], [482, 200], [474, 176], [468, 158]], 0.8]] as const) b.gap([K], g as unknown as Run, w, "leaf");
      const r = inkRandom(seed + 41); for (let i = 0; i < 9; i++) { const u = i / 8, x = lerp(456, 492, u), y = 258 + 6 * Math.sin(Math.PI * u) - 10 * u; b.th([[x, y - 8, 0.8], [x + r.in(0, 3), y + r.in(1, 6), 0.1]], 1.5, 0.9, 0.5); } b.th([[460, 260, 0.7], [470, 268, 0.6], [484, 270, 0.1]], 1.3, 0.85, 0.5); b.th([[462, 262, 0.6], [474, 276, 0.6], [494, 280, 0.1]], 1.1, 0.8, 0.4); b.th([[520, 192, 0.5], [520, 212, 0.9], [526, 236, 0.5], [536, 256, 0.1]], 1.4, 0.9, 0.5); b.th([[519, 200, 0.5], [517, 222, 0.8], [520, 244, 0.1]], 1.2, 0.9, 0.5);
      const ear: Run = [[496, 216], [502, 213], [507, 218], [506, 229], [503, 239], [499, 241], [495, 232]]; b.paper(ear); b.wash("peach", ear, 0.16, { soft: 0.6, wander: 0, fringe: 0.2, rim: 0.3 }); b.th([[497, 218, 0.4], [503, 214, 1], [508, 219, 1], [506, 230, 0.9], [502, 241, 0.6], [498, 240, 0.2]], 1.6, 0.84, 0.5); b.th([[500, 221, 0.4], [504, 227, 0.8], [500, 235, 0.3]], 1.2, 0.5, 0.3);
      const under: Run = [[440, 291], [448, 287], [470, 299], [500, 299], [514, 289], [522, 295], [506, 308], [480, 312], [454, 306]], band: Run = [[428, 301], [428, 301], [440, 294], [456, 304], [482, 310], [508, 306], [522, 296], [532, 300], [532, 300], [512, 313], [482, 318], [452, 312]];
      b.paper(under); b.th(press([[442, 290], [456, 299], [480, 304], [502, 300], [515, 290]], 0.4, 1, 0.8, 0.4), 1.6); b.paper(band); b.wash(K, band, 0.95, { wander: 0.3 }); b.th(press([[440, 294], [456, 304], [482, 310], [508, 306], [522, 296]], 0.5, 1, 0.9, 0.5), 2, 0.9, 0.8, sash);
    } },
    { id: "hair", box: [420, 20, 478, 330], motion: [{ kind: "sway", from: [456, 120], to: [780, 170], amount: 26 * wind, seconds: 3, lag: 0.6, power: 1.5, gust: 0.55 }], draw: ({ page: p }) => {
      const b = brushes(p, at(400)), soft = { edge: [0.22, 0.22], tip: 0.34, hairs: 7, stray: 1.5, streak: 0.36, over: 26, loadEnd: 0.8, hairWidth: 1.1 } as const;
      b.lock([[461, 134, 4], [490, 114, 9], [552, 130, 11], [610, 172, 9], [654, 226, 6], [682, 284, 0]], soft); b.lock([[460, 132, 4], [486, 108, 9], [556, 118, 10], [626, 168, 8], [684, 232, 5], [724, 306, 0]], soft);
      b.lock([[456, 130, 4], [470, 82, 7], [540, 56, 9], [616, 62, 8], [690, 84, 5], [764, 80, 0]], soft); b.lock([[456, 130, 4], [474, 88, 8], [546, 68, 9], [640, 84, 8], [730, 116, 5], [812, 104, 0]], soft);
      b.lock([[459, 132, 6], [478, 106, 13], [544, 104, 15], [618, 148, 14], [690, 206, 10], [752, 244, 5], [806, 264, 0]], soft); b.lock([[458, 132, 6], [474, 100, 14], [544, 92, 17], [628, 132, 16], [712, 186, 11], [784, 222, 6], [850, 232, 0]], soft);
      b.lock([[457, 132, 6], [470, 96, 13], [538, 82, 16], [616, 104, 17], [704, 150, 13], [786, 172, 7], [856, 164, 0]], soft); b.lock([[456, 132, 6], [468, 90, 13], [534, 72, 15], [612, 86, 16], [698, 126, 12], [784, 140, 6], [866, 118, 0]], soft);
      b.gap([K], [[660, 156], [716, 182], [784, 206], [840, 216]], 4, "leaf"); b.gap([K], [[470, 100], [540, 88], [620, 108], [700, 148]], 2.6, "leaf"); b.gap([K], [[486, 108], [550, 108], [610, 142], [660, 192]], 2.4, "leaf"); b.gap([K], [[580, 76], [650, 92], [720, 122], [800, 130]], 3, "leaf"); b.gap([K], [[650, 120], [710, 146], [780, 158], [830, 154]], 3, "leaf");
      for (const q of [[[480, 92], [560, 50], [660, 54], [770, 64], [840, 46]], [[500, 110], [600, 140], [680, 222], [716, 330]], [[600, 120], [720, 190], [800, 250], [872, 262]], [[540, 70], [660, 104], [780, 120], [880, 92]]] as const) b.th(press(q as unknown as Run, 0.3, 0.9, 0.7, 0.05), 1.4, 0.85, 0.4);
    } },
    { id: "tie", box: [430, 90, 420, 200], motion: [{ kind: "sway", from: [460, 126], to: [760, 200], amount: 24 * wind, seconds: 2.6, lag: 0.6, power: 1.5, gust: 0.6, phase: 0.7 }], draw: ({ page: p }) => {
      const b = brushes(p, at(440));
      for (const [q, w] of [[[[474, 128], [540, 150], [600, 148], [660, 190], [730, 200]], 8], [[[472, 130], [520, 168], [566, 186], [606, 236]], 7]] as const) b.ribbon(sash, press(q as unknown as Run, 0.4, 1, 0.8, 1, 0.4), w, { dryEnd: 0.5 });
      b.ribbon(sash, [[444, 120, 0.8], [460, 128, 1], [480, 122, 0.7]], 13, { side: 0, belly: 0.75 });
    } },
  ];
  return { id: "swordsman", label: "A swordsman seen from behind, robe and hair blown by the wind", page: { width: W, height: H }, plates: inkPlates(pigs), seed, parts: inkPaintOrder(parts, ["head", "hair", "robe", "arm", "sleeve", "skirt", "boots", "flap", "belt", "sword", "tie", "tails", "tassel", "ground"], ["head"]) };
}

export interface InkUmbrellaLadyOptions { seed?: number; umbrella?: InkPigment; robe?: InkPigment; wind?: number; /** Wet ground under her, and the rain's rings in it (default true). */ ground?: boolean }
/** A lady walking away under an oiled-paper umbrella: we see into it, its ribs round her head; her hair falls down her back, her skirt trails on wet ground. */
export function inkUmbrellaLady(o: InkUmbrellaLadyOptions = {}): InkSubject {
  const W = 760, H = 1160, seed = o.seed ?? 1, umb = o.umbrella ?? "cinnabar", robe = o.robe ?? "teal", wind = o.wind ?? 1, K = "ink", pigs: InkPigment[] = [...new Set<InkPigment>([robe, umb, "peach", "ink"])], all: string[] = pigs, at = (n: number) => seed * 1000 + n;
  const HEAD = about(388, 372, 1.14, -3), grip: PenPoint = [461, 367];
  const parts: InkPart[] = [
    { id: "ground", box: [190, 1040, 550, 118], draw: ({ page: p }) => {
      if (o.ground === false) return;
      const b = brushes(p, at(510)), r = inkRandom(seed + 51);
      b.wash(robe, [[270, 1086], [380, 1092], [520, 1100], [690, 1112], [640, 1130], [480, 1136], [340, 1126]], (x, y) => 0.36 * ss(240, 340, x) * ss(700, 520, x) * ss(1140, 1096, y), { soft: 16, wander: 8 }); b.wash(K, [[300, 1088], [420, 1096], [560, 1104], [520, 1122], [380, 1118]], (_x, y) => 0.2 * ss(1126, 1094, y), { soft: 14, wander: 6 });
      for (const [x, y, l, w, t] of [[224, 1096, 90, 7, 0.4], [330, 1116, 210, 9, 0.5], [520, 1128, 160, 8, 0.4], [600, 1094, 120, 6, 0.36], [240, 1124, 70, 5, 0.3], [400, 1142, 90, 5, 0.3]] as const) b.side(press([[x, y], [x + l * 0.5, y + r.in(-3, 3)], [x + l, y + r.in(-2, 4)]], 0.2, 1, 0.1), w * 1.5, { tip: t * 1.2, belly: 0.1, side: 1, dry: 0.3, dryEnd: 1, grain: 1 });
      for (const [x, y, w] of [[250, 1108, 24], [640, 1136, 30], [706, 1104, 18]] as const) { b.th(press([[x - w, y], [x - w * 0.5, y - w * 0.2], [x + w * 0.4, y - w * 0.2], [x + w, y]], 0.1, 0.8, 0.1), 1.6, 0.4, 0.2); b.th(press([[x - w * 0.8, y + 2], [x, y + w * 0.22], [x + w * 0.8, y + 1]], 0.1, 0.9, 0.1), 1.8, 0.5, 0.2); }
    } },
    { id: "umbrella", box: [100, 24, 650, 400], group: "umbrella", motion: [{ kind: "turn", at: grip, degrees: 0.9, seconds: 5.2 }], draw: ({ page: p }) => {
      const b = brushes(p, at(530)), r = inkRandom(seed + 53), A = 286, B = 124, cx = 416, cy = 184, cs = Math.cos(-0.24), sn = Math.sin(-0.24), apex: PenPoint = [400, 122], runner: PenPoint = [412, 170], N = 30;
      const rim = (t: number, k = 1): PenPoint => { const x = Math.cos(t) * A * k, y = Math.sin(t) * B * k; return [cx + x * cs - y * sn, cy + x * sn + y * cs]; }, on = (t: number, u: number): PenPoint => { const q = rim(t), f = u + 0.16 * u * (1 - u); return [lerp(apex[0], q[0], f) - 2 * (1 - u) * u * 6, lerp(apex[1], q[1], f) - 22 * u * (1 - u)]; };
      const turns = Array.from({ length: N }, (_, i) => ((i + 0.12 * (r.next() - 0.5)) / N) * Math.PI * 2 + 0.07), edge: PenPoint[] = turns.flatMap((t, i) => { const n = i + 1 < N ? turns[i + 1] : turns[0] + Math.PI * 2, d = 0.972 + 0.012 * r.next(); return [rim(t), rim(t), rim(lerp(t, n, 0.5), d)]; });
      // how far out a place is, 0 at the hub and 1 at the rim: the ring of the cone that runs through it
      const ring = (x: number, y: number) => { const un = (dx: number, dy: number): PenPoint => [(dx * cs + dy * sn) / A, (-dx * sn + dy * cs) / B], u = un(x - apex[0], y - apex[1]), v = un(cx - apex[0], cy - apex[1]), d = u[0] * v[0] + u[1] * v[1], k = 1 - v[0] * v[0] - v[1] * v[1]; return (Math.sqrt(d * d + k * (u[0] * u[0] + u[1] * u[1])) - d) / k; };
      b.paper(edge);
      // oiled paper with the light behind it: clear toward the near rim, deep round the hub, a band left pale
      const tone: Field = (x, y) => { const u = ring(x, y); return (0.6 + 0.26 * ss(0.5, 0.1, u) + 0.22 * ss(230, 330, y) + 0.14 * ss(560, 720, x) + 0.24 * (inkFbm2(seed + 16, x / 60, y / 44, 3) - 0.5)) * (1 - 0.72 * ss(0.805, 0.82, u) * ss(0.895, 0.88, u)); };
      b.wash(umb, edge, tone, { wander: 0.4, rim: 0.3, rimWidth: 5, mottle: 0.4, cloud: 60 }); b.wash(K, edge, (x, y) => { const u = ring(x, y); return 0.3 * ss(0.42, 0.04, u) + 0.16 * ss(240, 330, y) + 0.1 * ss(600, 720, x); }, { wander: 0.4, rim: 0.1, mottle: 0.4 });
      turns.forEach((t, i) => { const far = ss(-0.2, 0.9, Math.sin(t)); b.th([[...on(t, 0.03), 0.5], [...on(t, 0.35), 0.8], [...on(t, 0.7), 0.9], [...on(t, 1), 1.1]], 2.3 - 0.4 * far, 0.82, 0.86); if (i % 2 === 0 || far < 0.4) b.th([[...runner, 0.7], [...on(t, 0.56), 0.9]], 1.5, 0.66, 0.6); });
      for (const u of [0.56, 0.6]) b.th(Array.from({ length: 41 }, (_, i) => [...on((i / 40) * Math.PI * 2, u + (i % 2) * 0.012), 0.8] as const), 1.3, 0.5, 0.5);
      b.edge([...edge, edge[0]].filter((_, i) => i % 3 !== 1).map(([x, y], i) => [x, y, 0.5 + 0.5 * inkFbm2(seed + 3, i / 7, 1, 2)] as const), 5, 0, { tip: 0.9, belly: 0.5, dry: 0.04, dryEnd: 0.1 });
      // pole of thin bamboo, hub and runner
      const pole = (s: number, e: number) => [[lerp(apex[0], grip[0], s), lerp(apex[1], grip[1], s), 1], [lerp(apex[0], grip[0], (s + e) / 2) + 1.5, lerp(apex[1], grip[1], (s + e) / 2), 1], [lerp(apex[0], grip[0], e), lerp(apex[1], grip[1], e), 1]] as const, whole = pole(0.02, 1.16), body = strip(whole, 6.4);
      b.paper(body); b.wash(K, body, (x, y) => 0.04 + 0.5 * ss(0, 3.4, (x - lerp(apex[0], grip[0], (y - apex[1]) / (grip[1] - apex[1]))) * 0.96), { wander: 0.1, fringe: 0.3, rim: 0.2 }); b.th(body.slice(0, 3).map(q => [...q, 0.9] as const), 1.8); b.th(body.slice(3).map(q => [...q, 1] as const), 2.2);
      for (const s of [0.44, 0.66, 0.86, 1.1]) { const [x, y] = pole(s, s)[0]; b.th([[x - 4.2, y + 1.5, 0.8], [x, y + 0.5, 1], [x + 4.2, y - 1.5, 0.8]], 2.4, 0.9, 0.8); }
      for (const [q, w] of [[runner, 9], [apex, 11]] as const) { const hub: Run = [[q[0] - w, q[1] + 1], [q[0] - w * 0.5, q[1] - w * 0.55], [q[0] + w * 0.6, q[1] - w * 0.6], [q[0] + w, q[1] - 2], [q[0] + w * 0.7, q[1] + w * 0.6], [q[0] - w * 0.5, q[1] + w * 0.7]]; b.paper(hub); b.wash(K, hub, 0.9, { wander: 0.2, fringe: 0.4 }); b.gap([K], [[q[0] - w * 0.7, q[1] - 1], [q[0], q[1] - w * 0.3], [q[0] + w * 0.6, q[1] - w * 0.2]], 1.6); }
    } },
    // the far arm, raised: the sleeve has slid to the elbow and hangs from it
    { id: "far", box: [410, 380, 130, 370], group: "torso", motion: [{ kind: "sway", from: [480, 520], to: [488, 730], amount: 7 * wind, seconds: 3.8, lag: 0.3, power: 1.7 }], draw: ({ page: p }) => {
      const b = brushes(p, at(560)), arm: Run = [[466, 384], [484, 384], [490, 420], [496, 470], [470, 474], [466, 430]], q: Run = [[438, 398], [456, 408], [462, 432], [466, 450], [466, 450], [480, 456], [502, 448], [502, 448], [508, 486], [512, 530], [516, 590], [526, 660], [538, 722], [538, 722], [512, 724], [486, 716], [464, 694], [464, 694], [456, 640], [448, 580], [436, 530], [424, 490], [420, 440]], st = fall(seed + 24, 14, 200);
      b.paper(arm); b.wash("peach", arm, x => 0.08 + 0.2 * ss(476, 494, x), { soft: 0.8, wander: 0.1, fringe: 0.2, rim: 0 }); b.th(press([[466, 386], [466, 420], [468, 452]], 0.6, 0.9, 0.5), 2); b.th(press([[484, 386], [490, 420], [494, 450]], 0.6, 1, 0.5), 2.2);
      b.paper(q); b.wash(robe, q, (x, y) => 0.03 + 0.46 * ss(0.2, 0.8, st(x, y)) * ss(590, 720, y) + 0.2 * spot(x, y, 478, 540, 60, 14, 1.4), { rim: 0.14 }); b.wash(K, q, (x, y) => 0.2 * ss(0.4, 0.8, st(x + 50, y)) * ss(640, 724, y) + 0.2 * spot(x, y, 450, 560, 80, 10, 1.4) + 0.1 * spot(x, y, 490, 520, 16, 8), { rim: 0.1 });
      const mouth: Run = [[466, 450], [478, 446], [502, 448], [496, 456], [480, 459]]; b.paper(mouth); b.wash(K, mouth, 0.4, { wander: 0.2 }); b.wash(robe, mouth, 0.4, { wander: 0.2 });
      b.edge(press([[440, 398], [456, 408], [462, 432], [466, 450]], 0.4, 0.9, 0.6), 5, -1); b.th(press([[466, 450], [480, 457], [502, 448]], 0.6, 1, 0.6), 2.2);
      b.edge(press([[502, 448], [508, 486], [512, 530], [516, 590], [526, 660], [538, 722]], 0.5, 1, 0.6, 0.9, 0.7, 0.4), 8, -1); b.edge(press([[538, 722], [512, 724], [486, 716], [464, 694]], 0.5, 1, 0.5), 5, 0, { tip: 0.9, belly: 0.5 }); b.edge(press([[424, 494], [436, 530], [448, 580], [456, 640], [462, 700]], 0.2, 0.9, 0.8, 0.5), 7, 1);
      // the soft fold at the elbow, and the fall from it
      b.fold(press([[506, 502], [490, 518], [466, 522], [446, 512]], 0.7, 1, 0.6, 0.1), 10, -1); b.fold(press([[508, 522], [496, 540], [480, 552]], 0.6, 0.9, 0.1), 8, -1); b.fold(press([[492, 522], [496, 580], [504, 650], [506, 700]], 0.3, 1, 0.8, 0.2), 11, 1); b.fold(press([[468, 530], [474, 600], [482, 660], [480, 712]], 0.3, 0.9, 0.8, 0.2), 10, 1); b.fold(press([[452, 440], [448, 470], [430, 492]], 0.4, 0.9, 0.1), 8, 1);
    } },
    { id: "shoe", box: [390, 1030, 110, 80], draw: ({ page: p }) => {
      const b = brushes(p, at(590)), q: Run = [[416, 1100], [420, 1086], [434, 1070], [454, 1058], [472, 1060], [476, 1072], [464, 1088], [440, 1100], [424, 1104]], sole: Run = [[421, 1099], [428, 1088], [444, 1078], [462, 1074], [472, 1078], [462, 1090], [440, 1099]];
      b.paper(q); b.wash(K, q, 0.82, { wander: 0.3 }); b.wash(umb, q, 0.5, { wander: 0.3 }); b.paper(sole); b.wash(K, sole, x => 0.04 + 0.2 * ss(440, 470, x), { wander: 0.2, rim: 0.3 }); b.th(press([...sole, sole[0]], 0.7, 1, 0.7), 1.6);
    } },
    { id: "skirt", box: [250, 560, 450, 570], motion: [{ kind: "sway", from: [360, 640], to: [420, 1090], amount: 9 * wind, seconds: 4.2, lag: 0.4, power: 1.9, gust: 0.3 }], draw: ({ page: p }) => {
      const b = brushes(p, at(610)), hem: Run = [[272, 1064], [296, 1080], [336, 1090], [372, 1094], [410, 1086], [410, 1086], [428, 1068], [452, 1062], [474, 1074], [474, 1074], [520, 1090], [580, 1106], [636, 1112], [684, 1104]];
      const q: Run = [[320, 580], [308, 622], [294, 690], [288, 760], [293, 830], [293, 900], [286, 980], [272, 1064], ...hem, [684, 1104], [628, 1078], [568, 1028], [512, 956], [470, 880], [440, 810], [427, 740], [429, 670], [420, 622], [404, 580], [404, 580], [362, 590], [320, 580]], st = fan(seed + 26, 366, 440, 0.034, 320), low = (x: number, y: number) => ss(700, 1090, y + 0.25 * Math.max(0, x - 420));
      b.paper(q);
      b.water(robe, q, (x, y) => 0.12 + 0.64 * low(x, y) ** 1.2 + 0.12 * ss(400, 430, x) * ss(820, 700, y), (x, y) => 0.02 + 0.5 * low(x, y) ** 2 * ss(0.4, 0.75, st(x + 60, y)) + 0.14 * spot(x, y, 384, 720, 130, 12, 1.6), st, 1, { rim: 0.24, fringe: 1 });
      // wet through at the foot
      b.wash(K, [[272, 1064], [300, 1040], [360, 1056], [396, 1062], [400, 1084], [372, 1094], [320, 1088]], (_x, y) => 0.4 * ss(1036, 1084, y), { soft: 8, wander: 3 }); b.wash(K, [[470, 1030], [540, 1060], [620, 1094], [690, 1108], [600, 1112], [520, 1094]], (x, y) => 0.5 * ss(-30, 24, y - lerp(1050, 1108, (x - 470) / 200)), { soft: 8, wander: 3 }); b.drag(robe, press([[430, 820], [468, 910], [520, 990], [590, 1060], [668, 1100]], 0.2, 0.8, 1, 0.8, 0.5), 44, 1, 0.7, 0.36, { dry: 0.2, dryEnd: 0.9 }); b.drag(robe, press([[300, 860], [304, 960], [296, 1064]], 0.2, 0.9, 0.8), 34, 1, 0.6, 0.3, { dry: 0.2, dryEnd: 0.8 });
      for (const [g, w] of [[[[398, 640], [404, 740], [420, 840], [470, 950], [560, 1060]], 4], [[[350, 640], [342, 760], [340, 900], [326, 1040]], 3.4], [[[372, 760], [380, 880], [404, 980], [428, 1036]], 3], [[[430, 860], [480, 960], [540, 1030], [620, 1086]], 3]] as const) b.gap(all, g as unknown as Run, w);
      // folds from the sash, and the long pull from the near thigh to the trailing heel
      const f: readonly [Run, number, 1 | -1][] = [[[[392, 596], [402, 680], [410, 770], [436, 870], [492, 980], [570, 1066]], 15, -1], [[[372, 600], [378, 700], [372, 800], [388, 920], [420, 1030]], 13, 1], [[[346, 600], [336, 700], [328, 820], [334, 940], [342, 1076]], 14, 1], [[[326, 600], [308, 690], [304, 800], [306, 920], [292, 1060]], 11, 1], [[[410, 620], [420, 700], [424, 780], [456, 880], [520, 980], [610, 1076]], 11, -1], [[[340, 800], [372, 880], [428, 960], [474, 1040]], 13, 1], [[[358, 608], [356, 680], [346, 740]], 8, 1], [[[384, 600], [390, 650], [390, 700]], 8, -1], [[[470, 900], [530, 980], [600, 1050], [670, 1098]], 12, -1]];
      f.forEach(([g, w, sd], i) => b.fold(press(g, 0.4, 1, 0.8, 0.9, 0.15), w, sd, { dry: 0.04 + 0.02 * (i % 3), dryEnd: 0.8 }));
      b.edge(press([[320, 582], [308, 622], [294, 690], [288, 760], [292, 826]], 0.3, 0.8, 0.9, 0.4), 8, 1); b.edge(press([[293, 812], [293, 900], [286, 980], [271, 1066]], 0.2, 0.9, 0.9, 0.4), 9, 1, { dry: 0.2 }); b.edge(press([[404, 582], [420, 622], [429, 670], [427, 740], [440, 810], [470, 880], [512, 956]], 0.4, 1, 0.8, 1, 0.8, 0.5), 9, -1); b.edge(press([[500, 936], [568, 1028], [628, 1078], [684, 1104]], 0.2, 0.9, 0.7, 0.4), 8, -1, { dry: 0.2 });
      b.edge(press(hem.slice(0, 5), 0.3, 0.8, 0.6, 1, 0.5), 5, 0, { tip: 0.9, belly: 0.5, dryEnd: 0.3 }); b.edge(press(hem.slice(5, 9), 0.5, 0.9, 0.5), 5, 0, { tip: 0.95, belly: 0.6 }); b.edge(press(hem.slice(9), 0.4, 0.8, 0.3), 5, 0, { tip: 0.86, belly: 0.4, dryEnd: 0.9 });
    } },
    { id: "coat", box: [280, 370, 200, 240], group: "torso", motion: [{ kind: "breathe", at: [362, 580], amount: 0.008, seconds: 4.2 }], draw: ({ page: p }) => {
      const b = brushes(p, at(640)), q: Run = [[358, 380], [334, 389], [314, 404], [301, 430], [302, 480], [312, 530], [318, 566], [318, 566], [362, 574], [405, 566], [405, 566], [411, 528], [424, 492], [440, 458], [458, 424], [452, 408], [432, 394], [410, 380], [386, 388]];
      b.paper(q); b.wash(robe, q, (x, y) => 0.02 + 0.16 * ss(404, 430, x) * ss(440, 520, y) + 0.1 * spot(x, y, 330, 540, 30, 24), { rim: 0.12 }); b.wash(K, q, (x, y) => 0.12 * ss(406, 430, x) * ss(440, 520, y) + 0.08 * spot(x, y, 360, 560, 50, 14), { rim: 0.08 });
      b.edge(press([[412, 382], [432, 394], [452, 408]], 0.3, 0.9, 0.4), 6, -1); b.edge(press([[358, 380], [334, 389], [314, 404], [301, 430]], 0.3, 0.8, 1, 0.5), 6, -1); b.edge(press([[440, 460], [424, 492], [411, 528], [405, 566]], 0.3, 1, 0.8, 0.5), 8, -1);
      b.fold(press([[436, 466], [416, 500], [386, 546]], 0.5, 1, 0.1), 11, -1); b.fold(press([[412, 526], [396, 548], [378, 564]], 0.6, 0.9, 0.1), 9, -1); b.fold(press([[316, 500], [330, 536], [348, 564]], 0.5, 0.9, 0.1), 9, 1); b.fold(press([[426, 440], [404, 462], [380, 474]], 0.4, 0.7, 0.05), 8, -1);
      // collar: white, then dark
      b.paper([[354, 382], [358, 372], [388, 386], [412, 372], [418, 382], [388, 398]]); b.th(press([[358, 373], [374, 383], [390, 385], [411, 373]], 0.4, 1, 0.5), 1.6); const band: Run = [[346, 388], [346, 388], [356, 381], [374, 391], [390, 393], [416, 381], [426, 388], [426, 388], [406, 400], [388, 404], [368, 401]]; b.paper(band); b.wash(K, band, 0.94, { wander: 0.3 }); b.th(press([[356, 381], [374, 391], [390, 393], [416, 381]], 0.5, 1, 0.5), 2, 0.9, 0.8, umb);
    } },
    { id: "sash", box: [300, 540, 120, 70], group: "torso", draw: ({ page: p }) => {
      const b = brushes(p, at(660)), q: Run = [[315, 556], [315, 556], [360, 566], [408, 556], [408, 556], [409, 590], [409, 590], [362, 601], [314, 590], [314, 590]];
      b.paper(q); b.wash(umb, q, (x, y) => 0.84 + 0.2 * (fall(seed + 6, 60, 8)(y, x) - 0.5), { wander: 0.4 }); b.wash(K, q, x => 0.04 + 0.26 * ss(384, 410, x), { wander: 0.4 }); b.gap(all, [[318, 568], [360, 578], [406, 568]], 1.6); b.th(press([[314, 557], [360, 567], [409, 557]], 0.6, 1, 0.6), 2); b.th(press([[314, 590], [362, 602], [410, 590]], 0.6, 1, 0.6), 2.2); b.side(press([[314, 580], [362, 591], [410, 580]], 1, 1, 1), 5, { tip: 0.95, belly: 0.8, side: 0, dry: 0.05, dryEnd: 0.2 });
    } },
    { id: "ribbon", box: [350, 550, 290, 400], motion: [{ kind: "sway", from: [396, 586], to: [500, 800], amount: 18 * wind, seconds: 3.2, lag: 0.6, power: 1.5, gust: 0.4 }], draw: ({ page: p }) => {
      const b = brushes(p, at(670));
      b.ribbon(umb, press([[394, 590], [404, 660], [394, 730], [410, 810], [402, 880], [410, 926]], 0.6, 1, 0.7, 1, 0.9, 0.5), 15, { dryEnd: 0.6 }); b.ribbon(umb, press([[398, 586], [440, 618], [484, 612], [526, 640], [570, 636], [618, 664]], 0.6, 1, 0.7, 1, 0.7, 0.3), 13, { side: -1, dryEnd: 0.6 });
      for (const q of [[[394, 590], [404, 660], [394, 730], [410, 810], [402, 880]], [[398, 588], [440, 620], [484, 614], [526, 642], [570, 638]]] as const) b.th(press(q as unknown as Run, 0.3, 0.8, 0.4).map(([x, y, k]) => [x + 3, y + 2, k] as const), 1.5, 0.5, 0.3);
      for (const q of [[[394, 586], [376, 566], [366, 580], [378, 594], [394, 590]], [[396, 586], [414, 562], [428, 572], [416, 592], [398, 590]]] as const) b.ribbon(umb, press(q as unknown as Run, 0.6, 1, 0.8), 9, { side: 0, belly: 0.75 }); b.wash(umb, [[388, 580], [400, 578], [404, 592], [392, 597]], 0.95, { wander: 0.2 }); b.th(press([[390, 580], [394, 588], [392, 597]], 0.8, 0.8, 0.4), 1.8, 0.7);
    } },
    // the near sleeve hangs with its own weight in front of the hip
    { id: "sleeve", box: [210, 390, 150, 460], motion: [{ kind: "sway", from: [300, 480], to: [276, 830], amount: 7 * wind, seconds: 4, lag: 0.3, power: 1.7 }], group: "torso", draw: ({ page: p }) => {
      const b = brushes(p, at(690)), mouth: Run = [[232, 612], [228, 650], [236, 710], [236, 770], [248, 822], [248, 822], [274, 836], [304, 826], [326, 802], [326, 802]], q: Run = [[334, 392], [314, 402], [299, 428], [288, 470], [272, 520], [254, 566], [232, 612], ...mouth, [330, 750], [324, 690], [320, 630], [328, 570], [338, 510], [342, 450], [344, 410]], st = fall(seed + 28, 13, 190);
      b.paper(q); b.wash(robe, q, (x, y) => 0.02 + 0.56 * ss(0.15, 0.8, st(x, y)) * ss(660, 836, y) + 0.12 * ss(316, 344, x) * ss(700, 560, y), { rim: 0.16 }); b.wash(K, q, (x, y) => 0.24 * ss(0.4, 0.8, st(x + 40, y)) * ss(740, 836, y) + 0.12 * ss(322, 344, x) * ss(660, 520, y) + 0.16 * spot(x, y, 262, 720, 100, 9, 1.5), { rim: 0.1 });
      b.gap(all, [[296, 660], [298, 740], [290, 810]], 3); b.gap(all, [[258, 660], [262, 740], [266, 816]], 2.4);
      b.edge(press([[334, 391], [314, 402], [299, 428], [288, 470], [272, 520], [254, 566], [231, 614]], 0.3, 1, 0.8, 1, 0.7, 0.9, 0.6), 8, -1); b.edge(press([[232, 612], [228, 650], [236, 710], [236, 770], [248, 822]], 0.6, 1, 0.6, 0.9, 0.5), 7, 1); b.edge(press([[248, 822], [274, 836], [304, 826], [326, 802]], 0.5, 1, 0.5), 5.4, 0, { tip: 0.92, belly: 0.5 }); b.edge(press([[343, 430], [342, 470], [338, 510], [328, 570], [320, 630]], 0.2, 0.8, 0.9, 0.3), 7, -1); b.edge(press([[320, 640], [324, 690], [330, 750], [326, 802]], 0.2, 0.8, 0.5), 7, -1, { dry: 0.2 });
      // elbow: the cloth breaks there, and everything below hangs from it
      b.fold(press([[334, 534], [312, 556], [288, 562], [270, 552]], 0.7, 1, 0.6, 0.1), 11, -1); b.fold(press([[328, 566], [308, 584], [288, 590]], 0.6, 0.9, 0.1), 9, -1); b.fold(press([[306, 566], [300, 640], [306, 730], [304, 822]], 0.3, 1, 0.7, 0.3), 12, 1); b.fold(press([[282, 566], [270, 630], [274, 720], [276, 830]], 0.3, 1, 0.8, 0.3), 12, 1); b.fold(press([[256, 580], [246, 640], [254, 720], [256, 812]], 0.3, 0.8, 0.8, 0.3), 9, 1); b.fold(press([[318, 420], [312, 460], [316, 500]], 0.3, 0.8, 0.1), 9, 1); b.fold(press([[296, 470], [304, 500], [296, 540]], 0.3, 0.8, 0.1), 9, 1);
      const inside: Run = [[248, 822], [262, 818], [290, 820], [326, 802], [304, 826], [274, 836]]; b.wash(K, inside, 0.6, { wander: 0.4 });
    } },
    { id: "head", box: [310, 220, 150, 180], group: "head", draw: c => {
      const p = c.pens({ h: HEAD }).h, b = brushes(p, at(720));
      const neck: Run = [[364, 350], [363, 368], [360, 378], [388, 388], [412, 380], [406, 364], [409, 344], [396, 336], [384, 322], [374, 322], [368, 338]], face: Run = [[352, 284], [345, 290], [342, 299], [342, 306], [341, 311], [340, 316], [337, 320], [336.4, 323], [339, 327], [337.6, 332], [339, 335.5], [338, 339], [339, 344], [339.5, 350], [343, 355], [351, 358], [363, 361], [376, 340], [376, 300]];
      b.paper(neck); b.paper(face); b.wash("peach", neck, 0.07, { wander: 0, fringe: 0, rim: 0 }); b.wash(K, neck, (x, y) => 0.14 * spot(x, y, 368, 366, 16, 5, 0.3), { wander: 0, fringe: 0, rim: 0 }); b.wash("peach", face, (x, y) => 0.05 + 0.2 * spot(x, y, 352, 326, 9, 8), { wander: 0, fringe: 0, rim: 0 });
      b.th([[350, 285, 0.3], [345, 290, 0.8], [342, 299, 1], [342, 306, 0.7], [341, 311, 0.8], [340, 316, 0.8], [337, 320, 1], [336.4, 323, 1], [339, 327, 0.6]], 1.6, 0.86, 0.8); b.th([[339, 327, 0.6], [337.6, 332, 0.8], [339, 335.5, 0.8], [338, 339, 0.8], [339, 344, 0.6], [339.5, 350, 0.9], [343, 355, 1], [351, 358, 1], [363, 361, 0.8], [370, 353, 0.2]], 1.7, 0.86, 0.6); b.th([[338.4, 332, 1], [340, 335.4, 0.7], [338.8, 339, 0.9]], 2.2, 0.85, 0.8, umb);
      b.th([[342, 310, 0.9], [346, 311, 0.9], [350, 313, 0.2]], 1.7, 0.92, 0.6); b.th([[343, 310, 0.5], [340, 308, 0.1]], 1.2, 0.9, 0.6); b.th([[343, 302, 0.6], [349, 301, 0.9], [356, 304, 0.1]], 1.6, 0.7, 0.3);
      b.th([[363, 361, 0.2], [363, 369, 0.9], [360, 377, 0.5]], 1.8, 0.84, 0.6); b.th([[409, 346, 0.2], [406, 360, 0.9], [411, 377, 0.5]], 1.8, 0.84, 0.6);
      const hair: Run = [[348, 284], [355, 291], [361, 300], [364, 312], [364, 324], [368, 314], [374, 308], [379, 314], [379, 326], [384, 338], [394, 346], [406, 346], [416, 338], [427, 324], [434, 310], [436, 296], [433, 278], [421, 263], [403, 254], [384, 252], [364, 257], [351, 268], [344, 280]];
      b.paper(hair); b.wash(K, hair, 0.9, { wander: 0.4, rim: 0.1, mottle: 0.2 });
      // swept up to the knot from the brow, the temple and the nape
      for (const q of [[[346, 282, 3], [360, 268, 6], [384, 262, 6], [408, 262, 4]], [[358, 296, 4], [372, 278, 7], [392, 270, 6], [410, 264, 4]], [[366, 318, 3], [378, 296, 7], [396, 280, 6], [411, 266, 4]], [[382, 336, 4], [392, 310, 8], [404, 288, 7], [413, 267, 4]], [[398, 347, 5], [408, 318, 8], [414, 292, 7], [415, 268, 4]], [[420, 334, 4], [428, 306, 6], [426, 284, 6], [417, 266, 4]]] as const) b.lock(q as unknown as InkLockNode[], { load: 0.95, root: 0.14, tip: 0.02, streak: 0.5, hairs: 2, stray: 1.2, hairWidth: 1.1, cover: 0.3 });
      for (const [g, w] of [[[[352, 280], [368, 268], [392, 264]], 1.5], [[[364, 300], [376, 284], [400, 270]], 1.3], [[[384, 326], [394, 302], [410, 276]], 1.2], [[[424, 318], [427, 296], [420, 274]], 1.2]] as const) b.gap([K], g as unknown as Run, w, "leaf");
      b.th([[364, 318, 0.6], [362, 334, 0.8], [366, 352, 0.4], [362, 368, 0.05]], 1.3, 0.9, 0.5); b.th([[346, 284, 0.6], [346, 296, 0.7], [350, 310, 0.05]], 1, 0.85, 0.4);
      const ear: Run = [[368, 312], [374, 310], [377, 316], [375, 326], [369, 332], [367, 324]]; b.paper(ear); b.wash("peach", ear, 0.2, { soft: 0.6, wander: 0, fringe: 0.2, rim: 0.3 }); b.th([[368, 313, 0.4], [374, 310, 1], [377, 317, 1], [375, 327, 0.8], [369, 332, 0.4]], 1.3, 0.8, 0.5); b.th([[370, 333, 0.6], [370, 344, 0.6]], 1.1, 0.8, 0.8); b.wash(umb, [[368, 344], [372, 344], [372.5, 349], [370, 351.5], [367.5, 349]], 0.95, { soft: 0.6, wander: 0, fringe: 0.2 });
    } },
    { id: "knot", box: [350, 150, 130, 130], group: "head", draw: c => {
      const p = c.pens({ h: HEAD }).h, b = brushes(p, at(760)), lock = (q: readonly InkLockNode[]) => { b.paper(strip(q, 1.5)); b.lock(q, { root: 0.02, tip: 0.02, streak: 0.4, stray: 1.15, hairWidth: 1.1 }); };
      // two loops, the far one taller and fallen back, and the twist that binds them
      lock([[408, 262, 5], [404, 238, 6.5], [416, 210, 7.5], [438, 198, 8], [458, 206, 8], [462, 226, 7.5], [448, 248, 7], [426, 264, 5.5]]); b.gap([K], [[407, 238], [418, 213], [438, 202], [456, 209]], 1.3); b.gap([K], [[412, 246], [421, 222], [438, 208]], 0.9);
      lock([[410, 264, 5], [392, 262, 6], [372, 252, 7], [366, 236, 7.5], [380, 226, 7], [398, 236, 6.5], [412, 256, 5.5]]); b.gap([K], [[390, 258], [374, 249], [369, 237], [380, 230]], 1.2);
      lock([[392, 266, 4], [404, 255, 8], [420, 256, 8.5], [430, 268, 4]]); b.gap([K], [[398, 260], [410, 253], [422, 257]], 1.2); b.ribbon(umb, [[394, 267, 0.7], [410, 263, 1], [429, 269, 0.7]], 5, { side: 0, belly: 0.8 });
      for (const q of [[[428, 264], [442, 258], [452, 262]], [[392, 262], [384, 266], [378, 264]]] as const) b.th(press(q as unknown as Run, 0.7, 0.6, 0.05), 1.3, 0.9, 0.5);
      // a pin, and what hangs from it
      b.th([[366, 250, 0.6], [394, 258, 1], [404, 260, 0.8]], 2.4, 0.9, 0.9); b.wash(umb, [[362, 244], [368, 244], [371, 250], [366, 255], [361, 251]], 0.95, { wander: 0.2, fringe: 0.3 }); b.th([[365, 255, 0.7], [364, 266, 0.7], [365, 276, 0.5]], 1.1, 0.8, 0.8); for (const [x, y] of [[364, 266], [365, 276]] as const) b.wash(umb, [[x - 2, y - 2], [x + 2, y - 2], [x + 2.4, y + 2], [x - 2, y + 2.4]], 0.95, { wander: 0.1, fringe: 0.2, soft: 0.6 });
    } },
    { id: "hair", box: [330, 300, 130, 380], motion: [{ kind: "sway", from: [402, 350], to: [380, 650], amount: 8 * wind, seconds: 4.4, lag: 0.5, power: 1.8 }], draw: ({ page: p }) => {
      const b = brushes(p, at(780)), main: readonly InkLockNode[] = [[408, 322, 12], [411, 350, 15], [409, 396, 18], [396, 460, 19], [379, 530, 15], [376, 594, 10], [382, 660, 0]], soft = { edge: [0.16, 0.16], tip: 0.3, hairs: 5, stray: 1.4, streak: 0.34, over: 18, loadEnd: 0.86, hairWidth: 1.1 } as const;
      b.paper(strip(main.slice(1), 1.4));
      b.lock([[402, 326, 6], [398, 396, 8], [382, 470, 9], [366, 540, 7], [364, 600, 4], [352, 660, 0]], soft); b.lock([[416, 326, 6], [419, 396, 8], [408, 466, 9], [392, 536, 8], [392, 600, 5], [404, 654, 0]], soft); b.lock([[409, 326, 8], [406, 420, 10], [388, 520, 9], [372, 600, 6], [368, 676, 0]], soft);
      b.lock(main, { ...soft, root: 0 });
      b.gap([K], [[406, 372], [400, 430], [384, 500], [374, 566]], 2.4, "leaf"); b.gap([K], [[420, 384], [414, 440], [400, 510]], 1.6, "leaf"); b.gap([K], [[371, 570], [370, 606], [364, 644]], 3, "leaf"); b.gap([K], [[388, 540], [386, 590], [390, 636]], 2.6, "leaf");
      b.th([[398, 350, 0.6], [384, 400, 0.8], [372, 450, 0.5], [362, 500, 0.05]], 1.3, 0.85, 0.4); b.th([[424, 350, 0.5], [434, 400, 0.7], [428, 460, 0.4], [418, 510, 0.05]], 1.2, 0.8, 0.4);
      b.ribbon(umb, [[392, 416, 0.6], [402, 421, 0.9], [418, 423, 1], [431, 416, 0.6]], 8, { side: 0, belly: 0.7 }); b.ribbon(umb, press([[420, 422], [432, 452], [428, 484], [440, 516]], 0.6, 1, 0.7, 0.3), 7, { dryEnd: 0.6 }); b.ribbon(umb, press([[412, 424], [414, 456], [404, 486], [408, 510]], 0.6, 1, 0.7, 0.3), 6.5, { dryEnd: 0.6 });
    } },
    { id: "hand", box: [430, 340, 70, 70], group: "umbrella", motion: [{ kind: "turn", at: grip, degrees: 0.9, seconds: 5.2 }], draw: ({ page: p }) => {
      // closed round the pole: the fingers come over it from the far side, the thumb lies along it
      const b = brushes(p, at(820)), back: Run = [[468, 396], [485, 396], [486, 378], [482, 362], [474, 354], [460, 350], [449, 354], [446, 362], [452, 368], [462, 372], [466, 384]];
      b.paper(back); b.wash("peach", back, x => 0.1 + 0.16 * ss(470, 486, x), { soft: 0.7, wander: 0, fringe: 0.2, rim: 0 });
      b.th([[467, 396, 0.4], [465, 384, 0.9], [461, 374, 0.7]], 1.9); b.th([[485, 396, 0.4], [486, 378, 1], [482, 362, 1], [474, 354, 0.9], [460, 350, 1], [450, 353, 0.8], [446, 361, 0.9], [451, 367, 0.5]], 2, 0.9, 0.8);
      for (const q of [[[474, 356], [466, 358], [455, 364]], [[479, 362], [470, 365], [458, 370]]] as const) b.th(press(q as unknown as Run, 0.3, 0.9, 0.4), 1.4, 0.7, 0.5);
      const thumb: Run = [[464, 380], [456, 372], [446, 362], [442, 357], [446, 354], [452, 358], [462, 367], [470, 374]]; b.paper(thumb); b.wash("peach", thumb, 0.12, { soft: 0.6, wander: 0, fringe: 0.2, rim: 0 }); b.th(press([[465, 381], [456, 373], [446, 363], [441, 357], [446, 353], [453, 358], [463, 368]], 0.4, 0.9, 0.9, 0.4), 1.8, 0.88, 0.6);
    } },
  ];
  return { id: "umbrella-lady", label: "A lady walking away under an oiled-paper umbrella", page: { width: W, height: H }, plates: inkPlates(pigs), seed, parts: inkPaintOrder(parts, ["head", "knot", "hair", "coat", "sleeve", "skirt", "far", "hand", "umbrella", "sash", "ribbon", "shoe", "ground"], ["head"]) };
}
