#!/usr/bin/env node
/** Local static server for a built Storybook (or any folder), with HTTP Range support. Chrome cannot seek inside an
 * MP4 served without Range requests, so plain `python -m http.server` breaks footage verification.
 * node scripts/serve-static.mjs <directory> [port]   (binds 127.0.0.1 only; default port 6007)
 */
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "");
const port = Number(process.argv[3] ?? 6007);
if (!process.argv[2]) throw new Error("Usage: node scripts/serve-static.mjs <directory> [port]");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".mp4": "video/mp4", ".webm": "video/webm", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };

createServer((req, res) => {
  const requested = normalize(join(root, decodeURIComponent(new URL(req.url, "http://localhost").pathname)));
  if (!requested.startsWith(root)) { res.writeHead(403).end(); return; }
  let file = requested;
  try { if (statSync(file).isDirectory()) file = join(file, "index.html"); statSync(file); } catch { res.writeHead(404).end(); return; }
  const type = types[extname(file)] ?? "application/octet-stream";
  const size = statSync(file).size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] !== "" || range[2] !== "")) {
    const start = range[1] === "" ? Math.max(0, size - Number(range[2])) : Number(range[1]);
    const end = range[1] !== "" && range[2] !== "" ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { "Content-Range": `bytes */${size}` }).end(); return; }
    res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": size });
    createReadStream(file).pipe(res);
  }
}).listen(port, "127.0.0.1", () => process.stdout.write("Serving " + root + " at http://127.0.0.1:" + port + " (Range supported)\n"));
