#!/usr/bin/env node
/** Bake every hero asset's sculpt meshes into one binary cache (no runtime sculpting).
 *
 *   npm run hero:bake                                   → dist/hero-sculpts.bin
 *   npm run hero:bake -- --out=public/hero-sculpts.bin --version=2026-10-19 --kinds=bull-market,bank
 *
 * Then in the app: `await loadBakedSculpts("/hero-sculpts.bin", "2026-10-19")` before mounting.
 * Re-bake whenever asset code changes (the version string guards against stale files).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const m = /^--([a-z]+)=(.*)$/.exec(arg);
  if (!m) throw new Error("Unexpected argument " + arg + ". Use --name=value.");
  return [m[1], m[2]];
}));
const out = resolve(args.out ?? "dist/hero-sculpts.bin");
const version = args.version ?? new Date().toISOString().slice(0, 10);
const root = resolve(".");
const work = await mkdtemp(join(tmpdir(), "kumiki-bake-"));
try {
  const entry = join(work, "entry.ts");
  await writeFile(entry, `
    import { heroCatalog } from ${JSON.stringify(join(root, "registry/domains/hero-catalog.ts"))};
    import { serializeSculptCache } from ${JSON.stringify(join(root, "registry/craft/sdf-sculpt.ts"))};
    export function bake(kinds: string[] | null, version: string) {
      const log: string[] = [];
      for (const e of heroCatalog()) {
        if (kinds && !kinds.includes(e.kind)) continue;
        const finishes = e.finishes?.length ? e.finishes : [undefined];
        for (const finish of finishes) {
          const t = performance.now();
          e.create({ id: "bake-" + e.kind, finish }).dispose();
          log.push(e.kind + (finish ? " (" + finish + ")" : "") + " " + Math.round(performance.now() - t) + " ms");
        }
      }
      return { buffer: serializeSculptCache(version), log };
    }`);
  const bundle = join(work, "bake.mjs");
  await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: bundle, logLevel: "error" });
  const { bake } = await import(pathToFileURL(bundle).href);
  const { buffer, log } = bake(args.kinds ? args.kinds.split(",") : null, version);
  for (const line of log) console.log("sculpted " + line);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, new Uint8Array(buffer));
  console.log(`wrote ${out} (${(buffer.byteLength / 1e6).toFixed(1)} MB, version ${version})`);
} finally { await rm(work, { recursive: true, force: true }); }
