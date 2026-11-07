/** A catalog of sound files whose rights travel with each file. It holds data and pure checks only: nothing here plays,
 * downloads or mixes. A record says where a sound came from, what may be done with it, and where its peak sits, so a
 * cue can land the peak on its frame.
 */
export interface SoundAssetRecord {
  id: string;
  /** Path relative to the catalog file. Never absolute, and it never climbs out of the catalog folder. */
  path: string;
  sha256: string;
  durationSamples: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  /** Seconds from the start of the file to the moment that must meet the picture. */
  peakSeconds: number;
  /** Loudness of the loudest 150 ms, in LUFS, as measured by the source. */
  loudnessLufs: number;
  /** How far the source says to lower it under speech, in dB. */
  underVoiceoverDb?: number;
  tags: readonly string[];
  material?: string;
  /** What the sound is, in words. */
  description: string;
  /** `synthesized` is designed by code, `recorded` is a real recording, `generated` is from a model. */
  origin: "synthesized" | "recorded" | "generated";
  sourceUrl: string;
  sourceRevision?: string;
  author: string;
  licenseId: string;
  /** The credit line, if the licence requires one. */
  attribution?: string;
  /** May this file ship inside the library? Commercial use in a film does not imply this. */
  redistributable: boolean;
  allowedUses: readonly ("commercial-video" | "library-distribution")[];
  verifiedAt: string;
}
export interface SoundCatalog { schemaVersion: 1; sounds: readonly SoundAssetRecord[] }
export interface SoundCatalogProblem { id: string; code: "sound-rights" | "sound-attribution" | "sound-path" | "sound-hash" | "sound-format" | "sound-duplicate" | "sound-timing" | "sound-provenance"; message: string }

/** Licences that allow commercial use. Anything else fails closed, so an NC licence can never slip in. */
const LICENCES: Readonly<Record<string, { attribution: boolean }>> = { "CC0-1.0": { attribution: false }, "CC-BY-4.0": { attribution: true }, "Apache-2.0": { attribution: false }, "MIT": { attribution: false } };

export const isSafeSoundPath = (path: string) => !path.startsWith("/") && !path.includes("\\") && !/^[a-z]+:/i.test(path) && path.split("/").every(part => part !== ".." && part !== "." && part !== "");

/** Every problem in a catalog. A record with missing rights, an odd path or an impossible format is refused. */
export function inspectSoundCatalog(catalog: SoundCatalog): SoundCatalogProblem[] {
  const problems: SoundCatalogProblem[] = [], seen = new Set<string>();
  for (const sound of catalog.sounds) {
    const report = (code: SoundCatalogProblem["code"], message: string) => problems.push({ id: sound.id, code, message });
    if (seen.has(sound.id)) report("sound-duplicate", `Sound ID "${sound.id}" is used twice.`);
    seen.add(sound.id);
    const licence = LICENCES[sound.licenseId];
    if (!licence) report("sound-rights", `Licence "${sound.licenseId}" is not on the allowed list.`);
    if (licence?.attribution && !sound.attribution?.trim()) report("sound-attribution", `Licence ${sound.licenseId} needs an attribution line.`);
    if (!sound.allowedUses.includes("commercial-video")) report("sound-rights", "The record does not allow commercial video.");
    if (sound.redistributable !== sound.allowedUses.includes("library-distribution")) report("sound-rights", "`redistributable` and `allowedUses` disagree.");
    if (!/^https:\/\//.test(sound.sourceUrl) || !sound.author.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(sound.verifiedAt)) report("sound-provenance", "A sound needs a source URL, an author and a verification date.");
    if (!isSafeSoundPath(sound.path)) report("sound-path", `"${sound.path}" leaves the catalog folder.`);
    if (!/^[0-9a-f]{64}$/.test(sound.sha256)) report("sound-hash", "The hash is not SHA-256.");
    if (!(sound.sampleRate >= 44100 && sound.channels >= 1 && sound.channels <= 2 && sound.durationSamples > 0)) report("sound-format", "The format is not supported.");
    if (!(sound.peakSeconds >= 0 && sound.peakSeconds * sound.sampleRate <= sound.durationSamples)) report("sound-timing", "The peak is outside the file.");
  }
  return problems;
}
/** The records that may ship in a pack. A record that fails a check, or that only allows use in a film, stays out. */
export function redistributableSounds(catalog: SoundCatalog): SoundAssetRecord[] {
  const refused = new Set(inspectSoundCatalog(catalog).map(item => item.id));
  return catalog.sounds.filter(sound => sound.redistributable && !refused.has(sound.id));
}
/** The format of a RIFF WAV file, read from its bytes. It throws on anything else, so a damaged file cannot enter a mix. */
export function readWavFormat(bytes: Uint8Array): { channels: number; sampleRate: number; bitDepth: number; durationSamples: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Not a RIFF WAV file.");
  let at = 12, format: { channels: number; sampleRate: number; bitDepth: number } | undefined, data: number | undefined;
  while (at + 8 <= bytes.length) {
    const id = tag(at), size = view.getUint32(at + 4, true), body = at + 8;
    if (id === "fmt " && body + 16 <= bytes.length) format = { channels: view.getUint16(body + 2, true), sampleRate: view.getUint32(body + 4, true), bitDepth: view.getUint16(body + 14, true) };
    if (id === "data") data = Math.min(size, bytes.length - body);
    at = body + size + (size % 2);
  }
  if (!format || data === undefined || !format.channels || !format.bitDepth) throw new Error("The WAV file has no format or no data.");
  return { ...format, durationSamples: Math.floor(data / (format.channels * format.bitDepth / 8)) };
}
