// One command from the owner's full-body painting of a person to a checked figure and one sheet to look at.
//
//   node scripts/storybook-person.mjs <id>[,<id>] --out dir [--paint] [--port 6006]
//
// The person is src/video/storybook/people/<id>.json and the painting local-assets/storybook/paintings/cast/<id>_full_body.png.
// Steps for each person, in order; a fault stops that person, and the next person starts:
//   prepare   the painting on paper, its sharp copies and the head square (storybook-paint.py)
//   paint     with --paint: the faces that are not there and that the painting does not show itself, each checked
//   propose   only when the person has no card: src/video/storybook/cards/<id>.json, and <out>/<id>-card.jpg that draws it
//   cut       the figure into src/video/storybook/assets/<id>-front, and the ears that stay on the body
//   measure   story:qa of the shots of the film kit-<id>-front that show the figure itself (FIGURE_SHOTS)
//   check     story:check of the same shots
//   acts      story:check of all acts of arms; with a running Storybook also a sheet of every pose: <out>/<id>-poses.jpg. Its faults
//             are written and do not stop: on 2026-11-25 every kit film had the same 7 of the acts `clap`, `receive` and `raise`
//   sheet     with a running Storybook: <out>/<id>-sheet.jpg
//   missing   what a film can still ask for: faces, a rear view, a voice
// Each step writes its log to <out>/<id>-<step>.txt, and <out>/<id>-steps.json has the seconds of each step.
// What a person decides, and how to set up the tools: docs/component-specs/storybook-character.md
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { need } from "./storybook-tools.mjs";

const { values: opt, positionals: [ids] } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, paint: { type: "boolean" }, port: { type: "string", default: process.env.STORYBOOK_PORT ?? "6006" } } });
if (!ids || !opt.out) { console.error("usage: storybook-person.mjs <id>[,<id>] --out dir [--paint] [--port 6006]"); process.exit(2); }
const root = resolve(import.meta.dirname, ".."), at = need("python", "models", "paintings"), out = resolve(opt.out), story = join(root, "src/video/storybook");
mkdirSync(out, { recursive: true });
/** The shots of a kit film whose faults come from the figure. `poses` and `acts` show the acts of the library, the same for each figure. */
const FIGURE_SHOTS = "stand,turn,heads,looks,say,arms,walk,sit";
const storybook = await fetch(`http://127.0.0.1:${opt.port}/iframe.html`).then(r => r.ok, () => false);

function person(id) {
  const steps = [], began = Date.now(), card = join(story, "cards", `${id}.json`), film = `kit-${id}-front`;
  const run = (step, cmd, args, say = t => t.split("\n").pop(), gate = true) => {
    const t = Date.now(), r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, cwd: root }), text = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    const lines = text.split("\n").filter(l => !/^(W0000|I0000|INFO:|WARNING:|\[ WARN)|Warning/.test(l)), s = (Date.now() - t) / 1000, bad = r.status !== 0;
    writeFileSync(join(out, `${id}-${step}.txt`), `${text}\n`); steps.push({ step, seconds: Math.round(s), ok: !bad });
    const fault = lines.at(-1) || r.error?.message || `exit ${r.status ?? r.signal}`;
    console.log(`${id.padEnd(10)} ${step.padEnd(8)} ${s.toFixed(0).padStart(4)} s  ${bad && gate ? `FAULT: ${fault}` : say(lines.join("\n"))}`);
    if (bad && gate) throw new Error(`${step}: ${fault}`);
    return lines.join("\n");
  };
  const py = (step, script, args, say) => run(step, at.python, [join(import.meta.dirname, script), ...args], say);
  const node = (step, script, args, say, gate) => run(step, "node", [join(import.meta.dirname, script), film, ...args], say, gate);
  const summary = t => t.split("\n").filter(l => l.startsWith(`${film}:`)).pop() ?? t.split("\n").pop();
  const json = t => t.split("\n").filter(l => l.startsWith("{")).map(l => JSON.parse(l));
  const tools = ["--src", at.paintings, "--models", at.models];
  try {
    py("prepare", "storybook-paint.py", [id, "--kinds", "prepare", ...tools], t => `head box ${JSON.stringify(json(t)[0]?.box)}`);
    if (opt.paint) py("paint", "storybook-paint.py", [id, "--kinds", "faces", ...tools], t => json(t).filter(r => r.kept).map(r => `${r.file}${r.why ? " (there)" : ` seed ${r.seed}`}`).join(", ") || "no face was needed");
    if (existsSync(card)) console.log(`${id.padEnd(10)} propose     -    the card is there: ${card.slice(root.length + 1)}`);
    else py("propose", "storybook-rig.py", ["--propose", id, ...tools, "--look", out], t => { const r = json(t)[0]; return `shows ${r.shows}, faces ${r.faces.join(", ") || "none"}; look at ${r.picture}`; });
    const faces = py("cut", "storybook-rig.py", [card, ...tools, "--out", join(story, "assets"), "--look", out], t => t.split("\n").find(l => l.includes("ears left")) ?? "").match(/faces not painted: (.*)/)?.[1];
    node("measure", "storybook-qa.mjs", ["--shots", FIGURE_SHOTS, "--out", join(out, `${id}-qa`)]);
    node("check", "storybook-check.mjs", ["--shots", FIGURE_SHOTS], summary);
    node("acts", "storybook-check.mjs", storybook ? ["--out", join(out, `${id}-poses.jpg`), "--port", opt.port] : [], t => `${summary(t)} Look at ${id}-acts.txt${storybook ? ` and ${id}-poses.jpg` : ""}.`, false);
    if (storybook) node("sheet", "storybook-look.mjs", ["--n", "4", "--port", opt.port, "--out", join(out, `${id}-sheet.jpg`)], () => join(out, `${id}-sheet.jpg`));
    else console.log(`${id.padEnd(10)} sheet       -    no Storybook at port ${opt.port}: npm run storybook, then run again`);
    const p = JSON.parse(readFileSync(join(story, "people", `${id}.json`), "utf8"));
    const missing = [...(faces && faces !== "none" ? [`faces ${faces} (--paint, then add them to the card)`] : []), ...(existsSync(join(story, "cards", `${id}-rear.json`)) ? [] : ["a rear view (only when a screenplay turns the person)"]), ...(p.voice?.fish ? [] : ["a voice (story:voice)"])];
    console.log(`${id.padEnd(10)} missing        ${missing.join("; ") || "nothing"}`);
    return `${id}: done in ${((Date.now() - began) / 1000).toFixed(0)} s. Look at ${existsSync(join(out, `${id}-card.jpg`)) ? `${id}-card.jpg, ` : ""}${id}-front_parts.png${storybook ? `, ${id}-poses.jpg and ${id}-sheet.jpg` : ""} in ${out}.`;
  } catch (e) { return `${id}: stopped at ${e.message}`; }
  finally { writeFileSync(join(out, `${id}-steps.json`), `${JSON.stringify(steps, null, 1)}\n`); }
}

const said = ids.split(",").map(person);
console.log(said.join("\n"));
process.exit(said.some(s => s.includes(": stopped at ")) ? 1 : 0);
