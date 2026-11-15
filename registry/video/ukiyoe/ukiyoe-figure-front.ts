/**
 * UKIYO1 figures seen from the front or from the back. The same pose channels that drive the profile rig drive this
 * drawing, so every action works: legs stand side by side (a stride lifts the swinging foot and bends its knee toward
 * us), arms hang from both shoulders and rise to the side when they wave or cheer, a bow drops the head and shortens
 * the torso, kneeling folds the legs into a wide base. From the front: the face with both eyes, the kimono's crossed
 * collar (left over right), the front panel and the obi with its cord. From the back: the back of the hair, the nape
 * (the women's collar pulled low, emon-nuki), the obi's knot and the robe's centre-back seam.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, clamp01, DEG, lerp, polyD, smoothD } from "./ukiyoe-core";
import type { FigurePose, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const ribbon = (a: Pt, b: Pt, w0: number, w1: number): string => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  return smoothD([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] + dx / l * w1 * .6, b[1] + dy / l * w1 * .6], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0], [a[0] - dx / l * w0 * .5, a[1] - dy / l * w0 * .5]], true, .3);
};

/**
 * One arm seen from in front: `elev` is the profile shoulder angle (0 down, 90 forward, 180 up); a raised arm swings
 * out to the side as it climbs, a forward reach foreshortens (it points at us). Returns shoulder, elbow, wrist.
 */
function armFront(sh: Pt, side: number, elev: number, bend: number, up: number, fore: number): [Pt, Pt, Pt] {
  const seg = (from: Pt, e: number, len: number): Pt => {
    const lift = clamp01((e - 30) / 120), fwd = Math.max(0, Math.sin(e * DEG)) * (1 - lift);
    // Straight overhead at the top of a cheer (165°): the side angle climbs to about 155°.
    const ang = (8 + 150 * lift ** 1.15) * DEG, L = len * (1 - .55 * fwd);
    return [from[0] + side * Math.sin(ang) * L, from[1] + Math.cos(ang) * L];
  };
  const el = seg(sh, elev, up), w0 = seg(el, elev + bend * .7, fore);
  // A forearm folded across a forward-reaching arm (praying, holding something to the chest) comes in toward the
  // midline instead of pointing out to the side.
  const inK = clamp01((bend - 50) / 45) * Math.max(0, Math.sin(elev * DEG)) * (1 - clamp01((elev - 60) / 60));
  const wr: Pt = [lerp(w0[0], side * up * .1, inK), lerp(w0[1], el[1] - fore * .2, inK)];
  return [sh, el, wr];
}

/** Draws a front or back figure in its local frame (feet at y 0, up negative, centred on x 0). */
export function drawFigureFrontBack(look: UkiyoeFigureLook, pose: FigurePose, H: number, wind: number, frame: number, back: boolean): Prim[] {
  const out: Prim[] = [], lw = Math.max(.9, H * .0062), build = look.build ?? "average", child = build === "child";
  const stout = build === "brute" ? 1.4 : build === "stout" ? 1.14 : build === "slim" ? .93 : 1;
  const skin = look.skin ?? "hada", robe = look.robe ?? "ai", under = look.under ?? "beni", coat = look.coat, sleeveC = coat ?? robe;
  const legC = look.legs ?? skin, feet = look.feet ?? "waraji", lower = look.lower ?? "robe", bare = look.upper === "bare";
  const hair = look.hair ?? "chonmage", female = hair === "shimada" || hair === "long", hairC = look.hairColor ?? (hair === "elder" ? "usuzumi" : "sumi");
  const obiC = look.obi ?? (hair === "shimada" ? "kincha" : "kogecha");
  // Heights: the legs set the hip; a bow folds the torso toward us (it shortens), a kneel drops the hips to the heels.
  const thigh = H * (child ? .24 : .25), shin = H * (child ? .23 : .245), torso = H * (child ? .27 : .29);
  const reach = (hipA: number, knA: number) => thigh * Math.cos(hipA * DEG) + shin * Math.cos((hipA - knA) * DEG);
  const rF = reach(pose.hipF, pose.knF), rB = reach(pose.hipB, pose.knB);
  let hipY = -Math.max(rF, rB) + pose.crouch * H * .14;
  hipY = lerp(hipY, -H * .17, pose.kneel) - pose.lift;
  const bowK = clamp01((pose.lean - 6) / 45), torsoH = torso * (1 - .45 * bowK) * (1 + pose.squash);
  const neckY = hipY - torsoH, shY = neckY + H * .03, sw = H * .085 * stout * (female ? .92 : 1), hipW = H * .05 * stout;
  const sway = Math.sin(frame / 7) * H * .004 - wind * H * .012;
  // Which side is which: the figure's front arm (F) is on the viewer's left from the front, the viewer's right from behind.
  const sF = back ? 1 : -1, sB = -sF;
  // ---- Legs (a stride lifts the swinging foot; its knee bends toward us, so the shin shortens).
  const legs: Prim[] = [];
  const leg = (side: number, hipA: number, r: number) => {
    const hip: Pt = [side * hipW * .7, hipY], footY = hipY + r, kneeY = hipY + thigh * Math.cos(hipA * DEG) * (pose.kneel > .5 ? .2 : 1);
    if (pose.kneel > .5) return;
    const kn: Pt = [side * hipW * .75, kneeY], an: Pt = [side * hipW * .8, footY - H * .01];
    const w = H * .028 * stout;
    if (lower !== "hakama") legs.push({ t: "fill", d: ribbon(hip, kn, w * 1.15, w) + ribbon(kn, an, w, w * .8), fill: legC, outline: lw * .9 });
    // The foot seen end-on: a short rounded wedge, the toes toward us (a heel from behind); sandal or clog under it.
    const fw = H * .03, fh = H * (back ? .018 : .026);
    legs.push({ t: "fill", d: smoothD([[an[0] - fw, an[1] + fh * .6], [an[0] - fw * .8, an[1] - fh * .3], [an[0] + fw * .8, an[1] - fh * .3], [an[0] + fw, an[1] + fh * .6]], true, .4), fill: feet === "tabi" ? "gofun" : legC, outline: lw * .8 });
    if (feet === "geta") legs.push({ t: "fill", d: polyD([[an[0] - fw * 1.1, an[1] + fh * .6], [an[0] + fw * 1.1, an[1] + fh * .6], [an[0] + fw * 1.1, an[1] + fh * 1.1], [an[0] - fw * 1.1, an[1] + fh * 1.1]]) + polyD([[an[0] - fw * .9, an[1] + fh * 1.1], [an[0] - fw * .6, an[1] + fh * 1.1], [an[0] - fw * .6, an[1] + fh * 2], [an[0] - fw * .9, an[1] + fh * 2]]) + polyD([[an[0] + fw * .6, an[1] + fh * 1.1], [an[0] + fw * .9, an[1] + fh * 1.1], [an[0] + fw * .9, an[1] + fh * 2], [an[0] + fw * .6, an[1] + fh * 2]]), fill: "cha", outline: lw * .7 });
    if (feet === "waraji" && !back) legs.push({ t: "line", d: carvedLine([[an[0] - fw * .6, an[1] - fh * .1], [an[0], an[1] + fh * .4], [an[0] + fw * .6, an[1] - fh * .1]], H * .008, { taper: "none" }), color: "kincha" });
  };
  leg(sF, pose.hipF, rF); leg(sB, pose.hipB, rB);
  out.push({ t: "fill", d: ellipseD(0, 2, H * .14, H * .016), fill: "sumi", opacity: .1, noPrint: true });
  // ---- Arms behind the body come first when seen from behind (the arms hang in front of the robe from the front).
  const up = H * (child ? .15 : .165), fore = H * (child ? .14 : .15), sleeveDepth = H * (look.sleeves === "long" ? .3 : .15);
  const arm = (side: number, elev: number, bend: number) => armFront([side * sw, shY + H * .01], side, elev, bend, up, fore);
  const drawArm = (pts: [Pt, Pt, Pt]): Prim[] => {
    const [sh, el, wr] = pts, res: Prim[] = [];
    if (bare) {
      // Seen from the front the arm's width is its breadth across, narrower than its profile depth.
      res.push({ t: "fill", d: carvedLine([sh, el, wr], H * .052 * stout, { taper: "end", minRatio: .6, smooth: true }), fill: skin, outline: lw });
      res.push({ t: "line", d: carvedLine([lerp2(sh, el, .25), lerp2(sh, el, .75)], lw * .8, { taper: "both" }), color: "sumi", opacity: .4 });
    } else {
      // The kimono sleeve hangs below the forearm as a deep pocket, swinging with the wind.
      const drop = sleeveDepth, cuff = lerp2(el, wr, .7), dir = Math.sign(wr[0] - sh[0]) || 1;
      res.push({ t: "fill", d: ribbon(lerp2(el, wr, .9), wr, H * .014, H * .012), fill: skin, outline: lw * .8 });
      res.push({ t: "fill", d: smoothD([add(sh, [-dir * H * .03, -H * .01]), add(sh, [dir * H * .03, -H * .005]), add(el, [dir * H * .03, 0]), add(cuff, [dir * H * .028, 0]), add(cuff, [dir * H * .02 + sway, drop]), add(el, [-dir * H * .015 + sway * .6, drop * .9]), add(el, [-dir * H * .035, H * .02])], true, .3),
        fill: sleeveC, outline: lw, pattern: coat ? look.coatPattern : look.robePattern, grain: .25 });
    }
    const a = Math.atan2(wr[1] - el[1], wr[0] - el[0]), hs = H * .022;
    res.push({ t: "fill", d: smoothD([add(wr, [-Math.sin(a) * hs * .7, Math.cos(a) * hs * .7]), add(wr, [Math.cos(a) * hs * 2, Math.sin(a) * hs * 2]), add(wr, [Math.sin(a) * hs * .7, -Math.cos(a) * hs * .7])], true, .4), fill: skin, outline: lw * .8 });
    return res;
  };
  const prop = look.prop ?? "none";
  let armF = arm(sF, pose.shF, pose.elF), armB = arm(sB, pose.shB, pose.elB);
  // A punt pole is held upright at one side in both hands, one above the other; the hands climb and drop with the stroke.
  const poleX = sF * sw * 1.45;
  if (prop === "pole") {
    const climb = clamp01((pose.shF - 40) / 50) * H * .1, grip = (s: number, y: number): [Pt, Pt, Pt] => {
      const sh: Pt = [s * sw, shY + H * .01], wr: Pt = [poleX - sF * H * .012, y];
      return [sh, [lerp(sh[0], wr[0], .5) + s * H * .05, lerp(sh[1], wr[1], .5) + H * .04], wr];
    };
    armF = grip(sF, shY + H * .02 - climb); armB = grip(sB, shY + H * .15 - climb * .6);
  }
  // Raised arms are seen against the body's outline; hanging arms overlap the sides of the robe. Either way they sit
  // beside the torso, so both go after the body from the front and before it from behind.
  // ---- Body: robe (or bare torso), skirt to the hem, obi.
  const hemY = lower === "loincloth" ? hipY + H * .1 : lower === "tucked" ? hipY + thigh + H * .03 : -H * .035;
  const hemW = H * (lower === "robe" ? (female ? .085 : .095) : .1) * stout, waistY = hipY - torsoH * .28;
  const body: Pt[] = [[-sw * .55, neckY + H * .005], [-sw, shY + H * .01], [-sw * 1.02, shY + H * .08], [-sw * .82, waistY], [-hemW, hemY], [hemW, hemY], [sw * .82, waistY], [sw * 1.02, shY + H * .08], [sw, shY + H * .01], [sw * .55, neckY + H * .005]];
  if (back) out.push(...drawArm(armB), ...drawArm(armF));
  out.push(...legs);
  if (pose.kneel > .5) {
    // Seiza: the knees make a wide, low base under the robe.
    out.push({ t: "fill", d: smoothD([[-H * .14, 0], [-H * .15, -H * .07], [-sw * .8, waistY + H * .04], [sw * .8, waistY + H * .04], [H * .15, -H * .07], [H * .14, 0]], true, .3), fill: bare ? legC : lower === "hakama" ? look.hakama ?? "usuzumi" : robe, outline: lw, pattern: bare ? undefined : look.robePattern, grain: .25 });
  }
  if (bare) {
    out.push({ t: "fill", d: smoothD(body.slice(0, 4).concat([[-sw * .8, waistY + H * .03], [sw * .8, waistY + H * .03]], body.slice(6)), true, .3), fill: skin, outline: lw });
    if (!back) out.push({ t: "line", d: carvedLine([[-sw * .5, shY + H * .07], [0, shY + H * .1], [sw * .5, shY + H * .07]], lw, { taper: "both" }), color: "sumi", opacity: .45 }, { t: "line", d: carvedLine([[0, shY + H * .12], [0, waistY - H * .02]], lw * .8, { taper: "both" }), color: "sumi", opacity: .35 });
    else out.push({ t: "line", d: carvedLine([[0, shY + H * .02], [0, waistY]], lw * .9, { taper: "both" }), color: "sumi", opacity: .4 });
    if (lower === "loincloth") out.push({ t: "fill", d: smoothD([[-hipW * 1.4, waistY + H * .02], [hipW * 1.4, waistY + H * .02], [hipW * 1.2, hipY + H * .1], [-hipW * 1.2, hipY + H * .1]], true, .3), fill: look.hakama ?? "ki", outline: lw, pattern: { type: "tora", color: "sumi", scale: .5, opacity: .85 } });
  } else {
    if (lower === "hakama") {
      const hc = look.hakama ?? "usuzumi";
      out.push({ t: "fill", d: smoothD([[-sw * .85, waistY], [sw * .85, waistY], [H * .13, -H * .01], [H * .015, -H * .005], [0, hipY + H * .05], [-H * .015, -H * .005], [-H * .13, -H * .01]], true, .25), fill: hc, outline: lw, grain: .3 });
      out.push({ t: "stroke", d: [-.08, -.04, .04, .08].map(x => `M${(x * H * .7).toFixed(1)} ${(waistY + H * .03).toFixed(1)}L${(x * H * 1.25).toFixed(1)} ${(-H * .02).toFixed(1)}`).join(""), color: "sumi", width: lw * .7, opacity: .5 });
    }
    const bodyD = smoothD(lower === "hakama" ? body.slice(0, 4).concat([[-sw * .85, waistY + H * .02], [sw * .85, waistY + H * .02]], body.slice(6)) : body, true, .25);
    out.push({ t: "fill", d: bodyD, fill: robe, outline: lw, pattern: look.robePattern, grain: .25 });
    if (!back) {
      // The crossed collar (the wearer's left over right: from the front the left panel's edge runs from our right
      // shoulder down to the left), the under-collar showing above it, the front panel's edge down to the hem.
      const vY = shY + H * (female ? .1 : .085);
      for (const [x0, w] of [[sw * .45, H * .018], [-sw * .45, H * .018]] as const) out.push({ t: "line", d: carvedLine([[x0, neckY + H * .006], [0, vY]], w, { taper: "end", minRatio: .5 }), color: under });
      out.push({ t: "line", d: carvedLine([[sw * .45, neckY + H * .012], [-H * .005, vY + H * .01], [-sw * .3, waistY]], lw * 1.1, { taper: "none" }), color: "sumi", opacity: .8 });
      out.push({ t: "line", d: carvedLine([[-sw * .45, neckY + H * .012], [0, vY - H * .005]], lw, { taper: "end" }), color: "sumi", opacity: .7 });
      if (lower !== "hakama") out.push({ t: "line", d: carvedLine([[-sw * .3, waistY + H * .03], [-hemW * .35, hemY - H * .004]], lw, { taper: "start", minRatio: .4 }), color: "sumi", opacity: .6 },
        { t: "line", d: carvedLine([[-sw * .3 - H * .006, waistY + H * .03], [-hemW * .35 - H * .007, hemY - H * .004]], H * .01, { taper: "start", minRatio: .3 }), color: under, opacity: .85 });
    } else {
      // From behind: the centre-back seam, and the collar at the nape (pulled low on the women, showing the neck).
      out.push({ t: "line", d: carvedLine([[0, neckY + H * .03], [0, hemY - H * .01]], lw * .8, { taper: "both" }), color: "sumi", opacity: .35 });
      out.push({ t: "fill", d: smoothD([[-sw * .5, neckY + H * .004], [0, neckY + H * (female ? .045 : .02)], [sw * .5, neckY + H * .004], [0, neckY - H * .008]], true, .4), fill: under, outline: lw * .8 });
    }
    // Folds falling from the obi to the hem.
    if (lower !== "hakama" && pose.kneel < .5) for (const f of [-.6, .1, .7]) out.push({ t: "line", d: carvedLine([[f * sw * .7, waistY + H * .04], [f * hemW * .85, hemY - H * .02]], lw, { taper: "both" }), color: "sumi", opacity: .3 });
    if (coat) out.push({ t: "fill", d: smoothD([[-sw * .55, neckY + H * .005], [-sw * 1.03, shY + H * .01], [-sw * 1.05, waistY + H * .12], [-sw * .2, waistY + H * .14], [0, waistY + H * .1], [sw * .2, waistY + H * .14], [sw * 1.05, waistY + H * .12], [sw * 1.03, shY + H * .01], [sw * .55, neckY + H * .005]], true, .3), fill: coat, outline: lw, pattern: look.coatPattern, grain: .25 });
    // The obi band across the waist; its cord from the front, its knot (the taiko box, or a man's small knot) behind.
    const obiH = H * (female ? .07 : .05);
    out.push({ t: "fill", d: polyD([[-sw * .86, waistY - obiH / 2], [sw * .86, waistY - obiH / 2], [sw * .84, waistY + obiH / 2], [-sw * .84, waistY + obiH / 2]]), fill: obiC, outline: lw, grain: .3 });
    if (!back) out.push({ t: "line", d: carvedLine([[-sw * .8, waistY + obiH * .1], [sw * .8, waistY + obiH * .1]], H * .007, { taper: "none" }), color: look.accent ?? (obiC === "kincha" ? "beni" : "kincha") });
    else if (female) out.push({ t: "fill", d: smoothD([[-sw * .55, waistY - obiH * .9], [sw * .55, waistY - obiH * .9], [sw * .6, waistY + obiH * 1.4], [-sw * .6, waistY + obiH * 1.4]], true, .2), fill: obiC, outline: lw, pattern: { type: "kikko", color: "kin", scale: .25, opacity: .6 } });
    else out.push({ t: "fill", d: smoothD([[-H * .02, waistY - obiH * .6], [H * .02, waistY - obiH * .6], [H * .025, waistY + obiH * .8], [-H * .025, waistY + obiH * .8]], true, .3), fill: obiC, outline: lw * .8 });
  }
  if (!back) out.push(...drawArm(armB), ...drawArm(armF));
  // ---- Neck and head.
  const headR = H * (child ? .085 : look.face === "oni" ? .08 : .064), headY = neckY - headR * 1.15 + bowK * headR * .5;
  const tilt = (pose.tilt - 2) * .4;
  out.push({ t: "fill", d: ribbon([0, neckY + H * .01], [0, headY + headR * .6], headR * .32, headR * .3), fill: skin, outline: lw * .8 });
  out.push({ t: "group", transform: `translate(0 ${headY.toFixed(2)}) rotate(${tilt.toFixed(2)})`, prims: back ? headBack(look, headR, lw, hairC, wind) : headFront(look, pose, headR, lw, hairC, female, wind) });
  // ---- Props seen from the front or behind: the umbrella over the head, a staff or pole upright at the side, a
  // lantern hanging from the hand, a fan.
  const accent = look.accent ?? "shu", propC = look.propColor ?? "cha";
  const hand = armF[2];
  if (prop === "umbrella") {
    // The shaft rises from the hand at the side, leaning a little in, so the canopy shelters the head without the shaft
    // crossing the face.
    const top: Pt = [hand[0] * .7, headY - headR * 2.4];
    out.push({ t: "line", d: carvedLine([hand, top], H * .012, { taper: "none" }), color: propC });
    out.push({ t: "fill", d: smoothD([[top[0] - H * .2, top[1] + H * .07], [top[0] - H * .08, top[1] - H * .015], [top[0], top[1] - H * .03], [top[0] + H * .08, top[1] - H * .015], [top[0] + H * .2, top[1] + H * .07], [top[0], top[1] + H * .045]], true, .3), fill: accent, outline: lw, grain: .4 });
    out.push({ t: "stroke", d: [-.15, -.08, 0, .08, .15].map(f => `M${top[0].toFixed(1)} ${(top[1] - H * .03).toFixed(1)}L${(top[0] + f * H).toFixed(1)} ${(top[1] + H * .055 + (Math.abs(f) < .1 ? H * .012 : 0)).toFixed(1)}`).join(""), color: "sumi", width: lw * .6, opacity: .5 });
  } else if (prop === "pole") {
    out.push({ t: "line", d: carvedLine([[poleX, armF[2][1] - H * .55], [poleX, 0]], H * .012, { taper: "none" }), color: propC });
    for (const a of [armF, armB]) out.push({ t: "fill", d: ellipseD(poleX, a[2][1], H * .016, H * .014), fill: look.skin ?? "hada", outline: lw * .8 });
  } else if (prop === "staff" || prop === "kanabo") {
    out.push({ t: "line", d: carvedLine([add(hand, [0, -H * (.25)]), add(hand, [0, prop === "kanabo" ? H * .02 : -hand[1]])], H * (prop === "kanabo" ? .04 : .012), { taper: prop === "kanabo" ? "start" : "none" }), color: prop === "kanabo" ? "sumi" : propC });
  } else if (prop === "lantern") {
    out.push({ t: "line", d: carvedLine([hand, add(hand, [0, H * .05])], H * .006, { taper: "none" }), color: "sumi" });
    out.push({ t: "fill", d: ellipseD(hand[0], hand[1] + H * .1, H * .035, H * .05), fill: "ki", outline: lw, opacity: .95 }, { t: "glow", cx: hand[0], cy: hand[1] + H * .1, r: H * .12, color: "ki", opacity: .35 });
  } else if (prop === "fan") {
    out.push({ t: "fill", d: smoothD([hand, add(hand, [-H * .05, -H * .06]), add(hand, [0, -H * .075]), add(hand, [H * .05, -H * .06])], true, .3), fill: accent, outline: lw * .8 });
  }
  return out;
}

/** The face from the front: both eyes, brows, the nose as a small hooked line, the mouth; then the hair style. */
function headFront(look: UkiyoeFigureLook, pose: FigurePose, r: number, lw: number, hairC: UkiyoePaint, female: boolean, wind: number): Prim[] {
  const out: Prim[] = [], skin = look.skin ?? "hada", hair = look.hair ?? "chonmage", P = (x: number, y: number): Pt => [x * r, y * r];
  const hairBack = (pts: Pt[]) => out.push({ t: "fill", d: smoothD(pts, true, .4), fill: hairC, outline: lw });
  // Hair behind the face first.
  if (hair === "long") hairBack([P(-1.05, -.4), P(-1.2, .6), P(-1.25 - wind * .1, 2.6), P(-.7, 2.7), P(.7, 2.7), P(1.25 - wind * .1, 2.6), P(1.2, .6), P(1.05, -.4), P(0, -1.2)]);
  if (hair === "shimada") hairBack([P(-1.35, -.1), P(-1.45, .5), P(-1.0, .75), P(1.0, .75), P(1.45, .5), P(1.35, -.1), P(.9, -1.0), P(0, -1.25), P(-.9, -1.0)]);
  if (hair === "wild") { const sp: Pt[] = []; for (let i = 0; i <= 18; i++) { const a = Math.PI * (1.05 + i / 18 * .9 * 2) / 1, rr = 1.25 + (i % 2 ? .4 + .15 * Math.sin(i * 2.3) : 0); sp.push(P(Math.cos(a) * rr, Math.sin(a) * rr * 1.05 - .1)); } hairBack(sp); }
  // Face: an oval, a little narrower at the chin; ears at the sides.
  out.push({ t: "fill", d: ellipseD(-r * .95, r * .05, r * .14, r * .22) + ellipseD(r * .95, r * .05, r * .14, r * .22), fill: skin, outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([P(-.88, -.3), P(-.8, .45), P(-.45, .92), P(0, 1.05), P(.45, .92), P(.8, .45), P(.88, -.3), P(.6, -.95), P(0, -1.08), P(-.6, -.95)], true, .4), fill: skin, outline: lw * .9 });
  const oni = look.face === "oni", shut = pose.blink > .5;
  if (oni) {
    for (const s of [-1, 1]) {
      out.push({ t: "fill", d: ellipseD(s * r * .38, -r * .08, r * .24, r * .2), fill: "gofun", outline: lw }, { t: "dots", d: circleD(s * r * .36, -r * .06, r * .1), color: "sumi" });
      out.push({ t: "line", d: carvedLine([P(s * .12, -.42), P(s * .45, -.5), P(s * .72, -.3)], r * .14, { taper: "end" }), color: "sumi" });
    }
    out.push({ t: "fill", d: polyD([P(-.35, .55), P(-.25, .85), P(-.15, .55)]) + polyD([P(.15, .55), P(.25, .85), P(.35, .55)]), fill: "gofun", outline: lw * .6 });
    out.push({ t: "line", d: carvedLine([P(-.45, .52), P(0, .62), P(.45, .52)], r * .06, { taper: "both" }), color: "sumi" });
  } else {
    for (const s of [-1, 1]) {
      if (shut) out.push({ t: "line", d: carvedLine([P(s * .55, -.08), P(s * .35, .0), P(s * .15, -.06)], r * .06 + .3, { taper: "both" }), color: "sumi" });
      else { out.push({ t: "line", d: carvedLine([P(s * .58, -.06), P(s * .36, -.15), P(s * .14, -.06)], r * .07 + .3, { taper: "both", minRatio: .3 }), color: "sumi" }); out.push({ t: "dots", d: circleD(s * r * .34, -r * .06, r * .06), color: "sumi" }); }
      out.push({ t: "line", d: carvedLine([P(s * .62, -.42), P(s * .38, -.5), P(s * .14, -.42)], r * .05 + .25, { taper: "both" }), color: hairC === "usuzumi" ? "usuzumi" : "sumi", opacity: .9 });
    }
    out.push({ t: "line", d: carvedLine([P(.02, -.05), P(.06, .3), P(-.06, .36)], r * .045 + .25, { taper: "both", minRatio: .3 }), color: "sumi", opacity: .8 });
    if (pose.mouth > .08) out.push({ t: "fill", d: ellipseD(0, r * .62, r * .14, r * (.05 + .14 * pose.mouth)), fill: "kogecha", noPrint: true });
    else if (female || look.lips) out.push({ t: "fill", d: ellipseD(0, r * .6, r * .12, r * .06), fill: look.lips ?? "beni", noPrint: true });
    else out.push({ t: "line", d: carvedLine([P(-.16, .6), P(0, .63), P(.16, .6)], r * .04 + .25, { taper: "both" }), color: "sumi", opacity: .7 });
    if (look.beard) out.push({ t: "fill", d: smoothD([P(-.5, .55), P(-.3, 1.2), P(0, 1.5), P(.3, 1.2), P(.5, .55), P(0, .85)], true, .4), fill: hairC, outline: lw * .7 });
  }
  // Hair in front.
  switch (hair) {
    case "chonmage": case "elder":
      // The shaved pate (cool grey-blue), hair at the temples, the topknot folded forward on the crown.
      out.push({ t: "fill", d: smoothD([P(-.62, -.7), P(0, -1.0), P(.62, -.7), P(0, -.62)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sora", .9], [1, "sora", .4]] } });
      for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .62, -.72), P(s * .95, -.3), P(s * .9, .25), P(s * .78, -.05), P(s * .72, -.45)], true, .4), fill: hairC, outline: lw * .8 });
      out.push({ t: "fill", d: smoothD([P(-.12, -.98), P(-.14, -1.45), P(0, -1.55), P(.14, -1.45), P(.12, -.98)], true, .4), fill: hairC, outline: lw * .8 });
      break;
    case "topknot": hairBack([P(-.92, -.2), P(-.75, -.95), P(0, -1.18), P(.75, -.95), P(.92, -.2), P(.6, -.62), P(0, -.78), P(-.6, -.62)]); out.push({ t: "fill", d: ellipseD(0, -r * 1.35, r * .3, r * .25), fill: hairC, outline: lw * .8 }); break;
    case "shimada":
      hairBack([P(-.95, -.15), P(-.82, -.92), P(0, -1.15), P(.82, -.92), P(.95, -.15), P(.62, -.62), P(0, -.74), P(-.62, -.62)]);
      out.push({ t: "fill", d: smoothD([P(-.7, -1.0), P(-.55, -1.65), P(0, -1.85), P(.55, -1.65), P(.7, -1.0), P(0, -1.1)], true, .45), fill: hairC, outline: lw * .8 });
      out.push({ t: "fill", d: smoothD([P(-.35, -1.2), P(0, -1.5), P(.35, -1.2), P(0, -1.15)], true, .4), fill: look.accent ?? "shu", outline: lw * .6 });
      out.push({ t: "line", d: carvedLine([P(-1.2, -1.35), P(1.2, -1.55)], r * .06 + .4, { taper: "none" }), color: "kin" });
      out.push({ t: "dots", d: circleD(-1.25 * r, -1.33 * r, r * .1) + circleD(1.25 * r, -1.57 * r, r * .1), color: look.accent ?? "shu" });
      break;
    case "child": hairBack([P(-.95, -.05), P(-.85, -.95), P(0, -1.18), P(.85, -.95), P(.95, -.05), P(.55, -.5), P(0, -.55), P(-.55, -.5)]); break;
    case "long": hairBack([P(-.95, .1), P(-.85, -.95), P(0, -1.15), P(.85, -.95), P(.95, .1), P(.5, -.7), P(0, -.82), P(-.5, -.7)]); break;
    case "wild": hairBack([P(-.95, -.25), P(-.7, -1.0), P(0, -1.2), P(.7, -1.0), P(.95, -.25), P(.5, -.75), P(0, -.85), P(-.5, -.75)]); break;
    case "bald": break;
  }
  if (look.face === "oni") for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .3, -.85), P(s * .45, -1.7), P(s * .55, -.8)], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "ki", 1]] }, outline: lw });
  out.push(...hatFront(look, r, lw, wind));
  return out;
}

/** The head from behind: the back of the hair (the shaved pate and topknot, the shimada bun with its pins), the ears and the nape. */
function headBack(look: UkiyoeFigureLook, r: number, lw: number, hairC: UkiyoePaint, wind: number): Prim[] {
  const out: Prim[] = [], skin = look.skin ?? "hada", hair = look.hair ?? "chonmage", P = (x: number, y: number): Pt => [x * r, y * r];
  out.push({ t: "fill", d: ellipseD(-r * .95, r * .05, r * .14, r * .22) + ellipseD(r * .95, r * .05, r * .14, r * .22), fill: skin, outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([P(-.88, -.3), P(-.78, .5), P(-.4, .95), P(0, 1.02), P(.4, .95), P(.78, .5), P(.88, -.3), P(.6, -.95), P(0, -1.08), P(-.6, -.95)], true, .4), fill: skin, outline: lw * .9 });
  const mass = (pts: Pt[]) => out.push({ t: "fill", d: smoothD(pts, true, .4), fill: hairC, outline: lw });
  switch (hair) {
    case "chonmage": case "elder":
      mass([P(-.9, -.3), P(-.85, .55), P(-.4, .85), P(.4, .85), P(.85, .55), P(.9, -.3), P(.6, -.6), P(0, -.65), P(-.6, -.6)]);
      out.push({ t: "fill", d: smoothD([P(-.6, -.6), P(0, -1.02), P(.6, -.6), P(0, -.66)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sora", .9], [1, "sora", .4]] } });
      out.push({ t: "fill", d: smoothD([P(-.1, -.62), P(-.12, -1.3), P(0, -1.4), P(.12, -1.3), P(.1, -.62)], true, .4), fill: hairC, outline: lw * .8 });
      break;
    case "shimada":
      mass([P(-.95, -.4), P(-1.25, .3), P(-.9, .8), P(.9, .8), P(1.25, .3), P(.95, -.4), P(.6, -1.0), P(0, -1.12), P(-.6, -1.0)]);
      out.push({ t: "fill", d: smoothD([P(-.65, -.95), P(-.55, -1.65), P(0, -1.85), P(.55, -1.65), P(.65, -.95), P(0, -1.05)], true, .45), fill: hairC, outline: lw * .8 });
      out.push({ t: "line", d: carvedLine([P(-1.2, -1.4), P(1.2, -1.5)], r * .06 + .4, { taper: "none" }), color: "kin" });
      out.push({ t: "dots", d: circleD(-1.25 * r, -1.4 * r, r * .1) + circleD(1.25 * r, -1.5 * r, r * .1), color: look.accent ?? "shu" });
      out.push({ t: "fill", d: smoothD([P(-.4, -.5), P(0, -.25), P(.4, -.5), P(0, -.6)], true, .4), fill: look.accent ?? "shu", outline: lw * .6 });
      break;
    case "long": mass([P(-.95, -.3), P(-1.15, 1.2), P(-1.2 - wind * .1, 2.7), P(1.2 - wind * .1, 2.7), P(1.15, 1.2), P(.95, -.3), P(.6, -1.0), P(0, -1.12), P(-.6, -1.0)]); break;
    case "child": mass([P(-.95, -.2), P(-.9, .55), P(0, .7), P(.9, .55), P(.95, -.2), P(.6, -1.0), P(0, -1.15), P(-.6, -1.0)]); break;
    case "topknot": mass([P(-.92, -.25), P(-.88, .6), P(0, .75), P(.88, .6), P(.92, -.25), P(.6, -1.0), P(0, -1.15), P(-.6, -1.0)]); out.push({ t: "fill", d: ellipseD(0, -r * 1.3, r * .3, r * .25), fill: hairC, outline: lw * .8 }); break;
    case "wild": { const sp: Pt[] = []; for (let i = 0; i <= 18; i++) { const a = Math.PI * 2 * i / 18, rr = 1.05 + (i % 2 ? .35 : 0); sp.push(P(Math.cos(a) * rr, Math.sin(a) * rr - .05)); } mass(sp); break; }
    case "bald": break;
  }
  if (look.face === "oni") for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .3, -.85), P(s * .45, -1.7), P(s * .55, -.8)], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "ki", 1]] }, outline: lw });
  out.push(...hatFront(look, r, lw, wind));
  return out;
}

/** Hats are near enough symmetric to serve front and back. */
function hatFront(look: UkiyoeFigureLook, r: number, lw: number, wind: number): Prim[] {
  const hat = look.hat ?? "none", hatC = look.hatColor ?? (hat === "eboshi" ? "sumi" : hat === "hood" ? "ai" : "kincha"), P = (x: number, y: number): Pt => [x * r, y * r];
  if (hat === "kasa" || hat === "conical") {
    const deep = hat === "conical", rim = deep ? 1.7 : 2.1, apex = deep ? -2.3 : -1.75, brimY = deep ? -.35 : -.55;
    return [{ t: "fill", d: smoothD([P(-rim, brimY), P(0, apex), P(rim, brimY), P(0, brimY + .18)], true, .15), fill: { type: "linear", angle: 0, stops: [[0, hatC, 1], [1, "ki", 1]] }, outline: lw, grain: .6 },
      { t: "stroke", d: Array.from({ length: 7 }, (_, i) => `M0 ${(apex * r).toFixed(1)}L${(lerp(-rim, rim, (i + 1) / 8) * r).toFixed(1)} ${((brimY + .12 * Math.sin(Math.PI * (i + 1) / 8)) * r).toFixed(1)}`).join(""), color: "cha", width: .8, opacity: .6 },
      { t: "stroke", d: `M${(-.6 * r).toFixed(1)} ${(brimY * r).toFixed(1)}Q0 ${(1.3 * r).toFixed(1)} ${(.6 * r).toFixed(1)} ${(brimY * r).toFixed(1)}`, color: "kogecha", width: .9, opacity: .7 }];
  }
  if (hat === "eboshi") return [{ t: "fill", d: smoothD([P(-.7, -.7), P(-.6, -2.0), P(0, -2.4), P(.5, -2.1), P(.65, -.7)], true, .35), fill: hatC, outline: lw, grain: .3 }];
  if (hat === "hood") return [{ t: "fill", d: smoothD([P(-1.15, 1.4), P(-1.2, -.3), P(-.8, -1.2), P(0, -1.38), P(.8, -1.2), P(1.2, -.3), P(1.15, 1.4), P(.85, 1.3), P(.88, -.25), P(.6, -.9), P(0, -1.05), P(-.6, -.9), P(-.88, -.25), P(-.85, 1.3)], true, .3), fill: hatC, outline: lw, grain: .3 }];
  if (hat === "headband") return [{ t: "fill", d: smoothD([P(-.95, -.55), P(0, -.68), P(.95, -.55), P(.95, -.38), P(0, -.5), P(-.95, -.38)], true, .3), fill: hatC === "kincha" ? "gofun" : hatC, outline: lw * .8 },
    { t: "fill", d: smoothD([P(.9, -.5), P(1.5 + wind * .2, -.8), P(1.6 + wind * .3, -.55), P(.95, -.42)], true, .3), fill: hatC === "kincha" ? "gofun" : hatC, outline: lw * .8 }];
  return [];
}
