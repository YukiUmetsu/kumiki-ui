/**
 * FOOD1 React pieces: `FoodView` (a cooked dish rendered from the cooking physics, in a worker, cached), `Steam` (steam
 * rising from hot food: a buoyant plume about 0.4 m/s that curls and thins within centimetres) and `FoodSheet` (the
 * temperatures, doneness, gloss and dishes).
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { CanvasHTMLAttributes } from "react";
import { RenderFrame } from "../anatomy/foundation-render-react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import { fbm } from "../anatomy/foundation-raster";
import { COOKING_TEMPERATURES, DISHES, DONENESS, FOOD_GLOSS, STEAM } from "./food-data";
import type { FoodRenderOptions } from "./food-render";
import { FOOD_RENDER_POOL } from "./food-render-pool";

export interface FoodViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> { options: FoodRenderOptions; label: string; onCaption?: (caption: string) => void }
/** A dish cooked by the physics and rendered (`renderFood`), in a worker, cached. */
export const FoodView = forwardRef<HTMLCanvasElement, FoodViewProps>(function FoodView({ options, label, onCaption, ...rest }, ref) {
  const W = options.width ?? 420, H = options.height ?? 300;
  return <RenderFrame ref={ref} width={W} height={H} label={label} placeholder="var(--km-surface-subtle, #3a3631)"
    job={{ pool: FOOD_RENDER_POOL, kind: "food", args: options }} onResult={onCaption ? r => onCaption(String(r.meta?.caption ?? "")) : undefined} {...rest} />;
});

export interface SteamProps { width?: number; height?: number; /** How hot (°C): steam shows from about 70 °C and thickens toward boiling. */ temperature?: number; /** A draught bending the plume, −1 … 1. */ draught?: number; label?: string }
/**
 * Steam over a bowl: puffs leave the surface invisible, whiten a centimetre or two up as the vapour condenses, rise
 * about 0.4 m/s (here 10 cm of bowl is about 140 px), curl with the air and thin out within about 15 cm. Reduced
 * motion: one still frame.
 */
export function Steam({ width = 320, height = 300, temperature = 90, draught = 0.15, label = "Steam rising from a hot bowl" }: SteamProps) {
  const canvas = useRef<HTMLCanvasElement>(null), [reduce] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const pxPerM = 1400, rise = STEAM.riseSpeed.typical * pxPerM, fade = STEAM.fadeHeight.typical * pxPerM, rim = height * 0.72, strength = Math.max(0, Math.min(1, (temperature - 65) / 30));
    type P = { x: number; y: number; age: number; r: number; seed: number };
    const ps: P[] = [];
    let raf = 0, last = 0, t = 0, rngS = 7;
    const rnd = () => { rngS = (rngS * 16807) % 2147483647; return rngS / 2147483647; };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#16181b"; ctx.fillRect(0, 0, width, height);
      // the bowl: a dark ceramic ellipse with soup, lit from behind (steam shows best backlit against the dark)
      const g = ctx.createRadialGradient(width * 0.5, height * 0.15, 10, width * 0.5, height * 0.4, width * 0.8); g.addColorStop(0, "rgba(255,240,215,0.18)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#2a2d31"; ctx.beginPath(); ctx.ellipse(width / 2, rim + 20, width * 0.38, 46, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#8a5a2c"; ctx.beginPath(); ctx.ellipse(width / 2, rim, width * 0.36, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3b3f44"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(width / 2, rim, width * 0.37, 18, 0, 0, Math.PI * 2); ctx.stroke();
      for (const p of ps) {
        const h = rim - p.y, appear = Math.min(1, h / 18), thin = Math.exp(-h / fade), a = 0.055 * strength * appear * thin;
        if (a < 0.003) continue;
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); gr.addColorStop(0, `rgba(235,238,242,${a})`); gr.addColorStop(1, "rgba(235,238,242,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    const step = (dt: number) => {
      t += dt;
      for (let k = 0; k < 3 * strength + 1; k++) ps.push({ x: width / 2 + (rnd() - 0.5) * width * 0.55, y: rim - 2, age: 0, r: 14 + rnd() * 10, seed: rnd() * 100 });
      for (const p of ps) {
        // buoyant rise, slowing as the puff mixes; curls from a moving noise field; the draught leans it
        const h = rim - p.y, slow = 1 / (1 + h / (fade * 1.5));
        p.y -= rise * slow * dt;
        p.x += (fbm(3, p.x / 60, (p.y + t * rise) / 60, 2) * 40 + draught * 60 * (h / fade)) * dt;
        p.r += 26 * dt; p.age += dt;
      }
      for (let i = ps.length - 1; i >= 0; i--) if (rim - ps[i].y > fade * 4 || ps[i].y < -40) ps.splice(i, 1);
    };
    if (reduce) { for (let k = 0; k < 160; k++) step(1 / 30); draw(); return; }
    const tick = (now: number) => { const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now; step(dt); draw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [width, height, temperature, draught, reduce]);
  return <canvas ref={canvas} width={width} height={height} role="img" aria-label={label} style={{ display: "block", maxWidth: "100%", borderRadius: 6 }} />;
}

/** The temperatures, doneness, gloss and dishes. */
export function FoodSheet() {
  const T = COOKING_TEMPERATURES;
  return (
    <div style={sheetGrid}>
      <SheetCard title="Where food changes (°C)">
        <ul style={{ ...sheetList, ...sheetSmall }}>{Object.entries(T).map(([k, v]) => <li key={k}><b>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</b>: {v.min === v.max ? v.typical : `${v.min}–${v.max}`} °C — {v.source}</li>)}</ul>
      </SheetCard>
      <SheetCard title="Beef doneness (core after resting)">
        <ul style={{ ...sheetList, ...sheetSmall, listStyle: "none", paddingLeft: 0 }}>{DONENESS.map(d => <li key={d.id} style={{ display: "flex", gap: 8, alignItems: "center" }}><span aria-hidden="true" style={{ width: 22, height: 16, borderRadius: 3, background: d.colour, flex: "none" }} /><span><b>{d.label}</b> {d.core.min}–{d.core.max} °C: {d.look}</span></li>)}</ul>
      </SheetCard>
      <SheetCard title="Gloss">
        <ul style={{ ...sheetList, ...sheetSmall }}>{FOOD_GLOSS.map(g => <li key={g.what}><b>{g.what}</b>: roughness {g.roughness.min}–{g.roughness.max}. {g.note}</li>)}</ul>
      </SheetCard>
      <SheetCard title="Steam">
        <ul style={{ ...sheetList, ...sheetSmall }}>{STEAM.notes.map(n => <li key={n}>{n}</li>)}</ul>
      </SheetCard>
      {DISHES.map(d => <SheetCard key={d.id} title={`${d.label}${d.ja ? ` (${d.ja})` : ""}`}><span style={sheetSmall}>{d.size}</span><ul style={{ ...sheetList, ...sheetSmall }}>{d.look.map(l => <li key={l}>{l}</li>)}</ul></SheetCard>)}
    </div>
  );
}
