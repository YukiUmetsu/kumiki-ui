/** A footage scene's subject (VE1.5): the subject cut out of the same footage by `npm run video:matte` (a VP9 WebM with an alpha channel,
 * frame for frame with the clip), and what it makes possible: words behind the subject, an outline, a new background and clones.
 *
 * - **Behind** (`behind: true`): the scene's title sits between the footage and the subject, so the subject stands in front of the words.
 * - **Outline**: a line of `color` around the subject, `width` of the frame's short side, with an optional `glow`.
 * - **Background**: the subject over a flat colour, or over its own footage blurred, as if shot on a long lens.
 * - **Clones**: earlier copies of the subject, each `delay` frames of footage behind, over the live picture. They need a camera that does
 *   not move, so each copy stands where the subject stood.
 *
 * Practice: text behind a subject, a stroke around a cut-out subject, background removal and the clone effect are one-tap tools in
 * short-form editors ([Adobe](https://www.adobe.com/learn/premiere-pro/web/text-behind-subject-object-mask),
 * [CapCut](https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut)).
 */

export interface FilmFootageSubject {
  /** The cutout from `npm run video:matte`: its frame 0 is `offset` frames into the footage. */
  cutout: { id: string; src: string; width: number; height: number; fps: number; frameCount: number; licenseRef?: string; offset?: number };
  behind?: boolean;
  outline?: { color?: string; /** A fraction of the short side, 0.002 to 0.03. @default 0.006 */ width?: number; /** 0 to 1. @default 0 */ glow?: number };
  background?: { color: string } | { blur: number };
  /** Up to six. `opacity` 0.2 to 1. @default 0.85 */
  clones?: ReadonlyArray<{ delay: number; opacity?: number }>;
}
export interface SubjectProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

const COLOR = /^#[0-9a-f]{6}$/i;
/** Checks a subject against its footage (`video`). */
export function inspectSubject(subject: FilmFootageSubject, video: { width: number; height: number; fps: number; frameCount: number }, hasTitle: boolean, path: string): SubjectProblem[] {
  const problems: SubjectProblem[] = [], say = (severity: SubjectProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const c = subject.cutout;
  if (!(c?.src && c.width > 0 && c.height > 0 && c.fps > 0 && Number.isSafeInteger(c.frameCount) && c.frameCount > 0) || !/^[A-Za-z0-9][A-Za-z0-9-]{0,60}$/.test(c?.id ?? ""))
    say("error", "subject-cutout", "/cutout", "A subject needs its cutout: an ID, a source, its width, height, frame rate and frame count.", "Make one with npm run video:matte -- <footage> --out=<cutout.webm>.");
  else {
    // The cutout is drawn over the footage with the same framing, so their shapes and clocks must agree.
    if (Math.abs(c.width / c.height - video.width / video.height) > .01) say("error", "subject-shape", "/cutout", `The cutout is ${c.width}×${c.height} and the footage ${video.width}×${video.height}: they are different shapes.`, "Matte the same footage, keeping its shape.");
    if (Math.abs(c.fps - video.fps) > .01) say("error", "subject-rate", "/cutout/fps", `The cutout runs at ${c.fps} fps and the footage at ${video.fps}.`);
    const offset = c.offset ?? 0;
    if (!(Number.isSafeInteger(offset) && offset >= 0 && offset < video.frameCount)) say("error", "subject-offset", "/cutout/offset", "The offset is a frame of the footage.");
    if (!c.src.toLowerCase().split("?")[0].endsWith(".webm")) say("warning", "subject-webm", "/cutout/src", "A cutout is a VP9 WebM: the codec browsers decode with an alpha channel.");
    if (!c.licenseRef) say("warning", "subject-licence", "/cutout/licenseRef", "The cutout names no rights record; it carries the footage's.");
  }
  if (subject.behind && !hasTitle) say("warning", "subject-behind-no-title", "/behind", "`behind` puts the title behind the subject, and the scene has no title.");
  const outline = subject.outline;
  if (outline) {
    if (outline.color !== undefined && !COLOR.test(outline.color)) say("error", "subject-outline", "/outline/color", "An outline colour is #rrggbb.");
    if (outline.width !== undefined && !(outline.width >= .002 && outline.width <= .03)) say("error", "subject-outline", "/outline/width", "An outline is 0.002 to 0.03 of the short side.");
    if (outline.glow !== undefined && !(outline.glow >= 0 && outline.glow <= 1)) say("error", "subject-outline", "/outline/glow", "A glow runs from 0 to 1.");
  }
  const background = subject.background;
  if (background && "color" in background && !COLOR.test(background.color)) say("error", "subject-background", "/background/color", "A background colour is #rrggbb.");
  if (background && "blur" in background && !(background.blur >= .002 && background.blur <= .05)) say("error", "subject-background", "/background/blur", "A background blur is 0.002 to 0.05 of the short side.");
  const clones = subject.clones ?? [];
  if (clones.length > 6) say("error", "subject-clones", "/clones", "Up to six clones.");
  clones.forEach((clone, i) => {
    if (!(Number.isSafeInteger(clone.delay) && clone.delay > 0 && clone.delay < (c?.frameCount ?? Infinity))) say("error", "subject-clones", `/clones/${i}/delay`, "A clone is a whole number of frames behind, more than none and within the cutout.");
    if (clone.opacity !== undefined && !(clone.opacity >= .2 && clone.opacity <= 1)) say("error", "subject-clones", `/clones/${i}/opacity`, "A clone's opacity runs from 0.2 to 1.");
  });
  if (clones.length && background) say("warning", "subject-clones-background", "/clones", "Clones over a new background float free of the ground they stood on.");
  return problems;
}
