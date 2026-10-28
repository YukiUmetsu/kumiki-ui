#!/usr/bin/env node
/*
 * Generates the in-house ocean demo clip used by the Interactive Branching Player stories.
 *
 * Picture: a golden-hour seascape drawn frame by frame on a canvas in headless Chromium.
 * Every motion is periodic over the clip length, so the clip loops without a seam.
 * Sound: surf synthesized with ffmpeg noise sources; each swell lands as a wave washes up the sand.
 * No third-party footage or audio is involved.
 *
 * Usage: node scripts/generate-branching-ocean-demo.mjs [outDir]
 * Requires ffmpeg with libvpx-vp9 and libopus.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";

const OUT = resolve(process.argv[2] ?? "src/video/assets");
const W = 1280, H = 720, FPS = 30, SECONDS = 14, WAVE = 7;

const scene = `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
const W = ${W}, H = ${H}, T = ${SECONDS}, WAVE = ${WAVE};
const ctx = document.getElementById("c").getContext("2d");
const TAU = Math.PI * 2;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const horizon = H * .47, shoreBase = H * .8;

function sky(t) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "#1d3a66"); g.addColorStop(.45, "#5a6f9a"); g.addColorStop(.78, "#e3a07a"); g.addColorStop(1, "#ffd59a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);
  const sx = W * .68, sy = horizon - H * .085;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * .5);
  glow.addColorStop(0, "rgba(255,236,190,.9)"); glow.addColorStop(.12, "rgba(255,200,140,.45)"); glow.addColorStop(1, "rgba(255,170,120,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, horizon);
  ctx.fillStyle = "#fff4d8"; ctx.beginPath(); ctx.arc(sx, sy, H * .045, 0, TAU); ctx.fill();
  // cloud banks: clumps of puffs with a cool top and a sunlit underside, drifting on a closed loop
  const banks = [[.16, .14, .26, 1], [.52, .09, .34, .8], [.86, .2, .22, .9], [.34, .3, .2, .6], [.7, .33, .16, .5]];
  banks.forEach(([x, y, w, k], b) => {
    const dx = Math.sin(TAU * t / T + b) * W * .01;
    const puffs = Array.from({ length: 16 }, (_, i) => {
      const u = hash(b * 31 + i) - .5, v = hash(b * 17 + i * 3);
      return [(x + u * w) * W + dx, y * H - v * H * .045 * (1 - Math.abs(u) * 1.4), H * (.02 + hash(b * 7 + i) * .03) * (1 - Math.abs(u))];
    });
    ctx.save(); ctx.filter = "blur(9px)";
    ctx.fillStyle = "rgba(170,150,190," + (.32 * k) + ")";
    puffs.forEach(([px, py, r]) => { ctx.beginPath(); ctx.ellipse(px, py, r * 2.2, r, 0, 0, TAU); ctx.fill(); });
    ctx.filter = "blur(6px)";
    ctx.fillStyle = "rgba(255,206,160," + (.5 * k) + ")";
    puffs.forEach(([px, py, r]) => { ctx.beginPath(); ctx.ellipse(px, py + r * .45, r * 1.8, r * .55, 0, 0, TAU); ctx.fill(); });
    ctx.restore();
  });
}

function island(t) {
  ctx.fillStyle = "#3b3d5c";
  ctx.beginPath(); ctx.moveTo(W * .04, horizon);
  ctx.bezierCurveTo(W * .08, horizon - H * .05, W * .14, horizon - H * .07, W * .2, horizon - H * .035);
  ctx.bezierCurveTo(W * .24, horizon - H * .02, W * .27, horizon - H * .015, W * .3, horizon); ctx.fill();
  // lighthouse with a slowly turning beam
  const lx = W * .225, ly = horizon - H * .03;
  ctx.fillStyle = "#e8e2dc"; ctx.fillRect(lx - 4, ly - 34, 8, 34);
  ctx.fillStyle = "#b5473c"; for (let i = 0; i < 3; i++) ctx.fillRect(lx - 4, ly - 30 + i * 11, 8, 4);
  ctx.fillStyle = "#2b2d44"; ctx.fillRect(lx - 6, ly - 40, 12, 6);
  const a = TAU * t / T * 2, beam = Math.max(0, Math.cos(a));
  ctx.save(); ctx.globalAlpha = .18 + beam * .45; ctx.fillStyle = "#fff6c8";
  ctx.beginPath(); ctx.moveTo(lx, ly - 37); const dir = Math.sin(a) > 0 ? 1 : -1;
  ctx.lineTo(lx + dir * W * .16, ly - 52); ctx.lineTo(lx + dir * W * .16, ly - 24); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = "#fffbe0"; ctx.beginPath(); ctx.arc(lx, ly - 37, 3 + beam * 2, 0, TAU); ctx.fill();
  ctx.restore();
}

function sea(t) {
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, "#5c6f8f"); g.addColorStop(.25, "#2d5f78"); g.addColorStop(.7, "#185066"); g.addColorStop(1, "#0f4255");
  ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
  // the sky's reflection near the horizon and a soft sun column on the water
  const band = ctx.createLinearGradient(0, horizon, 0, horizon + H * .07);
  band.addColorStop(0, "rgba(255,200,150,.45)"); band.addColorStop(1, "rgba(255,200,150,0)");
  ctx.fillStyle = band; ctx.fillRect(0, horizon, W, H * .07);
  ctx.save(); ctx.translate(W * .68, horizon); ctx.scale(1, 3.2);
  const col = ctx.createRadialGradient(0, 0, 0, 0, 0, W * .09);
  col.addColorStop(0, "rgba(255,226,170,.55)"); col.addColorStop(1, "rgba(255,226,170,0)");
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, W * .09, 0, Math.PI); ctx.fill(); ctx.restore();
  // swells: rows from the horizon forward, each moving toward shore on a whole number of cycles per loop
  for (let r = 0; r < 34; r++) {
    const z = (r + 1) / 34, y = horizon + (shoreBase - horizon) * z * z + 2;
    // whole cycles per loop keep the clip seamless
    const amp = 1 + z * z * 11, len = 40 + z * 220, phase = TAU * Math.round(1 + z * 3) * t / T + r * 1.3, phase2 = TAU * Math.round(2 + z * 4) * t / T + r;
    const crest = (x) => y + Math.sin(x / len * TAU + phase) * amp + Math.sin(x / (len * .37) - phase2) * amp * .3;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, crest(x));
    ctx.lineTo(W + 10, y + 4 + amp * 2.2); ctx.lineTo(-10, y + 4 + amp * 2.2); ctx.closePath();
    const trough = ctx.createLinearGradient(0, y - amp, 0, y + amp * 2.2);
    trough.addColorStop(0, "rgba(70,140,155," + (.12 + z * .18) + ")"); trough.addColorStop(1, "rgba(6,36,52," + (.1 + z * .25) + ")");
    ctx.fillStyle = trough; ctx.fill();
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, crest(x));
    ctx.strokeStyle = "rgba(205,235,235," + (.08 + z * .3) + ")"; ctx.lineWidth = .6 + z * 1.8; ctx.stroke();
  }
  // sun glitter: short dashes that sparkle on and off along the sun path
  const sx = W * .68;
  for (let i = 0; i < 260; i++) {
    const z = hash(i), y = horizon + 3 + (shoreBase - horizon) * z * z, spread = 10 + z * W * .1;
    const x = sx + (hash(i + 99) - .5) * 2 * spread, on = Math.sin(TAU * (t / T * Math.round(3 + hash(i + 7) * 5)) + i);
    if (on < .3) continue;
    ctx.fillStyle = "rgba(255,236,190," + ((on - .3) * (1 - z * .5)) + ")";
    ctx.fillRect(x, y, 2 + z * 14, 1 + z * 1.5);
  }
}

function beach(t) {
  // the wash advances and retreats once per WAVE seconds
  const p = .5 - .5 * Math.cos(TAU * t / WAVE), lift = H * .055 * p;
  const sand = ctx.createLinearGradient(0, shoreBase - H * .04, 0, H);
  sand.addColorStop(0, "#c99f78"); sand.addColorStop(1, "#e3c49b");
  ctx.fillStyle = sand;
  ctx.beginPath(); ctx.moveTo(0, shoreBase + 6);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, shoreBase + Math.sin(x / 210) * 8 - x / W * 10);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  // grains, shell fragments and the wet sheen left as the water retreats
  for (let i = 0; i < 900; i++) {
    const x = hash(i * 11) * W, y = shoreBase + 8 + hash(i * 13) * (H - shoreBase), d = hash(i * 17);
    ctx.fillStyle = d < .5 ? "rgba(140,105,75,.35)" : "rgba(255,240,215,.45)";
    ctx.fillRect(x, y, 1 + d * 1.5, 1 + d);
  }
  for (let i = 0; i < 7; i++) {
    const x = hash(i * 23) * W, y = shoreBase + H * (.1 + hash(i * 29) * .08);
    ctx.fillStyle = "rgba(245,230,215,.85)"; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.5, hash(i) * 3, 0, TAU); ctx.fill();
  }
  // wet sand darkens where the water has just been
  ctx.fillStyle = "rgba(90,70,60,.22)";
  ctx.beginPath(); ctx.moveTo(0, shoreBase);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, shoreBase + Math.sin(x / 210) * 8 - x / W * 10 + H * .07);
  ctx.lineTo(W, shoreBase - 10); ctx.fill();
  // the thin sheet of water and its foam lace
  const edge = (x) => shoreBase + Math.sin(x / 210) * 8 - x / W * 10 + H * .075 - lift + Math.sin(x / 47 + TAU * 2 * t / T) * 3 + Math.sin(x / 19 - TAU * 3 * t / T) * 1.5;
  const sheet = ctx.createLinearGradient(0, shoreBase - 10, 0, shoreBase + H * .08);
  sheet.addColorStop(0, "rgba(40,110,120,.85)"); sheet.addColorStop(1, "rgba(150,205,200,.35)");
  ctx.fillStyle = sheet;
  ctx.beginPath(); ctx.moveTo(0, shoreBase - 14);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, edge(x));
  ctx.lineTo(W, shoreBase - 24); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,250," + (.55 + .35 * p) + ")"; ctx.lineWidth = 2.6;
  ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, edge(x)); ctx.stroke();
  for (let i = 0; i < 340; i++) {
    const x = hash(i * 3) * W, y = edge(x) - hash(i * 5) * H * .05 * (.4 + p), r = .8 + hash(i * 7) * 2.4;
    ctx.fillStyle = "rgba(255,255,250," + (.25 + hash(i) * .45) + ")"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  // breaking crest just offshore
  const crestY = shoreBase - H * .03 - lift * .4;
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, crestY + Math.sin(x / 90 + TAU * t / WAVE) * 3 - x / W * 10); ctx.stroke();
}

function gulls(t) {
  ctx.strokeStyle = "#2b2b3d"; ctx.lineCap = "round";
  [[0, .2, 1], [.37, .14, .8], [.62, .26, .65]].forEach(([offset, y, size]) => {
    const u = (t / T + offset) % 1, x = -80 + u * (W + 160), yy = H * y + Math.sin(TAU * u * 2) * 10, flap = Math.sin(TAU * t / T * 9 + offset * 20) * 6 * size;
    ctx.lineWidth = 2.2 * size; ctx.beginPath();
    ctx.moveTo(x - 14 * size, yy - flap); ctx.quadraticCurveTo(x - 6 * size, yy - 6 * size - flap * .4, x, yy);
    ctx.quadraticCurveTo(x + 6 * size, yy - 6 * size - flap * .4, x + 14 * size, yy - flap); ctx.stroke();
  });
}

window.draw = (t) => { ctx.clearRect(0, 0, W, H); sky(t); island(t); sea(t); gulls(t); beach(t); };
</script></body></html>`;

function run(args, input) {
  return new Promise((done, fail) => {
    const child = spawn("ffmpeg", args, { stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] });
    child.on("error", fail);
    child.on("exit", code => code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`)));
    if (input) input(child.stdin);
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(scene);
const canvas = page.locator("#c");
const frames = [];
for (let i = 0; i < SECONDS * FPS; i++) {
  await page.evaluate(t => globalThis.draw(t), i / FPS);
  frames.push(await canvas.screenshot({ type: "png" }));
}
await browser.close();

// Surf: a low brown-noise body that swells as each wave breaks, plus a hiss that trails the retreat.
const swell = `0.3+1.2*pow(max(0,sin(2*PI*(t-1.2)/${WAVE})),3)`;
const hiss = `0.1+0.55*pow(max(0,sin(2*PI*(t-2.2)/${WAVE})),2)`;
const audio = [
  "-f", "lavfi", "-t", String(SECONDS), "-i", "anoisesrc=color=brown:amplitude=0.9:seed=11:sample_rate=48000",
  "-f", "lavfi", "-t", String(SECONDS), "-i", "anoisesrc=color=pink:amplitude=0.6:seed=29:sample_rate=48000",
];
const mix = `[1:a]lowpass=f=700,volume='${swell}':eval=frame[body];[2:a]highpass=f=1800,lowpass=f=9000,volume='${hiss}':eval=frame[foam];`
  + `[body][foam]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo,afade=t=in:d=0.4,afade=t=out:st=${SECONDS - 0.4}:d=0.4[a]`;

await run([
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...audio,
  "-filter_complex", mix, "-map", "0:v", "-map", "[a]",
  "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-pix_fmt", "yuv420p",
  "-c:a", "libopus", "-b:a", "64k", "-shortest", resolve(OUT, "branching-ocean.webm"),
], stdin => { for (const frame of frames) stdin.write(frame); stdin.end(); });

await run(["-y", "-ss", "2", "-i", resolve(OUT, "branching-ocean.webm"), "-frames:v", "1", "-update", "1", "-q:v", "4", resolve(OUT, "branching-ocean-poster.jpg")]);
console.log(`Wrote ${resolve(OUT, "branching-ocean.webm")} and its poster.`);
