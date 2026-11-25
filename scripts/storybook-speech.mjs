// Speech for painted storybook films: speaks lines, slows them for learners, and times every phone against the recording.
//
//   node scripts/storybook-speech.mjs <play> [--wav scratch/raw] [--julius bin --kit dir]
//   node scripts/storybook-speech.mjs lines.json --out dir [--voices voices.json] [--wav scratch/raw] [--julius bin --kit dir]
//
// lines.json: { "voices": { "<speaker>": { "fish": "<voice id>", "tempo": 0.8, "pace": 5.5 } } (or those of --voices),
//               "lines": [{ "id", "speaker", "ja" (ruby markup), "en", "speak"?: text for the voice, "tempo"?, "gap"? }] }
//
// A raw recording <wav>/<id>.wav is used when it is there, from any source (a person, a local voice). Otherwise Fish Audio speaks
// the line when FISH_AUDIO_API is set. `pace` is morae a second: the tempo is found from the recording and never goes below 0.7.
// Timing: forced alignment with Julius and the segmentation-kit monophone model (BSD-style licences) when --julius and --kit are
// given; else the track is estimated from the text and says so ("precision": "estimated").
// Writes <out>/<id>.mp3 and <out>/lines.json ({ id: { speaker, ja, en, track } }), which a film reads as data.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { moraeOf, parseRuby, phonesOf, rubyPlain, rubyReading } from "../registry/video/storybook/japanese-text.ts";

const { values: opt, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, voices: { type: "string" }, wav: { type: "string" }, julius: { type: "string", default: process.env.JULIUS_BIN }, kit: { type: "string", default: process.env.JULIUS_KIT } } });
// a name is a play of the demo: its lines, its voices and where its recordings go are known
const demo = resolve(import.meta.dirname, "../src/video/storybook"), play = positionals[0] && !positionals[0].endsWith(".json") ? positionals[0] : null;
if (play) { positionals[0] = join(demo, "plays", `${play}.json`); opt.out ??= join(demo, "assets", play, "voice"); opt.voices ??= join(demo, "voices.json"); }
if (!positionals[0] || !opt.out) { console.error("usage: storybook-speech.mjs <play> | lines.json --out dir [--voices file] [--wav dir] [--julius bin --kit dir]"); process.exit(2); }
const spec = JSON.parse(readFileSync(positionals[0], "utf8")), voices = { ...(opt.voices ? JSON.parse(readFileSync(opt.voices, "utf8")) : {}), ...spec.voices }, out = resolve(opt.out), raw = resolve(opt.wav ?? join(out, "raw")), RATE = 48000, AT = 16000;
mkdirSync(out, { recursive: true }); mkdirSync(raw, { recursive: true });
const ff = args => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 1 << 28 });
const pcm = (file, rate, filter) => { const b = ff(["-i", file, ...(filter ? ["-af", filter] : []), "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"]), n = b.length >> 1, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = b.readInt16LE(i * 2) / 32768; return x; };
const wavOf = (x, rate) => { const b = Buffer.alloc(44 + x.length * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(x.length * 2, 40); x.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2)); return b; };
const rms = (x, a, b) => { let s = 0; const i0 = Math.max(0, Math.floor(a)), i1 = Math.min(x.length, Math.ceil(b)); for (let i = i0; i < i1; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };

async function speak(line, voice, file) {
  if (existsSync(file)) return;
  const key = process.env.FISH_AUDIO_API;
  if (!key || !voice?.fish) throw new Error(`There is no recording ${file}, and no voice to speak "${line.id}" with.`);
  const r = await fetch("https://api.fish.audio/v1/tts", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: process.env.FISH_MODEL ?? "s2.1-pro-free" }, body: JSON.stringify({ text: line.speak ?? rubyPlain(parseRuby(line.ja)), reference_id: voice.fish, format: "mp3", mp3_bitrate: 192, prosody: { speed: line.speed ?? voice.speed ?? 1 }, temperature: line.temperature ?? 0.7 }) });
  if (!r.ok) throw new Error(`"${line.id}": the voice service answered ${r.status}.`);
  const mp3 = `${file}.mp3`; writeFileSync(mp3, Buffer.from(await r.arrayBuffer())); ff(["-i", mp3, "-ac", "1", "-ar", String(RATE), file]); rmSync(mp3);
}

/** The aligner's copy gets a faint, seeded room tone: its model has never heard exact zeros, and a synthetic voice pauses in them. */
const roomTone = x => { let s = 0x2545f491; return x.map(v => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return v + (s / 0x80000000) * 0.0012; }); };

/** Forced alignment: phones with times, or null when it cannot be done. */
function align(x16, phones) {
  if (!opt.julius || !opt.kit) return null;
  const dir = mkdtempSync(join(tmpdir(), "speech-")), f = join(dir, "a"), words = ["silB", phones.map(p => p.p).join(" "), "silE"], n = words.length - 1;
  writeFileSync(`${f}.wav`, wavOf(x16, AT));
  writeFileSync(`${f}.dfa`, words.map((_, i) => `${i} ${n - i} ${i + 1} 0 ${i === 0 ? 1 : 0}`).join("\n") + `\n${n + 1} -1 -1 1 0\n`);
  writeFileSync(`${f}.dict`, words.map((w, i) => `${i} [w_${i}] ${w}`).join("\n") + "\n");
  const run = spawnSync(opt.julius, ["-h", join(opt.kit, "models/hmmdefs_monof_mix16_gid.binhmm"), "-dfa", `${f}.dfa`, "-v", `${f}.dict`, "-palign", "-input", "file"], { input: `${f}.wav\n`, encoding: "utf8", maxBuffer: 1 << 26 });
  rmSync(dir, { recursive: true, force: true });
  const got = [...(run.stdout ?? "").matchAll(/^\[\s*(\d+)\s+(\d+)\]\s+(-?[\d.]+)\s+(\S+)\s*$/gm)].map(m => ({ from: +m[1], to: +m[2], score: +m[3], p: m[4].replace(/^.*-|\+.*$/g, "") })).filter(q => q.p !== "silB" && q.p !== "silE" && !q.p.startsWith("["));
  if (got.length !== phones.length) return null;
  return { score: got.reduce((s, q) => s + q.score * (q.to - q.from + 1), 0) / got.reduce((s, q) => s + q.to - q.from + 1, 0), phones: got.map((q, i) => ({ p: phones[i].p, token: phones[i].token, start: q.from * 0.01 + (q.from ? 0.0125 : 0), end: (q.to + 1) * 0.01 + 0.0125 })) };
}

/** A voice pauses where it likes: the pauses heard in the recording are tried at every word boundary, and the best fit wins. */
function alignWithPauses(x16, phones) {
  const hop = AT / 100, level = Array.from({ length: Math.floor(x16.length / hop) }, (_, i) => rms(x16, i * hop, (i + 1) * hop)), top = Math.max(...level); let heard = 0, run = 0, spoken = false;
  for (const l of level) { if (l < top * 0.02) run++; else { if (spoken && run >= 16) heard++; run = 0; spoken = true; } }
  const gaps = phones.map((p, i) => (i && p.token !== phones[i - 1].token && p.p !== "sp" && phones[i - 1].p !== "sp" ? i : -1)).filter(i => i >= 0), extra = Math.max(0, Math.min(gaps.length, heard - phones.filter(p => p.p === "sp").length));
  const pick = (from, n) => (n === 0 ? [[]] : gaps.slice(from).flatMap((g, i) => pick(from + i + 1, n - 1).map(rest => [g, ...rest])));
  let best = align(x16, phones);
  for (let n = 1; n <= extra; n++) for (const at of pick(0, n)) { const set = new Set(at), got = align(x16, phones.flatMap((p, i) => (set.has(i) ? [{ p: "sp", token: phones[i - 1].token }, p] : [p]))); if (got && (!best || got.score > best.score)) best = got; }
  return best;
}

/** The aligner ends a long vowel before a pause early: it goes on as long as the voice sounds. */
function heldEnds(phones, x) {
  const hop = RATE / 100, top = Math.max(...Array.from({ length: Math.floor(x.length / hop) }, (_, i) => rms(x, i * hop, (i + 1) * hop))); let from = 0;
  return phones.map((p, i) => {
    const next = phones[i + 1], limit = next ? next.end - 0.04 : x.length / RATE; let end = p.end;
    if (p.p === "sp") { const start = Math.max(p.start, from); return { ...p, start }; }
    if (!next || next.p === "sp") while (end + 0.01 < limit && rms(x, end * RATE, (end + 0.01) * RATE) > top * 0.08) end += 0.01;
    from = end; return { ...p, end };
  });
}

/** How long a voice sounds. */
function loudSeconds(x) { let loud = 0, top = 0; const hop = RATE / 100; for (let i = 0; i + hop < x.length; i += hop) top = Math.max(top, rms(x, i, i + hop)); for (let i = 0; i + hop < x.length; i += hop) if (rms(x, i, i + hop) > top * 0.06) loud++; return loud / 100; }

const kept = {};
for (const line of spec.lines) {
  const voice = voices[line.speaker] ?? {}, file = join(raw, `${line.id}.wav`); await speak(line, voice, file);
  const tokens = parseRuby(line.ja), phones = phonesOf(tokens), morae = moraeOf(rubyReading(tokens)).filter(m => m.phones[0] !== "sp").length;
  // the silence round the line goes, and a pause inside it is never longer than `gap`
  const gap = line.gap ?? 0.42, trim = `silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.1,areverse,silenceremove=stop_periods=-1:stop_duration=${gap}:stop_threshold=-42dB:stop_silence=${gap}`;
  let x = pcm(file, RATE, trim), tempo = line.tempo ?? voice.tempo ?? 1;
  const pace = line.pace ?? voice.pace;
  if (pace) tempo = Math.min(1, Math.max(0.7, (pace * loudSeconds(x)) / morae));
  if (Math.abs(tempo - 1) > 0.01) x = pcm(file, RATE, `${trim},atempo=${tempo.toFixed(3)}`);
  // one loudness for every line
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v)); const level = rms(x, 0, x.length), gain = Math.min(0.14 / Math.max(1e-4, level), 0.84 / Math.max(1e-4, peak)); x = x.map(v => v * gain);
  const wav = join(raw, `${line.id}.ready.wav`); writeFileSync(wav, wavOf(x, RATE)); ff(["-i", wav, "-c:a", "libmp3lame", "-b:a", "128k", join(out, `${line.id}.mp3`)]);
  const seconds = x.length / RATE, x16 = roomTone(pcm(wav, AT)), found = alignWithPauses(x16, phones), got = found && found.phones.reduce((s, p) => s + (p.p === "sp" ? 0 : p.end - p.start), 0) > 0.55 * loudSeconds(x) ? { ...found, phones: heldEnds(found.phones, x) } : null; // an aligner that puts a slow word into a moment has lost it
  let track;
  if (got) {
    const levels = got.phones.map(p => rms(x, p.start * RATE, p.end * RATE)), loudest = Math.max(...levels);
    track = { seconds: +seconds.toFixed(3), precision: "aligned", phones: got.phones.map((p, i) => ({ p: p.p, start: +p.start.toFixed(3), end: +Math.min(p.end, seconds).toFixed(3), token: p.token, level: +(levels[i] / loudest).toFixed(2) })) };
  } else { const { estimateSpeech } = await import("../registry/video/storybook/speech-mouth.ts").catch(() => ({})); if (!estimateSpeech) throw new Error(`"${line.id}" could not be aligned. Give --julius and --kit.`); track = estimateSpeech(tokens, seconds); }
  kept[line.id] = { speaker: line.speaker, ja: line.ja, en: line.en, track };
  console.log(`${line.id.padEnd(16)} ${seconds.toFixed(2)} s  ${(morae / track.phones.reduce((s, p) => s + (p.p === "sp" ? 0 : p.end - p.start), 0)).toFixed(1)} morae/s  tempo ${tempo.toFixed(2)}  ${track.precision}${got ? ` ${got.score.toFixed(1)}` : ""}`);
}
writeFileSync(join(out, "lines.json"), JSON.stringify(kept, null, 1).replace(/\{\s+"p": ("[^"]+"),\s+"start": ([\d.]+),\s+"end": ([\d.]+),\s+"token": (\d+),\s+"level": ([\d.]+)\s+\}/g, '{ "p": $1, "start": $2, "end": $3, "token": $4, "level": $5 }') + "\n");
