#!/usr/bin/env node
/** Make an original accent kit for audio.accents: a whoosh, a riser and a hit, with a kit.json that states where each one
 * peaks. The sounds are synthesized here with FFmpeg, so no recording and no outside licence is involved.
 * npm run film:sound-kit -- <folder>
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

if (process.argv.length !== 3) throw Error("Usage: npm run film:sound-kit -- <folder>");
const dir = resolve(process.argv[2]);
mkdirSync(dir, { recursive: true });
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
writeFileSync(join(dir, "kit.json"), JSON.stringify({ schemaVersion: 1, licenseRef: "original-synthesized-kumiki-kit",
  sounds: { whoosh: { file: "whoosh.wav", peakSeconds: .24 }, riser: { file: "riser.wav", peakSeconds: RISER }, hit: { file: "hit.wav", peakSeconds: 0 } } }, null, 2) + "\n");
console.log("Wrote whoosh.wav, riser.wav, hit.wav and kit.json to " + dir);
