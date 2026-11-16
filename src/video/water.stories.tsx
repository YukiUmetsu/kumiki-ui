import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BEAUFORT } from "../../registry/nature/sky-data";
import { BREAKERS } from "../../registry/nature/water-data";
import type { BreakerType } from "../../registry/nature/water-data";
import { BreakerFigure, SeaScene, WaterSheet } from "../../registry/nature/water-react";
import { breakingDepth, glitterPath, iribarren, lipReach, seaForBeaufort } from "../../registry/nature/water-physics";
import { beaufortSpeed } from "../../registry/nature/sky-physics";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" } as const;

function useClock(play: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!play || typeof requestAnimationFrame === "undefined") return;
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => { setT((now - t0) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play]);
  return t;
}

function SheetStory() {
  return <main style={page}><h1 style={{ margin: 0, font: "600 22px var(--km-font-sans, system-ui, sans-serif)" }}>Water (WATER1)</h1><WaterSheet /></main>;
}

/** The sea for a wind: heights, periods and whitecaps from the wind; colours from Fresnel and the sky; glints from the slopes. */
function SeaLab() {
  const [F, setF] = useState(4), [sun, setSun] = useState(20), [ahead, setAhead] = useState(true), [eye, setEye] = useState(4), [play, setPlay] = useState(true);
  const t = useClock(play), sea = seaForBeaufort(F), g = glitterPath(sun, beaufortSpeed(F));
  return (
    <main style={page}>
      <div style={row}>
        <label style={label}>Wind: force {F} ({BEAUFORT[F].name})<input type="range" min={0} max={12} value={F} onChange={e => setF(+e.target.value)} /></label>
        <label style={label}>Sun {sun}°<input type="range" min={1} max={60} value={sun} onChange={e => setSun(+e.target.value)} /></label>
        <label style={label}>Eye height {eye} m<input type="range" min={1} max={30} value={eye} onChange={e => setEye(+e.target.value)} /></label>
        <label style={{ ...label, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={ahead} onChange={e => setAhead(e.target.checked)} /> Sun ahead</label>
        <button type="button" style={field} onClick={() => setPlay(p => !p)}>{play ? "Pause" : "Play"}</button>
      </div>
      <div style={{ maxWidth: 960 }}><SeaScene beaufort={F} sunElevation={sun} sunAhead={ahead} eyeHeight={eye} time={t} width={960} height={540} /></div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>Fully developed: significant height {sea.height.toFixed(2)} m, peak period {sea.period.toFixed(1)} s, wavelength {sea.wavelength.toFixed(0)} m, crests at {sea.speed.toFixed(1)} m/s.</li>
        <li>Sea state {sea.seaState}; whitecaps cover {(sea.whitecaps * 100).toFixed(2)}% of the sea.</li>
        <li>Glitter path: rms slope {g.rmsSlope.toFixed(2)}, about ±{g.halfHeight.toFixed(0)}° up and down, ±{g.halfWidth.toFixed(0)}° across.</li>
        <li>{BEAUFORT[F].sea}.</li>
      </ul>
    </main>
  );
}

/** A breaker through its stages: pick the type or the beach slope and wave. */
function BreakerLab() {
  const [type, setType] = useState<BreakerType>("plunging"), [stage, setStage] = useState(.6), [play, setPlay] = useState(false);
  const t = useClock(play), s = play ? (t / 3) % 1 : stage, H = 1.5, T = 9, slope = { spilling: .02, plunging: .1, collapsing: .2, surging: .3 }[type];
  return (
    <main style={page}>
      <div style={row}>
        <label style={label}>Breaker
          <select style={field} value={type} onChange={e => setType(e.target.value as BreakerType)}>{(Object.keys(BREAKERS) as BreakerType[]).map(b => <option key={b}>{b}</option>)}</select>
        </label>
        <label style={label}>Stage {s.toFixed(2)}<input type="range" min={0} max={1} step={.01} value={stage} onChange={e => { setStage(+e.target.value); setPlay(false); }} /></label>
        <button type="button" style={field} onClick={() => setPlay(p => !p)}>{play ? "Pause" : "Play"}</button>
      </div>
      <div style={{ maxWidth: 960 }}><BreakerFigure type={type} stage={s} height={360} /></div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>{BREAKERS[type].look}</li>
        <li>A {H} m, {T} s swell on a 1 : {Math.round(1 / slope)} beach: Iribarren ξ₀ = {iribarren(slope, H, T).toFixed(2)}; it breaks in about {breakingDepth(H).toFixed(1)} m of water; a plunging lip lands about {lipReach(H).toFixed(1)} m ahead.</li>
      </ul>
    </main>
  );
}

const meta = { title: "Video production/Art Foundations/Water", id: "video-water", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sheet: Story = { render: () => <SheetStory /> };
export const Sea: Story = { name: "Sea lab", render: () => <SeaLab /> };
export const Breakers: Story = { name: "Breaker lab", render: () => <BreakerLab /> };
