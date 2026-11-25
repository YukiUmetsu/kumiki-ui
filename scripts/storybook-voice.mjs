// Voices for a person of the storybook films. The agent does not choose a voice: a person listens and picks it.
//
//   node scripts/storybook-voice.mjs <id> --try <fish id>,<fish id> [--line "<ja>"] [--speed 0.8] [--out dir]
//   node scripts/storybook-voice.mjs <id> --pick <fish id> [--speed 0.8] [--pace 5.5]
//
// --try speaks one line with each voice (Fish Audio, FISH_AUDIO_API), hears it without its text (storybook-speech.mjs --hear), and
// gives the median pitch of each take in Hz and in semitones against the recordings of each person of the cast. The takes are in
// <out>/<voice>.mp3 (local-assets/storybook/voices/<id> by default, which git ignores). Nothing is written into the person file.
// One line is a rough guide: the lines of one voice in the films are up to 12 semitones apart (Sato: 99 to 195 Hz on 2026-11-25).
// --pick writes the voice into src/video/storybook/people/<id>.json.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { need } from "./storybook-tools.mjs";

const { values: opt, positionals: [id] } = parseArgs({ allowPositionals: true, options: { try: { type: "string" }, pick: { type: "string" }, line: { type: "string", default: "はじめまして。よろしくお{願|ねが}いします。" }, speed: { type: "string" }, pace: { type: "string" }, out: { type: "string" } } });
if (!id || !opt.try === !opt.pick) { console.error('usage: storybook-voice.mjs <id> --try <fish>,<fish> [--line "<ja>"] [--speed s] [--out dir]\n       storybook-voice.mjs <id> --pick <fish> [--speed s] [--pace p]'); process.exit(2); }
const root = resolve(import.meta.dirname, ".."), story = join(root, "src/video/storybook"), file = join(story, "people", `${id}.json`);
if (!existsSync(file)) { console.error(`There is no person ${id}: write ${file.slice(root.length + 1)} first.`); process.exit(1); }
const person = JSON.parse(readFileSync(file, "utf8")), speed = opt.speed ? Number(opt.speed) : undefined;

if (opt.pick) {
  person.voice = { fish: opt.pick, ...(speed && { speed }), ...(opt.pace && { pace: Number(opt.pace) }) };
  writeFileSync(file, `${JSON.stringify(person, null, 1)}\n`); console.log(`${file.slice(root.length + 1)}: voice ${JSON.stringify(person.voice)}`);
  process.exit(0);
}

const at = need("python", "ear"), out = resolve(opt.out ?? join(root, "local-assets/storybook/voices", id)), tries = opt.try.split(",");
if (!process.env.FISH_AUDIO_API) { console.error("FISH_AUDIO_API is not set: the voices cannot speak."); process.exit(1); }
mkdirSync(out, { recursive: true });
const name = fish => `try-${fish.slice(0, 8)}`;
writeFileSync(join(out, "lines.json"), JSON.stringify({ voices: Object.fromEntries(tries.map(f => [name(f), { fish: f, ...(speed && { speed }) }])), lines: tries.map(f => ({ id: name(f), speaker: name(f), ja: opt.line, en: "" })) }, null, 1));
const said = spawnSync("node", [join(import.meta.dirname, "storybook-speech.mjs"), join(out, "lines.json"), "--out", out, "--hear", "--again"], { encoding: "utf8", cwd: root, maxBuffer: 1 << 26 });
if (said.status !== 0) { console.error(`${said.stdout}${said.stderr}`.trim().split("\n").slice(-6).join("\n")); process.exit(1); }

// the median pitch of each take, and of up to six recordings of each person of the cast
const cast = {};
for (const play of readdirSync(join(story, "assets"))) {
  const lines = join(story, "assets", play, "voice", "lines.json");
  if (existsSync(lines)) for (const [line, l] of Object.entries(JSON.parse(readFileSync(lines, "utf8")))) if (l.speaker !== id && (cast[l.speaker] ??= []).length < 6 && existsSync(join(story, "assets", play, "voice", `${line}.mp3`))) cast[l.speaker].push(join(story, "assets", play, "voice", `${line}.mp3`));
}
const list = [...tries.map(f => ({ id: name(f), audio: join(out, `${name(f)}.mp3`) })), ...Object.entries(cast).flatMap(([who, files]) => files.map((audio, i) => ({ id: `${who}/${i}`, audio })))];
const heard = spawnSync(at.python, ["-I", join(import.meta.dirname, "storybook-hear.py"), "--pitch"], { input: JSON.stringify(list), encoding: "utf8", maxBuffer: 1 << 26 });
if (heard.status !== 0) { console.error(`The pitch could not be measured: ${heard.stderr.trim().split("\n").pop()}`); process.exit(1); }
const hz = new Map(JSON.parse(heard.stdout.trim().split("\n").pop()).map(q => [q.id, q.hz])), median = v => v.sort((a, b) => a - b)[v.length >> 1];
const of = Object.fromEntries(Object.keys(cast).map(who => [who, median(cast[who].map((_, i) => hz.get(`${who}/${i}`)).filter(Boolean))]));
const st = (a, b) => (12 * Math.log2(a / b)).toFixed(1).replace(/^(?!-)/, "+");
console.log(said.stdout.trim().split("\n").filter(l => /^try-/.test(l)).join("\n"));
for (const f of tries) { const h = hz.get(name(f)); console.log(`${name(f)}  ${f}  ${h ? `${h} Hz` : "no pitch"}  ${h ? Object.entries(of).sort((a, b) => a[1] - b[1]).map(([who, c]) => `${who} ${st(h, c)}`).join("  ") : ""}`); }
console.log(`The takes: ${out}. Listen to them. Then: npm run -s story:voice -- ${id} --pick <fish id>${speed ? ` --speed ${speed}` : ""} --pace <morae a second>`);
