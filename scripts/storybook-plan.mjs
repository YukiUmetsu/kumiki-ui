// What a painted storybook film will be, and what it can be made from, without a browser.
//
//   node scripts/storybook-plan.mjs <film>            every shot with its lines; it fails when the film cannot be composed
//   node scripts/storybook-plan.mjs --all             one line for each film
//   node scripts/storybook-plan.mjs --library [people|stages|props|sounds|acts] [name]
//                                                     what a screenplay can name, so that nobody has to read code or art to write one
import { createServer } from "vite";

const [name, kind, only] = process.argv.slice(2), KINDS = ["people", "stages", "props", "sounds", "acts"];
if (!name || (name === "--library" && kind && !KINDS.includes(kind))) { console.error(`usage: storybook-plan.mjs <film> | --all | --library [${KINDS.join("|")}] [name]`); process.exit(2); }
const server = await createServer({ root: process.cwd(), configFile: false, logLevel: "error", server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
const some = o => Object.entries(o ?? {}).filter(([k]) => !only || k === only), list = o => Object.keys(o ?? {}).join(" ");
try {
  const load = (...paths) => Promise.all(paths.map(p => server.ssrLoadModule(p)));
  if (name === "--library") {
    const [{ storyLibrary }, { ACTS }, { paintedLooks }] = await load("/src/video/storybook/library.ts", "/registry/rig/rig-acting.ts", "/registry/rig/rig-look-painted.ts"), lib = storyLibrary(), say = {
      people: () => { for (const [id, a] of some(lib.cast)) { console.log(`${id}: ${a.name}, ${a.label}`); for (const [view, f] of Object.entries(a.figures)) console.log(`  ${view}: ${Math.round(f.body.height)} cm; looks ${f.art.face ? paintedLooks(f.art.face).join(" ") : "none"}; hands ${[...new Set(f.art.layers.filter(l => l.id.startsWith("hand-")).flatMap(l => Object.keys(l.variants ?? {})))].join(" ") || "as painted"}; sockets ${list(f.art.sockets)}`); } },
      stages: () => { for (const [id, s] of some(lib.stages)) { console.log(`${id}: ${s.about}`); for (const [side, d] of [["home", s], ...Object.entries(s.sides ?? {})]) console.log(`  ${side}: spots ${Object.entries(d.spots).map(([k, q]) => `${k}${q.view === "rear" ? " (rear)" : ""}`).join(" ")}; frames ${list(d.frames)}; marks ${list(lib.sets[d.set]?.marks)}`); } },
      props: () => { for (const [id, p] of some(lib.props)) console.log(`${id}: ${p.name}, ${Math.round(p.width)} × ${Math.round(p.height)} cm${p.views ? `; views ${list(p.views)}` : ""}`); },
      sounds: () => console.log(`sounds: ${list(lib.sounds)}\ndrifts: ${list(lib.drifts)}\nbursts: ${list(lib.bursts)}`),
      acts: () => { for (const [id, a] of some(ACTS)) console.log(`${id} (${a.group}, ${a.seconds} s): ${a.about}`); },
    };
    for (const k of kind ? [kind] : KINDS) say[k]();
  } else {
    const [{ filmOf, filmNames }, { planStorybook }] = await load("/src/video/storybook/films.ts", "/registry/video/storybook/storybook-film.ts");
    for (const id of name === "--all" ? filmNames().filter(f => !f.startsWith("kit-")) : [name]) {
      const plan = planStorybook(filmOf(id)); console.log(`${id}: ${plan.seconds.toFixed(1)} s, ${plan.shots.length} shots`);
      if (name !== "--all") for (const { shot, start, end } of plan.shots) console.log(`  ${shot.id.padEnd(26)} ${start.toFixed(2).padStart(7)} + ${(end - start).toFixed(2).padStart(5)}  ${(shot.roles ?? []).map(r => r.actor).join(",")}  ${(shot.says ?? []).map(q => `${q.line}@${q.at.toFixed(1)}`).join(" ")}`);
    }
  }
} catch (e) { console.error(String(e)); process.exitCode = 1; } finally { await server.close(); }
