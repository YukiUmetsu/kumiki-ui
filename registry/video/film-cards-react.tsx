/** Draws a card scene: kinetic type that lands fast and then holds still, in the brand's colours and the film's look (display font,
 * case and tracking come from the look's CSS variables). Sizes follow the frame's short side, so a card reads the same in landscape
 * and vertical; the versus columns stack in a vertical frame. Pure function of `frame`.
 */
import type { CSSProperties, ReactNode } from "react";
import { CARD_ENTER, cardCues, itemGap, PROOF_COUNT_FRAMES, proofLabel, proofTiming, readingWords } from "./film-cards";
import type { FilmBrand, FilmCardContent } from "./film-cards";

const out3 = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const span = (frame: number, start: number, length: number) => out3((frame - start) / length);
const DISPLAY = "var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", BODY = "var(--km-font-body, system-ui, sans-serif)";
/** Relative luminance of a #rrggbb colour, or undefined for any other form. */
function luminance(color: string): number | undefined {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return undefined;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
/** The brand colour as text on the ground: lightened toward white, step by step, until it reads at 4.5:1 (WCAG AA). Fills (the call to
 * action, the bars) keep the true colour. Colours that are not #rrggbb are used as given. */
export function readableOn(color: string, ground: string, min = 4.5): string {
  const back = luminance(ground) ?? luminance("#0f1216")!;
  for (let k = 0; k <= 1.001; k += .1) {
    const mixed = k ? `#${[0, 2, 4].map(i => Math.round(parseInt(color.slice(1 + i, 3 + i), 16) * (1 - k) + 255 * k).toString(16).padStart(2, "0")).join("")}` : color, l = luminance(mixed);
    if (l === undefined) return color;
    if ((Math.max(l, back) + .05) / (Math.min(l, back) + .05) >= min) return mixed;
  }
  return "#ffffff";
}
/** Text on a brand-colour fill when the brand sets no ink: white or a near-black, whichever reads better. */
export function inkOn(fill: string): string {
  const l = luminance(fill);
  return l === undefined || 1.05 / (l + .05) >= (l + .05) / (luminance("#14161a")! + .05) ? "#ffffff" : "#14161a";
}
export interface FilmCardSafeInset { left: number; right: number; top: number; bottom: number }
const TITLE: CSSProperties = { fontFamily: DISPLAY, letterSpacing: "var(--km-title-tracking, -.02em)", textTransform: "var(--km-title-case, none)" as CSSProperties["textTransform"] };

/** Words that rise into place one after another, each behind its own mask, then hold. */
function Rising({ text, frame, start, emphasis, color, accent }: { text: string; frame: number; start: number; emphasis?: string; color: string; accent: string }) {
  const tokens = text.split(/(\s+)/), lit = new Set<number>();
  if (emphasis) {
    const at = text.indexOf(emphasis);
    let pos = 0;
    tokens.forEach((token, i) => { if (pos < at + emphasis.length && pos + token.length > at && token.trim()) lit.add(i); pos += token.length; });
  }
  let n = 0;
  return <>{tokens.map((token, i) => {
    if (!token.trim()) return token;
    const t = span(frame, start + n++ * 2, 10);
    return <span key={i} {...t < 1 ? { "data-km-text-entering": "" } : {}} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: ".08em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - t) * 105}%)`, color: lit.has(i) ? accent : color }}>{token}</span>
    </span>;
  })}</>;
}

const STAR = "M12 2.4l2.95 6.06 6.65.86-4.88 4.62 1.24 6.6L12 17.34l-5.96 3.2 1.24-6.6L2.4 9.32l6.65-.86z";
/** Five stars filled to `value`, a fraction of a star included (4.8 fills four and four fifths). Each fill is a box that clips one star,
 * so nothing depends on SVG IDs that two cards on screen at once would share. */
function Stars({ value, size, label }: { value: number; size: number; label: string }) {
  return <div role="img" aria-label={label} style={{ display: "flex", gap: size * .14 }}>
    {[0, 1, 2, 3, 4].map(i => { const fill = Math.min(1, Math.max(0, value - i));
      return <div key={i} style={{ position: "relative", width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", inset: 0 }} aria-hidden="true"><path d={STAR} fill="rgba(255,255,255,.16)" /></svg>
        <div style={{ position: "absolute", inset: 0, width: size * fill, overflow: "hidden" }}><svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={STAR} fill="#ffc94a" /></svg></div>
      </div>; })}
  </div>;
}
const initials = (name: string) => name.split(/[\s.]+/).filter(Boolean).map(word => word[0]).slice(0, 2).join("").toUpperCase();

export interface FilmCardProps { content: FilmCardContent; brand?: FilmBrand; frame: number; fps: number; width: number; height: number;
  /** The output's safe area, as fractions of the frame: the card keeps its words inside it. */
  safeInset?: FilmCardSafeInset }
/** One card at one frame. */
export function FilmCard({ content, brand, frame, fps, width, height, safeInset }: FilmCardProps) {
  // A vertical frame has height to spare, so its type runs a little larger than the short side alone would give.
  const vertical = height > width, u = Math.min(width, height) / 100 * (vertical ? 1.12 : 1);
  const fill = brand?.color ?? "#7cc6ff", onFill = brand?.ink ?? inkOn(fill), ink = "#f4f5f7", soft = "rgba(236,239,244,.72)", ground = brand?.background ?? "#0f1216", accent = readableOn(fill, ground);
  // A slow glow of the brand colour drifting across the ground, so the card is never a dead frame.
  const drift = frame / Math.max(1, fps);
  const bg: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", background: `radial-gradient(ellipse 70% 60% at ${20 + 6 * Math.sin(drift * .4)}% ${30 + 5 * Math.cos(drift * .3)}%, ${fill}38, transparent 70%), ${ground}`, color: ink };
  // A little inside the safe line, so a look's handheld or weave cannot nudge the words across it.
  const inset = (side: keyof FilmCardSafeInset, least: number) => `${Math.max((safeInset?.[side] ?? 0) + .015, least) * 100}%`;
  const pad: CSSProperties = { position: "absolute", left: inset("left", .08), right: inset("right", .08), top: inset("top", vertical ? .12 : .11), bottom: inset("bottom", vertical ? .14 : .12),
    display: "flex", flexDirection: "column", justifyContent: "center" };
  let body: ReactNode;
  switch (content.card) {
    case "headline": {
      const landed = cardCues(content, fps)[0].frame;
      body = <div style={pad}>
        {content.kicker && <div style={{ ...TITLE, font: `700 ${3.6 * u}px/1.2 ${DISPLAY}`, letterSpacing: ".14em", textTransform: "uppercase", color: accent, opacity: span(frame, 2, 8), marginBottom: 2.5 * u }}>{content.kicker}</div>}
        <div style={{ ...TITLE, font: `760 ${(content.text.length > 40 ? 8.4 : 10.4) * u}px/1.04 ${DISPLAY}`, textWrap: "balance" } as CSSProperties}>
          <Rising text={content.text} frame={frame} start={4} emphasis={content.emphasis} color={ink} accent={accent} />
        </div>
        {content.emphasis && <div style={{ marginTop: 3 * u, width: 18 * u, height: .9 * u, background: fill, transformOrigin: "0 50%", transform: `scaleX(${span(frame, landed, 14)})` }} />}
      </div>;
      break;
    }
    case "list": {
      const gap = itemGap(content.items, fps), cues = cardCues(content, fps), current = Math.max(0, cues.filter(c => c.id.startsWith("item-") && frame >= c.frame).length - 1);
      body = <div style={pad}>
        <div style={{ ...TITLE, font: `740 ${(content.title.length > 32 ? 7.2 : 8.6) * u}px/1.06 ${DISPLAY}`, textWrap: "balance", marginBottom: 4.4 * u, opacity: span(frame, 0, 10), transform: `translateY(${(1 - span(frame, 0, 10)) * 2 * u}px)` } as CSSProperties}>{content.title}</div>
        {content.items.map((item, i) => {
          const t = span(frame, CARD_ENTER + 10 + i * gap, 10);
          // Tagged so a container transform can grow the next scene out of this row, measured where it is drawn.
          return <div key={i} data-km-film-subject={`item-${i + 1}`} style={{ display: "flex", alignItems: "baseline", gap: 3.2 * u, padding: `${2.4 * u}px 0`, borderTop: `1px solid rgba(255,255,255,${.12 * t})`, opacity: t, transform: `translateX(${(1 - t) * -3 * u}px)` }}>
            <span style={{ font: `760 ${6.2 * u}px/1 ${DISPLAY}`, color: accent, fontVariantNumeric: "tabular-nums", minWidth: 8.6 * u }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ font: `620 ${5.6 * u}px/1.2 ${BODY}`, color: i === current ? ink : soft, textWrap: "pretty" } as CSSProperties}>{item}</span>
          </div>;
        })}
        <div style={{ marginTop: 3 * u, display: "flex", gap: 1.2 * u }} aria-hidden="true">
          {content.items.map((_, i) => <div key={i} style={{ width: 6 * u, height: .8 * u, borderRadius: u, background: i <= current && frame >= CARD_ENTER + 10 ? fill : "rgba(255,255,255,.18)" }} />)}
        </div>
      </div>;
      break;
    }
    case "versus": {
      const [, right] = cardCues(content, fps), struck = content.strike ? span(frame, right.frame + 8, 14) : 0;
      const column = (side: "left" | "right", start: number) => {
        const data = content[side], t = span(frame, start, 10), mine = side === "right";
        return <div style={{ flex: vertical ? "none" : 1, minWidth: 0, opacity: t, transform: `translateY(${(1 - t) * 2 * u}px)` }}>
          <div style={{ display: "inline-block", padding: `${.9 * u}px ${2.2 * u}px`, borderRadius: 4 * u, font: `700 ${3.6 * u}px/1.1 ${DISPLAY}`, letterSpacing: ".08em", textTransform: "uppercase",
            background: mine ? fill : "rgba(255,255,255,.14)", color: mine ? onFill : soft, marginBottom: 3 * u }}>{data.label}</div>
          {data.items.map((item, i) => <div key={i} style={{ font: `${mine ? 650 : 520} ${5.4 * u}px/1.25 ${BODY}`, color: mine ? ink : soft, marginBottom: 2.2 * u }}>
            {/* The strike is drawn per line: an inline background, cloned onto every line the item wraps to, growing left to right. */}
            {!mine && content.strike ? <span data-km-text-struck="" style={{ backgroundImage: "linear-gradient(currentColor, currentColor)", backgroundRepeat: "no-repeat", backgroundPosition: "0 58%",
              backgroundSize: `${struck * 100}% ${Math.max(2, .45 * u)}px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{item}</span> : item}
          </div>)}
        </div>;
      };
      body = <div style={{ ...pad, flexDirection: vertical ? "column" : "row", alignItems: vertical ? "stretch" : "center", justifyContent: "center", gap: vertical ? 6 * u : 8 * u }}>
        {column("left", CARD_ENTER)}
        <div aria-hidden="true" style={{ alignSelf: "stretch", width: vertical ? "auto" : 2, height: vertical ? 2 : "auto", background: "rgba(255,255,255,.14)" }} />
        {column("right", right.frame)}
      </div>;
      break;
    }
    case "quote": {
      const t = span(frame, CARD_ENTER, 14), stars = content.rating ? Math.min(content.rating, (frame - CARD_ENTER - 20) / 6) : 0;
      const ratingRow = content.rating !== undefined && <div style={{ display: "flex", alignItems: "center", gap: .6 * u, marginBottom: 2.6 * u, opacity: span(frame, CARD_ENTER + 14, 8) }} aria-label={`${content.rating} out of 5`}>
        {[0, 1, 2, 3, 4].map(i => <span key={i} aria-hidden="true" style={{ font: `400 ${5.4 * u}px/1 ${BODY}`, color: stars > i + .5 ? "#ffc94a" : "rgba(255,255,255,.2)" }}>★</span>)}
        <span style={{ font: `700 ${4.4 * u}px/1 ${BODY}`, marginLeft: 1.2 * u, fontVariantNumeric: "tabular-nums" }}>{content.rating.toFixed(1)}</span>
      </div>;
      body = <div style={pad}>
        <div aria-hidden="true" data-km-illustration-region="art" style={{ font: `800 ${22 * u}px/0.6 Georgia, serif`, color: accent, opacity: span(frame, 0, 8), height: 11 * u }}>“</div>
        {ratingRow}
        <div style={{ font: `560 ${(content.quote.length > 110 ? 5.4 : 6.6) * u}px/1.3 ${BODY}`, opacity: t, transform: `translateY(${(1 - t) * 2 * u}px)`, textWrap: "pretty" } as CSSProperties}>{content.quote}</div>
        <div style={{ marginTop: 4 * u, display: "flex", alignItems: "center", gap: 2.4 * u, opacity: span(frame, CARD_ENTER + 10, 10) }}>
          <div aria-hidden="true" style={{ flex: "none", width: 9 * u, height: 9 * u, borderRadius: "50%", background: fill, color: onFill, display: "grid", placeItems: "center", font: `700 ${3.8 * u}px/1 ${DISPLAY}` }}>
            {content.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("")}</div>
          <div style={{ minWidth: 0 }}><div style={{ font: `700 ${4.2 * u}px/1.2 ${BODY}` }}>{content.name}</div>{content.role && <div style={{ font: `500 ${3.4 * u}px/1.3 ${BODY}`, color: soft }}>{content.role}</div>}</div>
        </div>
      </div>;
      break;
    }
    case "proof": {
      // Voices arrive in turn and stay, so each can be finished while the next lands; then the total they add up to counts up.
      const { enters, total } = proofTiming(content, fps);
      // A vertical frame stacks the voices, so each card is compact: who said it and their stars share one row above the words.
      const pu = vertical ? u * .85 : u;
      const quotes = content.quotes.map((item, i) => {
        const t = span(frame, enters[i], 12), stars = item.rating !== undefined ? Math.min(item.rating, Math.max(0, (frame - enters[i] - 8) / 3)) : undefined;
        const starRow = stars !== undefined && <Stars value={stars} size={(vertical ? 3 : 3.4) * pu} label={`${item.rating} out of 5`} />;
        const who = <figcaption style={{ display: "flex", alignItems: "center", gap: 1.8 * pu, minWidth: 0 }}>
          <div aria-hidden="true" style={{ flex: "none", width: 7 * pu, height: 7 * pu, borderRadius: "50%", background: fill, color: onFill, display: "grid", placeItems: "center", font: `700 ${3 * pu}px/1 ${DISPLAY}` }}>{initials(item.name)}</div>
          <div style={{ minWidth: 0 }}><div style={{ font: `700 ${3.4 * pu}px/1.2 ${BODY}` }}>{item.name}</div>{item.role && <div style={{ font: `500 ${2.9 * pu}px/1.3 ${BODY}`, color: soft }}>{item.role}</div>}</div>
        </figcaption>;
        const words = <blockquote style={{ margin: 0, flex: 1, font: `560 ${(readingWords(item.quote) > 11 ? 3.9 : 4.4) * pu}px/1.3 ${BODY}`, textWrap: "pretty" } as CSSProperties}>“{item.quote}”</blockquote>;
        return <figure key={i} style={{ margin: 0, flex: vertical ? "none" : "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 2.2 * pu, padding: `${3 * pu}px ${3.2 * pu}px`,
          borderRadius: 2.4 * pu, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.09)", boxShadow: `0 ${pu}px ${4 * pu}px rgba(0,0,0,.25)`, opacity: t, transform: `translateY(${(1 - t) * 3 * pu}px)` }}>
          {vertical ? <><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 * pu }}>{who}{starRow}</div>{words}</> : <>{starRow}{words}{who}</>}
        </figure>;
      });
      const sum = content.total, counted = total === undefined ? 0 : span(frame, total, PROOF_COUNT_FRAMES), shown = total === undefined ? 0 : span(frame, total, 10);
      body = <div style={{ ...pad, gap: 4 * pu }}>
        <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: (vertical ? 2.2 : 2.6) * pu, alignItems: "stretch" }}>{quotes}</div>
        {sum && <div style={{ display: "flex", alignItems: "center", gap: 3.2 * pu, opacity: shown, transform: `translateY(${(1 - shown) * 2 * pu}px)` }}>
          <div style={{ ...TITLE, font: `800 ${12 * pu}px/1 ${DISPLAY}`, color: accent, fontVariantNumeric: "tabular-nums" }}>{(sum.rating * counted).toFixed(1)}</div>
          <div style={{ display: "grid", gap: 1.2 * pu }}>
            <Stars value={sum.rating * counted} size={4.6 * pu} label={`${sum.rating} out of 5`} />
            <div style={{ font: `640 ${4.2 * pu}px/1.2 ${BODY}` }}>{proofLabel(sum)}</div>
            {content.source && <div style={{ font: `500 ${Math.max(2.6 * pu, 2.5 * u * .92)}px/1.3 ${BODY}`, color: soft }}>{content.source}</div>}
          </div>
        </div>}
      </div>;
      break;
    }
    case "end": {
      const t = span(frame, 4, 18), cta = content.cta ?? brand?.cta?.text, url = content.url ?? brand?.cta?.url;
      body = <div style={{ ...pad, alignItems: "center", textAlign: "center", gap: 3.4 * u }}>
        <div style={{ opacity: t, transform: `scale(${.92 + .08 * t})`, filter: t < 1 ? `blur(${(1 - t) * 1.6 * u}px)` : undefined }}>
          {brand?.mark ? <img src={brand.mark.src} alt={brand.mark.alt || brand.name} style={{ height: 16 * u, width: "auto", objectFit: "contain" }} />
            : <div style={{ ...TITLE, font: `800 ${13 * u}px/1 ${DISPLAY}`, color: ink }}>{brand?.name}</div>}
        </div>
        {content.line && <div style={{ font: `560 ${4.6 * u}px/1.3 ${BODY}`, color: soft, opacity: span(frame, 14, 10) }}>{content.line}</div>}
        {cta && <div style={{ marginTop: 1.6 * u, padding: `${2.4 * u}px ${6 * u}px`, borderRadius: 8 * u, background: fill, color: onFill, font: `750 ${5.6 * u}px/1 ${DISPLAY}`,
          opacity: span(frame, 22, 10), transform: `translateY(${(1 - span(frame, 22, 10)) * 2 * u}px)` }}>{cta}</div>}
        {url && <div style={{ font: `600 ${4 * u}px/1.2 ${BODY}`, color: soft, opacity: span(frame, 30, 10) }}>{url}</div>}
      </div>;
      break;
    }
  }
  return <div data-km-film-card={content.card} style={bg}>{body}</div>;
}

/** The brand's small corner mark, shown over every scene but the end card. */
export function BrandBug({ brand, width, height, safeInset }: { brand: FilmBrand; width: number; height: number; safeInset?: FilmCardSafeInset }) {
  const u = Math.min(width, height) / 100;
  return <div data-km-brand-bug="" aria-label={brand.name} style={{ position: "absolute", top: `${Math.max(safeInset?.top ?? 0, .05) * 100}%`, right: `${Math.max(safeInset?.right ?? 0, .05) * 100}%`, display: "flex", alignItems: "center", gap: u,
    padding: `${.7 * u}px ${1.6 * u}px`, borderRadius: 3 * u, background: "rgba(10,12,16,.45)", backdropFilter: "blur(6px)", pointerEvents: "none" }}>
    {brand.mark ? <img src={brand.mark.src} alt="" style={{ height: 3.6 * u, width: "auto" }} />
      : <><span aria-hidden="true" style={{ width: 1.6 * u, height: 1.6 * u, borderRadius: "50%", background: brand.color }} /><span style={{ font: `700 ${2.8 * u}px/1 ${DISPLAY}`, color: "#f4f5f7" }}>{brand.name}</span></>}
  </div>;
}
