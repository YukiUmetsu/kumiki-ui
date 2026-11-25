// One command for a painted storybook film: from its text to the sheets that a person looks at.
//
//   node scripts/storybook-make.mjs <play> --new --stage <stage> --cast a,b [--title "…"] [--props fan,gift]
//                                          writes a screenplay that already plays: people at their spots, a picture for each line, and the
//                                          pages that teach. Change its lines and beats.
//   node scripts/storybook-make.mjs <film> --out dir [--voice] [--port 6006] [--frames]
//                                          does every step that changed text needs, in order, and stops at the first one that finds a fault
//
// Steps: plan, speech (with --voice: only lines that have no recording, or one of another text), joints with a sheet of every arm pose, data QA, a
// contact sheet of every shot, the mixed sound. Lines that nobody has spoken are silent and as long as a slow voice: a film can be looked at before
// it is recorded. The sheets need a running Storybook. What is measured is in <out>; what is left is to look at the two sheets.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const { values: opt, positionals: [name] } = parseArgs({ allowPositionals: true, options: { new: { type: "boolean" }, stage: { type: "string" }, cast: { type: "string" }, title: { type: "string" }, props: { type: "string" }, out: { type: "string" }, voice: { type: "boolean" }, frames: { type: "boolean" }, port: { type: "string", default: process.env.STORYBOOK_PORT ?? "6006" } } });
if (!name || (opt.new ? !opt.stage || !opt.cast : !opt.out)) { console.error("usage: storybook-make.mjs <play> --new --stage <stage> --cast a,b [--title t] [--props a,b]\n       storybook-make.mjs <film> --out dir [--voice] [--port n] [--frames]"); process.exit(2); }
const root = resolve(import.meta.dirname, "..");
async function library(use) {
  const server = await createServer({ root, configFile: false, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try { return await use(await server.ssrLoadModule("/src/video/storybook/library.ts")); } finally { await server.close(); }
}

if (opt.new) {
  const file = join(root, "src/video/storybook/plays", `${name}.json`); if (!/^[a-z0-9-]+$/.test(name) || existsSync(file)) { console.error(existsSync(file) ? `${file} is there already.` : "A name has only small letters, digits and hyphens."); process.exit(1); }
  const faults = [], play = await library(({ storyLibrary }) => {
    const lib = storyLibrary(), stage = lib.stages[opt.stage], cast = opt.cast.split(","), props = opt.props?.split(",") ?? [];
    if (!stage) faults.push(`There is no stage "${opt.stage}". There are: ${Object.keys(lib.stages).join(", ")}.`);
    for (const a of cast) if (!lib.cast[a]) faults.push(`There is no person "${a}". There are: ${Object.keys(lib.cast).join(", ")}.`);
    for (const p of props) if (!lib.props[p]) faults.push(`There is no thing "${p}". There are: ${Object.keys(lib.props).join(", ")}.`);
    if (faults.length) return null;
    // the spots of the stage whose view these people have, each taken once
    const free = Object.entries(stage.spots), spots = {};
    for (const a of cast) { const i = free.findIndex(([, s]) => lib.cast[a].figures[s.view ?? "front"]); if (i < 0) { faults.push(`The stage "${opt.stage}" has no free spot for "${a}".`); return null; } spots[a] = free.splice(i, 1)[0][0]; }
    const next = i => cast[(i + 1) % cast.length], lines = cast.map((a, i) => ({ id: `line-${i + 1}`, speaker: a, ja: i ? "{私|わたし}もです。" : "こんにちは。", en: i ? "Me too." : "Hello." }));
    const beats = cast.map((a, i) => ({ shot: i ? { on: a, size: "chest" } : { on: cast, size: "knee", about: "TODO: what the picture shows." }, say: `line-${i + 1}`, ...(cast.length > 1 ? { to: next(i) } : {}), ...(i ? { mood: "happy" } : {}) }));
    return { id: name, title: opt.title ?? name, lines, scenes: [{ id: "one", stage: opt.stage, cast: spots, beats }, { id: "say", practice: { lines: [lines[0].id] } }, ...(props.length ? [{ id: "words", recap: { words: props.map(p => ({ text: lib.props[p].name, gloss: p, prop: p })) } }] : [])] };
  });
  if (!play) { console.error(faults.join("\n")); process.exit(1); }
  writeFileSync(file, `${JSON.stringify(play, null, 1)}\n`); console.log(`${file}\nNext: change its lines and beats, then: npm run -s story:make -- ${name} --out <dir>`);
} else {
  const out = resolve(opt.out), began = Date.now(), said = []; mkdirSync(out, { recursive: true });
  const unspoken = await library(({ unspokenLines, playNames }) => (playNames().includes(name) ? unspokenLines(name) : []));
  const run = (what, script, args, o = {}) => {
    const t = Date.now(), r = spawnSync("node", [join(import.meta.dirname, `storybook-${script}.mjs`), name, ...args], { encoding: "utf8", maxBuffer: 1 << 28, cwd: root }), text = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    writeFileSync(join(out, `${script}-${what.replace(/\W+/g, "-")}.txt`), `${text}\n`);
    console.log(`${what.padEnd(16)} ${((Date.now() - t) / 1000).toFixed(0).padStart(4)} s  ${r.status ? "FAULTS" : (o.say?.(text) ?? text.split("\n").pop())}`);
    if (r.status) { console.error(text.split("\n").slice(-30).join("\n")); process.exit(1); }
    return text;
  };
  run("plan", "plan", [], { say: t => t.split("\n")[0] });
  if (unspoken.length && opt.voice) run("speech", "speech", ["--only", unspoken.join(",")]);
  else console.log(`speech                   ${unspoken.length ? `not spoken yet: ${unspoken.join(", ")} (--voice)` : "every line has its recording"}`);
  for (const l of run("check, poses", "check", ["--out", join(out, "poses.jpg"), "--port", opt.port], { say: t => t.split("\n").filter(l => l.startsWith(`${name}:`)).pop() ?? "" }).split("\n").filter(l => /^(LOOK|STUDY)/.test(l))) said.push(l);
  run("measure", "qa", ["--out", join(out, "qa"), ...(opt.frames ? ["--frames", "--port", opt.port, "--known", join(out, "known.json")] : [])]);
  run("shots", "look", ["--n", "2", "--port", opt.port, "--out", join(out, "shots.jpg")], { say: () => join(out, "shots.jpg") });
  if (!unspoken.length || opt.voice) run("sound", "sound", ["--out", join(out, "mix.m4a")]);
  console.log(`${((Date.now() - began) / 1000).toFixed(0)} s. Look at poses.jpg and shots.jpg in ${out}.${said.length ? `\n${said.join("\n")}` : ""}`);
}
