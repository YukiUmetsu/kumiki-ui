/** A sonic logo: a short motif of a few notes that plays as the brand's mark lands on the end card (doc 34, S8).
 *
 * Practice: a sonic logo is two to five notes in about a second, simple enough to hum, and the same every time it plays, so it works
 * like a visual mark (Intel's five-note bong, Netflix's two-beat "ta-dum"; Audio UX and Sixième Son on sonic branding). It resolves:
 * the last note lands on the home note, so the ending feels finished. It is made on request only, never by default.
 *
 * Kumiki builds it from catalog sounds as an ordinary sound-design recipe: a struck touch of the brand's material on the mark's
 * moment, bell tones pitched to a motif picked by the seed from a major pentatonic scale, and, for glass, a shimmer over the last note,
 * all in a small room. The seed fixes the motif, so a brand keeps its tune from film to film. Pure: the same settings give the same
 * recipe.
 */
import type { FilmSonicLogo, SonicMaterial } from "./film-cards";
import type { SoundDesignSpec, SoundRoomId } from "./sound-design";

export type { FilmSonicLogo, SonicMaterial } from "./film-cards";
export const SONIC_MATERIALS: readonly SonicMaterial[] = ["glass", "wood", "plastic"];
export interface SonicProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** The major pentatonic scale in semitones above the home note, and its octave: any run of its notes sounds consonant. */
const SCALE = [0, 2, 4, 7, 9, 12];
/** Gaps between notes, in ms, picked per note; the last gap is held longer, so the final note lands. */
const GAPS = [120, 150, 190];
const random = (seed: number) => {
  let state = (seed * 2654435761 + 1013904223) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** The motif for a seed: each note's pitch in semitones above the home note, and when it starts after the first, in ms. No note repeats
 * the one before it, and the last note is the home note or its octave, whichever is nearer the note before (the octave after the home note), so the motif
 * resolves. */
export function sonicMotif(seed: number, notes: number): Array<{ semitones: number; offsetMs: number }> {
  const next = random(seed), motif: Array<{ semitones: number; offsetMs: number }> = [];
  let at = 0;
  for (let i = 0; i < notes; i++) {
    const last = motif[i - 1]?.semitones;
    let semitones: number;
    if (i === notes - 1) semitones = last !== undefined && (last >= 6 || last === 0) ? 12 : 0;
    else { const pool = SCALE.slice(0, 5).filter(note => note !== last); semitones = pool[Math.floor(next() * pool.length)]; }
    if (i > 0) at += i === notes - 1 ? 240 : GAPS[Math.floor(next() * GAPS.length)];
    motif.push({ semitones, offsetMs: at });
  }
  return motif;
}

/** Each material's struck touch, its bell (and the cents that bring that bell to the home note, C5), its filter and its room. The two
 * bell recordings ring at about C6 and G5. */
const MATERIAL: Record<SonicMaterial, { touch: string; bell: string; bellCents: number; lowpassHz?: number; highpassHz?: number; room: SoundRoomId; shimmer: boolean }> = {
  glass: { touch: "foley-glass-touch", bell: "tone-ding-mid", bellCents: -1200, room: "hall", shimmer: true },
  wood: { touch: "foley-wood-touch", bell: "tone-ding-low", bellCents: -700, lowpassHz: 3200, room: "room", shimmer: false },
  plastic: { touch: "foley-plastic-touch", bell: "tone-ding-mid", bellCents: -1200, lowpassHz: 4200, highpassHz: 180, room: "room", shimmer: false },
};

/** The sound-design recipe of a sonic logo. Its first layer, the touch, is the moment that meets the mark. */
export function sonicLogoDesign(sonic: FilmSonicLogo, id = "sonic-logo"): SoundDesignSpec {
  const material = MATERIAL[sonic.material ?? "glass"], motif = sonicMotif(sonic.seed ?? 1, sonic.notes ?? 3), final = motif[motif.length - 1];
  return {
    id, room: material.room,
    layers: [
      { sound: material.touch, gainDb: -2 },
      ...motif.map((note, i) => ({ sound: material.bell, pitchCents: material.bellCents + note.semitones * 100, offsetMs: note.offsetMs, gainDb: i === motif.length - 1 ? 0 : -4,
        ...material.lowpassHz ? { lowpassHz: material.lowpassHz } : {}, ...material.highpassHz ? { highpassHz: material.highpassHz } : {} })),
      ...material.shimmer ? [{ sound: "tech-shimmer", offsetMs: Math.max(0, final.offsetMs - 60), gainDb: -16, highpassHz: 2500 }] : [],
    ],
  };
}

/** The marker a film's sound event carries for a sonic logo; the renderer turns it into a baked file. */
export const sonicRef = (sonic: FilmSonicLogo) => `sonic:${sonic.seed ?? 1}:${sonic.material ?? "glass"}:${sonic.notes ?? 3}`;
/** Read a marker back, from the end of a path. */
export function parseSonicRef(ref: string): FilmSonicLogo | undefined {
  const found = /sonic:(-?\d+):(glass|wood|plastic):(\d)$/.exec(ref);
  return found ? { seed: Number(found[1]), material: found[2] as SonicMaterial, notes: Number(found[3]) } : undefined;
}

/** Checks a brand's sonic logo. */
export function inspectSonic(sonic: FilmSonicLogo, path = "/brand/sonic"): SonicProblem[] {
  const problems: SonicProblem[] = [], say = (code: string, at: string, message: string, hint?: string) => problems.push({ severity: "error", code, path: path + at, message, hint });
  if (sonic.seed !== undefined && !(Number.isSafeInteger(sonic.seed) && sonic.seed >= 0 && sonic.seed <= 999999)) say("sonic-seed", "/seed", "A seed is a whole number from 0 to 999999.", "Keep one seed per brand, so its tune stays the same.");
  if (sonic.material !== undefined && !SONIC_MATERIALS.includes(sonic.material)) say("sonic-material", "/material", `"${sonic.material}" is not a material.`, `Materials: ${SONIC_MATERIALS.join(", ")}.`);
  if (sonic.notes !== undefined && !(Number.isSafeInteger(sonic.notes) && sonic.notes >= 2 && sonic.notes <= 5)) say("sonic-notes", "/notes", "A sonic logo has 2 to 5 notes.", "More is a jingle, not a logo.");
  if (sonic.gainDb !== undefined && !(Number.isFinite(sonic.gainDb) && sonic.gainDb >= -24 && sonic.gainDb <= 6)) say("sonic-gain", "/gainDb", "Gain runs from -24 to 6 dB.");
  return problems;
}
