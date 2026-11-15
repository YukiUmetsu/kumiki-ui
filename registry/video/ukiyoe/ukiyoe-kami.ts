/**
 * UKIYO1 kami and heavenly beings, after the flying celestials of Japanese temple art (Met netsuke 59277 and the
 * Asuka-style apsara tile 60778: the body arched along the flight, the robe trailing behind, a long scarf streaming in
 * loops), Kōno Bairei's *Luring the Sun Goddess out of the Cave* (Met 670889) and Hokkei's *Ebisu and Daikoku* (Met 54017:
 * Daikoku's round cap, raised mallet and great rice bag; Ebisu's folded cap, rod and red sea bream).
 *
 * - Look `stole`: the tennyo's hagoromo, a long gauze scarf from the shoulders streaming behind in two ribbons that wave
 *   and loop, longer and higher the faster she flies. `beads`: a string of magatama at the collar (the ancient gods).
 * - Hair `mizura` (the ancient man's hair looped at each ear) and `tenko` (the celestial's high crowned topknot).
 * - Hat `zukin` (Daikoku's soft round cap). Props `mirror` (the bronze sun-mirror held up, flashing), `tsurugi` (the
 *   straight ancient sword), `hoko` (the jewelled spear), `tai` (Ebisu's sea bream). Look `bag`: Daikoku's rice bag.
 * - Action `fly`: the figure rises and travels (`to`, `toY`), body leaning into the flight, legs trailing back.
 * - Motif `kumo`: an auspicious cloud (zuiun) with curled lobes and a long tail, for gods to stand on and ride.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

const f1 = (n: number) => n.toFixed(1);
type Map2 = (x: number, y: number) => Pt;

/**
 * The hagoromo scarf: from each shoulder a gauze ribbon runs down past the elbow and streams away behind, waving, its
 * end lifting into a loop. `speed` (0–1) stretches it out; `dir` is +1 when the figure faces right.
 */
export function stole(shF: Pt, shB: Pt, H: number, color: UkiyoePaint, frame: number, speed: number, wind: number, lw: number, seed = 0): Prim[] {
  const out: Prim[] = [];
  for (const [k, sh] of [[1, shB], [0, shF]] as const) {
    const pts: Pt[] = [], len = H * (.75 + .55 * speed), n = 16;
    for (let i = 0; i <= n; i++) {
      const u = i / n, wave = Math.sin(u * 5 - frame / 7 + k * 1.7 + seed) * H * .045 * u;
      // Down from the shoulder, then back and up behind as speed takes it; wind pushes it along.
      const x = sh[0] - u * len * (.35 + .6 * speed) - wind * H * .12 * u, y = sh[1] + H * .22 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - speed * .6) - u * u * H * (.15 + .35 * speed) + wave;
      pts.push([x, y + (k ? -H * .02 : 0)]);
    }
    const ribbon = carvedLine(pts, H * .028, { taper: "end", minRatio: .35, smooth: true });
    out.push({ t: "fill", d: ribbon, fill: { type: "linear", angle: 0, stops: [[0, color, .95], [1, color, .6]] }, outline: lw * .6, outlineColor: "usuzumi", opacity: k ? .75 : 1 });
    out.push({ t: "stroke", d: smoothD(pts.slice(2), false, .4), color: "gofun", width: lw * .6, opacity: .5 });
  }
  return out;
}

/** The scarf seen square on: two ribbons from the shoulders hanging and floating out to either side. */
export function stoleSquare(H: number, shY: number, shX: number, color: UkiyoePaint, frame: number, lw: number): Prim[] {
  const out: Prim[] = [];
  for (const s of [-1, 1]) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([s * (shX + u * H * .18 + Math.sin(u * 4 - frame / 8 + s) * H * .03 * u), shY + u * H * .55]); }
    out.push({ t: "fill", d: carvedLine(pts, H * .026, { taper: "end", minRatio: .4, smooth: true }), fill: color, outline: lw * .6, outlineColor: "usuzumi", opacity: .9 });
  }
  return out;
}

/** A string of magatama (comma-shaped jewels) at the collar, profile or square. */
export function magatama(c: Pt, H: number, lw: number, square = false): Prim[] {
  const out: Prim[] = [], n = square ? 7 : 4, beads: string[] = [];
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : .5, x = c[0] + (square ? (u - .5) * H * .1 : u * H * .04), y = c[1] + (square ? Math.sin(Math.PI * u) * H * .03 : u * H * .03);
    if (i % 2) beads.push(circleD(x, y, H * .005));
    else out.push({ t: "fill", d: smoothD([[x - H * .006, y - H * .004], [x + H * .005, y - H * .006], [x + H * .006, y + H * .006], [x - H * .002, y + H * .01], [x - H * .002, y + H * .003]], true, .5), fill: i % 4 ? "asagi" : "matsu", outline: lw * .4 });
  }
  out.push({ t: "dots", d: beads.join(""), color: "gofun" });
  return out;
}

/** Ancient hair, profile (head units ±20): `mizura` looped at the ear, or `tenko` (topknot with a gold crown). */
export function ancientHairSide(kind: "mizura" | "tenko", P: Map2, k: number, lw: number, hairC: UkiyoePaint, accent: UkiyoePaint): Prim[] {
  const out: Prim[] = [];
  // Hair smoothed over the crown, parted in the middle.
  out.push({ t: "fill", d: smoothD([P(-1, -21), P(9, -19), P(15, -10), P(11, -10), P(5, -12), P(0, -6), P(-3, 4), P(-10, 10), P(-16, 4), P(-17, -6), P(-12, -17)], true, .4), fill: hairC, outline: lw });
  if (kind === "mizura") {
    // The loops at the ear: two lobes of hair bound with a red cord, hanging to the jaw.
    out.push({ t: "fill", d: smoothD([P(-4, 0), P(-9, 4), P(-9, 12), P(-4, 15), P(-1, 10), P(-3, 6)], true, .45) + smoothD([P(-4, 14), P(-8, 18), P(-6, 25), P(-1, 24), P(0, 18)], true, .45), fill: hairC, outline: lw });
    out.push({ t: "line", d: carvedLine([P(-8.5, 13.5), P(-1, 13)], k * .9 + .4, { taper: "none" }), color: accent });
  } else {
    out.push({ t: "fill", d: smoothD([P(-9, -18), P(-10, -29), P(-2, -35), P(6, -31), P(5, -21)], true, .45), fill: hairC, outline: lw });
    out.push({ t: "fill", d: smoothD([P(-12, -22), P(-8, -30), P(-3, -27), P(2, -33), P(6, -26), P(10, -29), P(9, -21)], true, .3), fill: "kin", outline: lw * .7 });
    out.push({ t: "dots", d: circleD(...P(-3, -26), k * 1.2) + circleD(...P(6, -25), k * 1.2), color: accent });
    // Long hair down the back.
    out.push({ t: "fill", d: smoothD([P(-12, -6), P(-18, 10), P(-19, 40), P(-14, 70), P(-8, 66), P(-9, 30), P(-6, 6)], true, .4), fill: hairC, outline: lw });
  }
  return out;
}

/** Ancient hair from the front or behind (radius 1). */
export function ancientHairSquare(kind: "mizura" | "tenko", P: Map2, r: number, lw: number, hairC: UkiyoePaint, accent: UkiyoePaint, back: boolean): Prim[] {
  const out: Prim[] = [];
  out.push({ t: "fill", d: smoothD(back ? [P(-.95, -.3), P(-.9, .5), P(0, .7), P(.9, .5), P(.95, -.3), P(.6, -1.0), P(0, -1.12), P(-.6, -1.0)] : [P(-.95, -.1), P(-.85, -.95), P(0, -1.15), P(.85, -.95), P(.95, -.1), P(.5, -.75), P(0, -.85), P(-.5, -.75)], true, .4), fill: hairC, outline: lw });
  if (kind === "mizura") for (const s of [-1, 1]) {
    out.push({ t: "fill", d: ellipseD(s * r * 1.05, r * .2, r * .25, r * .32) + ellipseD(s * r * 1.05, r * .75, r * .2, r * .26), fill: hairC, outline: lw });
    out.push({ t: "line", d: carvedLine([P(s * .85, .5), P(s * 1.25, .5)], r * .08 + .4, { taper: "none" }), color: accent });
  } else {
    out.push({ t: "fill", d: smoothD([P(-.45, -1.0), P(-.4, -1.7), P(0, -1.9), P(.4, -1.7), P(.45, -1.0)], true, .45), fill: hairC, outline: lw });
    out.push({ t: "fill", d: smoothD([P(-.7, -1.15), P(-.5, -1.6), P(-.2, -1.4), P(0, -1.75), P(.2, -1.4), P(.5, -1.6), P(.7, -1.15)], true, .3), fill: "kin", outline: lw * .7 });
    out.push({ t: "dots", d: circleD(0, -1.45 * r, r * .1), color: accent });
  }
  return out;
}

/** Daikoku's soft round cap, profile or square (head units). */
export function zukin(P: Map2, lw: number, square = false): Prim[] {
  const pts: Pt[] = square ? [P(-1.1, -.35), P(-1.15, -1.0), P(0, -1.55), P(1.15, -1.0), P(1.1, -.35), P(0, -.55)] : [P(-17, -4), P(-18, -18), P(-2, -29), P(16, -20), P(16, -10), P(0, -14)];
  return [{ t: "fill", d: smoothD(pts, true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "kogecha", 1]] }, outline: lw, pattern: { type: "kikko", color: "kin", scale: .3, opacity: .25 } }];
}

/** The props, held at the hand `w` (profile and square alike). */
export function kamiProp(prop: "mirror" | "tsurugi" | "hoko" | "tai", w: Pt, H: number, lw: number, frame: number): Prim[] {
  if (prop === "mirror") {
    // A round bronze mirror held up facing out: a gold rim, the polished face catching light, a flash that comes and goes.
    const c: Pt = [w[0] + H * .03, w[1] - H * .06], r = H * .06, flash = Math.max(0, Math.sin(frame / 18)) ** 3;
    return [{ t: "glow", cx: c[0], cy: c[1], r: H * (.25 + .35 * flash), color: "gofun", opacity: .4 + .4 * flash },
      { t: "fill", d: ellipseD(c[0], c[1], r, r), fill: { type: "radial", stops: [[0, "gofun", 1], [.6, "kin", 1], [1, "kincha", 1]] }, outline: lw * 1.2 },
      { t: "stroke", d: ellipseD(c[0], c[1], r * .82, r * .82), color: "kincha", width: lw * 1.2 },
      { t: "stroke", d: [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2 + frame / 40; return `M${f1(c[0] + Math.cos(a) * r * 1.15)} ${f1(c[1] + Math.sin(a) * r * 1.15)}L${f1(c[0] + Math.cos(a) * r * (1.5 + .6 * flash))} ${f1(c[1] + Math.sin(a) * r * (1.5 + .6 * flash))}`; }).join(""), color: "ki", width: lw * 1.2, opacity: .5 + .5 * flash }];
  }
  if (prop === "tsurugi") {
    // The straight double-edged sword held upright: a ring pommel, a short grip, a broad blade with a central ridge.
    const tip: Pt = [w[0] + H * .03, w[1] - H * .5];
    return [{ t: "fill", d: smoothD([[w[0] - H * .014, w[1] - H * .05], [tip[0] - H * .002, tip[1] + H * .03], tip, [tip[0] + H * .004, tip[1] + H * .03], [w[0] + H * .016, w[1] - H * .05]], true, .1), fill: { type: "linear", angle: 0, stops: [[0, "usuzumi", 1], [.5, "gofun", 1], [1, "usuzumi", 1]] }, outline: lw },
      { t: "stroke", d: `M${f1(w[0])} ${f1(w[1] - H * .05)}L${f1(tip[0])} ${f1(tip[1] + H * .02)}`, color: "usuzumi", width: lw * .6 },
      { t: "fill", d: ellipseD(w[0], w[1] - H * .05, H * .03, H * .008), fill: "kin", outline: lw * .7 },
      { t: "fill", d: carvedLine([[w[0], w[1] - H * .04], [w[0] - H * .003, w[1] + H * .03]], H * .016, { taper: "none" }), fill: "cha", outline: lw * .6 },
      { t: "stroke", d: ellipseD(w[0] - H * .004, w[1] + H * .045, H * .014, H * .014), color: "kin", width: lw * 1.6 }];
  }
  if (prop === "hoko") {
    // The jewelled spear (amenonuhoko): a long shaft, a leaf-shaped blade, jewels and streamers below the head.
    const top: Pt = [w[0] + H * .05, w[1] - H * .75], bot: Pt = [w[0] - H * .02, w[1] + H * .25];
    return [{ t: "fill", d: carvedLine([bot, top], H * .014, { taper: "none" }), fill: "beni", outline: lw * .7 },
      { t: "fill", d: smoothD([[top[0] - H * .012, top[1]], [top[0], top[1] - H * .12], [top[0] + H * .012, top[1]]], true, .4), fill: "gofun", outline: lw },
      { t: "fill", d: ellipseD(top[0], top[1] + H * .01, H * .02, H * .01), fill: "kin", outline: lw * .6 },
      ...magatama([top[0] - H * .01, top[1] + H * .03], H * 1.6, lw),
      { t: "stroke", d: [0, 1].map(i => `M${f1(top[0])} ${f1(top[1] + H * .02)}q${f1(-H * .05)} ${f1(H * .08)} ${f1(-H * (.04 + .03 * i) + Math.sin(frame / 9 + i) * H * .02)} ${f1(H * .18)}`).join(""), color: "shu", width: lw * 1.4 }];
  }
  // Ebisu's sea bream tucked under the arm: red, scaled, its tail flipping now and then.
  const flip = Math.sin(frame / 7) * (Math.sin(frame / 31) > .6 ? 8 : 1);
  const c: Pt = [w[0] - H * .02, w[1] - H * .01], L = H * .11, hh = H * .045;
  return [{ t: "fill", d: smoothD([[c[0] + L, c[1]], [c[0] + L * .3, c[1] - hh], [c[0] - L * .6, c[1] - hh * .5], [c[0] - L, c[1]], [c[0] - L * .6, c[1] + hh * .5], [c[0] + L * .3, c[1] + hh * .7]], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "beni", 1], [1, "sakura", 1]] }, outline: lw, pattern: { type: "uroko", color: "shu", scale: .25, opacity: .5 } },
    { t: "group", transform: `rotate(${f1(flip)} ${f1(c[0] - L)} ${f1(c[1])})`, prims: [{ t: "fill", d: smoothD([[c[0] - L, c[1]], [c[0] - L * 1.4, c[1] - hh * .9], [c[0] - L * 1.3, c[1]], [c[0] - L * 1.4, c[1] + hh * .9]], true, .2), fill: "beni", outline: lw }] },
    { t: "fill", d: circleD(c[0] + L * .7, c[1] - hh * .15, H * .006), fill: "sumi" }];
}

/** Daikoku's rice bag over the shoulder: a great white sack tied at the neck, the treasure inside bulging it out. */
export function riceBag(back: Pt, H: number, lw: number): Prim[] {
  const c: Pt = [back[0] - H * .08, back[1] + H * .02];
  return [{ t: "fill", d: smoothD([[c[0] + H * .06, c[1] - H * .16], [c[0] - H * .1, c[1] - H * .12], [c[0] - H * .16, c[1] + H * .06], [c[0] - H * .04, c[1] + H * .16], [c[0] + H * .08, c[1] + H * .06]], true, .45), fill: { type: "radial", stops: [[0, "gofun", 1], [1, "paper", 1]] }, outline: lw },
    { t: "stroke", d: `M${f1(c[0] + H * .03)} ${f1(c[1] - H * .15)}l${f1(H * .05)} ${f1(-H * .02)}`, color: "ai", width: lw * 2.2 },
    { t: "stroke", d: smoothD([[c[0] - H * .1, c[1] - H * .02], [c[0] - H * .05, c[1] + H * .04], [c[0] + H * .02, c[1]]], false, .5), color: "usuzumi", width: lw * .6, opacity: .5 }];
}

// ---- Motif -------------------------------------------------------------------------------------------------------------------------

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;

/**
 * An auspicious cloud (zuiun / kumo): a flat-bottomed mass of curled lobes, each with its spiral, and a long tapering
 * tail streaming behind (to the left; flip the node to stream right). Params: width, color, tail (0–1).
 */
export function kumo(p: MP, c: { frame: number; seed: number }): Prim[] {
  const W = num(p, "width", 280), h = W * .28, tail = num(p, "tail", 1), color = typeof p.color === "string" ? p.color as UkiyoePaint : "gofun", lw = Math.max(1, W * .006);
  const lobes: string[] = [], curls: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = (i / 4 - .5) * W * .7, r = h * (.42 + .22 * Math.sin(Math.PI * i / 4)) * (1 + .03 * Math.sin(c.frame / 20 + i)), y = -r * .8;
    lobes.push(circleD(x, y, r));
    const sp: Pt[] = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10, a = Math.PI * (1 + 1.7 * u) + i; sp.push([x + Math.cos(a) * r * .6 * (1 - u * .65), y + Math.sin(a) * r * .55 * (1 - u * .65)]); }
    curls.push(carvedLine(sp, lw * 1.6, { taper: "end", minRatio: .2, smooth: true }));
  }
  lobes.push(`M${f1(-W * .45)} 0L${f1(W * .45)} 0L${f1(W * .42)} ${f1(-h * .4)}L${f1(-W * .42)} ${f1(-h * .4)}Z`);
  const tl: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; tl.push([-W * .4 - u * W * .9 * tail, -h * .3 - Math.sin(u * 4 + c.frame / 15 + c.seed) * h * .2 * u - u * h * .25]); }
  const tailD = carvedLine(tl, h * .5, { taper: "end", minRatio: .05, smooth: true });
  return [{ t: "fill", d: [...lobes, tailD].join(""), fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "sora", 1]] }, outline: lw * 1.2, outlineColor: "usuzumi", union: true },
    { t: "fill", d: curls.join(""), fill: "usuzumi", opacity: .6 }];
}

export const KAMI_MOTIFS = { kumo };
export const ANIMATED_KAMI = ["kumo"] as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

export type UkiyoeKamiScene = "hagoromo" | "amaterasu" | "luck" | "susanoo";
export const UKIYOE_KAMI_SCENES: readonly UkiyoeKamiScene[] = ["hagoromo", "amaterasu", "luck", "susanoo"];

export const UKIYOE_KAMI_LOOKS = {
  tennyo: { hair: "tenko", robe: "gofun", robePattern: { type: "kikko", color: "kin", scale: .4, opacity: .4 }, under: "beni", obi: "kin", feet: "bare", build: "slim", stole: "sakura", accent: "beni" },
  amaterasu: { hair: "tenko", robe: "gofun", under: "shu", obi: "kin", feet: "bare", build: "slim", prop: "mirror", beads: true, stole: "kin", accent: "shu" },
  susanoo: { hair: "mizura", robe: "ai", lower: "hakama", hakama: "gofun", obi: "kin", feet: "bare", build: "stout", prop: "tsurugi", beads: true, beard: true, accent: "shu" },
  izanagi: { hair: "mizura", robe: "gofun", lower: "hakama", hakama: "gofun", obi: "beni", feet: "bare", build: "average", prop: "hoko", beads: true, accent: "beni" },
  ebisu: { hair: "chonmage", hat: "eboshi", robe: "ai", coat: "kincha", lower: "hakama", hakama: "beni", feet: "bare", build: "stout", prop: "tai", beard: true },
  daikoku: { hair: "chonmage", hat: "zukin", robe: "ai", robePattern: { type: "kikko", color: "kin", scale: .5, opacity: .5 }, lower: "hakama", hakama: "sumi", feet: "bare", build: "stout", prop: "kozuchi", bag: true },
} as const;

/**
 * `hagoromo`: the celestial maiden flies down over the pine shore, her scarf streaming, and away up again. `amaterasu`:
 * the sun goddess steps out of the rock cave holding the mirror, light pouring out. `luck`: Ebisu and Daikoku on a
 * cloud, Daikoku shaking the mallet. `susanoo`: the storm god on a cloud with his sword drawn, wind and cloud racing.
 */
export function kamiScene(kind: UkiyoeKamiScene = "hagoromo", frames = 300): UkiyoeSceneSpec {
  const nodes: UkiyoeNode[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, horizon: kind === "susanoo" ? "usuzumi" : "beni", ...(kind === "susanoo" ? { top: "ai", mid: "usuzumi" } : {}) } }];
  const look = (k: keyof typeof UKIYOE_KAMI_LOOKS) => UKIYOE_KAMI_LOOKS[k] as unknown as UkiyoeFigureLook;
  if (kind === "hagoromo") {
    nodes.push({ id: "sea", kind: "motif", motif: "sea", y: 820, params: { width: 1920, height: 260, rows: 8 } });
    nodes.push({ id: "pine", kind: "motif", motif: "pine", x: 1500, y: 900, params: { height: 520, lean: -10 } });
    nodes.push({ id: "fuji", kind: "motif", motif: "mountain", x: 600, y: 820, depth: .4, params: { width: 900, height: 420, snow: .45 } });
    const acts: UkiyoeAction[] = [{ type: "fly", start: 0, end: 150, to: 900, toY: 420 }, { type: "fly", start: 150, end: frames, to: 1900, toY: -200 }];
    nodes.push({ id: "tennyo", kind: "figure", x: -100, y: 280, scale: 1.3, look: look("tennyo"), facing: "right", actions: acts });
    nodes.push({ id: "petals", kind: "particles", type: "petals", count: 30, area: [0, 0, 1920, 700] } as UkiyoeNode);
  } else if (kind === "amaterasu") {
    nodes.push({ id: "rock", kind: "motif", motif: "rock", x: 1180, y: 900, params: { width: 900, height: 600 } });
    nodes.push({ id: "halo", kind: "motif", motif: "halo", x: 900, y: 470, params: { radius: 170 }, enter: { preset: "fade", frame: 40, duration: 60 } });
    nodes.push({ id: "ground", kind: "block", x: 960, y: 980, shape: { type: "rect", width: 1920, height: 220 }, fill: { type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] }, line: 0 });
    nodes.push({ id: "goddess", kind: "figure", x: 960, y: 960, scale: 2, look: look("amaterasu"), facing: "left", actions: [{ type: "walk", start: 40, end: 160, to: -60 }, { type: "hold", start: 0, end: frames, angle: 120, amount: 30 }] });
  } else if (kind === "luck") {
    nodes.push({ id: "cloud", kind: "motif", motif: "kumo", x: 960, y: 760, params: { width: 900 }, loops: [{ kind: "bob", amplitude: 10, period: 120 }] });
    nodes.push({ id: "ebisu", kind: "figure", x: 800, y: 740, scale: 1.7, look: look("ebisu"), facing: "right", actions: [{ type: "dance", start: 0, end: frames }] });
    nodes.push({ id: "daikoku", kind: "figure", x: 1120, y: 740, scale: 1.7, look: look("daikoku"), facing: "left", actions: [{ type: "shake", start: 30, end: frames }] });
  } else {
    nodes.push({ id: "cloud", kind: "motif", motif: "kumo", x: 1000, y: 820, params: { width: 760, color: "gofun" }, loops: [{ kind: "drift", amplitude: 30, period: 90 }] });
    nodes.push({ id: "god", kind: "figure", x: 1000, y: 800, scale: 2, look: look("susanoo"), facing: "right", actions: [{ type: "brace", start: 0, end: frames, angle: 8 }] });
    nodes.push({ id: "rain", kind: "particles", type: "rain", count: 160, angle: 24 } as UkiyoeNode);
    nodes.push({ id: "bolt", kind: "particles", type: "lightning", area: [0, 0, 1920, 1080], bursts: [{ frame: 90, x: 1500, y: 900 }, { frame: 220, x: 400, y: 900 }] } as UkiyoeNode);
  }
  return { version: 1, id: `kami-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 31, cadence: 2, palette: { preset: kind === "susanoo" ? "night" : "spring" }, wind: { base: kind === "susanoo" ? 1.2 : .3, turbulence: .5 }, nodes };
}
