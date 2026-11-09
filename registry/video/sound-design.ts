/** Sound design as data. A recipe names catalog sounds and bounded settings, never a filter string, so an agent cannot
 * inject anything into FFmpeg. The compiler is pure: the same recipe and the same files give the same filter graph and
 * the same cache key. A script runs FFmpeg once per key, and the result enters the film as an ordinary `SoundEvent`.
 */
import type { RationalFps } from "../motion/types";
import type { ImpactSoundProfile, SoundEvent } from "./audio-visual-cue";
import { inspectSoundCatalog } from "./sound-catalog";
import type { SoundAssetRecord, SoundCatalog } from "./sound-catalog";

/** Raise this when the meaning of a recipe changes, so old cached files are not reused. */
export const SOUND_BAKE_VERSION = 1;
const SAMPLE_RATE = 48000, MAX_LAYERS = 8;

export const SOUND_INTENSITIES = { subtle: -6, neutral: 0, cinematic: 3 } as const;
export type SoundIntensity = keyof typeof SOUND_INTENSITIES;
/** Each space is a seeded noise tail: its length in seconds, how much of it is heard, and how dark it is.
 * `wetDb` is high because FFmpeg normalizes the tail. These values were set by measuring decay on a water drop. */
export const SOUND_ROOMS = {
  dry: { tailSeconds: 0, wetDb: -96, darkHz: 20000, seed: 0 },
  outdoors: { tailSeconds: .28, wetDb: 12, darkHz: 5200, seed: 11 },
  room: { tailSeconds: .42, wetDb: 18, darkHz: 6800, seed: 23 },
  hall: { tailSeconds: 1.5, wetDb: 27, darkHz: 5000, seed: 37 },
  cave: { tailSeconds: 2.3, wetDb: 33, darkHz: 3400, seed: 41 },
  underwater: { tailSeconds: .7, wetDb: 24, darkHz: 700, seed: 53 },
} as const;
export type SoundRoomId = keyof typeof SOUND_ROOMS;

export interface SoundDesignLayer {
  /** A catalog sound ID. */
  sound: string;
  gainDb?: number;
  /** When this layer starts, after the first layer. */
  offsetMs?: number;
  pitchCents?: number;
  highpassHz?: number;
  lowpassHz?: number;
}
/** Where the sound sits. `pan` runs from -1 (left) to 1 (right). `distance` is in metres, and 1 is at the camera. */
export interface SoundPosition { pan?: number; distance?: number }
export interface SoundDesignSpec {
  id: string;
  /** The first layer's peak is the moment that meets the picture. */
  layers: readonly SoundDesignLayer[];
  /** Picks this take's small pitch change. Omit it to keep the pitch exact. */
  seed?: number;
  intensity?: SoundIntensity;
  room?: SoundRoomId;
  position?: SoundPosition;
}
export interface SoundDesignProblem { path: string; code: "sound-design-unknown" | "sound-design-range" | "sound-design-rights"; message: string }
export interface CompiledSoundDesign {
  /** Hash this text for the cache key. It holds every input that changes the output. */
  key: string;
  inputs: readonly string[];
  /** Everything after `-i` for FFmpeg. Each value comes from a bounded number or a fixed table. */
  ffmpegArgs: readonly string[];
  peakSeconds: number;
  durationSeconds: number;
  /** One line per source file, so rights travel with the result. */
  sources: readonly { id: string; licenseId: string; author: string; sourceUrl: string; attribution?: string; sha256: string }[];
}

const clean = (value: number) => Number(value.toFixed(4));
const inRange = (value: number | undefined, low: number, high: number) => value === undefined || (Number.isFinite(value) && value >= low && value <= high);

/** A small seeded generator, so a take depends only on its seed and its place. */
function random(seed: number) {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Take `index` from `pool`. Each pass through the pool has its own order, and a pass never starts on the take that ended the last one. */
export function soundVariant<T>(pool: readonly T[], seed: number, index: number): T {
  if (!pool.length) throw new Error("A variation needs at least one take.");
  const size = pool.length, order = (pass: number) => {
    const next = random(seed + pass * 7919), items = pool.map((_, i) => i);
    for (let i = size - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return items;
  };
  const pass = Math.floor(index / size), current = order(pass);
  if (pass > 0 && size > 1 && order(pass - 1)[size - 1] === current[0]) [current[0], current[1]] = [current[1], current[0]];
  return pool[current[index % size]];
}
/** A small detune for one take, in cents, so a repeated sound is not one identical file. */
export const takeDetuneCents = (seed: number, index: number) => Math.round((random(seed + index * 104729)() - .5) * 70);

const FORMS: Readonly<Record<string, string>> = { wooden: "wood", metallic: "metal", stony: "stone", watery: "water", glassy: "glass", papery: "paper" };
const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(word => FORMS[word] ?? (word.length > 4 ? word.replace(/(ing|ed|es|s)$/, "") : word));
export interface SoundMatch { sound: SoundAssetRecord; score: number; matched: readonly string[] }
/** Search the local catalog by words. It is exact and repeatable, it needs no model, and it never ranks a record that fails a rights check. */
export function findSounds(catalog: SoundCatalog, query: string, options: { material?: string; origin?: SoundAssetRecord["origin"]; shippable?: boolean; limit?: number } = {}): SoundMatch[] {
  const refused = new Set(inspectSoundCatalog(catalog).map(item => item.id)), asked = [...new Set(words(query))];
  const matches = catalog.sounds.flatMap(sound => {
    if (refused.has(sound.id) || (options.material && sound.material !== options.material) || (options.origin && sound.origin !== options.origin) || (options.shippable && !sound.redistributable)) return [];
    const id = new Set(words(sound.id)), tags = new Set(sound.tags.flatMap(words)), text = new Set(words(sound.description)), material = sound.material ? words(sound.material) : [];
    let score = 0;
    const matched = asked.filter(word => {
      const points = (material.includes(word) ? 4 : 0) + (id.has(word) ? 3 : 0) + (tags.has(word) ? 2 : 0) + (text.has(word) ? 1 : 0);
      score += points;
      return points > 0;
    });
    return matched.length ? [{ sound, score: score * matched.length / asked.length, matched }] : [];
  });
  return matches.sort((a, b) => b.score - a.score || a.sound.id.localeCompare(b.sound.id, "en")).slice(0, options.limit ?? 10);
}
/** Contact sounds by material, from the catalog only. Footsteps get their own key, such as `stone-step`. A material with no sound stays out, so a contact is silent, not wrong. */
export function contactProfiles(catalog: SoundCatalog, options: { intensity?: SoundIntensity; path?: (sound: SoundAssetRecord) => string } = {}): Record<string, ImpactSoundProfile> {
  const refused = new Set(inspectSoundCatalog(catalog).map(item => item.id)), path = options.path ?? (sound => sound.path);
  const groups = new Map<string, SoundAssetRecord[]>();
  for (const sound of catalog.sounds) {
    if (!sound.material || refused.has(sound.id) || !sound.tags.some(tag => tag === "touch" || tag === "drop" || tag === "impact" || tag === "step")) continue;
    const key = sound.tags.includes("step") ? sound.material + "-step" : sound.material;
    groups.set(key, [...groups.get(key) ?? [], sound]);
  }
  const gainDb = -12 + SOUND_INTENSITIES[options.intensity ?? "neutral"];
  return Object.fromEntries([...groups].sort(([a], [b]) => a.localeCompare(b, "en")).map(([material, sounds]) => {
    const [first, ...rest] = sounds.sort((a, b) => a.id.localeCompare(b.id, "en")).map(path);
    return [material, { assetRef: first, variants: rest, gainDb }];
  }));
}

export function inspectSoundDesign(spec: SoundDesignSpec, catalog: SoundCatalog): SoundDesignProblem[] {
  const problems: SoundDesignProblem[] = [], refused = new Set(inspectSoundCatalog(catalog).map(item => item.id));
  const report = (path: string, code: SoundDesignProblem["code"], message: string) => problems.push({ path, code, message });
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(spec.id ?? "")) report("/id", "sound-design-range", "A recipe needs a plain ID.");
  if (!spec.layers?.length || spec.layers.length > MAX_LAYERS) report("/layers", "sound-design-range", `A recipe needs 1 to ${MAX_LAYERS} layers.`);
  (spec.layers ?? []).forEach((layer, index) => {
    const at = `/layers/${index}`, sound = catalog.sounds.find(item => item.id === layer.sound);
    if (!sound) report(at + "/sound", "sound-design-unknown", `The catalog has no sound "${layer.sound}".`);
    else if (refused.has(sound.id)) report(at + "/sound", "sound-design-rights", `Sound "${layer.sound}" failed a rights check.`);
    if (!inRange(layer.gainDb, -48, 12)) report(at + "/gainDb", "sound-design-range", "Gain runs from -48 to 12 dB.");
    if (!inRange(layer.offsetMs, 0, 10000)) report(at + "/offsetMs", "sound-design-range", "Offset runs from 0 to 10000 ms.");
    if (!inRange(layer.pitchCents, -2400, 2400)) report(at + "/pitchCents", "sound-design-range", "Pitch runs from -2400 to 2400 cents.");
    if (!inRange(layer.highpassHz, 20, 8000)) report(at + "/highpassHz", "sound-design-range", "High-pass runs from 20 to 8000 Hz.");
    if (!inRange(layer.lowpassHz, 200, 20000)) report(at + "/lowpassHz", "sound-design-range", "Low-pass runs from 200 to 20000 Hz.");
  });
  if (spec.intensity !== undefined && !Object.prototype.hasOwnProperty.call(SOUND_INTENSITIES, spec.intensity)) report("/intensity", "sound-design-unknown", `Use one of: ${Object.keys(SOUND_INTENSITIES).join(", ")}.`);
  if (spec.room !== undefined && !Object.prototype.hasOwnProperty.call(SOUND_ROOMS, spec.room)) report("/room", "sound-design-unknown", `Use one of: ${Object.keys(SOUND_ROOMS).join(", ")}.`);
  if (!inRange(spec.position?.pan, -1, 1)) report("/position/pan", "sound-design-range", "Pan runs from -1 to 1.");
  if (!inRange(spec.position?.distance, 1, 200)) report("/position/distance", "sound-design-range", "Distance runs from 1 to 200 metres.");
  if (spec.seed !== undefined && !Number.isSafeInteger(spec.seed)) report("/seed", "sound-design-range", "A seed is a whole number.");
  return problems;
}

/** The FFmpeg recipe for a sound design. `locate` turns a catalog record into a file path. */
export function compileSoundDesign(spec: SoundDesignSpec, catalog: SoundCatalog, locate: (sound: SoundAssetRecord) => string): CompiledSoundDesign {
  const problems = inspectSoundDesign(spec, catalog);
  if (problems.length) throw new Error(`Sound design "${spec.id}": ${problems[0].path} ${problems[0].message}`);
  const room = SOUND_ROOMS[spec.room ?? "dry"], distance = spec.position?.distance ?? 1, pan = spec.position?.pan ?? 0;
  const detune = spec.seed === undefined ? 0 : takeDetuneCents(spec.seed, 0);
  const records = spec.layers.map(layer => catalog.sounds.find(item => item.id === layer.sound)!);
  const filters: string[] = [], labels: string[] = [];
  let peakSeconds = 0, durationSeconds = 0;
  spec.layers.forEach((layer, index) => {
    const sound = records[index], ratio = 2 ** (((layer.pitchCents ?? 0) + detune) / 1200), offset = (layer.offsetMs ?? 0) / 1000;
    const steps = [`aresample=${SAMPLE_RATE}`, "aformat=channel_layouts=stereo"];
    if (ratio !== 1) steps.push(`asetrate=${clean(SAMPLE_RATE * ratio)}`, `aresample=${SAMPLE_RATE}`);
    if (layer.highpassHz) steps.push(`highpass=f=${layer.highpassHz}`);
    if (layer.lowpassHz) steps.push(`lowpass=f=${layer.lowpassHz}`);
    steps.push(`volume=${clean(layer.gainDb ?? 0)}dB`);
    if (offset) steps.push(`adelay=${Math.round(offset * 1000)}:all=1`);
    filters.push(`[${index}:a]${steps.join(",")}[l${index}]`);
    labels.push(`[l${index}]`);
    if (index === 0) peakSeconds = sound.peakSeconds / ratio;
    durationSeconds = Math.max(durationSeconds, offset + sound.durationSamples / sound.sampleRate / ratio);
  });
  // Distance: quieter by 6 dB per doubling, duller through the air, and more of the room.
  const distanceDb = -6 * Math.log2(distance), airHz = Math.round(Math.max(2500, 20000 / distance ** .45)), wetDb = room.wetDb + 3 * Math.log2(distance);
  const angle = (pan + 1) * Math.PI / 4, left = clean(Math.cos(angle) * Math.SQRT2), right = clean(Math.sin(angle) * Math.SQRT2);
  const after = [`volume=${clean(SOUND_INTENSITIES[spec.intensity ?? "neutral"] + distanceDb)}dB`];
  if (distance > 1) after.push(`lowpass=f=${airHz}`);
  if (pan) after.push(`pan=stereo|c0=${left}*c0|c1=${right}*c1`);
  filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,${after.join(",")}[dry]`);
  const args: string[] = spec.layers.flatMap((_, index) => ["-i", locate(records[index])]);
  if (room.tailSeconds) {
    // Convolution with seeded noise gives a diffuse tail. FFmpeg already has it, so a room adds no dependency.
    const tail = room.tailSeconds, curve = `aeval='val(0)*exp(-6.9*t/${tail})':c=same`;
    args.push("-f", "lavfi", "-i", `anoisesrc=d=${tail}:c=pink:r=${SAMPLE_RATE}:a=1:seed=${room.seed}`);
    filters.push(`[${labels.length}:a]aformat=channel_layouts=stereo,${curve},lowpass=f=${room.darkHz}[ir]`);
    filters.push(`[dry]asplit[d1][d2]`, `[d2]apad=pad_dur=${tail}[d3]`, `[d3][ir]afir=dry=1:wet=1:gtype=none:ir=0:length=1[w0]`, `[w0]volume=${clean(wetDb)}dB[wet]`);
    filters.push(`[d1][wet]amix=inputs=2:normalize=0:duration=longest[out]`);
    durationSeconds += tail;
  } else filters.push("[dry]anull[out]");
  const key = JSON.stringify({ version: SOUND_BAKE_VERSION, spec: { ...spec, id: undefined }, files: records.map(sound => sound.sha256) });
  return { key, inputs: records.map(locate), ffmpegArgs: [...args, "-filter_complex", filters.join(";"), "-map", "[out]", "-ar", String(SAMPLE_RATE), "-ac", "2", "-c:a", "pcm_s24le", "-bitexact"],
    peakSeconds: clean(peakSeconds), durationSeconds: clean(durationSeconds),
    sources: [...new Map(records.map(sound => [sound.id, { id: sound.id, licenseId: sound.licenseId, author: sound.author, sourceUrl: sound.sourceUrl, attribution: sound.attribution, sha256: sound.sha256 }])).values()] };
}
/** The event that lands a baked sound's peak on `frame`. A sound too early for the film starts at 0 and keeps its order. */
export function soundDesignEvent(compiled: Pick<CompiledSoundDesign, "peakSeconds">, cue: { id: string; frame: number; subframeOffset?: number; laneId?: string; assetRef: string; gainDb?: number }, fps: RationalFps): SoundEvent {
  const start = Math.max(0, cue.frame + (cue.subframeOffset ?? 0) - compiled.peakSeconds * fps.num / fps.den), frame = Math.floor(start);
  return { id: cue.id, laneId: cue.laneId ?? "sfx", frame, subframeOffset: start - frame, assetRef: cue.assetRef, gainDb: cue.gainDb };
}
/** The FFmpeg recipe for a bed of any length from a seamless catalog loop. It fades at both ends, so it never starts on a click. */
/** `fadeSeconds` fades both ends; `fadeOutSeconds` gives the end its own fade, for a sound that comes in quickly and lingers out. */
export function compileAmbience(spec: { sound: string; durationSeconds: number; fadeSeconds?: number; fadeOutSeconds?: number; gainDb?: number; lowpassHz?: number; reverse?: boolean }, catalog: SoundCatalog, locate: (sound: SoundAssetRecord) => string) {
  const sound = catalog.sounds.find(item => item.id === spec.sound);
  if (!sound || inspectSoundCatalog(catalog).some(item => item.id === sound.id)) throw new Error(`Ambience "${spec.sound}" is not a usable catalog sound.`);
  if (!sound.tags.includes("loop")) throw new Error(`Sound "${spec.sound}" is not a seamless loop.`);
  if (!inRange(spec.durationSeconds, .1, 3600) || !inRange(spec.fadeSeconds, 0, 30) || !inRange(spec.fadeOutSeconds, 0, 30) || !inRange(spec.gainDb, -60, 12) || !inRange(spec.lowpassHz, 200, 20000)) throw new Error("Ambience length, fade or gain is out of range.");
  const fade = spec.fadeSeconds ?? 1.5, fadeOut = spec.fadeOutSeconds ?? fade, end = clean(spec.durationSeconds - fadeOut);
  return { key: JSON.stringify({ version: SOUND_BAKE_VERSION, spec, file: sound.sha256 }), ffmpegArgs: ["-stream_loop", "-1", "-i", locate(sound), "-af", `${spec.reverse ? "atrim=0:" + spec.durationSeconds + ",areverse," : ""}${spec.lowpassHz ? `lowpass=f=${spec.lowpassHz},` : ""}volume=${clean(spec.gainDb ?? 0)}dB,afade=t=in:d=${fade}:curve=qsin,afade=t=out:st=${end}:d=${fadeOut}:curve=qsin`, "-t", String(spec.durationSeconds), "-ar", String(SAMPLE_RATE), "-ac", "2", "-c:a", "pcm_s24le", "-bitexact"] };
}
