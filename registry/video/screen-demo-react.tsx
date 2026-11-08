/** Draws a planned screen demo at one frame: the screen in its frame (a browser, a window, a phone or nothing), the camera that follows
 * the action, the cursor with its press and ripple, typed text and its caret, and callouts beside what changed. Screenshots and live
 * React UI are drawn the same way; live UI is shown, never operated: it is inert, and its own transitions are switched off so every
 * frame is exact. Pure function of `frame`.
 */
import type { CSSProperties, ReactNode } from "react";
import { evaluateScreenDemo, screenPlacement } from "./screen-demo";
import type { ScreenDemoPlan, ScreenRect, ScreenValue } from "./screen-demo";

export interface ScreenUiContext {
  /** The UI's state at this frame: its starting state, every `set` so far, and typed text. */
  state: Readonly<Record<string, ScreenValue>>;
  /** Frames since each key last changed, for entrances the UI animates itself. */
  since: Readonly<Record<string, number>>;
  /** The target whose caret is lit, if any: draw a caret in that field. */
  caret?: string;
  frame: number;
  width: number;
  height: number;
}
export interface ScreenDemoProps {
  plan: ScreenDemoPlan;
  /** Frame in the scene. */
  frame: number;
  width: number;
  height: number;
  /** The output's safe area, as fractions of the frame. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
  /** Ripples, callout rules and the target ring. @default a calm blue */
  accent?: string;
  /** The ground behind the screen. @default a dark neutral with a soft glow of the accent */
  background?: string;
  /** Draws live UI by name. A demo with `"kind": "ui"` needs it. */
  renderScreen?: (ui: string, context: ScreenUiContext) => ReactNode;
  reducedMotion?: boolean;
}

const LIVE_STYLE = `[data-km-screen-live] *, [data-km-screen-live] *::before, [data-km-screen-live] *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }`;
/** A standard arrow pointer, drawn here: black with a white keyline, tip at the origin. */
function Arrow({ size }: { size: number }) {
  return <svg width={size * 14 / 21} height={size} viewBox="0 0 14 21" style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,.35))" }} aria-hidden="true">
    <path d="M1 1 L1 16.5 L4.8 12.9 L7.6 19.2 L10.1 18.1 L7.4 11.9 L12.6 11.9 Z" fill="#111" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>;
}
function IBeam({ size }: { size: number }) {
  return <svg width={size * 8 / 21} height={size} viewBox="0 0 8 21" style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 0 1px rgba(255,255,255,.9))" }} aria-hidden="true">
    <path d="M1 1.5 Q4 1.5 4 4 L4 17 Q4 19.5 1 19.5 M7 1.5 Q4 1.5 4 4 M7 19.5 Q4 19.5 4 17" fill="none" stroke="#111" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;
}

/** One frame of a screen demo. */
export function ScreenDemo({ plan, frame, width, height, safeInset, accent = "#4f8cff", background, renderScreen, reducedMotion = false }: ScreenDemoProps) {
  const { content } = plan, state = evaluateScreenDemo(plan, frame, { reducedMotion });
  const chrome = content.chrome ?? "browser", place = screenPlacement(content, { width, height }, safeInset), s = place.scale;
  const W = content.screen.width, H = content.screen.height, contentHeight = Math.max(H, content.screen.contentHeight ?? H);
  const short = Math.min(width, height);
  // The camera: screen point (cx, cy) lands on the screen's resting centre, enlarged by `zoom`.
  const { zoom, cx, cy } = state.camera;
  const O = { x: place.screen.x + place.screen.width / 2, y: place.screen.y + place.screen.height / 2 };
  const anchor = { x: place.screen.x + cx * s, y: place.screen.y + cy * s };
  const toOutput = (x: number, y: number) => ({ x: O.x + zoom * (place.screen.x + x * s - anchor.x), y: O.y + zoom * (place.screen.y + y * s - anchor.y) });
  const rectOut = (r: ScreenRect): ScreenRect => { const a = toOutput(r.x, r.y - state.scrollY); return { x: a.x, y: a.y, width: r.width * s * zoom, height: r.height * s * zoom }; };

  const source = content.source;
  let screen: ReactNode;
  if (source.kind === "images") {
    const find = (id?: string) => source.states.find(item => item.id === id)?.image;
    const shown = find(state.image?.id), previous = find(state.image?.previous);
    screen = <div style={{ position: "absolute", left: 0, top: 0, width: W, height: contentHeight, transform: `translateY(${-state.scrollY}px)` }}>
      {previous && <img src={previous.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />}
      {shown && <img src={shown.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: state.image?.mix ?? 1 }} />}
      {plan.typing.filter(run => run.image && frame < run.until && (state.typed[run.target] !== undefined || state.caret?.target === run.target)).map(run => {
        const r = content.targets[run.target], style = run.style ?? {}, fontSize = style.fontSize ?? Math.round(r.height * .42), lit = state.caret?.target === run.target && state.caret.visible;
        const inset = style.insetX ?? 12;
        // The field's own colour under the words hides the screenshot's placeholder; 2 px in, so the field's border stays.
        return <div key={run.target + run.frames[0]} style={{ position: "absolute", left: r.x + 2, top: r.y + 2, width: r.width - 4, height: r.height - 4, padding: `0 ${inset - 2}px`, boxSizing: "border-box",
          background: style.background ?? "#ffffff", borderRadius: 4, display: "flex", alignItems: "center",
          font: `450 ${fontSize}px/1 ${style.font ?? "system-ui, -apple-system, 'Segoe UI', sans-serif"}`, color: style.color ?? "#1f2328", whiteSpace: "pre", overflow: "hidden" }}>
          <span>{state.typed[run.target] ?? ""}</span>
          <span aria-hidden="true" style={{ display: "inline-block", width: Math.max(1.5, fontSize * .08), height: fontSize * 1.15, marginLeft: 1, background: style.color ?? "#1f2328", opacity: lit ? 1 : 0 }} />
        </div>;
      })}
    </div>;
  } else {
    if (!renderScreen) throw new Error(`Screen demo "${source.ui}" is live UI, but no renderScreen was given.`);
    screen = <div data-km-screen-live="" inert aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: W, height: contentHeight, transform: `translateY(${-state.scrollY}px)`, pointerEvents: "none" }}>
      <style>{LIVE_STYLE}</style>
      {renderScreen(source.ui, { state: state.ui.state, since: state.ui.since, caret: state.caret?.visible ? state.caret.target : undefined, frame, width: W, height: contentHeight })}
    </div>;
  }

  // The frame around the screen, in screen pixels, scaled as one sheet.
  const bar = chrome === "browser" ? 44 : chrome === "window" ? 34 : 0, bezel = chrome === "phone" ? 18 : 0;
  const sheet: CSSProperties = { position: "absolute", left: place.screen.x - bezel * s, top: place.screen.y - (bar + bezel) * s, width: W + bezel * 2, height: H + bar + bezel * 2,
    transform: `scale(${s})`, transformOrigin: "0 0", borderRadius: chrome === "phone" ? 54 : chrome === "none" ? 0 : 12, overflow: "hidden",
    background: chrome === "phone" ? "#0d0f12" : "#f4f5f7", boxShadow: chrome === "none" ? undefined : "0 30px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08)" };
  const camera: CSSProperties = { position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${O.x - zoom * anchor.x}px, ${O.y - zoom * anchor.y}px) scale(${zoom})` };
  const ground = background ?? `radial-gradient(ellipse 80% 70% at 30% 25%, ${accent}2e, transparent 70%), linear-gradient(160deg, #161a21, #0c0e12)`;

  const cursorOut = toOutput(state.cursor.x, state.cursor.y), cursorPx = Math.max(short * .03, state.cursor.size * s * zoom * .9) * (state.cursor.pressed ? .88 : 1);
  return <div data-km-screen-demo="" role="img" aria-label={content.label} style={{ position: "relative", width, height, overflow: "hidden", background: ground }}>
    {/* The window and everything in it is a picture of an interface, filmed by the camera: the film's text audit checks the demo's own
        notes, not the address bar or the screen's words. */}
    <div style={camera} data-km-illustration-region="art">
      <div style={sheet}>
        {chrome === "browser" && <div style={{ height: bar, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#e9ebef", borderBottom: "1px solid #d5d9df" }}>
          {[0, 1, 2].map(i => <span key={i} aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 6, background: "#c4c9d1" }} />)}
          <div style={{ marginLeft: 18, flex: 1, maxWidth: 560, height: 28, borderRadius: 8, background: "#fff", border: "1px solid #d5d9df", display: "flex", alignItems: "center", padding: "0 12px",
            font: "500 14px/1 system-ui, sans-serif", color: "#4a5160", whiteSpace: "nowrap", overflow: "hidden" }}>{content.url ?? ""}</div>
        </div>}
        {chrome === "window" && <div style={{ height: bar, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: "#e9ebef", borderBottom: "1px solid #d5d9df", font: "600 13px/1 system-ui, sans-serif", color: "#4a5160" }}>
          {[0, 1, 2].map(i => <span key={i} aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 6, background: "#c4c9d1" }} />)}
          <span style={{ flex: 1, textAlign: "center", marginRight: 60 }}>{content.title ?? ""}</span>
        </div>}
        <div style={{ position: "absolute", left: bezel, top: bar + bezel, width: W, height: H, overflow: "hidden", borderRadius: chrome === "phone" ? 38 : 0, background: "#fff" }}>{screen}</div>
      </div>
    </div>
    {state.callouts.map(item => {
      // The target keeps a ring; the note sits in a band like a lower third, so it never covers the interface it explains. It moves
      // to the top when the target is low in the frame.
      const target = rectOut(content.targets[item.target]), pad = short * .008, font = short * .034, chipH = font * 2.2;
      const left = width * (safeInset?.left ?? 0) + short * .03, right = width - width * (safeInset?.right ?? 0) - short * .03;
      const top = height * (safeInset?.top ?? 0) + short * .03, bottom = height - height * (safeInset?.bottom ?? 0) - short * .03;
      const low = target.y + target.height + pad + short * .02 > bottom - chipH;
      return <div key={item.target + item.text} style={{ opacity: item.opacity }}>
        <div aria-hidden="true" style={{ position: "absolute", left: target.x - pad, top: target.y - pad, width: target.width + pad * 2, height: target.height + pad * 2, borderRadius: pad * 1.5,
          boxShadow: `0 0 0 ${Math.max(2, short * .003)}px ${accent}, 0 0 ${short * .03}px ${accent}66` }} />
        <div style={{ position: "absolute", left, width: right - left, top: low ? top : bottom - chipH, height: chipH, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: font * .55, height: chipH, maxWidth: "100%", padding: `0 ${font * .9}px`, borderRadius: chipH / 2,
            background: "rgb(14,17,22)", color: "#f4f5f7", font: `650 ${font}px/1.1 var(--km-font-body, system-ui, sans-serif)`, whiteSpace: "nowrap", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
            <span aria-hidden="true" style={{ flex: "none", width: font * .42, height: font * .42, borderRadius: "50%", background: accent }} />{item.text}
          </div>
        </div>
      </div>;
    })}
    {state.ripples.map(ripple => {
      const p = toOutput(ripple.x, ripple.y), r = short * (.012 + .05 * ripple.progress);
      return <div key={ripple.progress} aria-hidden="true" style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: "50%",
        border: `${Math.max(2, short * .004)}px solid ${accent}`, background: `${accent}22`, opacity: 1 - ripple.progress }} />;
    })}
    <div aria-hidden="true" style={{ position: "absolute", left: cursorOut.x - (state.cursor.mode === "text" ? cursorPx * 4 / 21 : 0), top: cursorOut.y - (state.cursor.mode === "text" ? cursorPx / 2 : 0) }}>
      {state.cursor.mode === "text" ? <IBeam size={cursorPx} /> : <Arrow size={cursorPx} />}
    </div>
  </div>;
}

/** Rects of the elements marked `data-km-demo-target` inside `root`, in its own pixels: paste them into `targets`, and the review
 * compares them with what the live UI actually lays out. */
export function measureScreenTargets(root: HTMLElement): Record<string, ScreenRect> {
  const base = root.getBoundingClientRect(), scale = base.width / Math.max(1, root.offsetWidth), out: Record<string, ScreenRect> = {};
  root.querySelectorAll<HTMLElement>("[data-km-demo-target]").forEach(element => {
    const r = element.getBoundingClientRect();
    out[element.dataset.kmDemoTarget!] = { x: Math.round((r.x - base.x) / scale), y: Math.round((r.y - base.y) / scale), width: Math.round(r.width / scale), height: Math.round(r.height / scale) };
  });
  return out;
}
