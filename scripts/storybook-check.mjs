// What is wrong with a painted storybook film, before anyone looks at it, and the one sheet to look at.
//
//   node scripts/storybook-check.mjs <film> [--shots a,b] [--out sheet.jpg [--port 6006] [--width 250] [--cols 8] [--all]]
//
// It finds: what cannot be composed, joints that no person has (`JOINT_RANGES` and `ACT_STUDIES`), hands that go through a counter,
// and acts of arms that nobody has studied on a photograph. It asks about joints that look strained and forearms drawn so short that
// a painting shows a lump. With --out (Storybook must
// run) it draws each arm act at its clearest moment, cut to the person: one sheet for every pose of the film. A figure that does
// the same act again has one cell, the one whose joints are worst, unless --all.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const { values: opt, positionals: [name] } = parseArgs({ allowPositionals: true, options: { shots: { type: "string" }, out: { type: "string" }, port: { type: "string", default: process.env.STORYBOOK_PORT ?? "6006" }, width: { type: "string", default: "250" }, cols: { type: "string", default: "8" }, all: { type: "boolean" } } });
if (!name) { console.error("usage: storybook-check.mjs <film> [--shots a,b] [--out sheet.jpg] [--port n] [--all]"); process.exit(2); }
const server = await createServer({ root: join(import.meta.dirname, ".."), configFile: false, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
let checked;
try {
  const [{ filmOf }, { planStorybook, inspectStorybook }, { checkStory }] = await Promise.all(["/src/video/storybook/films.ts", "/registry/video/storybook/storybook-film.ts", "/registry/video/storybook/story-check.ts"].map(p => server.ssrLoadModule(p)));
  const film = filmOf(name), faults = inspectStorybook(film); checked = { ...checkStory(planStorybook(film), { shots: opt.shots?.split(",") }), faults };
} finally { await server.close(); }
const say = j => `${j.shot} ${j.t.toFixed(2)} s, ${j.actor}${j.acts.length ? ` (${j.acts.join(", ")})` : ""}: ${j.hand ? `${j.joint} of hand ${j.hand}` : j.joint} is ${j.angle}° for ${j.seconds.toFixed(1)} s, ${j.range[0]}° to ${j.range[1]}° ${j.level === "can" ? "is all that a person can" : j.studied ? "is what the study of the act shows" : "is easy"}`;
for (const f of checked.faults) console.log(`FAULT ${f}`);
for (const j of checked.joints.filter(j => j.level === "can")) console.log(`FAULT ${say(j)}`);
for (const c of checked.counters) console.log(`FAULT ${c}`);
for (const c of checked.jumps) console.log(`FAULT ${c}`);
for (const c of checked.palms) console.log(`FAULT ${c}`);
for (const j of checked.joints.filter(j => j.level === "easy")) console.log(`LOOK  ${say(j)}`);
for (const h of checked.hidden) console.log(`LOOK  ${h}`);
for (const g of checked.grips) console.log(`LOOK  ${g}`);
for (const l of checked.short) console.log(`LOOK  ${l}`);
for (const h of checked.handActs) console.log(`LOOK  ${h}`);
for (const a of checked.unstudied) console.log(`STUDY "${a}" has no photograph in ACT_STUDIES (registry/rig/rig-act-studies.ts): look at one before its joints are set.`);
const wrong = checked.faults.length + checked.counters.length + checked.jumps.length + checked.palms.length + checked.joints.filter(j => j.level === "can").length;
console.log(`${name}: ${wrong} faults, ${checked.hidden.length + checked.grips.length + checked.short.length + checked.handActs.length + checked.joints.filter(j => j.level !== "can").length} to look at, ${checked.acts.length} acts of arms, ${checked.unstudied.length} without a study.`);
if (opt.out) {
  const worst = a => checked.joints.filter(j => j.shot === a.shot && j.actor === a.actor && j.acts.includes(a.act)).reduce((w, j) => Math.max(w, j.level === "can" ? 1000 : 0) + Math.max(j.range[0] - j.angle, j.angle - j.range[1]), 0), one = new Map();
  for (const a of checked.acts) { const key = opt.all ? `${a.shot}/${a.actor}/${a.act}/${a.t}` : `${a.actor}/${a.view}/${a.act}/${a.hands.join("")}`, was = one.get(key); if (!was || worst(a) > worst(was)) one.set(key, a); }
  const dir = mkdtempSync(join(tmpdir(), "story-check-")), cells = [...one.values()].map(a => ({ t: a.t, box: a.box, label: `${worst(a) ? "! " : ""}${a.actor} ${a.act} · ${a.shot}` }));
  if (cells.length) { writeFileSync(join(dir, "cells.json"), JSON.stringify(cells)); spawnSync("node", [join(import.meta.dirname, "storybook-look.mjs"), name, "--cells", join(dir, "cells.json"), "--port", opt.port, "--width", opt.width, "--cols", opt.cols, "--out", opt.out], { stdio: "inherit" }); }
  rmSync(dir, { recursive: true, force: true });
}
process.exitCode = wrong ? 1 : 0;
