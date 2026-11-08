#!/usr/bin/env node
/** An ad brief in, a checked film document out.
 *   npm run film:ad -- <brief.ad.json> [--out=<file.film.json>] [--format=json]
 * The brief names a format (hook-body-close, problem-solution, before-after, three-reasons, myth-vs-fact, social-proof), the brand
 * with its call to action, the hook and the format's own fields. The film is written next to the brief unless --out is given, then
 * checked as `film:check` would check it. Review and render it with `film:review` and `film:render`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flags = {}, files = [];
for (const arg of process.argv.slice(2)) {
  const match = /^--(out|format)=(.+)$/.exec(arg);
  if (match) flags[match[1]] = match[2];
  else if (arg.startsWith("--")) throw Error("Unknown flag: " + arg);
  else files.push(arg);
}
if (files.length !== 1) throw Error("Usage: npm run film:ad -- <brief.ad.json> [--out=<file.film.json>] [--format=json]");
const briefPath = resolve(files[0]);
const out = resolve(flags.out ?? briefPath.replace(/(\.ad)?\.json$/, "") + ".film.json");

const server = await createServer({ configFile: false, root: ROOT, cacheDir: "node_modules/.vite-film", logLevel: "error", appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false, fs: { strict: false } }, optimizeDeps: { noDiscovery: true } });
try {
  const { compileAdBrief } = await server.ssrLoadModule("/registry/video/ad-formats.ts");
  const { compileFilm } = await server.ssrLoadModule("/registry/video/film-document.ts");
  const brief = JSON.parse(readFileSync(briefPath, "utf8"));
  const result = compileAdBrief(brief);
  const diagnostics = [...result.problems.map(p => ({ ...p, path: "brief" + p.path }))];
  if (result.ok) {
    writeFileSync(out, JSON.stringify(result.film, null, 2) + "\n");
    for (const output of result.film.outputs) {
      const compiled = compileFilm(result.film, { outputId: output.id });
      diagnostics.push(...compiled.diagnostics.map(d => ({ ...d, output: output.id })));
    }
  }
  const errors = diagnostics.filter(d => d.severity === "error").length;
  if (flags.format === "json") console.log(JSON.stringify({ ok: result.ok && !errors, film: result.ok ? out : undefined, diagnostics }, null, 2));
  else {
    for (const d of diagnostics) console.log(`${d.severity === "error" ? "error" : "warn "} ${d.code}${d.output ? ` [${d.output}]` : ""} ${d.path}: ${d.message}${d.hint ? `\n      ${d.hint}` : ""}`);
    if (result.ok) {
      const seconds = result.film.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0) / (result.film.fps.num / result.film.fps.den);
      console.log(`${errors ? "Wrote, with errors" : "Wrote"} ${relative(process.cwd(), out)}: ${result.film.scenes.length} scenes, ${seconds.toFixed(1)} s, ${result.film.outputs.map(o => o.id).join(", ")}.`);
      console.log(`Next: npm run film:review -- ${relative(process.cwd(), out)} --only=${result.film.outputs[0].id}`);
    } else console.log("No film: fix the brief.");
  }
  process.exitCode = errors ? 1 : 0;
} finally { await server.close(); }
