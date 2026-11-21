/** Draws a freeze-frame intro's name card and flash (`film-freeze.ts`). The grade itself is a filter on the scene (or, on footage with a
 * subject cutout, on its background only). */
import type { CSSProperties } from "react";
import type { FilmFreeze } from "./film-freeze";
import { inkOn } from "./film-cards-react";

const DISPLAY = "var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", BODY = "var(--km-font-body, system-ui, sans-serif)";

/** The CSS filter of a freeze's grade at `amount` (0 to 1): mono greys and deepens the picture, dim darkens it. */
export function freezeGrade(grade: FilmFreeze["grade"], amount: number): string | undefined {
  if (amount <= 0 || grade === "none") return undefined;
  return grade === "mono" ? `grayscale(${amount.toFixed(3)}) contrast(${(1 + .18 * amount).toFixed(3)}) brightness(${(1 - .14 * amount).toFixed(3)})`
    : `brightness(${(1 - .45 * amount).toFixed(3)}) saturate(${(1 - .4 * amount).toFixed(3)})`;
}

/** The name card: a large white name with a thin bar of `accent` under it that wipes in from the card's side, the role on a solid label of
 * `accent` in the ink that reads on it, over a soft shade that keeps both readable on any picture; then the flash. */
export function FreezeCard({ freeze, enter, leave, flash, accent, width, height, safeInset }: { freeze: FilmFreeze; enter: number; leave: number; flash: number; accent: string;
  width: number; height: number; safeInset?: { left: number; right: number; top: number; bottom: number } }) {
  const short = Math.min(width, height), right = freeze.side === "right", size = Math.min(.14 * short, .6 * width / Math.max(3, [...freeze.name].length * .62));
  const inset = (side: "left" | "right" | "bottom", least: number) => Math.max((safeInset?.[side] ?? 0) + .02, least);
  const shown = Math.min(enter, leave), slide = (1 - enter) * (right ? 1 : -1) * .08 * width, ink = inkOn(accent);
  const box: CSSProperties = { position: "absolute", bottom: `${inset("bottom", .11) * 100}%`, ...right ? { right: `${inset("right", .07) * 100}%`, alignItems: "flex-end", textAlign: "right" } : { left: `${inset("left", .07) * 100}%`, alignItems: "flex-start" },
    display: "flex", flexDirection: "column", gap: .016 * short, maxWidth: "72%", opacity: shown, transform: `translateX(${slide.toFixed(1)}px)` };
  return <>
    {/* A soft shade in the card's corner, so white words read over bright ground. */}
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: shown,
      background: `radial-gradient(ellipse 78% 64% at ${right ? "100%" : "0%"} 100%, rgba(6,9,14,.9), rgba(6,9,14,.68) 48%, rgba(6,9,14,0) 100%)` }} />
    <div data-km-film-freeze={freeze.name} {...enter < 1 || leave < 1 ? { "data-km-text-entering": "" } : {}} style={box}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: right ? "flex-end" : "flex-start" }}>
        <div style={{ font: `900 ${size.toFixed(1)}px/.95 ${DISPLAY}`, letterSpacing: "-.02em", textTransform: "uppercase", color: "#fbf8f2", textShadow: `0 ${.005 * short}px ${.022 * short}px rgba(0,0,0,.65)` }}>{freeze.name}</div>
        <div aria-hidden="true" style={{ alignSelf: "stretch", height: Math.max(3, .08 * size), marginTop: .05 * size, background: accent, transformOrigin: right ? "100% 50%" : "0 50%", transform: `scaleX(${enter.toFixed(3)})` }} />
      </div>
      {freeze.role && <div style={{ font: `750 ${(.034 * short).toFixed(1)}px/1.15 ${BODY}`, letterSpacing: ".07em", textTransform: "uppercase", color: ink, background: accent,
        padding: `${(.008 * short).toFixed(1)}px ${(.016 * short).toFixed(1)}px`, borderRadius: .006 * short }}>{freeze.role}</div>}
    </div>
    {flash > .004 && <div aria-hidden="true" data-km-film-freeze-flash="" style={{ position: "absolute", inset: 0, background: "#ffffff", opacity: flash, pointerEvents: "none" }} />}
  </>;
}
