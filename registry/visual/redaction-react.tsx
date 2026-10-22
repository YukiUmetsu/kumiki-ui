/** Inline text with redaction ranges drawn as bars, highlights or overlays. Colours come from the
 * `--km-redaction-ink` and `--km-redaction-highlight` / `--km-redaction-mark` tokens, which default
 * to the surrounding text colour so bars follow light and dark themes. Covered text is only in the
 * DOM for `revealed` and `overlay-only`; in `redacted` mode it is absent, not hidden. */
import { Fragment, forwardRef, useMemo } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import { redactionSegments } from "./redaction";
import type { RedactionMode, RedactionRange } from "./redaction";

export interface RedactionRevealProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The full source text. */
  text: string;
  /** Character ranges to cover. Invalid ranges are clamped, merged or dropped (see `normalizeRedactions`). */
  ranges: readonly RedactionRange[];
  /** Defaults to `redacted`. `overlay-only` leaves the text selectable and readable by assistive
   * tech; use it to demonstrate that failure, never to protect data. */
  mode?: RedactionMode;
}

const BAR: CSSProperties = { display: "inline-block", height: "0.9em", verticalAlign: "-0.1em", maxWidth: "100%", borderRadius: "0.15em", background: "var(--km-redaction-ink, currentColor)" };
const HIGHLIGHT: CSSProperties = { borderRadius: "0.15em", background: "var(--km-redaction-highlight, rgba(217, 130, 43, 0.22))", boxShadow: "inset 0 -0.14em 0 var(--km-redaction-mark, #d9822b)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };
const OVERLAY: CSSProperties = { borderRadius: "0.15em", background: "var(--km-redaction-ink, currentColor)", color: "var(--km-redaction-ink, currentColor)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };

export const RedactionReveal = forwardRef<HTMLSpanElement, RedactionRevealProps>(function RedactionReveal({ text, ranges, mode = "redacted", style, ...props }, ref) {
  const segments = useMemo(() => redactionSegments(text, ranges), [text, ranges]);
  return <span {...props} ref={ref} data-km-redaction-mode={mode} style={{ overflowWrap: "anywhere", ...style }}>
    {segments.map((segment, i) => {
      if (segment.kind === "text") return <Fragment key={i}>{segment.text}</Fragment>;
      if (mode === "redacted") {
        return <span key={i} role="img" aria-label={segment.label ? `Redacted: ${segment.label}` : "Redacted"} data-km-redaction="bar" style={{ ...BAR, width: `${segment.widthEm}em` }} />;
      }
      const covered = text.slice(segment.start, segment.end);
      return mode === "revealed"
        ? <span key={i} data-km-redaction="highlight" style={HIGHLIGHT}>{covered}</span>
        : <span key={i} data-km-redaction="overlay" style={OVERLAY}>{covered}</span>;
    })}
  </span>;
});
