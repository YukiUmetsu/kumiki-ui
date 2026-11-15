/**
 * UKIYO1 episode template: one folktale as a YouTube episode, written as a list of shots and the narration over each.
 *
 * `ukiyoeEpisode(spec)` compiles it to one FD1 film document:
 * - every shot is an `ukiyoe-scene` slot carrying its JSON scene for 16:9 and 9:16;
 * - a shot with `kasumi` opens with gold mist bands sweeping out of the previous shot (an `ukiyoe-kasumi` slot), and
 *   then resumes where the mist left it, so no frame repeats;
 * - the narration becomes the film's caption track (`script-estimate` timing until a voice is aligned), sized per output
 *   and drawn by the film's caption performer inside the platform's safe area, never as text inside the scene;
 * - outputs use the `youtube` and `youtube-shorts` presets, and each shot's recorded bed crossfades at the cuts.
 *
 * `ukiyoeTitleCard()` prints the title onto an opening scene, key block first, in a cartouche with a seal.
 * `ukiyoeEndCard()` holds a closing scene for YouTube's end screen: the closing line in the upper left, the rest of
 * the frame kept quiet for the end-screen elements, for at least five seconds.
 * `inspectUkiyoeEpisode()` checks the script before anything is rendered: reading speed, line length, gaps between
 * captions, captions inside their shot, scene text out of the caption band, figures not covered by captions, and the end
 * card's length.
 * `ukiyoeEpisodeSrt()` writes the same captions as an .srt file for upload, so viewers can switch them off or translate.
 */
import type { FilmDocument } from "../film-document";
import type { FilmSceneSound } from "../film-split-edits";
import type { UkiyoeIssue, UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";
import type { UkiyoeTransitionKind } from "./ukiyoe-transitions";
import { inspectUkiyoeScene } from "./ukiyoe-scene";
import { cameraAt } from "./ukiyoe-core";
import { figureHeight, travelAt } from "./ukiyoe-figure";
import { validateCaptionTrack } from "../../visual/caption-track";

export type UkiyoeEpisodeAspect = "landscape" | "portrait";
export const UKIYOE_EPISODE_ASPECTS: readonly UkiyoeEpisodeAspect[] = ["landscape", "portrait"];
export const UKIYOE_EPISODE_SIZE: Readonly<Record<UkiyoeEpisodeAspect, readonly [number, number]>> = { landscape: [1920, 1080], portrait: [1080, 1920] };
const OUTPUT_PRESET: Readonly<Record<UkiyoeEpisodeAspect, "youtube" | "youtube-shorts">> = { landscape: "youtube", portrait: "youtube-shorts" };
/** The safe insets of the two presets (share of the frame), as YouTube's player and Shorts UI cover them. */
export const UKIYOE_EPISODE_SAFE: Readonly<Record<UkiyoeEpisodeAspect, { left: number; right: number; top: number; bottom: number }>> = {
  landscape: { left: .08, right: .12, top: .09, bottom: .1 },
  portrait: { left: .08, right: .12, top: .09, bottom: .19 },
};
/** The band above the bottom safe inset where captions sit (share of the frame height), kept clear of scene text. */
export const UKIYOE_CAPTION_BAND: Readonly<Record<UkiyoeEpisodeAspect, number>> = { landscape: .18, portrait: .16 };
/** Caption type: 50 px on 16:9 (2.6% of 1920), 42 px on 9:16 (3.9% of 1080), where the safe lane is only 864 px wide. */
export const UKIYOE_CAPTION_SIZE: Readonly<Record<UkiyoeEpisodeAspect, string>> = { landscape: "2.6cqw", portrait: "3.9cqw" };
/** Reading limits for narration captions: characters per second, characters per caption (two lines of 42). */
export const UKIYOE_CAPTION_LIMITS = { cps: 17, chars: 84, minFrames: 36, gapFrames: 4 } as const;

/** One narration line over a shot, in the shot's own frames. `to` is exclusive. */
export interface UkiyoeEpisodeLine { text: string; from: number; to: number }
export interface UkiyoeEpisodeShot {
  id: string;
  /** What the shot shows, for labels and accessibility. */
  title: string;
  build: (aspect: UkiyoeEpisodeAspect) => UkiyoeSceneSpec;
  narration?: readonly UkiyoeEpisodeLine[];
  /** Frames of the transition out of the previous shot into this one (0 or absent: a cut). */
  kasumi?: number;
  /** How the shot arrives over those frames: gold mist (default), the scroll unrolling, ink bleeding, or a fresh print. */
  transition?: UkiyoeTransitionKind;
  /** The recorded bed under the shot, from the sound catalog. */
  sound?: FilmSceneSound;
}
export interface UkiyoeEpisodeSpec {
  id: string;
  title: string;
  /** Title card first, end card last. */
  shots: readonly UkiyoeEpisodeShot[];
  /** Caption font sizes per output; defaults to `UKIYOE_CAPTION_SIZE`. */
  captionSize?: Partial<Record<UkiyoeEpisodeAspect, string>>;
  /** CSS font stack for captions; defaults to a serif. */
  captionFont?: string;
  /** Caption language, such as "en" or "ja". */
  lang?: string;
  /** Frames the film fades to black at its end (0 for none). Default 24. */
  fadeOut?: number;
}

const SERIF = "'Shippori Mincho', 'Noto Serif JP', 'Hiragino Mincho ProN', Georgia, serif";

/** Where each shot starts in the assembled episode (its mist belongs to it). */
export function ukiyoeEpisodeStarts(spec: UkiyoeEpisodeSpec): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const shot of spec.shots) { starts.push(at); at += shot.build("landscape").durationFrames; }
  return starts;
}

/** The narration as caption cues in episode frames. */
export function ukiyoeEpisodeCues(spec: UkiyoeEpisodeSpec): { id: string; startFrame: number; endFrame: number; text: string; lang?: string }[] {
  const starts = ukiyoeEpisodeStarts(spec);
  return spec.shots.flatMap((shot, i) => (shot.narration ?? []).map((line, k) => ({
    id: `${shot.id}-${k + 1}`, startFrame: starts[i] + line.from, endFrame: starts[i] + line.to, text: line.text, ...spec.lang ? { lang: spec.lang } : {},
  })));
}

/** The FD1 film document for the episode. */
export function ukiyoeEpisode(spec: UkiyoeEpisodeSpec): FilmDocument {
  const built = spec.shots.map(shot => ({ shot, landscape: shot.build("landscape"), portrait: shot.build("portrait") }));
  const scenes: unknown[] = [];
  built.forEach(({ shot, landscape, portrait }, i) => {
    const mist = i > 0 ? Math.max(0, Math.round(shot.kasumi ?? 0)) : 0;
    if (mist) {
      const prev = built[i - 1];
      scenes.push({
        id: shot.id + "-kasumi", recipeId: "slot", durationFrames: mist, transition: { kind: "cut" },
        ...shot.sound ? { sound: shot.sound } : {},
        content: !shot.transition || shot.transition === "kasumi"
          ? { slot: "ukiyoe-kasumi", label: "Mist into " + shot.title, props: { from: { landscape: prev.landscape, portrait: prev.portrait }, to: { landscape, portrait }, toStartFrame: 0 } }
          : { slot: "ukiyoe-transition", label: "Into " + shot.title, props: { kind: shot.transition, from: { landscape: prev.landscape, portrait: prev.portrait }, to: { landscape, portrait }, toStartFrame: 0 } },
      });
    }
    scenes.push({
      id: shot.id, recipeId: "slot", durationFrames: landscape.durationFrames - mist,
      ...i ? { transition: { kind: "cut" } } : {},
      ...shot.sound ? { sound: shot.sound } : {},
      content: { slot: "ukiyoe-scene", label: shot.title, props: { scenes: { landscape, portrait }, startFrame: mist } },
    });
  });
  const size = { ...UKIYOE_CAPTION_SIZE, ...spec.captionSize }, fadeOut = spec.fadeOut ?? 24;
  return {
    schemaVersion: 1,
    id: spec.id,
    fps: { num: 30, den: 1 },
    drift: 0,
    outputs: UKIYOE_EPISODE_ASPECTS.map(aspect => ({ id: aspect, preset: OUTPUT_PRESET[aspect] })),
    scenes,
    captions: { timing: { source: "script-estimate", reference: `${spec.id} narration script` }, cues: ukiyoeEpisodeCues(spec), style: { size, font: spec.captionFont ?? SERIF } },
    ...fadeOut ? { fade: { out: fadeOut, color: "#000000" } } : {},
    ...spec.shots.some(shot => shot.sound) ? { audio: { lanes: [], licenseRef: "kumiki-sound-catalog", master: { profile: "youtube", limit: true } } } : {},
  } as unknown as FilmDocument;
}

const srtTime = (frame: number, fps: number) => {
  const ms = Math.round(frame / fps * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
/** The captions as SubRip (.srt) for a YouTube upload. */
export function ukiyoeEpisodeSrt(spec: UkiyoeEpisodeSpec, fps = 30): string {
  return ukiyoeEpisodeCues(spec).map((cue, i) => `${i + 1}\n${srtTime(cue.startFrame, fps)} --> ${srtTime(cue.endFrame, fps)}\n${cue.text}\n`).join("\n");
}

/**
 * Lines a caption needs on an output, by greedy word wrap with an average glyph of 0.6 em (a wide serif's Latin, such as a Mincho face's; CJK is
 * 1 em). The film's caption performer wraps the real glyphs into at most two lines inside 90% of the safe lane.
 */
export function ukiyoeCaptionLines(text: string, aspect: UkiyoeEpisodeAspect, size = UKIYOE_CAPTION_SIZE[aspect]): number {
  const [w] = UKIYOE_EPISODE_SIZE[aspect], safe = UKIYOE_EPISODE_SAFE[aspect], m = /^([\d.]+)(cqw|px)$/.exec(size);
  const px = m ? (m[2] === "cqw" ? Number(m[1]) / 100 * w : Number(m[1])) : 40;
  const lane = w * (1 - safe.left - safe.right) * .9 - px * .9;
  const width = (s: string) => [...s].reduce((sum, ch) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : .6) * px, 0);
  let lines = 1, line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (width(next) > lane && line) { lines++; line = word; } else line = next;
  }
  return lines;
}

/**
 * Figures the caption band would cover: for each narration line, at its middle frame, every top-level figure on screen
 * whose body (feet up to its height, through the scene camera and the node's parallax depth) lies more than a third
 * inside the band. Captions belong over ground and water, not over the people the line is about.
 */
export function ukiyoeCaptionCovers(shot: UkiyoeEpisodeShot, aspect: UkiyoeEpisodeAspect): { line: number; node: string; frame: number; share: number }[] {
  const scene = shot.build(aspect), [w, h] = UKIYOE_EPISODE_SIZE[aspect], safe = UKIYOE_EPISODE_SAFE[aspect];
  const bandTop = h * (1 - safe.bottom - UKIYOE_CAPTION_BAND[aspect]), bandBottom = h * (1 - safe.bottom), out: { line: number; node: string; frame: number; share: number }[] = [];
  (shot.narration ?? []).forEach((line, k) => {
    const f = Math.round((line.from + line.to) / 2), cam = cameraAt(scene.camera, f, w, h, scene.seed);
    for (const n of scene.nodes) {
      if (n.kind !== "figure" || n.parent || (n.from ?? 0) > f || (n.to ?? Infinity) <= f) continue;
      const d = n.depth ?? 1, z = 1 + (cam.zoom - 1) * d, fx = w / 2 + (cam.x - w / 2) * d, fy = h / 2 + (cam.y - h / 2) * d;
      const tr = travelAt(n.actions ?? [], f), scale = n.scale ?? 1;
      const sx = w / 2 + z * ((n.x ?? 0) + tr.x - fx), feet = h / 2 + z * ((n.y ?? 0) + tr.y - fy), tall = figureHeight(n.look) * scale * z * .85;
      if (sx < 0 || sx > w || feet - tall > h) continue;
      const share = Math.max(0, Math.min(feet, bandBottom) - Math.max(feet - tall, bandTop)) / tall;
      if (share > 1 / 3) out.push({ line: k, node: n.id, frame: f, share: Math.round(share * 100) / 100 });
    }
  });
  return out;
}

/** Approximate box of a scene text node in output pixels (no camera), for the caption-band check. */
function textBox(node: Extract<UkiyoeNode, { kind: "text" }>): { top: number; bottom: number } {
  const size = node.size ?? 32, lines = node.sub ? 2.4 : 1.3;
  const height = node.vertical ? Math.min(node.max ?? 1e4, node.text.length * size * 1.1) : size * lines * (node.style === "cartouche" ? 1.6 : 1);
  const y = node.y ?? 0;
  return node.vertical ? { top: y, bottom: y + height } : { top: y - height / 2, bottom: y + height / 2 };
}

/**
 * Checks the episode script before rendering. Errors: a caption outside its shot, overlapping captions, a caption too
 * short to read, too long or read too fast, scene text in the caption band while a caption shows, an end card under
 * five seconds, invalid scenes.
 */
export function inspectUkiyoeEpisode(spec: UkiyoeEpisodeSpec): UkiyoeIssue[] {
  const issues: UkiyoeIssue[] = [], L = UKIYOE_CAPTION_LIMITS;
  if (spec.shots.length < 2) issues.push({ path: "shots", message: "An episode needs at least a title card and an end card." });
  spec.shots.forEach((shot, i) => {
    for (const aspect of UKIYOE_EPISODE_ASPECTS) {
      const scene = shot.build(aspect), [w, h] = UKIYOE_EPISODE_SIZE[aspect];
      for (const issue of inspectUkiyoeScene(scene)) issues.push({ path: `shots/${i}/${aspect}/${issue.path}`, message: issue.message });
      if (scene.width !== w || scene.height !== h) issues.push({ path: `shots/${i}/${aspect}`, message: `Scene is ${scene.width}×${scene.height}, not ${w}×${h}.` });
      if (aspect === "portrait" && scene.durationFrames !== shot.build("landscape").durationFrames) issues.push({ path: `shots/${i}`, message: "The two aspects must last the same." });
      // Scene text must stay out of the caption band while any caption is up.
      const bandTop = h * (1 - UKIYOE_EPISODE_SAFE[aspect].bottom - UKIYOE_CAPTION_BAND[aspect]);
      for (const node of scene.nodes) {
        if (node.kind !== "text" || !shot.narration?.length) continue;
        const box = textBox(node), from = node.from ?? 0, to = node.to ?? scene.durationFrames;
        const shown = shot.narration.some(line => line.from < to && line.to > from);
        if (shown && box.bottom > bandTop) issues.push({ path: `shots/${i}/${aspect}/nodes/${node.id}`, message: `Text "${node.text.slice(0, 24)}" reaches the caption band (bottom ${Math.round(box.bottom)} px, band from ${Math.round(bandTop)} px).` });
      }
    }
    for (const aspect of UKIYOE_EPISODE_ASPECTS) for (const c of ukiyoeCaptionCovers(shot, aspect))
      issues.push({ path: `shots/${i}/${aspect}/narration/${c.line}`, message: `The caption covers figure "${c.node}" (${Math.round(c.share * 100)}% of it, frame ${c.frame}); move the camera so the figure stands above the caption band.` });
    const dur = shot.build("landscape").durationFrames, lines = shot.narration ?? [];
    lines.forEach((line, k) => {
      const at = `shots/${i}/narration/${k}`, frames = line.to - line.from, chars = line.text.length;
      if (line.from < (i ? shot.kasumi ?? 0 : 0) || line.to > dur) issues.push({ path: at, message: `Caption runs outside its shot (frames ${line.from}–${line.to} of ${dur}, mist ${shot.kasumi ?? 0}).` });
      if (frames < L.minFrames) issues.push({ path: at, message: `Caption is up for ${frames} frames; at least ${L.minFrames} are needed to read it.` });
      for (const aspect of UKIYOE_EPISODE_ASPECTS) {
        const n = ukiyoeCaptionLines(line.text, aspect, spec.captionSize?.[aspect]);
        if (n > 2) issues.push({ path: at, message: `Caption needs ${n} lines on ${aspect}; the performer shows two. Shorten or split it.` });
      }
      if (chars > L.chars) issues.push({ path: at, message: `Caption has ${chars} characters; split it (at most ${L.chars}).` });
      if (chars / (frames / 30) > L.cps) issues.push({ path: at, message: `Caption reads at ${(chars / (frames / 30)).toFixed(1)} characters a second; at most ${L.cps}.` });
      const next = lines[k + 1];
      if (next && next.from < line.to + L.gapFrames) issues.push({ path: at, message: `Caption overlaps or crowds the next one (needs a ${L.gapFrames}-frame gap).` });
    });
  });
  // The film's own caption rules (reading time by words, overlaps), as film:check applies them.
  for (const d of validateCaptionTrack({ id: spec.id + "-captions", fps: { num: 30, den: 1 }, timing: { source: "script-estimate" }, cues: ukiyoeEpisodeCues(spec) }))
    issues.push({ path: "captions" + (d.cueId ? "/" + d.cueId : ""), message: `${d.severity}: ${d.message}` });
  const end = spec.shots[spec.shots.length - 1];
  if (end && end.build("landscape").durationFrames < 150) issues.push({ path: `shots/${spec.shots.length - 1}`, message: "The end card must hold at least 5 seconds for YouTube's end screen." });
  return issues;
}

/** Options for a title or end card printed over a scene. */
export interface UkiyoeCardOptions {
  id?: string;
  /** The scene the card is printed over (its text nodes are kept). */
  backdrop: (aspect: UkiyoeEpisodeAspect) => UkiyoeSceneSpec;
  /** Seal characters, stamped beside the cartouche. */
  seal?: string;
  kasumi?: number;
  sound?: FilmSceneSound;
  narration?: readonly UkiyoeEpisodeLine[];
}

/**
 * The opening: the backdrop is printed block by block over the first three seconds, then the title cartouche (Japanese
 * title vertical, the English beneath) and the seal are stamped in the upper right, as on a print.
 */
export function ukiyoeTitleCard(o: UkiyoeCardOptions & { title: string; titleJa?: string }): UkiyoeEpisodeShot {
  return {
    id: o.id ?? "title", title: o.title, kasumi: o.kasumi, sound: o.sound, narration: o.narration,
    build: aspect => {
      const scene = o.backdrop(aspect), [w] = UKIYOE_EPISODE_SIZE[aspect], P = aspect === "portrait", safe = UKIYOE_EPISODE_SAFE[aspect];
      const right = w * (1 - safe.right) - 10, top = UKIYOE_EPISODE_SIZE[aspect][1] * safe.top + 10;
      const stampAt = Math.min(scene.durationFrames - 30, 100);
      return {
        ...scene, mount: scene.mount ?? { kind: "print" }, printIn: scene.printIn ?? { frame: 4, duration: 90 },
        nodes: [...scene.nodes,
          { id: "title-cartouche", kind: "text", style: "cartouche", align: "end", depth: 0, x: right, y: top + (P ? 40 : 20), text: o.titleJa ?? o.title, sub: o.titleJa ? o.title : undefined, size: P ? 54 : 46, enter: { preset: "stamp", frame: stampAt, duration: 10 } },
          ...o.seal ? [{ id: "title-seal", kind: "text", style: "seal", align: "end", depth: 0, x: right - (P ? 150 : 140), y: top + (P ? 470 : 400), text: o.seal, size: P ? 30 : 26, enter: { preset: "stamp", frame: stampAt + 14, duration: 8 } } as UkiyoeNode] : [],
        ] as UkiyoeNode[],
      };
    },
  };
}

/**
 * The close: the backdrop holds while the closing line (and the next story, if any) is stamped in the upper left. The
 * lower and right parts of the frame stay free of text for YouTube's end-screen elements (video tiles, subscribe).
 */
export function ukiyoeEndCard(o: UkiyoeCardOptions & { closing: string; next?: string }): UkiyoeEpisodeShot {
  return {
    id: o.id ?? "end", title: "End card", kasumi: o.kasumi ?? 30, sound: o.sound, narration: o.narration,
    build: aspect => {
      const scene = o.backdrop(aspect), [w, h] = UKIYOE_EPISODE_SIZE[aspect], P = aspect === "portrait", safe = UKIYOE_EPISODE_SAFE[aspect];
      const left = w * safe.left + 10, top = h * safe.top + 10, at = (o.kasumi ?? 30) + 12;
      return {
        ...scene,
        nodes: [...scene.nodes,
          // A cartouche reads top to bottom; the next story and the seal stand beside it, not under it.
          { id: "end-closing", kind: "text", style: "cartouche", align: "start", depth: 0, x: left, y: top + 20, text: o.closing, size: P ? 44 : 40, enter: { preset: "stamp", frame: at, duration: 10 } },
          ...o.next ? [{ id: "end-next", kind: "text", style: "plain", align: "start", depth: 0, x: left + (P ? 120 : 110), y: top + 50, text: o.next, size: P ? 36 : 32, max: P ? w * .6 : w * .36, color: "sumi", enter: { preset: "mist", frame: at + 24, duration: 14 } } as UkiyoeNode] : [],
          ...o.seal ? [{ id: "end-seal", kind: "text", style: "seal", align: "start", depth: 0, x: left + (P ? 120 : 110), y: top + (P ? 130 : 120), text: o.seal, size: P ? 30 : 26, enter: { preset: "stamp", frame: at + 40, duration: 8 } } as UkiyoeNode] : [],
        ] as UkiyoeNode[],
      };
    },
  };
}
