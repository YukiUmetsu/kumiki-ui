#!/usr/bin/env node
/** Original science and technology sounds, synthesized by FFmpeg from fixed recipes, and added to the catalog.
 *   npm run sound:synth            Make the files, measure them, and write their catalog records.
 * The recipes are data below: each is an FFmpeg `aevalsrc` expression for left and right, a length and a fade. FFmpeg's expression
 * evaluator is deterministic, so the same recipe always gives the same file and the same hash. These sounds are this project's own
 * work, under its MIT licence. Restraint is the style: short, soft and low in the mix, never an alarm.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, loudness } from "./sound-catalog.mjs";
import { readWavFormat } from "../registry/video/sound-catalog.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."), DIR = join(ROOT, "assets/sound"), FILE = join(DIR, "catalog.json"), OUT = "kumiki/tech";
const env = (attack, decay) => `(1-exp(-t*${attack}))*exp(-t*${decay})`;
/** A dark drone: A1, E2 and A2, each a sum of six harmonics falling off as a soft saw, breathing on slow LFOs of whole cycles per 8 s. The
 * right channel takes other LFO phases and a 0.125 Hz detune, which still loops in 8 s, for width. */
const drone = side => [[55, 1], [82.5, .7], [110, .5]].map(([f, a], v) => {
  const detune = side ? .125 : 0, lfo = `(0.62+0.38*sin(2*PI*${v + 1}*t/8+${(v * 1.7 + side * 2.1).toFixed(2)}))`;
  const voice = [1, 2, 3, 4, 5, 6].map(h => `${(1 / h).toFixed(3)}*sin(2*PI*${((f + detune) * h).toFixed(3)}*t)`).join("+");
  return `${(.09 * a).toFixed(4)}*${lfo}*(${voice})`;
}).join("+");
/** A pulse at 90 beats a minute (12 beats in 8 s): a 1.6 kHz tick that dies in 20 ms over a 70 Hz thump that dies in 120 ms. */
const pulse = side => `st(0,mod(t,0.666667));(${side ? .3 : .34}*sin(2*PI*1600*t)*exp(-ld(0)*220)+0.5*sin(2*PI*70*t)*exp(-ld(0)*26))*(1-exp(-ld(0)*2000))`;
/** A Shepard-Risset rise: eight octave-spaced tones each climbing one octave over the 8 s, so the phase of tone k is
 * f0·2^k·T/ln2·(2^(t/T)-1). Loudness follows a bell over the log of the frequency, so the top fades out as the bottom comes in. */
const shepard = side => [0, 1, 2, 3, 4, 5, 6, 7].map(k => {
  const f0 = 27.5 * 2 ** k * (side ? 1.003 : 1), place = `(${k}+t/8)`;
  return `exp(-pow((${place}-4)/1.6,2))*sin(2*PI*${f0.toFixed(4)}*8/log(2)*(pow(2,t/8)-1))`;
}).join("+").replace(/^/, "0.11*(1-exp(-t*3))*(").concat(")");
/** A braam: E1, B1 and E2 voices of eight saw harmonics, bending down a semitone over its length (the phase is the integral of
 * f0·2^(-t/T₁₂)), soft-clipped with tanh for the brass growl, a 25 ms attack and a long tail. */
const braam = side => {
  const bend = 12 * 3.4, voices = [[41.2, 1], [61.74, .55], [82.41, .7]].map(([f, a]) => {
    const f0 = f * (side ? 1.004 : 1), phase = `(${f0.toFixed(3)}*(-${bend}/log(2))*(pow(2,-t/${bend})-1))`;
    return `${a}*(${[1, 2, 3, 4, 5, 6, 7, 8].map(h => `${(1 / h).toFixed(3)}*sin(2*PI*${h}*${phase})`).join("+")})`;
  }).join("+");
  return `0.5*tanh(1.6*(${voices}))*(1-exp(-t*40))*exp(-t*0.75)`;
};
/** A reversed swell: an A-major chord with a slight chorus and a wash of noise under an envelope that grows to its end, as a reverb tail
 * played backwards does. */
const swellReverse = side => `exp(4.2*(t-1.4))*(0.32*(sin(2*PI*${side ? 220.7 : 220}*t)+0.8*sin(2*PI*${side ? 277.6 : 277.18}*t)+0.7*sin(2*PI*${side ? 330.4 : 329.63}*t)+0.4*sin(2*PI*${side ? 441.3 : 440}*t))+0.35*(2*random(${side})-1))`;
/** Each recipe: expressions for left and right (t is seconds), length, fades in seconds, and catalog text. */
const RECIPES = [
  { id: "tech-pulse-soft", seconds: .6, fadeOut: .15, tags: ["tech", "pulse", "ding", "chime", "notification", "soft", "short"],
    description: "A soft notification ding: a high note over its octave below, gone in half a second.",
    left: `0.5*(sin(2*PI*1046.5*t)*${env(900, 14)}+0.35*sin(2*PI*523.25*t)*${env(600, 9)})`, right: null },
  { id: "tech-scan-sweep", seconds: 1.4, fadeOut: .25, tags: ["tech", "scan", "sweep", "rise", "science", "data", "diagram"],
    description: "A smooth rising scan: a tone sweeping upward with a breath of noise, as a sensor passes over something.",
    left: `0.32*sin(PI*t/1.4)*(sin(2*PI*(220*t+800*t*t))+0.12*(2*random(0)-1))`, right: `0.32*sin(PI*t/1.4)*(sin(2*PI*(221*t+801*t*t))+0.12*(2*random(1)-1))` },
  { id: "tech-digital-glitch", seconds: 1.0, fadeOut: .2, tags: ["tech", "glitch", "digital", "stutter", "data", "error", "transition"],
    description: "A short stuttering digital glitch: noise clicks at irregular moments, for data, an error or a quick transition.",
    left: `st(0,floor((t+0)*30));st(1,sin(ld(0)*12.9898+0)*43758.5453);st(2,gt(ld(1)-floor(ld(1)),0.3));st(3,mod(t+0,1/30));0.55*ld(2)*lt(ld(3),0.006)*exp(-ld(3)*900)*(0.7*(2*random(0)-1)+0.3*sin(2*PI*1800*t))`, right: `st(0,floor((t+0.011)*30));st(1,sin(ld(0)*12.9898+1)*43758.5453);st(2,gt(ld(1)-floor(ld(1)),0.3));st(3,mod(t+0.011,1/30));0.55*ld(2)*lt(ld(3),0.006)*exp(-ld(3)*900)*(0.7*(2*random(1)-1)+0.3*sin(2*PI*1800*t))` },
  { id: "tech-activate", seconds: .8, fadeOut: .2, tags: ["tech", "activate", "on", "confirm", "rise", "two-tone", "success"],
    description: "A gentle two-step rise, a fourth then a fifth up, for something switching on.",
    left: `0.42*(if(lt(t,0.18),sin(2*PI*440*t)*(1-exp(-t*400)),0)+if(gte(t,0.18),(sin(2*PI*659.25*t)+0.25*sin(2*PI*1318.5*t))*(1-exp(-(t-0.18)*400))*exp(-(t-0.18)*5),0))`, right: null },
  { id: "tech-shimmer", seconds: 1.8, fadeOut: .5, tags: ["tech", "shimmer", "sparkle", "hologram", "reveal", "science", "air"],
    description: "A high, airy shimmer of four bell partials with a slow tremolo, for a reveal or a hologram.",
    left: `0.16*(1-exp(-t*8))*exp(-t*1.4)*(1+0.35*sin(2*PI*7*t))*(sin(2*PI*2093*t)+sin(2*PI*2637*t)+0.8*sin(2*PI*3136*t)+0.5*sin(2*PI*4186*t))`,
    right: `0.16*(1-exp(-t*8))*exp(-t*1.4)*(1+0.35*sin(2*PI*7*t+1.2))*(sin(2*PI*2095*t)+sin(2*PI*2639*t)+0.8*sin(2*PI*3139*t)+0.5*sin(2*PI*4190*t))` },
  // Tonal beds and builds (doc 34, S7). Each loop is 8 s and every frequency and LFO in it completes whole cycles in 8 s, so it repeats
  // with no seam and needs no fade. Beds sit at the catalog's -23 LUFS like the recorded ones.
  { id: "bed-drone-low", seconds: 8, fadeOut: 0, tags: ["ambience", "loop", "drone", "tonal", "tension", "pad", "low", "music"],
    description: "A dark, slowly breathing drone on A and E: low saw-like voices with a soft top, for tension under a build.",
    left: drone(0), right: drone(1) },
  { id: "bed-pulse-tick", seconds: 8, fadeOut: 0, tags: ["ambience", "loop", "pulse", "tick", "clock", "tempo", "tension", "music", "90bpm"],
    description: "A ticking pulse at 90 beats a minute: a dull tick and a soft low thump on each beat, like a clock under a scene.",
    left: pulse(0), right: pulse(1) },
  { id: "rise-shepard", seconds: 8, fadeOut: .4, tags: ["riser", "build", "shepard", "rise", "endless", "tension", "swell", "8s"],
    description: "An endless rise: octave-spaced tones climbing for eight seconds, the top fading out as the bottom fades in, so it never arrives.",
    left: shepard(0), right: shepard(1) },
  // Trailer hits (doc 34, S4 and S5). A braam for a title or a reveal; a transient and a sub drop to layer with any impact; a reverse
  // swell whose loudest moment is its end, so its end lands on the cut.
  { id: "braam-low", seconds: 3.4, fadeOut: .8, tags: ["braam", "hit", "trailer", "brass", "low", "reveal", "title", "cinematic", "impact"],
    description: "A huge, low brass-like blast on E, soft-clipped, bending down a semitone and ringing out over three seconds: for a title or a reveal.",
    left: braam(0), right: braam(1) },
  { id: "sub-drop", seconds: 1.4, fadeOut: .3, tags: ["sub", "drop", "boom", "low", "hit", "layer", "cinematic", "trailer"],
    description: "A falling sub-bass sine, 70 Hz to 30 Hz in about a second, to layer under a hit: felt more than heard.",
    left: `0.9*(1-exp(-t*200))*exp(-t*1.7)*sin(2*PI*(30*t+40/3*(1-exp(-3*t))))`, right: null },
  { id: "hit-transient", seconds: .3, fadeOut: .08, tags: ["hit", "transient", "click", "attack", "layer", "impact", "trailer", "short"],
    description: "The sharp top of a hit: a bright noise click and a short knock, to layer over an impact so it cuts through.",
    left: `0.55*(2*random(0)-1)*exp(-t*70)+0.45*sin(2*PI*190*t)*exp(-t*28)*(1-exp(-t*3000))`, right: `0.55*(2*random(1)-1)*exp(-t*70)+0.45*sin(2*PI*190*t)*exp(-t*28)*(1-exp(-t*3000))` },
  { id: "swell-reverse", seconds: 1.4, fadeOut: .006, tags: ["swell", "reverse", "suck", "transition", "rise", "cut", "trailer", "whoosh"],
    description: "A reversed swell: an airy chord and noise growing for a second and a half and stopping dead, so its end lands on a cut.",
    left: swellReverse(0), right: swellReverse(1) },
  { id: "tech-ui-click", seconds: .16, fadeOut: .05, tags: ["tech", "ui", "click", "tap", "button", "interface", "short"],
    description: "A small, clean interface click with a faint bright ring.",
    left: `0.6*(sin(2*PI*2200*t)*exp(-t*90)+0.4*sin(2*PI*4400*t)*exp(-t*160))*(1-exp(-t*3000))`, right: null },
];

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
/** The catalog's quiet accents (tones, stings, foley) sit near -23 LUFS, so these do too. Short sounds are measured with silence after
 * them, because loudness needs at least one 400 ms block. */
const TARGET_LUFS = -23;
const render = (recipe, file, gainDb) => {
  const right = recipe.right ?? recipe.left;
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=exprs='${recipe.left}|${right}':s=48000:d=${recipe.seconds}`,
    "-af", `${recipe.fadeOut ? `afade=t=out:st=${(recipe.seconds - recipe.fadeOut).toFixed(3)}:d=${recipe.fadeOut},` : ""}volume=${gainDb.toFixed(2)}dB`, "-c:a", "pcm_s24le", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", file], { encoding: "utf8" });
  if (run.status !== 0) throw Error(`FFmpeg could not make ${recipe.id}: ${run.stderr}`);
};
const measured = file => {
  const padded = file.replace(/\.wav$/, ".measure.wav");
  spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-af", "apad=pad_dur=1", padded]);
  const level = loudness(padded);
  spawnSync("rm", ["-f", padded]);
  return level;
};
mkdirSync(join(DIR, OUT), { recursive: true });
const catalog = JSON.parse(readFileSync(FILE, "utf8")), today = new Date().toISOString().slice(0, 10), made = [];
for (const recipe of RECIPES) {
  const path = `${OUT}/${recipe.id}.wav`, file = join(DIR, path);
  // Render once to measure, then again at the gain that brings it to the catalog's level. The gain is rounded, so it is stable.
  render(recipe, file, 0);
  // Never past a -3 dBTP ceiling: sparse clicks reach the loudness target only by pushing their peaks too high.
  const first = measured(file), gain = Math.round(Math.min(TARGET_LUFS - first.integratedLufs, -3 - first.truePeakDbtp) * 10) / 10;
  render(recipe, file, gain);
  const bytes = readFileSync(file), wav = readWavFormat(bytes), samples = decode(file);
  // The sync point is the loudest moment, so a cue lands on what the ear hears first.
  let peak = 0, at = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > peak) { peak = Math.abs(samples[i]); at = i; }
  const level = measured(file);
  made.push({ id: recipe.id, path, sha256: sha256(bytes), channels: wav.channels, sampleRate: wav.sampleRate, bitDepth: wav.bitDepth, durationSamples: wav.durationSamples,
    peakSeconds: Number((at / 48000).toFixed(3)), loudnessLufs: Math.round(level.integratedLufs), underVoiceoverDb: -10, tags: recipe.tags, description: recipe.description,
    sourceUrl: "https://github.com/YukiUmetsu/kumiki-ui/blob/main/scripts/sound-synth.mjs", author: "Kumiki UI", licenseId: "MIT", origin: "synthesized",
    redistributable: true, allowedUses: ["commercial-video", "library-distribution"], verifiedAt: today });
  console.log(`${recipe.id.padEnd(18)} ${(wav.durationSamples / 48000).toFixed(2)} s, peak at ${(at / 48000).toFixed(3)} s, ${level.integratedLufs} LUFS, true peak ${level.truePeakDbtp} dBTP`);
}
const ids = new Set(made.map(sound => sound.id)), sounds = [...catalog.sounds.filter(sound => !ids.has(sound.id)), ...made].sort((a, b) => a.id.localeCompare(b.id, "en"));
writeFileSync(FILE, JSON.stringify({ ...catalog, sounds }, null, 1) + "\n");
console.log(`Wrote ${made.length} sounds. The catalog has ${sounds.length}.`);
