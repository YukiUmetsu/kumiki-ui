#!/usr/bin/env node
/** Keep assets/sound/catalog.json honest: every file exists, decodes as WAV, and matches its hash and its rights.
 *   npm run sound:check
 *   npm run sound:import -- --from=<clone of wyzowl/sfx-kit> --ids=<id,id,...>
 *   npm run sound:measure -- <file.wav>   Loudness and true peak, with FFmpeg.
 * Import reads files from a folder that you already have. It downloads nothing, and it never runs code from the source.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSoundCatalog, readWavFormat } from "../registry/video/sound-catalog.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."), DIR = join(ROOT, "assets/sound"), FILE = join(DIR, "catalog.json");
const WYZOWL = { sourceUrl: "https://github.com/wyzowl/sfx-kit", author: "Wyzowl", licenseId: "CC0-1.0", origin: "synthesized", redistributable: true, allowedUses: ["commercial-video", "library-distribution"] };

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const load = () => JSON.parse(readFileSync(FILE, "utf8"));

function check() {
  const catalog = load(), problems = inspectSoundCatalog(catalog).map(item => `${item.id}: ${item.message}`);
  for (const sound of catalog.sounds) {
    const path = join(DIR, sound.path);
    if (!existsSync(path)) { problems.push(`${sound.id}: ${sound.path} does not exist.`); continue; }
    const bytes = readFileSync(path);
    if (sha256(bytes) !== sound.sha256) problems.push(`${sound.id}: the file does not match its hash.`);
    try {
      const wav = readWavFormat(bytes);
      for (const key of ["sampleRate", "channels", "bitDepth", "durationSamples"]) if (wav[key] !== sound[key]) problems.push(`${sound.id}: ${key} is ${wav[key]}, and the record says ${sound[key]}.`);
    } catch (error) { problems.push(`${sound.id}: ${error.message}`); }
  }
  if (problems.length) throw Error("Sound catalog failed:\n  - " + problems.join("\n  - "));
  console.log(`Sound catalog OK: ${catalog.sounds.length} sounds, ${new Set(catalog.sounds.map(item => item.licenseId)).size} licence(s).`);
}
function importSounds(args) {
  const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1];
  const from = resolve(flag("from") ?? ""), ids = (flag("ids") ?? "").split(",").filter(Boolean);
  if (!flag("from") || !ids.length) throw Error("Usage: npm run sound:import -- --from=<folder> --ids=<id,id,...>");
  const source = JSON.parse(readFileSync(join(from, "sounds.json"), "utf8"));
  if (source.license !== "CC0-1.0") throw Error(`The source says its licence is ${source.license}. This importer takes CC0-1.0 only.`);
  const revision = spawnSync("git", ["-C", from, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(), catalog = existsSync(FILE) ? load() : { schemaVersion: 1, sounds: [] };
  const today = new Date().toISOString().slice(0, 10), sounds = catalog.sounds.filter(item => !ids.includes(item.id));
  for (const id of ids) {
    const item = source.sounds.find(entry => entry.id === id);
    if (!item) throw Error(`The source has no sound "${id}".`);
    const bytes = readFileSync(join(from, item.file));
    if (sha256(bytes) !== item.sha256) throw Error(`${id}: the file does not match the hash that the source publishes.`);
    const path = `wyzowl/${item.category}/${id}.wav`;
    mkdirSync(dirname(join(DIR, path)), { recursive: true });
    copyFileSync(join(from, item.file), join(DIR, path));
    const material = /\b(paper|card|wood|glass|plastic|fabric|coin|metal|stone)\b/.exec(`${item.id} ${item.description}`.toLowerCase())?.[1];
    sounds.push({ id, path, sha256: item.sha256, ...readWavFormat(bytes), peakSeconds: item.sync.at, loudnessLufs: item.level.lufs, underVoiceoverDb: item.under_voiceover_db, tags: item.tags, ...(material ? { material } : {}),
      description: item.description, ...WYZOWL, sourceRevision: revision, verifiedAt: today });
  }
  sounds.sort((a, b) => a.id.localeCompare(b.id, "en"));
  writeFileSync(FILE, JSON.stringify({ schemaVersion: 1, sounds }, null, 1) + "\n");
  console.log(`Imported ${ids.length} sound(s). The catalog has ${sounds.length}.`);
}
function measure(file) {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (run.status !== 0) throw Error("FFmpeg could not read " + file);
  const summary = run.stderr.slice(run.stderr.lastIndexOf("Summary:")), value = pattern => Number(pattern.exec(summary)?.[1]);
  const report = { integratedLufs: value(/I:\s+(-?[\d.]+) LUFS/), truePeakDbtp: value(/Peak:\s+(-?[\d.]+) dBFS/) };
  console.log(JSON.stringify(report));
  process.exitCode = report.truePeakDbtp > -1 ? 1 : 0;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "check") check();
  else if (command === "import") importSounds(rest);
  else if (command === "measure") measure(resolve(rest[0]));
  else throw Error("Usage: scripts/sound-catalog.mjs check|import|measure");
}
