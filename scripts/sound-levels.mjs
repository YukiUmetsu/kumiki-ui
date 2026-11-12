#!/usr/bin/env node
/** Measures the loudness of each looping bed in the sound catalog, for sound-driven motion (doc 34, A11).
 *   npm run sound:levels
 * Writes assets/sound/levels.json: for each bed, its level every 20 ms (over 80 ms) as a whole number from 0 (its own quiet floor, the 10th percentile)
 * to 100 (its own loud peaks, the 98th), so a film can move a scene with what the bed is doing without reading audio in the browser.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), ".."), RATE = 50, STEP = 48000 / RATE, WINDOW = STEP * 4;
const catalog = JSON.parse(readFileSync(join(ROOT, "assets/sound/catalog.json"), "utf8")), sounds = {};
for (const sound of catalog.sounds.filter(item => item.tags.includes("loop")).sort((a, b) => a.id.localeCompare(b.id, "en"))) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", join(ROOT, "assets/sound", sound.path), "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const data = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), db = [];
  // Each value is the level over 80 ms centred on its 20 ms step, long enough that a low drone's own waves do not read as flicker. The
  // window wraps, as the bed loops.
  for (let i = 0; i + STEP <= data.length; i += STEP) {
    let sum = 0;
    for (let k = i - WINDOW / 2 + STEP / 2; k < i + WINDOW / 2 + STEP / 2; k++) { const v = data[(k + data.length) % data.length]; sum += v * v; }
    db.push(20 * Math.log10(Math.sqrt(sum / WINDOW) || 1e-9));
  }
  const sorted = [...db].sort((a, b) => a - b), low = sorted[Math.floor(sorted.length * .1)], high = sorted[Math.floor(sorted.length * .98)];
  sounds[sound.id] = db.map(value => Math.round(100 * Math.min(1, Math.max(0, (value - low) / Math.max(1, high - low)))));
}
writeFileSync(join(ROOT, "assets/sound/levels.json"), JSON.stringify({ rate: RATE, sounds }) + "\n");
console.log(`Wrote levels for ${Object.keys(sounds).length} bed(s) at ${RATE} per second.`);
