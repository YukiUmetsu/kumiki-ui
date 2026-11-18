#!/usr/bin/env node
/* global window */
/** Bake the original stock horse (registry/craft/horse-3d.ts) to a rigged, animated GLB.
 *
 *   node scripts/horse-glb.mjs                       → assets/models/animals/stock-horse-bay.glb
 *   node scripts/horse-glb.mjs --coat=grey --quality=hero --out=public/horse.glb
 *   node scripts/horse-glb.mjs --part=gear           → assets/models/animals/western-gear.glb (tack@trunk, tack@head, cowboy-hat)
 *
 * The clip "gallop" is one stride baked at 120 fps (51 keys, the last equal to the first, so it loops
 * cleanly); "stand" is baked at 30 fps. Gait metadata (stride length and frequency, footfalls, hoof bones
 * and sole contact points) is written to the scene's glTF `extras` as `kumikiGait`.
 * Runs three's GLTFExporter in headless Chromium, because the eye textures are painted on a canvas.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const m = /^--([a-z]+)=(.*)$/.exec(arg);
  if (!m) throw new Error("Unexpected argument " + arg + ". Use --name=value.");
  return [m[1], m[2]];
}));
const coat = args.coat ?? "bay", quality = args.quality ?? "supporting", part = args.part ?? "horse";
const out = resolve(args.out ?? (part === "gear" ? "assets/models/animals/western-gear.glb" : `assets/models/animals/stock-horse-${coat}.glb`));
const root = resolve(".");
const work = await mkdtemp(join(tmpdir(), "kumiki-horse-"));
try {
  const entry = join(work, "entry.ts");
  await writeFile(entry, `
    import { createStockHorse } from ${JSON.stringify(join(root, "registry/craft/horse-3d.ts"))};
    import { HORSE_GALLOP_DEFAULTS, HORSE_HOOF_CONTACT, HORSE_LEGS } from ${JSON.stringify(join(root, "registry/craft/horse-gallop.ts"))};
    import { bakeHeroActionClip } from ${JSON.stringify(join(root, "registry/craft/hero-gltf.ts"))};
    import { createCowboyHat, createWesternTack } from ${JSON.stringify(join(root, "registry/craft/western-tack.ts"))};
    import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
    const toBase64 = buffer => {
      const bytes = new Uint8Array(buffer);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    export async function bakeGear() {
      const t0 = performance.now();
      const tack = createWesternTack(), hat = createCowboyHat();
      tack.group.add(hat.group);
      const glb = await new GLTFExporter().parseAsync(tack.group, { binary: true, onlyVisible: false });
      let tris = 0;
      const per = []; tack.group.traverse(o => { if (o.isMesh) { tris += o.geometry.index.count / 3; per.push(o.name + " " + o.geometry.index.count / 3); } });
      tack.dispose(); hat.dispose();
      return { b64: toBase64(glb), sculptMs: Math.round(performance.now() - t0), tris, clips: per };
    }
    export async function bake(coat, quality) {
      const t0 = performance.now();
      const horse = createStockHorse({ coat, quality });
      const sculptMs = Math.round(performance.now() - t0);
      const animations = [bakeHeroActionClip(horse, "gallop", 120), bakeHeroActionClip(horse, "stand", 30)];
      // glTF has no bone-name convention: name the clip tracks by node name, not uuid.
      const byUuid = new Map();
      horse.group.traverse(o => byUuid.set(o.uuid, o.name));
      for (const clip of animations) for (const track of clip.tracks) {
        const [uuid, prop] = track.name.split(".");
        track.name = byUuid.get(uuid) + "." + prop;
      }
      horse.pose({ id: null, frame: 0 });
      horse.group.userData.kumikiGait = {
        clip: "gallop", strideLength: HORSE_GALLOP_DEFAULTS.strideLength, strideFrequency: HORSE_GALLOP_DEFAULTS.strideFrequency,
        footfalls: HORSE_GALLOP_DEFAULTS.footfalls, dutyFore: HORSE_GALLOP_DEFAULTS.dutyFore, dutyHind: HORSE_GALLOP_DEFAULTS.dutyHind,
        hooves: Object.fromEntries(HORSE_LEGS.map(leg => [leg, leg + "-hoof"])), contact: HORSE_HOOF_CONTACT,
        units: "metres, +X forward, +Y up, -Z the near (left) side",
      };
      const glb = await new GLTFExporter().parseAsync(horse.group, { binary: true, animations, onlyVisible: false });
      let tris = 0;
      horse.group.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
      horse.dispose();
      return { b64: toBase64(glb), sculptMs, tris, clips: animations.map(c => c.name + " " + c.duration.toFixed(3) + " s, " + c.tracks.length + " tracks") };
    }`);
  const bundle = await build({ entryPoints: [entry], bundle: true, format: "iife", globalName: "HorseBake", write: false, logLevel: "error",
    nodePaths: [join(root, "node_modules")] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on("pageerror", e => process.stdout.write(`[pageerror] ${e.message}\n`));
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const report = await page.evaluate(([c, q, p]) => p === "gear" ? window.HorseBake.bakeGear() : window.HorseBake.bake(c, q), [coat, quality, part]);
    await mkdir(dirname(out), { recursive: true });
    const bytes = Buffer.from(report.b64, "base64");
    await writeFile(out, bytes);
    console.log(`wrote ${out} (${(bytes.byteLength / 1e6).toFixed(1)} MB): ${report.tris} triangles, sculpted in ${report.sculptMs} ms`);
    for (const clip of report.clips) console.log("  clip " + clip);
  } finally { await browser.close(); }
} finally { await rm(work, { recursive: true, force: true }); }
