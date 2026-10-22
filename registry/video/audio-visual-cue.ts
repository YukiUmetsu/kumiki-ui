/** AudioVisualCue: joins absolute-frame visual events to narration words, music beats and sound
 * effects. Kumiki describes events; your pipeline resolves assets and mixes (see
 * `createAudioMixManifest` / `audioMixFfmpegArgs`). Without audio data the same sheet runs in
 * visual-only mode. Every output is a pure function of the inputs, so event times are stable.
 */
import type { DirectorCue } from "../motion/director-types";
import type { Diagnostic, RationalFps } from "../motion/types";
import type { CaptionCue, CaptionTrack } from "../visual/caption-track";
import type { AudioAlignment } from "./alignment-formats";

export interface AudioLane {
  id: string;
  kind: "narration" | "music" | "sfx" | "ambience";
  /** Film frame where this lane's audio time 0 plays. */
  startFrame: number;
  assetRef?: string;
  gainDb?: number;
  /** Narration: the alignment describing this lane's words. */
  alignmentId?: string;
  /** Music: a constant-tempo beat grid (or supply beats in an alignment-free list). */
  beatGrid?: { bpm: number; beatsPerBar?: number; firstBeatSeconds?: number; count: number };
  /** Missing audio data for a required lane is an error instead of a warning. */
  required?: boolean;
}
export interface SoundEvent { id: string; laneId: string; frame: number; assetRef?: string; gainDb?: number; durationFrames?: number }
export type AudioAnchor =
  | { kind: "word"; laneId: string; /** Match by text (case-insensitive, punctuation-insensitive)… */ text?: string; /** …or by index. */ index?: number; /** Nth match of `text`, 0-based. */ occurrence?: number; edge?: "start" | "end" }
  | { kind: "segment"; laneId: string; index: number; edge?: "start" | "end" }
  | { kind: "beat"; laneId: string; beat: number }
  | { kind: "sound"; eventId: string };
export interface VisualAudioLink {
  id: string;
  /** A MotionDirector schedule/cue ID or any event ID in `visualEvents`. */
  visualEventId: string;
  anchor: AudioAnchor;
  /** Desired visual frame relative to the audio anchor (e.g. -3 to lead a word). */
  offsetFrames?: number;
  /** Allowed |visual − desired| before the link is late or early. Default 1. */
  toleranceFrames?: number;
  /** Out-of-tolerance links are errors instead of warnings. */
  strict?: boolean;
}
export interface AudioCueSheet {
  id: string;
  fps: RationalFps;
  durationFrames: number;
  lanes: readonly AudioLane[];
  sounds?: readonly SoundEvent[];
  links?: readonly VisualAudioLink[];
}
export interface ResolvedWord { laneId: string; index: number; text: string; startFrame: number; endFrame: number; confidence?: number; speaker?: string }
export interface ResolvedSegment { laneId: string; index: number; text: string; startFrame: number; endFrame: number; speaker?: string }
export interface ResolvedBeat { laneId: string; beat: number; bar: number; beatInBar: number; frame: number }
export type LinkStatus = "aligned" | "early" | "late" | "missing" | "visual-only";
export interface ResolvedLink {
  id: string;
  visualEventId: string;
  visualFrame?: number;
  audioFrame?: number;
  /** Where the visual event should be: audio anchor + offset. Use it to retime the choreography. */
  suggestedFrame?: number;
  /** visual − suggested. Positive = visual is late. */
  deltaFrames?: number;
  status: LinkStatus;
}
export interface ResolvedAudioCues {
  mode: "audio" | "visual-only";
  words: ResolvedWord[];
  segments: ResolvedSegment[];
  beats: ResolvedBeat[];
  sounds: SoundEvent[];
  links: ResolvedLink[];
  diagnostics: Diagnostic[];
}
export type VisualEventSource = readonly { id: string; frame: number }[] | { schedule: readonly { id: string; startFrame: number }[]; cues: readonly { id: string; frame: number }[] };

const fpsValue = (fps: RationalFps) => fps.num / fps.den;
/** Audio seconds → the film frame that contains that instant (frame k covers [k, k+1) / fps). */
export function audioSecondsToFrame(seconds: number, lane: Pick<AudioLane, "startFrame">, fps: RationalFps): number {
  return lane.startFrame + Math.floor(seconds * fpsValue(fps) + 1e-6);
}
/** Quantize timed words to non-overlapping frame ranges. A word lasts at least one frame; when two
 * words meet inside one frame, the frame belongs to the later word (at most one frame of shift). */
export function quantizeWords<W extends { start: number; end: number }>(words: readonly W[], lane: Pick<AudioLane, "startFrame">, fps: RationalFps): (W & { startFrame: number; endFrame: number })[] {
  let previousEnd = -Infinity;
  return words.map(word => {
    const startFrame = Math.max(audioSecondsToFrame(word.start, lane, fps), previousEnd);
    const endFrame = Math.max(startFrame + 1, audioSecondsToFrame(word.end, lane, fps));
    previousEnd = endFrame;
    return { ...word, startFrame, endFrame };
  });
}
const normalize = (text: string) => text.toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");

function visualFrames(source: VisualEventSource | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!source) return map;
  if (Array.isArray(source)) for (const e of source as readonly { id: string; frame: number }[]) map.set(e.id, e.frame);
  else {
    const director = source as Exclude<VisualEventSource, readonly unknown[]>;
    for (const s of director.schedule) map.set(s.id, s.startFrame);
    for (const c of director.cues) map.set(c.id, c.frame);
  }
  return map;
}

export function resolveAudioCues(sheet: AudioCueSheet, options: {
  alignments?: readonly AudioAlignment[];
  visualEvents?: VisualEventSource;
  /** `visual-only` ignores audio data; links report their visual frames only. Default: audio when any lane has data. */
  mode?: "audio" | "visual-only";
  minConfidence?: number;
} = {}): ResolvedAudioCues {
  const diagnostics: Diagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<Diagnostic> = {}) => diagnostics.push({ code, severity, message, ...extra });
  const { fps } = sheet, minConfidence = options.minConfidence ?? 0.6;
  if (!(fps.num > 0 && fps.den > 0) || !Number.isSafeInteger(sheet.durationFrames) || sheet.durationFrames < 1)
    report("error", "audio-sheet-invalid", "The cue sheet needs a positive rational FPS and duration.");
  const lanes = new Map<string, AudioLane>();
  for (const lane of sheet.lanes) {
    if (!lane.id.trim() || lanes.has(lane.id) || !Number.isSafeInteger(lane.startFrame)) report("error", "audio-lane-invalid", `Lane "${lane.id}" needs a unique ID and an integer start frame.`, { layerId: lane.id });
    lanes.set(lane.id, lane);
  }
  const alignments = new Map((options.alignments ?? []).map(a => [a.id, a]));
  const hasData = sheet.lanes.some(l => (l.alignmentId && alignments.has(l.alignmentId)) || l.beatGrid);
  const mode = options.mode ?? (hasData ? "audio" : "visual-only");
  const words: ResolvedWord[] = [], segments: ResolvedSegment[] = [], beats: ResolvedBeat[] = [];

  for (const lane of sheet.lanes) {
    if (lane.kind === "narration") {
      const alignment = lane.alignmentId ? alignments.get(lane.alignmentId) : undefined;
      if (!alignment) {
        report(lane.required && mode === "audio" ? "error" : "warning", "audio-alignment-missing",
          `Narration lane "${lane.id}" has no alignment${lane.alignmentId ? ` "${lane.alignmentId}"` : ""}; its words cannot drive visual timing.`, { layerId: lane.id });
        continue;
      }
      if (mode === "visual-only") continue;
      quantizeWords(alignment.words, lane, fps).forEach((w, index) => {
        const resolved = { laneId: lane.id, index, text: w.text, startFrame: w.startFrame, endFrame: w.endFrame, confidence: w.confidence, speaker: w.speaker };
        words.push(resolved);
        if (resolved.endFrame > sheet.durationFrames) report("warning", "audio-past-film-end", `Word "${w.text}" in "${lane.id}" ends after the film.`, { layerId: lane.id, frame: resolved.startFrame });
      });
      alignment.segments.forEach((s, index) => {
        const startFrame = audioSecondsToFrame(s.start, lane, fps);
        segments.push({ laneId: lane.id, index, text: s.text, startFrame, endFrame: Math.max(startFrame + 1, audioSecondsToFrame(s.end, lane, fps)), speaker: s.speaker });
      });
      for (const item of alignment.unaligned) report("warning", "audio-word-unaligned", `"${item.text}" in "${lane.id}" has no timing (${item.reason}); it cannot be an anchor.`, { layerId: lane.id });
    }
    if (lane.beatGrid && mode === "audio") {
      const { bpm, beatsPerBar = 4, firstBeatSeconds = 0, count } = lane.beatGrid;
      if (!(bpm > 0) || !Number.isSafeInteger(count) || count < 1) { report("error", "audio-beat-grid-invalid", `Lane "${lane.id}" beat grid needs a positive BPM and count.`, { layerId: lane.id }); continue; }
      for (let beat = 0; beat < count; beat += 1)
        beats.push({ laneId: lane.id, beat, bar: Math.floor(beat / beatsPerBar), beatInBar: beat % beatsPerBar, frame: audioSecondsToFrame(firstBeatSeconds + beat * 60 / bpm, lane, fps) });
    }
    if (!lane.assetRef && lane.kind !== "sfx") report("warning", "audio-asset-missing", `Lane "${lane.id}" has no asset reference; the mix cannot include it.`, { layerId: lane.id });
  }
  const sounds = [...(sheet.sounds ?? [])];
  for (const sound of sounds) {
    if (!lanes.has(sound.laneId)) report("error", "audio-lane-unknown", `Sound "${sound.id}" uses unknown lane "${sound.laneId}".`);
    if (!sound.assetRef) report("warning", "audio-asset-missing", `Sound "${sound.id}" has no asset reference; the mix cannot include it.`, { frame: sound.frame });
    if (!Number.isSafeInteger(sound.frame) || sound.frame < 0 || sound.frame >= sheet.durationFrames) report("error", "audio-sound-invalid", `Sound "${sound.id}" frame ${sound.frame} is outside the film.`);
  }

  const visual = visualFrames(options.visualEvents), links: ResolvedLink[] = [];
  for (const link of sheet.links ?? []) {
    const visualFrame = visual.get(link.visualEventId);
    if (visualFrame === undefined) report("error", "audio-visual-event-missing", `Link "${link.id}" names visual event "${link.visualEventId}", which the choreography does not define.`);
    if (mode === "visual-only") { links.push({ id: link.id, visualEventId: link.visualEventId, visualFrame, status: "visual-only" }); continue; }
    const anchor = link.anchor;
    let audioFrame: number | undefined, problem: string | undefined;
    if (anchor.kind === "word") {
      const laneWords = words.filter(w => w.laneId === anchor.laneId);
      const matches = anchor.text !== undefined ? laneWords.filter(w => normalize(w.text) === normalize(anchor.text!)) : laneWords.filter(w => w.index === anchor.index);
      const word = matches[anchor.occurrence ?? 0];
      if (anchor.text !== undefined && anchor.occurrence === undefined && matches.length > 1)
        report("warning", "audio-anchor-ambiguous", `Link "${link.id}": "${anchor.text}" occurs ${matches.length} times in "${anchor.laneId}"; using the first. Set occurrence.`);
      if (!word) problem = `word ${anchor.text !== undefined ? `"${anchor.text}"` : `#${anchor.index}`} is not in "${anchor.laneId}"`;
      else {
        audioFrame = anchor.edge === "end" ? word.endFrame : word.startFrame;
        if (word.confidence !== undefined && word.confidence < minConfidence)
          report("warning", "audio-anchor-low-confidence", `Link "${link.id}" anchors on "${word.text}" with confidence ${word.confidence}.`, { frame: word.startFrame });
      }
    } else if (anchor.kind === "segment") {
      const segment = segments.find(s => s.laneId === anchor.laneId && s.index === anchor.index);
      if (!segment) problem = `segment #${anchor.index} is not in "${anchor.laneId}"`; else audioFrame = anchor.edge === "end" ? segment.endFrame : segment.startFrame;
    } else if (anchor.kind === "beat") {
      const beat = beats.find(b => b.laneId === anchor.laneId && b.beat === anchor.beat);
      if (!beat) problem = `beat ${anchor.beat} is not in "${anchor.laneId}"`; else audioFrame = beat.frame;
    } else {
      const sound = sounds.find(s => s.id === anchor.eventId);
      if (!sound) problem = `sound "${anchor.eventId}" does not exist`; else audioFrame = sound.frame;
    }
    if (audioFrame === undefined) {
      report("error", "audio-anchor-missing", `Link "${link.id}": ${problem}.`);
      links.push({ id: link.id, visualEventId: link.visualEventId, visualFrame, status: "missing" });
      continue;
    }
    const suggestedFrame = audioFrame + (link.offsetFrames ?? 0), deltaFrames = visualFrame === undefined ? undefined : visualFrame - suggestedFrame;
    const tolerance = link.toleranceFrames ?? 1;
    const status: LinkStatus = deltaFrames === undefined ? "missing" : Math.abs(deltaFrames) <= tolerance ? "aligned" : deltaFrames > 0 ? "late" : "early";
    if (status === "late" || status === "early")
      report(link.strict ? "error" : "warning", `audio-link-${status}`, `"${link.visualEventId}" is ${Math.abs(deltaFrames!)} frames ${status} for link "${link.id}" (frame ${visualFrame}, audio wants ${suggestedFrame}).`, { frame: visualFrame });
    links.push({ id: link.id, visualEventId: link.visualEventId, visualFrame, audioFrame, suggestedFrame, deltaFrames, status });
  }
  return { mode, words, segments, beats, sounds, links, diagnostics };
}

const NO_SPACE_LANGUAGES = /^(ja|zh|th|lo|km|my)\b/i;
/** Group aligned words into readable caption cues. Timed words are kept verbatim for word highlighting;
 * a cue that contains an untimed word still shows it, as a phrase without word timings. */
export function alignmentToCaptionTrack(alignment: AudioAlignment, options: {
  id?: string; fps: RationalFps; laneStartFrame?: number;
  maxWords?: number; maxChars?: number; maxDurationFrames?: number;
  /** Start a new cue after sentence punctuation. Default true. */
  breakOnPunctuation?: boolean;
  /** When a length limit forces a break, break after the last clause punctuation (, ; : —) instead. Default true. */
  breakOnClause?: boolean;
  /** A pause longer than this many frames starts a new cue. Default 12. */
  pauseFrames?: number;
  speakers?: Readonly<Record<string, { label: string }>>;
}): CaptionTrack {
  const fps = options.fps, id = options.id ?? alignment.id, clauses = options.breakOnClause ?? true;
  const joiner = NO_SPACE_LANGUAGES.test(alignment.language ?? "") ? "" : " ";
  const maxWords = options.maxWords ?? 7, maxChars = options.maxChars ?? 42, pause = options.pauseFrames ?? 12;
  const timed = quantizeWords(alignment.words, { startFrame: options.laneStartFrame ?? 0 }, fps);
  type Token = { text: string; word?: (typeof timed)[number] };
  const tokens: Token[] = alignment.unaligned.filter(u => u.afterWord < 0).map(u => ({ text: u.text }));
  timed.forEach((word, i) => { tokens.push({ text: word.text, word }); for (const u of alignment.unaligned) if (u.afterWord === i) tokens.push({ text: u.text }); });
  const cues: CaptionCue[] = [];
  let group: Token[] = [];
  const timedIn = (list: Token[]) => list.filter(t => t.word).map(t => t.word!);
  const flush = () => {
    const words = timedIn(group);
    if (!words.length) { group = []; return; }
    const complete = words.length === group.length;
    cues.push({ id: `${id}-${cues.length + 1}`, startFrame: words[0].startFrame, endFrame: words[words.length - 1].endFrame,
      text: group.map(t => t.text).join(joiner), lang: alignment.language, speakerId: words[0].speaker,
      ...(complete ? { words: words.map(w => ({ text: w.text, startFrame: w.startFrame, endFrame: w.endFrame, confidence: w.confidence })) } : {}) });
    group = [];
  };
  for (const token of tokens) {
    const groupWords = timedIn(group), previous = groupWords[groupWords.length - 1], word = token.word;
    const text = [...group, token].map(t => t.text).join(joiner);
    const limited = group.length >= maxWords || text.length > maxChars ||
      (word !== undefined && options.maxDurationFrames !== undefined && groupWords.length > 0 && word.endFrame - groupWords[0].startFrame > options.maxDurationFrames);
    const boundary = word && previous && (word.speaker !== previous.speaker || word.startFrame - previous.endFrame > pause);
    if (group.length && (limited || boundary)) {
      const clause = limited && !boundary && clauses ? group.map(t => /[,;:—–]$/.test(t.text)).lastIndexOf(true) : -1;
      if (clause >= 0 && clause < group.length - 1) {
        const rest = group.slice(clause + 1);
        group = group.slice(0, clause + 1); flush(); group = rest;
      } else flush();
    }
    group.push(token);
    if ((options.breakOnPunctuation ?? true) && /[.!?。！？]$/.test(token.text)) flush();
  }
  flush();
  if (!cues.length) for (const [i, segment] of alignment.segments.entries()) {
    const startFrame = audioSecondsToFrame(segment.start, { startFrame: options.laneStartFrame ?? 0 }, fps);
    cues.push({ id: `${id}-${i + 1}`, startFrame, endFrame: Math.max(startFrame + 1, audioSecondsToFrame(segment.end, { startFrame: options.laneStartFrame ?? 0 }, fps)), text: segment.text, lang: alignment.language, speakerId: segment.speaker });
  }
  const source: CaptionTrack["timing"]["source"] = alignment.source === "asr" ? "asr" : alignment.source === "forced-alignment" ? "forced-alignment" : "manual";
  return { id, fps, cues, speakers: options.speakers, timing: { source, reference: alignment.reference ?? `${alignment.source} alignment "${alignment.id}"` } };
}

/** MotionDirector cue nodes (narration, speech markers, sound effects, music beats) at absolute frames. */
export function audioCuesToDirectorNodes(resolved: ResolvedAudioCues, sheet: AudioCueSheet, options: { language?: string; markers?: boolean } = {}): DirectorCue[] {
  const lanes = new Map(sheet.lanes.map(l => [l.id, l])), nodes: DirectorCue[] = [];
  resolved.segments.forEach(s => nodes.push({ kind: "cue", id: `audio/${s.laneId}/segment-${s.index}`, at: s.startFrame, durationFrames: Math.max(1, s.endFrame - s.startFrame),
    payload: { kind: "narration", text: s.text, language: options.language ?? "und", assetRef: lanes.get(s.laneId)?.assetRef } }));
  if (options.markers ?? true) for (const w of resolved.words) {
    const segment = resolved.segments.find(s => s.laneId === w.laneId && w.startFrame >= s.startFrame && w.startFrame < s.endFrame);
    if (segment) nodes.push({ kind: "cue", id: `audio/${w.laneId}/word-${w.index}`, at: w.startFrame, payload: { kind: "speech-marker", narrationId: `audio/${segment.laneId}/segment-${segment.index}`, marker: w.text } });
  }
  for (const s of resolved.sounds) nodes.push({ kind: "cue", id: `audio/sound/${s.id}`, at: s.frame, durationFrames: s.durationFrames,
    payload: { kind: "sound-effect", assetRef: s.assetRef ?? "", gainDb: s.gainDb } });
  for (const b of resolved.beats) nodes.push({ kind: "cue", id: `audio/${b.laneId}/beat-${b.beat}`, at: b.frame, payload: { kind: "music-beat", beat: b.beatInBar + 1, bar: b.bar + 1, assetRef: lanes.get(b.laneId)?.assetRef } });
  return nodes;
}

export interface AudioMixManifest {
  durationSeconds: number;
  inputs: { id: string; kind: AudioLane["kind"] | "sound"; assetRef: string; startSeconds: number; gainDb: number }[];
}
/** What the export pipeline must mix; Kumiki never mixes audio itself. */
export function createAudioMixManifest(sheet: AudioCueSheet): AudioMixManifest {
  const seconds = (frame: number) => frame * sheet.fps.den / sheet.fps.num;
  const lanes = new Map(sheet.lanes.map(l => [l.id, l]));
  return {
    durationSeconds: seconds(sheet.durationFrames),
    inputs: [
      ...sheet.lanes.filter(l => l.assetRef).map(l => ({ id: l.id, kind: l.kind, assetRef: l.assetRef!, startSeconds: seconds(l.startFrame), gainDb: l.gainDb ?? 0 })),
      ...(sheet.sounds ?? []).filter(s => s.assetRef).map(s => ({ id: s.id, kind: "sound" as const, assetRef: s.assetRef!, startSeconds: seconds(s.frame), gainDb: (s.gainDb ?? 0) + (lanes.get(s.laneId)?.gainDb ?? 0) })),
    ],
  };
}
/** FFmpeg arguments that mix the manifest into one film-length file for `npm run video:export -- --audio`. */
export function audioMixFfmpegArgs(manifest: AudioMixManifest, output: string, options: { sampleRate?: number } = {}): string[] {
  if (!manifest.inputs.length) throw new Error("The mix manifest has no audio inputs.");
  const args = ["-y"], filters: string[] = [];
  manifest.inputs.forEach((input, i) => {
    args.push("-i", input.assetRef);
    const delay = Math.max(0, Math.round(input.startSeconds * 1000));
    filters.push(`[${i}:a]adelay=${delay}:all=1,volume=${input.gainDb}dB[a${i}]`);
  });
  filters.push(`${manifest.inputs.map((_, i) => `[a${i}]`).join("")}amix=inputs=${manifest.inputs.length}:normalize=0:duration=longest,apad=whole_dur=${manifest.durationSeconds.toFixed(3)}[mix]`);
  return [...args, "-filter_complex", filters.join(";"), "-map", "[mix]", "-t", manifest.durationSeconds.toFixed(3), "-ar", String(options.sampleRate ?? 48000), output];
}
