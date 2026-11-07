#!/usr/bin/env node
/** Keep assets/sound/catalog.json honest: every file exists, decodes as WAV, and matches its hash and its rights.
 *   npm run sound:check
 *   npm run sound:import -- --from=<clone of wyzowl/sfx-kit> --ids=<id,id,...>
 *   npm run sound:import -- --recordings=<manifest.json>     Trim verified recordings. Loops get a seamless join.
 *   npm run sound:measure -- <file.wav>   Loudness, true peak, DC, clipping and clicks, with FFmpeg.
 *   npm run sound:find -- "soft paper slide" [--material=paper] [--origin=recorded]
 *   npm run sound:bake -- <recipe.json> [--out=<dir>]        A SoundDesignSpec, or an ambience request, as a cached WAV.
 *   npm run sound:lab                                         Remake the Storybook sound lab fixtures.
 *   npm run sound:generate -- "a prompt" --seconds=4 --seed=1   Optional and off by default. Needs a local MOSS install.
 *   npm run sound:critique -- <film or mix>                  Earshot's advisory scorecard, when Earshot is installed.
 * Import reads files from a folder that you already have. It downloads nothing, and it never runs code from the source.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSoundCatalog, readWavFormat } from "../registry/video/sound-catalog.ts";
import { inspectMixChannels, loopSeamDb } from "../registry/video/sound-mastering.ts";

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
const ffmpeg = args => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (run.status !== 0) throw Error("FFmpeg failed: " + (run.stderr || run.error?.message));
  return run;
};
export const decode = (file, filter) => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, ...(filter ? ["-af", filter] : []), "-f", "f32le", "-ac", "1", "-ar", "48000", "-"], { maxBuffer: 2 ** 31 });
  if (run.status !== 0) throw Error("FFmpeg could not read " + file);
  return new Float32Array(run.stdout.buffer, run.stdout.byteOffset, Math.floor(run.stdout.length / 4));
};
export const loudness = file => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (run.status !== 0) throw Error("FFmpeg could not read " + file);
  const summary = run.stderr.slice(run.stderr.lastIndexOf("Summary:")), value = pattern => Number(pattern.exec(summary)?.[1]);
  return { integratedLufs: value(/I:\s+(-?[\d.]+) LUFS/), truePeakDbtp: value(/Peak:\s+(-?[\d.]+) dBFS/) };
};
/** Each channel of a file, as it is. */
export const decodeChannels = file => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", "48000", "-"], { maxBuffer: 2 ** 31 });
  if (run.status !== 0) throw Error("FFmpeg could not read " + file);
  const all = new Float32Array(run.stdout.buffer, run.stdout.byteOffset, Math.floor(run.stdout.length / 4)), size = Math.floor(all.length / 2), left = new Float32Array(size), right = new Float32Array(size);
  for (let i = 0; i < size; i += 1) { left[i] = all[i * 2]; right[i] = all[i * 2 + 1]; }
  return [left, right];
};
/** Bring in recordings whose licence you read at the source. A loop takes its own tail, crossfaded over its head, so it repeats without a seam. */
function importRecordings(file) {
  const items = JSON.parse(readFileSync(file, "utf8")), catalog = load(), ids = new Set(items.map(item => item.id));
  const today = new Date().toISOString().slice(0, 10), sounds = catalog.sounds.filter(item => !ids.has(item.id)), work = mkdtempSync(join(tmpdir(), "km-sound-"));
  for (const item of items) {
    const path = `recorded/${item.id}.wav`, out = join(DIR, path), raw = join(work, "raw.wav"), cross = 1.5;
    mkdirSync(dirname(out), { recursive: true });
    if (item.loop) {
      ffmpeg(["-ss", String(item.seek), "-t", String(item.length + cross), "-i", item.file, "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", raw]);
      ffmpeg(["-i", raw, "-filter_complex", `[0:a]asplit[a][b];[a]atrim=0:${item.length},asetpts=PTS-STARTPTS,afade=t=in:d=${cross}:curve=qsin[x];[b]atrim=${item.length}:${item.length + cross},asetpts=PTS-STARTPTS,afade=t=out:d=${cross}:curve=qsin[y];[x][y]amix=inputs=2:normalize=0:duration=first,highpass=f=20[o]`, "-map", "[o]", "-c:a", "pcm_s16le", "-bitexact", out]);
    } else {
      // A one-shot starts just before its peak, and its peak sits at -6 dBFS.
      ffmpeg(["-ss", String(item.seek), ...(item.length ? ["-t", String(item.length)] : []), "-i", item.file, "-af", "highpass=f=30", "-ar", "48000", "-c:a", "pcm_f32le", raw]);
      const samples = decode(raw); let top = 0;
      samples.forEach((value, index) => { if (Math.abs(value) > Math.abs(samples[top])) top = index; });
      const start = Math.max(0, top / 48000 - .02), gain = -6 - 20 * Math.log10(Math.abs(samples[top]));
      ffmpeg(["-ss", String(start), "-i", raw, "-af", `volume=${gain.toFixed(2)}dB,afade=t=in:d=0.002,areverse,afade=t=in:d=0.04,areverse`, "-c:a", "pcm_s16le", "-bitexact", out]);
    }
    if (item.loop) {
      // Every bed arrives at one level, so a recipe can set its gain by ear once.
      const gain = -23 - loudness(out).integratedLufs, level = out + ".level.wav";
      ffmpeg(["-i", out, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "pcm_s16le", "-bitexact", level]);
      renameSync(level, out);
    }
    const bytes = readFileSync(out), samples = decode(out);
    let top = 0; samples.forEach((value, index) => { if (Math.abs(value) > Math.abs(samples[top])) top = index; });
    const level = loudness(out), seam = item.loop ? loopSeamDb(samples) : undefined;
    if (item.loop && seam > -6) throw Error(`${item.id}: the loop seam is ${seam} dB. Choose another section.`);
    sounds.push({ id: item.id, path, sha256: sha256(bytes), ...readWavFormat(bytes), peakSeconds: item.loop ? 0 : Number((top / 48000).toFixed(4)), loudnessLufs: Number.isFinite(level.integratedLufs) ? level.integratedLufs : -70, tags: item.tags, ...(item.material ? { material: item.material } : {}),
      description: item.description, sourceUrl: item.sourceUrl, author: item.author, licenseId: "CC0-1.0", origin: "recorded", redistributable: true, allowedUses: ["commercial-video", "library-distribution"], verifiedAt: today });
  }
  rmSync(work, { recursive: true, force: true });
  sounds.sort((a, b) => a.id.localeCompare(b.id, "en"));
  writeFileSync(FILE, JSON.stringify({ schemaVersion: 1, sounds }, null, 1) + "\n");
  console.log(`Imported ${items.length} recording(s). The catalog has ${sounds.length}.`);
}
/** The design module imports its neighbours the way the registry does, so it loads through Vite. */
async function withDesign(use, extra = []) {
  const { createServer } = await import("vite");
  const server = await createServer({ root: ROOT, configFile: false, logLevel: "error", server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const modules = await Promise.all(["/registry/video/sound-design.ts", ...extra].map(path => server.ssrLoadModule(path)));
    return await use(Object.assign({}, ...modules));
  } finally { await server.close(); }
}
async function find(args) {
  const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1], query = args.filter(arg => !arg.startsWith("--")).join(" ");
  if (!query) throw Error('Usage: npm run sound:find -- "soft paper slide" [--material=paper] [--origin=recorded]');
  const matches = await withDesign(({ findSounds }) => findSounds(load(), query, { material: flag("material"), origin: flag("origin"), limit: Number(flag("limit") ?? 8) }));
  for (const { sound, score, matched } of matches) console.log(`${score.toFixed(1).padStart(5)}  ${sound.id.padEnd(26)} ${sound.origin.padEnd(11)} ${sound.description}  [${matched.join(" ")}]`);
  if (!matches.length) console.log("No sound matches. Try fewer words.");
}
/** Run a compiled recipe once. The name is the hash of all its inputs, so a changed file or recipe bakes again by itself. */
export function bakeCompiled(compiled, out) {
  mkdirSync(out, { recursive: true });
  const target = join(out, sha256(compiled.key).slice(0, 24) + ".wav"), hit = existsSync(target);
  if (!hit) { const part = target + ".part.wav"; ffmpeg([...compiled.ffmpegArgs, part]); renameSync(part, target); }
  return { target, hit };
}
async function bake(args) {
  const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1], file = args.find(arg => !arg.startsWith("--"));
  if (!file) throw Error("Usage: npm run sound:bake -- <recipe.json> [--out=<dir>]");
  const recipe = JSON.parse(readFileSync(file, "utf8")), catalog = load(), locate = sound => join(DIR, sound.path), out = resolve(flag("out") ?? join(ROOT, "dist/sound-cache"));
  const compiled = await withDesign(({ compileAmbience, compileSoundDesign }) => recipe.layers ? compileSoundDesign(recipe, catalog, locate) : compileAmbience(recipe, catalog, locate));
  const { target, hit } = bakeCompiled(compiled, out);
  console.log(JSON.stringify({ file: target, cached: hit, peakSeconds: compiled.peakSeconds ?? 0, sources: compiled.sources ?? [] }, null, 1));
}
/** The Storybook sound lab. Every fixture is made by the library's own compiler and mixer, so what plays is what a film gets. */
async function lab() {
  const catalog = load(), locate = sound => join(DIR, sound.path), out = join(DIR, "lab"), rows = [], work = mkdtempSync(join(tmpdir(), "km-lab-"));
  const aac = (wav, file) => ffmpeg(["-i", wav, "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", join(out, file)]);
  const bake = (compiled, name) => { const wav = join(work, name + ".wav"); ffmpeg([...compiled.ffmpegArgs, wav]); return wav; };
  mkdirSync(join(out, "catalog"), { recursive: true });
  const sets = await withDesign(({ compileSoundDesign, compileAmbience, contactProfiles, soundVariant, createAudioMixManifest, audioMixFfmpegArgs }) => {
    // Rooms: one sound, dry and in each space.
    for (const sound of ["drop-water-full", "foley-glass-touch", "impact-medium-soft"]) for (const room of ["dry", "room", "hall", "cave", "underwater"]) {
      const recipe = { id: `${sound}-${room}`, layers: [{ sound }], room }, compiled = compileSoundDesign(recipe, catalog, locate), file = `${sound}--${room}.m4a`;
      aac(bake(compiled, recipe.id), file);
      rows.push({ sound, room, file, peakSeconds: compiled.peakSeconds, durationSeconds: compiled.durationSeconds, recipe });
    }
    // Intensity: the same cue at each editorial level.
    const intensity = ["subtle", "neutral", "cinematic"].map(level => {
      const recipe = { id: `whoosh-${level}`, layers: [{ sound: "whoosh-medium-medium" }], intensity: level }, compiled = compileSoundDesign(recipe, catalog, locate), file = `intensity--${level}.m4a`;
      aac(bake(compiled, recipe.id), file);
      return { level, file, peakSeconds: compiled.peakSeconds, recipe };
    });
    // Position: pan runs from left to right, and distance darkens and lowers a sound.
    const position = [["Left, at the camera", -.8, 1], ["Centre, far away", 0, 12], ["Right, a few metres off", .7, 4]].map(([label, pan, distance], i) => {
      const recipe = { id: `drop-position-${i}`, layers: [{ sound: "drop-water-full" }], position: { pan, distance }, room: "outdoors" }, compiled = compileSoundDesign(recipe, catalog, locate), file = `position--${i}.m4a`;
      aac(bake(compiled, recipe.id), file);
      return { label, file, peakSeconds: compiled.peakSeconds, recipe };
    });
    // Takes: three steps on stone. A repeats one file. B lets the seed pick a take and its small pitch change.
    const stone = contactProfiles(catalog)["stone-step"], byPath = new Map(catalog.sounds.map(sound => [sound.path, sound.id]));
    const pool = [stone.assetRef, ...stone.variants].map(path => byPath.get(path)), times = [.25, .82, 1.39];
    const walk = (name, pick, seed) => {
      const steps = times.map((at, i) => {
        const recipe = { id: `${name}-${i}`, layers: [{ sound: pick(i) }], ...(seed === undefined ? {} : { seed: seed + i }), room: "outdoors" }, compiled = compileSoundDesign(recipe, catalog, locate);
        return { recipe, wav: bake(compiled, recipe.id), start: Math.max(0, at - compiled.peakSeconds) };
      });
      const manifest = { durationSeconds: 2.2, inputs: steps.map((step, i) => ({ id: `step-${i}`, kind: "sound", assetRef: step.wav, startSeconds: step.start, gainDb: 0 })) }, wav = join(work, name + "-walk.wav");
      ffmpeg(audioMixFfmpegArgs(manifest, wav).slice(1));
      aac(wav, `walk--${name}.m4a`);
      return { name, file: `walk--${name}.m4a`, recipes: steps.map(step => step.recipe) };
    };
    const takes = [walk("one-file", () => pool[0]), walk("seeded-takes", i => soundVariant(pool, 7, i), 7)];
    // Under narration: the same bed and accents, with and without ducking.
    const voice = join(DIR, "narration/old-man-rain.wav"), bed = bake(compileAmbience({ sound: "bed-stream-close", durationSeconds: 15, fadeSeconds: 1.5, gainDb: -4 }, catalog, locate), "bed");
    const drop = compileSoundDesign({ id: "drop", layers: [{ sound: "drop-water-full" }], room: "outdoors" }, catalog, locate), whoosh = compileSoundDesign({ id: "whoosh", layers: [{ sound: "whoosh-slow-soft" }], intensity: "subtle" }, catalog, locate);
    const fps = { num: 30, den: 1 }, sheet = { fps, durationFrames: 450,
      lanes: [{ id: "voice", kind: "narration", startFrame: 18, assetRef: voice }, { id: "bed", kind: "ambience", startFrame: 0, assetRef: bed, gainDb: 0 }, { id: "sfx", kind: "sfx", startFrame: 0 }],
      sounds: [{ id: "drop", laneId: "sfx", frame: Math.round((3.1 - drop.peakSeconds) * 30), assetRef: bake(drop, "drop-cue"), gainDb: -6 }, { id: "whoosh", laneId: "sfx", frame: Math.round((10.4 - whoosh.peakSeconds) * 30), assetRef: bake(whoosh, "whoosh-cue"), gainDb: -4 }] };
    const manifest = createAudioMixManifest(sheet);
    const narration = [0, 12].map(duckDb => {
      const wav = join(work, `narration-${duckDb}.wav`), file = `narration--duck-${duckDb}.m4a`;
      ffmpeg(audioMixFfmpegArgs(manifest, wav, { duckDb }).slice(1));
      aac(wav, file);
      return { duckDb, file, measure: loudness(wav) };
    });
    const portable = { ...manifest, inputs: manifest.inputs.map(input => ({ ...input, assetRef: input.id === "voice" ? "narration/old-man-rain.wav" : `${input.id}.wav` })) };
    return { intensity, position, takes, narration: { rows: narration, manifest: portable, recipes: { bed: { sound: "bed-stream-close", durationSeconds: 15, fadeSeconds: 1.5, gainDb: -4 }, drop: { id: "drop", layers: [{ sound: "drop-water-full" }], room: "outdoors" }, whoosh: { id: "whoosh", layers: [{ sound: "whoosh-slow-soft" }], intensity: "subtle" } } } };
  }, ["/registry/video/audio-visual-cue.ts"]);
  // Every catalog sound as a small preview, so the catalog can be heard in Storybook without shipping its WAVs twice.
  for (const sound of catalog.sounds) aac(locate(sound), `catalog/${sound.id}.m4a`);
  rmSync(work, { recursive: true, force: true });
  writeFileSync(join(out, "lab.json"), JSON.stringify(rows, null, 1) + "\n");
  writeFileSync(join(out, "sets.json"), JSON.stringify(sets, null, 1) + "\n");
  console.log(`Wrote ${rows.length} room fixtures, ${sets.intensity.length + sets.position.length + sets.takes.length + sets.narration.rows.length} set fixtures and ${catalog.sounds.length} catalog previews to ${out}`);
}
/** A last resort. It looks in the catalog first, caches by prompt and revision, records where a sound came from, and rejects a bad take. */
async function generate(args) {
  const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1], prompt = args.filter(arg => !arg.startsWith("--")).join(" ");
  const home = process.env.MOSS_HOME ?? join(homedir(), ".moss"), python = join(home, "venv/bin/python"), weights = join(home, "weights-4bit");
  if (!prompt) throw Error('Usage: npm run sound:generate -- "a prompt" [--seconds=4] [--seed=1] [--steps=50] [--force]');
  if (!existsSync(python) || !existsSync(weights)) throw Error(`MOSS is not installed in ${home}. It is optional. Use npm run sound:find, or see docs/component-specs/sound-design.md.`);
  const found = await withDesign(({ findSounds }) => findSounds(load(), prompt, { limit: 3 }));
  const asked = prompt.toLowerCase().split(/[^a-z]+/).filter(word => word.length > 2 && !["the", "and", "with", "into", "from", "that", "this", "very", "slowly", "across", "over"].includes(word)).length;
  if ((found[0]?.matched.length ?? 0) >= Math.max(2, asked * .6) && !args.includes("--force")) throw Error(`The catalog already has a match: ${found.map(item => item.sound.id).join(", ")}. A real recording comes first. Add --force to generate anyway.`);
  const job = { prompt, seconds: Number(flag("seconds") ?? 4), seed: Number(flag("seed") ?? 1), steps: Number(flag("steps") ?? 50), cfg: 4 };
  if (!(job.seconds > 0 && job.seconds <= 30) || !Number.isSafeInteger(job.seed) || !(job.steps >= 10 && job.steps <= 200)) throw Error("Seconds run to 30, a seed is a whole number, and steps run from 10 to 200.");
  const revision = process.env.MOSS_REVISION ?? "51d53e8b51bb5f7eff1ac28ca6faf8d14557dfcb", out = resolve(flag("out") ?? join(ROOT, "dist/sound-generated"));
  mkdirSync(out, { recursive: true });
  const name = sha256(JSON.stringify({ ...job, revision })).slice(0, 24), wav = join(out, name + ".wav"), record = join(out, name + ".json");
  if (!existsSync(wav)) {
    const run = spawnSync(python, [join(ROOT, "scripts/moss-generate.py"), JSON.stringify({ ...job, weights, out: wav + ".part" })], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
    if (run.status !== 0) throw Error("MOSS did not finish. Nothing was written.");
    const usage = JSON.parse(run.stdout.trim().split("\n").pop()), channels = inspectMixChannels(decodeChannels(wav + ".part"), 48000), level = loudness(wav + ".part");
    const reasons = [...!Number.isFinite(level.integratedLufs) ? ["silent"] : [], ...channels.clippedSamples ? ["clipped"] : [], ...channels.dcOffset > .005 ? ["DC offset"] : []];
    if (reasons.length) { rmSync(wav + ".part"); throw Error(`The take was rejected: ${reasons.join(", ")}. Try another seed.`); }
    // A take can come back very quiet, so its peak is set like a catalog one-shot.
    const lifted = wav + ".level.wav";
    ffmpeg(["-i", wav + ".part", "-af", `volume=${(-6 - level.truePeakDbtp).toFixed(2)}dB`, "-c:a", "pcm_s16le", "-bitexact", lifted]);
    rmSync(wav + ".part");
    renameSync(lifted, wav);
    writeFileSync(record, JSON.stringify({ origin: "generated", model: "mlx-community/MOSS-SoundEffect-v2.0-4bit", revision, licenseId: "Apache-2.0", ...job, ...level, ...usage, sha256: sha256(readFileSync(wav)) }, null, 1) + "\n");
  }
  console.log(readFileSync(record, "utf8") + wav);
}
function critique(file) {
  const earshot = process.env.EARSHOT_BIN ?? join(homedir(), ".earshot/venv/bin/earshot");
  if (!existsSync(earshot)) throw Error("Earshot is not installed. Set EARSHOT_BIN. This check is advisory, and no export depends on it.");
  spawnSync(earshot, ["critique", file], { stdio: "inherit" });
}
function importSounds(args) {
  const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1];
  if (flag("recordings")) { importRecordings(resolve(flag("recordings"))); return; }
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
  const channel = inspectMixChannels(decodeChannels(file), 48000), report = { ...loudness(file), ...channel };
  console.log(JSON.stringify(report));
  process.exitCode = report.truePeakDbtp > -1 || channel.clippedSamples || channel.dcOffset > .005 ? 1 : 0;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "check") check();
  else if (command === "import") importSounds(rest);
  else if (command === "measure") measure(resolve(rest[0]));
  else if (command === "find") await find(rest);
  else if (command === "bake") await bake(rest);
  else if (command === "lab") await lab();
  else if (command === "generate") await generate(rest);
  else if (command === "critique") critique(resolve(rest[0]));
  else throw Error("Usage: scripts/sound-catalog.mjs check|import|measure|find|bake|critique");
}
