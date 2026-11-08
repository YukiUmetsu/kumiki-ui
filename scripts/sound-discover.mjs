#!/usr/bin/env node
/** Find a sound: the local catalog first, then Openverse, an index of openly licensed audio.
 *   npm run sound:discover -- "rain on a window" [--license=cc0] [--limit=8] [--draft=<manifest.json>] [--format=json] [--offline]
 * The catalog answers first, because its sounds are already verified and measured. Openverse is asked once per run, and answers are
 * cached for a day, because anonymous use is rate limited. Set OPENVERSE_TOKEN to use a registered key. Nothing is downloaded.
 *
 * An index is not proof of a licence. `--draft` writes candidates in the shape `sound:import --recordings` reads, each marked
 * `verified: false` with its source page. Read the licence there, download the original file, fill in `file`, `seek` and `length`,
 * and set `verified: true`; the importer refuses any entry that is not verified.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const args = process.argv.slice(2), query = args.filter(arg => !arg.startsWith("--")).join(" ").trim();
const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const license = (flag("license") ?? "cc0").toLowerCase(), limit = Math.min(20, Math.max(1, Number(flag("limit") ?? 8))), json = flag("format") === "json";
if (!query) { console.error('Usage: npm run sound:discover -- "rain on a window" [--license=cc0] [--limit=8] [--draft=<manifest.json>] [--format=json] [--offline]'); process.exit(1); }
if (!/^[a-z0-9,-]+$/.test(license)) { console.error("--license takes Openverse licence codes, such as cc0 or by."); process.exit(1); }

// 1. The local catalog, through the same search an agent uses.
const { createServer } = await import("vite");
const root = resolve(import.meta.dirname, ".."), server = await createServer({ root, configFile: false, logLevel: "error", server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
let local = [];
try {
  const { findSounds } = await server.ssrLoadModule("/registry/video/sound-design.ts");
  const catalog = JSON.parse(readFileSync(join(root, "assets/sound/catalog.json"), "utf8"));
  // Low scores come from small shared words; only a real match is worth showing ahead of the index.
  local = findSounds(catalog, query, { limit: 5 }).filter(({ score }) => score >= 4).map(({ sound, score }) => ({ id: sound.id, score: Number(score.toFixed(1)), origin: sound.origin, licenseId: sound.licenseId, description: sound.description }));
} finally { await server.close(); }

// 2. Openverse, once, with a day's cache.
let remote = [], note = "";
if (!args.includes("--offline")) {
  const url = `https://api.openverse.org/v1/audio/?${new URLSearchParams({ q: query, license, page_size: String(limit) })}`;
  const cacheDir = join(tmpdir(), "kumiki-openverse"), cache = join(cacheDir, createHash("sha256").update(url).digest("hex").slice(0, 16) + ".json");
  mkdirSync(cacheDir, { recursive: true });
  let body;
  if (existsSync(cache) && Date.now() - statSync(cache).mtimeMs < 864e5) { body = JSON.parse(readFileSync(cache, "utf8")); note = "cached"; }
  else {
    const headers = { "User-Agent": "kumiki-ui-sound-discover/1.0", ...(process.env.OPENVERSE_TOKEN ? { Authorization: `Bearer ${process.env.OPENVERSE_TOKEN}` } : {}) };
    const response = await fetch(url, { headers }).catch(error => ({ ok: false, status: 0, statusText: error.message }));
    if (response.ok) { body = await response.json(); writeFileSync(cache, JSON.stringify(body)); }
    else note = response.status === 429 ? "Openverse rate limit reached; try later or set OPENVERSE_TOKEN." : `Openverse did not answer (${response.status} ${response.statusText}).`;
  }
  remote = (body?.results ?? []).map(item => ({ title: item.title, creator: item.creator, license: `${item.license} ${item.license_version ?? ""}`.trim(), licenseUrl: item.license_url,
    sourcePage: item.foreign_landing_url, provider: item.source ?? item.provider, seconds: item.duration ? Math.round(item.duration / 100) / 10 : null, filetype: item.filetype }));
}

const result = { schemaVersion: 1, query, license, local, remote, note: note || undefined,
  warning: "Openverse is an index, not proof of a licence. Read the licence on each source page before using a sound." };
const draft = flag("draft");
if (draft) {
  const slug = text => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const entries = remote.map(item => ({ id: slug(item.title || "sound"), verified: false, file: "", seek: 0, length: 0, tags: query.toLowerCase().split(/\s+/).filter(Boolean),
    description: item.title, sourceUrl: item.sourcePage, author: item.creator, licenseSeenInIndex: item.license, licenseUrl: item.licenseUrl,
    toDo: "Read the licence on sourceUrl. Download the original file, set file, seek and length, then set verified to true." }));
  writeFileSync(resolve(draft), JSON.stringify(entries, null, 2) + "\n");
  result.draft = resolve(draft);
}
if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(local.length ? `In the catalog (verified, ready to use):` : "Nothing in the catalog matches.");
  for (const item of local) console.log(`  ${String(item.score).padStart(5)}  ${item.id.padEnd(24)} ${item.origin.padEnd(11)} ${item.description}`);
  if (note) console.log(note);
  if (remote.length) {
    console.log(`\nOpenverse (${license}, unverified):`);
    for (const item of remote) console.log(`  ${(item.title ?? "").slice(0, 40).padEnd(40)} ${String(item.seconds ?? "?").padStart(6)} s  ${item.license.padEnd(9)} ${item.creator ?? ""}\n    ${item.sourcePage}`);
    console.log(`\n${result.warning}`);
  }
  if (result.draft) console.log(`Draft manifest: ${result.draft}`);
}
