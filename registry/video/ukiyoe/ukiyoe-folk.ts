/**
 * UKIYO1 folk work and its tools, after the screen *Farmers' Lives in the Twelve Months* (Met 44674: hoeing with tied-back
 * sleeves and headbands, lunch carried out to the field) and Toyonobu's *Woman Washing Clothes* (Met 55779): the everyday
 * actions the folktales turn on.
 *
 * Swinging tools run on their own timeline (`toolAt`), the way the katana and the oni's club do: `chop` swings an axe
 * (ono) down onto a chopping block, `hoe` drives a hoe (kuwa) into the ground ahead, `pound` brings the mochi pestle
 * (kine) down into the mortar. Each stroke lifts slowly over the shoulder, hangs a moment, comes down fast and lands
 * on its contact point (`toolContact`, so a scene can put the block, the field or the mortar exactly there), where
 * chips, clods or a squash of mochi fly. Both hands are placed on the handle by IK.
 *
 * Also: `wash` (kneeling at a tub, both hands scrubbing the cloth at `aim`), `shake` (the mallet of luck shaken
 * overhead, coins and rice pouring from it), the props `kozuchi`, `onigiri` and `firewood` (a bundle carried on the
 * back), the `hachi` hat (Hachikazuki's great lacquered bowl), and the motifs `stump`, `usu` and `tarai`.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, DEG, hash01, lerp, smoothD, span } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeAction } from "./ukiyoe-figure";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";

export type UkiyoeTool = "axe" | "hoe" | "kine";
type ToolAction = "chop" | "hoe" | "pound";
const f1 = (n: number) => n.toFixed(1);
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
const WOOD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "cha", 1], [.5, "kincha", 1], [1, "cha", 1]] };

/**
 * Each tool's stroke, in heights (facing right, feet at the origin): the grip and handle angle at rest on the contact
 * (`g1`, `a1`) and raised over the shoulder (`g0`, `a0`); `L` the handle length to the head; the stroke period.
 * Angles in degrees on the page: 0 points forward, 90 down, −90 up.
 */
const STROKE: Readonly<Record<ToolAction, { tool: UkiyoeTool; L: number; g0: Pt; a0: number; g1: Pt; a1: number; period: number }>> = {
  chop: { tool: "axe", L: .42, g0: [-.02, -.98], a0: -150, g1: [.2, -.45], a1: 35, period: 40 },
  hoe: { tool: "hoe", L: .6, g0: [.0, -.92], a0: -140, g1: [.22, -.5], a1: 55, period: 46 },
  pound: { tool: "kine", L: .5, g0: [.04, -1.0], a0: -115, g1: [.22, -.45], a1: 25, period: 50 },
};
export const isToolAction = (t: string): t is ToolAction => t === "chop" || t === "hoe" || t === "pound";

/** Where the tool's head lands at the strike (figure frame, facing right, feet at the origin), for a figure of height H. */
export function toolContact(action: ToolAction, H: number): Pt {
  const s = STROKE[action];
  return [s.g1[0] * H + Math.cos(s.a1 * DEG) * s.L * H, s.g1[1] * H + Math.sin(s.a1 * DEG) * s.L * H];
}

/**
 * The stroke at a frame within the cycle: the slow lift, a held moment at the top, the fast drop (ease-in, so it is
 * fastest as it lands), the strike held while the head bites. `hit` pulses 1 → 0 just after contact.
 */
function stroke(action: ToolAction, t: number): { grip: Pt; a: number; hit: number; up: number; down: number; since: number } {
  // Phase boundaries on whole frames, so the head lands exactly on a frame.
  const s = STROKE[action], P = s.period, f = ((t % P) + P) % P, lift = Math.round(P * .55), hang = Math.round(P * .66), hit = Math.round(P * .8);
  let k: number, down = 0;
  if (f < lift) k = smooth(f / lift);                                  // lifting
  else if (f < hang) k = 1;                                            // hanging at the top
  else if (f < hit) { const v = (f - hang) / (hit - hang); k = 1 - v * v; down = v; }   // falling, accelerating
  else k = 0;
  const since = f >= hit ? f - hit : -1;
  return { grip: lerp2(s.g1, s.g0, k), a: lerp(s.a1, s.a0, k), hit: since >= 0 ? Math.max(0, 1 - since / 8) : 0, up: k, down, since };
}

/** The tool state for a figure at a frame (undefined when no tool action is running). Grip in heights. */
export function toolAt(actions: readonly UkiyoeAction[], frame: number): { action: ToolAction; tool: UkiyoeTool; grip: Pt; a: number; hit: number; up: number; down: number; since: number; w: number } | undefined {
  for (const a of actions) {
    if (!isToolAction(a.type) || frame < a.start || frame > a.end) continue;
    const st = stroke(a.type, frame - a.start), w = smooth(span(frame, a.start, a.start + 6)) * (1 - smooth(span(frame, a.end - 6, a.end)));
    return { action: a.type, tool: STROKE[a.type].tool, ...st, w };
  }
  return undefined;
}

/** The frames on which a tool action's head lands, one per stroke. */
export function toolStrikes(a: { type: string; start: number; end: number }): number[] {
  if (!isToolAction(a.type)) return [];
  const P = STROKE[a.type].period, out: number[] = [];
  for (let f = a.start + Math.round(P * .8); f <= a.end; f += P) out.push(f);
  return out;
}

/** How a stroke moves the body: leaning back as the tool goes up, throwing the weight forward and down as it falls. */
export function toolBody(st: { up: number; down: number; hit: number }): { lean: number; crouch: number; tilt: number; hipF: number; hipB: number; knF: number } {
  const fwd = Math.max(st.down, st.hit);
  return { lean: -6 * st.up + 18 * fwd, crouch: .06 + .16 * fwd, tilt: -8 * st.up + 10 * fwd, hipF: 12 + 6 * fwd, hipB: -10, knF: 10 + 14 * fwd };
}

/** The tools, drawn from the front hand's grip along the handle at angle `a`. */
export function drawTool(tool: UkiyoeTool, grip: Pt, a: number, H: number, lw: number): Prim[] {
  const L = STROKE[tool === "axe" ? "chop" : tool === "hoe" ? "hoe" : "pound"].L * H, u: Pt = [Math.cos(a * DEG), Math.sin(a * DEG)], n: Pt = [-u[1], u[0]];
  const at = (t: number, d: number): Pt => [grip[0] + u[0] * L * t + n[0] * d, grip[1] + u[1] * L * t + n[1] * d];
  const out: Prim[] = [];
  const handle = carvedLine([at(-.2, 0), at(1.02, 0)], H * (tool === "kine" ? .02 : .016), { taper: "none" });
  out.push({ t: "fill", d: handle, fill: WOOD, outline: lw * .7 });
  if (tool === "axe") {
    // The axe head: an iron wedge on the end of the handle, its edge facing down along the stroke.
    const h = H * .05;
    out.push({ t: "fill", d: smoothD([at(.9, -h * .35), at(1.04, -h * .35), at(1.07, h * 1.3), at(.86, h * 1.4)], true, .15), fill: { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.7, "usuzumi", 1], [1, "gofun", 1]] }, outline: lw });
  } else if (tool === "hoe") {
    // The hoe blade set at right angles across the handle's end, broad and flat.
    const h = H * .07;
    out.push({ t: "fill", d: smoothD([at(.98, -h * .2), at(1.04, -h * .2), at(1.06, h), at(.92, h * 1.05)], true, .15), fill: { type: "linear", angle: 0, stops: [[0, "usuzumi", 1], [1, "gofun", 1]] }, outline: lw });
  } else {
    // The kine: a heavy wooden barrel head set across the handle.
    const r = H * .045, w = H * .17;
    out.push({ t: "fill", d: smoothD([at(1 - r / L, -w * .5), at(1 + r / L, -w * .5), at(1 + r / L, w * .5), at(1 - r / L, w * .5)], true, .15), fill: WOOD, outline: lw, grain: .7 });
    out.push({ t: "fill", d: ellipseD(...at(1, w * .5), r, r * .5), fill: "kincha", outline: lw * .7 });
  }
  return out;
}

/** What flies at the strike: wood chips from the block, clods of earth, a squash of white mochi. In the figure frame. */
export function strikeBits(action: ToolAction, contact: Pt, since: number, H: number, seed: number): Prim[] {
  if (since < 0 || since > 16) return [];
  const out: Prim[] = [], n = action === "pound" ? 5 : 8, color: UkiyoePaint = action === "chop" ? "kincha" : action === "hoe" ? "cha" : "gofun", bits: string[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (-160 + 140 * hash01(seed, i, 1)) * DEG, sp = H * (.006 + .008 * hash01(seed, i, 2)), t = since;
    const x = contact[0] + Math.cos(ang) * sp * t, y = contact[1] + Math.sin(ang) * sp * t + .5 * H * .0012 * t * t;
    const r = H * (action === "chop" ? .007 : .009) * (1 - t / 18);
    bits.push(action === "chop" ? `M${f1(x - r * 1.6)} ${f1(y)}L${f1(x)} ${f1(y - r * .6)}L${f1(x + r * 1.6)} ${f1(y)}L${f1(x)} ${f1(y + r * .6)}Z` : circleD(x, y, r));
  }
  out.push({ t: "fill", d: bits.join(""), fill: color, outline: .6, opacity: 1 - since / 16 });
  if (action !== "pound") out.push({ t: "fill", d: ellipseD(contact[0], contact[1], H * .06 * (1 + since / 10), H * .015), fill: "paper", opacity: .4 * (1 - since / 16), noPrint: true });
  return out;
}

/** The mallet of luck (uchide-no-kozuchi): a red-lacquered mallet with gold bands, held at `hand`, pointing at `a`. */
export function kozuchi(hand: Pt, a: number, H: number, lw: number): Prim[] {
  const u: Pt = [Math.cos(a * DEG), Math.sin(a * DEG)], n: Pt = [-u[1], u[0]], L = H * .16, w = H * .06, r = H * .03;
  const head: Pt = [hand[0] + u[0] * L, hand[1] + u[1] * L];
  const q = (t: number, d: number): Pt => [head[0] + n[0] * t + u[0] * d, head[1] + n[1] * t + u[1] * d];
  return [{ t: "fill", d: carvedLine([hand, head], H * .014, { taper: "none" }), fill: "beni", outline: lw * .7 },
    { t: "fill", d: smoothD([q(-w, -r), q(w, -r), q(w, r), q(-w, r)], true, .15), fill: { type: "linear", angle: 0, stops: [[0, "beni", 1], [.5, "shu", 1], [1, "beni", 1]] }, outline: lw },
    { t: "stroke", d: [-.6, .6].map(k => { const a2 = q(w * k, -r), b = q(w * k, r); return `M${f1(a2[0])} ${f1(a2[1])}L${f1(b[0])} ${f1(b[1])}`; }).join(""), color: "kin", width: lw * 1.6 },
    { t: "fill", d: ellipseD(...q(w, 0), r * .45, r), fill: "kin", outline: lw * .6 }];
}

/** Treasure pouring from the shaken mallet: gold coins and grains of rice falling from its head, `t` frames into the shake. */
export function treasure(from: Pt, t: number, H: number, seed: number): Prim[] {
  const coins: string[] = [], rice: string[] = [];
  for (let i = 0; i < 26; i++) {
    const born = hash01(seed, i, 1) * 60, age = ((t - born) % 60 + 60) % 60;
    if (t < born) continue;
    const vx = (hash01(seed, i, 2) - .5) * H * .012, x = from[0] + vx * age, y = from[1] + .5 * H * .0011 * age * age;
    if (i % 3) rice.push(ellipseD(x, y, H * .006, H * .0035)); else coins.push(ellipseD(x, y, H * .02 * Math.abs(Math.cos(age / 4 + i)) + H * .003, H * .02));
  }
  return [{ t: "fill", d: coins.join("") || "M0 0", fill: "kin", outline: .6, outlineColor: "kincha" }, { t: "fill", d: rice.join("") || "M0 0", fill: "gofun" }, { t: "glow", cx: from[0], cy: from[1], r: H * .15, color: "ki", opacity: .35 }];
}

/** A rice ball (onigiri): a rounded white triangle with its band of nori, held in the hand. */
export function onigiri(c: Pt, r: number, lw: number): Prim[] {
  return [{ t: "fill", d: smoothD([[c[0], c[1] - r], [c[0] + r * .95, c[1] + r * .7], [c[0] - r * .95, c[1] + r * .7]], true, .45), fill: "gofun", outline: lw },
    { t: "fill", d: rectD(c[0] - r * .45, c[1] + r * .15, r * .9, r * .62), fill: "sumi" },
    { t: "dots", d: [0, 1, 2, 3, 4].map(i => circleD(c[0] + (i - 2) * r * .25, c[1] - r * .2 + (i % 2) * r * .15, r * .05)).join(""), color: "paper" }];
}

/** A bundle of firewood carried on the back: a lashed stack of sticks, their cut ends showing, on a carrying frame. */
export function firewood(back: Pt, H: number, lw: number): Prim[] {
  const out: Prim[] = [], w = H * .12, h = H * .34, x0 = back[0] - w, y0 = back[1] - h * .55;
  out.push({ t: "fill", d: rectD(x0, y0, w, h), fill: WOOD, outline: lw, grain: .8 });
  const sticks: string[] = [];
  for (let i = 0; i < 7; i++) { const x = x0 + w * (i + .5) / 7; sticks.push(`M${f1(x)} ${f1(y0 - H * (.03 + .03 * (i % 3)))}V${f1(y0 + h)}`); }
  out.push({ t: "stroke", d: sticks.join(""), color: "kogecha", width: lw * 1.4 });
  out.push({ t: "dots", d: Array.from({ length: 7 }, (_, i) => circleD(x0 + w * (i + .5) / 7, y0 - H * (.03 + .03 * (i % 3)), H * .008)).join(""), color: "kincha" });
  out.push({ t: "stroke", d: [.25, .7].map(k => `M${f1(x0 - H * .005)} ${f1(y0 + h * k)}h${f1(w + H * .01)}`).join(""), color: "kincha", width: lw * 2 });
  out.push({ t: "stroke", d: `M${f1(back[0])} ${f1(y0 + h * .2)}L${f1(back[0] + H * .03)} ${f1(back[1] - H * .12)}`, color: "kincha", width: lw * 1.4 });
  return out;
}

/** Hachikazuki's bowl: a great black-lacquered bowl over the head down to the nose, a gold rim. Head units (profile ±20). */
export function hachiSide(P: (x: number, y: number) => Pt, lw: number, square = false): Prim[] {
  const pts: Pt[] = square ? [P(-1.45, .15), P(-1.2, -1.0), P(0, -1.45), P(1.2, -1.0), P(1.45, .15), P(0, .3)] : [P(-24, 2), P(-20, -18), P(0, -28), P(20, -18), P(26, 2), P(0, 5)];
  return [{ t: "fill", d: smoothD(pts, true, .35), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [.5, "sumi", 1], [1, "sumi", 1]] }, outline: lw * 1.2 },
    { t: "stroke", d: smoothD([pts[0], pts[5], pts[4]], false, .4), color: "kin", width: lw * 2.2 },
    { t: "fill", d: smoothD(square ? [P(-.6, -.9), P(0, -1.25), P(.3, -1.1), P(-.2, -.85)] : [P(-6, -20), P(4, -24.5), P(9, -22), P(0, -19)], true, .4), fill: "gofun", opacity: .25 }];
}

// ---- Motifs ------------------------------------------------------------------------------------------------------------------------

type MP = Readonly<Record<string, unknown>>;
const num = (p: MP, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;

/** A chopping block: a broad stump with its end grain, a log standing on it, split pieces lying round. Params: size. */
export function stump(p: MP, cx: { seed: number }): Prim[] {
  const S = num(p, "size", 120), lw = Math.max(1, S * .012), out: Prim[] = [], top = -S * .45;
  out.push({ t: "fill", d: smoothD([[-S * .5, 0], [-S * .46, top], [S * .46, top], [S * .5, 0], [S * .3, S * .04], [-S * .3, S * .04]], true, .2), fill: WOOD, outline: lw, grain: .9 });
  out.push({ t: "fill", d: ellipseD(0, top, S * .46, S * .12), fill: "kincha", outline: lw });
  out.push({ t: "stroke", d: [.25, .55, .85].map(k => ellipseD(0, top, S * .46 * k, S * .12 * k)).join(""), color: "cha", width: lw * .6, opacity: .7 });
  for (let i = 0; i < 4; i++) {
    const x = (i < 2 ? -1 : 1) * S * (.6 + .25 * hash01(cx.seed, i, 1)), a = (hash01(cx.seed, i, 2) - .5) * 40;
    out.push({ t: "group", transform: `translate(${f1(x)} ${f1(S * .02)}) rotate(${f1(a)})`, prims: [{ t: "fill", d: smoothD([[-S * .18, 0], [S * .18, 0], [S * .12, -S * .1], [-S * .14, -S * .09]], true, .2), fill: "kincha", outline: lw }] });
  }
  return out;
}

/** The mochi mortar (usu): a wooden mortar on a short foot, white mochi heaped in its bowl (dented as it is struck). */
export function usu(p: MP, cx: { frame: number }): Prim[] {
  const S = num(p, "size", 150), lw = Math.max(1, S * .012), top = -S * .48, out: Prim[] = [];
  const squash = clamp01(num(p, "squash", 0));
  out.push({ t: "fill", d: smoothD([[-S * .42, top], [-S * .36, top + S * .2], [-S * .26, -S * .08], [-S * .32, 0], [S * .32, 0], [S * .26, -S * .08], [S * .36, top + S * .2], [S * .42, top]], true, .25), fill: WOOD, outline: lw, grain: .9 });
  out.push({ t: "stroke", d: [-.2, -.08].map(k => `M${f1(-S * .36)} ${f1(top + S * .2 + S * k * .2)}Q0 ${f1(top + S * .3)} ${f1(S * .36)} ${f1(top + S * .2 + S * k * .2)}`).join(""), color: "kogecha", width: lw * 1.4, opacity: .7 });
  out.push({ t: "fill", d: ellipseD(0, top, S * .42, S * .1), fill: "kogecha", outline: lw });
  const mound = S * (.12 - .06 * squash) * (1 + .03 * Math.sin(cx.frame / 9));
  out.push({ t: "fill", d: smoothD([[-S * .34, top], [-S * .22, top - mound * .9], [0, top - mound], [S * .22, top - mound * .9], [S * .34, top]], true, .45), fill: "gofun", outline: lw * .8 });
  return out;
}

/** A wooden wash tub (tarai): a shallow round tub of staves and hoops, water inside, a cloth in it. */
export function tarai(p: MP, cx: { frame: number }): Prim[] {
  const R = num(p, "radius", 90), lw = Math.max(1, R * .014), h = R * .32, ry = R * .3, out: Prim[] = [], top = -h;
  out.push({ t: "fill", d: ellipseD(0, top, R, ry), fill: "cha", outline: lw });
  out.push({ t: "fill", d: ellipseD(0, top + ry * .1, R * .9, ry * .8), fill: { type: "linear", angle: 90, stops: [[0, "sora", 1], [1, "asagi", 1]] } });
  const w = Math.sin(cx.frame / 6) * R * .04;
  out.push({ t: "fill", d: smoothD([[-R * .5 + w, top + ry * .2], [-R * .1 + w, top - ry * .1], [R * .4 + w, top + ry * .05], [R * .2 + w, top + ry * .5], [-R * .3 + w, top + ry * .55]], true, .4), fill: "ai", outline: lw * .7, pattern: { type: "kanoko", color: "gofun", scale: .4, opacity: .7 } });
  out.push({ t: "stroke", d: [.4, .7].map(k => ellipseD(w * 2, top + ry * .1, R * .9 * k, ry * .8 * k)).join(""), color: "gofun", width: lw * .6, opacity: .5 });
  out.push({ t: "fill", d: `M${f1(-R)} ${f1(top)}A${f1(R)} ${f1(ry)} 0 0 0 ${f1(R)} ${f1(top)}L${f1(R * .94)} 0A${f1(R * .94)} ${f1(ry)} 0 0 1 ${f1(-R * .94)} 0Z`, fill: WOOD, outline: lw, grain: .7 });
  out.push({ t: "stroke", d: `M${f1(-R * .97)} ${f1(top * .45)}A${f1(R * .97)} ${f1(ry)} 0 0 0 ${f1(R * .97)} ${f1(top * .45)}`, color: "sumi", width: lw * 1.8 });
  return out;
}

export const FOLK_MOTIFS = { stump, usu, tarai };
export const ANIMATED_FOLK = ["usu", "tarai"] as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

export type UkiyoeFolkWork = "woodcutter" | "farmer" | "mochi" | "washing" | "luck";
export const UKIYOE_FOLK_WORK: readonly UkiyoeFolkWork[] = ["woodcutter", "farmer", "mochi", "washing", "luck"];

/**
 * One work scene (1920 × 1080) by a farmhouse: `woodcutter` (an old man splitting firewood on a block, a bundle on his
 * back), `farmer` (hoeing the field, his wife bringing him a rice ball), `mochi` (a pair pounding mochi, one with the pestle, one turning the dough),
 * `washing` (Hachikazuki kneeling at her tub under her great bowl), `luck` (the mallet of luck shaken, treasure pouring out). The block, field,
 * mortar and tub are placed where the tools and hands land (`toolContact`, `aim`).
 */
export function folkScene(kind: UkiyoeFolkWork = "woodcutter", frames = 240): UkiyoeSceneSpec {
  const SC = 2.1, H = 250 * SC, x = 640, y = 960, nodes: UkiyoeNode[] = [
    { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .45, horizon: "beni" } },
    { id: "hills", kind: "motif", motif: "hills", x: 960, y: 760, params: { width: 2200, height: 200 } },
    { id: "house", kind: "motif", motif: "minka", x: 1560, y: 800, params: { width: 560, smoke: 1 } },
    { id: "ground", kind: "block", x: 960, y: 930, shape: { type: "rect", width: 1920, height: 360 }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] }, line: 0 },
  ];
  const man = (look: UkiyoeFigureLook, actions: UkiyoeAction[], id = "worker", px = x, facing: "left" | "right" = "right") => nodes.push({ id, kind: "figure", x: px, y, scale: SC, look, facing, actions } as UkiyoeNode);
  const elder: UkiyoeFigureLook = { hair: "elder", sleeves: "short", robe: "cha", robePattern: { type: "shima", color: "kogecha", scale: .5 }, obi: "kogecha", lower: "tucked", legs: "hada", feet: "waraji", build: "average", beard: true };
  const woman: UkiyoeFigureLook = { hair: "shimada", robe: "ai", robePattern: { type: "kanoko", color: "gofun", scale: .5 }, obi: "beni", under: "beni", lower: "robe", feet: "bare", build: "slim" };
  if (kind === "woodcutter") {
    const c = toolContact("chop", H);
    nodes.push({ id: "block", kind: "motif", motif: "stump", x: x + c[0], y, params: { size: -c[1] / .45 * .9 } });
    man({ ...elder, prop: "firewood" }, [{ type: "chop", start: 0, end: frames, blend: 0 }]);
  } else if (kind === "farmer") {
    // Tilled furrows ahead of him where the hoe bites.
    nodes.push({ id: "furrows", kind: "block", x: x + toolContact("hoe", H)[0] + 120, y: y + 6, shape: { type: "ellipse", rx: 300, ry: 26 }, fill: "cha", line: 0, pattern: { type: "shima", color: "kogecha", scale: .8, opacity: .5 } });
    man({ ...elder, beard: false, hair: "chonmage", hat: "kasa" }, [{ type: "hoe", start: 0, end: frames, blend: 0 }]);
    // His wife comes across the field with a rice ball for him.
    man({ ...woman, prop: "onigiri" }, [{ type: "walk", start: 10, end: 170, to: -(1500 - x - H * .9) / SC }, { type: "hold", start: 0, end: frames, angle: 40, amount: 70 }], "wife", 1500, "left");
  } else if (kind === "mochi") {
    const c = toolContact("pound", H);
    nodes.push({ id: "usu", kind: "motif", motif: "usu", x: x + c[0], y, params: { size: -c[1] / .48 } });
    man({ ...elder, beard: false, hair: "chonmage", hat: "headband" }, [{ type: "pound", start: 0, end: frames, blend: 0 }]);
    // The turner kneels across the mortar and reaches in between strokes (when the pestle is up).
    nodes.push({ id: "turner", kind: "figure", x: x + c[0] + H * .42, y, scale: SC, look: woman, facing: "left",
      actions: Array.from({ length: Math.floor(frames / 50) }, (_, i) => ({ type: "point" as const, start: i * 50 + 8, end: i * 50 + 26, angle: 70, blend: 6 })).concat([{ type: "kneel", start: 0, end: frames, blend: 0 } as never]) } as UkiyoeNode);
  } else if (kind === "washing") {
    const tub: Pt = [x + H * .42, y];
    nodes.push({ id: "tub", kind: "motif", motif: "tarai", x: tub[0], y: tub[1], params: { radius: H * .26 } });
    // Hachikazuki, the girl under the great bowl, at her washing.
    man({ ...woman, hat: "hachi" }, [{ type: "wash", start: 0, end: frames, blend: 0, aim: [(tub[0] - x) / SC, -H * .26 * .32 / SC + 2] }]);
  } else {
    man({ hair: "chonmage", robe: "kincha", robePattern: { type: "kikko", color: "cha", scale: .5 }, obi: "beni", lower: "hakama", hakama: "ai", feet: "waraji", build: "child", prop: "kozuchi" }, [{ type: "shake", start: 20, end: frames, blend: 8 }]);
  }
  return { version: 1, id: `folk-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 23, cadence: 2, palette: { preset: "edo" }, wind: { base: .3, turbulence: .3 }, nodes };
}
