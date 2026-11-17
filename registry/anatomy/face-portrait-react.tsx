/**
 * React pieces for ANAT1 portraits: `FacePortrait` (a rendered portrait in a canvas), `GoldenRatioTable` (the ratios
 * people check, against φ and against Pallett's average-face ratios) and `BeautyEvidence` (the findings applied).
 *
 * Portraits are rendered on the CPU after the page paints, one at a time, so a page of them stays responsive.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CanvasHTMLAttributes, CSSProperties } from "react";
import { renderPortrait } from "./face-portrait";
import type { Portrait, PortraitOptions } from "./face-portrait";
import { BEAUTY_EVIDENCE, GOLDEN_RATIO, beautifulFace } from "./face-beauty";
import type { BeautyOptions } from "./face-beauty";
import { enqueueRender as enqueue } from "./foundation-queue";
import { sheetList, sheetSmall } from "./foundation-react";

export interface FacePortraitProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  options: PortraitOptions;
  label: string;
  /** Called with each finished render (its time, and the groomed hair: strand count, groom time). */
  onRendered?: (portrait: Portrait) => void;
}

/** A portrait rendered from the measured, attractiveness-calibrated face (see `renderPortrait`). */
export const FacePortrait = forwardRef<HTMLCanvasElement, FacePortraitProps>(function FacePortrait({ options, label, style, onRendered, ...rest }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), [busy, setBusy] = useState(true);
  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);
  const key = JSON.stringify(options), W = options.width ?? 384, H = options.height ?? 480;
  useEffect(() => {
    let live = true;
    setBusy(true);
    void enqueue(() => {
      if (!live || !canvas.current) return;
      const p = renderPortrait(options), ctx = canvas.current.getContext("2d");
      if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(p.rgba), p.width, p.height), 0, 0);
      if (live) { setBusy(false); onRendered?.(p); }
    });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={canvas} width={W} height={H} role="img" aria-label={label} aria-busy={busy}
    style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, background: "var(--km-surface-subtle, #e8e4df)", borderRadius: 6, ...style }} {...rest} />;
});

const cell: CSSProperties = { padding: "4px 8px", borderBottom: "1px solid var(--km-border-subtle, #e2deda)", textAlign: "left", verticalAlign: "top" };

/** The golden-ratio checks for a face, beside Pallett's average-face ratios, with what the research found. */
export function GoldenRatioTable({ face = {} }: { face?: BeautyOptions }) {
  const f = beautifulFace(face);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Facial ratios against the golden ratio and the average face">
        <table style={{ borderCollapse: "collapse", minWidth: 520, width: "100%", font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>
          <thead><tr><th style={cell}>Ratio</th><th style={cell}>This face</th><th style={cell}>Target claimed</th><th style={cell}>Source</th></tr></thead>
          <tbody>{f.report.map(r => <tr key={r.id}><td style={cell}>{r.label}</td><td style={cell}>{r.value.toFixed(3)}</td><td style={cell}>{r.target.toFixed(3)} · {r.targetLabel}</td><td style={cell}>{r.source}</td></tr>)}</tbody>
        </table>
      </div>
      <p style={{ ...sheetSmall, margin: 0 }}><b>Claim.</b> {GOLDEN_RATIO.claim.text} ({GOLDEN_RATIO.claim.by}; <a href={GOLDEN_RATIO.claim.url}>{GOLDEN_RATIO.claim.source}</a>)</p>
      <ul style={{ ...sheetList, ...sheetSmall }}>{GOLDEN_RATIO.findings.map(x => <li key={x.url}>{x.text} (<a href={x.url}>{x.source}</a>)</li>)}</ul>
      <p style={{ ...sheetSmall, margin: 0 }}>{GOLDEN_RATIO.verdict}</p>
    </div>
  );
}

/** The attractiveness findings the beautiful face applies, each with its source and grade. */
export function BeautyEvidence() {
  return <ul style={{ ...sheetList, ...sheetSmall }}>{BEAUTY_EVIDENCE.map(e => <li key={e.id}><b>{e.id}</b> ({e.grade}): {e.finding} {e.url ? <a href={e.url}>{e.source}</a> : e.source}</li>)}</ul>;
}
