#!/usr/bin/env node
/* global window */
/** Automated film path: one JSON file in, checked and reviewable video out.
 *   npm run film:check  -- <file.film.json> [--format=json]        No browser. Reports every problem with a JSON path.
 *   npm run film:render -- <file> [--only=<output id>] [--out=<dir>] [--browser=chrome] [--frames=<n>]
 *   npm run film:review -- <file> [--only=<output id>] [--out=<dir>]   Contact sheets and a rendered-text report.
 *   npm run film:example -- --recipe=<id> [--out=<dir>] | --list
 * Requires Playwright Chromium, and for render ffmpeg and ffprobe on PATH.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import { serveFile } from "./serve-file.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMMANDS = new Set(["check", "render", "review", "example"]);
const [command, ...rest] = process.argv.slice(2);
if (!COMMANDS.has(command)) throw Error("Usage: scripts/film.mjs check|render|review|example ...");
const flags = {}, files = [];
for (const arg of rest) {
  const match = /^--(format|only|out|browser|frames|recipe)=(.+)$/.exec(arg);
  if (match) flags[match[1]] = match[2];
  else if (arg === "--list") flags.list = true;
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
  return { film: await load("/registry/video/film-document.ts"), audio: await load("/registry/video/audio-visual-cue.ts"), examples: await load("/registry/video/scene-template-examples.ts"), close: () => server.close() };
}
/** Serve the capture page, plus the film file and the folder around it at /__film/. */
async function startFilmServer() {
  const server = await createServer({ ...viteBase, logLevel: "error", plugins: [react(), tailwindcss(), {
    name: "kumiki-film-files",
    configureServer(vite) {
      vite.middlewares.use("/__film", (req, res) => {
        const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
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
  const results = selected.map(outputId => ({ outputId, ...filmModule.compileFilm(document, { outputId }) }));
  return { selected, results };
}
function readDocument() {
  try { return JSON.parse(readFileSync(filmPath, "utf8")); }
  catch (error) { throw Error("Cannot read " + filmPath + ": " + error.message); }
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
const launch = () => chromium.launch({ headless: true, ...(flags.browser === "chrome" ? { channel: "chrome" } : {}),
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
  return { document, selected };
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
      const { compileFilm } = registry.film, compiled = compileFilm(document, { outputId: selected[0] }).film;
      const local = ref => isAbsolute(ref) ? ref : join(filmDir, ref);
      const manifest = registry.audio.createAudioMixManifest(compiled.audio);
      manifest.inputs = manifest.inputs.map(input => ({ ...input, assetRef: local(input.assetRef) }));
      audioPath = join(dir, "mix.wav");
      await run("ffmpeg", ["-hide_banner", "-loglevel", "error", ...registry.audio.audioMixFfmpegArgs(manifest, audioPath)]);
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
          ...(flags.frames ? ["--frames=" + flags.frames] : []), ...(flags.browser ? ["--browser=" + flags.browser] : [])]);
      }
    } finally { await browser.close(); }
  } finally { await server?.close(); await registry.close(); }
}
const SEVERITY_COLOR = { error: "#ff5d5d", warning: "#ffc14d" };
const escapeHtml = text => String(text).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
function sheetHtml(title, frames, portrait) {
  const cells = frames.map(item => {
    const worst = item.problems.some(problem => problem.severity === "error") ? "error" : item.problems.length ? "warning" : undefined;
    const notes = item.problems.slice(0, 3).map(problem => `<li>${problem.code}: ${escapeHtml(problem.text.slice(0, 48))}</li>`).join("");
    return `<figure style="margin:0;${worst ? `outline:3px solid ${SEVERITY_COLOR[worst]};` : ""}"><img src="data:image/jpeg;base64,${item.image.toString("base64")}" style="display:block;width:100%"/>
      <figcaption>${escapeHtml(item.sceneId)} · ${escapeHtml(item.label)} · f${item.frame}${notes ? `<ul>${notes}</ul>` : ""}</figcaption></figure>`;
  }).join("");
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#14171c;color:#e8ebf0;font:15px/1.4 system-ui,sans-serif;width:${portrait ? 1680 : 2000}px}
    h1{font-size:22px;margin:0 0 16px}main{display:grid;grid-template-columns:repeat(${portrait ? 6 : 4},1fr);gap:14px}figcaption{padding:6px 2px}ul{margin:4px 0 0;padding-left:18px;color:#ffc14d;font-size:13px}</style>
    <h1>${escapeHtml(title)}</h1><main>${cells}</main>`;
}
async function review() {
  const registry = await loadRegistry();
  let server;
  try {
    const { document, selected } = await preflight(registry);
    const dir = resolve(flags.out ?? join("dist/film-review", document.id));
    mkdirSync(dir, { recursive: true });
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
          const image = await capture.screenshot({ type: "jpeg", quality: 82, animations: "disabled", caret: "hide" });
          const problems = item.transition ? [] : await page.evaluate(() => window.__kmFilm.audit());
          frames.push({ ...item, image, problems });
        }
        await page.close();
        const sheet = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 2048, height: 1200 } });
        await sheet.setContent(sheetHtml(`${document.id} · ${outputId} · ${manifest.width}×${manifest.height} · ${manifest.durationFrames} frames`, frames, manifest.height > manifest.width), { waitUntil: "load" });
        const contactSheet = join(dir, outputId + ".png");
        await sheet.screenshot({ path: contactSheet, fullPage: true });
        await sheet.close();
        report.outputs.push({ id: outputId, width: manifest.width, height: manifest.height, durationFrames: manifest.durationFrames, contactSheet,
          compile: state.diagnostics, frames: frames.map(({ frame, sceneId, label, transition, problems }) => ({ frame, sceneId, label, transition, problems })) });
      }
    } finally { await browser.close(); }
    writeFileSync(join(dir, "report.json"), JSON.stringify(report, null, 2) + "\n");
    const problems = report.outputs.flatMap(output => output.frames.flatMap(frame => frame.problems));
    const failed = problems.filter(problem => problem.severity === "error").length;
    for (const output of report.outputs) console.log(`${output.id}: ${output.frames.length} frames, ${output.contactSheet}`);
    console.log(`${failed} text error(s), ${problems.length - failed} warning(s). Report: ${join(dir, "report.json")}`);
    console.log("Status: not reviewed. These checks cover geometry only. Look at each contact sheet before you accept the film.");
    process.exitCode = failed ? 1 : 0;
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
await ({ check, render, review, example })[command]();
// Vite and Playwright can hold the loop open. The work is done, so keep the exit code that it set.
process.exit();
