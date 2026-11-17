/**
 * React pieces for ANAT1 skin texture: `SkinSwatchView` (a region's skin at macro scale under a raking light, rendered
 * by `renderSkinSwatch` into a canvas after paint, queued and cached) and `SkinRegionsSheet` (every region young and
 * old, with what sets it).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CanvasHTMLAttributes } from "react";
import { enqueueRender } from "./foundation-queue";
import { sheetSmall } from "./foundation-react";
import { renderSkinSwatch, SKIN_REGIONS } from "./skin-texture";
import type { SkinSwatch, SkinSwatchOptions } from "./skin-texture";

const cache = new Map<string, SkinSwatch>();

export interface SkinSwatchViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  options: SkinSwatchOptions;
  label: string;
}
/** A region's skin at macro scale, rendered after paint and cached. */
export const SkinSwatchView = forwardRef<HTMLCanvasElement, SkinSwatchViewProps>(function SkinSwatchView({ options, label, style, ...rest }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), [busy, setBusy] = useState(true);
  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);
  const key = JSON.stringify(options), W = Math.round(options.width ?? 320), H = Math.round(options.height ?? 240);
  useEffect(() => {
    let live = true;
    const draw = (r: SkinSwatch) => { const ctx = canvas.current?.getContext("2d"); if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height), 0, 0); setBusy(false); };
    const hit = cache.get(key);
    if (hit) { draw(hit); return () => { live = false; }; }
    setBusy(true);
    void enqueueRender(() => {
      if (!live) return;
      const r = renderSkinSwatch(options);
      if (cache.size > 60) cache.clear();
      cache.set(key, r);
      if (live) draw(r);
    });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={canvas} width={W} height={H} role="img" aria-label={label} aria-busy={busy}
    style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, borderRadius: 6, background: "var(--km-surface-subtle, #d8b8a0)", ...style }} {...rest} />;
});

/** Every skin region at two ages, at macro scale (the width of skin shown is given), with its pores, network and folds. */
export function SkinRegionsSheet({ ages = [25, 65], skin = "#c99a7e", width = 280 }: { ages?: readonly number[]; skin?: string; width?: number }) {
  const H = Math.round(width * 0.68);
  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))" }}>
      {SKIN_REGIONS.map(r => {
        const mm = r.ridges ? 12 : r.wrinkles && r.wrinkles.spacing > 4 ? 24 : 14;
        return (
          <figure key={r.id} style={{ margin: 0, display: "grid", gap: 6, alignContent: "start" }}>
            <div style={{ display: "grid", gap: 6, gridTemplateColumns: `repeat(${ages.length}, 1fr)` }}>
              {ages.map(age => <div key={age} style={{ display: "grid", gap: 2 }}>
                <SkinSwatchView options={{ region: r.id, age, skin, width, height: H, sizeMm: mm, seed: 5 }} label={`${r.label} skin at ${age}, ${mm} mm across`} />
                <span style={{ ...sheetSmall }}>{age} years · {mm} mm across</span></div>)}
            </div>
            <figcaption style={{ ...sheetSmall, lineHeight: 1.45 }}><b>{r.label}</b> — {r.note} {r.pores ? `Pores about ${r.pores}/cm², ${r.poreSize} mm. ` : ""}Furrow network about {r.cell} mm{r.ridges ? `; ridges ${r.ridges} mm apart` : ""}{r.wrinkles ? `; folds about ${r.wrinkles.spacing} mm apart` : ""}.</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
