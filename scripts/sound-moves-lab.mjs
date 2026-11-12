#!/usr/bin/env node
/** Bakes the Storybook fixtures for doc 34's sound moves: each example film's mix, through the library's own compiler and mixer
 * (`film:render --audio-only`), in a "before" and an "after" version, as AAC with its level measured every 50 ms.
 *   npm run sound:moves
 * Writes assets/sound/lab/moves/<id>.m4a and assets/sound/lab/moves/moves.json. Nothing is played or judged here: an agent cannot hear,
 * so the files are for a person to listen to.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), ".."), FILMS = join(ROOT, "examples/film"), OUT = join(ROOT, "assets/sound/lab/moves");
const load = name => JSON.parse(readFileSync(join(FILMS, name), "utf8"));

/** Each pair: the move, and the same film without it. `change` makes the "before" version; `marks` are moments to point at, in seconds. */
const PAIRS = [
  {
    id: "gap-drop", title: "Air gap, hit and drop-out", film: "sound-moves.film.json",
    what: "The water falls almost silent for half a second, the hit lands on the cut, the water dips under it and comes back, then stops dead on the next cut.",
    marks: [{ at: 2.73, label: "gap" }, { at: 3.33, label: "hit" }, { at: 6.33, label: "drop" }],
    before: doc => ({ ...doc, audio: { ...doc.audio, gaps: undefined, beds: doc.audio.beds.map(bed => ({ ...bed, drop: undefined })), master: { ...doc.audio.master, hitDuckDb: undefined } } }),
  },
];

/** Level in dBFS every 50 ms, from a mono 48 kHz decode. */
function levels(file) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const data = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), step = 2400, out = [];
  for (let i = 0; i + step <= data.length; i += step) {
    let sum = 0;
    for (let k = i; k < i + step; k++) sum += data[k] * data[k];
    out.push(Math.round(Math.max(-90, 20 * Math.log10(Math.sqrt(sum / step) || 1e-9)) * 10) / 10);
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "km-sound-moves-")), rows = [];
try {
  for (const pair of PAIRS) {
    const doc = load(pair.film), versions = { after: doc, before: pair.before(doc) };
    const row = { id: pair.id, title: pair.title, what: pair.what, marks: pair.marks, versions: {} };
    for (const [version, film] of Object.entries(versions)) {
      // The film file sits beside the example, so its kit and assets resolve as they do for the example itself.
      const temp = join(FILMS, `.sound-moves-${pair.id}-${version}.film.json`), dir = join(work, `${pair.id}-${version}`);
      writeFileSync(temp, JSON.stringify(film));
      try { execFileSync(process.execPath, [join(ROOT, "scripts/film.mjs"), "render", temp, "--only=draft", "--audio-only", "--out=" + dir], { stdio: "inherit" }); }
      finally { rmSync(temp, { force: true }); }
      const file = `${pair.id}-${version}.m4a`;
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "mix.wav"), "-c:a", "aac", "-b:a", "160k", join(OUT, file)]);
      row.versions[version] = { file, levels: levels(join(dir, "mix.wav")) };
    }
    rows.push(row);
  }
  writeFileSync(join(OUT, "moves.json"), JSON.stringify(rows) + "\n");
  console.log(`Wrote ${rows.length} pair(s) to ${OUT}.`);
} finally { rmSync(work, { recursive: true, force: true }); }
