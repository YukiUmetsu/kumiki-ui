// The mastered sound track of a painted storybook film, for an export. A player mixes the same cues by itself.
//
//   node scripts/storybook-sound.mjs <film> --out mix.m4a [--profile youtube] [--duck 7]
//   node scripts/storybook-sound.mjs <module> <export> --out mix.m4a …
//
// The film is read from its module with Vite, so it can use glob imports and `?url` addresses. FFmpeg decodes and encodes; the mix
// itself is `mixStory`, and the master is one gain and a limiter from `sound-mastering.ts`. It fails when a recording is missing.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const { values: opt, positionals: [file, name] } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, profile: { type: "string", default: "youtube" }, duck: { type: "string" } } });
if (!file || !opt.out) { console.error("usage: storybook-sound.mjs <film> | <module> <export> --out mix.m4a [--profile youtube|podcast|broadcast] [--duck dB]"); process.exit(2); }
const root = resolve(import.meta.dirname, ".."), RATE = 48000, work = mkdtempSync(join(tmpdir(), "story-sound-"));
const ff = args => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 1 << 30 });
const channelsOf = source => { const b = ff(["-i", source, "-ac", "2", "-ar", String(RATE), "-f", "f32le", "-"]), all = new Float32Array(b.buffer, b.byteOffset, b.byteLength >> 2); return [0, 1].map(c => Float32Array.from({ length: all.length >> 1 }, (_, i) => all[i * 2 + c])); };
const loudness = source => {
  const text = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", source, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr, last = text.slice(text.lastIndexOf("Summary:"));
  return { integratedLufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(last)?.[1]), truePeakDbtp: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(last)?.[1]) };
};
const server = await createServer({ root, configFile: false, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const [made, { planStorybook }, { mixStory, wavBytes }, master] = await Promise.all([name ? `/${file}` : "/src/video/storybook/films.ts", "/registry/video/storybook/storybook-film.ts", "/registry/video/storybook/story-sound.ts", "/registry/video/sound-mastering.ts"].map(p => server.ssrLoadModule(p)));
  const film = name ? made[name] : made.filmOf(file); if (!film) throw new Error(`${file} exports no ${name}.`);
  const heard = new Map(), read = src => { if (!heard.has(src)) heard.set(src, { rate: RATE, channels: channelsOf(join(root, src.replace(/[?#].*$/, ""))) }); return heard.get(src); };
  const plan = planStorybook(film), mix = mixStory(plan, read, { rate: RATE, ...(opt.duck ? { duck: Number(opt.duck) } : {}) }), wav = join(work, "mix.wav"), out = resolve(opt.out);
  if (mix.missing.length) throw new Error(`There is no sound in ${mix.missing.join(", ")}.`);
  writeFileSync(wav, wavBytes(mix.channels.map(c => c.map(v => v * 0.5)), RATE));
  const before = loudness(wav), gain = master.masterGainDb(before, opt.profile, { limit: true }), taken = master.limitingDb(before, gain, opt.profile);
  if (taken > master.MAX_LIMITING_DB) throw new Error(`The limiter would take ${taken} dB off the peaks; ${master.MAX_LIMITING_DB} dB is the most. Lower the loudest sound.`);
  ff(["-i", wav, "-af", master.masterFilter(gain, opt.profile, { limit: true }), ...(/\.wav$/.test(out) ? ["-c:a", "pcm_s16le"] : /\.mp3$/.test(out) ? ["-c:a", "libmp3lame", "-b:a", "160k"] : ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]), "-bitexact", out]);
  const measure = loudness(out), problems = master.inspectMix(measure, master.inspectMixChannels(channelsOf(out), RATE), opt.profile, {});
  console.log(`${out}: ${plan.seconds.toFixed(2)} s, ${measure.integratedLufs} LUFS, ${measure.truePeakDbtp} dBTP, gain ${gain} dB, limiter ${taken} dB`);
  for (const p of problems) console.log(`${p.severity.toUpperCase()} [${p.code}] ${p.message}`);
  if (problems.some(p => p.severity === "error")) process.exitCode = 1;
} finally { await server.close(); rmSync(work, { recursive: true, force: true }); }
