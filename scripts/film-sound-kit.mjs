#!/usr/bin/env node
/** Make an accent kit for audio.accents, with a kit.json that states where each sound peaks.
 * npm run film:sound-kit -- <folder>                       Plain tones, synthesized here with FFmpeg.
 * npm run film:sound-kit -- <folder> --preset=neutral      Designed sounds from assets/sound, with their rights. Also subtle, cinematic.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { redistributableSounds } from "../registry/video/sound-catalog.ts";

/** Each role of a kit, at three strengths. A quiet turn takes `ping`. A big reveal takes `riser` and `hit`. */
const KIT_PRESETS = {
  subtle: { whoosh: "whoosh-medium-soft", riser: "riser-1s-soft", hit: "impact-medium-soft", ping: "tone-ding-low" },
  neutral: { whoosh: "whoosh-medium-medium", riser: "riser-1s-soft", hit: "impact-heavy-firm", ping: "tone-ding-mid" },
  cinematic: { whoosh: "whoosh-slow-medium", riser: "riser-2s-strong", hit: "impact-deep-soft", ping: "tone-ding-mid" },
};
/** Named physical sounds for `audio.cues`, in every kit. */
const FOLEY = { "paper-slide": "foley-paper-slide", "paper-touch": "foley-paper-touch", "card-touch": "foley-card-touch", "wood-touch": "foley-wood-touch", "coin-drop": "money-coin-drop", "page-turn": "props-page-turn", "water-drop": "drop-water-full", "water-splash": "props-splash", "ice-crack": "ice-fracture-long", "book-close": "props-book-close", "pop-soft": "impact-light-soft" };

const [folder, presetFlag] = process.argv.slice(2), preset = /^--preset=(\w+)$/.exec(presetFlag ?? "")?.[1];
if (!folder || (presetFlag && !preset)) throw Error("Usage: npm run film:sound-kit -- <folder> [--preset=subtle|neutral|cinematic]");
const dir = resolve(folder);
mkdirSync(dir, { recursive: true });
if (preset) {
  const catalog = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../assets/sound/catalog.json"), "utf8"));
  const shippable = redistributableSounds(catalog), roles = KIT_PRESETS[preset];
  if (!roles) throw Error(`No preset "${preset}". Presets: ${Object.keys(KIT_PRESETS).join(", ")}.`);
  const sounds = {}, credits = [];
  for (const [name, id] of Object.entries({ ...roles, ...FOLEY })) {
    const record = shippable.find(item => item.id === id);
    if (!record) throw Error(`Sound "${id}" is missing, or it may not be copied into a kit.`);
    copyFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../assets/sound", record.path), join(dir, id + ".wav"));
    sounds[name] = { file: id + ".wav", peakSeconds: record.peakSeconds, catalogId: id };
    credits.push({ id, licenseId: record.licenseId, author: record.author, sourceUrl: record.sourceUrl, sourceRevision: record.sourceRevision, sha256: record.sha256 });
  }
  writeFileSync(join(dir, "kit.json"), JSON.stringify({ schemaVersion: 1, preset, licenseRef: "kumiki-sound-catalog", sounds, credits }, null, 2) + "\n");
  console.log(`Wrote the ${preset} kit (${Object.keys(sounds).length} sounds) to ${dir}`);
  process.exit();
}
const make = (file, source, filter) => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", source, "-af", filter, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", join(dir, file)], { encoding: "utf8" });
  if (run.status !== 0) throw Error("FFmpeg could not make " + file + ": " + (run.error?.message ?? run.stderr));
};
const RISER = 1.1;
// Air that swells and falls: band-limited noise under a bell envelope.
make("whoosh.wav", "anoisesrc=d=0.5:c=pink:a=0.6:seed=7", "highpass=f=350,lowpass=f=5200,afade=t=in:d=0.24:curve=qsin,afade=t=out:st=0.24:d=0.26:curve=qsin");
// A tone that climbs two octaves and grows, then stops on its peak.
make("riser.wav", `aevalsrc=0.2*sin(2*PI*(180*t+270*t*t/${RISER}))*pow(t/${RISER}\\,2):s=48000:d=${RISER}`, `afade=t=out:st=${RISER - .012}:d=0.012`);
// A low thump with a short click on its first frame.
make("hit.wav", "aevalsrc=0.6*sin(2*PI*58*t)*exp(-9*t)+0.16*sin(2*PI*1700*t)*exp(-85*t):s=48000:d=0.6", "afade=t=out:st=0.5:d=0.1");
// One quiet bell tone with a soft start: a realisation, not an impact.
make("ping.wav", "aevalsrc=(0.22*sin(2*PI*1046.5*t)*exp(-6*t)+0.09*sin(2*PI*2093*t)*exp(-10*t))*min(1\\,t/0.006):s=48000:d=0.8", "afade=t=out:st=0.7:d=0.1");
writeFileSync(join(dir, "kit.json"), JSON.stringify({ schemaVersion: 1, licenseRef: "original-synthesized-kumiki-kit",
  sounds: { whoosh: { file: "whoosh.wav", peakSeconds: .24 }, riser: { file: "riser.wav", peakSeconds: RISER }, hit: { file: "hit.wav", peakSeconds: 0 }, ping: { file: "ping.wav", peakSeconds: .006 } } }, null, 2) + "\n");
console.log("Wrote whoosh.wav, riser.wav, hit.wav, ping.wav and kit.json to " + dir);
