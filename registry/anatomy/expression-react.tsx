/**
 * EXPR1 painters.
 *
 * `ExpressionFace` draws an expressed face front on as a line study:
 * - the oval, brows, lids, irises at their gaze, nose and lips;
 * - the creases the active units make;
 * - optionally the creases as kumadori strokes in the role's colour.
 *
 * `ExpressionAtlas` shows every prototype. `ExpressionSheet` shows one emotion:
 * - an intensity ramp;
 * - its action units with muscles and what to draw;
 * - its style-neutral features;
 * - the Noh tilt and kumadori notes.
 *
 * Text is HTML; colours come from the tokens and the foundation variables.
 */
import { forwardRef, useMemo } from "react";
import type { HTMLAttributes, SVGAttributes } from "react";
import { FACE_FEATURES } from "./anatomy-face";
import { ACTION_UNITS, EMOTIONS, KUMADORI, NOH_TILT } from "./expression-facs";
import { expressEmotion, expressionFeatures, expressionMarks, findEmotion, irisPositions } from "./expression-face";
import type { ExpressedFace, ExpressionFeatures } from "./expression-face";
import { ACCENT, INK, PAPER, SheetCard, sheetGrid, sheetList, sheetSmall } from "./foundation-react";

export interface ExpressionFaceProps extends Omit<SVGAttributes<SVGSVGElement>, "fill"> {
  face: ExpressedFace;
  /** Draw the creases (default), or paint them as kumadori in a colour. */
  marks?: "lines" | "kumadori" | "none";
  kumadori?: string;
  label: string;
}

/** One expressed face, front on (mm, y up inside, flipped for the screen). */
export const ExpressionFace = forwardRef<SVGSVGElement, ExpressionFaceProps>(function ExpressionFace({ face, marks = "lines", kumadori = KUMADORI.colours[0].hex, label, style, ...rest }, ref) {
  const v = face.vertices;
  const xs = v.map(p => p[0]), ys = v.map(p => p[1]), pad = 6;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + 26;
  const pts = (loop: readonly number[], closed?: boolean) => loop.map(i => `${v[i][0].toFixed(2)},${v[i][1].toFixed(2)}`).join(" ") + (closed ? ` ${v[loop[0]][0].toFixed(2)},${v[loop[0]][1].toFixed(2)}` : "");
  const ir = irisPositions(face), creases = marks === "none" ? [] : expressionMarks(face);
  const eye = (s: "L" | "R") => [...FACE_FEATURES[`eye-upper.${s}`].loop, ...FACE_FEATURES[`eye-lower.${s}`].loop.slice().reverse()];
  return (
    <svg ref={ref} role="img" aria-label={label} viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} style={{ display: "block", width: "100%", height: "auto", ...style }} {...rest}>
      <defs>{(["L", "R"] as const).map(s => <clipPath key={s} id={`eye-${s}-${label.replace(/\W/g, "")}`}><polygon points={pts(eye(s))} /></clipPath>)}</defs>
      <g transform="scale(1 -1)" fill="none" stroke={INK} strokeLinejoin="round" strokeLinecap="round">
        <polygon points={pts(FACE_FEATURES.oval.loop)} fill={PAPER} strokeWidth={.9} />
        {(["L", "R"] as const).map(s => <g key={s}>
          <polygon points={pts(eye(s))} fill="#fff" strokeWidth={.6} />
          <circle cx={ir[s][0]} cy={ir[s][1]} r={ir.r * .62} fill={INK} stroke="none" opacity=".75" clipPath={`url(#eye-${s}-${label.replace(/\W/g, "")})`} />
          <polyline points={pts(FACE_FEATURES[`eye-upper.${s}`].loop)} strokeWidth={1.1} />
          <polyline points={pts(FACE_FEATURES[`brow.${s}`].loop)} strokeWidth={2.4} />
        </g>)}
        <polyline points={pts(FACE_FEATURES["nose-bridge"].loop)} strokeWidth={.6} opacity=".6" />
        <polyline points={pts(FACE_FEATURES["nose-base"].loop)} strokeWidth={.8} />
        <polygon points={pts([...FACE_FEATURES["lips-upper"].loop, ...FACE_FEATURES["lips-lower"].loop.slice().reverse()])} fill="var(--kumiki-expression-lips, #c97b74)" fillOpacity=".55" strokeWidth={.8} />
        <polyline points={pts(FACE_FEATURES["mouth-line"].loop)} strokeWidth={1} />
        {creases.map(m => <polyline key={m.id} points={m.points.map(p => p.join(",")).join(" ")}
          stroke={marks === "kumadori" ? kumadori : ACCENT} strokeWidth={marks === "kumadori" ? 1.6 + m.strength * 2.2 : .8} opacity={marks === "kumadori" ? .9 : m.strength} />)}
      </g>
    </svg>
  );
});

const FEATURE_LABEL: Record<keyof ExpressionFeatures, string> = {
  browInner: "inner brows", browOuter: "outer brows", browKnit: "brows drawn together", eyeOpen: "lid opening (× neutral)", cheekRaise: "cheeks",
  noseWrinkle: "nose wings", upperLip: "upper lip", mouthCorner: "mouth corners", mouthWidth: "mouth width (× neutral)", mouthOpen: "mouth opening", jaw: "chin drop", asymmetry: "one-sidedness",
};
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;

/** Every prototype as a line study. */
export const ExpressionAtlas = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function ExpressionAtlas({ style, ...rest }, ref) {
  const faces = useMemo(() => EMOTIONS.map(e => ({ e, face: expressEmotion(e.id) })), []);
  return (
    <div ref={ref} style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))", ...style }} {...rest}>
      {faces.map(({ e, face }) => <figure key={e.id} style={{ margin: 0, display: "grid", gap: 4 }}>
        <ExpressionFace face={face} label={`${e.name}: ${Object.keys(e.aus).map(a => `AU ${a}`).join(" + ")}`} />
        <figcaption style={{ ...sheetSmall, textAlign: "center" }}><b style={{ color: "var(--km-text-primary, #242424)" }}>{e.name}</b>{e.ja ? <span lang="ja"> · {e.ja}</span> : null}<br />{Object.keys(e.aus).join(" + ")} · {e.grade}</figcaption>
      </figure>)}
    </div>
  );
});

export interface ExpressionSheetProps extends HTMLAttributes<HTMLDivElement> { emotion: string }

/** One emotion: intensity ramp, its action units, features, and notes for styles. */
export const ExpressionSheet = forwardRef<HTMLDivElement, ExpressionSheetProps>(function ExpressionSheet({ emotion, style, ...rest }, ref) {
  const e = findEmotion(emotion);
  const ramp = useMemo(() => (e ? [.33, .66, 1].map(k => expressEmotion(e.id, k)) : []), [e]);
  if (!e) return <div ref={ref} role="alert" {...rest}>Unknown expression: {emotion}</div>;
  const f = expressionFeatures(ramp[2]);
  return (
    <div ref={ref} style={{ ...sheetGrid, ...style }} {...rest}>
      <header style={{ gridColumn: "1 / -1", display: "grid", gap: 4 }}>
        <h2 style={{ margin: 0, font: "700 22px/1.25 var(--km-font-sans, system-ui, sans-serif)" }}>{e.name}{e.ja ? <span lang="ja" style={{ fontWeight: 400 }}> · {e.ja}</span> : null}</h2>
        <div style={sheetSmall}>{Object.entries(e.aus).map(([a, w]) => `AU ${a} ${ACTION_UNITS[Number(a)]?.name ?? ""} (${w.toFixed(1)})`).join(" + ")}{e.side ? `, ${e.side === "R" ? "right" : "left"} side only` : ""} · {e.grade}: {e.source}</div>
      </header>
      <SheetCard title="Intensity" wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 12 }}>
          {ramp.map((face, i) => <figure key={i} style={{ margin: 0, display: "grid", gap: 4 }}>
            <ExpressionFace face={face} label={`${e.name} at ${["a third", "two thirds", "full"][i]} intensity`} />
            <figcaption style={{ ...sheetSmall, textAlign: "center" }}>{["Slight (B)", "Marked (D)", "Full (E)"][i]}</figcaption>
          </figure>)}
        </div>
      </SheetCard>
      <SheetCard title="What moves">
        <ul style={sheetList}>
          {Object.keys(e.aus).map(a => { const u = ACTION_UNITS[Number(a)]; return u && <li key={a}><b>AU {u.id} {u.name}</b> ({u.muscles || "head or eyes"}): {u.appearance.join(" ")}</li>; })}
        </ul>
      </SheetCard>
      <SheetCard title="For any style">
        <table style={{ borderCollapse: "collapse", font: "13px/1.4 var(--km-font-sans, system-ui, sans-serif)" }}>
          <tbody>{(Object.keys(FEATURE_LABEL) as (keyof ExpressionFeatures)[]).filter(k => Math.abs(f[k] - (k === "eyeOpen" || k === "mouthWidth" ? 1 : 0)) > .015).map(k =>
            <tr key={k}><td style={{ padding: "2px 10px 2px 0" }}>{FEATURE_LABEL[k]}</td><td>{k === "eyeOpen" || k === "mouthWidth" ? f[k].toFixed(2) : signed(f[k])}</td></tr>)}</tbody>
        </table>
        <p style={{ ...sheetSmall, margin: 0 }}>Movements in eye widths (+ up), ratios against the neutral face. Map them onto your style's brows, lids and mouth.</p>
      </SheetCard>
      <SheetCard title="Drawing notes">
        <ul style={sheetList}>{e.notes.map(n => <li key={n}>{n}</li>)}</ul>
      </SheetCard>
      <SheetCard title="Masks and make-up">
        <ul style={sheetList}>
          <li>Noh: tilting up {NOH_TILT.up}; tilting down {NOH_TILT.down}.</li>
          <li>Kumadori: {KUMADORI.note}</li>
        </ul>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {KUMADORI.colours.slice(0, 3).map(k => <figure key={k.colour} style={{ margin: 0, display: "grid", gap: 2 }}>
            <ExpressionFace face={ramp[2]} marks="kumadori" kumadori={k.hex} label={`${e.name} with ${k.colour} kumadori`} />
            <figcaption style={{ ...sheetSmall, textAlign: "center" }}>{k.colour}</figcaption>
          </figure>)}
        </div>
      </SheetCard>
    </div>
  );
});
