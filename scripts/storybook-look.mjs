/* global window, document */
/**
 * Frames of a painted film as a contact sheet, through a running Storybook.
 *
 *   node scripts/storybook-look.mjs <film> [--shots a,b] [--at 1.2,3] [--from 2 --to 4] [--n 8] [--width 480] [--cols 4]
 *        [--port 6006] [--english] [--crop x,y,w,h] [--cells file.json] --out sheet.png
 *
 * Times are seconds of the film. Without --at, each shot gives --n frames. --crop is in parts of the picture (0–1).
 * --cells is a list of { t, box: [x, y, w, h] in parts of the picture, label }: each in a cell of the same size (story:check writes one).
 * One call opens the film once. Frames also go to a folder beside the sheet with --keep.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const argv = process.argv.slice(2), flag = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]?.startsWith("--") || argv[i + 1] === undefined ? true : argv[i + 1]; };
const film = argv[0], out = flag("out"), width = Number(flag("width", 480)), cols = Number(flag("cols", 4)), n = Number(flag("n", 6)), port = flag("port", process.env.STORYBOOK_PORT ?? 6006), crop = flag("crop") ? String(flag("crop")).split(",").map(Number) : [0, 0, 1, 1];
if (!film || film.startsWith("--") || !out) { console.error("Say a film and --out sheet.png"); process.exit(2); }
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }), faults = [];
  page.on("console", m => m.type() === "error" && faults.push(m.text())); page.on("pageerror", e => faults.push(String(e)));
  await page.goto(`http://localhost:${port}/iframe.html?id=video-storybook-film--export-wide&viewMode=story&args=film:${film}${flag("english") ? ";english:!true" : ""}`);
  await page.waitForSelector("[data-km-paint-film-status=ready],[data-km-paint-film-status=error],.sb-show-errordisplay", { timeout: 120000 });
  const said = await page.evaluate(() => document.querySelector("[data-km-paint-film-status=error]")?.textContent || document.querySelector(".sb-show-errordisplay #error-message, .sb-show-errordisplay #sb-errorstack")?.textContent || "");
  if (said) throw new Error(said.slice(0, 800));
  await page.waitForFunction(() => !!window.__kmVideoExport, null, { timeout: 180000 });
  const plan = JSON.parse(await page.locator("[data-story-plan]").textContent()), box = await page.locator("[data-km-paint-film-status]").first().boundingBox(), size = [box.width, box.height];
  const shots = plan.shots.filter(s => !flag("shots") || String(flag("shots")).split(",").includes(s.id)); if (!shots.length) throw new Error(`Shots: ${plan.shots.map(s => s.id).join(", ")}`);
  const pick = (a, b, k, name) => Array.from({ length: k }, (_, i) => ({ t: a + ((b - a) * (i + 0.5)) / k, name }));
  const times = flag("at") ? String(flag("at")).split(",").map(t => ({ t: Number(t), name: plan.shots.filter(s => Number(t) >= s.start).at(-1)?.id ?? "" })) : flag("from") !== undefined || flag("to") !== undefined ? pick(Number(flag("from", 0)), Number(flag("to", plan.frames / plan.fps)), n, "") : shots.flatMap(s => pick(s.start, s.end, n, s.id));
  const cells = [], own = flag("cells") ? JSON.parse(fs.readFileSync(String(flag("cells")), "utf8")) : null, tall = Math.round(width * 1.1);
  for (const { t, name, box: part = crop } of own ? own.map(c => ({ t: c.t, name: c.label, box: c.box })) : times) {
    const f = Math.min(plan.frames - 1, Math.max(0, Math.round(t * plan.fps)));
    await page.evaluate(k => window.__kmVideoExport.seek(k), f);
    await page.waitForFunction(k => document.querySelector("[data-km-paint-film-drawn]")?.dataset.kmPaintFilmDrawn === String(k), f, { timeout: 60000 });
    const keep = !!flag("keep"), png = await page.screenshot({ ...(keep ? {} : { type: "jpeg", quality: 90 }), clip: { x: box.x + part[0] * size[0], y: box.y + part[1] * size[1], width: part[2] * size[0], height: part[3] * size[1] } });
    if (keep) { const dir = out.replace(/\.png$/, ""); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, `${String(f).padStart(5, "0")}.png`), png); }
    cells.push(`<figure><img src="data:image/${keep ? "png" : "jpeg"};base64,${png.toString("base64")}" ${own ? `style="width:${width}px;height:${tall}px;object-fit:contain"` : `width="${width}"`}><figcaption>${name} ${(f / plan.fps).toFixed(2)} s · ${f}</figcaption></figure>`);
  }
  const sheet = await browser.newPage({ viewport: { width: cols * (width + 6) + 6, height: 400 }, deviceScaleFactor: 1 });
  await sheet.setContent(`<style>body{margin:3px;background:#777;display:grid;grid-template-columns:repeat(${cols},${width}px);gap:6px}figure{margin:0;position:relative}img{display:block}figcaption{position:absolute;left:0;top:0;background:#000b;color:#fff;font:13px/1.3 system-ui;padding:1px 5px}</style>${cells.join("")}`);
  await sheet.waitForFunction(() => [...document.images].every(i => i.complete));
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(`${cells.length} frames, ${plan.shots.length} shots, ${(plan.frames / plan.fps).toFixed(1)} s${faults.length ? `\nconsole: ${[...new Set(faults)].slice(0, 5).join("\n")}` : ""}`);
} finally { await browser.close(); }
