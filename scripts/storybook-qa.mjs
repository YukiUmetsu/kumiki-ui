/* global window, document */
// What can be measured in a painted storybook film: first from its data, then from its pictures.
//
//   node scripts/storybook-qa.mjs <film> --out dir [--frames] [--port 6006] [--width 640] [--shots a,b] [--known file] [--python python3]
//   node scripts/storybook-qa.mjs <module> <export> --out dir [--url export-story] …
//
// Data: what `inspectStorybook` and `story:check` find, feet that slide, joints that jump, hands that are too fast, meshes that fold, and how far each mouth is from its own
// recording. With --frames or --url (the film's export story, Storybook must run) it also takes every frame and `storybook-qa.py` (OpenCV) looks
// for pops, feet that slide against the picture, mouths that do not move with the voice, and frames that depend on the order they
// are drawn in. --known keeps what was measured and had no faults: a picture that is drawn from the same data with the same paintings
// is not taken again, so a change costs the pictures that it changes. Numbers find faults; they do not say that a film is good. Look at the frames that it names.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const { values: opt, positionals: [film1, name] } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, url: { type: "string" }, frames: { type: "boolean" }, port: { type: "string", default: process.env.STORYBOOK_PORT ?? "6006" }, shots: { type: "string" }, known: { type: "string" }, width: { type: "string", default: "640" }, from: { type: "string" }, to: { type: "string" }, python: { type: "string", default: "python3" } } });
if (!film1 || !opt.out) { console.error("usage: storybook-qa.mjs <film> --out dir [--frames] [--port n] [--width px] [--shots a,b] [--known file] [--from s] [--to s] [--python python3]\n       storybook-qa.mjs <module> <export> --out dir [--url export-story] …"); process.exit(2); }
const url = opt.url ?? (opt.frames ? `http://localhost:${opt.port}/iframe.html?id=video-storybook-film--export-wide&viewMode=story&args=film:${film1}` : undefined);
const root = resolve(import.meta.dirname, ".."), out = resolve(opt.out), LIMIT = { fold: 0.002, /* a corner of cloth that hangs falls over itself when the arm is up */ slack: 0.06, slide: 0.6, turn: 40, hand: 2.6, lag: 0.07 };
rmSync(join(out, "frames"), { recursive: true, force: true }); mkdirSync(join(out, "frames"), { recursive: true });

/** One number for whatever a frame is drawn from. What does not change from frame to frame is read once. */
const numbers = new WeakMap(), step = (h, v) => Math.imul(h ^ v, 0x01000193) >>> 0;
function hashOf(v) {
  if (typeof v === "number") return Math.round(v * 256) >>> 0;
  if (typeof v === "string") { let h = 0x811c9dc5; for (let i = 0; i < v.length; i++) h = step(h, v.charCodeAt(i)); return h; }
  if (!v || typeof v !== "object") return v === true ? 1 : 0;
  let h = numbers.get(v); if (h !== undefined) return h;
  h = 0x811c9dc5; numbers.set(v, 7);
  if (Array.isArray(v) || ArrayBuffer.isView(v)) for (let i = 0; i < v.length; i++) h = step(h, hashOf(v[i])); else for (const k of Object.keys(v)) h = step(step(h, hashOf(k)), hashOf(v[k]));
  numbers.set(v, h); return h;
}
const shas = new Map(), shaOf = path => { if (!shas.has(path)) shas.set(path, existsSync(path) ? createHash("sha1").update(readFileSync(path)).digest("hex") : ""); return shas.get(path); };
/** The paintings that something of a film names. */
const paintings = (v, to = new Set()) => { if (typeof v === "string") { const m = /^\/?(?:@fs)?(.*\.(?:webp|png|jpe?g))(?:[?#].*)?$/.exec(v); if (m) to.add(m[1]); } else if (v && typeof v === "object" && !ArrayBuffer.isView(v)) for (const k of Object.values(v)) paintings(k, to); return to; };
const server = await createServer({ root, configFile: false, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const [made, story, mouth, check] = await Promise.all([name ? `/${film1}` : "/src/video/storybook/films.ts", "/registry/video/storybook/storybook-film.ts", "/registry/video/storybook/speech-mouth.ts", "/registry/video/storybook/story-check.ts"].map(p => server.ssrLoadModule(p)));
  const film = name ? made[name] : made.filmOf(film1);
  if (!film) throw new Error(`${film1} exports no ${name}.`);
  const plan = story.planStorybook(film), first = Math.round(Number(opt.from ?? 0) * film.fps), last = Math.min(plan.frames, Math.round(Number(opt.to ?? plan.seconds) * film.fps)), faults = [], worst = { fold: {}, slide: {}, turn: {}, hand: {} }, trace = [];
  const most = (kind, key, value, n) => { const w = worst[kind][key]; if (!w || value > w.value) worst[kind][key] = { value, frame: n }; };
  faults.push(...story.inspectStorybook(film));

  const only = opt.shots?.split(","), poses = check.checkStory(plan, { shots: only });
  faults.push(...poses.joints.filter(j => j.level === "can").map(j => `${j.shot} ${j.t.toFixed(2)} s: ${j.joint}${j.hand ? ` of hand ${j.hand}` : ""} of "${j.actor}" is ${j.angle}°, more than a person can.`), ...poses.counters, ...poses.jumps);
  const drawn = {}, wants = id => !only || only.includes(id);
  const feet = new Map(), before = new Map(), hands = new Map();
  for (let n = first; n < last; n++) {
    const now = story.storybookFrame(plan, n / film.fps), id = now.shot.shot.id; if (!wants(id)) continue;
    const record = { n, shot: id, joined: !!now.paint.next, feet: [], mouths: [], scale: now.view.scale() };
    if (opt.known) drawn[id] = step(drawn[id] ?? 0x811c9dc5, hashOf(now.paint));
    now.played.forEach((p, i) => {
      const who = `${now.shot.shot.id}/${p.role.actor}/${i}`, face = p.figure.art.face, said = (now.shot.shot.says ?? []).find(s => { const t = n / film.fps - now.shot.start - s.at; return film.lines[s.line].speaker === p.role.actor && t >= 0 && t <= story.storyLineSeconds(film.lines[s.line]); });
      // feet step round while the body turns over to another view
      for (const foot of ["foot-f", "foot-b"]) { const b = p.frame.bones.get(foot); if (b && !(p.role.views ?? []).some(v => v.t > 0 && Math.abs(v.t - (n / film.fps - now.shot.start)) < 0.34)) { const key = `${who}/${foot}`; if (!feet.has(key)) feet.set(key, []); feet.get(key).push([n, b.world.e, b.world.f, p.role.scale ?? 1]); } }
      // what is outside the picture is not seen
      const seen = b => { const [x, y] = now.view.put(b.world.e, b.world.f); return x > 0 && y > 0 && x < film.size.width && y < film.size.height; };
      for (const [id, b] of p.frame.bones) {
        if (!seen(b) || !/^(torso|neck|head|arm|fore|hand|thigh|shin|pelvis)/.test(id)) continue;
        const key = `${who}/${id}`, turn = Math.atan2(b.world.b, b.world.a) * 180 / Math.PI, was = before.get(key); before.set(key, [n, turn]);
        // what points at the viewer is short on the picture: the same turn moves it less
        if (was?.[0] === n - 1) most("turn", key, Math.abs(((turn - was[1] + 540) % 360) - 180) * Math.min(1, Math.hypot(b.world.c, b.world.d) / Math.hypot(b.world.a, b.world.b)), n);
      }
      // a hand against the hips, so that a walk does not count
      for (const id of ["hand-f", "hand-b"]) {
        const b = p.frame.bones.get(id), hips = p.frame.bones.get("pelvis"); if (!b || !hips || !seen(b)) continue;
        const key = `${who}/${id}`, at = [b.world.e - hips.world.e, b.world.f - hips.world.f], was = hands.get(key); hands.set(key, [n, at]);
        if (was?.[0] === n - 1) most("hand", key, Math.hypot(at[0] - was[1][0], at[1] - was[1][1]) * film.fps / 100 / (p.role.scale ?? 1), n);
      }
      for (const m of p.meshes) {
        const layer = p.figure.art.layers.find(l => l.id === m.id); if (layer?.bind.kind !== "skin") continue;
        const side = [0, 0], at = (k, c) => m.positions[m.indices[k] * 2 + c];
        for (let k = 0; k < m.indices.length; k += 3) { const a = (at(k + 1, 0) - at(k, 0)) * (at(k + 2, 1) - at(k, 1)) - (at(k + 2, 0) - at(k, 0)) * (at(k + 1, 1) - at(k, 1)); side[a > 0 ? 0 : 1] += Math.abs(a); }
        // of what it is at rest: cloth that is drawn in is a small thing to measure by
        const w = p.frame.bones.get("pelvis")?.world, whole = w ? 2 * layer.width * layer.height * Math.abs(w.a * w.d - w.b * w.c) : 0;
        const fold = Math.min(...side) / Math.max(whole, side[0] + side[1]);
        if (!layer.bind.slack || fold > LIMIT.slack) most("fold", `${p.figure.art.id}/${m.id}`, fold, n);
      }
      if (!face || !said) return;
      const spoken = new Set(Object.values(face.mouths).map(id => `${face.layer}/${id}`)), drawn = p.meshes.filter(m => spoken.has(m.id)).at(-1);
      // the box round the lips of every mouth, where the corners of the drawn mouth are: a face that leans or looks down is not measured with the wall or the nose
      const patch = drawn && face.patches[drawn.id.slice(face.layer.length + 1)]; if (!patch?.marks) return;
      const lips = Object.values(face.mouths).flatMap(id => face.patches[id].marks ? [face.patches[id].marks] : []).map(m => { const x = (m[0][0] + m[1][0]) / 2, y = (m[0][1] + m[1][1]) / 2; return { wide: (m[1][0] - m[0][0]) / 2, up: y - Math.min(...m.map(q => q[1])), down: Math.max(...m.map(q => q[1])) - y, x }; });
      const widest = key => Math.max(...lips.map(l => l[key])), k = now.view.scale() * (p.role.scale ?? 1), wide = widest("wide") * 1.15 * k, rim = 0.08 * (widest("up") + widest("down")) * k, up = widest("up") * k + rim, down = widest("down") * k + rim;
      const drawnAt = ([x, y]) => { const u = (x - patch.x) / patch.width, v = (y - patch.y) / patch.height, at = (k, c) => drawn.uvs[drawn.indices[k] * 2 + c], to = (k, c) => drawn.positions[drawn.indices[k] * 2 + c];
        for (let t = 0; t < drawn.indices.length; t += 3) { const ax = at(t + 1, 0) - at(t, 0), ay = at(t + 1, 1) - at(t, 1), bx = at(t + 2, 0) - at(t, 0), by = at(t + 2, 1) - at(t, 1), d = ax * by - ay * bx, m = ((u - at(t, 0)) * by - (v - at(t, 1)) * bx) / d, n = (ax * (v - at(t, 1)) - ay * (u - at(t, 0))) / d; if (m > -1e-6 && n > -1e-6 && m + n < 1 + 1e-6) return now.view.put(to(t, 0) + m * (to(t + 1, 0) - to(t, 0)) + n * (to(t + 2, 0) - to(t, 0)), to(t, 1) + m * (to(t + 1, 1) - to(t, 1)) + n * (to(t + 2, 1) - to(t, 1))); }
        return null; };
      const a = drawnAt(patch.marks[0]), b = drawnAt(patch.marks[1]); if (!a || !b) return;
      const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ex = [(b[0] - a[0]) / d, (b[1] - a[1]) / d], ey = [-ex[1], ex[0]], corner = (x, y) => [c[0] + ex[0] * x + ey[0] * y, c[1] + ex[1] * x + ey[1] * y];
      record.mouths.push({ who: p.role.actor, line: said.line, at: now.shot.start + said.at, quad: [corner(-wide, -up), corner(wide, -up), corner(wide, down), corner(-wide, down)], open: mouth.mouthAt(story.storySpoken(film.lines[said.line]).keys, n / film.fps - now.shot.start - said.at).shape.open });
    });
    trace.push(record);
  }
  // a foot is down while its ankle is as low as it gets; then it may not go along the ground
  for (const [key, path] of feet) {
    const low = Math.max(...path.map(p => p[2])); let from = null;
    path.forEach(([n, x, y, k], i) => { const down = low - y < 0.2 * k; if (!down || path[i - 1]?.[0] !== n - 1) from = down ? x : null; if (from !== null) most("slide", key, Math.abs(x - from) / k, n); if (down && from === null) from = x; });
    const bone = key.split("/").pop(), who = key.slice(0, -bone.length - 1);
    for (const [n, x, y] of path) { const r = trace.find(t => t.n === n), view = story.storyView(film, plan.shots.find(s => s.shot.id === r.shot).shot, n / film.fps - plan.shots.find(s => s.shot.id === r.shot).start); r.feet.push({ id: `${who}/${bone}`, at: view.put(x, y), down: low - y < 0.2 }); }
  }
  for (const [kind, unit, scale] of [["fold", "% of a mesh folds", 100], ["slide", " cm of sliding", 1], ["turn", "° in one frame", 1], ["hand", " m/s", 1]]) for (const [key, w] of Object.entries(worst[kind])) if (w.value > LIMIT[kind]) faults.push(`${key}: ${(w.value * scale).toFixed(2)}${unit} (frame ${w.frame})`);

  // ---- the mouth against its recording
  const HOP = 0.01, lines = [];
  for (const [id, line] of Object.entries(film.lines)) {
    if (!line.audio) continue;
    const raw = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", join(root, line.audio.replace(/[?#].*$/, "")), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], { maxBuffer: 1 << 28 }), pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2), step = Math.round(16000 * HOP), N = Math.floor(pcm.length / step);
    const loud = Array.from({ length: N }, (_, i) => { let s = 0; for (let k = i * step; k < (i + 1) * step; k++) s += pcm[k] * pcm[k]; return Math.sqrt(s / step); }), top = Math.max(...loud), heard = loud.map(v => Math.max(0, 1 + Math.log10(Math.max(1e-6, v / top)) / 1.6)), keys = story.storySpoken(line).keys, open = heard.map((_, i) => mouth.mouthAt(keys, (i + 0.5) * HOP).shape.open);
    const like = lag => { const a = [], b = []; for (let i = 0; i < N; i++) if (i + lag >= 0 && i + lag < N) { a.push(heard[i]); b.push(open[i + lag]); } const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length; let ab = 0, aa = 0, bb = 0; a.forEach((v, i) => { ab += (v - ma) * (b[i] - mb); aa += (v - ma) ** 2; bb += (b[i] - mb) ** 2; }); return ab / Math.sqrt(aa * bb || 1); };
    let best = 0; for (let lag = -25; lag <= 25; lag++) if (like(lag) > like(best)) best = lag;
    const begin = v => v.findIndex(x => x > 0.15) * HOP, end = v => (v.length - [...v].reverse().findIndex(x => x > 0.15)) * HOP, vowels = line.track.phones.filter(p => "aeo".includes(p.p[0]) && p.p.length < 3 && p.end - p.start > 0.06), on = vowels.filter(p => heard[Math.floor((p.start + p.end) / 2 / HOP)] > 0.45).length;
    const row = { id, precision: line.track.precision, like: +like(0).toFixed(2), lag: +(best * HOP).toFixed(2), begin: +(begin(open) - begin(heard)).toFixed(2), end: +(end(open) - end(heard)).toFixed(2), vowels: `${on}/${vowels.length}` }; lines.push(row);
    // a short line has few sounds to compare: it is late only when it also begins or ends late
    if (Math.abs(row.lag) > LIMIT.lag && Math.max(Math.abs(row.begin), Math.abs(row.end)) > LIMIT.lag) faults.push(`line ${id}: the mouth is ${Math.round(row.lag * 1000)} ms after the voice.`);
  }
  const top = (kind, scale = 1) => Object.entries(worst[kind]).sort((a, b) => b[1].value - a[1].value).slice(0, 5).map(([k, w]) => `${k} ${(w.value * scale).toFixed(2)} @${w.frame}`).join("; ");
  console.log(`${last - first} frames. Folds, %: ${top("fold", 100)}\nSlides, cm: ${top("slide")}\nTurns, ° a frame: ${top("turn")}\nHands, m/s: ${top("hand")}`);
  console.table(lines);
  // what is the same as the last time that it had no faults is not looked at again
  const known = opt.known && existsSync(opt.known) ? JSON.parse(readFileSync(opt.known, "utf8")) : {}, was = known[film.id] ?? {}, look = {};
  if (opt.known) {
    const brush = ["paint-stage.ts", "storybook-film-react.tsx", "furigana.tsx"].map(f => `registry/video/storybook/${f}`).concat(readdirSync(join(root, "registry/video/gl")).sort().map(f => `registry/video/gl/${f}`)).map(f => shaOf(join(root, f))).join();
    for (const { shot } of plan.shots) if (drawn[shot.id] !== undefined) look[shot.id] = createHash("sha1").update([drawn[shot.id], brush, JSON.stringify([shot.says, shot.words, shot.layout]), ...[...paintings([(shot.roles ?? []).map(r => film.cast[r.actor]), film.sets[shot.set], (shot.props ?? []).map(p => film.props[p.prop])])].sort().map(f => shaOf(join(root, f)))].join("|")).digest("hex");
  }
  const same = new Set(Object.keys(look).filter(id => was[id] === look[id])), taken = trace.filter(r => !same.has(r.shot));
  if (same.size) console.log(`${same.size} of ${Object.keys(look).length} pictures are as they were. ${taken.length} frames to take.`);
  writeFileSync(join(out, "trace.json"), JSON.stringify({ fps: film.fps, size: film.size, first: taken[0]?.n ?? first, frames: taken, lines, worst, faults }));

  // ---- the pictures
  if (url && taken.length) {
    const { chromium } = await import("playwright"), width = Number(opt.width), browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: film.size.width, height: film.size.height }, deviceScaleFactor: width / film.size.width });
    page.on("pageerror", e => faults.push(`page: ${e.message}`));
    const ready = async () => { await page.waitForSelector("[data-km-paint-film-status=ready]", { timeout: 60000 }); await page.waitForFunction(() => !!window.__kmVideoExport, null, { timeout: 60000 }); };
    await page.goto(url); await ready();
    const shot = async n => { await page.evaluate(f => window.__kmVideoExport.seek(f), n); await page.waitForFunction(f => document.querySelector("[data-km-paint-film-drawn]")?.dataset.kmPaintFilmDrawn === String(f), n, { timeout: 60000 }); const picture = await page.locator("[data-storybook-film]").first().screenshot(); if (await page.evaluate(() => document.querySelector("[data-km-paint-film-drawn]")?.dataset.kmPaintFilmDrawn) !== String(n)) throw new Error("Another frame was drawn."); return picture; };
    // a development server loads the page again when a file changes, in the middle of a frame
    const seek = async n => { for (let left = 3; ; left--) try { return await shot(n); } catch (error) { if (!left) throw error; console.log(`The page loaded again at frame ${n}. If the film or its art changed, measure again.`); await page.waitForTimeout(1500); await ready(); } };
    for (const { n } of taken) writeFileSync(join(out, "frames", `${String(n).padStart(5, "0")}.png`), await seek(n));
    // the same frames again, in another order
    for (const { n } of new Set([0.83, 0.21, 0.57].map(u => taken[Math.floor((taken.length - 1) * u)]))) writeFileSync(join(out, "frames", `again-${String(n).padStart(5, "0")}.png`), await seek(n));
    await browser.close();
    const seen = spawnSync(opt.python, [join(root, "scripts/storybook-qa.py"), out], { encoding: "utf8" }); process.stdout.write(seen.stdout); process.stderr.write(seen.stderr);
    if (seen.status) faults.push("storybook-qa.py found faults in the pictures.");
  }
  if (opt.known && url && !faults.length) { mkdirSync(dirname(resolve(opt.known)), { recursive: true }); writeFileSync(opt.known, JSON.stringify({ ...known, [film.id]: { ...was, ...look } }, null, 1)); }
  for (const f of faults) console.log(`FAULT ${f}`);
  if (faults.length) process.exitCode = 1; else console.log("No faults.");
} finally { await server.close(); }
