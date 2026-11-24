/**
 * INK-FILM1 folk: full figures seen from behind or far off 寫意人物, for a person in a landscape. A swordsman on the height, a lady under an
 * oiled-paper umbrella. The face is turned away; the gesture is the drawing.
 */
import { inkFbm2 } from "../ink-riso-press";
import type { InkRisoPen, PenNode, PenPoint } from "../ink-riso-pen";
import { inkBloom, inkSide, inkThread } from "../ink-riso-wet";
import type { InkSubject } from "./ink-cel";
import { inkRandom } from "./ink-land";
import { inkPlates } from "./ink-pigments";
import type { InkPigment } from "./ink-pigments";
import { inkVeilShape } from "./ink-veil";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a || 1e-9))); return t * t * (3 - 2 * t); };
type Tone = number | ((x: number, y: number) => number);
/** A shape of cloth: paper first, then its water. */
function cloth(p: InkRisoPen, pts: readonly PenPoint[], coats: readonly { plate: string; tone: Tone; rim?: number; mottle?: number }[], seed: number, closed = p.shape(pts)) {
  inkVeilShape(p, closed, 1);
  coats.forEach((c, i) => inkBloom(p, c.plate, closed, { tone: typeof c.tone === "number" ? c.tone : (X, Y) => (c.tone as (x: number, y: number) => number)(...p.local(X, Y)), soft: 1, wander: 0.8, wave: 30, fringe: 0.7, rim: c.rim ?? 0.3, rimWidth: 4, mottle: c.mottle ?? 0.5, cloud: 46, seed: seed + i }));
}
/** A contour or a fold in one pressed stroke. */
const fold = (p: InkRisoPen, pts: readonly PenNode[], width: number, tip: number, seed: number, o: { side?: 1 | -1 | 0; belly?: number; dry?: number; dryEnd?: number } = {}) => inkSide(p, "ink", pts, width, { tip, belly: o.belly ?? 0.14, side: o.side ?? 1, head: 0.3, rim: 0.04, dry: o.dry ?? 0.16, dryEnd: o.dryEnd ?? 0.9, grain: 0.9, seed });
const thread = (p: InkRisoPen, pts: readonly PenNode[], width: number, ink: number, seed: number) => inkThread(p, "ink", pts, width, { ink, inkEnd: ink * 0.4, seed, tremor: 0.6 });
/** A fall of hair in strands between two lines. */
function tress(p: InkRisoPen, a: readonly PenPoint[], b: readonly PenPoint[], n: number, seed: number, ink = 0.92) {
  const r = inkRandom(seed);
  for (let i = 0; i < n; i++) { const u = (i + r.next() * 0.8) / n, cut = r.in(0.82, 1.04), pts: PenNode[] = a.map((q, k) => { const t = k / (a.length - 1); return [lerp(q[0], b[k][0], u) + (r.next() - 0.5) * 3, lerp(q[1], b[k][1], u) * (k === a.length - 1 ? lerp(1, cut, 0.1) : 1), k === 0 ? 0.6 : t > 0.85 ? 0.12 : 1] as const; }); inkSide(p, "ink", pts, r.in(5, 11), { tip: ink * r.in(0.75, 1.05), belly: 0.5, side: r.chance(0.5) ? 1 : -1, head: 0.2, rim: 0, dry: 0.12, dryEnd: 1, grain: 0.8, seed: seed * 3 + i }); }
}

export interface InkSwordsmanOptions { seed?: number; robe?: InkPigment; sash?: InkPigment; wind?: number }
/** A swordsman from behind: hair tied high and blown to the right, a pale robe, a sword slung at the waist. */
export function inkSwordsman(o: InkSwordsmanOptions = {}): InkSubject {
  const W = 900, H = 1200, seed = o.seed ?? 1, robe = o.robe ?? "indigo", sash = o.sash ?? "cinnabar", wind = o.wind ?? 1, pigs: InkPigment[] = [...new Set<InkPigment>([robe, "peach", sash, "ink"])];
  const body: PenPoint[] = [[404, 292], [424, 280], [458, 280], [484, 292], [530, 304], [546, 336], [540, 400], [512, 478], [526, 560], [556, 700], [604, 856], [676, 1012], [676, 1012], [640, 1036], [560, 1062], [470, 1084], [388, 1080], [336, 1062], [336, 1062], [346, 940], [360, 800], [372, 660], [384, 540], [378, 478], [356, 400], [344, 336], [358, 306]];
  return { id: "swordsman", label: "A swordsman seen from behind, robe and hair blown by the wind", page: { width: W, height: H }, plates: inkPlates(pigs), seed, parts: [
    { id: "hem", box: [300, 470, 560, 660], motion: [{ kind: "sway", from: [440, 520], to: [700, 1050], amount: 22 * wind, seconds: 3.2, lag: 0.5, power: 1.6, gust: 0.5 }], draw: ({ page: p }) => {
      // the skirt of the outer robe, flung out to the right by the wind, with the inner one and the boots below it
      cloth(p, [[432, 520], [520, 560], [600, 700], [700, 850], [826, 962], [850, 998], [850, 998], [780, 1002], [744, 1018], [690, 1044], [640, 1038], [600, 1030], [500, 900], [440, 700]], [{ plate: robe, tone: (x, y) => 0.12 + 0.2 * ss(500, 800, x) * inkFbm2(seed + 2, x / 90, y / 120, 3) * 2 }, { plate: "ink", tone: (x, y) => 0.1 + 0.34 * ss(0.5, 0.72, inkFbm2(seed + 4, (x - y * 0.6) / 40, y / 260, 3)) }], seed + 10);
      fold(p, [[516, 548, 0.5], [590, 690, 1], [690, 840, 0.9], [818, 956, 0.6]], 20, 0.82, seed + 14, { side: -1 });
      fold(p, [[486, 590, 0.4], [566, 780, 1], [680, 930, 0.9], [764, 1006, 0.3]], 16, 0.6, seed + 15); fold(p, [[468, 640, 0.4], [520, 820, 1], [620, 980, 0.8], [690, 1036, 0.3]], 15, 0.66, seed + 16);
      fold(p, [[842, 998, 0.4], [790, 1002, 0.9], [756, 1012, 0.6], [690, 1042, 0.8], [640, 1036, 0.4]], 9, 0.84, seed + 17, { side: 0 });
      // boots
      for (const [x, t] of [[424, 0.9], [520, 0.86]] as const) { cloth(p, [[x - 22, 1040], [x + 20, 1040], [x + 18, 1096], [x + 30, 1118], [x + 26, 1130], [x - 14, 1132], [x - 26, 1120], [x - 22, 1096]], [{ plate: "ink", tone: t }], seed + x); }
    } },
    { id: "robe", box: [300, 230, 420, 890], group: "torso", motion: [{ kind: "breathe", at: [440, 520], amount: 0.008, seconds: 4.4 }], draw: ({ page: p }) => {
      cloth(p, body, [{ plate: robe, tone: (x, y) => 0.1 + 0.34 * ss(420, 530, x + 0.08 * (y - 500)) * (0.6 + 0.8 * inkFbm2(seed + 6, x / 60, y / 160, 3)) }, { plate: "ink", tone: (x, y) => 0.05 + 0.26 * ss(0.5, 0.74, inkFbm2(seed + 8, (x - y * 0.12) / 34, y / 260, 3)) * ss(480, 620, y) + 0.14 * ss(480, 530, x) }], seed + 20);
      // the fall of the skirt from the waist
      const folds: [PenNode[], number, number][] = [[[[400, 500, 0.5], [392, 660, 1], [376, 860, 0.8], [352, 1056, 0.3]], 15, 0.7], [[[424, 506, 0.5], [428, 700, 1], [416, 900, 0.9], [402, 1074, 0.3]], 18, 0.78], [[[452, 508, 0.5], [470, 690, 1], [480, 900, 0.9], [478, 1078, 0.3]], 13, 0.56], [[[482, 506, 0.5], [512, 680, 1], [548, 860, 0.9], [578, 1052, 0.3]], 19, 0.8], [[[508, 520, 0.4], [546, 700, 1], [590, 860, 0.8], [654, 1020, 0.3]], 12, 0.6]];
      folds.forEach(([q, w, t], i) => fold(p, q, w, t, seed + 30 + i, { side: i % 2 ? 1 : -1, dry: 0.2 }));
      fold(p, [[338, 1062, 0.5], [388, 1082, 1], [470, 1086, 0.9], [560, 1064, 0.9], [640, 1036, 0.7], [676, 1010, 0.3]], 8, 0.82, seed + 40, { side: 0 });
      // the back of the coat
      fold(p, [[440, 300, 0.4], [446, 380, 1], [440, 470, 0.5]], 11, 0.4, seed + 41); fold(p, [[388, 400, 0.5], [404, 452, 1], [424, 484, 0.4]], 12, 0.5, seed + 42); fold(p, [[510, 390, 0.5], [492, 446, 1], [468, 484, 0.4]], 14, 0.62, seed + 43, { side: -1 });
      fold(p, [[486, 292, 0.4], [530, 303, 1], [547, 338, 0.9], [540, 402, 1], [513, 476, 0.6]], 13, 0.86, seed + 44, { side: -1 }); fold(p, [[402, 293, 0.4], [358, 306, 1], [344, 340, 0.7]], 9, 0.7, seed + 45);
      fold(p, [[372, 480, 0.4], [384, 560, 1], [374, 680, 1], [358, 820, 0.8], [340, 1060, 0.4]], 11, 0.62, seed + 46, { dry: 0.3 });
    } },
    { id: "sleeve", box: [210, 270, 270, 450], motion: [{ kind: "sway", from: [380, 320], to: [330, 640], amount: 9 * wind, seconds: 3.6, lag: 0.3, power: 1.6 }], draw: ({ page: p }) => {
      // the near arm hangs, its sleeve wide at the cuff and filled by the wind
      cloth(p, [[356, 306], [384, 314], [402, 352], [400, 430], [412, 520], [440, 612], [452, 664], [452, 664], [404, 690], [340, 692], [268, 668], [236, 640], [236, 640], [264, 560], [290, 470], [312, 390], [330, 330]], [{ plate: robe, tone: (x, y) => 0.08 + 0.2 * ss(340, 430, x) + 0.16 * inkFbm2(seed + 12, x / 40, y / 90, 2) }, { plate: "ink", tone: (x, y) => 0.04 + 0.24 * ss(0.5, 0.7, inkFbm2(seed + 14, (x + y * 0.3) / 26, y / 160, 3)) + 0.16 * ss(600, 690, y) }], seed + 50);
      fold(p, [[358, 305, 0.5], [330, 332, 1], [311, 392, 0.9], [288, 472, 1], [262, 562, 0.9], [235, 640, 0.5]], 12, 0.86, seed + 54); fold(p, [[402, 360, 0.3], [400, 432, 1], [413, 522, 0.9], [441, 614, 1], [453, 664, 0.4]], 14, 0.8, seed + 55, { side: -1 });
      fold(p, [[234, 640, 0.5], [270, 671, 1], [340, 695, 0.8], [404, 692, 1], [455, 664, 0.5]], 7, 0.9, seed + 56, { side: 0 });
      // the inside of the cuff
      inkBloom(p, "ink", p.shape([[250, 654], [300, 664], [360, 672], [440, 664], [404, 688], [340, 690], [282, 674]]), { tone: 0.6, soft: 1, wander: 0.5, fringe: 0.5, rim: 0.2, seed: seed + 59 });
      fold(p, [[338, 420, 0.4], [326, 520, 1], [300, 640, 0.3]], 13, 0.56, seed + 57); fold(p, [[366, 400, 0.3], [366, 520, 1], [352, 668, 0.3]], 11, 0.5, seed + 58); fold(p, [[392, 460, 0.3], [400, 560, 1], [406, 676, 0.3]], 10, 0.6, seed + 157, { side: -1 }); fold(p, [[318, 398, 0.5], [350, 422, 1], [392, 426, 0.3]], 8, 0.6, seed + 158);
    } },
    { id: "sword", box: [360, 380, 440, 320], group: "torso", draw: ({ page: p }) => {
      fold(p, [[388, 412, 0.9], [420, 440, 1], [470, 480, 1], [600, 584, 1], [770, 716, 0.7]], 12, 0.98, seed + 60, { side: 0, belly: 0.8, dry: 0.06, dryEnd: 0.3 });
      fold(p, [[404, 450, 0.8], [424, 436, 1], [440, 418, 0.8]], 9, 0.96, seed + 61, { side: 0, belly: 0.8, dry: 0.05 });
      inkBloom(p, sash, p.disc(386, 410, 8), { tone: 0.95, soft: 0.8, wander: 0.3, fringe: 0.5, rim: 0.3, seed: seed + 62 });
      thread(p, [[386, 416, 0.8], [374, 452, 1], [384, 496, 0.8], [376, 534, 0.3]], 3.4, 0.5, seed + 63); inkThread(p, sash, [[384, 414, 0.8], [372, 452, 1], [380, 500, 0.9], [370, 548, 0.5]], 5, { ink: 0.95, inkEnd: 0.8, seed: seed + 64 }); inkThread(p, sash, [[387, 414, 0.8], [380, 460, 1], [390, 506, 0.9], [384, 556, 0.5]], 4, { ink: 0.9, inkEnd: 0.7, seed: seed + 65 });
      // the sash over it
      cloth(p, [[376, 474], [376, 474], [440, 486], [514, 472], [514, 472], [520, 504], [520, 504], [442, 520], [380, 506], [380, 506]], [{ plate: sash, tone: 0.86 }, { plate: "ink", tone: x => 0.05 + 0.3 * ss(470, 520, x) }], seed + 66);
      fold(p, [[370, 473, 0.6], [440, 486, 1], [516, 471, 0.7]], 4, 0.8, seed + 67, { side: 0 }); fold(p, [[374, 506, 0.6], [442, 521, 1], [520, 504, 0.7]], 4, 0.84, seed + 68, { side: 0 });
    } },
    { id: "tails", box: [420, 480, 400, 420], motion: [{ kind: "sway", from: [470, 500], to: [720, 760], amount: 26 * wind, seconds: 2.8, lag: 0.6, power: 1.5, gust: 0.6 }], draw: ({ page: p }) => { for (const [q, w] of [[[[474, 502, 0.8], [530, 600, 1], [612, 650, 0.8], [690, 740, 1], [742, 770, 0.5]], 30], [[[466, 504, 0.8], [500, 620, 1], [560, 720, 0.8], [610, 820, 1], [640, 880, 0.5]], 26]] as const) { inkSide(p, sash, q as unknown as PenNode[], w, { tip: 0.95, belly: 0.6, side: 1, head: 0.2, rim: 0.2, dry: 0.05, dryEnd: 0.5, seed: seed + w }); thread(p, (q as unknown as PenNode[]).map(v => [v[0] + 5, v[1] + 6, v[2]] as const), 2.2, 0.6, seed + w + 1); } } },
    { id: "head", box: [360, 120, 180, 180], group: "head", draw: ({ page: p }) => {
      // neck, the cheek seen past the hair, an ear
      cloth(p, [[424, 232], [466, 232], [464, 262], [474, 290], [442, 298], [412, 290], [422, 262]], [{ plate: "peach", tone: (x) => 0.26 + 0.2 * ss(440, 474, x) }, { plate: "ink", tone: (_, y) => 0.05 + 0.1 * ss(280, 240, y) }], seed + 70);
      cloth(p, [[462, 184], [480, 186], [487, 204], [485, 222], [476, 238], [462, 246]], [{ plate: "peach", tone: 0.32 }], seed + 69);
      thread(p, [[482, 186, 0.4], [488, 204, 1], [485, 224, 1], [474, 241, 0.8], [462, 248, 0.3]], 2.6, 0.8, seed + 68);
      // collar: one fold over the other
      fold(p, [[398, 296, 0.5], [420, 284, 1], [444, 290, 0.8], [468, 282, 1], [492, 296, 0.5]], 11, 0.92, seed + 71, { side: 0 }); fold(p, [[406, 304, 0.4], [442, 302, 1], [482, 304, 0.4]], 4, 0.6, seed + 171, { side: 0 });
      cloth(p, [[402, 186], [412, 154], [440, 138], [466, 148], [478, 172], [478, 200], [468, 226], [464, 246], [456, 260], [442, 254], [430, 262], [422, 248], [410, 226]], [{ plate: "ink", tone: 0.84, rim: 0.2 }], seed + 72);
      inkBloom(p, "peach", p.shape([[466, 198], [474, 196], [476, 208], [472, 222], [466, 220]]), { tone: 0.4, soft: 0.8, wander: 0.2, fringe: 0.4, rim: 0.5, seed: seed + 74 }); thread(p, [[466, 200, 0.5], [475, 197, 1], [476, 210, 1], [470, 223, 0.5]], 1.8, 0.6, seed + 75);
      const r = inkRandom(seed + 73);
      for (let i = 0; i < 26; i++) { const u = i / 25, x = lerp(408, 470, u), y = 256 - 34 * Math.abs(u - 0.5) * 2; thread(p, [[x, y, 0.3], [lerp(x, 442, 0.2) + (u - 0.5) * 34, 190 + r.in(-6, 6), 1], [442 + (u - 0.5) * 16, 136, 0.6]], r.in(2, 4), 0.98, seed + 80 + i); }
      for (const [x, dx] of [[428, -3], [438, 2], [456, 5]] as const) thread(p, [[x, 250, 0.8], [x + dx, 268, 0.7], [x + dx * 1.6, 282, 0.1]], 1.6, 0.8, seed + x);
    } },
    { id: "hair", box: [400, 60, 480, 440], motion: [{ kind: "sway", from: [446, 120], to: [760, 320], amount: 30 * wind, seconds: 3, lag: 0.7, power: 1.5, gust: 0.6 }], draw: ({ page: p }) => {
      tress(p, [[436, 112], [490, 92], [570, 128], [660, 170], [770, 190], [850, 176]], [[452, 136], [486, 150], [548, 214], [610, 280], [690, 350], [740, 400]], 34, seed + 120);
      cloth(p, [[424, 132], [432, 106], [446, 98], [460, 108], [464, 132], [444, 142]], [{ plate: "ink", tone: 0.95 }], seed + 160);
      inkSide(p, sash, [[424, 130, 0.8], [444, 138, 1], [466, 130, 0.8]], 11, { tip: 0.98, belly: 0.7, side: 0, seed: seed + 161 });
      for (const q of [[[462, 132, 0.8], [520, 150, 1], [590, 156, 0.8], [660, 196, 0.4]], [[460, 136, 0.8], [510, 176, 1], [556, 206, 0.8], [600, 262, 0.4]]] as const) inkSide(p, sash, q as unknown as PenNode[], 9, { tip: 0.95, belly: 0.6, side: 1, dry: 0.05, dryEnd: 0.6, seed: seed + 162 + q[1][1] });
    } },
  ] };
}

export interface InkUmbrellaLadyOptions { seed?: number; umbrella?: InkPigment; robe?: InkPigment; wind?: number }
/** A lady walking away under an oiled-paper umbrella, her hair down her back. */
export function inkUmbrellaLady(o: InkUmbrellaLadyOptions = {}): InkSubject {
  const W = 760, H = 1160, seed = o.seed ?? 1, umb = o.umbrella ?? "cinnabar", robe = o.robe ?? "teal", wind = o.wind ?? 1, pigs: InkPigment[] = [...new Set<InkPigment>([robe, umb, "peach", "ink"])];
  const top: PenPoint = [432, 70];
  return { id: "umbrella-lady", label: "A lady walking away under an oiled-paper umbrella", page: { width: W, height: H }, plates: inkPlates(pigs), seed, parts: [
    { id: "skirt", box: [210, 620, 420, 500], motion: [{ kind: "sway", from: [400, 640], to: [400, 1080], amount: 10 * wind, seconds: 3.8, lag: 0.4, power: 1.7, gust: 0.4 }], draw: ({ page: p }) => {
      cloth(p, [[352, 640], [446, 640], [470, 720], [500, 840], [540, 960], [580, 1060], [580, 1060], [520, 1090], [430, 1104], [340, 1100], [262, 1080], [262, 1080], [290, 960], [318, 820], [336, 720]], [{ plate: robe, tone: (x, y) => 0.14 + 0.5 * ss(640, 1090, y) ** 1.4 * (0.5 + 0.9 * inkFbm2(seed + 2, x / 34, y / 300, 2)) }, { plate: "ink", tone: (x, y) => 0.04 + 0.22 * ss(0.5, 0.72, inkFbm2(seed + 4, (x - (x - 400) * (y - 640) * 0.0008) / 26, y / 300, 3)) }], seed + 10);
      const n = 11; for (let i = 0; i < n; i++) { const u = i / (n - 1), x0 = lerp(358, 442, u), x1 = lerp(272, 566, u), mid = lerp(330, 486, u); fold(p, [[x0, 648, 0.4], [mid, 820, 1], [lerp(mid, x1, 0.6), 980, 0.9], [x1, 1078 + 20 * Math.sin(Math.PI * u), 0.25]], 8 + 9 * inkFbm2(seed + 6, i * 2.3, 1, 2), 0.36 + 0.45 * inkFbm2(seed + 7, i * 3.1, 2, 2), seed + 20 + i, { side: i % 2 ? 1 : -1, dry: 0.2 }); }
      fold(p, [[262, 1080, 0.4], [340, 1102, 1], [430, 1106, 0.9], [520, 1092, 1], [582, 1060, 0.4]], 7, 0.76, seed + 40, { side: 0 });
    } },
    { id: "coat", box: [210, 380, 400, 420], group: "torso", motion: [{ kind: "breathe", at: [400, 640], amount: 0.008, seconds: 4.2 }], draw: ({ page: p }) => {
      // her right arm is raised to the umbrella, the left hangs in a long sleeve
      cloth(p, [[372, 402], [400, 392], [432, 400], [470, 428], [486, 480], [470, 560], [460, 650], [430, 664], [370, 664], [344, 650], [334, 560], [322, 480], [336, 428]], [{ plate: robe, tone: (x, y) => 0.16 + 0.16 * ss(420, 490, x) + 0.16 * inkFbm2(seed + 12, x / 50, y / 90, 3) }, { plate: "ink", tone: (x) => 0.05 + 0.2 * ss(430, 490, x) }], seed + 50);
      fold(p, [[400, 420, 0.4], [404, 520, 1], [398, 640, 0.4]], 9, 0.3, seed + 51); fold(p, [[346, 560, 0.5], [366, 620, 1], [384, 656, 0.4]], 11, 0.5, seed + 52); fold(p, [[458, 560, 0.5], [440, 616, 1], [420, 656, 0.4]], 12, 0.56, seed + 53, { side: -1 });
      cloth(p, [[336, 428], [356, 440], [360, 520], [350, 620], [346, 720], [352, 780], [352, 780], [300, 792], [250, 770], [250, 770], [268, 690], [292, 600], [310, 500]], [{ plate: robe, tone: (x, y) => 0.14 + 0.2 * ss(300, 360, x) + 0.12 * inkFbm2(seed + 14, x / 40, y / 90, 2) }, { plate: "ink", tone: (x, y) => 0.05 + 0.16 * ss(0.5, 0.7, inkFbm2(seed + 15, x / 22, y / 160, 2)) }], seed + 56);
      fold(p, [[336, 428, 0.5], [310, 500, 1], [290, 602, 0.9], [266, 692, 1], [252, 768, 0.5]], 12, 0.78, seed + 57); fold(p, [[358, 470, 0.3], [360, 540, 1], [350, 640, 0.9], [350, 778, 0.4]], 11, 0.66, seed + 58, { side: -1 }); fold(p, [[252, 770, 0.6], [302, 794, 1], [352, 780, 0.6]], 6, 0.86, seed + 59, { side: 0 }); fold(p, [[330, 520, 0.4], [316, 620, 1], [304, 740, 0.3]], 10, 0.44, seed + 60);
      cloth(p, [[470, 428], [500, 452], [536, 440], [560, 400], [578, 404], [584, 460], [572, 540], [540, 580], [500, 560], [478, 500]], [{ plate: robe, tone: (_, y) => 0.16 + 0.22 * ss(440, 560, y) }, { plate: "ink", tone: (_, y) => 0.06 + 0.2 * ss(460, 570, y) }], seed + 62);
      fold(p, [[470, 428, 0.5], [502, 452, 1], [538, 438, 0.8], [562, 400, 0.4]], 9, 0.72, seed + 63, { side: 0 }); fold(p, [[580, 406, 0.4], [586, 462, 1], [572, 540, 1], [540, 582, 0.8], [500, 560, 0.3]], 11, 0.82, seed + 64, { side: -1 }); fold(p, [[556, 430, 0.4], [546, 490, 1], [524, 548, 0.3]], 9, 0.5, seed + 65);
      inkBloom(p, "peach", p.shape([[556, 384], [576, 378], [584, 396], [570, 410], [556, 402]]), { tone: 0.55, soft: 0.8, wander: 0.2, fringe: 0.5, rim: 0.4, seed: seed + 66 });
      // sash
      cloth(p, [[341, 596], [341, 596], [400, 606], [466, 594], [466, 594], [463, 630], [463, 630], [400, 642], [344, 630], [344, 630]], [{ plate: umb, tone: 0.78 }, { plate: "ink", tone: (x) => 0.04 + 0.2 * ss(420, 470, x) }], seed + 68); fold(p, [[337, 596, 0.6], [400, 607, 1], [467, 594, 0.7]], 3.4, 0.76, seed + 69, { side: 0 }); fold(p, [[341, 631, 0.6], [400, 643, 1], [465, 630, 0.7]], 3.4, 0.8, seed + 70, { side: 0 });
    } },
    { id: "tails", box: [340, 600, 190, 400], motion: [{ kind: "sway", from: [400, 620], to: [430, 940], amount: 14 * wind, seconds: 3.2, lag: 0.6, power: 1.6 }], draw: ({ page: p }) => { for (const [q, w] of [[[[398, 630, 0.8], [404, 730, 1], [424, 830, 0.9], [420, 940, 0.5]], 22], [[[408, 630, 0.8], [424, 720, 1], [452, 800, 0.9], [466, 890, 0.5]], 18]] as const) { inkSide(p, umb, q as unknown as PenNode[], w, { tip: 0.9, belly: 0.55, side: 1, head: 0.2, dry: 0.05, dryEnd: 0.5, seed: seed + w + 80 }); thread(p, (q as unknown as PenNode[]).map(v => [v[0] + 5, v[1] + 3, v[2]] as const), 1.8, 0.5, seed + w + 81); } } },
    { id: "head", box: [320, 240, 180, 190], draw: ({ page: p }) => {
      cloth(p, [[382, 350], [424, 350], [430, 396], [402, 410], [376, 396]], [{ plate: "peach", tone: 0.36 }], seed + 90);
      cloth(p, [[356, 306], [366, 272], [402, 258], [438, 272], [448, 308], [444, 348], [424, 376], [400, 382], [376, 374], [360, 346]], [{ plate: "ink", tone: 0.88, rim: 0.2 }], seed + 91);
      fold(p, [[366, 400, 0.5], [402, 386, 1], [438, 400, 0.5]], 9, 0.8, seed + 92, { side: 0 });
    } },
    { id: "hair", box: [320, 250, 190, 420], motion: [{ kind: "sway", from: [402, 340], to: [402, 640], amount: 9 * wind, seconds: 4, lag: 0.5, power: 1.8 }], draw: ({ page: p }) => {
      tress(p, [[362, 300], [358, 370], [366, 440], [378, 520], [388, 610]], [[444, 300], [450, 370], [444, 440], [432, 520], [420, 620]], 26, seed + 100, 0.95);
      const r = inkRandom(seed + 104); for (let i = 0; i < 18; i++) { const u = i / 17, x = lerp(360, 446, u); thread(p, [[402 + (u - 0.5) * 20, 264, 0.4], [lerp(402, x, 0.8), 300 + r.in(-6, 6), 1], [x, 366, 0.5]], r.in(2, 3.6), 0.98, seed + 110 + i); }
      for (const [x, y, rr] of [[374, 262, 24], [430, 262, 24], [402, 244, 26]] as const) { cloth(p, [[x - rr, y], [x - rr * 0.6, y - rr * 0.8], [x + rr * 0.3, y - rr * 0.95], [x + rr, y - rr * 0.1], [x + rr * 0.6, y + rr * 0.8], [x - rr * 0.5, y + rr * 0.8]], [{ plate: "ink", tone: 0.92 }], seed + x + rr); thread(p, [[x - rr * 0.7, y + 4, 0.5], [x, y - rr * 0.5, 1], [x + rr * 0.7, y + 4, 0.5]], 2, 0.2, seed + x); }
      inkSide(p, umb, [[372, 384, 0.6], [402, 394, 1], [436, 384, 0.6]], 12, { tip: 0.95, belly: 0.6, side: 0, seed: seed + 140 });
      inkSide(p, umb, [[396, 392, 0.8], [388, 440, 1], [394, 500, 0.3]], 9, { tip: 0.9, belly: 0.6, side: 1, dryEnd: 0.6, seed: seed + 141 }); inkSide(p, umb, [[408, 392, 0.8], [418, 436, 1], [414, 486, 0.3]], 9, { tip: 0.9, belly: 0.6, side: 1, dryEnd: 0.6, seed: seed + 142 });
    } },
    { id: "umbrella", box: [60, 30, 690, 420], group: "umbrella", motion: [{ kind: "turn", at: [566, 400], degrees: 1.1, seconds: 4.8 }], draw: ({ page: p }) => {
      // the pole, then the paper: ribs run to the rim, and each bay dips between two of them
      fold(p, [[440, 92, 0.8], [500, 240, 1], [566, 398, 0.9], [575, 418, 0.7]], 8, 0.9, seed + 150, { side: 0, belly: 0.7, dry: 0.05, dryEnd: 0.3 });
      const bays = 9, tip = (i: number): PenPoint => { const a = Math.PI * (i / bays), x = -Math.cos(a) * 312, y = Math.sin(a) * 66; return [404 + x, 254 + x * 0.07 + y]; }, edge: PenPoint[] = [];
      for (let i = 0; i < bays; i++) { const a = tip(i), b = tip(i + 1); edge.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 12]); } edge.push(tip(bays));
      const dome = [...edge.map(q => p.at(...q)), ...p.shape([tip(bays), [lerp(tip(bays)[0], top[0], 0.34), lerp(tip(bays)[1], top[1], 0.62)], top, [lerp(tip(0)[0], top[0], 0.36), lerp(tip(0)[1], top[1], 0.62)], tip(0)], false)];
      inkVeilShape(p, dome, 1);
      inkBloom(p, umb, dome, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.5 + 0.4 * ss(120, 700, x) + 0.16 * (inkFbm2(seed + 16, x / 80, y / 60, 3) - 0.5) - 0.16 * ss(240, 80, y); }, soft: 1, wander: 0.5, fringe: 0.7, rim: 0.3, rimWidth: 5, mottle: 0.5, cloud: 60, seed: seed + 151 });
      inkBloom(p, "ink", dome, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.26 * ss(420, 730, x) + 0.16 * ss(250, 320, y); }, soft: 1, wander: 0.5, fringe: 0.7, mottle: 0.4, seed: seed + 152 });
      for (let i = 0; i <= bays; i++) { const b = tip(i), k = (i / bays - 0.5) * 2, m: PenPoint = [lerp(top[0], b[0], 0.55), lerp(top[1], b[1], 0.55) - 34 * (1 - Math.abs(k) * 0.2)]; thread(p, [[top[0] + k * 8, top[1] + 10, 0.6], [m[0], m[1], 0.9], [b[0], b[1], 1]], 2.6, 0.75, seed + 160 + i); }
      for (const t of [0.16, 0.2]) { const ring: PenNode[] = Array.from({ length: 13 }, (_, i) => { const b = tip((i / 12) * bays); return [lerp(top[0], b[0], t * 1.5), lerp(top[1], b[1], t * 1.2) + 4, 0.8] as const; }); thread(p, ring, 1.8, 0.45, seed + 180 + t * 100); }
      fold(p, edge.map(([x, y], i) => [x, y, i % 2 ? 0.6 : 1] as const), 4.4, 0.85, seed + 190, { side: 0, belly: 0.5, dry: 0.1 });
      fold(p, [[tip(0)[0], tip(0)[1], 0.5], [lerp(tip(0)[0], top[0], 0.36), lerp(tip(0)[1], top[1], 0.62), 1], [top[0], top[1], 0.7], [lerp(tip(bays)[0], top[0], 0.34), lerp(tip(bays)[1], top[1], 0.62), 1], [tip(bays)[0], tip(bays)[1], 0.6]], 5, 0.82, seed + 191, { side: 0, belly: 0.4, dry: 0.12 });
      inkBloom(p, "ink", p.shape([[426, 44], [438, 44], [442, 74], [432, 80], [422, 74]]), { tone: 0.95, soft: 0.8, wander: 0.3, fringe: 0.5, seed: seed + 192 });
    } },
  ] };
}
