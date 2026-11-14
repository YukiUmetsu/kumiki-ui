#!/usr/bin/env node
/** Writes the editorial-collage showcase film as portable FD1 JSON from its TypeScript builders.
 *   node scripts/collage-film-export.mjs [--film=paper|archive] [--out=<file>] [--check]
 * `paper` (default) is the paper-puppet film; `archive` is the real-photo registers film.
 * `--draft` halves the output sizes for quick review renders (scenes scale through their viewBox).
 * `--check` fails when the committed JSON differs from what the builders produce. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const FILMS = { paper: "examples/film/editorial-collage.film.json", archive: "examples/film/editorial-collage-archive.film.json" };
const which = args.film ?? "paper";
if (!(which in FILMS)) throw new Error("--film must be paper or archive");
const out = resolve(ROOT, args.out ?? FILMS[which]);
const server = await createServer({ configFile: false, root: ROOT, logLevel: "error", appType: "custom", cacheDir: "node_modules/.vite-film",
  server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
try {
  const { collageFilm } = await server.ssrLoadModule("/src/video/collage-film.ts");
  const { inspectCollageScene } = await server.ssrLoadModule("/registry/video/collage/collage-scene.ts");
  const archive = which === "archive" ? await server.ssrLoadModule("/src/video/collage-photo-registers.ts") : undefined;
  const film = archive ? collageFilm(archive.PHOTO_REGISTER_SHOTS, {}, { id: "editorial-collage-archive", tears: archive.PHOTO_REGISTER_TEARS }) : collageFilm();
  if (args.draft) film.outputs = film.outputs.map(o => ({ ...o, width: o.width / 2, height: o.height / 2 }));
  for (const scene of film.scenes) for (const key of ["scenes", "from", "to"]) for (const [aspect, spec] of Object.entries(scene.content.props[key] ?? {})) {
    const errors = inspectCollageScene(spec);
    if (errors.length) throw new Error(`${scene.id}/${key}/${aspect}: ${errors.join("; ")}`);
  }
  const json = JSON.stringify(film) + "\n";
  if (args.check) {
    if (readFileSync(out, "utf8") !== json) { console.error(out + " is stale: run node scripts/collage-film-export.mjs"); process.exitCode = 1; }
    else console.log(out + " is current");
  } else { writeFileSync(out, json); console.log("wrote " + out + " (" + Math.round(json.length / 1024) + " KB)"); }
} finally { await server.close(); }
