/**
 * React pieces for WATER1's rendered sea: `OceanView` (the open sea for a wind, rendered by `renderOcean` into a
 * canvas) and `SeaByBeaufort` (the sea from calm to a gale, each with its wave height, period, wavelength and
 * whitecap cover).
 *
 * Seas render on the CPU after the page paints, one at a time (the queue shared with other heavy renders), and are
 * cached by their options.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CanvasHTMLAttributes } from "react";
import { enqueueRender } from "../anatomy/foundation-queue";
import { sheetSmall } from "../anatomy/foundation-react";
import { beaufortSpeed } from "./sky-physics";
import { renderOcean, seaSpectrum } from "./water-ocean";
import type { OceanRender, OceanRenderOptions } from "./water-ocean";
import { whitecapCoverage } from "./water-physics";

const cache = new Map<string, OceanRender>();

export interface OceanViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  options: OceanRenderOptions;
  label: string;
}
/** The open sea for a wind under a sky, rendered after paint and cached. */
export const OceanView = forwardRef<HTMLCanvasElement, OceanViewProps>(function OceanView({ options, label, style, ...rest }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), [busy, setBusy] = useState(true);
  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);
  const key = JSON.stringify(options), W = Math.round(options.width ?? 480), H = Math.round(options.height ?? 270);
  useEffect(() => {
    let live = true;
    const draw = (r: OceanRender) => {
      const ctx = canvas.current?.getContext("2d");
      if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height), 0, 0);
      setBusy(false);
    };
    const hit = cache.get(key);
    if (hit) { draw(hit); return () => { live = false; }; }
    setBusy(true);
    void enqueueRender(() => {
      if (!live) return;
      const r = renderOcean(options);
      if (cache.size > 40) cache.clear();
      cache.set(key, r);
      if (live) draw(r);
    });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={canvas} width={W} height={H} role="img" aria-label={label} aria-busy={busy}
    style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, borderRadius: 6, background: "var(--km-surface-subtle, #2e4a6b)", ...style }} {...rest} />;
});

/** The sea by Beaufort force, from a light air to a gale, with the numbers that set it. */
export function SeaByBeaufort({ forces = [2, 4, 5, 6, 7, 8], width = 384 }: { forces?: readonly number[]; width?: number }) {
  const H = Math.round((width * 9) / 16);
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
      {forces.map(f => {
        const U = beaufortSpeed(f), sp = seaSpectrum({ wind: U }), wc = whitecapCoverage(U);
        return (
          <figure key={f} style={{ margin: 0, display: "grid", gap: 6, alignContent: "start" }}>
            <OceanView options={{ width, height: H, wind: U, sunElevation: 38, sunAzimuth: -115, pitch: -7, seed: 3 }} label={`The open sea at Beaufort ${f}, rendered`} />
            <figcaption style={{ ...sheetSmall, lineHeight: 1.4 }}>
              <b>Beaufort {f}</b> · wind {U.toFixed(1)} m/s · H<sub>s</sub> {sp.significantHeight.toFixed(1)} m · T<sub>p</sub> {sp.peakPeriod.toFixed(1)} s · λ<sub>p</sub> {Math.round(sp.peakLength)} m · whitecaps {(wc * 100).toFixed(wc < 0.01 ? 2 : 1)}%
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
