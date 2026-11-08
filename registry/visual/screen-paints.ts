/** Screens that perform, for `ScreenComesAlive` and film documents: canvas painters that are pure functions of the frame.
 * Each one draws in 390-wide design pixels (a phone's logical width) and uses no text under 14 px.
 */
import { easeInOut, easeOut, span01 } from "./studio-shots";

/** A weekly-energy screen that performs: the total counts up, bars grow in a stagger, a comparison slides in, a switch turns on.
 * A pure function of the frame, in 390-wide design pixels, with no text under 14 px. */
export function paintWeeklyEnergyScreen(ctx: CanvasRenderingContext2D, w: number, h: number, f: number) {
  const ink = "#eef3f8", soft = "rgba(214,226,238,.66)", accent = "#7cd6a4", font = "system-ui, -apple-system, sans-serif";
  const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#111a24"); bg.addColorStop(1, "#0b1118"); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const fade = (start: number, len = 10) => easeOut(span01(f, start, start + len));
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = soft; ctx.font = `600 15px ${font}`; ctx.fillText("9:41", 28, 40);
  let a = fade(0); ctx.globalAlpha = a; ctx.fillStyle = soft; ctx.font = `500 16px ${font}`; ctx.fillText("Energy use", 28, 104 + (1 - a) * 10);
  ctx.fillStyle = ink; ctx.font = `700 30px ${font}`; ctx.fillText("This week", 28, 140 + (1 - a) * 10);
  const total = 42.8 * easeOut(span01(f, 6, 46)); a = fade(4);
  ctx.globalAlpha = a; ctx.font = `700 64px ${font}`; ctx.fillStyle = ink; ctx.fillText(total.toFixed(1), 28, 228);
  const tw = ctx.measureText(total.toFixed(1)).width; ctx.font = `600 20px ${font}`; ctx.fillStyle = soft; ctx.fillText("kWh", 36 + tw, 228);
  const values = [5.1, 6.4, 7.8, 5.9, 6.6, 4.7, 6.3], max = 8, base = 470, area = 190, bw = 30, gap = (w - 56 - bw * 7) / 6;
  ctx.globalAlpha = 1;
  values.forEach((v, i) => {
    const grow = easeInOut(span01(f, 14 + i * 3, 32 + i * 3)), x = 28 + i * (bw + gap), hgt = area * (v / max) * grow;
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.beginPath(); ctx.roundRect(x, base - area, bw, area, 8); ctx.fill();
    ctx.fillStyle = i === 6 ? accent : "rgba(160,190,220,.55)"; ctx.beginPath(); ctx.roundRect(x, base - hgt, bw, Math.max(0, hgt), 8); ctx.fill();
    ctx.fillStyle = soft; ctx.font = `600 14px ${font}`; ctx.textAlign = "center"; ctx.fillText("MTWTFSS"[i], x + bw / 2, base + 26); ctx.textAlign = "left";
  });
  a = fade(56, 12); ctx.globalAlpha = a;
  const py = 540 + (1 - a) * 16; ctx.fillStyle = "rgba(124,214,164,.14)"; ctx.beginPath(); ctx.roundRect(28, py, w - 56, 54, 27); ctx.fill();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(54, py + 27, 6, 0, 7); ctx.fill();
  ctx.fillStyle = ink; ctx.font = `600 17px ${font}`; ctx.fillText("12% less than last week", 72, py + 33);
  a = fade(74, 12); ctx.globalAlpha = a;
  const ry = 630 + (1 - a) * 16; ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.beginPath(); ctx.roundRect(28, ry, w - 56, 72, 18); ctx.fill();
  ctx.fillStyle = ink; ctx.font = `600 18px ${font}`; ctx.fillText("Eco mode", 48, ry + 33); ctx.fillStyle = soft; ctx.font = `500 14px ${font}`; ctx.fillText("Shifts heating to off-peak hours", 48, ry + 54);
  const on = easeInOut(span01(f, 96, 106)), sx = w - 48 - 52;
  ctx.fillStyle = on > .5 ? accent : "rgba(255,255,255,.18)"; ctx.globalAlpha = a; ctx.beginPath(); ctx.roundRect(sx, ry + 22, 52, 30, 15); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx + 15 + on * 22, ry + 37, 12, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}
