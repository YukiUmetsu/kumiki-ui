#!/usr/bin/env node
/* global window, document, HTMLCanvasElement */
/** Automated film path: one JSON file in, checked and reviewable video out.
 *   npm run film:check  -- <file.film.json> [--format=json]        No browser. Reports every problem with a JSON path.
 *   npm run film:render -- <file> [--only=<output id>] [--out=<dir>] [--browser=chrome] [--frames=<n>] [--audio-only]
 *   npm run film:review -- <file> [--only=<output id>] [--out=<dir>]   Contact sheets and a rendered-text report.
 *   npm run film:frame  -- <file> --frame=<n> [--only=<output id>] [--out=<dir>]  One audited PNG, no encoding.
 *   Any command takes --look=<preset> and --mood=<a,b> to try the film in another look without editing it.
 *   npm run film:seek   -- <file> [--only=<output id>] [--frames=80,4,80,160,4]   Same frame, same pixels, in any order.
 *   npm run film:example -- --recipe=<id> [--out=<dir>] | --list
 * An accent kit for audio.accents comes from: npm run film:sound-kit -- <folder>
 * Requires Playwright Chromium, and for render ffmpeg and ffprobe on PATH.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { bakeCompiled, decodeChannels, loudness } from "./sound-catalog.mjs";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import { serveFile } from "./serve-file.mjs";
import { glArgs } from "./video-export-core.mjs";
import { selectFilmFrame } from "./film-frame-core.mjs";
import { SHADER_FX_GUIDE } from "../registry/video/shader-fx-guide.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMMANDS = new Set(["check", "render", "review", "frame", "seek", "example"]);
const [command, ...rest] = process.argv.slice(2);
if (!COMMANDS.has(command)) throw Error("Usage: scripts/film.mjs check|render|review|frame|seek|example ...");
const flags = {}, files = [];
for (const arg of rest) {
  const match = /^--(format|only|out|browser|frames|frame|recipe|gl|look|mood)=(.+)$/.exec(arg);
  if (match) flags[match[1]] = match[2];
  else if (arg === "--list") flags.list = true;
  else if (arg === "--audio-only") flags["audio-only"] = true;
  else if (arg.startsWith("--")) throw Error("Unknown flag: " + arg);
  else files.push(arg);
}
const needsFile = command !== "example";
if (needsFile && files.length !== 1) throw Error("Give exactly one film file.");
const filmPath = needsFile ? resolve(files[0]) : undefined, filmDir = needsFile ? dirname(filmPath) : undefined;

const viteBase = { configFile: false, root: ROOT, cacheDir: "node_modules/.vite-film", server: { fs: { strict: false } } };
/** Load registry TypeScript through Vite, which resolves its extensionless imports. */
async function loadRegistry() {
  const server = await createServer({ ...viteBase, logLevel: "error", appType: "custom", server: { ...viteBase.server, middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  const load = id => server.ssrLoadModule(id);
  return { film: await load("/registry/video/film-document.ts"), audio: await load("/registry/video/audio-visual-cue.ts"), design: await load("/registry/video/sound-design.ts"), mastering: await load("/registry/video/sound-mastering.ts"), examples: await load("/registry/video/scene-template-examples.ts"), close: () => server.close() };
}
/** Serve the capture page, plus the film file and the folder around it at /__film/. */
async function startFilmServer() {
  const server = await createServer({ ...viteBase, logLevel: "error", plugins: [react(), tailwindcss(), {
    name: "kumiki-film-files",
    configureServer(vite) {
      vite.middlewares.use("/__film", (req, res) => {
        const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        if (pathname === "/__document.json" && (flags.look || flags.mood)) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(readDocument())); return; }
        const file = pathname === "/__document.json" ? filmPath : normalize(join(filmDir, pathname));
        if (file !== filmPath && !file.startsWith(filmDir + sep)) { res.writeHead(403).end(); return; }
        try { if (!statSync(file).isFile()) throw Error("Not a file"); } catch { res.writeHead(404).end(); return; }
        serveFile(req, res, file);
      });
    },
  }], server: { ...viteBase.server, host: "127.0.0.1", hmr: false, ws: false }, optimizeDeps: { entries: ["src/film/capture.tsx"] } });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  return { pageUrl: outputId => new URL("src/film/capture.html?output=" + encodeURIComponent(outputId), base).toString(), close: () => server.close() };
}
function printDiagnostics(diagnostics, heading) {
  if (flags.format === "json") return;
  for (const item of diagnostics) {
    console.log(`${item.severity.toUpperCase()} ${heading}${item.path} [${item.code}] ${item.message}`);
    if (item.hint) console.log("  fix: " + item.hint);
  }
}
/** Compile each selected output without a browser. Text that needs real fonts is measured later, in the page. */
function checkOutputs(filmModule, document) {
  const ids = (Array.isArray(document.outputs) ? document.outputs : []).map(item => item?.id).filter(Boolean);
  const selected = flags.only ? [flags.only] : ids.length ? ids : [undefined];
  const results = selected.map(outputId => ({ outputId, ...filmModule.compileFilm(document, { outputId, accentKit: accentKit(document) }) }));
  return { selected, results };
}
/** The kit.json of the accent kit that the film names, if it names one. */
function accentKit(document) {
  const kit = document.audio?.accents?.kit;
  if (typeof kit !== "string") return undefined;
  const file = join(filmDir, kit, "kit.json");
  if (!existsSync(file)) throw Error(`No accent kit at ${file}. Make one: npm run film:sound-kit -- ${join(filmDir, kit)}`);
  return JSON.parse(readFileSync(file, "utf8"));
}
/** The film file, with --look and --mood laid over its own look. */
function readDocument() {
  let document;
  try { document = JSON.parse(readFileSync(filmPath, "utf8")); }
  catch (error) { throw Error("Cannot read " + filmPath + ": " + error.message); }
  if (flags.look || flags.mood) document.look = { ...document.look, ...flags.look ? { preset: flags.look } : {}, ...flags.mood ? { mood: flags.mood.split(",").filter(Boolean) } : {} };
  return document;
}
const run = (bin, args) => new Promise((ok, fail) => {
  const child = spawn(bin, args, { stdio: "inherit" });
  child.once("error", fail);
  child.once("close", code => code === 0 ? ok() : fail(Error(bin + " exited with code " + code)));
});
/** Open the capture page for one output. The page compiles with real fonts, which is the final word on the film. */
async function openFilm(browser, url) {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__kmFilm?.failed || typeof window.__kmVideoExport?.seek === "function", null, { timeout: 120000 });
  } catch (error) { throw Error("The capture page did not start: " + (errors.join("; ") || error.message)); }
  const state = await page.evaluate(() => ({ failed: window.__kmFilm.failed, diagnostics: window.__kmFilm.diagnostics, reviewFrames: window.__kmFilm.reviewFrames, manifest: window.__kmVideoExport?.manifest }));
  return { page, errors, ...state };
}
const launch = () => chromium.launch({ headless: true, args: glArgs(flags.gl), ...(flags.browser === "chrome" ? { channel: "chrome" } : {}),
  ...(process.env.KUMIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.KUMIKI_BROWSER_EXECUTABLE } : {}) });

async function check() {
  const registry = await loadRegistry();
  try {
    const { results } = checkOutputs(registry.film, readDocument());
    const seen = new Set(), diagnostics = [];
    for (const result of results) for (const item of result.diagnostics) {
      const key = item.path + item.code + item.message;
      if (!seen.has(key)) { seen.add(key); diagnostics.push(item); }
    }
    const ok = results.every(result => result.ok);
    if (flags.format === "json") console.log(JSON.stringify({ schemaVersion: 1, ok, diagnostics, outputs: results.map(result => ({ id: result.outputId, ok: result.ok, durationFrames: result.film?.durationFrames, width: result.film?.width, height: result.film?.height })) }, null, 2));
    else {
      printDiagnostics(diagnostics, "");
      for (const result of results) if (result.ok) console.log(`${result.outputId}: ${result.film.width}×${result.film.height}, ${result.film.durationFrames} frames, ${result.film.scenes.length} scenes.`);
      console.log(ok ? "Film check passed. Text measured with real fonts is checked at render and review." : "Film check failed.");
    }
    process.exitCode = ok ? 0 : 1;
  } finally { await registry.close(); }
}
/** Stop before any render if the document cannot compile. Returns the ids to work on. */
async function preflight(registry) {
  const document = readDocument(), { selected, results } = checkOutputs(registry.film, document);
  for (const result of results) printDiagnostics(result.diagnostics, (result.outputId ?? "") + " ");
  if (!results.every(result => result.ok)) throw Error("Film check failed. Nothing was rendered.");
  return { document, selected, results };
}
async function refuseIfFailed(state, outputId) {
  if (!state.failed) return;
  printDiagnostics(state.diagnostics, outputId + " ");
  throw Error("The film failed its browser compile for output " + outputId + ".");
}
async function render() {
  const registry = await loadRegistry();
  let server;
  try {
    const { document, selected } = await preflight(registry);
    const dir = resolve(flags.out ?? join("dist/film", document.id));
    mkdirSync(dir, { recursive: true });
    let audioPath;
    if (document.audio) {
      const { compileFilm } = registry.film, compiled = compileFilm(document, { outputId: selected[0], accentKit: accentKit(document) }).film;
      const local = ref => isAbsolute(ref) ? ref : join(filmDir, ref);
      const manifest = registry.audio.createAudioMixManifest(compiled.audio);
      manifest.inputs = manifest.inputs.map(input => ({ ...input, assetRef: local(input.assetRef) }));
      const catalog = JSON.parse(readFileSync(join(ROOT, "assets/sound/catalog.json"), "utf8")), locate = sound => join(ROOT, "assets/sound", sound.path);
      for (const cue of document.audio.cues ?? []) {
        if (cue.room === undefined && cue.pan === undefined && cue.distance === undefined) continue;
        const input = manifest.inputs.find(item => item.id === `cue/${cue.id}/${cue.sound}`), kit = accentKit(document);
        const compiledCue = registry.design.compileSoundDesign({ id: cue.id, layers: [{ sound: kit.sounds[cue.sound].catalogId }], room: cue.room, position: { pan: cue.pan, distance: cue.distance } }, catalog, locate);
        if (input) input.assetRef = bakeCompiled(compiledCue, join(ROOT, "dist/sound-cache")).target;
      }
      for (const input of manifest.inputs) {
        // The local-path step above has already run, so look for the marker after the last separator.
        // A bed: catalog:<sound>:<frames>:<fade>:<low-pass>:<reverse>, and a scene's sound adds :<fade out>.
        const bed = /catalog:([a-z0-9-]+):(\d+):([\d.]+):(\d+):([01])(?::([\d.]+))?$/.exec(input.assetRef);
        if (!bed) continue;
        const durationSeconds = Number(bed[2]) * compiled.fps.den / compiled.fps.num, fadeIn = Number(bed[3]), fadeOut = bed[6] === undefined ? fadeIn : Number(bed[6]);
        // Two fades longer than the sound would overlap: share the length between them.
        const share = Math.min(1, durationSeconds / Math.max(1e-6, fadeIn + fadeOut));
        input.assetRef = bakeCompiled(registry.design.compileAmbience({ sound: bed[1], durationSeconds, fadeSeconds: fadeIn * share, fadeOutSeconds: fadeOut * share, lowpassHz: Number(bed[4]) || undefined, reverse: bed[5] === "1" }, catalog, locate), join(ROOT, "dist/sound-cache")).target;
      }
      const master = document.audio.master, narrated = manifest.inputs.some(item => item.kind === "narration");
      audioPath = join(dir, "mix.wav");
      await run("ffmpeg", ["-hide_banner", "-loglevel", "error", ...registry.audio.audioMixFfmpegArgs(manifest, audioPath, { duckDb: narrated ? master?.duckDb ?? (master ? 12 : 0) : 0, hitDuckDb: master?.hitDuckDb ?? 0 })]);
      const { MAX_LIMITING_DB, inspectMix, inspectMixChannels, limitingDb, masterFilter, masterGainDb } = registry.mastering, profile = master?.profile ?? "youtube";
      const raw = loudness(audioPath), gain = master ? masterGainDb(raw, profile, { limit: master.limit }) : 0, limited = master?.limit ? limitingDb(raw, gain, profile) : 0;
      if (limited > MAX_LIMITING_DB) throw Error(`The limiter would take ${limited} dB off the peaks, and the most it should take is ${MAX_LIMITING_DB} dB. Lower the loudest sound, or raise the bed.`);
      if (gain) {
        await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", audioPath, "-af", masterFilter(gain, profile, { limit: master.limit }), "-c:a", "pcm_s24le", "-bitexact", audioPath + ".master.wav"]);
        renameSync(audioPath + ".master.wav", audioPath);
      }
      const measure = loudness(audioPath), signal = inspectMixChannels(decodeChannels(audioPath), 48000);
      const problems = inspectMix(measure, signal, profile, { sparse: !manifest.inputs.some(item => item.kind !== "sound") }).filter(item => master || item.severity === "error" && item.code !== "mix-loudness" && item.code !== "mix-true-peak");
      writeFileSync(join(dir, "mix-report.json"), JSON.stringify({ profile: master?.profile ?? null, masterGainDb: gain, limitingDb: limited, ...measure, ...signal, problems }, null, 2) + "\n");
      console.log(`Mix: ${measure.integratedLufs} LUFS, ${measure.truePeakDbtp} dBTP, master gain ${gain} dB.`);
      for (const item of problems) console.log(`${item.severity.toUpperCase()} [${item.code}] ${item.message}`);
      if (problems.some(item => item.severity === "error")) throw Error("The mix failed its checks. See mix-report.json.");
    }
    // Just the mix: for checking sound without drawing a frame.
    if (flags["audio-only"] !== undefined) {
      if (!audioPath) throw Error("--audio-only needs a film with audio.");
      console.log(`Audio: ${audioPath}`);
      return;
    }
    server = await startFilmServer();
    const browser = await launch();
    try {
      for (const outputId of selected) {
        const state = await openFilm(browser, server.pageUrl(outputId));
        await state.page.close();
        await refuseIfFailed(state, outputId);
        const output = join(dir, outputId + ".mp4");
        await run(process.execPath, [join(ROOT, "scripts/export-video.mjs"), "--url=" + server.pageUrl(outputId), "--output=" + output,
          ...(state.manifest.preset ? ["--preset=" + state.manifest.preset] : []), ...(audioPath ? ["--audio=" + audioPath] : []),
          ...(flags.frames ? ["--frames=" + flags.frames] : []), ...(flags.browser ? ["--browser=" + flags.browser] : []), ...(flags.gl ? ["--gl=" + flags.gl] : [])]);
      }
    } finally { await browser.close(); }
  } finally { await server?.close(); await registry.close(); }
}
const SHEET_WIDTH = 3840;
const SEVERITY_COLOR = { error: "#ff5d5d", warning: "#ffc14d" };
const escapeHtml = text => String(text).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
/** Each scene's colour, from its review frames in order: the arc a grade follows through the film (a colour script). Transition frames
 * belong to two scenes and are left out. */
function colourScript(scenes, frames) {
  return scenes.map(scene => {
    const own = frames.filter(item => item.sceneId === scene.id && !item.transition && item.tone);
    const average = key => own.length ? own.reduce((sum, item) => sum + item.tone[key], 0) / own.length : 0;
    return { scene: scene.id, startFrame: scene.startFrame, endFrame: scene.endFrame, luminance: +average("luminance").toFixed(3), warmth: +average("warmth").toFixed(3),
      frames: own.map(item => ({ frame: item.frame, mean: item.tone.mean, luminance: +item.tone.luminance.toFixed(3), warmth: +item.tone.warmth.toFixed(3),
        palette: item.tone.palette.map(colour => ({ rgb: colour.rgb, share: +colour.share.toFixed(3) })) })) };
  });
}
/** The colour script as a strip: a band per scene, as wide as the scene is long; per review frame, its main colours stacked by share; and
 * the scene's light and warmth. */
function scriptHtml(script) {
  const bands = script.map(scene => `<div style="flex:${scene.endFrame - scene.startFrame} 1 0;min-width:0"><div style="display:flex;height:120px;border-radius:6px;overflow:hidden">${
    scene.frames.map(item => `<div style="flex:1;display:flex;flex-direction:column">${item.palette.map(colour => `<div style="flex:${colour.share} 1 0;background:rgb(${colour.rgb.join(",")})"></div>`).join("")}</div>`).join("")}</div>
    <div style="padding:8px 2px 0;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(scene.scene)} · light ${scene.luminance.toFixed(2)} · ${scene.warmth >= 0 ? "warm" : "cool"} ${Math.abs(scene.warmth).toFixed(2)}</div></div>`).join("");
  return `<section style="margin:0 0 36px"><h2 style="font-size:26px;margin:0 0 12px;color:#aab3c0">Colour script</h2><div style="display:flex;gap:10px">${bands}</div></section>`;
}
function sheetHtml(title, frames, portrait, script) {
  const cells = frames.map(item => {
    const worst = item.problems.some(problem => problem.severity === "error") ? "error" : item.problems.length ? "warning" : undefined;
    const counts = item.problems.reduce((all, problem) => ({ ...all, [problem.code]: (all[problem.code] ?? 0) + 1 }), {});
    const notes = Object.entries(counts).map(([code, count]) => `<li>${code}${count > 1 ? " ×" + count : ""}</li>`).join("");
    return `<figure style="margin:0;${worst ? `outline:3px solid ${SEVERITY_COLOR[worst]};` : ""}"><img src="data:image/jpeg;base64,${item.thumbnail.toString("base64")}" style="display:block;width:100%"/>
      <figcaption>${escapeHtml(item.sceneId)} · ${escapeHtml(item.label)} · f${item.frame}${notes ? `<ul>${notes}</ul>` : ""}</figcaption></figure>`;
  }).join("");
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:40px;background:#14171c;color:#e8ebf0;font:24px/1.4 system-ui,sans-serif;width:${SHEET_WIDTH - 80}px}
    h1{font-size:36px;margin:0 0 28px}main{display:grid;grid-template-columns:repeat(${portrait ? 6 : 3},1fr);gap:28px}figcaption{padding:10px 4px}ul{margin:4px 0 0;padding-left:26px;color:#ffc14d;font-size:21px}</style>
    <h1>${escapeHtml(title)}</h1>${script ? scriptHtml(script) : ""}<main>${cells}</main>`;
}
async function review() {
  const registry = await loadRegistry();
  let server;
  try {
    const { document, selected } = await preflight(registry);
    const dir = resolve(flags.out ?? join("dist/film-review", document.id));
    mkdirSync(join(dir, "frames"), { recursive: true });
    server = await startFilmServer();
    const browser = await launch(), report = { schemaVersion: 1, film: document.id, review: { status: "not-reviewed" }, outputs: [] };
    try {
      for (const outputId of selected) {
        const state = await openFilm(browser, server.pageUrl(outputId));
        await refuseIfFailed(state, outputId);
        const { page, manifest, reviewFrames, errors } = state, frames = [];
        await page.setViewportSize({ width: Math.max(1000, manifest.width + 40), height: Math.max(700, manifest.height + 40) });
        const capture = page.locator("[data-km-video-capture]");
        for (const item of reviewFrames) {
          await page.evaluate(frame => window.__kmVideoExport.seek(frame), item.frame);
          if (errors.length) throw Error("The browser reported: " + errors.join("; "));
          const still = join(dir, "frames", `${outputId}-f${String(item.frame).padStart(5, "0")}.png`);
          const shot = await capture.screenshot({ path: still, animations: "disabled", caret: "hide" });
          const { thumbnail, problems, content, tone } = await page.evaluate(([png, sceneId, audit, opening]) => window.__kmFilm.inspect(png, sceneId, audit, opening),
            [shot.toString("base64"), item.sceneId, !item.transition, reviewFrames.find(other => other.sceneId === item.sceneId && !other.transition) === item]);
          // Text still moving while it is meant to be read: the same lines three frames later, inside the same scene.
          const scene = (await page.evaluate(() => window.__kmFilm.scenes ?? [])).find(entry => entry.id === item.sceneId);
          if (!item.transition && scene && !scene.cameraMoves && item.frame + 3 < scene.endFrame) {
            const before = await page.evaluate(() => window.__kmFilm.textBoxes?.() ?? []);
            await page.evaluate(frame => window.__kmVideoExport.seek(frame), item.frame + 3);
            const after = await page.evaluate(() => window.__kmFilm.textBoxes?.() ?? []);
            problems.push(...await page.evaluate(([a, b]) => window.__kmFilm.movingText?.(a, b) ?? [], [before, after]));
          }
          frames.push({ ...item, still, thumbnail: Buffer.from(thumbnail, "base64"), problems, content, tone });
        }
        // Flash cuts and bursts: measure the light of every frame, and refuse more than three flashes in any second (WCAG 2.3.1).
        const flashProblems = [], rate = manifest.fps.num / manifest.fps.den;
        for (const window of await page.evaluate(() => window.__kmFilm.flashWindows ?? [])) {
          const light = [];
          for (let at = window.startFrame; at < window.endFrame; at++) {
            await page.evaluate(frame => window.__kmVideoExport.seek(frame), at);
            const png = await capture.screenshot({ animations: "disabled", caret: "hide" });
            light.push((await page.evaluate(([data, sceneId]) => window.__kmFilm.inspect(data, sceneId, false, false), [png.toString("base64"), window.sceneId])).tone.luminance);
          }
          const peak = await page.evaluate(([values, fps]) => window.__kmFilm.peakFlashes(values, fps), [light, rate]);
          if (peak > 3) flashProblems.push({ severity: "error", code: "flash-rate", text: `The light jumps ${peak} times a second into "${window.sceneId}" (frames ${window.startFrame}–${window.endFrame}); at most 3, for viewers with photosensitive epilepsy.` });
        }
        const script = colourScript(await page.evaluate(() => window.__kmFilm.scenes ?? []), frames);
        await page.close();
        const sheet = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: SHEET_WIDTH, height: 1200 } });
        await sheet.setContent(sheetHtml(`${document.id} · ${outputId} · ${manifest.width}×${manifest.height} · ${manifest.durationFrames} frames`, frames, manifest.height > manifest.width, script), { waitUntil: "load" });
        const contactSheet = join(dir, outputId + ".png");
        await sheet.screenshot({ path: contactSheet, fullPage: true });
        await sheet.close();
        report.outputs.push({ id: outputId, width: manifest.width, height: manifest.height, durationFrames: manifest.durationFrames, contactSheet, colourScript: script,
          compile: state.diagnostics, problems: flashProblems, frames: frames.map(({ frame, sceneId, label, transition, still, problems, content }) => ({ frame, sceneId, label, transition, still, content, problems })) });
      }
    } finally { await browser.close(); }
    // The questions a reviewer answers for each effect in the film, from the same guide that film:check uses.
    report.effects = document.scenes.flatMap(scene => [...scene.fx ?? [], ...scene.transition?.fx ? [scene.transition.fx] : []].filter(fx => SHADER_FX_GUIDE[fx.effect])
      .map(fx => ({ scene: scene.id, id: fx.id, effect: fx.effect, job: fx.job ?? null, questions: SHADER_FX_GUIDE[fx.effect].review })));
    writeFileSync(join(dir, "report.json"), JSON.stringify(report, null, 2) + "\n");
    const problems = report.outputs.flatMap(output => [...output.problems ?? [], ...output.frames.flatMap(frame => frame.problems)]);
    for (const problem of report.outputs.flatMap(output => output.problems ?? [])) console.log(`${problem.severity.toUpperCase()} [${problem.code}] ${problem.text}`);
    const failed = problems.filter(problem => problem.severity === "error").length;
    for (const output of report.outputs) console.log(`${output.id}: ${output.frames.length} frames, ${output.contactSheet}`);
    console.log(`${failed} error(s), ${problems.length - failed} warning(s). Report: ${join(dir, "report.json")}`);
    for (const fx of report.effects) console.log(`Check ${fx.scene}/${fx.id} (${fx.effect}${fx.job ? ", " + fx.job : ""}): ${fx.questions.join(" ")}`);
    console.log("Status: not reviewed. These checks cover geometry only. Look at each contact sheet before you accept the film.");
    process.exitCode = failed ? 1 : 0;
  } finally { await server?.close(); await registry.close(); }
}
/** Capture and audit exactly one compiled frame; no MP4 export, sound mix or contact sheet. */
async function frame() {
  if (flags.frame === undefined || !/^\d+$/.test(flags.frame) || !Number.isSafeInteger(Number(flags.frame)))
    throw Error("film:frame requires --frame=<nonnegative integer>");
  const target = Number(flags.frame);
  const registry = await loadRegistry();
  let server;
  try {
    const { document, selected, results } = await preflight(registry);
    const outputId = selected[0]; // only one output for fast iteration; --only chooses a different one
    const compiled = results.find(item => item.outputId === outputId)?.film;
    const selectedFrame = selectFilmFrame(compiled, target);
    const dir = resolve(flags.out ?? join("dist/film-frame", document.id));
    mkdirSync(dir, { recursive: true });
    server = await startFilmServer();
    const browser = await launch();
    try {
      const state = await openFilm(browser, server.pageUrl(outputId));
      try {
        await refuseIfFailed(state, outputId);
        const { page, manifest, errors } = state;
        await page.setViewportSize({ width: Math.max(1000, manifest.width + 40), height: Math.max(700, manifest.height + 40) });
        await page.evaluate(value => window.__kmVideoExport.seek(value), target);
        const image = join(dir, `${outputId}-f${String(target).padStart(5, "0")}.png`);
        const png = await page.locator("[data-km-video-capture]").screenshot({ path: image, animations: "disabled", caret: "hide" });
        if (errors.length) throw Error("The browser reported: " + errors.join("; "));
        const { problems, content } = await page.evaluate(([data, sceneId, audit, opening]) => window.__kmFilm.inspect(data, sceneId, audit, opening),
          [png.toString("base64"), selectedFrame.sceneId, !selectedFrame.transition, selectedFrame.opening]);
        const report = { schemaVersion: 1, film: document.id, review: { status: "not-reviewed" },
          output: { id: outputId, width: manifest.width, height: manifest.height, durationFrames: manifest.durationFrames },
          ...selectedFrame, image, problems, content: content ?? null };
        const reportPath = join(dir, `${outputId}-f${String(target).padStart(5, "0")}.json`);
        writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
        if (flags.format === "json") console.log(JSON.stringify({ ...report, reportPath }, null, 2));
        else {
          console.log(`${document.id}/${outputId} f${target}: ${image}`);
          console.log(`${problems.filter(item => item.severity === "error").length} error(s), ${problems.filter(item => item.severity !== "error").length} warning(s). Report: ${reportPath}`);
          console.log("Status: not reviewed. This audit cannot approve the film's visual quality.");
        }
        process.exitCode = problems.some(item => item.severity === "error") ? 1 : 0;
      } finally { await state.page.close(); }
    } finally { await browser.close(); }
  } finally { await server?.close(); await registry.close(); }
}
/** Largest colour-channel step that counts as the same pixel. GPU rounding can move a channel by one. */
const SEEK_TOLERANCE = 2;
/** Seek in a shuffled order, then capture each frame again on a fresh page. A frame must not depend on what came before it. */
async function seek() {
  const registry = await loadRegistry();
  let server;
  try {
    const { selected } = await preflight(registry);
    const order = (flags.frames ?? "80,4,80,160,4").split(",").map(Number), outputId = selected[0];
    server = await startFilmServer();
    const browser = await launch(), url = server.pageUrl(outputId);
    const count = page => page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext, seen = new WeakSet();
      window.__kmContexts = { created: 0, lost: 0 };
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        const context = original.call(this, kind, ...rest);
        if (/webgl/.test(kind) && context && !seen.has(this)) {
          seen.add(this); window.__kmContexts.created += 1;
          this.addEventListener("webglcontextlost", () => { window.__kmContexts.lost += 1; });
        }
        return context;
      };
    });
    const openCounted = async () => {
      const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1400, height: 900 } });
      await count(page);
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForFunction(() => window.__kmFilm?.failed || typeof window.__kmVideoExport?.seek === "function", null, { timeout: 120000 });
      const manifest = await page.evaluate(() => window.__kmVideoExport?.manifest);
      if (!manifest) throw Error("The film failed its browser compile.");
      await page.setViewportSize({ width: Math.max(1000, manifest.width + 40), height: Math.max(700, manifest.height + 40) });
      return { page, errors, capture: page.locator("[data-km-video-capture]") };
    };
    const shot = async ({ page, capture, errors }, frame) => {
      const started = performance.now();
      await page.evaluate(target => window.__kmVideoExport.seek(target), frame);
      const png = await capture.screenshot({ animations: "disabled", caret: "hide" });
      if (errors.length) throw Error("The browser reported: " + errors.join("; "));
      return { png, ms: performance.now() - started };
    };
    const compare = (page, a, b) => page.evaluate(async ([first, second]) => {
      const read = async source => {
        const image = new window.Image();
        image.src = "data:image/png;base64," + source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const [x, y] = await Promise.all([read(first), read(second)]);
      let largest = 0, differing = 0;
      for (let i = 0; i < x.length; i += 1) {
        const step = Math.abs(x[i] - y[i]);
        if (step > largest) largest = step;
        if (step > 2) differing += 1;
      }
      return { largest, differing };
    }, [a.toString("base64"), b.toString("base64")]);
    const session = await openCounted(), shots = [], first = new Map(), results = [];
    for (const frame of order) {
      const taken = await shot(session, frame);
      shots.push({ frame, ms: Math.round(taken.ms) });
      if (first.has(frame)) results.push({ frame, against: "earlier seek", ...await compare(session.page, first.get(frame), taken.png) });
      else first.set(frame, taken.png);
    }
    for (const [frame, png] of first) {
      const fresh = await openCounted(), taken = await shot(fresh, frame);
      results.push({ frame, against: "fresh page", ...await compare(session.page, png, taken.png) });
      await fresh.page.close();
    }
    const contexts = await session.page.evaluate(() => window.__kmContexts);
    await browser.close();
    const failed = results.filter(item => item.largest > SEEK_TOLERANCE);
    for (const item of results) console.log(`f${item.frame} against ${item.against}: largest channel step ${item.largest}, ${item.differing} channel values over the tolerance. ${item.largest > SEEK_TOLERANCE ? "DIFFERENT" : "same"}`);
    console.log(`Seek order ${order.join(", ")}: ${shots.map(item => item.ms + " ms").join(", ")}. WebGL contexts created ${contexts.created}, lost ${contexts.lost}.`);
    console.log(failed.length ? `Seek check failed for ${failed.length} comparison(s).` : "Seek check passed.");
    process.exitCode = failed.length ? 1 : 0;
  } finally { await server?.close(); await registry.close(); }
}
/** A valid film around one example scene. Inline SVG assets become real files, so the JSON stays short. */
function exampleFilm(id, examples) {
  const assets = {};
  const extract = value => {
    if (Array.isArray(value)) return value.map(extract);
    if (!value || typeof value !== "object") return value;
    const out = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, extract(item)]));
    if (typeof out.src === "string" && out.src.startsWith("data:image/svg+xml")) {
      assets[out.id + ".svg"] = decodeURIComponent(out.src.slice(out.src.indexOf(",") + 1));
      out.src = "assets/" + out.id + ".svg";
    }
    return out;
  };
  const story = id === "object-story", spec = story ? examples.OBJECT_STORY_EXAMPLE : examples.DEMO_SCENES[id];
  const { fps, durationFrames, cueFrames, accent, objects, beats } = spec;
  const content = story ? { objects, beats } : extract(spec.content);
  const film = { schemaVersion: 1, id: "example-" + id, fps, outputs: [{ id: "landscape", preset: "youtube" }],
    scenes: [{ id: "scene-1", recipeId: id, durationFrames, cueFrames, accent, content }] };
  return { film, assets };
}
async function example() {
  const registry = await loadRegistry();
  try {
    const ids = ["object-story", ...registry.examples.SCENE_IDS];
    if (flags.list) { console.log(ids.join("\n")); return; }
    if (!ids.includes(flags.recipe)) throw Error(`No portable example for "${flags.recipe}". It needs real media; read its catalog entry instead. Portable examples: ${ids.join(", ")}.`);
    const { film, assets } = exampleFilm(flags.recipe, registry.examples);
    if (!flags.out) { console.log(JSON.stringify(film, null, 2)); return; }
    const dir = resolve(flags.out), path = join(dir, flags.recipe + ".film.json");
    mkdirSync(join(dir, "assets"), { recursive: true });
    for (const [name, text] of Object.entries(assets)) writeFileSync(join(dir, "assets", name), text);
    writeFileSync(path, JSON.stringify(film, null, 2) + "\n");
    console.log("Wrote " + path + " and " + Object.keys(assets).length + " asset(s).");
  } finally { await registry.close(); }
}
await ({ check, render, review, frame, seek, example })[command]();
// Vite and Playwright can hold the loop open. The work is done, so keep the exit code that it set.
process.exit();
