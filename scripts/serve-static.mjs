#!/usr/bin/env node
/** Local static server for a built Storybook (or any folder), with HTTP Range support. Chrome cannot seek inside an
 * MP4 served without Range requests, so plain `python -m http.server` breaks footage verification.
 * node scripts/serve-static.mjs <directory> [port]   (binds 127.0.0.1 only; default port 6007)
 */
import { createServer } from "node:http";
import { statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { serveFile } from "./serve-file.mjs";

const root = resolve(process.argv[2] ?? "");
const port = Number(process.argv[3] ?? 6007);
if (!process.argv[2]) throw new Error("Usage: node scripts/serve-static.mjs <directory> [port]");

createServer((req, res) => {
  const requested = normalize(join(root, decodeURIComponent(new URL(req.url, "http://localhost").pathname)));
  if (!requested.startsWith(root)) { res.writeHead(403).end(); return; }
  let file = requested;
  try { if (statSync(file).isDirectory()) file = join(file, "index.html"); statSync(file); } catch { res.writeHead(404).end(); return; }
  serveFile(req, res, file);
}).listen(port, "127.0.0.1", () => process.stdout.write("Serving " + root + " at http://127.0.0.1:" + port + " (Range supported)\n"));
