#!/usr/bin/env node
/** A blind listening test: pairs of sounds on the same subject, from different origins, matched in loudness and shuffled.
 *   npm run sound:blind     Write the clips and the pairs to assets/sound/lab/blind/ for the Storybook Blind Listening story.
 * Louder usually wins a comparison, so every clip is brought to -23 LUFS and trimmed to at most 6 seconds. Which clip is X and which is Y
 * is drawn from a fixed seed, so the test is the same every time it is built; the answer key is a separate file the story reveals only
 * after every pair is answered.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loudness } from "./sound-catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."), OUT = join(ROOT, "assets/sound/lab/blind"), SND = join(ROOT, "assets/sound"), VER = join(ROOT, "docs/verification/sound-pack");
/** Each pair: what to listen for, and two sources with their origin, which the listener does not see until the end. */
const PAIRS = [
  { id: "drip", prompt: "A single water drip. Which sounds more real?", a: { file: join(SND, "wyzowl/everyday-props/props-drip.wav"), origin: "synthesized (Wyzowl CC0 kit)" }, b: { file: join(SND, "recorded/drop-water-full.wav"), origin: "recorded (Freesound CC0)" } },
  { id: "page", prompt: "A page turning. Which sounds more real?", a: { file: join(SND, "wyzowl/everyday-props/props-page-turn.wav"), origin: "synthesized (Wyzowl CC0 kit)" }, b: { file: join(VER, "moss-page-turn.m4a"), origin: "generated (local MOSS model)" } },
  { id: "drop", prompt: "A water drop. Which sounds more real?", a: { file: join(SND, "recorded/drop-water-full.wav"), origin: "recorded (Freesound CC0)" }, b: { file: join(VER, "moss-water-drop.m4a"), origin: "generated (local MOSS model)" } },
  { id: "ice", prompt: "Ice cracking. Which sounds more real?", a: { file: join(SND, "recorded/ice-fracture-long.wav"), origin: "recorded (Freesound CC0)" }, b: { file: join(VER, "moss-ice-crack.m4a"), origin: "generated (local MOSS model)" } },
  { id: "walk", prompt: "Footsteps on stone. Which sounds more real?", a: { file: join(VER, "stone-walk-dry.m4a"), origin: "recorded steps, seeded takes (Freesound CC0)" }, b: { file: join(VER, "moss-walk-stone.m4a"), origin: "generated (local MOSS model)" } },
  { id: "film", prompt: "The soundtrack of one short explainer, made with two different sound kits. Which sounds better?", a: { file: join(VER, "billing-gap-A-synth-kit.m4a"), origin: "the original synthesized four-sound kit" }, b: { file: join(VER, "billing-gap-B-catalog-kit.m4a"), origin: "the catalog kit (recorded and Wyzowl sounds)" } },
];
/** A fixed shuffle: a small seeded generator decides which source is X. */
let state = 20261108;
const coin = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 < .5; };
const ffmpeg = args => { const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8" }); if (run.status !== 0) throw Error(run.stderr); };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const pairs = [], key = [];
for (const [index, pair] of PAIRS.entries()) {
  const swap = coin(), [x, y] = swap ? [pair.b, pair.a] : [pair.a, pair.b], n = String(index + 1).padStart(2, "0"), clips = {};
  for (const [label, source] of [["x", x], ["y", y]]) {
    const work = join(OUT, `work-${label}.wav`), padded = join(OUT, "work-pad.wav"), file = `pair-${n}-${label}.m4a`;
    ffmpeg(["-i", source.file, "-t", "6", "-ar", "48000", "-ac", "2", work]);
    ffmpeg(["-i", work, "-af", "apad=pad_dur=1", padded]);
    const gain = Math.max(-30, Math.min(30, -23 - loudness(padded).integratedLufs));
    ffmpeg(["-i", work, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`, "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(OUT, file)]);
    rmSync(work, { force: true }); rmSync(padded, { force: true });
    clips[label] = file;
  }
  pairs.push({ id: pair.id, prompt: pair.prompt, x: clips.x, y: clips.y });
  key.push({ id: pair.id, x: x.origin, y: y.origin });
}
writeFileSync(join(OUT, "pairs.json"), JSON.stringify(pairs, null, 1) + "\n");
writeFileSync(join(OUT, "key.json"), JSON.stringify(key, null, 1) + "\n");
console.log(`Wrote ${pairs.length} pairs to ${OUT}. Clips are matched at -23 LUFS. The key is in key.json; the story reveals it after every answer.`);
