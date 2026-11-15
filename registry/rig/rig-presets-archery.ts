/**
 * RIG1 archery for the person rig: a recurve bow in the far (bow) hand, a back quiver, and one working arrow.
 *
 * The shot follows the shot-cycle phases archery coaching and kyudo share (footing and posture; taking an arrow and
 * nocking it; raising the bow; drawing apart to the anchor; holding and aiming; release; follow-through and remaining
 * form, zanshin). In profile the draw length is shortened (the shoulders cannot open toward the target), but the
 * mechanics hold:
 *   - the arrow is drawn out of the quiver through its mouth, pivoting over the shoulder until its tip clears;
 *   - the string runs from each limb tip to the nock point and the limbs flex as the draw comes back;
 *   - on release the string snaps to brace and vibrates, the arrow flies off along its line, the bow tips forward in the
 *     loose bow hand, and the draw hand flies back past the jaw.
 * Every per-frame pose (bow, limbs, string, arrow, draw hand) is computed from the same state, so the string always
 * meets the nock and the hand never leaves the arrow.
 */
import type { RigKey } from "./rig-spec";
import { Rig, ell, path, poly, rect } from "./rig-kit";
import type { Pt } from "./rig-kit";

export const ARCHERY_MOTIONS = ["archery", "archery-get-arrow", "archery-ready", "archery-shoot"] as const;
export type ArcheryMotion = (typeof ARCHERY_MOTIONS)[number];

type Steps = [number, number, number?][];
export interface ArcheryContext {
  u: number; start: number; end: number;
  plant: (from: number, to: number, keysF: Steps | null, keysB: Steps | null, ramp?: number) => void;
}
const RD = 180 / Math.PI;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
const lerpP = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

const ARROW = 30, LIMB = 26.5, RISER = 3.5;
/** Limb centreline (s from riser to tip): bent back toward the archer, the tip recurving forward. */
const limbX = (s: number) => -6.4 * s ** 1.4 + (s > .8 ? 1.6 * ((s - .8) / .2) ** 2 : 0);
interface BowPose { x: number; y: number; r: number }
const toBow = (b: BowPose, [lx, ly]: Pt): Pt => {
  const c = Math.cos(b.r / RD), s = Math.sin(b.r / RD);
  return [b.x + lx * c - ly * s, b.y + lx * s + ly * c];
};
/** Limb tip (string loop) positions for a bow pose and flex 0..1 (each limb rotates up to 9° toward the archer). */
function tips(b: BowPose, flex: number): [Pt, Pt] {
  const phi = 9 * flex / RD, tipLocal: Pt = [limbX(1) - .2, LIMB];
  const rot = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const lower = rot(tipLocal, phi), upper = rot([tipLocal[0], -tipLocal[1]], -phi);
  return [toBow(b, [upper[0], upper[1] - RISER]), toBow(b, [lower[0], lower[1] + RISER])];
}
/** Where the nock sits on a braced string, and the arrow rest on the riser. */
const braceNock = (b: BowPose): Pt => { const [t, l] = tips(b, 0); return [(t[0] + l[0]) / 2, (t[1] + l[1]) / 2 - 1.2]; };
const rest = (b: BowPose): Pt => toBow(b, [.3, -2.4]);

// Poses (design units, root space).
const BOW_DOWN: BowPose = { x: 17, y: -52, r: 24 }, BOW_UP: BowPose = { x: 29, y: -71, r: 0 }, ANCHOR: Pt = [8.4, -73.6];
const QUIVER_MOUTH: Pt = [-5, -75], HAND_REST: Pt = [6, -46];
/** After release the draw hand flies back along the jaw to the ear. */
const FOLLOW: Pt = [-2.2, -77.4];

interface State { bow: BowPose; flex: number; hand: Pt; nock?: Pt; arrow?: { x: number; y: number; r: number }; arrowOn: boolean; open?: boolean; head: number; torso: number }
type Phase = { len: number; at: (k: number, f: number) => State };

/** Arrow held by its nock at `hand`, pointing at `toward`, or along `angle`. */
const held = (hand: Pt, angle: number) => ({ x: hand[0], y: hand[1], r: angle });
const angleTo = (a: Pt, b: Pt) => Math.atan2(b[1] - a[1], b[0] - a[0]) * RD;
const lerpAng = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

function phases(m: ArcheryMotion): { list: Phase[]; repeat: Phase[] } {
  const relaxed = (bow: BowPose, hand: Pt, extra: Partial<State> = {}): State => ({ bow, flex: 0, hand, arrowOn: false, head: 0, torso: 0, ...extra });
  const nockedAt = (bow: BowPose, flex: number, nock: Pt, extra: Partial<State> = {}): State => {
    const r = rest(bow);
    return { bow, flex, hand: nock, nock, arrow: held(nock, angleTo(nock, r)), arrowOn: true, head: 0, torso: 0, ...extra };
  };
  // Taking an arrow: up behind the head to the quiver, out through its mouth over the shoulder, round and onto the string.
  const getArrow = (len: number): Phase => ({ len, at: k => {
    const grab: Pt = [QUIVER_MOUTH[0] + 1.2, QUIVER_MOUTH[1] - 8.6];
    const path: Pt[] = [HAND_REST, [-1, -70], grab, grab, [2, -95], [13, -96], [24.5, -85], [20, -72], braceNock(BOW_DOWN)];
    const times = [0, .14, .3, .36, .46, .56, .66, .82, 1];
    let i = 0; while (i < times.length - 2 && k > times[i + 1]) i++;
    const hand = lerpP(path[i], path[i + 1], ease((k - times[i]) / (times[i + 1] - times[i])));
    const s: State = relaxed(BOW_DOWN, hand, { head: -6 * Math.sin(Math.PI * Math.min(1, k / .7)) });
    if (k < times[2]) return s;
    // Through the quiver mouth while the tip is still inside; free once the hand is an arrow's length away.
    const d = Math.hypot(QUIVER_MOUTH[0] - hand[0], QUIVER_MOUTH[1] - hand[1]);
    const inside = angleTo(hand, QUIVER_MOUTH), onString = angleTo(braceNock(BOW_DOWN), rest(BOW_DOWN));
    const r = d < ARROW && k < .7 ? inside : lerpAng(inside, onString, ease((k - .66) / .3));
    return { ...s, arrow: held(hand, r), arrowOn: true };
  } });
  const nockSettle = (len: number): Phase => ({ len, at: () => nockedAt(BOW_DOWN, 0, braceNock(BOW_DOWN)) });
  const raise = (len: number): Phase => ({ len, at: k => {
    const e = ease(k), bow: BowPose = { x: lerp(BOW_DOWN.x, BOW_UP.x, e), y: lerp(BOW_DOWN.y, BOW_UP.y, e), r: lerp(BOW_DOWN.r, BOW_UP.r, e) };
    return nockedAt(bow, 0, braceNock(bow), { head: 4 * e });
  } });
  const draw = (len: number): Phase => ({ len, at: k => {
    const e = ease(k);
    return nockedAt(BOW_UP, e, lerpP(braceNock(BOW_UP), ANCHOR, e), { head: 4 + 2 * e, torso: -1.5 * e });
  } });
  const hold = (len: number): Phase => ({ len, at: (_k, f) => {
    // Aiming: a small, uneven hold tremor (a few tenths of a unit) in both hands.
    const tx = .14 * Math.sin(f * 1.7) + .08 * Math.sin(f * 4.3 + 1), ty = .12 * Math.sin(f * 2.3 + 2);
    const bow = { ...BOW_UP, x: BOW_UP.x + tx, y: BOW_UP.y + ty };
    return nockedAt(bow, 1, [ANCHOR[0] + tx * .4, ANCHOR[1] + ty * .4], { head: 6, torso: -1.5 });
  } });
  const release = (len: number): Phase => ({ len, at: k => {
    const f = k * len, e = ease(Math.min(1, f / 5));
    const fly = f * 46, line = angleTo(ANCHOR, rest(BOW_UP)) / RD;
    // The bow tips forward in the loose hand and comes back; the draw hand flies back past the jaw and opens.
    const bow: BowPose = { ...BOW_UP, r: BOW_UP.r + 13 * Math.sin(Math.PI * Math.min(1, f / 14)) };
    const hand = lerpP(ANCHOR, FOLLOW, e);
    const nock = braceNock(bow), vib = 2 * Math.exp(-f / 3) * Math.sin(Math.PI * f);
    return { bow, flex: Math.max(0, 1 - f), hand, nock: [nock[0] + vib, nock[1]], arrowOn: f < 7, open: true, head: 6, torso: -1.5,
      arrow: { x: ANCHOR[0] + Math.cos(line) * fly, y: ANCHOR[1] + Math.sin(line) * fly, r: line * RD } };
  } });
  const zanshin = (len: number): Phase => ({ len, at: () => relaxed(BOW_UP, FOLLOW, { open: true, head: 6, torso: -1.5 }) });
  const lower = (len: number): Phase => ({ len, at: k => {
    const e = ease(k), bow: BowPose = { x: lerp(BOW_UP.x, BOW_DOWN.x, e), y: lerp(BOW_UP.y, BOW_DOWN.y, e), r: lerp(BOW_UP.r, BOW_DOWN.r, e) };
    return relaxed(bow, lerpP(FOLLOW, HAND_REST, e), { head: 6 * (1 - e), open: k < .5 });
  } });
  const idle = (len: number): Phase => ({ len, at: () => relaxed(BOW_DOWN, HAND_REST) });
  const idleNocked = (len: number): Phase => ({ len, at: () => nockedAt(BOW_DOWN, 0, braceNock(BOW_DOWN)) });
  switch (m) {
    case "archery-get-arrow": return { list: [idle(10), getArrow(40), nockSettle(8)], repeat: [idleNocked(30)] };
    case "archery-ready": return { list: [idleNocked(10), raise(14), draw(18)], repeat: [hold(40)] };
    case "archery-shoot": return { list: [hold(14)], repeat: [release(6), zanshin(14), lower(8), getArrow(26), nockSettle(4), raise(10), draw(12), hold(16)] };
    default: return { list: [idle(8)], repeat: [getArrow(32), nockSettle(6), raise(12), draw(14), hold(22), release(6), zanshin(16), lower(12), idle(6)] };
  }
}

export function addArcheryAction(rig: Rig, m: ArcheryMotion, c: ArcheryContext): void {
  const { u, start, end, plant } = c;
  // Recurve bow: riser with a grip, two limbs (child bones that flex), string as two segments to the nock point.
  rig.bone("bow", "root", 0, 0);
  rig.part("bow-riser", "bow", path(`M-.9 ${-RISER - 1}Q-1.6 0 -.9 ${RISER + 1}L.9 ${RISER + 1}Q1.5 0 .9 ${-RISER - 1}Z`), "wood", 6.6, { color: "#5b3a24" });
  rig.part("bow-grip", "bow", rect(-1.1, -1.8, 2.2, 3.8, .8), "cloth-dark", 6.61);
  const limbOutline = (sign: 1 | -1): Pt[] => {
    const side: Pt[] = [], back: Pt[] = [];
    for (let k = 0; k <= 16; k++) { const s = k / 16, w = .85 - .55 * s; side.push([limbX(s) + w, sign * LIMB * s]); back.push([limbX(s) - w, sign * LIMB * s]); }
    return [...side, ...back.reverse()];
  };
  for (const [id, sign, y] of [["bow-up", -1, -RISER], ["bow-down", 1, RISER]] as const) {
    rig.bone(id, "bow", 0, y);
    rig.part(id, id, poly(limbOutline(sign)), "wood", 6.58, { color: "#7a4a2a" });
    rig.part(id + "-tip", id, ell(limbX(1), sign * LIMB, .55, .9), "metal-dark", 6.59);
  }
  for (const id of ["string-up", "string-down"]) { rig.bone(id, "root", 0, 0, 0, 1); rig.part(id, id, rect(-.14, 0, .28, 1), "detail", 6.57, { color: "#ece6d6" }); }
  // Arrow: nock at the bone, tip along +x.
  rig.bone("arrow", "root", 0, 0);
  rig.part("arrow-shaft", "arrow", rect(.6, -.2, ARROW - 2.6, .4, .2), "wood", 6.62, { color: "#c8a46a" });
  rig.part("arrow-head", "arrow", poly([[ARROW - 2.2, -.7], [ARROW, 0], [ARROW - 2.2, .7]]), "metal", 6.63, { color: "#9aa0a8" });
  rig.part("arrow-nock", "arrow", rect(0, -.32, .8, .64, .2), "detail", 6.63);
  rig.part("arrow-vane-a", "arrow", poly([[1.2, -.2], [2.2, -1.5], [6.4, -1.3], [6.8, -.2]]), "accent", 6.63, { color: "#c8342b" });
  rig.part("arrow-vane-b", "arrow", poly([[1.2, .2], [2.2, 1.5], [6.4, 1.3], [6.8, .2]]), "light", 6.635, { color: "#f2ede1" });
  // Back quiver over the near shoulder, with arrows standing in it and a strap across the chest.
  rig.bone("quiver", "torso", -7.4, -16, 8);
  rig.part("quiver", "quiver", path("M-3.2 -15Q-3.6 0 -2.6 14Q0 15.4 2.6 14Q3.6 0 3.2 -15Z"), "wood", .45, { color: "#6e4428" });
  rig.part("quiver-band", "quiver", path("M-3.3 -12.4H3.3M-3.1 9H3.1"), "detail", .46, { line: true, lineWidth: .45, color: "#3d2414" });
  for (const [k, dx] of [[0, -1.8], [1, -.5], [2, .9], [3, 2.1]] as const) {
    rig.part(`quiver-shaft-${k}`, "quiver", rect(dx - .2, -21, .4, 7, .2), "wood", .44, { color: "#c8a46a" });
    rig.part(`quiver-vane-${k}`, "quiver", poly([[dx, -22], [dx - 1.2, -20.6], [dx - 1.1, -17], [dx, -16.6], [dx + 1.1, -17], [dx + 1.2, -20.6]]), "accent", .445, { color: k % 2 ? "#f2ede1" : "#c8342b" });
  }
  rig.part("quiver-strap", "torso", path("M-6 -26Q2 -14 8.2 -2"), "detail", 4.2, { line: true, lineWidth: .9, color: "#5a3a22" });

  // The draw forearm keeps its length when the upper arm foreshortens.
  const fore = rig.bones.find(b => b.id === "fore-f");
  if (fore) fore.inheritScale = false;
  // Lay the phases out over the window and sample every frame.
  const { list, repeat } = phases(m), timeline: Phase[] = [...list];
  let total = list.reduce((s, p) => s + p.len, 0);
  while (total < end - start + 1) { for (const p of repeat) { timeline.push(p); total += p.len; } }
  const keys: Record<string, RigKey[]> = {};
  const push = (b: string, k: RigKey) => (keys[b] ??= []).push(k);
  const handT: { frame: number; x: number; y: number; ease: "linear" }[] = [];
  const openKeys: { frame: number; name: string | null }[] = [];
  let p = 0, at = 0, lastOpen: boolean | undefined;
  for (let f = start; f <= end; f++) {
    while (p < timeline.length - 1 && f - start >= at + timeline[p].len) at += timeline[p++].len;
    const s = timeline[p].at(Math.min(1, (f - start - at) / timeline[p].len), f);
    push("bow", { frame: f, x: s.bow.x * u, y: s.bow.y * u, rotate: s.bow.r, ease: "linear" });
    push("bow-up", { frame: f, rotate: -9 * s.flex, ease: "linear" }); push("bow-down", { frame: f, rotate: 9 * s.flex, ease: "linear" });
    const [tu, tl] = tips(s.bow, s.flex), nock = s.nock ?? braceNock(s.bow);
    for (const [id, a, b] of [["string-up", tu, nock], ["string-down", tl, nock]] as const) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      push(id, { frame: f, x: a[0] * u, y: a[1] * u, rotate: Math.atan2(-dx, dy) * RD, scaleY: Math.hypot(dx, dy), ease: "linear" });
    }
    push("arrow", s.arrow ? { frame: f, x: s.arrow.x * u, y: s.arrow.y * u, rotate: s.arrow.r, opacity: s.arrowOn ? 1 : 0, ease: "linear" } : { frame: f, opacity: 0, ease: "linear" });
    push("torso", { frame: f, rotate: s.torso, ease: "linear" }); push("head", { frame: f, rotate: s.head, ease: "linear" });
    handT.push({ frame: f, x: s.hand[0] * u, y: s.hand[1] * u, ease: "linear" });
    // Drawing back, the upper arm swings behind the shoulder and into depth (the shoulders open toward the target): it
    // foreshortens so the elbow sits behind the head at arrow height instead of over the face.
    const back = Math.min(1, Math.max(0, (s.hand[0] - 24) / (ANCHOR[0] + 1.5 - 24))) * (s.hand[1] < -66 ? 1 : 0), sy = 1 - .55 * back;
    push("arm-f", { frame: f, scaleY: sy, ease: "linear" });
    if (!!s.open !== lastOpen) { openKeys.push({ frame: f, name: s.open ? "open" : "fist" }); lastOpen = !!s.open; }
  }
  // Rotation keys stay continuous between samples.
  for (const ks of Object.values(keys)) for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1].rotate, b = ks[i].rotate;
    if (a !== undefined && b !== undefined) ks[i] = { ...ks[i], rotate: a + ((((b - a) % 360) + 540) % 360 - 180) };
  }
  for (const [b, ks] of Object.entries(keys)) rig.track(b, ks.map((k, i) => (i ? k : { ...k, ease: undefined })));
  // Open stance: the bow-side (far) foot forward, knees soft.
  plant(start, end, [[start, 2.2], [start + 6, -5, 2]], [[start, -1.4], [start + 8, 6.5, 2]], 0);
  rig.track("pelvis", [{ frame: start, y: 0 }, { frame: start + 8, y: .8 * u }]);
  rig.drivers.push({ type: "reach", start, end: end + 60, ramp: 0, upper: "arm-b", lower: "fore-b", bend: -1, follow: "bow", offset: [0, 0] },
    { type: "reach", start, end: end + 60, ramp: 0, upper: "arm-f", lower: "fore-f", bend: 1, target: handT },
    { type: "variant", part: "hand-b", mode: "keys", keys: [{ frame: start, name: "fist" }] },
    { type: "variant", part: "hand-f", mode: "keys", keys: openKeys });
}
