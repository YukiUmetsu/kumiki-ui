#!/usr/bin/env node
/* global process, Buffer, URL */
/** Convert a Microsoft Rocketbox avatar (MIT) to an optimized, animated GLB for `loadGltfHero`.
 *
 * Usage: node scripts/people/rocketbox-to-glb.mjs <srcDir> <config.json> <out.glb>
 *   srcDir   a downloaded avatar folder (Export/*.fbx, Textures/*.tga) plus any clip .fbx files
 *   config   avatar FBX, texture dir, texture size, roughness ranges and clips (see female-adult-01.json)
 *
 * Runs three's FBXLoader/TGALoader/GLTFExporter in headless Chromium (no extra dependencies):
 * Phong → PBR (specular remapped to roughness, metalness 0), alpha-cutout hair/lash atlas,
 * textures downscaled and re-encoded (JPEG opaque, PNG cutout), vertex colors and authoring
 * lights dropped, centimetres → metres, clips retargeted by bone name (rotations + root translation).
 * Record every output in assets/THIRD_PARTY_ASSETS.json.
 */
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const [srcDir, configFile, outFile] = process.argv.slice(2);
if (!outFile) throw new Error("Usage: rocketbox-to-glb.mjs <srcDir> <config.json> <out.glb>");
const three = fileURLToPath(new URL("../../node_modules/three/", import.meta.url));
const pageModule = fileURLToPath(new URL("./rocketbox-page.mjs", import.meta.url));
const config = JSON.parse(await readFile(configFile, "utf8"));

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", e => process.stdout.write(`[pageerror] ${e.message}\n`));
  await page.route("http://convert.local/**", async route => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path === "/") return route.fulfill({ contentType: "text/html",
      body: `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>` });
    const file = path === "/run.mjs" ? pageModule : path.startsWith("/three/") ? join(three, path.slice(7)) : join(resolve(srcDir), path.slice(5));
    try { return route.fulfill({ body: await readFile(file), contentType: extname(file) === ".js" || extname(file) === ".mjs" ? "text/javascript" : "application/octet-stream" }); }
    catch { return route.fulfill({ status: 404, body: "" }); }
  });
  await page.goto("http://convert.local/");
  await page.exposeFunction("saveBytes", (_name, b64) => writeFile(outFile, Buffer.from(b64, "base64")));
  const report = await page.evaluate(async args => (await import("/run.mjs")).default(args), { ...config, out: outFile });
  process.stdout.write(JSON.stringify(report, null, 1) + "\n");
} finally { await browser.close(); }
