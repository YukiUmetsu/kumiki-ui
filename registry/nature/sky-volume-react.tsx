/**
 * React pieces for SKY1's rendered skies: `CloudSky` (a sky with cloud layers rendered by `renderCloudSky` into a
 * canvas) and `RenderedCloudAtlas` (the ten genera, each in the view that shows its tell-tale feature, with the
 * physics it is built from).
 *
 * Skies render on the CPU after the page paints, one at a time (the queue shared with other heavy renders), and are
 * cached by their options.
 */
import { forwardRef } from "react";
import type { CanvasHTMLAttributes } from "react";
import { RenderFrame } from "../anatomy/foundation-render-react";
import { SKY_RENDER_POOL } from "./sky-render-pool";
import { sheetSmall } from "../anatomy/foundation-react";
import type { CloudGenus } from "./sky-data";
import { CLOUD_GENERA } from "./sky-data";
import { CLOUD_SCENES, CLOUD_VOLUMES, extinction } from "./sky-volume";
import type { SkyRenderOptions } from "./sky-volume";

export interface CloudSkyProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  options: SkyRenderOptions;
  label: string;
}
/** A sky with cloud layers seen from the ground, rendered in a worker and cached, with a visible working state. */
export const CloudSky = forwardRef<HTMLCanvasElement, CloudSkyProps>(function CloudSky({ options, label, ...rest }, ref) {
  const W = Math.round(options.width ?? 480), H = Math.round(options.height ?? 270);
  return <RenderFrame ref={ref} width={W} height={H} label={label} placeholder="var(--km-surface-subtle, #9aa7b4)" job={{ pool: SKY_RENDER_POOL, kind: "sky", args: options }} {...rest} />;
});

/** The genus's numbers: heights, water content, droplet size, extinction and the optical depth of its thickness. */
export function cloudFacts(genus: CloudGenus) {
  const v = CLOUD_VOLUMES[genus], sigma = extinction(v.waterContent, v.effectiveRadius, v.phase);
  return { ...v, sigma, tau: sigma * (v.top - v.base) * 0.5 };
}

/** The ten genera rendered, each in the view that shows its tell-tale feature, with the physics it is built from. */
export function RenderedCloudAtlas({ width = 384, genera = Object.keys(CLOUD_GENERA) as CloudGenus[] }: { width?: number; genera?: readonly CloudGenus[] }) {
  const H = Math.round((width * 9) / 16);
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
      {genera.map(g => {
        const f = cloudFacts(g), rec = CLOUD_GENERA[g];
        return (
          <figure key={g} style={{ margin: 0, display: "grid", gap: 6, alignContent: "start" }}>
            <CloudSky options={{ width, height: H, layers: [g], ...CLOUD_SCENES[g] }} label={`${g} (${rec.ja}), rendered sky seen from the ground`} />
            <figcaption style={{ ...sheetSmall, lineHeight: 1.4 }}>
              <b style={{ textTransform: "capitalize" }}>{g}</b> {rec.ja} · {(f.base / 1000).toFixed(1)}–{(f.top / 1000).toFixed(1)} km · {f.phase === "ice" ? "ice" : "water"} {f.waterContent} g/m³, r<sub>e</sub> {f.effectiveRadius} µm · σ {f.sigma < 0.01 ? f.sigma.toExponential(1) : f.sigma.toFixed(3)} m⁻¹
              <br />{f.note}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
