import { RisoCharacterInk, RisoCharacterKnockout } from "../../registry/video/riso-character-react";
import { RisoPrint } from "../../registry/video/print-plates-react";
import type { RisoCharacterSpec, RisoJoint } from "../../registry/video/riso-character";
import type { RisoPrintSpec } from "../../registry/video/print-plates";
import type { RisoPaint, RisoArtwork } from "../../registry/video/print-plates-react";
import type { ReactNode } from "react";

export type RisoPerformanceAspect = "landscape" | "portrait";
const waveKeys = (end = 239): RisoJoint["keys"] => [
  { frame: 0, rotate: -10, easing: "ease" },
  { frame: 16, rotate: 12, easing: "ease" },
  { frame: 36, rotate: -10, easing: "ease" },
  { frame: 58, rotate: 12, easing: "ease" },
  { frame: 83, rotate: -10, easing: "ease" },
  { frame: 108, rotate: 11, easing: "ease" },
  { frame: 138, rotate: -9, easing: "ease" },
  { frame: 163, rotate: 12, easing: "ease" },
  { frame: 190, rotate: -10, easing: "ease" },
  { frame: end, rotate: -10 },
];
/** Original paper messenger — arbitrary joint tree, not a hard-coded humanoid renderer. */
export const COURIER: RisoCharacterSpec = {
  version: 1, id: "courier", durationFrames: 240, cadence: 2,
  joints: [
    { id: "root", x: 0, y: 0, keys: [
      { frame: 0, x: 50, y: 0, easing: "ease" },
      { frame: 105, x: 125, y: -7, easing: "ease" },
      // Settle weight upward into a fully extended neutral stance after the
      // final footfall instead of finishing in a permanent crouch.
      { frame: 198, x: 188, y: -13, easing: "ease" },
      { frame: 205, x: 192, y: -12, easing: "ease" },
      { frame: 239, x: 192, y: -12 },
    ] },
    { id: "body", parent: "root", x: 0, y: -72, keys: [
      // Four rising/falling weight changes per 66-frame gait cycle, synchronized
      // with alternating foot contacts. Motion settles when locomotion ends.
      { frame: 0, y: 0, rotate: 0, easing: "ease" },
      { frame: 16, y: -4.5, rotate: 1.3, easing: "ease" },
      { frame: 33, y: 0, rotate: -1, easing: "ease" },
      { frame: 49, y: -4.5, rotate: .9, easing: "ease" },
      { frame: 66, y: 0, rotate: 0, easing: "ease" },
      { frame: 82, y: -4.5, rotate: 1.3, easing: "ease" },
      { frame: 99, y: 0, rotate: -1, easing: "ease" },
      { frame: 115, y: -4.5, rotate: .9, easing: "ease" },
      { frame: 132, y: 0, rotate: 0, easing: "ease" },
      { frame: 148, y: -4.5, rotate: 1.3, easing: "ease" },
      { frame: 165, y: 0, rotate: -1, easing: "ease" },
      { frame: 181, y: -4.5, rotate: .9, easing: "ease" },
      { frame: 198, y: 0, rotate: 0, easing: "ease" },
      { frame: 239, y: 0, rotate: 0 },
    ] },
    { id: "head", parent: "body", x: 0, y: -68, keys: [
      { frame: 0, rotate: -3, easing: "ease" },
      { frame: 77, rotate: 3, easing: "ease" },
      { frame: 154, rotate: -8, easing: "ease" },
      { frame: 200, rotate: 0 },
    ] },
    { id: "left-arm", parent: "body", x: -24, y: -44, keys: waveKeys() },
    { id: "left-elbow", parent: "left-arm", x: 0, y: 28, keys: [
      { frame: 0, rotate: -12, easing: "ease" }, { frame: 32, rotate: 20, easing: "ease" },
      { frame: 64, rotate: -12, easing: "ease" }, { frame: 96, rotate: 18, easing: "ease" },
      { frame: 140, rotate: -8, easing: "ease" }, { frame: 200, rotate: 12 }, { frame: 239, rotate: 12 },
    ] },
    { id: "left-hand", parent: "left-elbow", x: 0, y: 24 },
    // Palm -> individual digits: all are genuinely joint-local and keep
    // anatomical roots, even under the moving elbow rig.
    { id: "left-thumb", parent: "left-hand", x: -7, y: -4,
      keys: [{frame:0,rotate:-8,easing:"ease"},{frame:92,rotate:15,easing:"ease"},
        {frame:160,rotate:4,easing:"ease"},{frame:198,rotate:-14,easing:"ease"},{frame:239,rotate:-14}] },
    { id: "left-index", parent: "left-hand", x: 6, y: 1,
      keys: [{frame:0,rotate:7,easing:"ease"},{frame:92,rotate:-8,easing:"ease"},
        {frame:160,rotate:13,easing:"ease"},{frame:198,rotate:-5,easing:"ease"},{frame:239,rotate:-5}] },
    { id: "left-middle", parent: "left-hand", x: 2, y: 7,
      keys: [{frame:0,rotate:3,easing:"ease"},{frame:92,rotate:-11,easing:"ease"},
        {frame:160,rotate:9,easing:"ease"},{frame:198,rotate:0},{frame:239,rotate:0}] },
    { id: "left-ring", parent: "left-hand", x: -4, y: 7,
      keys: [{frame:0,rotate:-4,easing:"ease"},{frame:92,rotate:-10,easing:"ease"},
        {frame:160,rotate:6,easing:"ease"},{frame:198,rotate:4},{frame:239,rotate:4}] },
    { id: "right-arm", parent: "body", x: 24, y: -44, keys: [
      { frame: 0, rotate: 14, easing: "ease" }, { frame: 65, rotate: -9, easing: "ease" },
      { frame: 137, rotate: 25, easing: "ease" }, { frame: 187, rotate: 42, easing: "ease" },
      { frame: 239, rotate: 42 },
    ] },
    { id: "left-leg", parent: "root", x: -15, y: -62, keys: waveKeys() },
    { id: "left-knee", parent: "left-leg", x: 0, y: 40 },
    { id: "left-ankle", parent: "left-knee", x: 0, y: 36 },
    { id: "right-leg", parent: "root", x: 15, y: -62, keys: [
      { frame: 0, rotate: 13, easing: "ease" }, { frame: 16, rotate: -12, easing: "ease" },
      { frame: 36, rotate: 13, easing: "ease" }, { frame: 58, rotate: -12, easing: "ease" },
      { frame: 83, rotate: 13, easing: "ease" }, { frame: 108, rotate: -12, easing: "ease" },
      { frame: 138, rotate: 13, easing: "ease" }, { frame: 163, rotate: -12, easing: "ease" },
      { frame: 190, rotate: 13, easing: "ease" }, { frame: 239, rotate: 13 },
    ] },
    { id: "right-knee", parent: "right-leg", x: 0, y: 40 },
    { id: "right-ankle", parent: "right-knee", x: 0, y: 36 },
    { id: "right-elbow", parent: "right-arm", x: 0, y: 28, keys: [
      { frame: 0, rotate: 6, easing: "ease" }, { frame: 40, rotate: -20, easing: "ease" },
      { frame: 80, rotate: 10, easing: "ease" }, { frame: 142, rotate: -35, easing: "ease" },
      { frame: 180, rotate: -45, easing: "ease" }, { frame: 239, rotate: -45 },
    ] },
    { id: "right-hand", parent: "right-elbow", x: 0, y: 24 },
    // The right hand follows the satchel via IK; separate roots let the
    // fingers close gently without dragging the palm or wrist shape.
    { id: "right-thumb", parent: "right-hand", x: 7, y: -4,
      keys: [{frame:0,rotate:-9,easing:"ease"},{frame:90,rotate:0,easing:"ease"},
        {frame:156,rotate:18,easing:"ease"},{frame:198,rotate:12},{frame:239,rotate:12}] },
    { id: "right-index", parent: "right-hand", x: 6, y: 1,
      keys: [{frame:0,rotate:3,easing:"ease"},{frame:90,rotate:16,easing:"ease"},
        {frame:156,rotate:25,easing:"ease"},{frame:198,rotate:19},{frame:239,rotate:19}] },
    { id: "right-middle", parent: "right-hand", x: 2, y: 7,
      keys: [{frame:0,rotate:0,easing:"ease"},{frame:90,rotate:10,easing:"ease"},
        {frame:156,rotate:18,easing:"ease"},{frame:198,rotate:12},{frame:239,rotate:12}] },
    { id: "right-ring", parent: "right-hand", x: -4, y: 7,
      keys: [{frame:0,rotate:-5,easing:"ease"},{frame:90,rotate:9,easing:"ease"},
        {frame:156,rotate:14,easing:"ease"},{frame:198,rotate:11},{frame:239,rotate:11}] },
    { id: "satchel", parent: "body", x: 29, y: 0, keys: [
      { frame: 0, rotate: -5, easing: "ease" }, { frame: 25, rotate: 6, easing: "ease" },
      { frame: 49, rotate: -5, easing: "ease" }, { frame: 90, rotate: 7, easing: "ease" },
      { frame: 130, rotate: -5, easing: "ease" }, { frame: 180, rotate: 5, easing: "ease" },
      { frame: 239, rotate: -5 },
    ] },
  ],
  ik: [
    { id: "left-foot-lock", root: "left-leg", mid: "left-knee", end: "left-ankle",
      bend: 1, endRotation: 0,
      target: { kind: "walk", startFrame: 0, endFrame: 198, initialX: 35,
        groundY: 0, stride: 46, cycleFrames: 66, stanceFrames: 38,
        phaseFrames: 0, lift: 17, footRoll: 12 } },
    { id: "right-foot-lock", root: "right-leg", mid: "right-knee", end: "right-ankle",
      bend: -1, endRotation: 0,
      target: { kind: "walk", startFrame: 0, endFrame: 198, initialX: 65,
        groundY: 0, stride: 46, cycleFrames: 66, stanceFrames: 38,
        phaseFrames: 33, lift: 17, footRoll: 12 } },
    { id: "satchel-handhold", root: "right-arm", mid: "right-elbow",
      end: "right-hand", bend: -1, endRotation: -12,
      target: { kind: "follow", joint: "satchel", x: 7, y: 4 } },
  ],
  expressions: [
    { frame: 0, name: "neutral" }, { frame: 76, name: "blink" },
    { frame: 81, name: "neutral" }, { frame: 156, name: "speak" },
    { frame: 180, name: "neutral" }, { frame: 198, name: "smile" },
  ],
  parts: [
    { id: "right-thigh", joint: "right-leg", plate: "blue", paint: "solid",
      skin: { tipJoint: "right-knee", baseWidth: 22, tipWidth: 17, overlap: 3.4, bow: 1.2 },
      d: "M-11 -4 Q0 -11 11 -4 L9 31 Q7 43 -6 43 Q-13 34 -11 -4 Z" },
    { id: "right-shin", joint: "right-knee", plate: "blue", paint: "solid",
      skin: { tipJoint: "right-ankle", baseWidth: 17, tipWidth: 15, overlap: 3.6, bow: -0.9 },
      d: "M-8 -2 Q0 -9 8 -2 L9 29 Q6 38 -8 38 Z" },
    { id: "right-boot", joint: "right-ankle", plate: "blue", paint: "solid",
      d: "M-10 -8 Q-3 -13 9 -8 L11 -3 Q22 0 24 7 Q8 13 -13 8 Z" },
    { id: "right-boot-detail", joint: "right-ankle", plate: "red", paint: "solid",
      d: "M-8 3 L2 1 L3 4 L-8 6 Z M-5 7 L16 8 L19 9 Q4 12 -7 10 Z" },
    { id: "left-thigh", joint: "left-leg", plate: "blue", paint: "solid",
      skin: { tipJoint: "left-knee", baseWidth: 22, tipWidth: 17, overlap: 3.4, bow: -1.1 },
      d: "M-11 -4 Q1 -12 11 -4 L10 33 Q7 42 -7 43 Q-13 27 -11 -4 Z" },
    { id: "left-shin", joint: "left-knee", plate: "blue", paint: "solid",
      skin: { tipJoint: "left-ankle", baseWidth: 17, tipWidth: 15, overlap: 3.6, bow: 0.8 },
      d: "M-8 -3 Q1 -10 9 -2 L8 30 Q5 38 -9 38 Z" },
    { id: "left-boot", joint: "left-ankle", plate: "blue", paint: "solid",
      d: "M-11 -8 Q-3 -13 9 -8 L10 -2 Q22 0 24 7 Q8 13 -13 8 Z" },
    { id: "left-boot-detail", joint: "left-ankle", plate: "red", paint: "solid",
      d: "M-8 3 L2 1 L3 4 L-8 6 Z M-5 7 L16 8 L19 9 Q4 12 -7 10 Z" },
    { id: "coat", joint: "body", plate: "blue", paint: "solid",
      d: "M-27 -58 Q-18 -67 -3 -68 Q17 -70 28 -58 Q31 -37 31 -15 Q34 3 35 20 Q20 27 2 25 Q-17 29 -34 20 Q-32 -5 -30 -24 Q-30 -45 -27 -58 Z" },
    { id: "coat-seam", joint: "body", plate: "red", paint: "solid",
      d: "M-7 -57 C-4 -38 -2 -5 1 21 L5 22 Q2 -11 1 -34 L-2 -57 Z" },
    // RISO8: hand-shaped overlapping lapels and a restrained lower-hem print
    // detail, drafted in the existing character's own silhouette.
    { id: "coat-lapel-left", joint: "body", plate: "red", paint: "solid",
      d: "M-27 -54 Q-23 -60 -12 -63 Q-12 -53 -7 -49 L-15 -39 Q-18 -34 -21 -40 Q-25 -46 -27 -54 Z" },
    { id: "coat-lapel-right", joint: "body", plate: "red", paint: "solid",
      d: "M11 -63 Q21 -62 27 -51 Q23 -44 18 -35 L7 -46 Q13 -51 11 -63 Z" },
    { id: "coat-hem-welt", joint: "body", plate: "red", paint: "screen",
      d: "M-29 15 Q-2 26 30 15 L31 19 Q2 32 -30 20 Z" },
    { id: "coat-shoulder-fold", joint: "body", plate: "red", paint: "screen",
      d: "M19 -48 C24 -42 25 -32 26 -24 L23 -27 Q21 -40 16 -42 Z M-24 -49 Q-26 -35 -22 -23 L-25 -25 Q-30 -37 -26 -48 Z" },
    { id: "coat-waist-dart", joint: "body", plate: "red", paint: "screen",
      d: "M18 -9 Q23 -1 24 8 L22 9 Q21 1 16 -5 Z" },
    // Tapered press marks follow fabric tension, rather than uniform hatching.
    { id: "coat-underarm-creases", joint: "body", plate: "red", paint: "screen",
      d: "M-26 -36 C-22 -30 -20 -25 -19 -20 C-22 -24 -25 -29 -26 -36 Z M20 -36 C18 -31 16 -29 14 -24 C16 -30 18 -33 20 -36 Z" },
    // Reinforce tailoring around real tension sites: neckline -> chest and
    // hip -> folded hem. Both irregular strokes remain attached to coat.
    { id: "coat-collar-underfold", joint: "body", plate: "blue", paint: "screen",
      d: "M-17 -59 Q-11 -54 -5 -53 Q-8 -48 -13 -46 Q-17 -50 -17 -59 Z M9 -55 Q17 -56 23 -50 Q19 -45 17 -41 Q13 -45 9 -55 Z" },
    { id: "coat-back-pleat", joint: "body", plate: "red", paint: "screen",
      d: "M-18 1 C-17 10 -12 17 -7 21 Q-14 19 -17 13 Z M9 2 Q14 9 17 20 Q13 18 12 13 Z" },
    { id: "coat-hem-pleats", joint: "body", plate: "red", paint: "screen",
      d: "M-28 10 Q-25 17 -19 22 L-22 22 Q-28 18 -28 10 Z M17 15 Q22 19 30 17 L30 19 Q23 23 18 20 Z" },
    { id: "coat-pocket", joint: "body", plate: "red", paint: "screen",
      d: "M-25 -10 L-8 -10 L-8 3 Q-16 9 -23 3 Z" },
    { id: "pocket-welt", joint: "body", plate: "red", paint: "solid",
      d: "M-25 -12 Q-16 -14 -7 -12 L-7 -10 Q-16 -11 -25 -9 Z" },
    { id: "coat-buttons", joint: "body", plate: "red", paint: "solid",
      d: "M4 -37 L8 -40 L12 -36 L8 -33 Z M6 -13 L10 -16 L14 -12 L10 -9 Z" },
    { id: "neck", joint: "body", plate: "blue", paint: "solid",
      d: "M-10 -83 H9 V-56 H-10 Z" },
    { id: "left-upper-sleeve", joint: "left-arm", plate: "blue", paint: "solid",
      skin: { tipJoint: "left-elbow", baseWidth: 21, tipWidth: 18, overlap: 3, bow: -1.3 },
      d: "M-9 0 Q-18 16 -10 30 Q0 36 9 27 Q8 7 4 0 Z" },
    { id: "left-forearm", joint: "left-elbow", plate: "blue", paint: "solid",
      skin: { tipJoint: "left-hand", baseWidth: 17, tipWidth: 15, overlap: 2.9, bow: 0.6 },
      d: "M-8 -1 Q0 -7 8 -1 L9 23 Q1 30 -8 25 Z" },
    { id: "sleeve-left-fold", joint: "left-arm", plate: "red", paint: "screen",
      d: "M-7 7 Q-1 13 7 9 L7 12 Q-2 16 -7 11 Z" },
    { id: "cuff-left", joint: "left-elbow", plate: "red", paint: "screen",
      d: "M-7 17 Q0 19 7 17 L8 20 Q1 23 -8 20 Z" },
    { id: "left-glove", joint: "left-hand", plate: "red", paint: "solid",
      d: "M-9 -8 C-7 -13 -1 -13 5 -10 Q9 -7 8 -1 L7 6 Q4 10 -2 10 C-8 9 -11 2 -9 -8 Z" },
    { id: "left-glove-index", joint: "left-index", plate: "red", paint: "solid",
      d: "M-1 -2 C1 -3 3 -1 3 2 Q5 8 4 14 Q4 18 2 18 Q0 17 0 13 Q-1 7 -2 3 Z" },
    { id: "left-glove-middle", joint: "left-middle", plate: "red", paint: "solid",
      d: "M-1 -3 C1 -4 2 -2 3 2 Q5 11 3 17 Q2 19 0 18 Q-2 17 -2 12 Q-3 5 -1 -3 Z" },
    { id: "left-glove-ring", joint: "left-ring", plate: "red", paint: "solid",
      d: "M-2 -2 Q0 -4 1 0 Q3 5 3 12 Q3 17 0 17 Q-2 16 -2 12 Q-3 4 -2 -2 Z" },
    { id: "left-glove-thumb", joint: "left-thumb", plate: "red", paint: "solid",
      d: "M-2 -3 Q-1 -7 3 -7 Q7 -6 9 -3 Q10 0 8 1 Q5 2 3 -1 L0 0 L-3 2 Z" },
    { id: "left-finger-joint-lines", joint: "left-middle", plate: "blue", paint: "solid",
      d: "M0 4 Q2 3 3 5 L3 5.8 Q2 5 0 5 Z" },
    { id: "left-glove-detail", joint: "left-hand", plate: "blue", paint: "solid",
      d: "M-5 2 Q-2 1 -1 3 L-2 4 Q-4 3 -5 4 Z M1 1 Q3 1 4 3 L3 4 Q2 2 1 3 Z" },
    { id: "left-glove-thumb-fold", joint: "left-hand", plate: "blue", paint: "solid",
      d: "M7 -2 Q10 -1 11 1 Q8 -1 7 1 Z" },
    { id: "right-upper-sleeve", joint: "right-arm", plate: "blue", paint: "solid",
      skin: { tipJoint: "right-elbow", baseWidth: 21, tipWidth: 18, overlap: 3, bow: 1.4 },
      d: "M-10 0 Q-17 18 -9 30 Q0 35 9 27 Q8 10 4 0 Z" },
    { id: "right-forearm", joint: "right-elbow", plate: "blue", paint: "solid",
      skin: { tipJoint: "right-hand", baseWidth: 17, tipWidth: 15, overlap: 2.9, bow: -0.6 },
      d: "M-8 -2 Q0 -8 8 -1 L8 26 Q0 32 -9 24 Z" },
    { id: "sleeve-right-fold", joint: "right-arm", plate: "red", paint: "screen",
      d: "M-8 8 Q0 12 7 8 L7 11 Q-1 16 -8 12 Z" },
    { id: "cuff-right", joint: "right-elbow", plate: "red", paint: "screen",
      d: "M-7 18 Q0 20 7 18 L8 21 Q0 24 -8 21 Z" },
    { id: "right-glove", joint: "right-hand", plate: "red", paint: "solid",
      d: "M-9 -8 C-7 -13 -1 -13 5 -10 Q9 -7 8 -1 L7 6 Q4 10 -2 10 C-8 9 -11 2 -9 -8 Z" },
    { id: "right-glove-index", joint: "right-index", plate: "red", paint: "solid",
      d: "M-1 -2 C1 -3 3 -1 3 2 Q5 8 4 14 Q4 18 2 18 Q0 17 0 13 Q-1 7 -2 3 Z" },
    { id: "right-glove-middle", joint: "right-middle", plate: "red", paint: "solid",
      d: "M-1 -3 C1 -4 2 -2 3 2 Q5 11 3 17 Q2 19 0 18 Q-2 17 -2 12 Q-3 5 -1 -3 Z" },
    { id: "right-glove-ring", joint: "right-ring", plate: "red", paint: "solid",
      d: "M-2 -2 Q0 -4 1 0 Q3 5 3 12 Q3 17 0 17 Q-2 16 -2 12 Q-3 4 -2 -2 Z" },
    { id: "right-glove-thumb", joint: "right-thumb", plate: "red", paint: "solid",
      d: "M-2 -3 Q-1 -7 3 -7 Q7 -6 9 -3 Q10 0 8 1 Q5 2 3 -1 L0 0 L-3 2 Z" },
    { id: "right-finger-joint-lines", joint: "right-index", plate: "blue", paint: "solid",
      d: "M0 4 Q2 3 3 5 L3 5.8 Q2 5 0 5 Z" },
    { id: "right-glove-detail", joint: "right-hand", plate: "blue", paint: "solid",
      d: "M-5 2 Q-2 1 -1 3 L-2 4 Q-4 3 -5 4 Z M1 1 Q3 1 4 3 L3 4 Q2 2 1 3 Z" },
    { id: "right-glove-thumb-fold", joint: "right-hand", plate: "blue", paint: "solid",
      d: "M7 -2 Q10 -1 11 1 Q8 -1 7 1 Z" },
    { id: "satchel-ink", joint: "satchel", plate: "red", paint: "solid",
      d: "M-6 0 Q25 -15 36 5 L35 56 Q9 70 -9 51 Z" },
    { id: "satchel-buckle", joint: "satchel", plate: "blue", paint: "solid",
      d: "M12 15 L24 15 L24 24 L12 24 Z M15 17 L15 22 L21 22 L21 17 Z" },
    { id: "satchel-strap", joint: "body", plate: "red", paint: "solid",
      d: "M-26 -56 Q11 -36 34 11 L28 15 Q7 -29 -30 -48 Z" },
    { id: "satchel-flap-stitch", joint: "satchel", plate: "blue", paint: "solid",
      d: "M-1 13 Q15 23 32 14 L32 16 Q14 26 0 15 Z" },
    { id: "satchel-flap", joint: "satchel", plate: "red", paint: "solid",
      d: "M-5 8 Q17 14 36 4 L36 18 Q14 29 -8 19 Z" },
    { id: "badge", joint: "body", plate: "red", paint: "solid",
      d: "M9 -42 L20 -38 L16 -26 L6 -30 Z" },
    // True physical layering: place facial paper clearance and ink AFTER the
    // coat, arms, gloves and satchel. Moving SVG paint order alone is not
    // sufficient; the renderer also subtracts earlier inks under the paper.
    { id: "face", joint: "head", plate: "blue", paint: "solid", knockoutOnly: true,
      d: "M-33 -18 C-37 -45 -21 -61 0 -60 C22 -62 35 -40 36 -19 C39 6 22 31 9 35 Q-12 41 -29 15 Z" },
    // RISO25 / ArtCraft v9: re-form the actual ear shell rather than painting
    // decorative dots around the previous detached C-shaped loop.
    { id: "ear-left", joint: "head", plate: "blue", paint: "solid",
      d: "M-32 -9.8 C-36 -12.5 -40.5 -10 -40.7 -4 C-41.4 2 -38.3 7.5 -35 7.8 Q-32.2 8 -30.8 5.2 L-32.5 3.9 Q-35 6.3 -37 3 C-39.7 -1.7 -38 -8 -33.3 -8 Z" },
    { id: "ear-helix-fold", joint: "head", plate: "blue", paint: "solid",
      d: "M-37.3 -8 C-39 -6 -39.4 -3 -38 -1 Q-37 -4 -36.5 -6.5 Z" },
    { id: "ear-concha-pocket", joint: "head", plate: "red", paint: "solid",
      d: "M-35.6 -3.9 Q-33.1 -5 -32.3 -2.1 Q-34.3 -1.9 -34.3 .5 Q-36 -.5 -35.6 -3.9 Z" },
    { id: "ear-tragus-root", joint: "head", plate: "blue", paint: "solid",
      d: "M-32.5 -1 Q-34 -.1 -33.6 1.3 Q-32.5 1.7 -31.6 1.5 Z" },
    { id: "ear-lobule-seam", joint: "head", plate: "red", paint: "solid",
      d: "M-36 4.7 Q-34.3 6.8 -32.5 5.7 Q-34.7 7.2 -36.2 5.7 Z" },
    { id: "face-outline", joint: "head", plate: "blue", paint: "solid",
      d: "M-33 -15 C-35 -43 -20 -57 -3 -59 C20 -63 34 -42 34 -18 C36 4 24 27 11 33 C-8 41 -27 25 -30 10 L-28 9 C-24 24 -8 36 10 30 C24 22 33 0 31 -18 C30 -40 20 -57 -2 -56 C-20 -56 -31 -41 -31 -15 Z" },
    { id: "hair", joint: "head", plate: "blue", paint: "solid",
      d: "M-37 -22 C-44 -52 -35 -68 -16 -73 C-4 -77 18 -74 31 -61 C42 -50 42 -32 37 -12 C35 -20 33 -30 27 -37 Q21 -42 19 -49 Q9 -42 0 -40 Q-13 -44 -18 -40 Q-21 -32 -27 -27 L-29 -11 Q-36 -10 -37 -22 Z" },
    // ArtCraft: all hair secondary forms root into the existing crown silhouette.
    // The asymmetrical tips avoid the single smooth helmet-outline shortcut.
    { id: "hair-forelock", joint: "head", plate: "blue", paint: "solid",
      d: "M-31 -43 C-24 -39 -17 -39 -9 -42 Q-13 -35 -20 -35 Q-27 -32 -32 -37 Z" },
    { id: "hair-temple", joint: "head", plate: "blue", paint: "solid",
      d: "M29 -40 C37 -34 40 -23 38 -11 C39 -1 37 6 34 10 C36 0 31 -9 29 -14 Q34 -29 29 -40 Z" },
    { id: "hair-strand-ink", joint: "head", plate: "red", paint: "screen",
      d: "M-35 -48 C-27 -60 -12 -63 -4 -62 L-6 -60 C-20 -60 -28 -51 -33 -45 Z M8 -65 Q27 -58 35 -44 L33 -41 Q25 -55 7 -62 Z" },
    { id: "hair-root-whorls", joint: "head", plate: "red", paint: "screen",
      d: "M-19 -67 Q-12 -71 -3 -67 Q-14 -68 -22 -62 Z M16 -64 Q28 -59 31 -51 Q23 -60 15 -61 Z" },
    { id: "face-temple-shadow", joint: "head", plate: "red", paint: "screen",screenTone:"mid",
      d: "M-29 -26 Q-31 -9 -27 6 Q-31 2 -33 -9 Q-34 -20 -29 -26 Z M30 -17 Q34 -6 31 6 Q35 -4 32 -14 Z" },
    { id: "eye-socket-planes", joint: "head", plate: "red", paint: "screen",screenTone:"mid",
      d: "M-26 -13 Q-18 -18 -9 -12 Q-16 -14 -24 -10 Z M8 -14 Q17 -20 25 -14 Q18 -16 9 -11 Z" },
    { id: "left-eyebrow", joint: "head", plate: "blue", paint: "solid",
      d: "M-24 -20 Q-17 -23 -10 -19 L-10 -18 Q-17 -21 -23 -18 Z",
      expressions: { blink: "M-24 -19 Q-17 -22 -10 -18 L-10 -17 Q-17 -20 -23 -17 Z",
        smile: "M-24 -21 Q-17 -25 -10 -20 L-10 -19 Q-17 -23 -23 -19 Z" },
    },
    { id: "right-eyebrow", joint: "head", plate: "blue", paint: "solid",
      d: "M10 -20 Q17 -24 24 -19 L24 -17 Q17 -22 10 -18 Z",
      expressions: { blink: "M10 -19 Q17 -22 24 -18 L24 -16 Q17 -20 10 -17 Z",
        smile: "M10 -22 Q17 -26 24 -20 L24 -18 Q17 -24 10 -20 Z" },
    },
    { id: "eye-line", joint: "head", plate: "blue", paint: "solid",
      d: "M-23 -9 Q-17 -13 -10 -9 L-10 -8 Q-17 -11 -22 -7 Z M10 -10 Q17 -14 23 -9 L23 -8 Q17 -12 10 -8 Z",
      expressions: {
        blink: "M-23 -8 Q-17 -7 -10 -9 L-10 -8 Q-17 -6 -23 -7 Z M10 -9 Q17 -8 23 -9 L23 -8 Q17 -7 10 -8 Z",
      },
    },
    // Real pupil/eyelid construction, rather than two ink-filled wedge eyes.
    { id: "eye-upper-lid-folds", joint: "head", plate: "blue", paint: "solid",
      d: "M-24 -13 Q-17 -16 -9 -12 L-9 -11 Q-17 -14 -23 -11 Z M9 -14 Q17 -17 24 -12 L24 -11 Q17 -15 10 -12 Z",
      expressions: {
        blink:"M-24 -12 Q-17 -14 -9 -11 L-9 -10 Q-17 -12 -23 -10 Z M9 -13 Q17 -15 24 -11 L24 -10 Q17 -13 10 -11 Z",
        smile:"M-24 -14 Q-17 -17 -9 -13 L-9 -12 Q-17 -15 -23 -12 Z M9 -15 Q17 -18 24 -13 L24 -12 Q17 -16 10 -13 Z",
      },
    },
    { id: "eye-lower-lids", joint: "head", plate: "blue", paint: "solid",
      d: "M-22 -5 Q-17 -3 -11 -7 L-11 -6 Q-17 -2 -22 -4 Z M11 -7 Q17 -3 22 -8 L22 -7 Q17 -2 11 -6 Z",
      expressions: {blink:"M-22 -6 Q-17 -5 -11 -7 L-11 -6 Q-17 -4 -22 -5 Z M11 -8 Q17 -6 22 -8 L22 -7 Q17 -5 11 -7 Z"},
    },

    // RISO21 / ArtCraft v9: controlled inner/outer canthus and eyelash contours
    // derived from the current source eye apertures. Both eyes share the
    // head rig but have independently authored inflections, not mirrored dots.
    { id: "eye-canthus-shapes", joint: "head", plate: "blue", paint: "solid",
      d: "M-23.2 -8.7 Q-21.6 -9.2 -20.6 -8.7 Q-21.5 -8.1 -22.4 -7.1 Q-23.4 -7.3 -23.2 -8.7 Z M10.1 -10 Q11.3 -10.8 12.5 -10.3 Q11.6 -9.7 10.8 -8.8 Q9.7 -8.9 10.1 -10 Z",
      expressions: {blink: "M-23.1 -7.9 Q-21.8 -8.4 -20.7 -8.0 L-21.6 -7.2 Q-22.9 -7.3 -23.1 -7.9 Z M10.0 -9.1 Q11.4 -9.6 12.5 -9.0 L11.2 -8.2 Q10.2 -8.4 10.0 -9.1 Z"},
    },
    { id: "eye-lash-wedges", joint: "head", plate: "blue", paint: "solid",
      d: "M-22.4 -10 Q-23.8 -12.6 -24.5 -12.5 Q-23.8 -10.9 -21.2 -9.3 Z M-20.8 -11.3 Q-21.7 -13.3 -22.6 -13.6 Q-21.8 -11.8 -19.8 -10.6 Z M22.0 -11.1 Q23.1 -13.8 24.4 -14.0 Q24.0 -11.8 22.8 -9.9 Z M19.8 -12.2 Q21.4 -14.0 22.1 -14.5 Q21.7 -12.6 20.2 -11.4 Z",
      expressions:{blink:"M-22.8 -8.1 Q-24.2 -9.4 -24.4 -10.1 Q-23.0 -9.0 -21.6 -7.8 Z M-20.5 -8.4 Q-21.8 -9.5 -22.7 -9.7 Q-21.8 -8.6 -20.1 -8.1 Z M22.1 -9.3 Q23.5 -10.8 24.2 -11.0 Q23.4 -9.7 22.9 -8.6 Z M20.0 -9.4 Q21.4 -10.6 22.1 -10.9 Q21.6 -9.7 20.4 -9.0 Z"},
    },
    // Blue iris stays the primary silhouette; red ink is a small independent
    // screened glancing-light facet that never paints over the paper sclera.
    { id: "eye-iris-grain", joint: "head", plate: "red", paint: "solid",
      d: "M-17.4 -8.4 Q-16.2 -9.7 -15.1 -8.6 Q-16.4 -8.8 -17.0 -6.8 Q-17.9 -7.5 -17.4 -8.4 Z M16.8 -9.6 Q18.1 -11.1 19.1 -9.2 Q18.0 -9.5 17.5 -7.5 Q16.6 -8.0 16.8 -9.6 Z",
      expressions:{blink:"M-17.0 -6.9 Q-16.2 -7.3 -15.7 -6.8 L-15.8 -6.5 Q-16.4 -6.7 -17 -6.5 Z M17.0 -7.8 Q18.0 -8.2 18.6 -7.7 L18.5 -7.4 Q17.9 -7.6 17 -7.5 Z"},
    },
    { id: "eye-lower-orbit-engraving", joint: "head", plate: "red", paint: "solid",
      d: "M-22 -2.1 Q-19 -1.2 -17.1 -1.6 Q-19 -0.8 -21.9 -.9 Z M-16.2 -1.5 Q-13.8 -1.7 -12.1 -3.1 Q-13.5 -1.1 -16 -0.7 Z M-20.8 .6 Q-18.4 1.2 -17.2 .7 Q-18.7 1.6 -20.6 1.2 Z M11.6 -3.4 Q15 -1.5 17.5 -2 Q15.4 -.8 12.5 -2 Z M18.2 -2.0 Q20.4 -2.3 22.0 -4.1 Q21.4 -2.0 18.7 -1.3 Z M13.1 .2 Q16 1 18.8 .1 Q16.5 1.6 13.4 1.0 Z",
      expressions:{blink:"M-22 -3.2 Q-20.5 -2.7 -18.5 -3.0 Q-20.4 -2.3 -21.9 -2.6 Z M-18.2 -3.1 Q-15.3 -2.7 -12.1 -4.2 Q-14.2 -2.4 -17.6 -2.5 Z M-20.4 -1.1 Q-18.4 -.8 -17.2 -1.2 Q-18.5 -.4 -20.2 -.6 Z M11.1 -4.6 Q14 -3.1 17.1 -3.5 Q15.3 -2.8 12 -3.9 Z M18.2 -3.9 Q20.8 -3.9 22 -5.4 Q20.7 -3.3 18.6 -3.2 Z M13.4 -2.0 Q16.2 -1.6 18.8 -2.4 Q16.6 -1.0 13.8 -1.4 Z"},
    },

    // RISO23 / actual Chromium RISO22 critique: 1–2px eye engravings were
    // sparsely sampled by the 6-unit plate screen and became disconnected
    // bright-red chips. Fine details now print solid; ONLY sufficiently wide
    // facial shadow planes use physically discrete screened dots.
    // Each zone follows brow/zygomatic anatomy in the *original* head frame.
    { id: "orbital-tone-planes", joint: "head", plate: "red", paint: "screen",screenTone:"mid",
      d: "M-27 -25 C-22 -29 -14 -28 -9 -24 Q-16 -23 -21 -17 Q-26 -15 -27 -25 Z M7 -25 C14 -31 24 -29 29 -20 Q28 -14 23 -15 Q20 -23 13 -22 Z" },
    { id: "zygomatic-tone-planes", joint: "head", plate: "red", paint: "screen",screenTone:"light",
      d: "M-29 -7 C-29 2 -27 10 -19 16 Q-22 5 -21 -5 Q-25 -11 -29 -7 Z M21 -6 Q27 -11 31 -5 C32 4 28 13 21 18 Q27 6 24 -2 Z" },
    { id: "jaw-shadow-planing", joint: "head", plate: "red", paint: "screen",screenTone:"light",
      d: "M-28 10 Q-23 24 -8 31 C-16 27 -22 20 -25 12 Z M31 -5 Q34 13 17 31 Q27 18 29 -3 Z" },
    { id: "iris-left", joint: "head", plate: "blue", paint: "solid",
      d: "M-18 -9 Q-15 -11 -14 -8 Q-14 -5 -17 -5 Q-19 -7 -18 -9 Z",
      expressions: {blink:"M-18 -7 L-15 -7 L-15 -6 L-18 -6 Z"},
    },
    { id: "iris-right", joint: "head", plate: "blue", paint: "solid",
      d: "M16 -10 Q19 -12 20 -9 Q20 -6 17 -6 Q15 -8 16 -10 Z",
      expressions: {blink:"M16 -8 L19 -8 L19 -7 L16 -7 Z"},
    },
    { id: "nose-bridge-plane", joint: "head", plate: "red", paint: "screen",screenTone:"light",
      d: "M1 -13 Q5 -9 4 -3 Q3 1 2 4 L0 3 Q2 -4 1 -13 Z" },
    { id: "nose", joint: "head", plate: "blue", paint: "solid",
      d: "M1 -10 Q3 -5 2 -1 Q0 3 2 6 Q5 8 7 5 L9 6 Q7 9 3 9 Q-2 8 0 3 Q2 -1 1 -10 Z" },
    { id: "nose-ala-right", joint: "head", plate: "blue", paint: "solid",
      d: "M8 6 Q11 5 11 8 Q10 11 7 10 Q10 9 8 6 Z" },
    { id: "philtrum", joint: "head", plate: "blue", paint: "solid",
      d: "M-1 10 Q0 12 -1 13 L-2 14 Q0 11 -1 10 Z M3 11 Q5 12 5 13 L4 14 Q4 12 3 11 Z" },
    { id: "nostril", joint: "head", plate: "blue", paint: "solid",
      d: "M4 7 Q6 6 8 7 Q7 9 5 9 Z" },
    { id: "cheek", joint: "head", plate: "red", paint: "solid",
      d: "M-26 7 Q-22 5 -18 7 L-19 8 Q-23 7 -25 9 Z" },
    { id: "cheek-plane", joint: "head", plate: "red", paint: "solid",
      d: "M19 8 Q24 7 26 10 L25 11 Q23 9 20 10 Z" },
    { id: "mouth", joint: "head", plate: "red", paint: "solid",
      d: "M-7 17 Q-1 20 6 16 L6 18 Q0 22 -7 19 Z",
      expressions: {
        speak: "M-4 15 C-2 13 3 13 5 16 Q6 21 1 22 Q-4 21 -4 15 Z",
        smile: "M-9 15 Q0 22 9 14 Q6 23 0 24 Q-7 22 -9 15 Z",
      },
    },
    { id: "mouth-corner-creases", joint: "head", plate: "blue", paint: "solid",
      d: "M-10 17 L-8 16 L-8 18 Z M7 15 L9 14 L9 17 Z",
      expressions: {
        speak: "M-7 16 L-5 14 L-5 17 Z M5 15 L7 14 L7 18 Z",
        smile: "M-11 14 Q-10 17 -9 18 L-10 18 Z M9 14 Q11 12 11 10 L11 15 Z",
      },
    },
    { id: "chin-plane", joint: "head", plate: "red", paint: "screen",screenTone:"light",
      d: "M-7 29 Q3 33 13 28 Q10 32 2 33 Q-3 32 -7 29 Z" },
    { id: "lip-shadow", joint: "head", plate: "red", paint: "screen",screenTone:"light",
      d: "M-6 23 Q-1 25 5 22 L5 23 Q0 26 -5 24 Z",
      expressions: {speak:"M-5 23 Q0 27 6 22 L5 24 Q0 29 -4 25 Z",
        smile:"M-7 22 Q2 27 9 19 L8 22 Q0 28 -6 24 Z"},
    },
    // Ear, nasal sidewall, lip and cheek construction is head-joint local:
    // individual original curved lines print separately on spot masters.
    // Blink does NOT distort midface; smile/speech redraw mouth-support forms.
    { id: "nasal-sidewall-line", joint: "head", plate: "red", paint: "solid",
      d: "M2.5 -10 Q4 -7.8 3.6 -5.2 Q3.3 -6.8 2.8 -8.6 Z" },
    { id: "nasal-ala-fold", joint: "head", plate: "red", paint: "solid",
      d: "M8.5 5 Q10.5 5.8 11 7.4 Q10.5 8.6 9.6 8.4 Q10.4 7.1 8.1 6.1 Z" },
    { id: "upper-lip-engraving", joint: "head", plate: "blue", paint: "solid",
      d: "M-7 16.4 Q-4 15.8 -1 16.1 Q1 15.8 3 15.2 Q5 14.8 6.7 15.2 Q4 16 2 16.2 Q-2 16.5 -6 16.9 Z",
      expressions: {
        speak:"M-4 14.3 Q-1.8 12.6 1 12.5 Q3.2 12.8 4.2 14.4 Q.7 13 -1.7 13.7 Z",
        smile:"M-9 14.8 Q-2 19 8.5 13.8 Q3.7 17.7 -4.9 16.7 Z",
      },
    },
    { id: "nasolabial-flow", joint: "head", plate: "red", paint: "solid",
      d: "M-14.5 7.5 Q-15 10.8 -12.9 13 Q-14.8 11.3 -15.1 9 Z M12.7 7 Q15 9.4 13.4 12.2 Q14 10 12.7 8 Z",
      expressions: {
        smile:"M-16 6.6 Q-17 10.3 -13 14 Q-16 12.1 -16.5 8.2 Z M13.8 6.3 Q17 10.1 14.5 14 Q15.4 10 13.5 7.5 Z",
        speak:"M-14 7.5 Q-16 10 -12.6 12.7 Q-15 10.8 -14.5 8.8 Z M12.8 7.2 Q15.3 9.3 13.5 12 Q14 10 12.7 8 Z",
      },
    },
    { id: "labiomental-crease", joint: "head", plate: "blue", paint: "solid",
      d: "M-4 25.1 Q.2 27 4.4 24.8 Q1.3 26.3 -2.2 26 Z",
      expressions: {
        smile:"M-6 26 Q1 28.6 7 25.4 Q2.5 27.9 -2.8 27.6 Z",
        speak:"M-4.6 25.2 Q0 28.2 5.4 24.8 Q1.6 27.5 -2.6 26.8 Z",
      },
    },
    { id: "cap", joint: "head", plate: "red", paint: "solid",
      d: "M-34 -52 C-24 -72 -7 -75 13 -68 C27 -63 35 -57 37 -48 Q-1 -51 -34 -49 Z" },
    { id: "cap-brim", joint: "head", plate: "red", paint: "solid",
      d: "M-38 -50 C-15 -53 17 -50 34 -47 L43 -44 Q10 -43 -38 -46 Z" },
    // RISO24 / ArtCraft v9: structural crown grain, not an RGB noise overlay.
    // The original red cap and blue hair made one opaque overprint helmet in
    // actual Chromium. Narrow negative-paper gouges are *real press knockout*
    // against BOTH preceding spot masters, then fine hand-authored engraving
    // re-inks through the local clearances. Direction follows the scalp arc.
    { id: "cap-paper-ribbons", joint: "head", plate: "blue", paint: "solid", knockoutOnly: true,
      d: "M-30 -57 C-25 -66 -15 -71 -4 -70 Q-16 -68 -28 -55 Z M-17 -67 C-8 -72 1 -72 12 -67 Q1 -70 -15 -65 Z M10 -69 C19 -67 28 -61 33 -54 Q26 -61 12 -67 Z M-24 -54 C-13 -60 -5 -62 7 -61 Q-11 -60 -23 -52 Z M26 -62 C32 -58 35 -53 36 -49 Q33 -56 28 -60 Z" },
    { id: "cap-brim-paper-welt", joint: "head", plate: "blue", paint: "solid", knockoutOnly: true,
      d: "M-31 -48.1 C-15 -50.2 3 -49.8 21 -47.4 Q3 -48.8 -15 -48.7 Q-25 -47.8 -31 -48.1 Z M25 -47.2 Q31 -46.8 36 -45.5 Q30 -46.3 25 -46.8 Z" },
    { id: "cap-crown-engraving", joint: "head", plate: "red", paint: "solid",
      d: "M-29 -61 C-23 -68 -13 -70 -6 -69 Q-18 -67 -27 -59 Z M-22 -63 C-14 -69 -3 -70 7 -67 Q-8 -69 -20 -61 Z M-11 -65 C1 -70 13 -68 20 -63 Q9 -67 -8 -64 Z M7 -65 C18 -65 28 -59 32 -52 Q23 -60 11 -63 Z M-30 -54 C-20 -59 -9 -60 -1 -59 Q-16 -57 -28 -52 Z M15 -58 Q25 -55 31 -50 Q23 -54 17 -57 Z" },
    { id: "cap-brim-engraving", joint: "head", plate: "blue", paint: "solid",
      d: "M-35 -48 C-18 -51 -1 -49.5 12 -48.6 Q-4 -49 -21 -48.3 Z M16 -47.9 Q29 -47.4 39 -44.7 Q26 -46.1 16 -47.4 Z M-28 -46.3 Q-14 -47.3 -3 -46.5 Q-17 -45.6 -28 -45.8 Z" },

  ],
};
/** Tiny paper bird: demonstrates that parent rig is anatomy-agnostic. */
export const PAPER_BIRD: RisoCharacterSpec = {
  version: 1, id: "paper-bird", durationFrames: 240, cadence: 2,
  joints: [
    { id: "root", x: 0, y: 0, keys: [
      { frame: 0, x: 30, y: -25, easing: "ease" },
      { frame: 75, x: -35, y: 19, easing: "ease" },
      { frame: 145, x: 30, y: -6, easing: "ease" },
      { frame: 210, x: -7, y: -24, easing: "ease" },
      { frame: 239, x: 10, y: 0 },
    ] },
    { id: "left-wing", parent: "root", x: -16, y: -11, keys: [
      { frame: 0, rotate: -26, easing: "ease" }, { frame: 16, rotate: 25, easing: "ease" },
      { frame: 36, rotate: -20, easing: "ease" }, { frame: 58, rotate: 29, easing: "ease" },
      { frame: 84, rotate: -26, easing: "ease" }, { frame: 112, rotate: 25, easing: "ease" },
      { frame: 150, rotate: -20, easing: "ease" }, { frame: 180, rotate: 30, easing: "ease" },
      { frame: 214, rotate: -26, easing: "ease" }, { frame: 239, rotate: 20 },
    ] },
    // Shoulder pivot remains in the torso silhouette: at x=17 the blue wing crossed
    // up to 20% of the red face on alternate flap keys, producing a dark diagonal.
    { id: "right-wing", parent: "root", x: -4, y: -18, keys: [
      { frame: 0, rotate: 27, easing: "ease" }, { frame: 16, rotate: -25, easing: "ease" },
      { frame: 36, rotate: 23, easing: "ease" }, { frame: 58, rotate: -30, easing: "ease" },
      { frame: 84, rotate: 23, easing: "ease" }, { frame: 112, rotate: -25, easing: "ease" },
      { frame: 150, rotate: 22, easing: "ease" }, { frame: 180, rotate: -30, easing: "ease" },
      { frame: 214, rotate: 26, easing: "ease" }, { frame: 239, rotate: -20 },
    ] },
    { id: "tail", parent: "root", x: -28, y: 6, keys: waveKeys() },
  ],
  expressions: [
    { frame: 0, name: "neutral" }, { frame: 124, name: "blink" }, { frame: 132, name: "neutral" },
  ],
  parts: [
    { id: "tail-feathers", joint: "tail", plate: "blue", paint: "solid",
      d: "M0 0 C-12 -10 -23 -15 -36 -22 Q-38 -19 -34 -14 L-25 -7 Q-36 -11 -42 -7 Q-40 -1 -29 2 L-41 12 Q-30 17 -17 10 Q-7 11 0 9 Z" },
    { id: "tail-feather-shaft", joint: "tail", plate: "red", paint: "solid",
      d: "M-31 -13 Q-18 -7 -4 2 Q-17 -6 -31 -13 Z" },
    { id: "tail-feather-barbs", joint: "tail", plate: "red", paint: "screen",
      d: "M-35 -12 Q-30 -6 -24 -4 Q-31 -7 -35 -12 Z M-37 -3 Q-29 1 -22 2 Q-31 3 -37 -3 Z M-33 11 Q-25 8 -17 6 Q-25 12 -33 11 Z" },
    { id: "body", joint: "root", plate: "blue", paint: "solid",
      d: "M-30 -9 C-25 -28 -7 -31 8 -26 C14 -22 15 -17 13 -11 Q12 0 15 12 C10 28 -12 30 -24 14 Q-31 4 -30 -9 Z" },
    { id: "wing-left", joint: "left-wing", plate: "blue", paint: "solid",
      d: "M4 -1 C-8 -17 -25 -33 -54 -69 Q-60 -75 -58 -78 Q-52 -75 -45 -72 Q-33 -62 -28 -54 Q-36 -67 -36 -81 Q-27 -77 -21 -65 Q-16 -55 -13 -45 Q-17 -61 -13 -70 Q-4 -62 0 -45 Q4 -26 7 -14 Z" },
    { id: "wing-right", joint: "right-wing", plate: "blue", paint: "solid",
      d: "M-5 -7 C6 -24 17 -33 31 -64 Q38 -74 39 -76 Q38 -62 31 -53 Q38 -60 42 -69 Q44 -74 47 -75 Q45 -60 36 -47 Q42 -52 45 -59 Q47 -54 41 -43 C30 -27 17 -18 3 1 Z" },
    // Individual feather-division marks use a second ink plate; the main blue
    // wing remains an opaque silhouette on its own paper knockout.
    // ArtCraft: each wing consists of rooted primary tips, a covert group
    // and directional ink shafts. Neither is a detached uniform scallop row.
    { id: "wing-left-coverts", joint: "left-wing", plate: "red", paint: "screen",
      d: "M-2 -9 Q-16 -21 -23 -34 Q-18 -30 -12 -33 Q-10 -27 -5 -25 Q-5 -17 1 -12 Z" },
    { id: "wing-left-quills", joint: "left-wing", plate: "red", paint: "solid",
      d: "M-52 -75 C-43 -70 -34 -60 -27 -49 C-33 -62 -42 -72 -52 -75 Z M-34 -77 C-25 -69 -16 -56 -11 -43 Q-17 -58 -34 -77 Z" },
    { id: "wing-left-feather-division", joint: "left-wing", plate: "red", paint: "solid",
      d: "M-42 -59 Q-25 -40 -12 -22 Q-24 -42 -42 -59 Z M-25 -57 Q-15 -42 -7 -30 Q-18 -47 -25 -57 Z" },
    { id: "wing-left-barbs", joint: "left-wing", plate: "red", paint: "screen",
      d: "M-40 -64 Q-39 -57 -31 -53 Q-38 -55 -40 -64 Z M-32 -54 Q-30 -49 -23 -44 Q-30 -45 -32 -54 Z M-23 -45 Q-22 -38 -16 -33 Q-22 -36 -23 -45 Z" },
    { id: "wing-left-covert-row", joint: "left-wing", plate: "red", paint: "screen",
      d: "M-24 -32 Q-20 -29 -17 -29 Q-19 -25 -14 -23 Q-20 -23 -24 -32 Z M-14 -24 Q-9 -19 -5 -20 Q-7 -15 -2 -13 Q-11 -17 -14 -24 Z" },
    { id: "wing-right-coverts", joint: "right-wing", plate: "red", paint: "screen",
      d: "M-3 -7 Q8 -19 16 -31 Q19 -28 22 -33 Q17 -20 5 -10 Z" },
    { id: "wing-right-quills", joint: "right-wing", plate: "red", paint: "solid",
      d: "M38 -73 Q29 -56 18 -34 Q30 -51 38 -73 Z M45 -71 Q36 -53 29 -39 Q40 -57 45 -71 Z" },
    { id: "wing-right-feather-division", joint: "right-wing", plate: "red", paint: "solid",
      d: "M34 -57 Q22 -36 6 -15 Q22 -41 34 -57 Z M42 -60 Q32 -42 17 -23 Q34 -46 42 -60 Z" },
    { id: "wing-right-barbs", joint: "right-wing", plate: "red", paint: "screen",
      d: "M33 -61 Q31 -54 25 -48 Q31 -49 33 -61 Z M26 -51 Q23 -44 17 -38 Q24 -42 26 -51 Z M17 -38 Q15 -31 10 -24 Q17 -30 17 -38 Z" },
    { id: "wing-right-covert-row", joint: "right-wing", plate: "red", paint: "screen",
      d: "M18 -31 Q13 -25 10 -25 Q10 -19 5 -16 Q13 -20 18 -31 Z M8 -19 Q4 -15 1 -13 Q0 -9 -3 -7 Q4 -11 8 -19 Z" },
    { id: "wing-ink-accent", joint: "right-wing", plate: "red", paint: "screen",
      d: "M-1 -3 Q15 -26 24 -48 L21 -38 Q11 -17 2 -5 Z" },
    { id: "breast-plumage", joint: "root", plate: "red", paint: "screen",
      d: "M-16 1 Q-12 13 1 18 Q-10 19 -18 9 Z" },
    { id: "head-nape", joint: "root", plate: "blue", paint: "solid",
      d: "M8 -21 Q12 -26 17 -24 Q12 -19 13 -14 Q12 -10 9 -12 Z" },
    { id: "body-feather-hatching", joint: "root", plate: "red", paint: "screen",
      d: "M-20 2 Q-14 9 -12 14 L-15 13 Q-19 8 -21 4 Z M-10 9 Q-6 15 -2 18 L-4 19 Q-9 16 -11 12 Z M0 12 Q4 17 9 18 L7 20 Q2 18 -1 14 Z" },
    // The lower breast uses nested, tapered contour strokes, not scattered
    // decorative dots; leave the central paper breathing space open.
    { id: "breast-contour-feathers", joint: "root", plate: "red", paint: "screen",
      d: "M-24 -2 Q-22 12 -14 18 Q-21 15 -24 -2 Z M-13 15 Q-6 22 1 22 Q-5 24 -13 15 Z M0 21 Q7 24 11 15 Q9 24 2 24 Z" },
    { id: "head", joint: "root", plate: "red", paint: "solid",
      d: "M10 -21 C18 -34 38 -36 47 -20 C52 -12 53 1 47 12 C42 23 27 25 19 14 C12 7 7 -8 10 -21 Z" },
    { id: "beak-divider", joint: "root", plate: "blue", paint: "solid",
      d: "M48 3 Q57 5 66 3 L65 5 Q57 8 49 5 Z" },
    { id: "beak-nostril", joint: "root", plate: "blue", paint: "solid",
      d: "M49 -1 Q51 -3 53 -1 Q52 1 50 1 Z" },
    { id: "beak", joint: "root", plate: "red", paint: "solid",
      d: "M47 -5 C57 -5 65 -1 69 3 Q62 6 56 9 C52 12 49 11 47 9 Q50 4 47 -5 Z" },
    { id: "eye-ring", joint: "root", plate: "blue", paint: "solid",
      d: "M25 -11 Q28 -18 36 -17 Q42 -15 42 -9 L40 -8 Q40 -13 35 -14 Q28 -15 27 -8 Z",
      expressions: {blink:"M25 -11 Q32 -16 40 -10 L40 -8 Q32 -13 27 -8 Z"},
    },
    { id: "eye-brow", joint: "root", plate: "blue", paint: "solid",
      d: "M26 -19 Q33 -22 40 -17 L40 -15 Q33 -20 27 -16 Z" },
    { id: "eye", joint: "root", plate: "blue", paint: "solid",
      d: "M32 -10 A4 4 0 1 1 31.9 -10 Z",
      expressions: { blink: "M26 -8 Q33 -3 41 -8 L41 -6 Q33 -1 26 -6 Z" },
    },
  ],
};
export function risoPerformanceSpec(aspect: RisoPerformanceAspect, seed = 89): RisoPrintSpec {
  return {
    version: 1, width: aspect === "portrait" ? 540 : 960,
    height: aspect === "portrait" ? 960 : 540,
    paper: "#F2E9D6", seed, startFrame: 0, passFrames: 1, gapFrames: 0,
    plates: [
      { id: "blue", color: "#2362A0", opacity: 1, dotCell: 9,
        dotAngle: 22, registration: [0, 0] },
      { id: "red", color: "#DD593D", opacity: 1, dotCell: 8,
        dotAngle: -19, registration: [1.3, -1.5] },
    ],
  };
}
export interface RisoPerformanceProps {
  aspect: RisoPerformanceAspect;
  frame: number;
  seed?: number;
  cadence?: 1 | 2 | 3 | 4;
  misregistration?: number;
  grain?: number;
  reducedMotion?: boolean;
  /** Compare physically constrained planted feet against the earlier FK-only artwork. */
  useIK?: boolean;
  /** Toggle joint-following continuous ink contours vs rigid authored SVG limbs. */
  useSkin?: boolean;
  /** Optional animator overlay showing joints, bones and targets. */
  showRig?: boolean;
  /** Boot toe-roll amplitude during swing, in degrees (0..45). */
  footRoll?: number;
  visiblePlateIds?: readonly string[];
}
function LayeredCity({ aspect, paint, ink }: {
  aspect: RisoPerformanceAspect; paint: RisoPaint; ink: "blue" | "red";
}): ReactNode {
  const portrait = aspect === "portrait";
  return <g data-km-riso-city={ink} fill={paint.solid}>
    {ink === "blue" ? <>
      <path d={portrait ? "M0 745 H540 V960 H0 Z" : "M0 382 H960 V540 H0 Z"}
        fill={paint.dots} opacity=".12"/>
      <path d={portrait ? "M0 725 H540" : "M0 378 H960"} fill="none"
        stroke={paint.solid} strokeWidth="4"/>
      {[0,1,2,3,4,5].map((i) => {
        const x = portrait ? i * 120 - 25 : i * 190 - 25;
        const h = 80 + (i * 41) % 80;
        const base = portrait ? 725 : 378;
        return <g key={i} opacity={.11 + i % 2 * .08}>
          <rect x={x} y={base - h} width={portrait ? 91 : 140} height={h}
            fill={paint.dots}/>
          <path d={`M${x} ${base-h}v${h}h${portrait?91:140}`}
            stroke={paint.solid} strokeWidth="1.4" fill="none"/>
        </g>;
      })}
      <path d={portrait ? "M20 807 Q150 780 265 810 T520 806" :
        "M20 460 Q220 430 480 460 T940 450"} stroke={paint.solid} strokeWidth="2.5"
        strokeDasharray="21 17" opacity=".54" fill="none"/>
    </> : <>
      {[0,1,2,3,4].map(i=> <g key={i} transform={`translate(${portrait?i*119:110+i*188} ${portrait?635:284})`}>
        <path d="M0 68 Q-18 31 0 10 Q20 -9 36 10 Q61 39 41 68 Z" fill={paint.dots} opacity=".24"/>
        <rect x={16} y={65} width={4} height={20}/>
      </g>)}
      <circle cx={portrait ? 395 : 810} cy={portrait ? 165 : 112} r={portrait?70:65}
        fill={paint.dots} opacity=".23"/>
      <circle cx={portrait ? 395 : 810} cy={portrait ? 165 : 112} r={portrait?59:52}
        stroke={paint.solid} strokeWidth="3" fill="none"/>
    </>}
  </g>;
}
export function RisoCharacterPerformance({
  aspect, frame, seed = 89, cadence = 2, misregistration = .3, grain = .55,
  reducedMotion = false, visiblePlateIds, useIK = true, useSkin = true, showRig = false,
  footRoll = 12,
}: RisoPerformanceProps) {
  const portrait = aspect === "portrait";
  if (!Number.isFinite(footRoll) || footRoll < 0 || footRoll > 45)
    throw new RangeError("Risograph footRoll must be within 0..45 degrees.");
  const spec = risoPerformanceSpec(aspect, seed);
  const courier = { ...COURIER, cadence,
    parts: useSkin ? COURIER.parts : COURIER.parts.map(part => ({ ...part, skin: undefined })),
    ik: COURIER.ik?.map(constraint => constraint.target.kind === "walk"
      ? { ...constraint, target: { ...constraint.target, footRoll } } : constraint),
  }, bird = { ...PAPER_BIRD, cadence };
  const sample = reducedMotion ? 239 : Math.min(239, frame);
  const titleX = portrait ? 32 : 45, headlineY = portrait ? 160 : 93;
  const stage = portrait ? { x: 115, y: 744, scale: 1.42, birdX: 405, birdY: 455 } :
    { x: 465, y: 381, scale: 1.16, birdX: 730, birdY: 108 };
  const artwork = (plateId: "blue" | "red"): RisoArtwork => (paint: RisoPaint) =>
    <g data-km-riso-performance-plate={plateId}>
      <LayeredCity aspect={aspect} paint={paint} ink={plateId}/>
      {plateId === "blue" ? <g fill={paint.solid} fontFamily="Georgia,serif">
        <text x={titleX} y={headlineY} fontSize={portrait?59:66}
          fontWeight={700} letterSpacing="-1.8">PAPER</text>
        <text x={titleX} y={headlineY+(portrait?66:68)} fontSize={portrait?59:66}
          fontWeight={700} letterSpacing="-1.8">COURIER</text>
        <path d={portrait ? "M32 260 H508" : "M45 189 H915"} stroke={paint.solid} strokeWidth="2"/>
        <text x={titleX} y={portrait?290:217} fontSize={portrait?13:12}
          fontFamily="Arial,sans-serif" fontWeight={700} letterSpacing={2.2}>
          A STORY IN TWO INKS
        </text>
        <text x={titleX} y={portrait?908:504} fontFamily="Arial,sans-serif"
          fontSize={portrait?12:12} letterSpacing={1.5}>PRINT / PERFORMANCE / FRAME STUDY</text>
      </g> : <g fill={paint.solid}>
        <path d={portrait ? "M32 326 H238" : "M45 245 H230"} stroke={paint.solid}
          strokeWidth="3" strokeDasharray="11 8"/>
        <g transform={portrait?"translate(45 345) rotate(-5)":"translate(51 260) rotate(-5)"}>
          <rect width={portrait?190:183} height={36} fill="none"
            stroke={paint.solid} strokeWidth="2"/>
          <text x={13} y={25} fontFamily="Arial,sans-serif" fontSize="18"
            fontWeight={700}>TAKE THE LONG WAY</text>
        </g>
        <text x={portrait?400:815} y={portrait?906:503} fontFamily="Arial,sans-serif"
          fontSize="13" fontWeight={700}>RISO / 02</text>
      </g>}
    </g>;
  // The illustrated poster and background print first. Each foreground actor
  // then gets an opaque paper clearance followed by its own two spot-ink passes.
  // This is essential: multiplying character ink directly over background ink
  // creates the illusion of seeing through the character's body.
  const subjectArtwork = (actor: RisoCharacterSpec, plateId: "blue" | "red",
    x: number, y: number, scale: number): RisoArtwork => paint =>
    <RisoCharacterInk spec={actor} frame={sample} plateId={plateId} paint={paint}
      x={x} y={y} scale={scale} reducedMotion={reducedMotion}
      disableIK={!useIK} showRig={showRig}/>;
  const subjectLayer = (actor: RisoCharacterSpec, id: string,
    x: number, y: number, scale: number) => ({
    id, knockout: <RisoCharacterKnockout spec={actor} frame={sample}
      x={x} y={y} scale={scale} reducedMotion={reducedMotion} disableIK={!useIK}/> ,
    artworks: {blue: subjectArtwork(actor, "blue", x, y, scale),
      red: subjectArtwork(actor, "red", x, y, scale)},
  });
  return <RisoPrint spec={spec} frame={3} artworks={{blue:artwork("blue"),red:artwork("red")}}
    foregroundLayers={[
      subjectLayer(courier, "courier", stage.x, stage.y, stage.scale),
      subjectLayer(bird, "paper-bird", stage.birdX, stage.birdY, portrait?1.1:1),
    ]}
    misregistration={misregistration} paperGrain={grain}
    visiblePlateIds={visiblePlateIds} label="Opaque paper-knockout Risograph print with two articulated characters"
    data-km-riso-performance="" data-km-riso-performance-frame={frame} />;
}
