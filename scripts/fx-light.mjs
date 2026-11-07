#!/usr/bin/env node
/** Find the light in a photograph, and the god-rays origin that puts rays on it.
 *   npm run fx:light -- <photo> [--aspect=16:9] [--format=json]
 * Rays with no source in the picture look like a filter. This reads the picture with FFmpeg, finds its brightest area as the frame
 * will show it, and prints `originX` and `originY` for a `god-rays` effect. A strength under 1.4 means the picture has no clear light.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { findLightSource, rayOrigin } from "../registry/video/shader-fx-moments.ts";

const args = process.argv.slice(2), file = args.find(arg => !arg.startsWith("--"));
const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1];
if (!file || !existsSync(file)) { console.error("Usage: npm run fx:light -- <photo> [--aspect=16:9] [--format=json]"); process.exit(1); }
const [aw, ah] = (flag("aspect") ?? "16:9").split(":").map(Number);
if (!(aw > 0 && ah > 0)) { console.error("--aspect must look like 16:9 or 9:16."); process.exit(1); }
const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
const [iw, ih] = probe.stdout.trim().split(",").map(Number);
if (!(iw > 0 && ih > 0)) { console.error("FFmpeg could not read " + file); process.exit(1); }
const width = 320, height = Math.max(1, Math.round(width * ih / iw));
const raw = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${width}:${height}`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 26 }).stdout;
const aspect = aw / ah, light = findLightSource(raw, width, height, aspect), origin = rayOrigin(light.x, light.y, aspect), clear = light.strength >= 1.4;
if (flag("format") === "json") console.log(JSON.stringify({ schemaVersion: 1, file, aspect: `${aw}:${ah}`, light, origin, clear }, null, 2));
else {
  console.log(`Light at ${Math.round(light.x * 100)}% across, ${Math.round(light.y * 100)}% down, strength ${light.strength}${clear ? "" : ": no clear light, so rays may look fake"}.`);
  console.log(`god-rays params: { "originX": ${origin.originX}, "originY": ${origin.originY} }`);
}
