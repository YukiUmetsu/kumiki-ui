/**
 * 墨梅 Mòméi, ink plum: an original ink-wash figure on the INK-RISO1 engine, painted wash first and line last. Four inks: a
 * skin earth, indigo, vermilion, black.
 *
 * A young woman of about twenty, turned to the viewer's right beside a plum branch: wide calm eyes, a small mouth, warm cheeks, the plum
 * blossom mark of 梅花妝 on her brow. Her hair is parted in two soft masses and wound into a coil on the crown (髻); behind it hangs the
 * hollow loop of an unmarried girl (垂鬟), with a spray of white plum and a pin whose bead chain swings (步搖), and one tress tied with a
 * red cord comes down over the shoulder. The robe closes the wearer's left over right; a long shawl of gauze (披帛) lies
 * over the far shoulder, goes round behind her and is held in the crook of the near arm.
 */
import { inkSplatter } from "../../ink-riso-pen";
import type { InkRisoPen, PenNode as N3, PenPoint as P2 } from "../../ink-riso-pen";
import { inkBlob, inkBloom, inkSide, inkThread } from "../../ink-riso-wet";
import { inkFbm2 } from "../../ink-riso-press";
import { inkGuideSheet } from "../../ink-riso-coiffure";
import { poseInkHead } from "../../ink-riso-face";
import type { InkHead, InkProfile } from "../../ink-riso-face";
import { gongbiColours, gongbiHand, gongbiSkin, paintGongbiEar, paintGongbiFace } from "../../ink-riso-gongbi";
import type { GongbiEar, GongbiFace, GongbiHand, GongbiMix, GongbiPlace } from "../../ink-riso-gongbi";
import { gongbiAlong, gongbiBand, gongbiHues, liftGongbiHair, liftGongbiLines, paintGongbiDown, paintGongbiFlow, paintGongbiHair, paintGongbiLines, paintGongbiLock } from "../../ink-riso-gongbi-hair";
import type { GongbiHairLine, GongbiLock } from "../../ink-riso-gongbi-hair";
import { beautifulFace } from "../../../anatomy/face-beauty";
import { eyeCentres } from "../../../anatomy/anatomy-face";
import { inkPaintOrder } from "../ink-cel";
import { inkCover, inkFade } from "../ink-veil";
import type { InkPaintContext, InkPart, InkSubject } from "../ink-cel";
import { inkPlates } from "../ink-pigments";

type Pens = Record<"face" | "page", InkRisoPen>;
const K = "ink", R = "cinnabar", B = "indigo", E = "skin", W = "white";
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const dice = (seed: number) => { let k = 0; return () => { const v = Math.sin(seed * 12.9898 + k++ * 78.233) * 43758.5453; return v - Math.floor(v); }; };

const PAPER = "#F8F1E3";
const PAGE = { width: 1200, height: 1600, margin: 36 };
const PLATES = inkPlates({ [W]: "white", [E]: "tan", [B]: "indigo", [R]: "vermilion", [K]: "ink" });
const SITTER = beautifulFace({ sex: 0, faceType: "east-asian" });
/** The face's outline: share of its height, far side, near side. A full young cheek, then one long clean line down to a small chin. */
const OUTLINE: InkProfile = [[-0.33, -0.478, 0.75], [-0.18, -0.452, 0.745], [-0.05, -0.436, 0.74], [0.07, -0.424, 0.73], [0.18, -0.41, 0.72], [0.28, -0.39, 0.71], [0.39, -0.358, 0.7], [0.48, -0.322, 0.69], [0.55, -0.288, 0.655], [0.65, -0.226, 0.58], [0.75, -0.154, 0.48], [0.81, -0.108, 0.4], [0.865, -0.067, 0.32], [0.915, -0.028, 0.25], [0.95, 0, 0.21], [0.975, 0.036, 0.18], [0.992, 0.082, 0.16], [1, 0.132, 0.132]];
/** The head is posed, and all its hair is laid out, turned to the viewer's left; the pen it is drawn with is mirrored, so she looks to the right. */
const HEAD = soften(poseInkHead({ vertices: SITTER.vertices, faces: SITTER.mesh.faces, eyes: eyeCentres(SITTER.vertices) }, { yaw: -25, pitch: 10, roll: -5, scale: 0.78, at: [0, 0] }, {
  gaze: [0, 0.1], forehead: 0.5, length: 0.98, eye: [1.3, 1.3], iris: 1.06, eyeTilt: 1.4,
  lift: 0.6, noseUnder: 5, noseHeight: 0.34, nose: 0.6, mouth: 0.69, lips: 0.86, lean: 4, outline: OUTLINE, side: { square: 0, ear: 0.8, earWidth: 0.94 },
}));
const mirror = (p: InkRisoPen): InkRisoPen => {
  const m = (q: N3): N3 => [-q[0], q[1], q[2]];
  return { sheet: p.sheet, at: (x, y) => p.at(-x, y), local: (X, Y) => { const [x, y] = p.local(X, Y); return [-x, y]; }, line: (plate, q, w, o) => p.line(plate, q.map(m), w, o), shape: (q, closed) => p.shape(q.map(m), closed), wash: (plate, q, o, solid) => p.wash(plate, q, typeof o.tone === "number" ? o : { ...o, tone: (x, y) => (o.tone as (x: number, y: number) => number)(-x, y) }, solid), knock: p.knock, lift: (q, w, plates) => p.lift(q.map(m), w, plates), disc: (x, y, r) => p.disc(-x, y, r) };
};
/** Chin and jaw run through one softer turn: a bowed chin has no corner on its far side. And the hairline stops where they begin. */
function soften(h: InkHead): InkHead {
  const all = [...h.contour, ...h.jaw.slice(1)], at = h.contour.length - 1, local = all.map(q => h.local(q)), chin = local[at][0];
  let q = all.map(v => [v[0], v[1]] as P2);
  for (let k = 0; k < 60; k++) q = q.map((v, i) => { const d = Math.abs(local[i][0] - (chin - 0.07)), w = 0.5 * ss(0.2, 0.06, d); return i === 0 || i === q.length - 1 || !w ? v : [lerp(v[0], (q[i - 1][0] + q[i + 1][0]) / 2, w), lerp(v[1], (q[i - 1][1] + q[i + 1][1]) / 2, w)]; });
  const far = h.fromLevel(q[0])[1], near = h.fromLevel(q[q.length - 1])[1];
  return { ...h, contour: q.slice(0, at + 1), jaw: q.slice(at), hairline: h.hairline.filter(v => { const [x, y] = h.fromLevel(v); return y < (x < 0 ? far - 0.14 : near); }) };
}

/** The middle between the pupils, pen units, and where it lies on the page; the distance between them on the page. */
const EYES = HEAD.level(0, 0), AT = { x: 632, y: 611, pd: 104 };
const UNIT = Math.hypot(HEAD.level(1, 0)[0] - EYES[0], HEAD.level(1, 0)[1] - EYES[1]), FZ = AT.pd / UNIT;
const FACE = { x: AT.x + FZ * EYES[0], y: AT.y - FZ * EYES[1], scale: FZ };
/** Ornaments are drawn for a head whose pupils are 134 apart. */
const Z = AT.pd / 134;
const FRAMES = { face: FACE, page: { x: 0, y: 0, scale: 1 } };

// ---- the face --------------------------------------------------------------------------------------------------------------------
// Places and edges are in the level frame (+x the near side); skin is the colour it has there.
const GONGBI = { ink: K, warm: R, earth: E, cool: B, white: W }, colour = gongbiColours(PLATES, GONGBI, PAPER);
const at = (x: number, y: number, of: string, reach = 0.2): GongbiPlace => ({ at: [x, y], mix: colour(of), reach });
/** What turns the skin there into this one. */
const shade = (to: string, on: string) => colour(to, 0, on);
const SKIN: readonly GongbiPlace[] = [
  // forehead: light in the middle, warm by the hair
  at(-0.1, -0.78, "#FBF4ED", 0.26), at(-0.4, -0.75, "#FAF2EA", 0.2), at(0.2, -0.6, "#F3E3D6", 0.2), at(0.5, -0.5, "#E9D5C5", 0.2), at(-0.18, -1.14, "#E0C8B7", 0.1), at(-0.1, -0.98, "#F3E6DB", 0.12), at(0.2, -1.0, "#E0C9B7", 0.14), at(0.55, -0.84, "#CFB19B", 0.18), at(0.85, -0.5, "#D8BDA9", 0.18), at(-0.62, -0.9, "#E8D2C3", 0.12), at(-0.7, -0.6, "#F3E3D7", 0.14),
  at(0.98, -0.2, "#DFC5B3", 0.16), at(0.92, -0.02, "#D3AF97", 0.12), at(1.05, 0.15, "#DDBCA9", 0.16),
  // between the brows, the bridge and the side of the nose
  at(-0.13, -0.28, "#F4E7DB", 0.12), at(-0.2, 0.05, "#FAF2E9", 0.09), at(-0.21, 0.32, "#FBF4EC", 0.09), at(-0.23, 0.56, "#FAEDE3", 0.08), at(0.06, 0.0, "#EBD8C9", 0.12), at(0.06, 0.3, "#F2E0D2", 0.1), at(0.1, 0.5, "#EFDCCE", 0.1),
  // lids and sockets
  at(0.17, -0.13, "#EBD2C0", 0.09), at(0.45, -0.21, "#DFBFA8", 0.1), at(0.78, -0.17, "#DDC2B3", 0.13), at(0.4, 0.22, "#E8C9B6", 0.1), at(0.65, 0.18, "#E6C3B0", 0.1), at(0.14, 0.2, "#F1E0D4", 0.1), at(-0.36, -0.12, "#F2E1D4", 0.08), at(-0.55, -0.22, "#F0DED0", 0.1), at(-0.74, -0.14, "#EAD1C2", 0.1), at(-0.5, 0.22, "#EDD2C2", 0.09), at(-0.7, 0.16, "#F0D4C7", 0.1),
  // cheeks
  at(0.44, 0.38, "#F5E1D6", 0.12), at(0.76, 0.42, "#F6C8BC", 0.24), at(1.02, 0.44, "#EFCCBE", 0.16), at(1.1, 0.66, "#E5CDBE", 0.18), at(0.72, 0.8, "#F0DBCF", 0.18), at(1.0, 0.92, "#E6D1C2", 0.18), at(0.4, 0.6, "#F6E6DC", 0.13), at(-0.52, 0.45, "#FAE8E0", 0.14), at(-0.6, 0.74, "#FBF2EC", 0.18),
  // mouth and chin
  at(0.32, 0.86, "#EEDACD", 0.14), at(-0.02, 0.86, "#F0DED1", 0.12), at(-0.4, 0.9, "#FBF5EF", 0.14), at(0.02, 1.27, "#F4E5D9", 0.1), at(-0.1, 1.42, "#FAF1E8", 0.18), at(0.3, 1.3, "#EEDBCD", 0.16), at(0.5, 1.12, "#EDDBCC", 0.18), at(0.34, 1.48, "#EAD2C1", 0.15),
];
const FACE_OF: GongbiFace = {
  plates: GONGBI, skin: SKIN, seed: 5,
  tints: [
    // the light comes from the far side. The side of the nose: an edge down the bridge, a softer one from the inner corner to the wing
    { plane: [[0.0, 0.04], [-0.08, 0.06], [-0.118, 0.2], [-0.142, 0.35], [-0.172, 0.5], [-0.2, 0.62], [-0.19, 0.7], [-0.14, 0.735], [0.0, 0.76], [0.2, 0.76], [0.23, 0.66], [0.19, 0.55], [0.15, 0.4], [0.09, 0.22], [0.05, 0.1]], soft: 0.028, ...shade("#EBD5C5", "#F2E2D3"), fade: [[[-0.12, 0.5], [0.28, 0.46]], [[-0.1, 0.34], [-0.04, 0.02]]] },
    { plane: [[-0.06, 0.16], [-0.112, 0.2], [-0.138, 0.35], [-0.166, 0.5], [-0.195, 0.6], [-0.16, 0.68], [-0.06, 0.66], [-0.01, 0.5], [-0.02, 0.3]], soft: 0.032, ...shade("#EAC9B2", "#EDD9C9"), fade: [[[-0.13, 0.5], [0.12, 0.46]], [[-0.12, 0.34], [-0.06, 0.08]], [[-0.12, 0.5], [-0.12, 0.74]]] },
    // the near half of the mouth's ground, from the wing down; it stops short at the light of the groove
    { plane: [[0.19, 0.56], [0.25, 0.7], [0.36, 0.86], [0.42, 1.02], [0.2, 1.06], [0.0, 0.96], [-0.06, 0.92], [-0.12, 0.85], [-0.165, 0.77], [-0.1, 0.73], [0.05, 0.7]], soft: 0.06, ...shade("#EAD5C6", "#EFDDCE") },
    { plane: [[-0.06, 0.92], [-0.12, 0.85], [-0.17, 0.765], [-0.13, 0.755], [-0.06, 0.79], [-0.01, 0.86], [-0.02, 0.92]], soft: 0.014, ...shade("#DBB9A2", "#E9D3C1"), fade: [[[-0.14, 0.8], [0.02, 0.88]]] },
    // the far socket, from the edge of the bridge
    { plane: [[-0.36, -0.24], [-0.285, -0.1], [-0.245, 0.0], [-0.23, 0.1], [-0.234, 0.2], [-0.255, 0.31], [-0.3, 0.44], [-0.35, 0.36], [-0.37, 0.2], [-0.38, 0.0], [-0.46, -0.2]], soft: 0.014, ...shade("#EDDAC6", "#F8EFE4"), fade: [[[-0.22, 0.08], [-0.35, 0.1]]] },
    { plane: [[-0.36, -0.22], [-0.28, -0.1], [-0.24, 0.0], [-0.27, 0.06], [-0.34, -0.02], [-0.42, -0.16]], soft: 0.05, ...shade("#EAD3C0", "#F2E1D0") },
    // the shade the lower lip throws, away from the light
    { plane: [[-0.1, 1.2], [0.0, 1.18], [0.1, 1.13], [0.2, 1.05], [0.32, 1.04], [0.38, 1.13], [0.26, 1.23], [0.1, 1.275], [-0.02, 1.24]], soft: 0.05, ...shade("#E6CEBD", "#EEDCCC"), fade: [[[0.02, 1.2], [0.4, 1.12]]] },
    { plane: [[0.14, 1.12], [0.08, 1.15], [0.02, 1.176], [-0.05, 1.19], [-0.11, 1.194], [-0.06, 1.211], [-0.01, 1.226], [0.04, 1.236], [0.09, 1.226], [0.15, 1.18]], soft: 0.014, ...shade("#E0B9A2", "#EDD8C9"), fade: [[[0.0, 1.2], [0.15, 1.17]]] },
    // the side of the nose down to the wing: an edge toward the cheek, nothing farther up, and the crease along that edge
    { plane: [[-0.13, 0.5], [-0.165, 0.6], [-0.15, 0.69], [0.0, 0.71], [0.15, 0.735], [0.262, 0.72], [0.226, 0.64], [0.2, 0.58], [0.172, 0.51], [0.1, 0.44], [0.0, 0.42]], soft: 0.016, ...shade("#E7CBB9", "#ECD6C7"), fade: [[[0.0, 0.57], [0.0, 0.43]], [[0.1, 0.66], [0.1, 0.76]]] },
    { plane: [[0.172, 0.51], [0.2, 0.58], [0.226, 0.64], [0.262, 0.715], [0.22, 0.72], [0.15, 0.68], [0.12, 0.6], [0.13, 0.52]], soft: 0.011, ...shade("#DDB5A2", "#E7CBB9"), fade: [[[0.222, 0.63], [0.175, 0.642]], [[0.24, 0.67], [0.262, 0.73]], [[0.205, 0.6], [0.176, 0.53]]] },
    // the chin takes some warmth from below
    { at: [0.06, 1.485], size: [0.26, 0.06], turn: 8, ...shade("#F4DCC8", "#F5E7DB") },
  ],
  lids: {
    near: [
      { plane: [[0.2, 0.02], [0.25, -0.066], [0.31, -0.116], [0.4, -0.15], [0.5, -0.152], [0.6, -0.13], [0.72, -0.09], [0.72, -0.05], [0.6, -0.08], [0.5, -0.11], [0.4, -0.106], [0.31, -0.07], [0.25, -0.012], [0.21, 0.05]], soft: 0.014, ...shade("#B98A72", "#E3BFA8") },
      { plane: [[0.7, 0.02], [0.64, 0.075], [0.55, 0.12], [0.44, 0.142], [0.32, 0.132], [0.21, 0.106], [0.19, 0.125], [0.26, 0.172], [0.36, 0.212], [0.47, 0.226], [0.57, 0.208], [0.66, 0.158], [0.73, 0.08]], soft: 0.026, ...shade("#E2C6B3", "#EDD9C8") },
      { at: [0.64, 0.1], size: [0.12, 0.035], turn: -32, ...shade("#CCA48A", "#E2C6B0") }, { at: [0.75, 0.0], size: [0.1, 0.04], turn: -12, ...shade("#B4907B", "#DCC2AF") },
      { at: [0.2, -0.17], size: [0.09, 0.09], ...shade("#DFC2A8", "#E8D0BC") },
    ],
    far: [
      { plane: [[-0.35, 0.05], [-0.39, -0.025], [-0.43, -0.08], [-0.48, -0.13], [-0.55, -0.158], [-0.62, -0.158], [-0.69, -0.128], [-0.72, -0.08], [-0.67, -0.09], [-0.62, -0.112], [-0.55, -0.122], [-0.48, -0.104], [-0.42, -0.058], [-0.37, 0.01]], soft: 0.013, ...shade("#C49A82", "#E8C8B3") },
      { plane: [[-0.335, 0.105], [-0.4, 0.125], [-0.5, 0.142], [-0.59, 0.132], [-0.65, 0.09], [-0.69, 0.02], [-0.7, 0.07], [-0.67, 0.14], [-0.6, 0.186], [-0.53, 0.2], [-0.45, 0.188], [-0.38, 0.152]], soft: 0.018, ...shade("#E8CAB6", "#F4E3D4") },
      { at: [-0.65, 0.07], size: [0.07, 0.026], turn: 58, ...shade("#CC9475", "#EAD0BC") },
    ],
  },
  brows: {
    near: { tone: 1, hairs: 0.07, soft: 0.026, top: [[-0.08, -0.262], [0.02, -0.288], [0.12, -0.318], [0.22, -0.338], [0.33, -0.353], [0.44, -0.366], [0.54, -0.371], [0.64, -0.368], [0.74, -0.346], [0.84, -0.311], [0.95, -0.262]], bottom: [[-0.08, -0.212], [0.02, -0.222], [0.12, -0.238], [0.22, -0.25], [0.33, -0.26], [0.44, -0.27], [0.54, -0.282], [0.64, -0.294], [0.74, -0.297], [0.84, -0.281], [0.95, -0.254]], along: t => 0.26 + 0.24 * ss(0, 0.14, t) + 0.5 * ss(0.1, 0.32, t) - 0.12 * ss(0.5, 0.7, t) - 0.42 * ss(0.72, 1, t) },
    far: { tone: 0.94, hairs: 0.07, soft: 0.022, top: [[-0.33, -0.235], [-0.42, -0.285], [-0.5, -0.322], [-0.6, -0.357], [-0.7, -0.385], [-0.79, -0.404]], bottom: [[-0.33, -0.2], [-0.42, -0.224], [-0.5, -0.25], [-0.6, -0.284], [-0.7, -0.314], [-0.79, -0.342]], along: t => 0.16 + 0.84 * ss(0, 0.42, t) - 0.2 * ss(0.8, 1, t) },
  },
  eyes: {
    near: {
      upper: [[0.195, 0.082], [0.212, 0.045], [0.245, -0.01], [0.29, -0.055], [0.34, -0.085], [0.4, -0.104], [0.47, -0.108], [0.54, -0.092], [0.6, -0.06], [0.645, -0.027], [0.68, 0.004]], lower: [[0.195, 0.082], [0.22, 0.084], [0.27, 0.094], [0.33, 0.11], [0.41, 0.118], [0.49, 0.11], [0.56, 0.09], [0.62, 0.058], [0.655, 0.03], [0.68, 0.004]],
      line: [[0.185, 0.094, 0.003], [0.194, 0.076, 0.0072], [0.215, 0.04, 0.0066], [0.25, -0.016, 0.007], [0.3, -0.068, 0.0082], [0.36, -0.1, 0.0105], [0.43, -0.116, 0.015], [0.5, -0.113, 0.0185], [0.56, -0.098, 0.0205], [0.62, -0.073, 0.0215], [0.68, -0.054, 0.0195], [0.74, -0.044, 0.0145], [0.8, -0.043, 0.008], [0.87, -0.054, 0.001]],
      fold: [[0.168, 0.04, 0.001], [0.192, 0.0, 0.004], [0.228, -0.052, 0.006], [0.28, -0.1, 0.0072], [0.345, -0.138, 0.0078], [0.42, -0.158, 0.0075], [0.5, -0.154, 0.0075], [0.6, -0.13, 0.0082], [0.7, -0.096, 0.008], [0.78, -0.076, 0.006], [0.88, -0.066, 0.001]],
      iris: [0.5, -0.008, 0.115, 0.11], lights: [[0.462, -0.056, 0.014, 0.016, 1], [0.583, -0.034, 0.019, 0.021, 0.69]], under: [0.06, 1], foot: 0.0085,
    },
    far: {
      upper: [[-0.338, 0.078], [-0.355, 0.035], [-0.385, -0.02], [-0.42, -0.062], [-0.465, -0.096], [-0.52, -0.114], [-0.575, -0.118], [-0.62, -0.108], [-0.65, -0.082], [-0.672, -0.032]], lower: [[-0.338, 0.078], [-0.36, 0.088], [-0.4, 0.1], [-0.46, 0.118], [-0.52, 0.122], [-0.575, 0.108], [-0.62, 0.076], [-0.65, 0.03], [-0.672, -0.032]],
      line: [[-0.332, 0.092, 0.003], [-0.341, 0.07, 0.007], [-0.362, 0.022, 0.007], [-0.392, -0.028, 0.008], [-0.425, -0.068, 0.0105], [-0.465, -0.102, 0.0135], [-0.52, -0.121, 0.0155], [-0.58, -0.125, 0.0145], [-0.63, -0.115, 0.0145], [-0.675, -0.088, 0.0125], [-0.71, -0.06, 0.009], [-0.745, -0.047, 0.005], [-0.785, -0.05, 0.001]],
      fold: [[-0.356, 0.04, 0.001], [-0.386, -0.02, 0.005], [-0.426, -0.076, 0.0066], [-0.48, -0.128, 0.0075], [-0.55, -0.16, 0.008], [-0.62, -0.163, 0.0078], [-0.68, -0.138, 0.0065], [-0.725, -0.108, 0.004], [-0.755, -0.09, 0.001]],
      iris: [-0.455, -0.002, 0.103, 0.108], lights: [[-0.505, -0.052, 0.013, 0.015, 1], [-0.41, -0.03, 0.02, 0.026, 0.22]], under: [0.1, 1], foot: 0.0085,
    },
  },
  iris: { ink: 0.82, earth: 0.78, cool: 0.02, foot: 0.62, lash: 0.08, rays: 0.14 },
  whites: { tone: { ink: 0.04 }, corner: 0.2, outer: 2 },
  browLine: colour("#7C6152", 0), lidLine: colour("#2a1a12", 0), foldLine: colour("#B8562F", 0), foldGlow: shade("#E9BC9E", "#EFD9C8"), underLine: colour("#B98460", 0),
  mouth: {
    upper: [[0.262, 1.012], [0.225, 1.006], [0.15, 0.994], [0.08, 0.966], [0.02, 0.936], [-0.04, 0.917], [-0.09, 0.917], [-0.13, 0.925], [-0.17, 0.92], [-0.21, 0.914], [-0.24, 0.918], [-0.262, 0.952]],
    parting: [[0.292, 1.004, 0.004], [0.27, 1.01, 0.011], [0.236, 1.015, 0.008], [0.16, 1.013, 0.0038], [0.08, 1.006, 0.004], [0.01, 1.0, 0.0055], [-0.04, 1.014, 0.005], [-0.085, 1.026, 0.0055], [-0.13, 1.026, 0.0055], [-0.17, 1.008, 0.005], [-0.21, 0.988, 0.0065], [-0.255, 0.978, 0.0085], [-0.295, 0.962, 0.008], [-0.318, 0.948, 0.002]],
    lower: [[0.262, 1.012], [0.24, 1.03], [0.19, 1.072], [0.12, 1.126], [0.05, 1.166], [-0.02, 1.184], [-0.09, 1.19], [-0.15, 1.176], [-0.196, 1.138], [-0.226, 1.088], [-0.244, 1.036], [-0.262, 0.985]],
    tone: 0.95, soft: 0.024, near: 0.1, far: 0.08, fall: 0.18, earth: 0.3, ink: 0, bare: 0.86, lights: [[-0.037, 1.07, 0.036, 0.0085, 5, 0.55], [-0.14, 1.06, 0.022, 0.008, -16, 0.62]],
  },
  mouthLine: colour("#3a1710", 0),
  lines: [
    // the tip: faint on the far side, found under it
    { nodes: [[-0.27, 0.36, 0.001], [-0.305, 0.46, 0.002], [-0.328, 0.55, 0.0035], [-0.333, 0.61, 0.0045], [-0.324, 0.652, 0.006], [-0.308, 0.675, 0.0085], [-0.276, 0.702, 0.0055], [-0.22, 0.732, 0.005], [-0.182, 0.747, 0.007], [-0.164, 0.753, 0.005]], tone: colour("#8A5C44", 0), soft: 0.009, along: t => 0.14 + 0.5 * ss(0.3, 0.62, t) + 0.36 * Math.max(Math.exp(-(((t - 0.68) / 0.08) ** 2)), ss(0.88, 1, t)) },
    { nodes: [[0.012, 0.697, 0.004], [-0.02, 0.688, 0.0075], [-0.055, 0.686, 0.0085], [-0.085, 0.694, 0.0085], [-0.106, 0.708, 0.004]], tone: colour("#7E5038", 0), soft: 0.01, along: t => 0.62 + 0.38 * t },
  ],
  outline: { tone: colour("#8C604A", 0), half: 0.0038, far: t => 0.3 + 0.4 * ss(0, 0.12, t) - 0.34 * ss(0.3, 0.6, t) + 0.3 * ss(0.78, 0.95, t), jaw: t => (0.75 - 0.4 * ss(0.3, 0.7, t)) * ss(1, 0.88, t) },
};

/** 梅花妝: the plum blossom a princess is said to have worn on her brow. Five wet touches of cinnabar, no two as full, smaller than the iris. */
function drawHuadian(f: InkRisoPen, head: InkHead) {
  const h = gongbiHand(f, head, GONGBI, 31), [x, y] = [-0.15, -0.47];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 360 + 8 + [3, -5, 3, -2, 5][i], r = (a * Math.PI) / 180, k = [1, 0.9, 1.04, 0.94, 0.98][i], u = (d: number, across: number): P2 => [x + Math.sin(r) * d * 0.9 + Math.cos(r) * across * 0.9, y - Math.cos(r) * d + Math.sin(r) * across];
    paintGongbiLock(h, { outline: [u(0.008, 0), u(0.02, 0.014 * k), u(0.038 * k, 0.021 * k), u(0.051 * k, 0.014 * k), u(0.049 * k, 0), u(0.051 * k, -0.014 * k), u(0.038 * k, -0.021 * k), u(0.02, -0.014 * k)], places: [{ at: u(0.01, 0), mix: { warm: 0.98, earth: 0.16, ink: 0.06 }, reach: 0.016 }, { at: u(0.052, 0), mix: { warm: [0.62, 0.7, 0.58, 0.66, 0.6][i] }, reach: 0.026 }], cover: 0, soft: 0.009, wash: { mottle: 0.2, cloud: 0.02, wander: 0.001, rim: 0.12, rimWidth: 0.006 } }, 2100 + i);
  }
  h.stroke({ nodes: [[x - 0.002, y, 0.004], [x + 0.002, y, 0.004]], tone: colour("#d9a441", 0), soft: 0.006 });
}
function drawFace(f: InkRisoPen, head: InkHead, open = 1) {
  paintGongbiFace(f, head, FACE_OF, open);
  drawHuadian(f, head);
}
// ---- hair -----------------------------------------------------------------------------------------------------------------------
// 鬟: a girl's hair, not yet all bound up. From one short part two soft masses leave for the temples; the near one bows over the brow and
// goes back over the top of the ear; a coil stands on the crown, a hollow loop hangs behind it, and one tress is let down. Places are read
// in the frame portraits are measured in: the irises level, 1 = the distance between them, x toward the near side.
type Run = readonly P2[];
type Lock = readonly (readonly [number, number, number])[];
const lv = (q: Run): P2[] => q.map(([x, y]) => HEAD.level(x, y));
const guides = (list: readonly (readonly [s: number, path: Run])[]) => inkGuideSheet(HEAD, list.map(([s, path]) => ({ s, path: lv(path) })));
/** A place read in the head's own frame, on the page. */
const onPage = (x: number, y: number): P2 => { const q = HEAD.level(x, y); return [FACE.x - FACE.scale * q[0], FACE.y + FACE.scale * q[1]]; };
/** The far lock: from the part down along the far temple. The first guide is the head's outline. */
const FARSIDE = guides([
  [0, [[-0.17, -1.7], [-0.46, -1.87], [-0.78, -1.66], [-0.99, -1.32], [-1.09, -0.95], [-1.03, -0.66], [-0.86, -0.46]]],
  [0.5, [[-0.2, -1.5], [-0.46, -1.53], [-0.73, -1.36], [-0.89, -1.08], [-0.94, -0.8], [-0.88, -0.58], [-0.82, -0.44]]],
  [1, [[-0.16, -1.27], [-0.34, -1.23], [-0.52, -1.15], [-0.65, -1.01], [-0.74, -0.82], [-0.79, -0.6], [-0.8, -0.42]]],
]);
/** The crown: from the part back over the top to the foot of the coil. The first guide is the outline. */
const CROWN = guides([
  [0, [[-0.6, -1.88], [-0.5, -2.1], [-0.28, -2.27], [0, -2.41], [0.32, -2.5], [0.68, -2.52], [1.02, -2.42], [1.34, -2.26]]],
  [0.5, [[-0.24, -1.7], [-0.2, -1.94], [-0.03, -2.11], [0.24, -2.23], [0.56, -2.3], [0.9, -2.28], [1.16, -2.26], [1.36, -2.22]]],
  [1, [[-0.22, -1.44], [-0.1, -1.66], [0.14, -1.78], [0.42, -1.87], [0.72, -1.97], [1, -2.08], [1.2, -2.14], [1.36, -2.2]]],
]);
/** The near mass: from the part along the hairline and over the top of the ear, rolled under there, and up to the foot of the coil. */
const NEARSIDE = guides([
  [0, [[-0.22, -1.42], [-0.08, -1.64], [0.14, -1.76], [0.42, -1.85], [0.72, -1.94], [0.98, -2.04], [1.2, -2.12], [1.36, -2.2]]],
  [0.22, [[-0.2, -1.36], [0.02, -1.55], [0.34, -1.62], [0.68, -1.67], [1, -1.75], [1.28, -1.87], [1.46, -2.02], [1.52, -2.16]]],
  [0.46, [[-0.17, -1.31], [0.1, -1.4], [0.48, -1.36], [0.88, -1.29], [1.28, -1.31], [1.6, -1.48], [1.74, -1.76], [1.66, -2.08]]],
  [0.74, [[-0.14, -1.28], [0.16, -1.27], [0.56, -1.08], [0.94, -0.8], [1.36, -0.62], [1.8, -0.74], [2.04, -1.14], [1.8, -1.94]]],
  [1, [[-0.12, -1.25], [0.22, -1.18], [0.62, -0.95], [0.95, -0.58], [1.24, -0.16], [1.52, -0.04], [1.86, -0.14], [2.16, -0.44], [2.3, -0.92], [2.14, -1.42], [1.84, -1.92]]],
]);
/** The hank of the coil, wound from its foot over the top and down behind. The first guide is the outline. */
const WOUND = guides([
  [0, [[0.78, -2.36], [0.88, -2.6], [1.08, -2.83], [1.34, -2.97], [1.62, -2.95], [1.83, -2.78], [1.89, -2.52], [1.82, -2.24], [1.7, -2.06]]],
  [0.36, [[0.82, -2.35], [0.95, -2.56], [1.14, -2.74], [1.38, -2.84], [1.6, -2.8], [1.74, -2.64], [1.77, -2.42], [1.7, -2.2], [1.6, -2.06]]],
  [0.7, [[0.86, -2.34], [1.02, -2.52], [1.2, -2.64], [1.4, -2.69], [1.56, -2.62], [1.64, -2.46], [1.63, -2.3], [1.56, -2.16], [1.5, -2.08]]],
  [1, [[0.9, -2.32], [1.06, -2.44], [1.22, -2.52], [1.36, -2.52], [1.46, -2.44], [1.5, -2.32], [1.48, -2.22], [1.44, -2.14], [1.4, -2.1]]],
]);
/** Behind the ear: a thin fall from under the roll to the cord at the nape. The first guide is the outline. */
const NAPE = guides([
  [0, [[2.26, -0.56], [2.27, -0.26], [2.2, 0.06], [2.07, 0.38], [1.92, 0.66], [1.79, 0.88], [1.72, 1.06]]],
  [0.5, [[2.04, -0.34], [2.05, -0.08], [2.01, 0.2], [1.92, 0.48], [1.81, 0.72], [1.72, 0.9], [1.67, 1.07]]],
  [1, [[1.8, -0.18], [1.83, 0.06], [1.82, 0.3], [1.76, 0.54], [1.69, 0.74], [1.64, 0.92], [1.61, 1.08]]],
]);
/** The head and its hair, without the coil and the loop: what hides a scene behind the figure in a film. On the page. */
const COVER: P2[] = ([[-0.61, 0.5], [-0.65, 0.2], [-0.67, -0.1], [-0.72, -0.4], [-0.86, -0.52], [-0.98, -0.68], [-1.04, -0.88], [-1.03, -1.12], [-0.95, -1.37], [-0.83, -1.59], [-0.69, -1.81], [-0.52, -2.02], [-0.32, -2.2], [-0.08, -2.35], [0.18, -2.45], [0.46, -2.5], [0.76, -2.47], [1.04, -2.37], [1.38, -2.22], [1.6, -2.1], [1.77, -1.95], [1.92, -1.74], [2.07, -1.48], [2.2, -1.2], [2.27, -0.94], [2.24, -0.68], [2.2, -0.3], [2.14, 0.06], [2.03, 0.38], [1.9, 0.66], [1.78, 0.88], [1.71, 1.06], [1.64, 1.06], [1.68, 0.92], [1.73, 0.74], [1.8, 0.54], [1.86, 0.36], [1.9, 0.12], [1.9, -0.08], [1.82, -0.08], [1.76, 0.1], [1.67, 0.29], [1.57, 0.43], [1.46, 0.54], [1.36, 0.6], [1.2, 0.84], [1.06, 1.02], [0.64, 1.36], [0.2, 1.54], [0, 1.53], [-0.14, 1.4], [-0.3, 1.1], [-0.46, 0.8]] as readonly P2[]).map(([x, y]) => onPage(x, y));
const hues = gongbiHues(colour);
const HAIRLINE_NEAR: Run = [[-0.13, -1.22], [0.06, -1.18], [0.25, -1.13], [0.45, -1.04], [0.63, -0.91], [0.8, -0.73], [0.95, -0.55], [1.08, -0.36], [1.2, -0.18]], HAIRLINE_FAR: Run = [[-0.21, -1.2], [-0.36, -1.19], [-0.5, -1.12], [-0.62, -1.0], [-0.7, -0.84], [-0.75, -0.66], [-0.775, -0.46]];
const DARK = colour("#1d1a18", 0), BROWN = colour("#4a3d33", 0), STRAND = colour("#5b5047", 0), ROOTS = colour("#4d4038", 0);
/** The skin of the head where the hair is parted. */
const SCALP: GongbiLock = {
  outline: [[-0.19, -1.14], [-0.1, -1.24], [0, -1.38], [0.06, -1.54], [0.18, -1.68], [0.2, -1.8], [0.1, -1.92], [-0.06, -1.93], [-0.2, -1.82], [-0.3, -1.66], [-0.37, -1.48], [-0.36, -1.3], [-0.28, -1.19]],
  places: hues([[-0.18, -1.2, "#d2b4a1"], [-0.2, -1.4, "#c6a994"], [-0.22, -1.6, "#b59d8b"], [-0.04, -1.8, "#b3a293"]]), soft: 0.02, lost: [{ along: [[-0.2, -1.14]], reach: 0.14, soft: 0.12 }], wash: { wander: 0.016, wave: 0.07, mottle: 0.2, cloud: 0.1 },
};
const CROWN_LOCK: GongbiLock = {
  outline: [[-0.22, -1.68], [-0.34, -1.6], [-0.5, -1.56], [-0.7, -1.6], [-0.83, -1.68], [-0.7, -1.87], [-0.53, -2.06], [-0.34, -2.23], [-0.1, -2.38], [0.18, -2.48], [0.46, -2.53], [0.76, -2.5], [1.04, -2.4], [1.34, -2.26], [1.36, -2.0], [1, -1.86], [0.7, -1.76], [0.36, -1.66], [0.14, -1.62], [0.04, -1.7], [-0.04, -1.83], [-0.14, -1.76]],
  places: hues([[0.02, -2.14, "#c5b7ab"], [0.4, -2.26, "#b3a599"], [0.85, -2.28, "#8b7f73"], [1.24, -2.2, "#564b42", 0.2], [-0.32, -2.06, "#afa399"], [-0.5, -1.86, "#948981"], [-0.7, -1.72, "#847a73"], [-0.12, -1.84, "#c1b1a5", 0.14], [0.26, -1.9, "#b0a095"], [0.66, -2.0, "#74695f"], [0.4, -2.46, "#9a8f82"], [0.9, -1.96, "#655c53"]]),
  soft: 0.014, lost: [{ along: [[0.14, -1.6], [0.6, -1.7], [1.3, -1.96]], reach: 0.1, soft: 0.1 }, { along: [[-0.34, -1.6], [-0.7, -1.6]], reach: 0.1, soft: 0.1 }], wash: { wander: 0.007, mottle: 0.16, cloud: 0.3, rim: 0.2, rimWidth: 0.03 },
};
const FAR_LOCK: GongbiLock = {
  outline: [[-0.25, -1.23], [-0.36, -1.2], [-0.5, -1.13], [-0.62, -1.02], [-0.7, -0.86], [-0.755, -0.66], [-0.78, -0.48], [-0.785, -0.36], [-0.85, -0.42], [-0.94, -0.53], [-1.02, -0.68], [-1.08, -0.9], [-1.07, -1.14], [-0.99, -1.4], [-0.88, -1.62], [-0.77, -1.78], [-0.66, -1.92], [-0.56, -1.84], [-0.46, -1.78], [-0.38, -1.72], [-0.3, -1.66], [-0.35, -1.54], [-0.38, -1.42], [-0.35, -1.32]],
  places: hues([[-0.36, -1.66, "#4b423a", 0.14], [-0.4, -1.5, "#635950", 0.14], [-0.55, -1.62, "#736c65"], [-0.62, -1.4, "#73736f"], [-0.88, -1.45, "#80786c"], [-0.6, -1.8, "#8d857c", 0.16], [-0.88, -1.1, "#8a7d6c"], [-0.68, -1.18, "#7a6f61", 0.16], [-0.92, -0.74, "#8a7864"], [-0.38, -1.27, "#a58c77", 0.12], [-0.52, -1.14, "#c0a48e", 0.1], [-0.68, -0.94, "#b59a83", 0.1], [-0.76, -0.66, "#6b5a4a", 0.07], [-0.8, -0.44, "#7a6a5a", 0.12]]),
  soft: 0.012, lost: [{ along: [[-0.26, -1.22], [-0.5, -1.13], [-0.64, -0.98], [-0.7, -0.84]], reach: 0.1, soft: 0.17 }, { along: [[-0.8, -0.36], [-0.9, -0.48]], reach: 0.1, soft: 0.07 }, { along: [[-0.5, -1.82], [-0.6, -1.9]], reach: 0.07, soft: 0.1 }], wash: { wander: 0.011, wave: 0.16, mottle: 0.2, cloud: 0.2, rim: 0.2, rimWidth: 0.02 },
};
/** A second wash on the far lock, where one fold of it lies on another. */
const FAR_FOLDS: readonly GongbiLock[] = [
  { outline: [[-0.3, -1.66], [-0.42, -1.86], [-0.56, -1.88], [-0.5, -1.7], [-0.46, -1.56], [-0.4, -1.4], [-0.35, -1.48]], places: [{ at: [-0.38, -1.6], mix: { ink: 0.3, earth: 0.06 } }, { at: [-0.52, -1.84], mix: { ink: 0.04 } }], cover: 0, soft: 0.02, lost: [{ along: [[-0.58, -1.9]], reach: 0.14, soft: 0.14 }], wash: { mottle: 0.3, cloud: 0.08, rim: 0.2 } },
  { outline: [[-0.36, -1.28], [-0.56, -1.34], [-0.78, -1.3], [-0.98, -1.16], [-1.06, -0.96], [-1.02, -0.72], [-0.92, -0.54], [-0.86, -0.72], [-0.82, -0.94], [-0.7, -1.1], [-0.54, -1.2]], places: [{ at: [-0.6, -1.26], mix: { ink: 0.05, earth: 0.06 } }, { at: [-0.98, -1.0], mix: { ink: 0.14, earth: 0.06 } }, { at: [-0.94, -0.64], mix: { ink: 0.16, earth: 0.06 } }], cover: 0, soft: 0.03, lost: [{ along: [[-0.4, -1.3], [-0.7, -1.32]], reach: 0.12, soft: 0.1 }], wash: { mottle: 0.2, cloud: 0.12, rim: 0.1 } },
];
const NEAR_UPPER: GongbiLock = {
  outline: [[-0.25, -1.36], [-0.2, -1.5], [-0.1, -1.62], [0.06, -1.71], [0.28, -1.77], [0.5, -1.82], [0.76, -1.92], [1, -2.03], [1.22, -2.14], [1.38, -2.24], [1.62, -2.1], [1.72, -1.9], [1.66, -1.7], [1.3, -1.52], [0.9, -1.44], [0.5, -1.4], [0.2, -1.38], [0.02, -1.36], [-0.1, -1.36]],
  places: hues([[-0.2, -1.4, "#3d362f", 0.1], [-0.02, -1.48, "#524b44", 0.12], [0.1, -1.6, "#615b55", 0.14], [0.36, -1.66, "#67645f"], [0.5, -1.56, "#4c4742", 0.14], [0.66, -1.74, "#706f6d"], [0.86, -1.82, "#6c6863", 0.14], [1.06, -1.88, "#5f5a54", 0.14], [1.02, -1.66, "#6b6a69", 0.14], [1.3, -1.72, "#8f8d8a"], [1.5, -2.06, "#4d4640"], [1.3, -2.1, "#473f38", 0.14], [1.5, -1.8, "#83817e", 0.16]]),
  soft: 0.01, lost: [{ along: [[0.1, -1.37], [0.6, -1.4], [1.2, -1.48], [1.66, -1.66]], reach: 0.12, soft: 0.2 }, { along: [[0.9, -1.98], [1.3, -2.18]], reach: 0.16, soft: 0.05 }], wash: { wander: 0.004, mottle: 0.2, cloud: 0.2, rim: 0.2, rimWidth: 0.016 },
};
const NEAR_LOWER: GongbiLock = {
  outline: [[-0.15, -1.26], [0.04, -1.22], [0.25, -1.16], [0.45, -1.07], [0.63, -0.94], [0.8, -0.76], [0.95, -0.58], [1.09, -0.38], [1.2, -0.2], [1.29, -0.06], [1.46, -0.03], [1.64, -0.05], [1.84, -0.12], [2.03, -0.24], [2.19, -0.42], [2.29, -0.68], [2.31, -0.94], [2.23, -1.22], [2.1, -1.5], [1.95, -1.76], [1.8, -1.98], [1.66, -2.1], [1.46, -1.9], [1.2, -1.66], [0.9, -1.54], [0.62, -1.52], [0.36, -1.5], [0.18, -1.45], [0, -1.36]],
  places: hues([[-0.06, -1.28, "#3a322c", 0.1], [0.24, -1.36, "#24211f", 0.16], [0.6, -1.34, "#1b1917"], [0.9, -1.2, "#191816"], [1.16, -0.96, "#221f1c"], [1.42, -0.84, "#38322c"], [1.5, -0.6, "#332d27"], [1.26, -0.42, "#302922", 0.16], [0.2, -1.2, "#5a4c3f", 0.1], [0.48, -1.08, "#55473b", 0.1], [0.82, -0.8, "#6b594a", 0.1], [1.06, -0.46, "#63523f", 0.1], [2.12, -0.9, "#54504c"], [2.2, -1.2, "#6b6a6a"], [1.9, -1.5, "#7d7f82"], [1.7, -1.8, "#57534e"], [1.6, -1.2, "#2a2826"], [1.9, -0.4, "#36322e"], [1.1, -1.5, "#34302d"], [1.5, -1.6, "#57585a"], [1.66, -0.12, "#2b2723", 0.14]]),
  soft: 0.011, lost: [{ along: [[0.02, -1.22], [0.25, -1.16], [0.63, -0.94], [0.95, -0.58], [1.16, -0.28]], reach: 0.12, soft: 0.2 }, { along: [[0.5, -1.51], [0.9, -1.53], [1.2, -1.62], [1.5, -1.86]], reach: 0.12, soft: 0.2 }], wash: { wander: 0.004, mottle: 0.16, cloud: 0.07, rim: 0.14, rimWidth: 0.02 },
};
/** The warm dusk of hair over skin at a hairline. */
const DUSK = (line: Run, wide: number, mix: GongbiMix, soft: number): GongbiLock => ({ outline: [...line.map((p, i) => [p[0], p[1] + wide * Math.min(1, i / 2)] as const), ...[...line].reverse().map(p => [p[0], p[1] - 0.16] as const)], places: [{ at: line[0], mix }, { at: line[line.length - 1], mix }], cover: 0, soft, wash: { mottle: 0.2, cloud: 0.2, rim: 0, wander: 0.01 } });
const EAR_OF: GongbiEar = {
  plates: GONGBI, seed: 9,
  skin: [at(1.86, -0.1, "#E8BA9E", 0.12), at(1.8, 0.2, "#E9BDA2", 0.12), at(1.68, 0.4, "#EAC3AA", 0.12), at(1.52, 0.52, "#E4BDA4", 0.1), at(1.42, 0.44, "#E9C8B2", 0.12), at(1.46, 0.14, "#DDB394", 0.12), at(1.66, 0.1, "#DDAA88", 0.1), at(1.6, -0.14, "#BD8F70", 0.14), at(1.8, -0.24, "#CFA283", 0.12)],
  valley: { earth: 0.3, warm: 0.2 }, bowl: { earth: 0.34, warm: 0.12, ink: 0.08 }, deep: { earth: 0.36, warm: 0.26, ink: 0.3 }, line: colour("#8E5C44", 0), front: 0.86,
};
/** The fall behind the ear. */
const NAPE_LOCK: GongbiLock = {
  outline: [[2.24, -0.62], [2.27, -0.26], [2.2, 0.06], [2.07, 0.38], [1.92, 0.66], [1.79, 0.88], [1.725, 1.05], [1.6, 1.05], [1.64, 0.92], [1.69, 0.74], [1.76, 0.54], [1.82, 0.3], [1.83, 0.06], [1.8, -0.2], [1.9, -0.4], [2.06, -0.56]],
  places: hues([[2.1, -0.4, "#2b2622", 0.16], [1.9, -0.16, "#37302a", 0.14], [2.2, -0.1, "#5d544b", 0.14], [2.04, 0.14, "#857a6d", 0.14], [1.9, 0.2, "#6e6358", 0.12], [2.0, 0.46, "#7b7063", 0.12], [1.86, 0.62, "#5f554b", 0.12], [1.72, 0.86, "#3d352e", 0.12], [1.66, 1.02, "#241f1c", 0.1]]), soft: 0.014, wash: { mottle: 0.24, cloud: 0.1, rim: 0.24, rimWidth: 0.02, wander: 0.004 },
};
/** The two masses, the fall behind the ear, and the ear. */
function drawSides(f: InkRisoPen) {
  const h = gongbiHand(f, HEAD, GONGBI, 5);
  const line = (path: Run, half: number, tone: GongbiMix, strength = 1, soft = 0.005, root = 0.15, tip = 0) => paintGongbiHair(h, { path, half, tone, soft, root, tip, along: () => strength }), light = (path: Run, half: number, amount: number, soft = 0.006) => liftGongbiHair(h, { path, half, amount, soft, root: 0 });
  // ---- behind the ear
  paintGongbiLock(h, NAPE_LOCK, 10);
  paintGongbiFlow(h, HEAD, NAPE, { n: 9, s: [0.04, 0.98], from: [0, 0.2], length: [0.6, 0.9], half: [0.005, 0.014], soft: [0.01, 0.02], ink: [0.3, 0.7], tone: colour("#29231f", 0), drift: 0.06, seed: 51 });
  paintGongbiFlow(h, HEAD, NAPE, { n: 6, s: [0.06, 0.9], from: [0.16, 0.4], length: [0.3, 0.5], half: [0.004, 0.011], soft: [0.01, 0.018], ink: [0.2, 0.44], drift: 0.05, seed: 52 });
  for (const [path, half, v] of [[[[2.26, -0.3], [2.2, 0.06], [2.07, 0.39], [1.92, 0.67], [1.78, 0.9], [1.71, 1.04]], 0.005, 0.7], [[[1.84, -0.1], [1.83, 0.24], [1.77, 0.52], [1.69, 0.76], [1.62, 1.0]], 0.005, 0.8], [[[2.06, -0.2], [2.04, 0.12], [1.95, 0.44], [1.83, 0.72], [1.7, 1]], 0.006, 0.7]] as readonly (readonly [Run, number, number])[]) line(path, half, DARK, v);
  paintGongbiEar(f, HEAD, EAR_OF);
  // ---- the parting, the crown and the far lock, thin: they lie against the light
  paintGongbiLock(h, SCALP, 11);
  paintGongbiLock(h, CROWN_LOCK, 13);
  paintGongbiFlow(h, HEAD, CROWN, { n: 9, s: [0.2, 0.94], from: [0.04, 0.3], length: [0.5, 0.9], half: [0.006, 0.016], soft: [0.014, 0.03], ink: [0.12, 0.3], tone: colour("#4f4338", 0), drift: 0.1, seed: 21 });
  paintGongbiFlow(h, HEAD, CROWN, { n: 7, s: [0.1, 0.9], from: [0.1, 0.4], length: [0.3, 0.6], half: [0.008, 0.02], soft: [0.02, 0.04], ink: [0.12, 0.3], drift: 0.08, seed: 22 });
  paintGongbiLock(h, DUSK(HAIRLINE_FAR, 0.05, shade("#D2B094", "#EAD6C3"), 0.09), 37);
  paintGongbiLock(h, FAR_LOCK, 14); FAR_FOLDS.forEach((q, i) => paintGongbiLock(h, q, 34 + i));
  paintGongbiFlow(h, HEAD, FARSIDE, { n: 8, s: [0.08, 0.96], from: [0, 0.3], length: [0.4, 0.8], half: [0.004, 0.012], soft: [0.01, 0.024], ink: [0.12, 0.34], tone: colour("#3f352d", 0), drift: 0.06, seed: 23 });
  paintGongbiFlow(h, HEAD, FARSIDE, { n: 5, s: [0.1, 0.8], from: [0.1, 0.5], length: [0.2, 0.5], half: [0.004, 0.012], soft: [0.012, 0.024], ink: [0.14, 0.34], drift: 0.06, seed: 24 });
  // ---- near: blue where the light falls on the round, black where it turns in behind the brow
  paintGongbiLock(h, NEAR_UPPER, 15);
  paintGongbiFlow(h, HEAD, NEARSIDE, { n: 8, s: [0.02, 0.3], from: [0, 0.3], length: [0.4, 0.9], half: [0.005, 0.014], soft: [0.012, 0.028], ink: [0.14, 0.4], tone: colour("#2c2825", 0), drift: 0.06, seed: 25 });
  paintGongbiFlow(h, HEAD, NEARSIDE, { n: 6, s: [0.02, 0.26], from: [0.06, 0.5], length: [0.2, 0.5], half: [0.006, 0.016], soft: [0.016, 0.03], ink: [0.12, 0.26], drift: 0.06, seed: 26 });
  // before the ear: what is brushed back over the top of it
  for (const [path, half, v] of [[[[1.1, -0.4], [1.2, -0.16], [1.32, 0], [1.46, 0.08], [1.62, 0.1]], 0.05, 0.7], [[[1.18, -0.3], [1.3, -0.08], [1.46, 0.02], [1.64, 0.02], [1.8, -0.04]], 0.05, 0.8], [[[1.12, -0.3], [1.2, -0.06], [1.27, 0.14], [1.33, 0.34], [1.36, 0.52]], 0.03, 0.6], [[[1.16, -0.2], [1.28, 0.02], [1.4, 0.16], [1.52, 0.22]], 0.02, 0.6], [[[1.08, -0.3], [1.12, 0], [1.14, 0.3], [1.1, 0.62]], 0.008, 0.6]] as readonly (readonly [Run, number, number])[]) line(path, half, STRAND, v, 0.02, 0.7);
  paintGongbiLock(h, DUSK(HAIRLINE_NEAR, 0.1, shade("#CBA88C", "#EAD4C0"), 0.12), 38);
  paintGongbiLock(h, NEAR_LOWER, 16);
  paintGongbiFlow(h, HEAD, NEARSIDE, { n: 8, s: [0.4, 0.98], from: [0, 0.3], length: [0.2, 0.4], half: [0.006, 0.016], soft: [0.02, 0.04], ink: [0.1, 0.26], tone: DARK, drift: 0.08, seed: 27 });
  paintGongbiFlow(h, HEAD, NEARSIDE, { n: 9, s: [0.5, 0.96], from: [0.2, 0.6], length: [0.2, 0.34], half: [0.006, 0.016], soft: [0.02, 0.04], ink: [0.04, 0.12], drift: 0.1, seed: 28 });
  // ---- roots
  paintGongbiDown(h, { line: HAIRLINE_NEAR, inside: -1, n: 34, length: [0.24, 0.5], lean: [1, 10], root: [0.03, 0.08], half: [0.002, 0.006], tone: ROOTS, ink: [0.16, 0.5], soft: 0.01, seed: 41 });
  paintGongbiDown(h, { line: HAIRLINE_FAR, inside: 1, n: 24, length: [0.16, 0.34], lean: [1, 12], root: [0.03, 0.07], half: [0.002, 0.005], tone: ROOTS, ink: [0.14, 0.4], soft: 0.01, seed: 42 });
  paintGongbiDown(h, { line: [[-0.2, -1.16], [-0.1, -1.18], [0.06, -1.16], [0.22, -1.11]], inside: -1, n: 9, length: [0.12, 0.26], lean: [8, 30], root: [0.02, 0.06], half: [0.0018, 0.0034], tone: ROOTS, ink: [0.16, 0.44], soft: 0.007, seed: 43 });
  paintGongbiDown(h, { line: [[-0.18, -1.16], [-0.28, -1.18], [-0.42, -1.14], [-0.52, -1.08]], inside: 1, n: 8, length: [0.12, 0.24], lean: [8, 30], root: [0.02, 0.06], half: [0.0018, 0.0034], tone: ROOTS, ink: [0.16, 0.44], soft: 0.007, seed: 44 });
  // ---- lines: where one lock lies on another, and the light beside them
  for (const [path, half, v, soft, tone] of [
    [[[-0.25, -1.35], [-0.2, -1.5], [-0.08, -1.63], [0.08, -1.71], [0.3, -1.765], [0.56, -1.8]], 0.008, 0.9, 0.005, DARK], [[[-0.13, -1.265], [0.02, -1.37], [0.2, -1.45], [0.4, -1.49], [0.6, -1.49]], 0.009, 1, 0.005, DARK], [[[-0.13, -1.265], [-0.02, -1.34], [0.14, -1.4]], 0.016, 0.8, 0.012, DARK],
    [[[1.38, -2.24], [1.1, -2.1], [0.76, -1.95], [0.46, -1.85], [0.2, -1.77], [0.02, -1.73]], 0.008, 0.62, 0.008, BROWN], [[[1.34, -2.18], [1.06, -2.0], [0.82, -1.88], [0.6, -1.8], [0.36, -1.76]], 0.005, 0.5, 0.007, BROWN], [[[1.4, -2.24], [1.16, -2.24], [0.86, -2.16], [0.56, -2.0], [0.3, -1.86], [0.1, -1.78]], 0.01, 0.34, 0.014, BROWN],
    [[[1.44, -2.22], [1.64, -2.1], [1.88, -1.84], [2.08, -1.5], [2.22, -1.2], [2.32, -0.92], [2.42, -0.72], [2.56, -0.52]], 0.009, 0.84, 0.006, DARK], [[[2.22, -0.46], [2.06, -0.27], [1.86, -0.13], [1.66, -0.06], [1.46, -0.04]], 0.007, 0.7, 0.008, DARK],
    [[[-0.14, -2.37], [-0.26, -2.18], [-0.31, -1.98], [-0.28, -1.8]], 0.004, 0.6, 0.006, BROWN], [[[-0.66, -1.88], [-0.86, -1.64], [-1, -1.38], [-1.085, -1.06], [-1.07, -0.8], [-1, -0.62]], 0.006, 0.6, 0.007, BROWN], [[[-0.5, -1.13], [-0.64, -1.0], [-0.72, -0.82], [-0.77, -0.6], [-0.785, -0.38], [-0.79, -0.2]], 0.008, 0.86, 0.006, DARK], [[[-0.86, -1.04], [-0.96, -0.86], [-0.96, -0.66], [-0.88, -0.5], [-0.8, -0.42]], 0.005, 0.5, 0.008, BROWN],
    [[[-0.05, -1.21], [0.24, -1.2], [0.44, -1.14], [0.7, -0.96], [0.94, -0.72]], 0.005, 0.7, 0.006, DARK],
    [[[2.28, -0.56], [2.12, -0.36], [1.9, -0.22], [1.66, -0.14], [1.4, -0.14], [1.24, -0.22]], 0.012, 0.8, 0.016, DARK], [[[2.2, -0.66], [2.04, -0.46], [1.84, -0.33], [1.6, -0.26], [1.4, -0.28]], 0.008, 0.6, 0.014, DARK], [[[2.24, -0.4], [2.0, -0.2], [1.8, -0.1], [1.56, -0.05]], 0.006, 0.8, 0.008, DARK],
  ] as readonly (readonly [Run, number, number, number, GongbiMix])[]) line(path, half, tone, v, soft);
  for (const [path, half, v, soft] of [
    [[[1.54, -1.9], [1.34, -1.84], [1.14, -1.77], [0.95, -1.72]], 0.0055, 0.62, 0.006], [[[1.6, -1.8], [1.4, -1.65], [1.18, -1.54], [0.93, -1.47]], 0.006, 0.6, 0.006], [[[0.36, -1.52], [0.2, -1.48], [0.04, -1.4], [-0.1, -1.3]], 0.007, 0.86, 0.004], [[[0, -1.56], [-0.06, -1.5], [-0.1, -1.4]], 0.006, 0.6, 0.006],
    [[[0.04, -1.72], [-0.1, -1.65], [-0.2, -1.54], [-0.25, -1.4]], 0.006, 0.8, 0.005], [[[-0.06, -2.38], [-0.2, -2.22], [-0.27, -2.05], [-0.27, -1.88]], 0.015, 0.62, 0.008], [[[-0.56, -1.31], [-0.7, -1.33], [-0.84, -1.32], [-0.97, -1.27]], 0.008, 0.5, 0.008], [[[1.38, -2.3], [1.22, -2.36], [1.04, -2.42]], 0.008, 0.76, 0.005],
    [[[0.36, -1.2], [0.56, -1.12], [0.78, -0.98], [1, -0.78]], 0.005, 0.5, 0.005], [[[2.3, -0.7], [2.2, -0.48], [2.04, -0.3], [1.86, -0.19]], 0.016, 0.6, 0.012], [[[2.24, -0.5], [2.06, -0.31], [1.86, -0.19], [1.6, -0.12]], 0.006, 0.4, 0.008], [[[2.1, -0.48], [1.9, -0.32], [1.66, -0.22], [1.42, -0.22]], 0.005, 0.26, 0.01], [[[-0.74, -0.62], [-0.755, -0.5], [-0.765, -0.36]], 0.006, 0.6, 0.005],
  ] as readonly (readonly [Run, number, number, number])[]) light(path, half, v, soft);
}
/** 髻: the coil on her crown, one hank wound before the other: lit on the round, dark at the foot and where one goes in under the other. */
const COIL: readonly GongbiLock[] = [
  { outline: [[1, -2.36], [0.76, -2.36], [0.54, -2.46], [0.44, -2.64], [0.46, -2.84], [0.6, -3.0], [0.84, -3.1], [1.1, -3.1], [1.32, -3.0], [1.36, -2.8], [1.24, -2.56]], places: hues([[0.56, -2.72, "#978a7a", 0.14], [0.72, -2.94, "#aa9d8c", 0.16], [1.0, -3.06, "#9c8f7f", 0.16], [1.28, -2.98, "#6f6458", 0.14], [0.84, -2.74, "#7d7165", 0.14], [1.02, -2.84, "#5b5147", 0.14], [0.72, -2.46, "#4b4239", 0.14], [1.0, -2.5, "#352e28", 0.18], [1.2, -2.7, "#39322b", 0.16]]), soft: 0.014, wash: { mottle: 0.28, cloud: 0.09, rim: 0.26, rimWidth: 0.022, wander: 0.006 } },
  { outline: [[0.76, -2.35], [0.82, -2.54], [0.96, -2.74], [1.16, -2.92], [1.42, -3.02], [1.68, -2.98], [1.87, -2.82], [1.94, -2.58], [1.89, -2.34], [1.78, -2.12], [1.62, -2.02], [1.4, -2.12], [1.06, -2.28]], places: hues([[0.94, -2.64, "#75695d", 0.12], [1.18, -2.84, "#a19484", 0.16], [1.46, -2.94, "#b0a392", 0.16], [1.72, -2.84, "#988b7b", 0.14], [1.86, -2.58, "#867a6c", 0.14], [1.8, -2.32, "#5f554b", 0.14], [1.64, -2.12, "#383029", 0.16], [1.36, -2.2, "#2c2621", 0.18], [1.06, -2.34, "#332c26", 0.16], [0.86, -2.4, "#4a4138", 0.12], [1.12, -2.62, "#6d6256", 0.12], [1.36, -2.7, "#7c7063", 0.14], [1.6, -2.6, "#6a5f54", 0.14], [1.36, -2.46, "#403830", 0.14]]), soft: 0.012, wash: { mottle: 0.28, cloud: 0.09, rim: 0.28, rimWidth: 0.022, wander: 0.005 } },
];
/** Ink let in along the inner turn while it was wet. */
const COIL_TURN: GongbiLock = { outline: [[0.82, -2.38], [0.98, -2.58], [1.2, -2.72], [1.44, -2.72], [1.6, -2.6], [1.66, -2.38], [1.56, -2.14], [1.36, -2.16], [1.4, -2.34], [1.3, -2.46], [1.1, -2.44], [0.96, -2.34]], places: [{ at: [1.4, -2.7], mix: { ink: 0.44, earth: 0.1 } }, { at: [1.6, -2.4], mix: { ink: 0.5, earth: 0.1 } }, { at: [1, -2.5], mix: { ink: 0.3, earth: 0.08 } }, { at: [1.3, -2.4], mix: { ink: 0.2 } }], cover: 0, soft: 0.016, lost: [{ along: [[0.96, -2.34], [1.2, -2.46], [1.4, -2.34], [1.4, -2.16]], reach: 0.1, soft: 0.14 }], wash: { mottle: 0.3, cloud: 0.07, rim: 0.2, rimWidth: 0.02, wander: 0.006 } };
/** 垂鬟: the hollow loop an unmarried girl lets hang behind it. Its middle, with half widths. */
const LOOP: Lock = [[1.74, -2.3, 0.05], [1.94, -2.46, 0.085], [2.2, -2.43, 0.112], [2.4, -2.22, 0.122], [2.45, -1.9, 0.118], [2.37, -1.58, 0.108], [2.22, -1.34, 0.09], [2.06, -1.22, 0.05]];
const LOOP_LOCK: GongbiLock = { outline: gongbiBand(LOOP), places: hues([[1.8, -2.34, "#3a332d", 0.14], [2.04, -2.46, "#6a6056", 0.14], [2.24, -2.44, "#9a8d7e", 0.12], [2.42, -2.26, "#a89b8b", 0.12], [2.5, -2, "#978a7b", 0.12], [2.38, -1.9, "#6e6358", 0.12], [2.4, -1.64, "#7c7064", 0.12], [2.26, -1.42, "#4e453c", 0.12], [2.1, -1.26, "#2a2521", 0.12], [2.24, -2.3, "#675c51", 0.1]]), soft: 0.012, wash: { mottle: 0.26, cloud: 0.09, rim: 0.28, rimWidth: 0.02, wander: 0.005 } };
const lines = (h: GongbiHand, list: readonly GongbiHairLine[]) => paintGongbiLines(h, list, DARK);
function drawCoil(f: InkRisoPen) {
  const h = gongbiHand(f, HEAD, GONGBI, 7);
  // the hanging loop, behind
  paintGongbiLock(h, LOOP_LOCK, 741);
  lines(h, [[[[1.86, -2.5], [2.14, -2.52], [2.4, -2.34], [2.55, -2.0], [2.48, -1.62], [2.3, -1.34]], 0.004, 0.5, 0.007], [[[1.84, -2.38], [2.12, -2.4], [2.32, -2.2], [2.37, -1.9], [2.3, -1.6], [2.16, -1.36]], 0.006, 0.6, 0.012], [[[1.9, -2.36], [2.14, -2.33], [2.28, -2.14], [2.31, -1.88], [2.24, -1.6], [2.12, -1.36]], 0.006, 0.9], [[[1.9, -2.44], [2.16, -2.44], [2.38, -2.26], [2.45, -1.96], [2.38, -1.66]], 0.008, 0.3, 0.02]]);
  liftGongbiLines(h, [[[[2.02, -2.46], [2.24, -2.4], [2.4, -2.2], [2.44, -1.96]], 0.006, 0.5, 0.008], [[[2.5, -2.1], [2.48, -1.8], [2.38, -1.52]], 0.012, 0.26, 0.016]]);
  // the hank behind, then the one wound over it
  paintGongbiLock(h, COIL[0], 743);
  lines(h, [[[[0.72, -2.4], [0.66, -2.62], [0.76, -2.86], [0.98, -3.02], [1.2, -3.06]], 0.008, 0.4, 0.016], [[[0.6, -2.44], [0.53, -2.64], [0.59, -2.84], [0.76, -2.99]], 0.005, 0.4, 0.01], [[[0.82, -2.42], [0.8, -2.62], [0.9, -2.82], [1.1, -2.94]], 0.01, 0.4, 0.02], [[[1.34, -3.0], [1.1, -3.1], [0.84, -3.1], [0.6, -3.0], [0.46, -2.82], [0.45, -2.62], [0.56, -2.45]], 0.004, 0.6, 0.006]]);
  liftGongbiLines(h, [[[[0.58, -2.56], [0.56, -2.72], [0.64, -2.88], [0.8, -3.0]], 0.008, 0.36, 0.012]]);
  paintGongbiLock(h, COIL[1], 744); paintGongbiLock(h, COIL_TURN, 745);
  paintGongbiFlow(h, HEAD, WOUND, { n: 8, s: [0.06, 0.96], from: [0, 0.3], length: [0.4, 0.7], half: [0.004, 0.012], soft: [0.012, 0.024], ink: [0.16, 0.4], tone: colour("#352d27", 0), drift: 0.06, seed: 61 });
  paintGongbiFlow(h, HEAD, WOUND, { n: 5, s: [0.06, 0.7], from: [0.16, 0.5], length: [0.2, 0.4], half: [0.005, 0.014], soft: [0.014, 0.028], ink: [0.14, 0.32], drift: 0.06, seed: 62 });
  lines(h, [
    [[[0.77, -2.36], [0.86, -2.58], [1, -2.77], [1.2, -2.93], [1.44, -3.02], [1.66, -2.99]], 0.007, 0.8], [[[0.82, -2.35], [0.98, -2.58], [1.2, -2.73], [1.45, -2.75], [1.64, -2.62], [1.7, -2.4], [1.62, -2.14]], 0.006, 0.8], [[[0.9, -2.34], [1.06, -2.5], [1.26, -2.57], [1.44, -2.5], [1.5, -2.34], [1.44, -2.18]], 0.006, 0.7, 0.008],
    [[[1.7, -2.98], [1.88, -2.82], [1.945, -2.58], [1.89, -2.34], [1.77, -2.12]], 0.005, 0.6, 0.006], [[[0.74, -2.33], [1.04, -2.26], [1.36, -2.12], [1.6, -2.0], [1.8, -1.82]], 0.009, 0.9, 0.006],
  ]);
  liftGongbiLines(h, [[[[0.96, -2.64], [1.16, -2.8], [1.4, -2.88], [1.62, -2.82]], 0.007, 0.46, 0.01], [[[1.04, -2.53], [1.24, -2.62], [1.42, -2.61], [1.54, -2.5]], 0.005, 0.5, 0.007], [[[1.84, -2.6], [1.83, -2.42], [1.75, -2.24]], 0.007, 0.4, 0.01], [[[0.8, -2.38], [1.06, -2.3], [1.36, -2.17], [1.56, -2.06]], 0.005, 0.7, 0.005]]);
  // what has come loose
  lines(h, [[[[0.5, -2.5], [0.38, -2.68], [0.38, -2.92], [0.48, -3.1]], 0.003, 0.5, 0.006, STRAND], [[[1, -3.1], [1.3, -3.17], [1.62, -3.11], [1.86, -2.94]], 0.003, 0.5, 0.006, STRAND], [[[1.74, -2.97], [1.97, -2.86], [2.06, -2.66]], 0.003, 0.5, 0.006, STRAND], [[[2.14, -1.3], [2.36, -1.3], [2.52, -1.46], [2.58, -1.7]], 0.004, 0.6, 0.006, STRAND], [[[2.08, -1.26], [2.2, -1.1], [2.24, -0.92]], 0.004, 0.6, 0.006, STRAND]]);
}
/** 一縷青絲: the tress an unmarried girl lets down over her shoulder, tied at the nape with a cord. */
const TRESS: Lock = [[1.66, 1.08, 0.05], [1.7, 1.26, 0.095], [1.77, 1.5, 0.135], [1.77, 1.9, 0.155], [1.68, 2.34, 0.15], [1.58, 2.78, 0.14], [1.53, 3.2, 0.125], [1.53, 3.58, 0.1], [1.49, 3.92, 0.07], [1.4, 4.22, 0.04], [1.34, 4.46, 0.016], [1.36, 4.64, 0.001]];
const TRESS_LOCK: GongbiLock = { outline: gongbiBand(TRESS), places: hues([[1.66, 1.12, "#221e1b", 0.12], [1.74, 1.36, "#3a332d", 0.14], [1.84, 1.66, "#6d6358", 0.16], [1.7, 1.8, "#4b423a", 0.14], [1.82, 2.04, "#7d7266", 0.16], [1.62, 2.2, "#39322c", 0.16], [1.72, 2.5, "#5e544a", 0.16], [1.5, 2.7, "#2e2824", 0.16], [1.62, 3, "#615750", 0.16], [1.46, 3.3, "#3a332d", 0.16], [1.54, 3.6, "#5f554b", 0.16], [1.44, 4.1, "#3f3730", 0.16], [1.36, 4.6, "#675c51", 0.14]]), soft: 0.014, lost: [{ along: [[1.36, 4.6]], reach: 0.2, soft: 0.05 }], wash: { mottle: 0.24, cloud: 0.14, rim: 0.22, rimWidth: 0.024, wander: 0.005 } };
const TRESS_SHEET = guides([[0, gongbiAlong(TRESS, 1)], [0.5, gongbiAlong(TRESS, 0)], [1, gongbiAlong(TRESS, -1)]]);
function drawTress(f: InkRisoPen) {
  const h = gongbiHand(f, HEAD, GONGBI, 8);
  paintGongbiLock(h, TRESS_LOCK, 751);
  paintGongbiFlow(h, HEAD, TRESS_SHEET, { n: 13, s: [0.04, 0.96], from: [0, 0.4], length: [0.3, 0.7], half: [0.005, 0.014], soft: [0.01, 0.02], ink: [0.3, 0.7], tone: colour("#211c19", 0), drift: 0.1, seed: 71 });
  paintGongbiFlow(h, HEAD, TRESS_SHEET, { n: 8, s: [0.06, 0.9], from: [0.06, 0.6], length: [0.14, 0.3], half: [0.004, 0.012], soft: [0.01, 0.02], ink: [0.2, 0.46], drift: 0.08, seed: 72 });
  lines(h, [
    [gongbiAlong(TRESS, 0.98), 0.005, 0.6, 0.006], [gongbiAlong(TRESS, -0.98), 0.005, 0.7, 0.006], [[[1.66, 1.2], [1.7, 1.6], [1.66, 2.1], [1.56, 2.6], [1.48, 3.1], [1.47, 3.6]], 0.008, 0.8], [[[1.72, 1.2], [1.8, 1.6], [1.78, 2.1], [1.68, 2.6], [1.6, 3.1], [1.58, 3.5]], 0.006, 0.7], [[[1.56, 2.9], [1.54, 3.3], [1.53, 3.7], [1.46, 4.1], [1.38, 4.4]], 0.007, 0.8],
    [[[1.62, 1.5], [1.58, 1.9], [1.49, 2.4], [1.4, 2.9], [1.37, 3.4], [1.42, 3.7]], 0.006, 0.8, 0.006, STRAND], [[[1.9, 1.6], [1.93, 2], [1.83, 2.5], [1.73, 2.9], [1.7, 3.1]], 0.006, 0.8, 0.006, STRAND], [[[1.62, 3], [1.66, 3.4], [1.64, 3.8], [1.54, 4.2], [1.52, 4.44]], 0.006, 0.8, 0.006, STRAND], [[[1.44, 3.3], [1.41, 3.6], [1.36, 3.9], [1.27, 4.2]], 0.005, 0.7, 0.006, STRAND],
  ]);
  liftGongbiLines(h, [[[[1.75, 1.5], [1.73, 1.9], [1.63, 2.4], [1.54, 2.8]], 0.006, 0.6], [[[1.51, 3.1], [1.51, 3.4], [1.49, 3.7]], 0.005, 0.6]]);
  // the cord: four turns round it, and two ends that lie over the tress
  const red = (x: number, y: number, deep: number): GongbiPlace => ({ at: [x, y], mix: { warm: 0.96, earth: 0.16, ink: deep }, reach: 0.05 });
  for (let i = 0; i < 4; i++) { const x = 1.655 - 0.004 * i, y = 1.02 + 0.034 * i; paintGongbiLock(h, { outline: gongbiBand([[x - 0.084, y - 0.014, 0.008], [x - 0.045, y + 0.01, 0.019], [x, y + 0.018, 0.021], [x + 0.045, y + 0.01, 0.019], [x + 0.084, y - 0.014, 0.008]]), places: [red(x - 0.02, y, 0.02), red(x - 0.08, y, 0.3), red(x + 0.08, y, 0.26), red(x, y + 0.04, 0.34)], soft: 0.007, wash: { mottle: 0.1, rim: 0.1, rimWidth: 0.008 } }, 755 + i); lines(h, [[[[x - 0.08, y + 0.006], [x - 0.04, y + 0.03], [x, y + 0.038], [x + 0.04, y + 0.03], [x + 0.08, y + 0.006]], 0.003, 0.5]]); }
  for (const [i, q] of ([[[1.645, 1.14, 0.012], [1.71, 1.3, 0.015], [1.725, 1.5, 0.013], [1.775, 1.74, 0.011], [1.75, 1.96, 0.003]], [[1.67, 1.14, 0.012], [1.77, 1.28, 0.014], [1.82, 1.46, 0.012], [1.88, 1.62, 0.01], [1.87, 1.78, 0.003]]] as readonly Lock[]).entries()) paintGongbiLock(h, { outline: gongbiBand(q), places: [red(q[0][0], q[0][1], 0.2), red(q[2][0], q[2][1], 0), red(q[4][0], q[4][1], 0.1)], soft: 0.007, wash: { mottle: 0.1, rim: 0.16, rimWidth: 0.008 } }, 761 + i);
}
// ---- neck, robe and shawl, in page units -------------------------------------------------------------------------------------------
/** The figure's ground: paper, so nothing behind her shows through. Her shoulders are a third wider than her head is high, as they are on a slight girl. */
const FIGURE: P2[] = [[471, 528], [466, 613], [462, 664], [457, 715], [452, 746], [441, 778], [422, 807], [398, 830], [348, 864], [304, 896], [268, 932], [244, 978], [226, 1034], [212, 1096], [203, 1150], [186, 1196], [174, 1262], [168, 1340], [176, 1420], [184, 1450], [166, 1510], [142, 1570], [118, 1640], [912, 1640], [880, 1570], [850, 1500], [828, 1440], [818, 1360], [812, 1280], [805, 1200], [796, 1120], [784, 1052], [768, 992], [750, 946], [724, 908], [690, 878], [652, 854], [630, 846], [612, 832], [598, 817], [591, 807], [587, 798], [592, 783], [601, 764], [581, 647]];
/** The collars' edges toward the throat, from behind the neck down. */
const NEAR_IN: P2[] = [[462, 739], [453, 761], [454, 791], [466, 824], [489, 861], [520, 898], [554, 934], [585, 966], [612, 996], [640, 1030]];
const FAR_IN: P2[] = [[590, 806], [595, 843], [602, 873], [604, 909], [603, 947], [597, 987], [582, 1032], [564, 1080], [542, 1130], [518, 1184], [490, 1242], [452, 1326]];
/** A line set off to one side by a distance of its own. */
const aside = (q: readonly P2[], d: (t: number) => number): P2[] => q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], z = q[Math.min(q.length - 1, i + 1)], l = Math.hypot(z[0] - a[0], z[1] - a[1]), k = d(i / (q.length - 1)); return [x - ((z[1] - a[1]) / l) * k, y + ((z[0] - a[0]) / l) * k] as const; });
const press = (q: readonly (readonly number[])[], ...k: number[]): N3[] => q.map((r, i) => { const t = (i / (q.length - 1)) * (k.length - 1), j = Math.min(k.length - 2, Math.floor(t)); return [r[0], r[1], lerp(k[j], k[j + 1], t - j)] as const; });
/** A fold of cloth: the line, its width, how far its shade reaches to one side (+ the line's right hand, looking along it) and how dark it is. */
type Fold = readonly [path: readonly P2[], line: number, reach: number, tone: number, ...press: number[]];
const draws = (p: InkRisoPen, from: number) => {
  let s = from;
  const th = (pts: readonly N3[], w: number, ink = 0.85, inkEnd = ink * 0.6, mid?: number) => inkThread(p, K, pts, w, { ink, inkEnd, mid, seed: s++ });
  const side = (pts: readonly N3[], w: number, o: Omit<Parameters<typeof inkSide>[4], "seed">, plate = K) => inkSide(p, plate, pts, w, { ...o, bristles: o.bristles ?? Math.max(6, w * 0.45), seed: s++ });
  const wash = (plate: string, pts: readonly (readonly number[])[], o: Omit<Parameters<typeof inkBloom>[3], "seed">) => inkBloom(p, plate, p.shape(pts as readonly P2[]), { ...o, seed: s++ });
  const loc = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return fn(x, y); };
  /** Where the wet ink of the hem ends: it runs to the paper's foot in some places and dries short of it in others. */
  const foot = (x: number, y: number) => ss(0, 90, 1640 - y - 90 * inkFbm2(21, x / 130, 0.4, 2));
  /** The shade of a fold (分染): full on its line, washed out with water to one side; it comes in and goes out along the line. */
  const shade = (inks: readonly (readonly [plate: string, share: number])[], q: readonly P2[], reach: number, tone: number, grow = (t: number) => ss(0, 0.25, t) * ss(1, 0.75, t)) => {
    const n = Math.abs(reach), sg = Math.sign(reach), far = aside(q, () => sg * n), seed = s + 300, dark = loc((x, y) => {
      let b = 1e9, t = 0; for (let i = 0; i < q.length - 1; i++) { const [ax, ay] = q[i], dx = q[i + 1][0] - ax, dy = q[i + 1][1] - ay, f = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)), l = Math.hypot(x - ax - f * dx, y - ay - f * dy); if (l < b) { b = l; t = (i + f) / (q.length - 1); } }
      return tone * grow(t) * Math.exp(-((b / (n * 0.62)) ** 2) * 1.5) * ss(n, n * 0.6, b) * (0.65 + 0.7 * inkFbm2(seed, x / 70, y / 170, 3)) * foot(x, y);
    });
    for (const [plate, share] of inks) wash(plate, [...q, ...[...far].reverse()], { tone: (X, Y) => share * dark(X, Y), soft: 1.6, wander: 0, fringe: 0, rim: 0, mottle: 0.2, cloud: 60 });
  };
  return { th, side, wash, loc, foot, shade };
};
/** Shade on the white of the robe: ink warmed with a little earth. */
const GREY = [[K, 1], [E, 0.5]] as const;
/** The neck: the jaw throws a thin warm shade on it, no more. */
const NECK: readonly GongbiPlace[] = [at(1.3, 0.8, "#E3C7B2", 0.2), at(1.46, 0.9, "#E9D2C0", 0.2), at(1.0, 1.1, "#CFAE96", 0.18), at(0.6, 1.5, "#C9A78E", 0.18), at(0.24, 1.66, "#CFB09A", 0.16), at(0.4, 1.9, "#E6CFBD", 0.2), at(0.9, 1.5, "#E2C9B5", 0.2), at(1.3, 1.4, "#E7D1BF", 0.24), at(0.8, 2.1, "#EBD7C6", 0.3), at(0.42, 2.4, "#F0DECE", 0.3), at(0.4, 1.6, "#CDAC94", 0.14)];
/** Breast and upper sleeves: folds that sweep from the shoulders to the armpits and the elbows, and those drawn up out of the sash. */
const ROBE_FOLDS: readonly Fold[] = [
  // near sleeve
  [[[318, 888], [346, 948], [356, 1030], [344, 1112], [312, 1186], [270, 1246]], 2.6, -54, 0.15, 0.03, 0.6, 0.8, 0.9, 0.6, 0.03],
  [[[390, 1096], [374, 1156], [338, 1216], [288, 1262]], 3, -40, 0.18, 1, 0.8, 0.5, 0.03], [[[396, 1150], [386, 1212], [358, 1266], [322, 1304]], 2.4, -30, 0.14, 0.9, 0.7, 0.4, 0.03],
  [[[270, 938], [260, 1010], [248, 1088], [232, 1158]], 2.4, 26, 0.12, 0.03, 0.6, 0.6, 0.03], [[[396, 1350], [350, 1342], [300, 1340], [252, 1356]], 3, 40, 0.16, 1, 0.7, 0.5, 0.03],
  // from the collar and the shoulder into the armpit
  [[[404, 842], [424, 908], [424, 980], [404, 1046], [380, 1092]], 2.8, -60, 0.14, 0.03, 0.5, 0.8, 0.9, 0.6], [[[466, 900], [470, 960], [452, 1022], [420, 1074], [394, 1098]], 2.4, -44, 0.12, 0.03, 0.6, 0.8, 0.6, 0.4], [[[520, 960], [512, 1020], [482, 1078], [440, 1124], [404, 1146]], 2.4, -44, 0.12, 0.03, 0.5, 0.8, 0.6, 0.03],
  // drawn up out of the sash
  [[[424, 1300], [420, 1254], [412, 1204], [400, 1160]], 2.8, 26, 0.16, 1, 0.7, 0.5, 0.03], [[[456, 1308], [454, 1256], [460, 1196], [478, 1140]], 2.8, 34, 0.18, 1, 0.8, 0.5, 0.03], [[[440, 1304], [436, 1274], [434, 1246]], 2.2, 18, 0.14, 1, 0.6, 0.03],
  [[[548, 1314], [556, 1264], [578, 1204], [606, 1146], [624, 1110]], 2.8, 44, 0.18, 1, 0.8, 0.6, 0.4, 0.03], [[[588, 1312], [598, 1268], [618, 1216], [640, 1170]], 2.6, 34, 0.16, 1, 0.8, 0.5, 0.03], [[[624, 1306], [636, 1250], [656, 1184], [672, 1120]], 2.8, 36, 0.18, 1, 0.8, 0.5, 0.03], [[[654, 1298], [664, 1258], [678, 1214]], 2.4, 24, 0.16, 1, 0.6, 0.03], [[[566, 1313], [570, 1288], [580, 1262]], 2.2, 18, 0.14, 1, 0.6, 0.03], [[[520, 1314], [518, 1292], [522, 1268]], 2.2, 16, 0.12, 1, 0.6, 0.03],
  // far breast
  [[[634, 1036], [652, 1064], [676, 1084]], 2.4, -30, 0.12, 0.5, 0.7, 0.03], [[[640, 1052], [648, 1100], [648, 1150]], 2.4, 24, 0.12, 0.6, 0.6, 0.03], [[[636, 858], [634, 920], [644, 984], [658, 1040]], 2.4, -34, 0.12, 0.03, 0.6, 0.6, 0.03],
];
/** The fore-sleeves and the skirt between them. */
const SLEEVE_FOLDS: readonly Fold[] = [
  [[[344, 1462], [316, 1500], [296, 1552], [284, 1620]], 2.8, -54, 0.18, 0.2, 0.8, 0.6, 0.03], [[[404, 1422], [388, 1462], [372, 1524], [364, 1600]], 2.8, -44, 0.18, 0.3, 0.9, 0.6, 0.03], [[[424, 1406], [424, 1456], [420, 1520], [424, 1590]], 2.4, -36, 0.16, 0.9, 0.7, 0.5, 0.03],
  [[[596, 1496], [556, 1520], [500, 1552], [452, 1592], [424, 1626]], 3, -54, 0.2, 0.4, 0.9, 0.8, 0.4, 0.03], [[[596, 1530], [570, 1560], [534, 1600], [510, 1632]], 2.6, -40, 0.18, 0.3, 0.8, 0.5, 0.03], [[[500, 1458], [488, 1480], [464, 1508], [446, 1536]], 2.4, -30, 0.14, 0.9, 0.6, 0.4, 0.03],
  [[[702, 1384], [716, 1446], [738, 1512], [766, 1600]], 2.2, 30, 0.1, 0.8, 0.6, 0.5, 0.03], [[[656, 1462], [672, 1510], [684, 1570], [690, 1624]], 2.6, 36, 0.18, 0.5, 0.8, 0.6, 0.03],
];
function drawBody(pen: Pens) {
  const { page: p, face } = pen, { th, side, wash, loc, foot, shade } = draws(p, 800);
  const white = (q: readonly P2[]) => { p.knock(p.shape(q)); wash(W, q, { tone: loc((x, y) => 0.6 * foot(x, y)), soft: 0.8, wander: 0, fringe: 0, rim: 0, mottle: 0.1, exact: true }); };
  const folds = (list: readonly Fold[]) => { for (const [q, , reach, tone] of list) shade(GREY, q, reach, tone); for (const [q, w, , , ...k] of list) th(press(q, ...k), w, 0.84, 0.6); };
  p.knock(p.shape(FIGURE)); white(FIGURE.slice(5, 42));
  // ---- neck and chest
  const throat: P2[] = [[600, 764], [592, 785], [587, 805], [586, 826]];
  const neck = p.shape([...throat, [615, 953], [581, 970], [530, 902], [466, 817], [449, 763], [450, 724], [452, 694], [456, 664], [464, 630], [471, 587], [530, 579], [581, 698]]);
  gongbiSkin(gongbiHand(face, HEAD, GONGBI, 14), neck, NECK, { soft: 0.016, mottle: 0.1, cloud: 0.3 });
  // ---- inner collars, a breath of indigo
  const nearIn2 = aside(NEAR_IN.slice(0, 8), t => -lerp(3, 18, ss(0, 0.45, t))), farIn2 = aside(FAR_IN.slice(0, 6), t => lerp(2, 18, ss(0, 0.45, t)));
  p.knock(p.shape([...NEAR_IN.slice(0, 8), ...[...nearIn2].reverse()]));
  wash(B, [...NEAR_IN.slice(0, 8), ...[...nearIn2].reverse()], { tone: 0.24, soft: 1.4, wander: 0.6, rim: 0.4, rimWidth: 3, mottle: 0.4, cloud: 40, exact: true });
  th(press(nearIn2, 0.1, 0.5, 0.9, 0.7, 0.9, 0.8, 0.3), 2.4, 0.74, 0.5);
  p.knock(p.shape([...FAR_IN.slice(0, 6), ...[...farIn2].reverse()]));
  wash(B, [...FAR_IN.slice(0, 6), ...[...farIn2].reverse()], { tone: 0.28, soft: 1.4, wander: 0.6, rim: 0.4, rimWidth: 3, mottle: 0.4, cloud: 40, exact: true });
  th(press(farIn2, 0.1, 0.5, 0.9, 0.7, 0.9, 0.6, 0.1), 2.4, 0.78, 0.5);
  // the throat stands before the far collar; the nape is one long line from behind the ear to the collar
  th(press(throat, 0.3, 1, 1, 0.9, 0.6, 0.05), 3, 0.86, 0.5);
  th(press([[464, 640], [457, 664], [453, 694], [451, 724], [448, 761]], 0.04, 0.6, 0.9, 0.9, 0.4), 2, 0.7, 0.5);
  th([[586, 895, 0.05], [575, 902, 0.7], [560, 901, 0.4], [542, 892, 0.02]], 2.2, 0.4, 0.12);
  th([[505, 788, 0.02], [529, 814, 0.5], [557, 848, 0.7], [578, 878, 0.05]], 1.8, 0.1, 0.3);
  // ---- the robe: whites stand, and grey goes where cloth turns away or lies in shade
  const ARM: P2[] = [[378, 1084], [394, 1130], [402, 1200], [400, 1280], [394, 1344]], FAR_ARM: P2[] = [[706, 1090], [710, 1170], [708, 1250], [702, 1350]];
  shade(GREY, ARM, -46, 0.2, t => ss(0, 0.4, t)); shade(GREY, FAR_ARM, 44, 0.22, t => ss(0, 0.4, t));
  shade(GREY, [[268, 932], [244, 978], [226, 1034], [212, 1096], [203, 1150], [196, 1240], [190, 1340]], -44, 0.16); shade(GREY, [[768, 992], [784, 1052], [796, 1120], [805, 1200], [812, 1280], [818, 1360], [828, 1440]], 44, 0.14);
  shade(GREY, [[398, 1294], [460, 1306], [560, 1312], [650, 1298], [704, 1276]], -44, 0.12, () => 1);
  folds(ROBE_FOLDS);
  // ---- near collar: it comes out from behind the nape and stands away from it
  const nearW = (t: number) => lerp(3, 24, ss(0, 0.14, t)) + 24 * ss(0.12, 0.6, t), nearOut = aside(NEAR_IN, nearW);
  shade(GREY, nearOut.slice(2), 30, 0.2, t => ss(0, 0.3, t));
  p.knock(p.shape([...NEAR_IN, ...[...nearOut].reverse()]));
  wash(K, [...NEAR_IN, ...[...nearOut].reverse()], { tone: loc((_x, y) => lerp(0.97, 0.6, ss(850, 1060, y))), soft: 1.2, wander: 0.8, fringe: 0.2, tooth: 6, rim: 0.2, mottle: 0.3, cloud: 70, exact: true });
  side(press(aside(NEAR_IN, t => nearW(t) / 2), 0.05, 0.5, 0.7, 0.85, 1, 1, 1), 40, { tip: 0.94, belly: 0.6, side: 1, head: 0, rim: 0.1, dry: 0.08, dryEnd: 0.8 });
  // ---- the far panel, over it: the wearer's left over her right
  const farW = (t: number) => lerp(5, 52, ss(0, 0.4, t)), farOut = aside(FAR_IN, t => -farW(t));
  shade(GREY, farOut.slice(3), -40, 0.2, t => 0.7 * ss(0, 0.3, t));
  p.knock(p.shape([...FAR_IN, ...[...farOut].reverse()]));
  wash(K, [...FAR_IN, ...[...farOut].reverse()], { tone: loc((_x, y) => lerp(0.98, 0.6, ss(1000, 1300, y))), soft: 1.2, wander: 0.8, fringe: 0.2, tooth: 6, rim: 0.2, mottle: 0.36, cloud: 90, exact: true });
  side(press(aside(FAR_IN, t => -farW(t) / 2), 0.04, 0.34, 0.66, 0.9, 1, 1, 0.9, 0.8), 46, { tip: 0.94, belly: 0.6, side: -1, head: 0, rim: 0.1, dry: 0.08, dryEnd: 1 });
  // ---- the skirt, and the sash over it: the robe is drawn up out of it in small folds
  for (const [x, long, dark] of [[426, 70, 0.16], [452, 104, 0.22], [484, 84, 0.14], [514, 110, 0.2], [538, 76, 0.1], [572, 108, 0.2], [604, 92, 0.16], [632, 104, 0.22], [664, 78, 0.18]] as const) { const q: P2[] = [[x, 1366], [lerp(x, 556, 0.05), 1366 + long * 0.5], [lerp(x, 556, 0.16), 1366 + long]]; shade(GREY, q, x < 556 ? 24 : -24, dark, t => ss(1.05, 0, t)); th(press(q, 0.9, 0.6, 0.04), 2.4, 0.74, 0.4); }
  const SASH: P2[] = [[398, 1294], [440, 1304], [500, 1312], [560, 1314], [620, 1308], [672, 1294], [704, 1278], [706, 1326], [702, 1366], [660, 1382], [600, 1392], [540, 1395], [470, 1388], [398, 1370]];
  p.knock(p.shape(SASH));
  wash(B, SASH, { tone: loc((x, y) => 0.5 + 0.16 * ss(1330, 1390, y) + 0.2 * ss(460, 400, x) + 0.2 * ss(650, 704, x)), soft: 1.2, wander: 0.6, fringe: 0.2, rim: 0.2, rimWidth: 6, mottle: 0.2, cloud: 120, exact: true });
  wash(K, SASH, { tone: loc((x, y) => 0.34 + 0.16 * ss(1330, 1390, y) + 0.24 * ss(460, 400, x) + 0.24 * ss(650, 704, x)), soft: 1.2, wander: 0.6, fringe: 0.2, rim: 0.2, rimWidth: 6, mottle: 0.2, cloud: 120, exact: true });
  for (const q of [[[402, 1318], [480, 1336], [570, 1338], [650, 1322], [704, 1304]], [[400, 1346], [480, 1364], [570, 1366], [650, 1352], [702, 1336]]] as const) { shade([[K, 1]], q as unknown as P2[], 16, 0.3, () => 1); th(press(q, 0.6, 0.9, 1, 0.8, 0.6), 2.2, 0.8, 0.7); }
  th(press(SASH.slice(0, 7), 0.8, 1, 0.8, 1, 0.8), 3, 0.9, 0.8); th(press(SASH.slice(7), 0.6, 0.9, 1, 0.9, 0.8), 3, 0.9, 0.8);
  // ---- the far sleeve, then the near one
  white([[702, 1352], [686, 1400], [664, 1440], [640, 1468], [614, 1488], [612, 1640], [912, 1640], [880, 1570], [850, 1500], [828, 1440], [812, 1380], [760, 1350]]);
  wash(B, [[680, 1430], [650, 1480], [630, 1540], [628, 1640], [900, 1640], [862, 1560], [834, 1490], [806, 1430]], { tone: loc((x, y) => 0.16 * ss(1440, 1600, y) * foot(x, y) * (0.25 + 1.1 * inkFbm2(9, x / 70, y / 170, 3))), soft: 8, wander: 4, wave: 70, fringe: 0.4, mottle: 0.5 });
  white([[394, 1350], [420, 1396], [454, 1430], [500, 1456], [556, 1474], [614, 1486], [632, 1540], [642, 1640], [390, 1640], [388, 1440]]);
  wash(B, [[430, 1450], [520, 1480], [608, 1500], [626, 1640], [150, 1640], [180, 1560], [300, 1500], [360, 1430]], { tone: loc((x, y) => 0.18 * ss(1450, 1600, y) * foot(x, y) * (0.2 + 1.2 * inkFbm2(3, x / 90, y / 190, 3))), soft: 14, wander: 12, wave: 110, fringe: 0.6, rim: 0.1, mottle: 0.5, cloud: 120 });
  shade(GREY, [[192, 1396], [184, 1450], [166, 1510], [142, 1570], [120, 1630]], -50, 0.2, t => ss(0, 0.3, t)); shade(GREY, [[420, 1396], [454, 1430], [500, 1456], [556, 1474], [614, 1486]], 40, 0.1, () => 1);
  folds(SLEEVE_FOLDS);
  // ---- contours: the brush presses where the form turns and lifts where it runs on
  th(press([[449, 754], [440, 779], [421, 807], [398, 830], [348, 864], [304, 896], [268, 932], [244, 978], [226, 1034], [212, 1096], [203, 1150], [199, 1190]], 0.1, 0.4, 0.6, 0.7, 0.85, 1, 0.8, 0.7, 0.6, 0.5, 0.3), 5.4, 0.94, 0.8); th(press([[203, 1150], [196, 1240], [191, 1320], [190, 1390], [186, 1440]], 0.7, 1, 1, 1, 0.8), 1.9, 0.6, 0.6); th(press([[188, 1420], [184, 1450], [166, 1510], [142, 1570], [124, 1616]], 0.4, 0.8, 0.8, 0.5, 0.04), 4.2, 0.9, 0.7);
  th([[592, 808, 0.05], [600, 819, 0.3], [613, 833, 0.4], [630, 846, 0.8], [647, 853, 0.8], [664, 861, 0.7]], 4.4, 0.94, 0.9); th(press([[724, 908], [750, 946], [768, 992], [784, 1052], [796, 1120], [805, 1200], [812, 1280], [818, 1360], [828, 1440], [850, 1500], [880, 1570], [900, 1612]], 0.1, 0.8, 0.8, 0.7, 0.7, 0.7, 0.8, 0.9, 0.9, 0.6, 0.04), 2.2, 0.6, 0.6);
  th(press(ARM, 0.1, 0.8, 0.6, 0.8, 1), 4, 0.9, 0.9); th(press(FAR_ARM, 0.1, 0.6, 0.7, 0.9), 3.4, 0.8, 0.9);
  th(press([[394, 1350], [420, 1396], [454, 1430], [500, 1456], [556, 1474], [614, 1486], [632, 1540], [640, 1610]], 0.8, 1, 0.7, 0.7, 0.9, 1, 0.6, 0.04), 4.4, 0.94, 0.8); th(press([[702, 1352], [686, 1400], [664, 1440], [640, 1468], [616, 1484]], 0.9, 0.8, 0.7, 0.6, 0.2), 4, 0.9, 0.8);
}

// ---- 披帛: a long shawl of gauze. One end lies over her far shoulder and falls in front; from there it goes round behind her, comes forward low over the near arm and is held in the crook of the elbow.
/** A piece of it: one thin wash, its folds, its borders with the hem line inside them (`hem` away, to the piece's own side). So thin that the robe's lines show through. */
interface Gauze { outline: readonly P2[]; tone: (x: number, y: number) => number; folds: readonly Fold[]; borders: readonly (readonly [path: readonly P2[], hem: number, ...press: number[]])[] }
const ROSE = [[W, 1.6], [R, 0.42], [E, 0.18], [K, 0.05]] as const, VALLEY = [[R, 0.46], [E, 0.4], [K, 0.14]] as const;
function drawGauze(p: InkRisoPen, seed: number, { outline, tone, folds, borders }: Gauze) {
  const d = draws(p, seed), line = (q: readonly N3[], w: number, ink: number, end: number) => { d.th(q, w, ink * 0.7, end * 0.7); inkThread(p, R, q, w * 1.1, { ink: ink * 0.6, inkEnd: end * 0.6, seed: seed + 90 }); };
  for (const [plate, k] of ROSE) d.wash(plate, outline, { tone: d.loc((x, y) => k * tone(x, y) * (0.74 + 0.52 * inkFbm2(27, x / 60, y / 130, 3)) * d.foot(x, y)), soft: 1, wander: 0, fringe: 0.1, rim: 0.2, rimWidth: 5, mottle: 0.2, cloud: 70, exact: true });
  for (const [q, , reach, t] of folds) d.shade(VALLEY, q, reach, t * 0.8);
  for (const [q, w, , , ...k] of folds) if (w) line(press(q, ...k), w, 0.56, 0.5);
  for (const [q, hem, ...k] of borders) { line(press(q, ...k), 2.4, 0.7, 0.6); if (hem) line(press(aside(q, () => hem), ...k.map(v => v * 0.8)), 1.3, 0.34, 0.3); }
}
const about = (x: number, y: number, r: number) => (px: number, py: number) => Math.exp(-(((px - x) ** 2 + (py - y) ** 2) / (r * r)));
const HELD = about(404, 1384, 100);
/** What hangs behind her, seen outside the near arm. */
const BEHIND: Gauze = {
  outline: [[196, 1210], [170, 1290], [150, 1380], [130, 1470], [108, 1560], [92, 1640], [132, 1640], [154, 1570], [178, 1510], [196, 1450], [206, 1390], [214, 1300]],
  tone: () => 0.36,
  folds: [[[[184, 1280], [166, 1380], [148, 1480], [124, 1590]], 1.8, -26, 0.3, 0.03, 0.7, 0.8, 0.03], [[[188, 1400], [172, 1480], [150, 1570]], 1.6, -22, 0.3, 0.03, 0.7, 0.03]],
  borders: [[[[196, 1210], [170, 1290], [150, 1380], [130, 1470], [108, 1560], [94, 1626]], -7, 0.5, 0.9, 1, 0.9, 0.6, 0.05]],
};
const OVER_ARM: Gauze = {
  outline: [[203, 1148], [186, 1196], [174, 1262], [168, 1340], [174, 1412], [192, 1460], [222, 1490], [264, 1504], [314, 1494], [362, 1456], [398, 1412], [418, 1390], [414, 1372], [396, 1368], [356, 1356], [306, 1322], [260, 1270], [226, 1208]],
  tone: (x, y) => 0.18 + 0.16 * HELD(x, y) + 0.08 * ss(204, 172, x),
  folds: [
    // two long ones into the crook, and what runs into them
    [[[184, 1222], [222, 1296], [282, 1350], [346, 1376], [406, 1380]], 2, 40, 0.34, 0.03, 0.6, 0.8, 0.9, 1], [[[170, 1330], [200, 1396], [260, 1430], [336, 1424], [408, 1388]], 2, 40, 0.36, 0.03, 0.7, 0.9, 0.9, 1],
    [[[236, 1226], [266, 1286], [312, 1334], [366, 1362]], 1.6, 20, 0.22, 0.03, 0.6, 0.7, 0.03], [[[262, 1290], [292, 1340], [340, 1366]], 1.5, -16, 0.2, 0.03, 0.7, 0.03], [[[196, 1180], [204, 1260], [232, 1318], [262, 1346]], 1.6, -22, 0.24, 0.03, 0.8, 0.6, 0.03],
    [[[182, 1428], [222, 1466], [280, 1468], [344, 1440], [406, 1394]], 1.9, 26, 0.32, 0.03, 0.8, 0.9, 0.9, 0.9], [[[216, 1400], [262, 1404], [320, 1396], [372, 1384]], 1.6, -18, 0.24, 0.03, 0.8, 0.6, 0.03], [[[270, 1484], [330, 1466], [380, 1424], [408, 1396]], 1.6, 14, 0.24, 0.03, 0.7, 0.8, 0.8],
  ],
  borders: [[[[203, 1148], [226, 1208], [260, 1270], [306, 1322], [356, 1356], [396, 1368], [414, 1372]], 8, 0.4, 0.9, 0.8, 0.9, 1, 0.7], [[[203, 1148], [186, 1196], [174, 1262], [168, 1340], [174, 1412], [192, 1460], [222, 1490]], 0, 0.5, 0.9, 1, 0.9, 0.8, 0.8], [[[192, 1460], [222, 1490], [264, 1504], [314, 1494], [362, 1456], [398, 1412], [418, 1390]], -8, 0.6, 0.9, 0.9, 0.8, 0.6]],
};
const FALL: Gauze = {
  outline: [[662, 860], [672, 852], [694, 864], [730, 892], [760, 932], [782, 982], [800, 1046], [812, 1120], [822, 1200], [830, 1280], [840, 1360], [862, 1440], [898, 1530], [950, 1640], [752, 1640], [728, 1560], [710, 1480], [698, 1400], [690, 1310], [688, 1220], [686, 1130], [676, 1040], [664, 960], [658, 900]],
  tone: (_x, y) => 0.18 + 0.2 * ss(1150, 1600, y),
  folds: [
    [[[688, 866], [690, 970], [704, 1080], [712, 1200], [716, 1330], [734, 1460], [778, 1620]], 1.9, -34, 0.3, 0.03, 0.7, 0.8, 0.9, 0.8, 0.6, 0.03], [[[732, 898], [746, 1010], [764, 1120], [774, 1230], [788, 1350], [818, 1470], [866, 1620]], 2, -40, 0.34, 0.03, 0.8, 0.9, 0.8, 0.9, 0.6, 0.03],
    [[[704, 874], [722, 960], [734, 1060], [744, 1180], [756, 1330]], 1.6, 24, 0.24, 0.03, 0.7, 0.6, 0.6, 0.03], [[[778, 1130], [792, 1230], [808, 1340], [840, 1450], [888, 1580]], 1.7, -26, 0.3, 0.03, 0.7, 0.8, 0.7, 0.03], [[[696, 1200], [706, 1320], [722, 1440], [756, 1570]], 1.6, 20, 0.26, 0.03, 0.8, 0.7, 0.03], [[[756, 936], [776, 1030], [790, 1110], [798, 1180]], 1.6, -20, 0.22, 0.03, 0.8, 0.6, 0.03], [[[746, 1260], [760, 1380], [792, 1500], [836, 1600]], 1.6, 20, 0.28, 0.03, 0.7, 0.7, 0.03],
  ],
  borders: [[[[672, 852], [662, 862], [658, 900], [664, 960], [676, 1040], [686, 1130], [688, 1220], [690, 1310], [698, 1400], [710, 1480], [728, 1560], [748, 1626]], -8, 0.5, 0.9, 1, 0.8, 0.9, 0.6, 0.05], [[[664, 856], [672, 852], [694, 864], [730, 892], [760, 932], [782, 982], [800, 1046], [812, 1120], [822, 1200], [830, 1280], [840, 1360], [862, 1440], [898, 1530], [944, 1626]], 8, 0.4, 0.9, 0.9, 0.9, 1, 0.9, 0.6, 0.05]],
};
/** How much of what it hides is left toward the foot of the page. */
const FOOT = (_: number, y: number) => 1 - ss(1480, 1592, y);
const gauze = (g: Gauze, seed: number) => ({ page: p }: Pens) => drawGauze(p, seed, g);
/** In a film, paper under what hangs outside the body, so that it keeps its colour over any scene. */
const hangs = (g: Gauze) => ({ page: p }: Pens) => { inkCover(p, p.shape(g.outline)); inkFade(p, [0, 1440, PAGE.width, 160], FOOT, { coverOnly: true }); };
/** Ink and water thrown behind her: one great blot that leaves her face on clean paper, dry strokes pulled down out of it, drops. */
function drawSplash({ page: p }: Pens) {
  const lo = (fn: (x: number, y: number) => number) => (X: number, Y: number) => { const [x, y] = p.local(X, Y); return fn(x, y); };
  type Bloom = Parameters<typeof inkBloom>[3];
  const blot = (plate: string, nodes: [number, number, number][], tone: Bloom["tone"], o: Partial<Bloom>, seed: number) => inkBloom(p, plate, inkBlob(p, nodes), { tone, soft: 30, wander: 22, wave: 120, fringe: 1.8, tooth: 2.6, rim: 0.35, rimWidth: 6, mottle: 0.55, cloud: 120, seed, ...o });
  const wet = (x: number, y: number) => 0.25 + 1.3 * ss(0.22, 0.74, inkFbm2(33, x / 190, y / 230, 4));
  // behind her nape and shoulder, so that the white of both stands out; then down and away from her
  blot(K, [[420, 520, 50], [380, 620, 90], [330, 730, 110], [250, 830, 130], [170, 930, 120], [130, 1050, 80]], lo((x, y) => 0.2 * wet(x, y) * lerp(0.75, 1, ss(560, 760, y))), { soft: 40, wander: 56, wave: 190 }, 42);
  blot(B, [[360, 640, 70], [270, 780, 100], [190, 1000, 90]], lo((x, y) => 0.26 * wet(x + 300, y)), { soft: 46, wander: 50, wave: 160 }, 41);
  blot(K, [[310, 780, 34], [250, 840, 62], [180, 890, 60], [150, 970, 54], [108, 1010, 34]], lo((x, y) => 0.36 * wet(x, y + 200)), { soft: lo((x, y) => lerp(3, 40, ss(-60, 60, x - 170 - 90 * inkFbm2(34, y / 46, x / 60, 3) + (y - 900) * 0.4))), wander: 46, wave: 74, fringe: 3, rim: 0.4, rimWidth: 10 }, 43);
  blot(K, [[176, 1010, 10], [150, 1060, 26], [128, 1100, 16]], lo((x, y) => 0.3 * wet(x + 60, y)), { soft: 8, wander: 24, wave: 40, fringe: 3 }, 58);
  blot(K, [[404, 640, 24], [384, 700, 44], [360, 780, 40]], lo((x, y) => 0.14 * wet(x + 80, y)), { soft: 26, wander: 26, wave: 70 }, 44);
  blot(K, [[60, 1090, 10], [96, 1104, 22], [140, 1096, 18]], lo(() => 0.26), { soft: lo((_x, y) => lerp(20, 1.6, ss(1088, 1114, y))), wander: 12, wave: 50, rim: 0.5 }, 55);
  const pull = (q: N3[], w: number, tip: number, seed: number) => inkSide(p, K, q, w, { tip, belly: tip * 0.4, side: 1, head: 0.1, rim: 0.1, dry: 0.75, dryEnd: 1, bristles: w * 0.7, grain: 1.2, seed });
  pull([[120, 880, 0.3], [108, 970, 0.9], [112, 1060, 0.8], [102, 1180, 0.2]], 54, 0.62, 45); pull([[186, 960, 0.3], [174, 1040, 0.9], [180, 1110, 0.7], [166, 1210, 0.1]], 34, 0.5, 46); pull([[82, 800, 0.2], [72, 880, 0.8], [78, 960, 0.2]], 24, 0.5, 47); pull([[308, 560, 0.2], [290, 620, 0.7], [286, 700, 0.1]], 26, 0.3, 56);
  inkSplatter(p, K, { x: 96, y: 1200, spread: [50, 70], n: 14, radius: [0.8, 6], seed: 48 });
  inkSplatter(p, K, { x: 250, y: 560, spread: [80, 70], n: 11, radius: [0.7, 4], seed: 49 });
  inkSplatter(p, B, { x: 210, y: 640, spread: [80, 60], n: 7, radius: [0.8, 4.4], seed: 50 });
}
/** A few petals on the air. */
function drawPetals({ page: p }: Pens) {
  for (const [x, y, r, a, seed] of [[892, 1180, 9, 0.6, 51], [1010, 1250, 7, 2.2, 52], [106, 1300, 8, 1.2, 53], [960, 1420, 6, -0.4, 54]] as const) inkBloom(p, R, p.shape([[-1, 0], [-0.4, -0.5], [0.4, -0.56], [1, -0.1], [0.86, 0.3], [0.2, 0.42], [-0.6, 0.3]].map(([u, v]) => [x + r * (u * Math.cos(a) - v * Math.sin(a)), y + r * (u * Math.sin(a) + v * Math.cos(a))] as const)), { tone: 0.62, soft: 0.9, wander: 0.6, wave: 8, fringe: 0.5, rim: 0.4, rimWidth: 3, mottle: 0.5, cloud: 10, seed });
}
// ---- plum blossom ------------------------------------------------------------------------------------------------------------------
interface BlossomOptions { turn?: number; squash?: number; lean?: number; line?: number; blush?: number; seed: number }
/** A white plum blossom: five paper petals that lap over one another, each drawn with two touches that do not meet, and a red heart. `squash` 1 faces the viewer. */
function blossom(p: InkRisoPen, x: number, y: number, r: number, { turn = 0, squash = 1, lean = 0, line = 0.86, blush = 0.12, seed }: BlossomOptions) {
  const rnd = dice(seed), cl = Math.cos(lean), sl = Math.sin(lean);
  const at = (u: number, v: number): P2 => { const a = u * cl + v * sl, b = (v * cl - u * sl) * squash; return [x + r * (a * cl - b * sl), y + r * (a * sl + b * cl)]; };
  let s = seed * 31;
  p.knock(p.shape(Array.from({ length: 10 }, (_, i) => at(0.2 * Math.cos(i * 0.628), 0.2 * Math.sin(i * 0.628)))));
  const petals = [0, 2, 4, 1, 3].map(i => { const a = turn + i * 1.2566 + 0.4 * (rnd() - 0.5), len = 0.8 + 0.34 * rnd(), w = 0.8 + 0.4 * rnd(), n = 0.02 + 0.1 * rnd(), c = Math.cos(a), k = Math.sin(a); return { side: rnd(), grey: rnd() ** 2, q: (d: number, e: number): P2 => at(len * d * c - w * e * k, len * d * k + w * e * c), n, a }; });
  for (const { q, n, side, grey, a: dir } of petals) {
    const left: [number, number][] = [[0.36, -0.27], [0.6, -0.43], [0.84, -0.41], [0.99, -0.22], [1 - n, 0]], right: [number, number][] = [[1.02, 0.19], [0.88, 0.4], [0.62, 0.44], [0.36, 0.27]], shape = p.shape([q(0.06, 0), ...left.map(v => q(...v)), ...right.map(v => q(...v))]);
    p.knock(shape);
    inkBloom(p, R, shape, { tone: (X, Y) => { const [a, b] = p.local(X, Y); return blush * Math.exp(-((Math.hypot(a - x, b - y) / (0.5 * r)) ** 2)); }, soft: 0.8, wander: 0, fringe: 0, rim: 0.2, rimWidth: 2, mottle: 0.4, cloud: 12, seed: s++ });
    if (blush) inkBloom(p, K, shape, { tone: (X, Y) => { const [a, b] = p.local(X, Y); const u = (a - x) / r, v = (b - y) / r; return 0.06 * Math.exp(-((Math.hypot(u, v) / 0.62) ** 2)) + 0.2 * grey * ss(0.1, 0.5, v * Math.cos(dir) - u * Math.sin(dir)); }, soft: 0.8, wander: 0, fringe: 0, rim: 0.4, rimWidth: 2, mottle: 0.5, cloud: 12, seed: s++ });
    if (line) {
      const touch = (v: readonly (readonly [number, number])[], w: number) => inkThread(p, K, v.map((m, i) => [...q(m[0], m[1]), [0.2, 0.8, 1, 0.8, 0.3, 0.04][Math.min(5, i)]] as const), w * (r / 36), { ink: line, inkEnd: line * 0.5, seed: s++ });
      touch(left, lerp(1.1, 2.1, side)); if (grey < 0.72) touch([[1 - n, 0.03] as const, ...right], lerp(2, 1, side));
    }
  }
  // the heart: a wet touch, and stamens no two as long
  const n = 10 + Math.round(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * 6.283 + 0.3 * (rnd() - 0.5), l = 0.3 + 0.28 * rnd(), c = Math.cos(a), k = Math.sin(a), e = at(l * c, l * k);
    inkThread(p, R, [[...at(0.06 * c, 0.06 * k), 0.8], [...at(0.6 * l * c - 0.03 * k, 0.6 * l * k + 0.03 * c), 0.7], [...e, 0.5]], 0.9 * (r / 36), { ink: 0.9, inkEnd: 0.8, seed: s++ });
    p.wash(rnd() < 0.3 ? K : R, p.disc(e[0], e[1], (0.02 + 0.02 * rnd()) * r), { tone: 0.95 }, true);
  }
  const heart = at(0.02, 0.02);
  inkBloom(p, R, inkBlob(p, [[heart[0] - 0.03 * r, heart[1], 0.09 * r], [heart[0] + 0.05 * r, heart[1] - 0.02 * r, 0.075 * r]]), { tone: 0.9, soft: 0.8, wander: 0.8, wave: 5, fringe: 0.4, rim: 0.3, rimWidth: 2, mottle: 0.4, cloud: 6, seed: s++ });
}
/** A bud on its stalk: a drop of cinnabar or of paper, held by two dark touches. */
function bud(p: InkRisoPen, x: number, y: number, r: number, angle: number, o: { red?: number; seed: number; white?: boolean }) {
  const c = Math.cos(angle), k = Math.sin(angle), q = (d: number, e: number): P2 => [x + r * (d * c - e * k), y + r * (d * k + e * c)], shape = p.shape([q(-0.8, 0), q(-0.4, -0.62), q(0.3, -0.74), q(0.9, -0.36), q(1.06, 0.05), q(0.84, 0.44), q(0.24, 0.76), q(-0.46, 0.6)]);
  p.knock(shape);
  if (!o.white) inkBloom(p, R, shape, { tone: o.red ?? 0.7, soft: 0.8, wander: 0.5, wave: 6, fringe: 0.4, rim: 0.4, rimWidth: 3, mottle: 0.5, cloud: 8, seed: o.seed });
  else { inkBloom(p, R, shape, { tone: 0.14, soft: 1, wander: 0.4, wave: 6, rim: 0.4, rimWidth: 2, mottle: 0.5, cloud: 8, seed: o.seed }); inkThread(p, K, [[...q(-0.5, -0.6), 0.5], [...q(0.3, -0.76), 1], [...q(0.95, -0.34), 0.6], [...q(1.06, 0.06), 0.1]], 1.6, { ink: 0.7, seed: o.seed + 1 }); }
  for (const e of [-1, 1]) inkThread(p, K, [[...q(-1.05, 0), 1], [...q(-0.6, 0.5 * e), 0.9], [...q(-0.1, 0.66 * e), 0.1]], 0.3 * r, { ink: 0.95, seed: o.seed + 2 + e });
}
/** Paper along a stroke, as cover and not as wiped ink, so that it also stands before ink that lies on a layer further back. */
function ground(p: InkRisoPen, q: readonly N3[], width: number) {
  const w = (t: number) => { const x = t * (q.length - 1), i = Math.min(q.length - 2, Math.floor(x)); return 0.5 * width * lerp(q[i][2] ?? 1, q[i + 1][2] ?? 1, x - i); }, line = q.map(v => [v[0], v[1]] as const);
  p.knock(p.shape([...aside(line, w), ...[...aside(line, t => -w(t))].reverse()]));
}
/** The spray in her hair, over the place where the coil is bound. */
function drawSpray(p: InkRisoPen) {
  const on = (q: readonly (readonly [number, number, number])[]): N3[] => q.map(([x, y, k]) => [...onPage(x, y), k] as const);
  const twig = (q: readonly (readonly [number, number, number])[], w: number, seed: number) => { const n = on(q); ground(p, n, w * 0.86 * Z); inkThread(p, K, n, w * 0.62 * Z, { ink: 0.86, seed }); };
  twig([[1.5, -2.3, 0.4], [1.7, -2.2, 0.9], [1.9, -2.04, 1], [2.04, -1.8, 0.9], [2.1, -1.52, 0.6], [2.08, -1.34, 0.1]], 5, 1200);
  twig([[1.98, -1.9, 0.8], [2.2, -1.86, 0.6], [2.34, -1.72, 0.1]], 4, 1201);
  const at = (x: number, y: number) => onPage(x, y);
  const b = (x: number, y: number, r: number, o: BlossomOptions) => { const q = at(x, y); blossom(p, q[0], q[1], r * Z, o); }, d = (x: number, y: number, r: number, a: number, o: Parameters<typeof bud>[5]) => { const q = at(x, y); bud(p, q[0], q[1], r * Z, a, o); };
  d(2.08, -1.3, 7, 1.2, { red: 0.75, seed: 1210 }); d(2.36, -1.69, 6.6, 2.4, { red: 0.8, seed: 1215 }); d(2.13, -1.5, 5.6, 2, { red: 0.6, seed: 1220 }); d(1.46, -2.33, 5.6, -0.6, { red: 0.7, seed: 1221 });
  b(2.06, -1.68, 20, { turn: 0.5, squash: 0.66, lean: 0.7, line: 0.4, seed: 1230 });
  b(1.64, -2.22, 23, { turn: 0.2, squash: 0.74, lean: -0.5, line: 0.4, seed: 1240 });
  b(1.9, -1.98, 31, { turn: -0.3, squash: 0.94, lean: 0.2, line: 0.4, seed: 1250 });
}
/** The branch she looks toward: an old limb that turns in angles, dragged with a drying brush, straight young shoots off its outer sides, a few blossoms. */
function drawBranch(p: InkRisoPen) {
  let s = 1300;
  const wood = (q: N3[], w: number, o: Partial<Parameters<typeof inkSide>[4]> = {}) => inkSide(p, K, q, w, { tip: 0.95, belly: 0.5, side: 1, head: 0.24, rim: 0.1, dry: 0.3, dryEnd: 0.9, bristles: w * 0.5, grain: 1.5, seed: s++, ...o });
  const shoot = (q: N3[], w: number, o: Partial<Parameters<InkRisoPen["line"]>[3]> = {}) => p.line(K, q, w, { rough: 0.3, slant: 0.2, dryEnd: 0.25, seed: s++, ...o });
  const dab = (x: number, y: number, r: number, a: number, tone = 0.95) => inkBloom(p, K, inkBlob(p, [[x - Math.cos(a) * r * 0.7, y - Math.sin(a) * r * 0.7, r * 0.8], [x, y, r], [x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, r * 0.55]]), { tone, soft: 0.8, wander: r * 0.2, wave: 7, fringe: 0.7, rim: 0.2, mottle: 0.3, cloud: 9, seed: s++ });
  // what stands behind the wood
  shoot([[1090, 1010, 0.8], [1084, 972, 0.6], [1066, 924, 0.5], [1058, 884, 0.45], [1060, 836, 0.4], [1052, 792, 0.05]], 8.4); shoot([[1064, 918, 0.7], [1082, 884, 0.5], [1110, 846, 0.4], [1118, 816, 0.04]], 6, { dryEnd: 0.5 });
  bud(p, 1069, 846, 8, -0.75, { seed: 1341, red: 0.8 }); bud(p, 1048, 858, 7, 3.6, { seed: 1342, red: 0.55 }); bud(p, 1059, 806, 6, -1.0, { seed: 1348, red: 0.9 }); bud(p, 1116, 857, 6.4, -0.1, { seed: 1349, red: 0.5 });
  blossom(p, 1032, 962, 27, { turn: 0.8, squash: 0.55, lean: 0.2, seed: 1390 });
  // ---- the limb: a pale wet body first, then the brush dragged along its lower side, turned hard at every joint
  inkBloom(p, K, p.shape([[1236, 1084], [1190, 1062], [1150, 1048], [1122, 1032], [1104, 1004], [1078, 996], [1046, 986], [1014, 984], [994, 960], [966, 938], [958, 944], [982, 968], [1000, 1000], [1044, 1006], [1080, 1016], [1098, 1046], [1132, 1066], [1182, 1086], [1236, 1124]]), { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.1 + 0.34 * ss(0.4, 0.7, inkFbm2(7, x / 30, y / 18, 3)); }, soft: 2, wander: 5, wave: 22, fringe: 1.4, rim: 0.3, rimWidth: 4, mottle: 0.6, cloud: 20, seed: s++ });
  wood([[1236, 1112, 1], [1190, 1078, 0.8], [1154, 1064, 0.75], [1124, 1048, 1], [1104, 1026, 0.5]], 34); wood([[1122, 1052, 0.6], [1098, 1030, 1], [1086, 1008, 0.8], [1052, 996, 0.6], [1022, 996, 0.9], [1004, 984, 0.4]], 23, { dryEnd: 0.8 }); wood([[1018, 1002, 0.5], [1000, 984, 1], [984, 958, 0.7], [958, 936, 0.6]], 17); wood([[966, 946, 0.8], [940, 930, 0.6], [912, 926, 0.8], [890, 904, 0.5], [872, 872, 0.1]], 11.5, { dry: 0.15, dryEnd: 0.7 });
  // the brush nearly empty along the light side, and the bark's short touches
  for (const [q, w] of [[[[1216, 1086, 0.2], [1166, 1058, 0.8], [1132, 1042, 0.3]], 8], [[[1094, 1004, 0.2], [1052, 988, 0.8], [1018, 986, 0.2]], 5]] as const) shoot(q as unknown as N3[], w, { rough: 0.8, dryEnd: 1, opacity: 0.8 } as never);
  for (const [x, y, r, a, t] of [[1200, 1094, 5, 0.9, 0.9], [1186, 1084, 3, 0.8, 0.7], [1160, 1066, 4.4, 1, 0.95], [1128, 1050, 8, 0.9, 0.95], [1114, 1036, 4, 1.3, 0.8], [1096, 1018, 6, 1.1, 0.95], [1060, 1000, 3, 0.7, 0.7], [1020, 994, 6, 0.9, 0.95], [1008, 984, 3.4, 1.2, 0.8], [980, 952, 5, 0.9, 0.95], [940, 930, 2.8, 0.4, 0.8], [908, 924, 4.4, 1, 0.95], [1172, 1050, 3.6, -0.6, 0.9], [1162, 1046, 2.4, -0.7, 0.8], [1180, 1056, 2, -0.4, 0.7], [1070, 988, 2.6, -0.5, 0.8], [1062, 985, 1.8, -0.5, 0.7]] as const) dab(x, y, r, a, t);
  // ---- shoots before it
  shoot([[1020, 990, 1], [1000, 1008, 0.7], [962, 1018, 0.6], [938, 1044, 0.5], [904, 1070, 0.35], [882, 1096, 0.04]], 8.6); shoot([[964, 1016, 0.8], [936, 1012, 0.5], [906, 998, 0.35], [890, 982, 0.04]], 5, { dryEnd: 0.5 });
  shoot([[980, 950, 1], [972, 918, 0.6], [954, 884, 0.5], [944, 850, 0.3], [930, 812, 0.2], [930, 778, 0.04]], 7.4); shoot([[908, 924, 1], [880, 926, 0.6], [852, 934, 0.5], [828, 930, 0.3], [800, 936, 0.04]], 6, { dryEnd: 0.5 });
  shoot([[1150, 1062, 0.9], [1140, 1096, 0.5], [1118, 1122, 0.35], [1112, 1146, 0.03]], 6, { dryEnd: 0.6 });
  bud(p, 838, 922, 8.5, -2.0, { seed: 1343 }); bud(p, 818, 941, 7, 2.4, { seed: 1351, red: 0.5 }); bud(p, 892, 1069, 8, 3.5, { seed: 1344, red: 0.6 }); bud(p, 907, 1080, 6.4, 1.2, { seed: 1352, red: 0.9 }); bud(p, 910, 991, 7, -1.9, { seed: 1345, red: 0.5 }); bud(p, 926, 823, 7, 3.6, { seed: 1353, red: 0.85 }); bud(p, 937, 800, 5.6, -0.6, { seed: 1354, red: 0.5 }); bud(p, 1126, 1128, 7, 0.9, { seed: 1347, red: 0.6 });
  blossom(p, 952, 862, 31, { turn: 1.1, squash: 0.72, lean: -0.5, seed: 1360 });
  blossom(p, 932, 1046, 28, { turn: 0.1, squash: 0.6, lean: 0.5, seed: 1370 });
  blossom(p, 872, 872, 41, { turn: -0.2, squash: 0.9, lean: 0.6, seed: 1380 });
  blossom(p, 1088, 988, 24, { turn: 2.2, squash: 0.8, lean: 1.2, seed: 1350 });
}

// ---- ornaments ---------------------------------------------------------------------------------------------------------------------
function bead(p: InkRisoPen, x: number, y: number, rx: number, ry: number, o: { plate?: string; tone?: number; seed: number }) {
  const shape = p.shape(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283; return [x + Math.sin(a) * rx * (1 - 0.18 * Math.cos(a) * (ry > rx ? 1 : 0)), y - Math.cos(a) * ry] as const; }));
  p.knock(shape);
  if (o.plate) { inkBloom(p, o.plate, shape, { tone: o.tone ?? 0.8, soft: 0.8, wander: 0.3, wave: 5, fringe: 0.2, rim: 0.4, rimWidth: 2.4, mottle: 0.4, cloud: 8, seed: o.seed }); if (o.plate !== K) p.lift([[x - rx * 0.4, y - ry * 0.3, 0.2], [x - rx * 0.36, y, 1], [x - rx * 0.3, y + ry * 0.22, 0.2]], rx * 0.36, [o.plate]); }
  else { inkBloom(p, K, shape, { tone: (X, Y) => { const [a, b] = p.local(X, Y); return 0.2 * ss(0.2, 1, (a - x) / rx + (b - y) / ry); }, soft: 0.8, wander: 0, fringe: 0, rim: 0, mottle: 0.3, cloud: 8, seed: o.seed }); inkThread(p, K, [[x - rx * 0.3, y - ry * 0.95, 0.5], [x + rx * 0.62, y - ry * 0.8, 0.8], [x + rx, y + ry * 0.1, 1], [x + rx * 0.5, y + ry * 0.88, 1], [x - rx * 0.5, y + ry * 0.88, 0.8], [x - rx, y, 0.5], [x - rx * 0.66, y - ry * 0.72, 0.1]], 1.6, { ink: 0.9, inkEnd: 0.6, seed: o.seed }); }
}
const HOOK: P2 = onPage(2.66, -2.82);
type Bead = Parameters<typeof bead>[5];
/** Beads strung from a place on the head, at the head's own size. */
const strung = (p: InkRisoPen, [x, y]: P2) => ({ bead: (u: number, v: number, rx: number, ry: number, o: Bead) => bead(p, x + Z * u, y + Z * v, Z * rx, Z * ry, o), at: (u: number, v: number, k: number): N3 => [x + Z * u, y + Z * v, k] });
/** 步搖: the pin behind the blossoms, and the chain that swings from its head. */
function drawPin(p: InkRisoPen) {
  const { bead: b, at: q } = strung(p, HOOK);
  inkThread(p, K, [q(112, 26, 0.9), q(78, 18, 1), q(40, 9, 0.9), q(11, 2, 0.8)], 5.6 * Z, { ink: 0.97, inkEnd: 0.95, seed: 1400 });
  b(11, 1.6, 3, 6.4, { plate: K, tone: 0.97, seed: 1405 }); b(0, -1, 9.4, 8.8, { seed: 1403 }); b(-12, -3, 4.4, 4.4, { plate: R, tone: 0.95, seed: 1404 });
}
function drawChain(p: InkRisoPen) {
  const { bead: b, at: q } = strung(p, HOOK);
  inkThread(p, K, [q(0, -2, 0.6), q(0.6, 60, 0.7), q(0, 122, 0.6), q(-0.4, 184, 0.5)], 1.3, { ink: 0.8, inkEnd: 0.7, seed: 1410 });
  for (const [i, [d, r]] of ([[14, 2.2], [25, 2.6], [37, 2.2], [74, 2.4], [86, 2.1], [99, 2.5], [142, 2.2], [153, 2]] as const).entries()) b(i % 2 ? 0.5 : -0.3, d, r, r, { plate: K, tone: 0.95, seed: 1420 + i });
  b(0, 55, 6.4, 6.8, { seed: 1430 }); b(0.2, 121, 6, 9.5, { plate: B, tone: 0.8, seed: 1431 }); b(-0.2, 170, 4, 4.4, { seed: 1432 }); b(-0.3, 190, 4.4, 8, { plate: R, tone: 0.95, seed: 1433 });
}
/** Where the earring hangs: a little above the foot of the lobe. */
const LOBE: P2 = (q => onPage(q[0], q[1] - 0.05))(HEAD.ear.map(q => HEAD.fromLevel(q)).reduce((a, q) => (q[1] > a[1] ? q : a)));
function drawEarring(p: InkRisoPen) {
  const { bead: b, at: q } = strung(p, LOBE);
  inkThread(p, K, [q(-1, -6, 0.6), q(-3.4, 1, 1), q(-0.6, 7, 0.8), q(2, 2, 0.2)], 1.6 * Z, { ink: 0.9, seed: 1440 });
  inkThread(p, K, [q(-0.4, 7, 0.7), q(0, 30, 0.6), q(0, 54, 0.5)], 1.4 * Z, { ink: 0.85, seed: 1441 });
  b(-0.3, 14, 3, 3, { plate: K, tone: 0.95, seed: 1442 }); b(0, 29, 5.6, 8.6, { plate: B, tone: 0.82, seed: 1443 }); b(0, 44, 2.6, 2.6, { plate: K, tone: 0.95, seed: 1444 }); b(0, 58, 4, 7, { plate: R, tone: 0.95, seed: 1445 });
}
/** What has come loose: long fine hairs over the near temple and before the ear, a thin lock and a long curl past the far cheek, wisps at the nape. */
function drawStrands(f: InkRisoPen) {
  const h = gongbiHand(f, HEAD, GONGBI, 12), soft = colour("#6f6257", 0);
  lines(h, [
    // from the hairline over the brow and the temple
    [[[0.5, -1.0], [0.64, -0.74], [0.74, -0.46], [0.82, -0.18], [0.92, 0.1], [1.0, 0.36], [1.03, 0.6]], 0.0115, 0.62, 0.008, soft], [[[0.5, -1.0], [0.62, -0.78], [0.7, -0.52], [0.76, -0.26], [0.86, -0.02], [1.0, 0.16]], 0.007, 0.5, 0.007, soft], [[[0.38, -1.08], [0.54, -0.84], [0.68, -0.58], [0.84, -0.36], [1.0, -0.2]], 0.006, 0.42, 0.008, soft],
    [[[0.86, -0.72], [1.0, -0.42], [1.1, -0.1], [1.17, 0.22], [1.19, 0.48], [1.16, 0.7]], 0.006, 0.5, 0.007, soft],
    [[[1.0, -0.5], [1.14, -0.22], [1.24, 0.06], [1.3, 0.36], [1.31, 0.68], [1.26, 0.98], [1.14, 1.22], [1.02, 1.34]], 0.0085, 0.72, 0.006, STRAND], [[[1.14, -0.2], [1.24, 0.02], [1.31, 0.24], [1.33, 0.5], [1.29, 0.74]], 0.009, 0.6, 0.008, STRAND], [[[1.2, -0.1], [1.32, 0.08], [1.38, 0.26], [1.39, 0.42]], 0.007, 0.6, 0.007, STRAND],
    // before the far temple and down past the cheek
    [[[-0.79, -0.6], [-0.81, -0.36], [-0.785, -0.06], [-0.745, 0.28], [-0.73, 0.62], [-0.76, 0.94], [-0.83, 1.24], [-0.91, 1.48], [-0.94, 1.66]], 0.014, 0.8, 0.008, STRAND], [[[-0.8, -0.5], [-0.8, -0.2], [-0.77, 0.1], [-0.71, 0.42], [-0.7, 0.74], [-0.75, 1.04]], 0.007, 0.7, 0.006, colour("#3a302a", 0)],
    // past the far cheek: one long curl that leaves the crown and comes back in
    [[[-0.98, -1.3], [-1.14, -0.92], [-1.2, -0.46], [-1.14, 0.02], [-1, 0.44], [-0.8, 0.76], [-0.66, 0.88]], 0.0075, 0.72, 0.006, soft], [[[-0.9, -0.5], [-1.02, -0.2], [-1.04, 0.14], [-0.94, 0.5], [-0.78, 0.82]], 0.006, 0.6, 0.006, soft], [[[-1.14, 0.02], [-1.06, 0.36], [-0.9, 0.62], [-0.74, 0.74]], 0.006, 0.5, 0.007, soft],
    [[[-0.82, -0.4], [-0.94, -0.54], [-1.0, -0.8]], 0.007, 0.6, 0.008, STRAND], [[[-0.8, -0.38], [-0.9, -0.28], [-0.99, -0.34], [-1.04, -0.5]], 0.006, 0.6, 0.006, STRAND], [[[-0.78, -0.24], [-0.87, -0.12], [-0.96, -0.16]], 0.005, 0.56, 0.006, STRAND], [[[-0.75, 0.7], [-0.84, 1.04], [-0.98, 1.36], [-1.03, 1.7], [-0.96, 2.0], [-0.84, 2.12]], 0.006, 0.6, 0.006, soft],
    // over the crown
    [[[-0.3, -2.3], [-0.6, -2.12], [-0.88, -1.78], [-1.04, -1.42], [-1.1, -1.2]], 0.004, 0.5, 0.006, soft], [[[-0.8, -1.8], [-1.0, -1.6], [-1.12, -1.3], [-1.16, -1.0]], 0.0035, 0.5, 0.006, soft], [[[0.2, -2.5], [-0.16, -2.46], [-0.46, -2.3], [-0.66, -2.08]], 0.0035, 0.5, 0.006, soft], [[[2.3, -0.66], [2.42, -0.9], [2.4, -1.3], [2.24, -1.66], [2.04, -1.9]], 0.0045, 0.5, 0.006, soft],
    // at the nape
    [[[1.5, 0.52], [1.62, 0.7], [1.68, 0.9], [1.62, 1.1], [1.54, 1.2]], 0.005, 0.6, 0.006, STRAND], [[[1.46, 0.56], [1.48, 0.8], [1.44, 1.04], [1.34, 1.26], [1.22, 1.36]], 0.006, 0.66, 0.006, STRAND], [[[1.44, 0.6], [1.43, 0.84], [1.36, 1.06], [1.26, 1.18]], 0.004, 0.5, 0.006, STRAND],
  ]);
}
/** 墨梅, and a seal. */
function drawInscription({ page: p }: Pens) {
  const glyph = (x: number, y: number, z: number, strokes: N3[][], w: number) => { for (const st of strokes) p.line(K, st.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2]] as const), w, { rough: 0.4, slant: 0.3, dryEnd: 0.35 }); };
  glyph(1012, 176, 80, [
    [[27, 8, 0.7], [29, 20, 0.8], [31, 36, 0.5]], [[27, 10, 0.5], [50, 7, 0.6], [72, 5, 1], [72, 18, 0.8], [68, 34, 0.6]], [[40, 14, 0.9], [44, 22, 0.3]], [[61, 12, 0.9], [56, 21, 0.2]], [[31, 34, 0.4], [50, 33, 0.6], [69, 32, 0.6]],
    [[50, 8, 0.7], [51, 30, 0.8], [50, 58, 0.7]], [[25, 46, 0.5], [50, 45, 0.6], [76, 42, 0.8]], [[10, 60, 0.8], [40, 58, 0.6], [70, 56, 0.7], [91, 56, 1]],
    [[21, 66, 0.4], [17, 72, 0.9], [13, 77, 0.6]], [[38, 67, 0.5], [41, 75, 1]], [[57, 66, 0.5], [61, 74, 1]], [[76, 64, 0.5], [82, 69, 0.9], [88, 75, 0.8]],
    [[31, 88, 0.6], [50, 86, 0.6], [70, 84, 0.9]], [[50, 76, 0.8], [51, 90, 0.9], [50, 104, 0.8]], [[8, 108, 0.9], [38, 105, 0.6], [68, 103, 0.7], [94, 104, 1]],
  ], 8.4);
  glyph(1014, 284, 78, [
    [[3, 36, 0.7], [22, 33, 0.6], [39, 29, 0.9]], [[22, 4, 0.8], [23, 30, 0.8], [22, 66, 0.8], [23, 98, 0.9]], [[22, 36, 0.7], [15, 54, 0.6], [3, 71, 0.05]], [[26, 44, 0.4], [36, 54, 0.9]],
    [[60, 2, 0.8], [55, 14, 0.7], [44, 30, 0.05]], [[55, 18, 0.5], [74, 15, 0.6], [93, 13, 0.9]],
    [[58, 32, 0.7], [54, 54, 0.7], [49, 79, 0.8], [68, 78, 0.5], [92, 76, 0.7]], [[59, 33, 0.5], [74, 31, 0.6], [89, 30, 0.9], [87, 60, 0.8], [83, 90, 0.9], [77, 97, 0.7], [69, 90, 0.05]], [[67, 39, 0.5], [72, 47, 0.9]], [[64, 60, 0.5], [69, 69, 0.9]], [[41, 57, 0.7], [70, 54, 0.6], [99, 53, 0.9]],
  ], 8);
  // ---- seal: 玉, cut white into red
  const [x, y, z] = [1034, 394, 40];
  inkBloom(p, R, p.shape([[x, y + 1], [x + z * 0.5, y], [x + z, y + 1], [x + z - 0.5, y + z * 0.5], [x + z, y + z], [x + z * 0.5, y + z - 0.5], [x, y + z], [x + 0.6, y + z * 0.5]]), { tone: 0.95, soft: 0.5, wander: 0.8, wave: 14, fringe: 0.4, rim: 0.2, mottle: 0.3, cloud: 14, seed: 901 });
  const cut = (pts: N3[], w: number) => p.lift(pts.map(q => [x + (q[0] / 100) * z, y + (q[1] / 100) * z, q[2] ?? 1] as const), w, [R]);
  cut([[24, 22, 0.8], [50, 21, 1], [77, 23, 0.8]], 4); cut([[28, 48, 0.8], [50, 47, 1], [72, 48, 0.8]], 4); cut([[17, 78, 0.8], [50, 77, 1], [84, 79, 0.9]], 4); cut([[50, 21, 0.9], [51, 50, 1], [50, 78, 0.9]], 4); cut([[63, 60, 0.7], [72, 67, 1]], 4);
}
// ---- the figure in layers ---------------------------------------------------------------------------------------------------------
const LIDS: Readonly<Record<string, number>> = { open: 1, half: 0.5, shut: 0.04 };
const pens = (c: InkPaintContext): Pens => { const p = c.pens(FRAMES); return { ...p, face: mirror(p.face) }; };
const paint = (draw: (p: Pens) => void) => (c: InkPaintContext) => draw(pens(c));
const BREATH = { kind: "breathe", at: [520, 1500], amount: 0.0045, seconds: 5 } as const;
export interface InkMomeiOptions {
  /** The ink thrown behind her, the plum branch with its loose petals, and the name with its seal (default: all). */
  wash?: boolean; branch?: boolean; name?: boolean;
  /** How far the scarf, the branch, loose hair and the hanging beads move (default 1). */
  wind?: number;
}
/** 墨梅 in layers. She breathes and blinks slowly; the beads of her hairpin and earring swing, the scarf, the branch and her loose hair move in a light wind. */
export function inkMomei({ wash = true, branch = true, name = true, wind = 1 }: InkMomeiOptions = {}): InkSubject {
  const shown: Readonly<Record<string, boolean>> = { wash, branch, petals: branch, name };
  const fall: InkPart["motion"] = [BREATH, { kind: "sway", from: [700, 900], to: [850, 1640], amount: 12 * wind, seconds: 6, lag: 0.34, power: 2.4, lean: 0.25 }];
  const parts: InkPart[] = [
    { id: "wash", draw: paint(drawSplash), depth: -0.25 },
    { id: "branch", draw: c => drawBranch(c.pens({ bough: { x: 14, y: -80, scale: 1 } }).bough), depth: 0.12, motion: [{ kind: "sway", from: [1250, 1024], to: [876, 792], amount: 6 * wind, seconds: 7.2, lag: 0.16, power: 1.5, lean: 0.1 }] },
    { id: "petals", draw: paint(drawPetals), depth: 0.2, motion: [{ kind: "drift", by: [-16 * wind, 22 * wind], back: 8 }] },
    { id: "under", only: "film", group: "head", draw: c => inkCover(c.page, c.page.shape(COVER)) },
    { id: "scarf-back", draw: paint(p => { hangs(BEHIND)(p); gauze(BEHIND, 1100)(p); }), motion: [BREATH] },
    { id: "scarf-under", only: "film", draw: paint(hangs(FALL)), motion: fall },
    { id: "body", draw: c => { paint(drawBody)(c); inkFade(c.page, [0, 1440, PAGE.width, 160], FOOT, { coverOnly: true }); }, motion: [BREATH] },
    { id: "scarf", draw: paint(gauze(OVER_ARM, 1000)), motion: [BREATH] },
    { id: "scarf-end", draw: paint(gauze(FALL, 1200)), motion: fall },
    { id: "face", group: "head", poses: { kind: "blink", open: "open", order: ["half", "shut"], every: 5.2, seconds: 0.36 }, draw: c => drawFace(pens(c).face, HEAD, LIDS[c.pose] ?? 1) },
    { id: "hair", group: "head", draw: paint(p => drawSides(p.face)) },
    { id: "chignon", group: "head", draw: paint(p => { drawCoil(p.face); drawPin(p.page); }) },
    { id: "flowers", group: "head", draw: paint(p => drawSpray(p.page)) },
    { id: "pin", group: "head", draw: paint(p => drawChain(p.page)), motion: [{ kind: "turn", at: HOOK, degrees: 2.6 * wind, seconds: 3.4 }] },
    { id: "tress", group: "head", draw: paint(p => drawTress(p.face)), motion: [{ kind: "sway", from: onPage(1.64, 1), to: onPage(1.36, 4.64), amount: 9 * wind, seconds: 6.2, lag: 0.26, power: 2, lean: 0.3, phase: 1.3 }] },
    { id: "strands", group: "head", draw: paint(p => drawStrands(p.face)), motion: [{ kind: "sway", from: onPage(0.4, -0.6), to: onPage(0.5, 1.2), amount: 6 * wind, seconds: 5.4, lag: 0.3, power: 1.8, lean: 0.3, phase: 2.2 }] },
    { id: "earring", group: "head", draw: paint(p => drawEarring(p.page)), motion: [{ kind: "turn", at: LOBE, degrees: 2.4 * wind, seconds: 2.9, phase: 0.7 }] },
    { id: "name", draw: paint(drawInscription) },
  ];
  return { id: "momei", label: "Half figure of a girl turned to the right beside a branch of plum blossom: her hair parted in the middle and wound into a coil with one hollow loop hanging behind it, white blossom and a swinging chain of beads, one long tress tied with a red cord over her shoulder, a white robe with a broad dark collar and an indigo sash, a long shawl of rose gauze over one shoulder and in the crook of the other arm", page: PAGE, plates: PLATES, paper: "#F8F1E3", seed: 23, groups: { head: [{ kind: "turn", at: [547, 817], degrees: 0.42, seconds: 7.4 }, BREATH] }, parts: inkPaintOrder(parts.filter(p => shown[p.id] ?? true), ["under", "hair", "chignon", "face", "flowers", "pin", "strands", "tress", "earring", "body", "scarf", "scarf-end", "scarf-under", "scarf-back", "wash", "branch", "petals", "name"], ["face"]) };
}
