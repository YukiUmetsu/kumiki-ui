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
import { fuki, hyogoSquare, kamuroSquare, kasane, KOMA_GETA_HEIGHT, komaGetaSquare, maeObiFront, parasol, roundels } from "./ukiyoe-oiran";
import { darariBack, eriAshi, maiogi, obiFront, OKOBO_HEIGHT, okoboSquare, wareshinobuSquare } from "./ukiyoe-maiko";
import type { SquareSword } from "./ukiyoe-katana";
import { katana, mon, reachArm, saya } from "./ukiyoe-katana";
import { kanabo } from "./ukiyoe-oni";
import { hachiSide } from "./ukiyoe-folk";
import { dragonCrownSquare } from "./ukiyoe-ryugu";
import { faceFront, faceTraits, hairSheen, kewari, moodsOf } from "./ukiyoe-face";
import { courtProp, heianHairSquare, kanmuriSquare } from "./ukiyoe-heian";
import { armEyes, gourdSquare, minoSquare, zaru } from "./ukiyoe-folkyokai";
import { animalHeadSquare } from "./ukiyoe-parade";
import { kabutoSquare, naginata as naginataProp, oyoroiSquare } from "./ukiyoe-bushi";
import { ancientHairSquare, kamiProp, magatama, stoleSquare, zukin } from "./ukiyoe-kami";
import { babyBundle, ghostFaceBack, ghostFaceFront, gotokuCrown, humanFeatures, isGhostFace, peonyLantern } from "./ukiyoe-onna";

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
export function drawFigureFrontBack(look: UkiyoeFigureLook, pose: FigurePose, H: number, wind: number, frame: number, back: boolean, sword?: SquareSword, club?: { grip: Pt; a: number; dropped: number }): Prim[] {
  const out: Prim[] = [], lw = Math.max(.9, H * .0062), build = look.build ?? "average", child = build === "child";
  const stout = build === "brute" ? 1.4 : build === "stout" ? 1.14 : build === "slim" ? .93 : 1;
  const skin = look.skin ?? "hada", robe = look.robe ?? "ai", under = look.under ?? "beni", coat = look.coat, uchi = look.uchikake, sleeveC = uchi ?? coat ?? robe;
  const sleevePattern = uchi ? look.uchikakePattern : coat ? look.coatPattern : look.robePattern, layers = look.layers ?? [], lining = look.lining ?? "beni";
  const gh = look.feet === "koma-geta" ? H * KOMA_GETA_HEIGHT : look.feet === "okobo" ? H * OKOBO_HEIGHT : 0, getas: Prim[] = [];
  const legC = look.legs ?? skin, feet = look.feet ?? "waraji", lower = look.lower ?? "robe", bare = look.upper === "bare";
  const hair = look.hair ?? "chonmage", female = hair === "shimada" || hair === "long" || hair === "hyogo" || hair === "kamuro" || hair === "wareshinobu", hairC = look.hairColor ?? (hair === "elder" ? "usuzumi" : "sumi");
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
  // The hagoromo floats out to both sides behind the body.
  if (look.stole) out.push(...stoleSquare(H, shY, sw, look.stole, frame, lw));
  // ---- Legs (a stride lifts the swinging foot; its knee bends toward us, so the shin shortens).
  const legs: Prim[] = [];
  const leg = (side: number, hipA: number, r: number) => {
    const hip: Pt = [side * hipW * .7, hipY], footY = hipY + r, kneeY = hipY + thigh * Math.cos(hipA * DEG) * (pose.kneel > .5 ? .2 : 1);
    if (pose.kneel > .5) return;
    // The courtesan's figure-eight step swings the free foot out to the side and round.
    const spl = side === sF ? pose.splayF : pose.splayB;
    const kn: Pt = [side * hipW * (.75 + .7 * spl), kneeY], an: Pt = [side * hipW * (.8 + 1.6 * spl), footY - H * .01];
    const w = H * .028 * stout;
    if (lower !== "hakama") legs.push({ t: "fill", d: ribbon(hip, kn, w * 1.15, w) + ribbon(kn, an, w, w * .8), fill: legC, outline: lw * .9 });
    // The foot seen end-on: a short rounded wedge, the toes toward us (a heel from behind); sandal or clog under it.
    const fw = H * .03, fh = H * (back ? .018 : .026);
    legs.push({ t: "fill", d: smoothD([[an[0] - fw, an[1] + fh * .6], [an[0] - fw * .8, an[1] - fh * .3], [an[0] + fw * .8, an[1] - fh * .3], [an[0] + fw, an[1] + fh * .6]], true, .4), fill: feet === "tabi" ? "gofun" : legC, outline: lw * .8 });
    if (feet === "okobo") getas.push(...okoboSquare([an[0], an[1] + fh * .6], fw * 1.05, gh, lw, back),
      { t: "fill", d: smoothD([[an[0] - fw * .9, an[1] + fh * .6], [an[0] - fw * .7, an[1] - fh * .4], [an[0] + fw * .7, an[1] - fh * .4], [an[0] + fw * .9, an[1] + fh * .6]], true, .4), fill: legC, outline: lw * .8 });
    if (feet === "koma-geta") getas.push(...komaGetaSquare([an[0], an[1] + fh * .6], fw * 1.05, gh, lw, back),
      { t: "fill", d: smoothD([[an[0] - fw * .9, an[1] + fh * .6], [an[0] - fw * .7, an[1] - fh * .4], [an[0] + fw * .7, an[1] - fh * .4], [an[0] + fw * .9, an[1] + fh * .6]], true, .4), fill: legC, outline: lw * .8 });
    if (feet === "geta") legs.push({ t: "fill", d: polyD([[an[0] - fw * 1.1, an[1] + fh * .6], [an[0] + fw * 1.1, an[1] + fh * .6], [an[0] + fw * 1.1, an[1] + fh * 1.1], [an[0] - fw * 1.1, an[1] + fh * 1.1]]) + polyD([[an[0] - fw * .9, an[1] + fh * 1.1], [an[0] - fw * .6, an[1] + fh * 1.1], [an[0] - fw * .6, an[1] + fh * 2], [an[0] - fw * .9, an[1] + fh * 2]]) + polyD([[an[0] + fw * .6, an[1] + fh * 1.1], [an[0] + fw * .9, an[1] + fh * 1.1], [an[0] + fw * .9, an[1] + fh * 2], [an[0] + fw * .6, an[1] + fh * 2]]), fill: "cha", outline: lw * .7 });
    if (feet === "waraji" && !back) legs.push({ t: "line", d: carvedLine([[an[0] - fw * .6, an[1] - fh * .1], [an[0], an[1] + fh * .4], [an[0] + fw * .6, an[1] - fh * .1]], H * .008, { taper: "none" }), color: "kincha" });
  };
  leg(sF, pose.hipF, rF); leg(sB, pose.hipB, rB);
  out.push({ t: "fill", d: ellipseD(0, 2, H * .14, H * .016), fill: "sumi", opacity: .1, noPrint: true });
  // ---- Arms behind the body come first when seen from behind (the arms hang in front of the robe from the front).
  const up = H * (child ? .15 : .165), fore = H * (child ? .14 : .15), sleeveDepth = H * (look.sleeves === "long" || uchi ? .3 : .15);
  const arm = (side: number, elev: number, bend: number) => armFront([side * sw, shY + H * .01], side, elev, bend, up, fore);
  const drawArm = (pts: [Pt, Pt, Pt]): Prim[] => {
    const [sh, el, wr] = pts, res: Prim[] = [];
    if (bare) {
      // Seen from the front the arm's width is its breadth across, narrower than its profile depth.
      res.push({ t: "fill", d: carvedLine([sh, el, wr], H * .052 * stout, { taper: "end", minRatio: .6, smooth: true }), fill: skin, outline: lw });
      res.push({ t: "line", d: carvedLine([lerp2(sh, el, .25), lerp2(sh, el, .75)], lw * .8, { taper: "both" }), color: "sumi", opacity: .4 });
    } else {
      // The kimono sleeve in two pieces of one cloth. The tube round the arm keeps its thickness across the arm, on one
      // consistent side all the way from shoulder to cuff (offsets in x alone collapse to a line when the arm is level,
      // and choosing each segment's side separately crosses the outline at a bent elbow). Under the forearm hangs the
      // deep pocket, straight down, swinging with the wind; as the arm rises the cloth slides toward the elbow, and a
      // hanging arm's pocket falls the full width of the sleeve past the hand.
      const drop = sleeveDepth, cuff = lerp2(el, wr, .7), out = Math.sign(sh[0]) || 1, t1 = H * .032, t2 = H * .028;
      const unit = (a: Pt, b: Pt): Pt => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
      const d1 = unit(sh, el), d2 = unit(el, cuff), p1: Pt = [-d1[1], d1[0]], p2: Pt = [-d2[1], d2[0]];
      const side = (Math.abs(p1[1]) > .3 ? p1[1] < 0 : p1[0] * out > 0) ? 1 : -1;
      const n1: Pt = [p1[0] * side, p1[1] * side], n2: Pt = [p2[0] * side, p2[1] * side], sum: Pt = [n1[0] + n2[0], n1[1] + n2[1]], sl = Math.hypot(sum[0], sum[1]);
      const nm: Pt = sl > .9 ? [sum[0] / sl, sum[1] / sl] : n1, at = (p: Pt, n: Pt, k: number): Pt => [p[0] + n[0] * k, p[1] + n[1] * k];
      // The two outline points at the elbow. Bent sharply (the forearm folded back), the outer side rounds the tip of the
      // elbow, beyond it along the upper arm, and the inner side tucks into the crook; otherwise they sit across the joint.
      const inPlus = d2[0] * n1[0] + d2[1] * n1[1] > 0, tip: Pt = [el[0] + d1[0] * t1 * 1.25, el[1] + d1[1] * t1 * 1.25];
      const crook = (k: number): Pt => at(el, nm, k * t1 * .25);
      const elP: Pt[] = sl > .9 ? [at(el, nm, t1)] : inPlus ? [crook(1)] : [at(el, n1, t1 * 1.1), tip, at(el, n2, t2 * 1.1)];
      const elM: Pt[] = sl > .9 ? [at(el, nm, -t1)] : inPlus ? [at(el, n2, -t2 * 1.1), tip, at(el, n1, -t1 * 1.1)] : [crook(-1)];
      // The upper sleeve stands a little full of cloth between the shoulder and the elbow.
      const mid = lerp2(sh, el, .55);
      const hang = (p: Pt, k: number): Pt => [p[0] + sway * k, Math.max(p[1] + drop * k, p[1] + H * .02)];
      const rise = clamp01((el[1] - cuff[1]) / (Math.hypot(cuff[0] - el[0], cuff[1] - el[1]) || 1)), attach = lerp2(cuff, el, rise * .7);
      // A forearm hanging down: the pocket falls the sleeve's full width past the hand. Otherwise it hangs as a band under
      // the arm's lower edge from near the shoulder seam to the cuff (a raised forearm lets it fall from the elbow and the
      // upper arm, where the cloth has slid).
      const lower = (p: Pt, n: Pt, t: number): Pt => { const a = at(p, n, t), b = at(p, n, -t); return a[1] > b[1] ? a : b; };
      const lowEl: Pt = [...elP, ...elM].reduce((a, b) => (b[1] > a[1] ? b : a));
      const pocket: Pt[] = Math.abs(n2[1]) < .35 && d2[1] > 0
        ? [elP[0], elM[elM.length - 1], hang(at(cuff, n2, -t2), 1), hang(at(cuff, n2, t2), 1)]
        : (() => { const Ls = lerp2(lower(sh, n1, t1), lowEl, .3), Lc = lower(attach, n2, t2); return [Ls, lowEl, Lc, hang(Lc, 1), hang(lowEl, .9), hang(Ls, .45)]; })();
      res.push({ t: "fill", d: ribbon(lerp2(el, wr, .9), wr, H * .014, H * .012), fill: skin, outline: lw * .8 });
      res.push({ t: "fill", d: smoothD(pocket, true, .3), fill: sleeveC, outline: lw, pattern: sleevePattern, grain: .25 });
      res.push({ t: "fill", d: smoothD([at(sh, n1, t1 * 1.05), at(mid, n1, t1 * 1.15), ...elP, at(cuff, n2, t2), at(cuff, n2, -t2), ...elM, at(mid, n1, -t1 * 1.15), at(sh, n1, -t1)], true, .25),
        fill: sleeveC, outline: lw, pattern: sleevePattern, grain: .25 });
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
  const hemY = lower === "loincloth" ? hipY + H * .1 : lower === "tucked" ? hipY + thigh + H * .03 : gh ? gh * .45 : -H * .035;
  const hemW = H * (lower === "robe" ? (female ? .085 : .095) : .1) * stout, waistY = hipY - torsoH * .28;
  // ---- Swords, projected from their profile placement: forward distance becomes depth, so a blade pointing ahead is
  // foreshortened and the hilt is held before the body; the scabbards go back past the left hip.
  const swordPrims: Prim[] = [], sayaPrims: Prim[] = [], sheathedHilts: Prim[] = [], kataginuWings: Prim[] = [];
  // The oni's club, projected the same way: held before the body, foreshortened when it points ahead.
  if (club) {
    const ux = Math.cos(club.a * DEG) * .45 * sF, uy = Math.sin(club.a * DEG), ang = Math.atan2(uy, ux) / DEG, sc = Math.max(.3, Math.hypot(ux, uy));
    const grip: Pt = [lerp(sF * H * .06, sF * H * .1, club.dropped), lerp(neckY + club.grip[1] * H, -H * .03, club.dropped)];
    swordPrims.push(...kanabo(grip, club.dropped ? (sF < 0 ? 178 : 2) : ang, H, lw, { scale: club.dropped ? 1 : sc }));
    if (club.dropped < 1) {
      const u: Pt = [Math.cos(ang * DEG), Math.sin(ang * DEG)], w = 1 - club.dropped;
      const [eF, wF] = reachArm(armF[0], lerp2(armF[2], grip, w), up, fore, sF < 0 ? 1 : -1), [eB, wB] = reachArm(armB[0], lerp2(armB[2], [grip[0] + u[0] * H * .1 * sc, grip[1] + u[1] * H * .1 * sc], w), up, fore, sB < 0 ? 1 : -1);
      armF = [armF[0], eF, wF]; armB = [armB[0], eB, wB];
    }
  }
  if (sword && look.swords) {
    const st = sword.st, out0 = -sF, koiSq: Pt = [out0 * sw * .62, waistY + H * .015], sayaAng = out0 > 0 ? 38 : 142, cord = look.accent ?? "ai";
    const proj = (a: number) => { const ux = Math.cos(a * DEG) * .45 * sF, uy = Math.sin(a * DEG); return { ang: Math.atan2(uy, ux) / DEG, sc: Math.max(.25, Math.hypot(ux, uy)) }; };
    if (look.swords === "daisho") {
      const kw: Pt = [koiSq[0] - out0 * H * .012, koiSq[1] - H * .022];
      sayaPrims.push(...saya(kw, sayaAng - out0 * 8, H * (back ? .2 : .26), H, lw, cord, 0));
      if (!back) sheathedHilts.push(...katana(kw, sayaAng - out0 * 8, H, lw, { hiltOnly: true, scale: .45, open: .8 }));
    }
    sayaPrims.push(...saya(koiSq, sayaAng, H * (back ? .24 : .32), H, lw, cord, 0));
    // An upright blade (hassō) is held by the right shoulder, clear of the face.
    const f = clamp01((sword.tsuba[0] - sword.koi[0]) / .3), upright = clamp01(1 - Math.abs(sword.a + 95) / 35) * sword.st.free;
    const tsuba: Pt = [lerp(lerp(koiSq[0], sF * H * .045, f), sF * H * .12, upright), neckY + sword.tsuba[1] * H];
    if (sword.shown < .01 && st.free < .01) { if (!back) sheathedHilts.push(...katana(koiSq, sayaAng, H, lw, { hiltOnly: true, scale: .55, open: .8 })); }
    else { const p = proj(sword.a); swordPrims.push(...katana(tsuba, p.ang, H, lw, { shown: sword.shown, scale: p.sc, open: .8 })); }
    if (st.held || st.reach > 0) {
      const p = proj(sword.a), u: Pt = [Math.cos(p.ang * DEG), Math.sin(p.ang * DEG)], w = st.held ? 1 : st.reach;
      const gripR: Pt = [tsuba[0] - u[0] * H * .03 * p.sc, tsuba[1] - u[1] * H * .03 * p.sc], gripL: Pt = [tsuba[0] - u[0] * H * .12 * p.sc, tsuba[1] - u[1] * H * .12 * p.sc];
      const leftT = lerp2([koiSq[0], koiSq[1] - H * .01], gripL, st.grip);
      const [eF, wF] = reachArm(armF[0], lerp2(armF[2], gripR, w), up, fore, sF < 0 ? 1 : -1), [eB, wB] = reachArm(armB[0], lerp2(armB[2], leftT, w), up, fore, sB < 0 ? 1 : -1);
      armF = [armF[0], eF, wF]; armB = [armB[0], eB, wB];
    }
  }
  const body: Pt[] = [[-sw * .55, neckY + H * .005], [-sw, shY + H * .01], [-sw * 1.02, shY + H * .08], [-sw * .82, waistY], [-hemW, hemY], [hemW, hemY], [sw * .82, waistY], [sw * 1.02, shY + H * .08], [sw, shY + H * .01], [sw * .55, neckY + H * .005]];
  // The uchikake: from the front it hangs open in two panels from the shoulders, flaring out over the ground, the
  // padded hem rolling along the bottom and the lining showing down the front edges; from behind it covers the back.
  const uchikakeSquare = (): Prim[] => {
    const res: Prim[] = [], gy = gh, flare = H * .3, motifC = look.motif ?? "kin";
    const panels: Pt[][] = back
      ? [[[-sw * .55, neckY + H * .004], [-sw * 1.06, shY + H * .01], [-sw * 1.16, waistY], [-flare + sway, gy - H * .01], [-flare * .5, gy + H * .004], [0, gy + H * .008], [flare * .5, gy + H * .004], [flare + sway, gy - H * .01], [sw * 1.16, waistY], [sw * 1.06, shY + H * .01], [sw * .55, neckY + H * .004], [0, neckY + H * .02]]]
      : [-1, 1].map(s0 => [[s0 * sw * .5, neckY + H * .004], [s0 * sw * 1.06, shY + H * .01], [s0 * sw * 1.16, waistY], [s0 * flare + sway, gy - H * .01], [s0 * flare * .55, gy + H * .002], [s0 * hemW * .5, gy * .6], [s0 * sw * .42, waistY + H * .06], [s0 * sw * .2, shY + H * .09]]);
    for (const pts of panels) {
      const d = smoothD(pts, true, .3);
      res.push({ t: "fill", d, fill: uchi!, outline: lw, pattern: look.uchikakePattern, grain: .25 });
      if (motifC !== "none") res.push(roundels(d, { x0: -flare, y0: neckY, x1: flare, y1: gy }, H * .055, motifC, lw * .7, back ? [[.3, .28], [.72, .42], [.45, .66], [.15, .86], [.85, .84]] : [[.12, .42], [.88, .36], [.18, .8], [.84, .78]]));
    }
    for (const f of back ? [-.6, -.2, .2, .6] : [-.75, -.55, .55, .75]) res.push({ t: "line", d: carvedLine([[f * sw * 1.05, shY + H * .08], [f * flare * 1.05, gy - H * .03]], lw, { taper: "both" }), color: "sumi", opacity: .32 });
    if (back) res.push(...fuki([[-flare + sway + H * .01, gy - H * .014], [0, gy - H * .002], [flare + sway - H * .01, gy - H * .014]], H * .03, lining, lw));
    else for (const s0 of [-1, 1]) {
      res.push({ t: "line", d: carvedLine([[s0 * sw * .23, shY + H * .1], [s0 * sw * .45, waistY + H * .06], [s0 * hemW * .54, gy * .6 - H * .02]], H * .012, { taper: "start", minRatio: .4, smooth: true }), color: lining });
      res.push(...fuki([[s0 * flare + sway - s0 * H * .01, gy - H * .014], [s0 * flare * .55, gy - H * .006], [s0 * hemW * .52, gy * .6 - H * .01], [s0 * hemW * .5, gy * .6 - H * .05]], H * .03, lining, lw));
    }
    return res;
  };
  if (back) out.push(...swordPrims, ...drawArm(armB), ...drawArm(armF));
  else out.push(...sayaPrims);
  out.push(...legs);
  if (back) out.push(...getas);
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
      if (layers.length) for (const s0 of [1, -1]) out.push(...kasane([[s0 * sw * .45, neckY + H * .006], [0, vY]], [...layers].reverse(), H * .011, [-s0 * H * .009, H * .004], lw * .6));
      else for (const [x0, w] of [[sw * .45, H * .018], [-sw * .45, H * .018]] as const) out.push({ t: "line", d: carvedLine([[x0, neckY + H * .006], [0, vY]], w, { taper: "end", minRatio: .5 }), color: under });
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
    if (look.kataginu) {
      // Kamishimo: the stiff wings stand straight out past the shoulders; from the front the panels part in a V over
      // the kimono's collar and narrow into the hakama, a crest on each breast; from behind, one crest at the nape.
      const kc = look.kataginu, crestC = look.crest ?? kc, wy = shY - H * .006;
      const half = (s0: number): Pt[] => [[s0 * sw * .45, neckY + H * .004], [s0 * sw * 1.62, wy], [s0 * sw * 1.55, wy + H * .03], [s0 * sw * .95, shY + H * .07], [s0 * sw * .8, waistY + H * .01], [s0 * sw * .12, waistY + H * .01], [s0 * sw * .22, shY + H * .12]];
      if (back) out.push({ t: "fill", d: smoothD([[-sw * .5, neckY + H * .004], [-sw * 1.62, wy], [-sw * 1.55, wy + H * .03], [-sw * .95, shY + H * .07], [-sw * .8, waistY + H * .01], [sw * .8, waistY + H * .01], [sw * .95, shY + H * .07], [sw * 1.55, wy + H * .03], [sw * 1.62, wy], [sw * .5, neckY + H * .004]], true, .06), fill: kc, outline: lw, grain: .3 }, ...mon([0, shY + H * .05], H * .02, lw, crestC));
      else for (const s0 of [-1, 1]) out.push({ t: "fill", d: smoothD(half(s0), true, .06), fill: kc, outline: lw, grain: .3 }, ...mon([s0 * sw * .55, shY + H * .065], H * .018, lw, crestC));
      out.push({ t: "stroke", d: [-.6, -.3, .3, .6].map(x => `M${(x * sw).toFixed(1)} ${(shY + H * .1).toFixed(1)}L${(x * sw * .85).toFixed(1)} ${(waistY - H * .01).toFixed(1)}`).join(""), color: "sumi", width: lw * .7, opacity: .3 });
      if (!back) for (const s0 of [-1, 1]) kataginuWings.push({ t: "fill", d: smoothD([[s0 * sw * .7, wy - H * .002], [s0 * sw * 1.62, wy], [s0 * sw * 1.55, wy + H * .03], [s0 * sw * .85, wy + H * .035]], true, .06), fill: kc, outline: lw, grain: .3 });
    }
    if (coat) out.push({ t: "fill", d: smoothD([[-sw * .55, neckY + H * .005], [-sw * 1.03, shY + H * .01], [-sw * 1.05, waistY + H * .12], [-sw * .2, waistY + H * .14], [0, waistY + H * .1], [sw * .2, waistY + H * .14], [sw * 1.05, waistY + H * .12], [sw * 1.03, shY + H * .01], [sw * .55, neckY + H * .005]], true, .3), fill: coat, outline: lw, pattern: look.coatPattern, grain: .25 });
    if (layers.length && !back && pose.kneel < .5) out.push(...kasane([[-hemW * .9, hemY - H * .004], [0, hemY + H * .004], [hemW * .9, hemY - H * .004]], layers, H * .012, [0, -H * .013], lw * .6));
    if (uchi) out.push(...uchikakeSquare());
    out.push(...(back ? [] : getas));
    // The obi band across the waist; its cord from the front, its knot (the taiko box, or a man's small knot) behind.
    const obiH = H * (female ? .07 : .05);
    if (look.obiTie === "darari") {
      // From the front the red obiage and the jewelled clasp; from behind the knot and the two long ends, swinging.
      const swing = H * Math.sin(frame / 11) * .008 - wind * H * .025;
      out.push(...(back ? darariBack(waistY, sw * .88, hemY - H * .03, H, lw, obiC, look.obiPattern ?? "kin", swing) : obiFront(waistY, sw * .88, H, lw, obiC, look.obiPattern ?? "kin", look.accent ?? "beni")));
    } else if (look.obiTie === "front") { if (!back) out.push(...maeObiFront(waistY, sw * .9, H, lw, obiC, look.obiPattern ?? "kin", Math.sin(frame / 9) * .6 - wind * .5)); }
    else out.push({ t: "fill", d: polyD([[-sw * .86, waistY - obiH / 2], [sw * .86, waistY - obiH / 2], [sw * .84, waistY + obiH / 2], [-sw * .84, waistY + obiH / 2]]), fill: obiC, outline: lw, grain: .3 });
    if (look.obiTie === "front" || look.obiTie === "darari") { /* drawn above */ }
    else if (!back) out.push({ t: "line", d: carvedLine([[-sw * .8, waistY + obiH * .1], [sw * .8, waistY + obiH * .1]], H * .007, { taper: "none" }), color: look.accent ?? (obiC === "kincha" ? "beni" : "kincha") });
    else if (female) out.push({ t: "fill", d: smoothD([[-sw * .55, waistY - obiH * .9], [sw * .55, waistY - obiH * .9], [sw * .6, waistY + obiH * 1.4], [-sw * .6, waistY + obiH * 1.4]], true, .2), fill: obiC, outline: lw, pattern: { type: "kikko", color: "kin", scale: .25, opacity: .6 } });
    else out.push({ t: "fill", d: smoothD([[-H * .02, waistY - obiH * .6], [H * .02, waistY - obiH * .6], [H * .025, waistY + obiH * .8], [-H * .025, waistY + obiH * .8]], true, .3), fill: obiC, outline: lw * .8 });
  }
  if (back) out.push(...sayaPrims);
  else out.push(...sheathedHilts, ...swordPrims, ...drawArm(armB), ...drawArm(armF), ...kataginuWings);
  // The great armour over everything below the neck (the shoulder boards stand out over the arms).
  if (look.armor) out.push(...oyoroiSquare(sw, shY, waistY, H, lw, look.armor, back));
  if (look.mino) out.push(...minoSquare(sw, shY, waistY, H, lw, frame));
  if (look.eyes && !back) for (const a of [armF, armB]) out.push(...armEyes(a[1], a[2], H, lw, frame, a === armF ? 1 : 2));
  // ---- Neck and head.
  const headR = H * (child ? .085 : look.face === "oni" ? .08 : .064), headY = neckY - headR * 1.15 + bowK * headR * .5;
  const tilt = (pose.tilt - 2) * .4;
  out.push({ t: "fill", d: ribbon([0, neckY + H * .01], [0, headY + headR * .6], headR * .32, headR * .3), fill: skin, outline: lw * .8 });
  if (look.beads && !back) out.push(...magatama([0, neckY + H * .03], H, lw, true));
  out.push({ t: "group", transform: `translate(0 ${headY.toFixed(2)}) rotate(${tilt.toFixed(2)})`, prims: back ? headBack(look, headR, lw, hairC, wind, pose, frame) : headFront(look, pose, headR, lw, hairC, female, wind, frame) });
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
  } else if (prop === "staff" || (prop === "kanabo" && !club)) {
    out.push({ t: "line", d: carvedLine([add(hand, [0, -H * (.25)]), add(hand, [0, prop === "kanabo" ? H * .02 : -hand[1]])], H * (prop === "kanabo" ? .04 : .012), { taper: prop === "kanabo" ? "start" : "none" }), color: prop === "kanabo" ? "sumi" : propC });
  } else if (prop === "zaru") {
    out.push(...zaru([(armF[2][0] + armB[2][0]) / 2, (armF[2][1] + armB[2][1]) / 2], H, lw, frame));
  } else if (prop === "shaku" || prop === "hiogi") {
    out.push(...courtProp(prop, hand, H, lw, frame));
  } else if (prop === "naginata") {
    out.push(...naginataProp(hand, -80, H, lw));
  } else if (prop === "yumi") {
    out.push({ t: "line", d: carvedLine([[hand[0], hand[1] - H * .6], [hand[0] + H * .03, hand[1] - H * .2], [hand[0], hand[1] + H * .3]], H * .014, { taper: "both", smooth: true }), color: "sumi" });
  } else if (prop === "mirror" || prop === "tsurugi" || prop === "hoko" || prop === "tai") {
    out.push(...kamiProp(prop, hand, H, lw, frame));
  } else if (prop === "peony-lantern") {
    out.push(...peonyLantern(hand, H, lw, frame, wind, 0));
  } else if (prop === "baby") {
    out.push(...babyBundle([(armF[2][0] + armB[2][0]) / 2, (armF[2][1] + armB[2][1]) / 2 - H * .02], H, lw, 1, true));
  } else if (prop === "lantern") {
    out.push({ t: "line", d: carvedLine([hand, add(hand, [0, H * .05])], H * .006, { taper: "none" }), color: "sumi" });
    out.push({ t: "fill", d: ellipseD(hand[0], hand[1] + H * .1, H * .035, H * .05), fill: "ki", outline: lw, opacity: .95 }, { t: "glow", cx: hand[0], cy: hand[1] + H * .1, r: H * .12, color: "ki", opacity: .35 });
  } else if (prop === "maiogi") {
    const el = armF[1], a = Math.atan2(hand[1] - el[1], hand[0] - el[0]) / DEG;
    out.push(...maiogi(hand, a + (back ? 10 : -10), H * .17, lw, accent === "shu" ? "beni" : accent, clamp01((pose.shF - 25) / 45)));
  } else if (prop === "parasol") {
    out.push(...parasol([(armF[2][0] + armB[2][0]) / 2 + H * .1, (armF[2][1] + armB[2][1]) / 2], H, lw, look.accent ?? "beni", 0, wind, frame, true));
  } else if (prop === "fan") {
    out.push({ t: "fill", d: smoothD([hand, add(hand, [-H * .05, -H * .06]), add(hand, [0, -H * .075]), add(hand, [H * .05, -H * .06])], true, .3), fill: accent, outline: lw * .8 });
  }
  // Tall clogs: the figure stands gh higher, the clogs reaching the ground.
  const res: Prim[] = gh ? [{ t: "group", transform: `translate(0 ${(-gh).toFixed(2)})`, prims: out }] : out;
  // A fall seen square on topples straight away from us (or toward us from behind): the body foreshortens down to the
  // ground about the heels, as a figure lying on its back seen from its feet. A dropped club stays at full length.
  if (pose.fall > 0) return [{ t: "group", transform: `scale(1 ${(1 - .82 * pose.fall).toFixed(3)})`, prims: res.filter(p => !(club && club.dropped >= 1 && swordPrims.includes(p))) }, ...(club && club.dropped >= 1 ? swordPrims : [])];
  return res;
}

/** The face from the front: both eyes, brows, the nose as a small hooked line, the mouth; then the hair style. */
function headFront(look: UkiyoeFigureLook, pose: FigurePose, r: number, lw: number, hairC: UkiyoePaint, female: boolean, wind: number, frame = 0): Prim[] {
  const out: Prim[] = [], skin = look.skin ?? "hada", hair = look.hair ?? "chonmage", P = (x: number, y: number): Pt => [x * r, y * r];
  const hairBack = (pts: Pt[]) => out.push({ t: "fill", d: smoothD(pts, true, .4), fill: hairC, outline: lw });
  const sway = wind * .8 + Math.sin(pose.tilt / 7 + r) * .2;
  const hy = hair === "hyogo" ? hyogoSquare(r, lw, hairC, look.accent ?? "shu", false) : hair === "wareshinobu" ? wareshinobuSquare(r, lw, hairC, look, false, sway) : undefined;
  if (hy) out.push(...hy.behind);
  // Hair behind the face first.
  if (hair === "long") hairBack([P(-1.05, -.4), P(-1.2, .6), P(-1.25 - wind * .1, 2.6), P(-.7, 2.7), P(.7, 2.7), P(1.25 - wind * .1, 2.6), P(1.2, .6), P(1.05, -.4), P(0, -1.2)]);
  if (hair === "shimada") hairBack([P(-1.05, -.2), P(-1.0, .45), P(-.7, .6), P(.7, .6), P(1.0, .45), P(1.05, -.2), P(.85, -1.0), P(0, -1.25), P(-.85, -1.0)]);
  if (hair === "wild") { const sp: Pt[] = []; for (let i = 0; i <= 18; i++) { const a = Math.PI * (1.05 + i / 18 * .9 * 2) / 1, rr = 1.25 + (i % 2 ? .4 + .15 * Math.sin(i * 2.3) : 0); sp.push(P(Math.cos(a) * rr, Math.sin(a) * rr * 1.05 - .1)); } hairBack(sp); }
  if (hair === "gourd") out.push(...gourdSquare(P, lw, skin));
  // Face: an oval, a little narrower at the chin; ears at the sides.
  if (hair !== "hyogo" && hair !== "kamuro" && hair !== "wareshinobu") out.push({ t: "fill", d: ellipseD(-r * .95, r * .05, r * .14, r * .22) + ellipseD(r * .95, r * .05, r * .14, r * .22), fill: skin, outline: lw * .7 });
  const faceOval = female && look.build !== "child" ? [P(-.8, -.35), P(-.74, .42), P(-.4, .94), P(0, 1.12), P(.4, .94), P(.74, .42), P(.8, -.35), P(.55, -.95), P(0, -1.06), P(-.55, -.95)]
    : [P(-.88, -.3), P(-.8, .45), P(-.45, .92), P(0, 1.05), P(.45, .92), P(.8, .45), P(.88, -.3), P(.6, -.95), P(0, -1.08), P(-.6, -.95)];
  out.push({ t: "fill", d: smoothD(faceOval, true, .4), fill: skin, outline: lw * (female ? .42 : .7) });
  const oni = look.face === "oni", ghost = isGhostFace(look.face) ? look.face : undefined, featStart = out.length;
  if (oni) {
    for (const s of [-1, 1]) {
      out.push({ t: "fill", d: ellipseD(s * r * .38, -r * .08, r * .24, r * .2), fill: "gofun", outline: lw }, { t: "dots", d: circleD(s * r * .36, -r * .06, r * .1), color: "sumi" });
      out.push({ t: "line", d: carvedLine([P(s * .12, -.42), P(s * .45, -.5), P(s * .72, -.3)], r * .14, { taper: "end" }), color: "sumi" });
    }
    out.push({ t: "fill", d: polyD([P(-.35, .55), P(-.25, .85), P(-.15, .55)]) + polyD([P(.15, .55), P(.25, .85), P(.35, .55)]), fill: "gofun", outline: lw * .6 });
    out.push({ t: "line", d: carvedLine([P(-.45, .52), P(0, .62), P(.45, .52)], r * .06, { taper: "both" }), color: "sumi" });
  } else {
    const moods = moodsOf(pose);
    out.push(...faceFront({ P, k: r, lw, moods, traits: faceTraits(look, female), blink: pose.blink, gaze: pose.gaze * .6, mouth: pose.mouth, hair: hairC === "usuzumi" ? "usuzumi" : "sumi", lips: look.lips }));
    if (look.beard) out.push({ t: "fill", d: smoothD([P(-.5, .55), P(-.3, 1.2), P(0, 1.5), P(.3, 1.2), P(.5, .55), P(0, .85)], true, .4), fill: hairC, outline: lw * .7 });
  }
  // Ghost-story faces: the features smooth away or the bone shows, then the face's own marks.
  const shown = humanFeatures(ghost, pose.reveal);
  if (shown < 1) { const feats = out.splice(featStart); if (shown > 0) out.push({ t: "group", opacity: shown, prims: feats }); }
  if (ghost) out.push(...ghostFaceFront(ghost, pose.reveal, P, r, lw, skin, pose.mouth, frame));
  // Hair in front.
  switch (hair) {
    case "chonmage": case "elder":
      // The shaved pate (cool grey-blue), hair at the temples, the topknot folded forward on the crown.
      out.push({ t: "fill", d: smoothD([P(-.62, -.7), P(0, -1.0), P(.62, -.7), P(0, -.62)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sora", .9], [1, "sora", .4]] } });
      for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .62, -.72), P(s * .95, -.3), P(s * .9, .25), P(s * .78, -.05), P(s * .72, -.45)], true, .4), fill: hairC, outline: lw * .8 });
      out.push({ t: "fill", d: smoothD([P(-.12, -.98), P(-.14, -1.45), P(0, -1.55), P(.14, -1.45), P(.12, -.98)], true, .4), fill: hairC, outline: lw * .8 });
      break;
    case "topknot": hairBack([P(-.92, -.2), P(-.75, -.95), P(0, -1.18), P(.75, -.95), P(.92, -.2), P(.6, -.62), P(0, -.78), P(-.6, -.62)]); out.push({ t: "fill", d: ellipseD(0, -r * 1.35, r * .3, r * .25), fill: hairC, outline: lw * .8 }); break;
    case "shimada": {
      // After Utamaro's Hanaōgi and Okita: the Fuji-shaped hairline of fine combed strands dipping to a point at the
      // centre of the brow, the side locks (bin) combed out into thin wings over the ears, the front puff (maegami), the
      // knot (mage) in two loops tied with paper and red cloth, a tortoiseshell comb, the bar, two pins with strips.
      const acc = look.accent ?? "shu", shell = { type: "linear" as const, angle: 90, stops: [[0, "ki", 1], [.6, "kincha", 1], [1, "cha", 1]] as [number, UkiyoePaint, number][] };
      const line: Pt[] = [[-.84, -.18], [-.66, -.58], [-.34, -.7], [0, -.56], [.34, -.7], [.66, -.58], [.84, -.18]];
      for (const s of [-1, 1]) {
        // The bin: a translucent wing combed out over the ear, denser at the root.
        const wing = [P(s * .78, -.72), P(s * 1.22, -.62), P(s * 1.46, -.2), P(s * 1.38, .28), P(s * 1.06, .44), P(s * .8, .2), P(s * .84, -.18)];
        out.push({ t: "fill", d: smoothD(wing, true, .42), fill: hairC, opacity: .62 });
        out.push({ t: "fill", d: smoothD([P(s * .78, -.72), P(s * 1.1, -.58), P(s * 1.2, -.2), P(s * 1.06, .2), P(s * .82, .14), P(s * .84, -.18)], true, .42), fill: hairC, opacity: .9 });
        out.push(...hairSheen(P, r / 18, [0, 1, 2, 3, 4].map(i => [[s * .84, -.5 + i * .14], [s * (1.15 + .05 * Math.sin(i)), -.45 + i * .17], [s * (1.38 - .02 * i), -.3 + i * .16]] as Pt[])));
        out.push({ t: "stroke", d: smoothD([P(s * .78, -.72), P(s * 1.22, -.62), P(s * 1.46, -.2), P(s * 1.38, .28), P(s * 1.06, .44)], false, .42), color: "sumi", width: lw * .45, opacity: .7 });
      }
      // The crown and the front puff over the hairline.
      out.push({ t: "fill", d: smoothD([...line.map(q => P(q[0], q[1])), P(.92, -.62), P(.6, -1.12), P(.36, -1.42), P(0, -1.52), P(-.36, -1.42), P(-.6, -1.12), P(-.92, -.62)], true, .38), fill: hairC });
      out.push({ t: "stroke", d: smoothD([P(.84, -.18), P(.92, -.62), P(.6, -1.12), P(.36, -1.42), P(0, -1.52), P(-.36, -1.42), P(-.6, -1.12), P(-.92, -.62), P(-.84, -.18)], false, .38), color: "sumi", width: lw * .6 });
      out.push(...hairSheen(P, r / 18, [[[-.5, -.66], [-.42, -1.0], [-.2, -1.38]], [[.5, -.66], [.42, -1.0], [.2, -1.38]], [[-.2, -.62], [-.12, -1.1], [0, -1.45]], [[.2, -.62], [.12, -1.1], [0, -1.45]], [[-.75, -.4], [-.72, -.8], [-.5, -1.2]], [[.75, -.4], [.72, -.8], [.5, -1.2]]]));
      out.push(...kewari(P, r / 18, line, [0, .1], 7, 3.4, "sumi", 1 / 18));
      // The knot: two loops over the crown, the red cloth and the white paper tie between them.
      for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .08, -1.5), P(s * .3, -1.98), P(s * .72, -2.02), P(s * .82, -1.66), P(s * .46, -1.44)], true, .42), fill: hairC, outline: lw * .6 });
      out.push(...hairSheen(P, r / 18, [[[-.66, -1.8], [-.4, -1.92], [-.16, -1.7]], [[.66, -1.8], [.4, -1.92], [.16, -1.7]]]));
      out.push({ t: "fill", d: smoothD([P(-.16, -1.5), P(-.12, -1.9), P(.12, -1.9), P(.16, -1.5)], true, .3), fill: acc, outline: lw * .4, pattern: { type: "kanoko", color: "gofun", scale: .25, opacity: .7 } });
      out.push({ t: "fill", d: smoothD([P(-.05, -1.48), P(-.04, -1.96), P(.04, -1.96), P(.05, -1.48)], true, .2), fill: "gofun", outline: lw * .35 });
      // The comb, a crescent of tortoiseshell set in the front of the knot.
      out.push({ t: "fill", d: smoothD([P(-.62, -1.28), P(-.5, -1.52), P(0, -1.62), P(.5, -1.52), P(.62, -1.28), P(.4, -1.36), P(0, -1.42), P(-.4, -1.36)], true, .35), fill: shell, outline: lw * .45 });
      out.push({ t: "dots", d: [-2, -1, 0, 1, 2].map(i => circleD(i * .22 * r, -1.5 * r + Math.abs(i) * .02 * r, r * .03)).join(""), color: "cha" });
      // The bar through the knot, and two pins fanned out with their dangling strips.
      out.push({ t: "line", d: carvedLine([P(-1.18, -1.74), P(1.18, -1.8)], r * .05 + .4, { taper: "none" }), color: "ki" });
      out.push({ t: "fill", d: ellipseD(-1.2 * r, -1.74 * r, r * .05, r * .07) + ellipseD(1.2 * r, -1.8 * r, r * .05, r * .07), fill: "kincha", outline: lw * .4 });
      const sway = Math.sin(frame / 11 + r) * .03 + wind * .05;
      for (const s of [-1, 1]) {
        const tip = P(s * .98, -2.12);
        out.push({ t: "line", d: carvedLine([P(s * .36, -1.6), tip], r * .022 + .3, { taper: "end" }), color: "kin" });
        out.push({ t: "fill", d: circleD(tip[0], tip[1], r * .07), fill: acc, outline: lw * .35 }, { t: "fill", d: circleD(tip[0], tip[1], r * .028), fill: "kin" });
        out.push({ t: "stroke", d: [-1, 0, 1].map(i => { const q = P(s * .98 + i * .03, -2.06); return `M${q[0].toFixed(1)} ${q[1].toFixed(1)}l${((sway + i * .01) * r).toFixed(1)} ${(r * (.2 + Math.abs(i) * .03)).toFixed(1)}`; }).join(""), color: "kin", width: r * .012 + .2 });
      }
      break;
    }
    case "child": hairBack([P(-.95, -.05), P(-.85, -.95), P(0, -1.18), P(.85, -.95), P(.95, -.05), P(.55, -.5), P(0, -.55), P(-.55, -.5)]); break;
    case "long": hairBack([P(-.95, .1), P(-.85, -.95), P(0, -1.15), P(.85, -.95), P(.95, .1), P(.5, -.7), P(0, -.82), P(-.5, -.7)]); break;
    case "wild": hairBack([P(-.95, -.25), P(-.7, -1.0), P(0, -1.2), P(.7, -1.0), P(.95, -.25), P(.5, -.75), P(0, -.85), P(-.5, -.75)]); break;
    case "hyogo": case "wareshinobu": out.push(...hy!.over); break;
    case "kamuro": out.push(...kamuroSquare(r, lw, hairC, look.accent ?? "beni", false)); break;
    case "mizura": case "tenko": out.push(...ancientHairSquare(hair, P, r, lw, hairC, look.accent ?? "shu", false)); break;
    case "heian": out.push(...heianHairSquare(P, lw, hairC, (pose.kneel > .5 ? 5 : 8.5), false)); break;
    case "gourd": break;
    case "bald": break;
  }
  if (look.face === "oni") for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .3, -.85), P(s * .45, -1.7), P(s * .55, -.8)], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "ki", 1]] }, outline: lw });
  if (look.animal) { out.length = 0; out.push(...animalHeadSquare(look.animal, P, lw, false)); }
  out.push(...hatFront(look, r, lw, wind, frame));
  return out;
}

/** The head from behind: the back of the hair (the shaved pate and topknot, the shimada bun with its pins), the ears and the nape. */
function headBack(look: UkiyoeFigureLook, r: number, lw: number, hairC: UkiyoePaint, wind: number, pose?: FigurePose, frame = 0): Prim[] {
  const out: Prim[] = [], skin = look.skin ?? "hada", hair = look.hair ?? "chonmage", P = (x: number, y: number): Pt => [x * r, y * r];
  if (hair !== "hyogo" && hair !== "kamuro" && hair !== "wareshinobu") out.push({ t: "fill", d: ellipseD(-r * .95, r * .05, r * .14, r * .22) + ellipseD(r * .95, r * .05, r * .14, r * .22), fill: skin, outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([P(-.88, -.3), P(-.78, .5), P(-.4, .95), P(0, 1.02), P(.4, .95), P(.78, .5), P(.88, -.3), P(.6, -.95), P(0, -1.08), P(-.6, -.95)], true, .4), fill: skin, outline: lw * .9 });
  const mass = (pts: Pt[]) => out.push({ t: "fill", d: smoothD(pts, true, .4), fill: hairC, outline: lw });
  const hy = hair === "hyogo" ? hyogoSquare(r, lw, hairC, look.accent ?? "shu", true) : hair === "wareshinobu" ? wareshinobuSquare(r, lw, hairC, look, true, wind * .8) : undefined;
  if (hy) out.splice(0, 0, ...hy.behind);
  // White make-up stops at the nape in two points (eri-ashi).
  if (skin === "gofun") out.push(...eriAshi(r));
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
    case "hyogo": case "wareshinobu": out.push(...hy!.over); break;
    case "kamuro": out.push(...kamuroSquare(r, lw, hairC, look.accent ?? "beni", true)); break;
    case "mizura": case "tenko": out.push(...ancientHairSquare(hair, P, r, lw, hairC, look.accent ?? "shu", true)); break;
    case "heian": out.push(...heianHairSquare(P, lw, hairC, (pose && pose.kneel > .5 ? 5 : 8.5), true)); break;
    case "gourd": out.push(...gourdSquare(P, lw, skin)); break;
    case "bald": break;
  }
  if (look.face === "oni") for (const s of [-1, 1]) out.push({ t: "fill", d: smoothD([P(s * .3, -.85), P(s * .45, -1.7), P(s * .55, -.8)], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "ki", 1]] }, outline: lw });
  if (pose && isGhostFace(look.face)) out.push(...ghostFaceBack(look.face, pose.reveal, P, r, lw, frame));
  if (look.animal) { out.length = 0; out.push(...animalHeadSquare(look.animal, P, lw, true)); }
  out.push(...hatFront(look, r, lw, wind, frame));
  return out;
}

/** Hats are near enough symmetric to serve front and back. */
function hatFront(look: UkiyoeFigureLook, r: number, lw: number, wind: number, frame = 0): Prim[] {
  if (look.hat === "hachi") return hachiSide((x, y) => [x * r, y * r], lw, true);
  if (look.hat === "zukin") return zukin((x, y) => [x * r, y * r], lw, true);
  if (look.hat === "kanmuri") return kanmuriSquare((x, y) => [x * r, y * r], lw, false);
  if (look.hat === "dragon") return dragonCrownSquare((x, y) => [x * r, y * r], lw, false);
  if (look.hat === "kabuto") return kabutoSquare((x, y) => [x * r, y * r], r, lw, look.armor ?? "beni");
  if (look.hat === "gotoku") return gotokuCrown((x, y) => [x * r, y * r], r, lw, frame, 0, true);
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
