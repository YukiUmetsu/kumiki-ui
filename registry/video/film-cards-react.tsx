/** Draws a card scene: kinetic type that lands fast and then holds still, over a moving graphic layer, in the brand's colours and the
 * film's look (display font, case and tracking come from the look's CSS variables). Each card stands on one of three grounds, the brand's
 * colour, light paper or dark, so a run of cards is colour-blocked rather than a deck of the same slide. Sizes follow the frame's short
 * side, so a card reads the same in landscape and vertical. Pure function of `frame`.
 *
 * Research (doc 32, §1, §4): the opening needs bold imagery and the message in the first seconds (Google and Ipsos, ABCD, about 17,000
 * ads; TikTok's creative guidance); text that keeps moving while it is read lowers comprehension, so the words land and hold while the
 * graphics behind them move.
 */
import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { CARD_ENTER, cardCues, itemGap, PROOF_COUNT_FRAMES, proofLabel, proofTiming, readingWords } from "./film-cards";
import type { CardGround, FilmBrand, FilmCardContent } from "./film-cards";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const out3 = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const span = (frame: number, start: number, length: number) => out3((frame - start) / length);
/** A fast landing with a little overshoot: for words and shapes that slam into place. */
const backOut = (t: number) => { const x = clamp01(t) - 1; return 1 + 2.2 * x * x * x + 1.2 * x * x; };
const DISPLAY = "var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", BODY = "var(--km-font-body, system-ui, sans-serif)";
/** Relative luminance of a #rrggbb colour, or undefined for any other form. */
function luminance(color: string): number | undefined {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return undefined;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
/** The brand colour as text on a ground: moved step by step toward white on a dark ground, or toward black on a light one, until it reads
 * at 4.5:1 (WCAG AA). Fills (the call to action, the bars) keep the true colour. Colours that are not #rrggbb are used as given. */
export function readableOn(color: string, ground: string, min = 4.5): string {
  const back = luminance(ground) ?? luminance("#0f1216")!, toward = back > .4 ? 0 : 255;
  for (let k = 0; k <= 1.001; k += .1) {
    const mixed = k ? `#${[0, 2, 4].map(i => Math.round(parseInt(color.slice(1 + i, 3 + i), 16) * (1 - k) + toward * k).toString(16).padStart(2, "0")).join("")}` : color, l = luminance(mixed);
    if (l === undefined) return color;
    if ((Math.max(l, back) + .05) / (Math.min(l, back) + .05) >= min) return mixed;
  }
  return toward ? "#ffffff" : "#000000";
}
/** Text on a brand-colour fill when the brand sets no ink: white or a near-black, whichever reads better. */
export function inkOn(fill: string): string {
  const l = luminance(fill);
  return l === undefined || 1.05 / (l + .05) >= (l + .05) / (luminance("#14161a")! + .05) ? "#ffffff" : "#14161a";
}
const alpha = (hex: string, a: number) => { const m = /^#([0-9a-f]{6})$/i.exec(hex)?.[1]; return m ? `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})` : hex; };

/** Every colour a card uses, from its ground. `accent` is brand-coloured text that reads on the ground; `fill` and `onFill` are a block of
 * colour and the text on it (on the brand's own ground the block is the ink, so it still stands out). */
interface Palette { ground: CardGround; base: string; ink: string; soft: string; accent: string; fill: string; onFill: string; line: string; deco: string; decoAlpha: number; surface: string; border: string; empty: string; light: boolean }
export function cardPalette(ground: CardGround, brand?: FilmBrand): Palette {
  const brandFill = brand?.color ?? "#7cc6ff", brandInk = brand?.ink ?? inkOn(brandFill);
  if (ground === "brand") {
    const light = (luminance(brandInk) ?? 1) < .3;
    // On a saturated colour even the ink only just reads, so secondary text keeps the full ink and steps down in size and weight.
    return { ground, base: brandFill, ink: brandInk, soft: brandInk, accent: brandInk, fill: brandInk, onFill: brandFill, line: alpha(brandInk, .22), deco: brandInk, decoAlpha: .09,
      surface: light ? "rgba(255,255,255,.34)" : "rgba(0,0,0,.16)", border: alpha(brandInk, .14), empty: alpha(brandInk, .2), light };
  }
  if (ground === "light") {
    const base = "#f3efe7";
    return { ground, base, ink: "#15171b", soft: "rgba(21,23,27,.68)", accent: readableOn(brandFill, base), fill: brandFill, onFill: brandInk, line: "rgba(21,23,27,.12)", deco: brandFill, decoAlpha: .16,
      surface: "#ffffff", border: "rgba(21,23,27,.07)", empty: "rgba(21,23,27,.14)", light: true };
  }
  const base = brand?.background ?? "#0f1216";
  return { ground, base, ink: "#f4f5f7", soft: "rgba(236,239,244,.72)", accent: readableOn(brandFill, base), fill: brandFill, onFill: brandInk, line: "rgba(255,255,255,.14)", deco: brandFill, decoAlpha: .2,
    surface: "rgba(255,255,255,.055)", border: "rgba(255,255,255,.09)", empty: "rgba(255,255,255,.16)", light: false };
}
export interface FilmCardSafeInset { left: number; right: number; top: number; bottom: number }
const TITLE: CSSProperties = { fontFamily: DISPLAY, letterSpacing: "var(--km-title-tracking, -.025em)", textTransform: "var(--km-title-case, none)" as CSSProperties["textTransform"] };

/** The graphic layer behind the words: a large disc, a ring arc and a dot grid in the ground's decor colour, placed by a seed so cards
 * differ, popping in as the card starts and then drifting and turning slowly. It is the card's motion; the words stay still. */
function Decor({ seed, frame, fps, palette, width, height, u }: { seed: number; frame: number; fps: number; palette: Palette; width: number; height: number; u: number }) {
  const t = frame / Math.max(1, fps), pop = (delay: number) => backOut((frame - delay) / 14);
  const corners = [[.86, .16], [.12, .84], [.9, .82], [.1, .14]] as const, k = seed % 4;
  const [dx, dy] = corners[k], [rx, ry] = corners[(k + 1) % 4], [gx, gy] = corners[(k + 2) % 4], R = Math.max(width, height) * .3;
  const color = palette.deco, a = palette.decoAlpha;
  return <svg aria-hidden="true" data-km-illustration-region="art" width={width} height={height} style={{ position: "absolute", inset: 0 }}>
    <circle cx={dx * width + Math.sin(t * .3 + seed) * 2 * u} cy={dy * height + Math.cos(t * .25 + seed) * 2 * u} r={R * pop(0) * (1 + .025 * Math.sin(t * .6))} fill={color} opacity={a} />
    <g transform={`translate(${rx * width} ${ry * height}) rotate(${t * 9 + seed * 40}) scale(${pop(4)})`}>
      <circle r={R * .62} fill="none" stroke={color} strokeWidth={1.3 * u} strokeLinecap="round" pathLength={1} strokeDasharray=".58 .42" opacity={a * 1.6} />
    </g>
    <g transform={`translate(${gx * width - 8 * u} ${gy * height - 6 * u + Math.sin(t * .4) * u})`} opacity={a * 2 * clamp01((frame - 6) / 10)}>
      {Array.from({ length: 20 }, (_, i) => <circle key={i} cx={(i % 5) * 4 * u} cy={Math.floor(i / 5) * 4 * u} r={.45 * u} fill={color} />)}
    </g>
  </svg>;
}

/** Words that slam into place one after another (scaled down from a little larger, with a moment of blur), then hold. The emphasis is
 * swiped with a block of colour once the line has landed, and its words turn to the colour that reads on the block. */
function Slam({ text, frame, start, emphasis, palette, swipeAt }: { text: string; frame: number; start: number; emphasis?: string; palette: Palette; swipeAt: number }) {
  const tokens = text.split(/(\s+)/), lit = new Set<number>();
  if (emphasis) {
    const at = text.indexOf(emphasis);
    let pos = 0;
    tokens.forEach((token, i) => { if (at >= 0 && pos < at + emphasis.length && pos + token.length > at && token.trim()) lit.add(i); pos += token.length; });
  }
  const swipe = out3((frame - swipeAt) / 10);
  let n = 0;
  return <>{tokens.map((token, i) => {
    if (!token.trim()) return token;
    const t = (frame - start - n++ * 2.5) / 8, e = backOut(t), done = t >= 1, on = lit.has(i);
    // The swipe is a true wipe: while it runs, a copy of the word in the colour that reads on the block rides on the block, clipped to its
    // edge, so no letter is ever in a colour that does not read on what is behind it. The copy is art to the text audit; once the block is
    // down, the word itself takes the block and its colour, so the landed line is one word, measured as drawn.
    const wiping = on && swipe > 0 && swipe < 1, landed = on && swipe >= 1;
    const blockFill = `linear-gradient(transparent 14%, ${palette.fill} 14%, ${palette.fill} 96%, transparent 96%)`;
    return <span key={i} {...!done || wiping ? { "data-km-text-entering": "" } : {}} style={{ position: "relative", display: "inline-block", transformOrigin: "0 85%", opacity: clamp01(t * 2.2),
      transform: done ? undefined : `translateY(${(1 - e) * 22}%) scale(${1.2 - .2 * e})`, filter: done || t < 0 ? undefined : `blur(${(1 - clamp01(t)) * 5}px)`,
      color: landed ? palette.onFill : palette.ink, ...landed ? { background: blockFill, padding: "0 .08em", margin: "0 -.08em" } : {} }}>{token}
      {wiping && <span aria-hidden="true" data-km-illustration-region="art" style={{ position: "absolute", inset: "0 -.08em", padding: "0 .08em", color: palette.onFill, background: blockFill, clipPath: `inset(0 ${(1 - swipe) * 100}% 0 0)` }}>{token}</span>}
    </span>;
  })}</>;
}

const STAR = "M12 2.4l2.95 6.06 6.65.86-4.88 4.62 1.24 6.6L12 17.34l-5.96 3.2 1.24-6.6L2.4 9.32l6.65-.86z";
/** Five stars filled to `value`, a fraction of a star included (4.8 fills four and four fifths). Each fill is a box that clips one star,
 * so nothing depends on SVG IDs that two cards on screen at once would share. */
function Stars({ value, size, label, empty }: { value: number; size: number; label: string; empty: string }) {
  return <div role="img" aria-label={label} style={{ display: "flex", gap: size * .14 }}>
    {[0, 1, 2, 3, 4].map(i => { const fill = Math.min(1, Math.max(0, value - i));
      return <div key={i} style={{ position: "relative", width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", inset: 0 }} aria-hidden="true"><path d={STAR} fill={empty} /></svg>
        <div style={{ position: "absolute", inset: 0, width: size * fill, overflow: "hidden" }}><svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={STAR} fill="#ffb81f" /></svg></div>
      </div>; })}
  </div>;
}
const initials = (name: string) => name.split(/[\s.]+/).filter(Boolean).map(word => word[0]).slice(0, 2).join("").toUpperCase();
const seedOf = (text: string) => { let h = 7; for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

export interface FilmCardProps { content: FilmCardContent; brand?: FilmBrand; frame: number; fps: number; width: number; height: number;
  /** The output's safe area, as fractions of the frame: the card keeps its words inside it. */
  safeInset?: FilmCardSafeInset }
/** The ground a card stands on when it does not set one: the end card on the brand's colour, the rest dark. */
const defaultGround = (content: FilmCardContent): CardGround => content.ground ?? (content.card === "end" ? "brand" : "dark");
/** One card at one frame. */
export function FilmCard({ content, brand, frame, fps, width, height, safeInset }: FilmCardProps) {
  // A vertical frame has height to spare, so its type runs a little larger than the short side alone would give.
  const vertical = height > width, u = Math.min(width, height) / 100 * (vertical ? 1.12 : 1), uid = useId().replace(/:/g, "");
  const p = cardPalette(defaultGround(content), brand), { ink, soft, accent, fill, onFill } = p;
  // A little inside the safe line, so a look's handheld or weave cannot nudge the words across it.
  const inset = (side: keyof FilmCardSafeInset, least: number) => Math.max((safeInset?.[side] ?? 0) + .015, least);
  const pad: CSSProperties = { position: "absolute", left: `${inset("left", .08) * 100}%`, right: `${inset("right", .08) * 100}%`, top: `${inset("top", vertical ? .12 : .11) * 100}%`, bottom: `${inset("bottom", vertical ? .14 : .12) * 100}%`,
    display: "flex", flexDirection: "column", justifyContent: "center" };
  const seed = seedOf(JSON.stringify(content).slice(0, 80));
  let body: ReactNode, decor = true;
  switch (content.card) {
    case "headline": {
      const landed = cardCues(content, fps)[0].frame, size = content.text.length > 40 ? 9.4 : content.text.length > 22 ? 12.2 : 14.6;
      body = <div style={pad}>
        {content.kicker && <div style={{ alignSelf: "flex-start", font: `760 ${3.2 * u}px/1 ${DISPLAY}`, letterSpacing: ".12em", textTransform: "uppercase", color: onFill, background: fill,
          padding: `${1 * u}px ${1.8 * u}px`, borderRadius: .8 * u, marginBottom: 3.4 * u, transformOrigin: "0 50%", transform: `scaleX(${backOut((frame - 1) / 9)})`, opacity: clamp01(frame / 4) }}>{content.kicker}</div>}
        <div style={{ ...TITLE, font: `800 ${size * u}px/1.0 ${DISPLAY}`, textWrap: "balance" } as CSSProperties}>
          <Slam text={content.text} frame={frame} start={3} emphasis={content.emphasis} palette={p} swipeAt={landed} />
        </div>
      </div>;
      break;
    }
    case "list": {
      const gap = itemGap(content.items, fps), cues = cardCues(content, fps), current = Math.max(0, cues.filter(c => c.id.startsWith("item-") && frame >= c.frame).length - 1);
      const head = span(frame, 0, 10);
      body = <div style={{ ...pad, justifyContent: vertical ? "center" : "center" }}>
        <div style={{ ...TITLE, font: `800 ${(content.title.length > 32 ? 6.6 : 7.8) * u}px/1.04 ${DISPLAY}`, color: ink, textWrap: "balance", marginBottom: 4.6 * u, opacity: head, transform: `translateY(${(1 - head) * 2 * u}px)` } as CSSProperties}>{content.title}</div>
        <div style={{ display: "grid", gap: (vertical ? 3.4 : 2.2) * u, perspective: `${80 * u}px` }}>
          {content.items.map((item, i) => {
            const t = (frame - CARD_ENTER - 10 - i * gap) / 12, e = backOut(t), now = i === current;
            // Each row swings in from the right and lands square; the one being said carries the brand's bar and colour.
            // Tagged so a container transform can grow the next scene out of this row, measured where it is drawn.
            return <div key={i} data-km-film-subject={`item-${i + 1}`} {...t < 1 ? { "data-km-text-entering": "" } : {}} style={{ position: "relative", display: "flex", alignItems: "center", gap: 3.2 * u,
              padding: `${1.6 * u}px ${2.4 * u}px ${1.6 * u}px ${2.8 * u}px`, borderRadius: 1.6 * u, background: now ? p.surface : "transparent", boxShadow: now && p.light ? `0 ${.6 * u}px ${2.4 * u}px rgba(0,0,0,.08)` : undefined,
              opacity: clamp01(t * 2), transformOrigin: "100% 50%", transform: t >= 1 ? undefined : `translateX(${(1 - e) * 14 * u}px) rotateY(${(1 - e) * -28}deg)` }}>
              <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 1.2 * u, bottom: 1.2 * u, width: .8 * u, borderRadius: u, background: fill, transformOrigin: "50% 0", transform: `scaleY(${now ? out3((frame - CARD_ENTER - 10 - i * gap - 6) / 8) : 0})` }} />
              <span style={{ font: `850 ${(vertical ? 11 : 9.4) * u}px/.9 ${DISPLAY}`, color: now ? accent : soft, fontVariantNumeric: "tabular-nums", minWidth: (vertical ? 13 : 11) * u, letterSpacing: "-.04em" }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ font: `680 ${(vertical ? 6.2 : 5.4) * u}px/1.15 ${BODY}`, color: now ? ink : soft, textWrap: "pretty" } as CSSProperties}>{item}</span>
            </div>;
          })}
        </div>
        <div style={{ marginTop: 4 * u, display: "flex", gap: 1.2 * u }} aria-hidden="true">
          {content.items.map((_, i) => <div key={i} style={{ width: 7 * u, height: .8 * u, borderRadius: u, background: i <= current && frame >= CARD_ENTER + 10 ? fill : p.empty }} />)}
        </div>
      </div>;
      break;
    }
    case "versus": {
      // A split screen: the old way on a muted half, the new way on a half of the brand's colour that wipes across from the divider when
      // its moment comes, and a badge on the seam that says one becomes the other.
      decor = false;
      const [, right] = cardCues(content, fps), struck = content.strike ? span(frame, right.frame + 8, 14) : 0, wipe = out3((frame - right.frame + 4) / 14), badge = backOut((frame - right.frame - 6) / 10);
      const muted = p.light ? "#e2ddd3" : "#23262c", mutedInk = p.light ? "rgba(21,23,27,.62)" : "rgba(236,239,244,.66)", newInk = inkOn(fill), panel = (side: "left" | "right") => {
        const data = content[side], mine = side === "right", t = span(frame, mine ? right.frame : CARD_ENTER, 10);
        const outer = vertical ? { top: mine ? 7 * u : inset("top", .1) * height, bottom: mine ? inset("bottom", .14) * height : 7 * u } : { top: inset("top", .11) * height, bottom: inset("bottom", .12) * height };
        // Room at the seam for the badge that sits on it.
        const sides = vertical ? { left: inset("left", .08) * width, right: inset("right", .08) * width } : { left: mine ? 8.5 * u : inset("left", .08) * width, right: mine ? inset("right", .08) * width : 8.5 * u };
        // The old way holds the whole frame until the new way arrives; then the frame splits. Its words keep the width of a half from the
        // start, so the split never rewraps or moves them.
        const share = 100 - 50 * wipe;
        return <div style={{ position: "absolute", ...vertical ? { left: 0, right: 0, top: mine ? "50%" : 0, height: mine ? "50%" : `${share}%` } : { top: 0, bottom: 0, left: mine ? "50%" : 0, width: mine ? "50%" : `${share}%` },
          background: mine ? fill : muted, clipPath: mine ? (vertical ? `inset(0 0 ${(1 - wipe) * 100}% 0)` : `inset(0 ${(1 - wipe) * 100}% 0 0)`) : undefined }}>
          <div style={{ position: "absolute", left: sides.left, top: outer.top, ...vertical ? { right: sides.right, height: height / 2 - outer.top - outer.bottom } : { width: width / 2 - sides.left - sides.right, bottom: outer.bottom },
            display: "flex", flexDirection: "column", justifyContent: vertical && mine ? "flex-start" : "center", opacity: t, transform: `translateY(${(1 - t) * 2 * u}px)` }}>
            <div style={{ alignSelf: "flex-start", padding: `${.9 * u}px ${2 * u}px`, borderRadius: .8 * u, font: `800 ${3.4 * u}px/1.1 ${DISPLAY}`, letterSpacing: ".1em", textTransform: "uppercase",
              background: mine ? newInk : "rgba(0,0,0,.08)", color: mine ? fill : mutedInk, marginBottom: 3 * u }}>{data.label}</div>
            {data.items.map((item, i) => <div key={i} style={{ font: `${mine ? 760 : 560} ${(mine ? (vertical ? 5 : 6) : (vertical ? 4.6 : 5.4)) * u}px/1.18 ${mine ? DISPLAY : BODY}`, color: mine ? newInk : mutedInk, marginBottom: (vertical ? 1.6 : 2.2) * u, letterSpacing: mine ? "-.01em" : undefined }}>
              {/* The strike is drawn per line: an inline background, cloned onto every line the item wraps to, growing left to right. */}
              {!mine && content.strike ? <span data-km-text-struck="" style={{ backgroundImage: "linear-gradient(currentColor, currentColor)", backgroundRepeat: "no-repeat", backgroundPosition: "0 58%",
                backgroundSize: `${struck * 100}% ${Math.max(2, .45 * u)}px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{item}</span> : item}
            </div>)}
          </div>
        </div>;
      };
      body = <>
        {panel("left")}
        {panel("right")}
        <div aria-hidden="true" style={{ position: "absolute", left: vertical ? "50%" : "50%", top: "50%", width: 11 * u, height: 11 * u, marginLeft: -5.5 * u, marginTop: -5.5 * u, borderRadius: "50%",
          background: p.light ? "#15171b" : "#f4f5f7", color: p.light ? "#f4f5f7" : "#15171b", display: "grid", placeItems: "center", font: `800 ${5.6 * u}px/1 ${DISPLAY}`,
          transform: `scale(${badge}) rotate(${(1 - clamp01(badge)) * -90}deg)`, boxShadow: `0 ${.6 * u}px ${2.4 * u}px rgba(0,0,0,.25)` }}>{vertical ? "↓" : "→"}</div>
      </>;
      break;
    }
    case "quote": {
      const t = span(frame, CARD_ENTER, 14), stars = content.rating ? Math.min(content.rating, (frame - CARD_ENTER - 20) / 6) : 0;
      const ratingRow = content.rating !== undefined && <div style={{ marginBottom: 2.6 * u, opacity: span(frame, CARD_ENTER + 14, 8), display: "flex", alignItems: "center", gap: 1.2 * u }}>
        <Stars value={Math.max(0, stars)} size={5 * u} label={`${content.rating} out of 5`} empty={p.empty} />
        <span style={{ font: `700 ${4.4 * u}px/1 ${BODY}`, fontVariantNumeric: "tabular-nums", color: ink }}>{content.rating.toFixed(1)}</span>
      </div>;
      body = <div style={pad}>
        <div aria-hidden="true" data-km-illustration-region="art" style={{ font: `800 ${26 * u}px/0.6 Georgia, serif`, color: accent, opacity: span(frame, 0, 8), height: 12 * u, transform: `scale(${backOut(frame / 10)})`, transformOrigin: "0 50%" }}>“</div>
        {ratingRow}
        <div style={{ font: `620 ${(content.quote.length > 110 ? 5.6 : 7) * u}px/1.25 ${DISPLAY}`, color: ink, opacity: t, transform: `translateY(${(1 - t) * 2 * u}px)`, textWrap: "pretty", letterSpacing: "-.01em" } as CSSProperties}>{content.quote}</div>
        <div style={{ marginTop: 4 * u, display: "flex", alignItems: "center", gap: 2.4 * u, opacity: span(frame, CARD_ENTER + 10, 10) }}>
          <div aria-hidden="true" style={{ flex: "none", width: 9 * u, height: 9 * u, borderRadius: "50%", background: fill, color: onFill, display: "grid", placeItems: "center", font: `700 ${3.8 * u}px/1 ${DISPLAY}` }}>
            {initials(content.name)}</div>
          <div style={{ minWidth: 0 }}><div style={{ font: `700 ${4.2 * u}px/1.2 ${BODY}`, color: ink }}>{content.name}</div>{content.role && <div style={{ font: `500 ${3.4 * u}px/1.3 ${BODY}`, color: soft }}>{content.role}</div>}</div>
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
        const t = (frame - enters[i]) / 12, e = backOut(t), stars = item.rating !== undefined ? Math.min(item.rating, Math.max(0, (frame - enters[i] - 8) / 3)) : undefined;
        const starRow = stars !== undefined && <Stars value={stars} size={(vertical ? 3 : 3.4) * pu} label={`${item.rating} out of 5`} empty={p.empty} />;
        const who = <figcaption style={{ display: "flex", alignItems: "center", gap: 1.8 * pu, minWidth: 0 }}>
          <div aria-hidden="true" style={{ flex: "none", width: 7 * pu, height: 7 * pu, borderRadius: "50%", background: fill, color: onFill, display: "grid", placeItems: "center", font: `700 ${3 * pu}px/1 ${DISPLAY}` }}>{initials(item.name)}</div>
          <div style={{ minWidth: 0 }}><div style={{ font: `700 ${3.4 * pu}px/1.2 ${BODY}`, color: ink }}>{item.name}</div>{item.role && <div style={{ font: `500 ${2.9 * pu}px/1.3 ${BODY}`, color: soft }}>{item.role}</div>}</div>
        </figcaption>;
        const words = <blockquote style={{ margin: 0, flex: 1, font: `620 ${(readingWords(item.quote) > 11 ? 3.9 : 4.4) * pu}px/1.28 ${BODY}`, color: ink, textWrap: "pretty" } as CSSProperties}>“{item.quote}”</blockquote>;
        return <figure key={i} {...t < 1 ? { "data-km-text-entering": "" } : {}} style={{ margin: 0, flex: vertical ? "none" : "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 2.2 * pu, padding: `${3 * pu}px ${3.2 * pu}px`,
          borderRadius: 2.4 * pu, background: p.surface, border: `1px solid ${p.border}`, boxShadow: `0 ${pu}px ${4 * pu}px rgba(0,0,0,${p.light ? .08 : .25})`, opacity: clamp01(t * 2),
          transform: t >= 1 ? undefined : `translateY(${(1 - e) * 6 * pu}px) rotate(${(1 - e) * (i % 2 ? 2 : -2)}deg)` }}>
          {vertical ? <><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 * pu }}>{who}{starRow}</div>{words}</> : <>{starRow}{words}{who}</>}
        </figure>;
      });
      const sum = content.total, counted = total === undefined ? 0 : span(frame, total, PROOF_COUNT_FRAMES), shown = total === undefined ? 0 : backOut((frame - total) / 12);
      body = <div style={{ ...pad, gap: 4 * pu }}>
        <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: (vertical ? 2.2 : 2.6) * pu, alignItems: "stretch" }}>{quotes}</div>
        {sum && <div style={{ display: "flex", alignItems: "center", gap: 3.2 * pu, opacity: clamp01((frame - (total ?? 0)) / 6), transform: `scale(${shown})`, transformOrigin: "0 50%" }}>
          <div style={{ ...TITLE, font: `850 ${13 * pu}px/1 ${DISPLAY}`, color: accent, fontVariantNumeric: "tabular-nums" }}>{(sum.rating * counted).toFixed(1)}</div>
          <div style={{ display: "grid", gap: 1.2 * pu }}>
            <Stars value={sum.rating * counted} size={4.6 * pu} label={`${sum.rating} out of 5`} empty={p.empty} />
            <div style={{ font: `700 ${4.2 * pu}px/1.2 ${BODY}`, color: ink }}>{proofLabel(sum)}</div>
            {content.source && <div style={{ font: `500 ${Math.max(2.6 * pu, 2.5 * u * .92)}px/1.3 ${BODY}`, color: soft }}>{content.source}</div>}
          </div>
        </div>}
      </div>;
      break;
    }
    case "end": {
      const t = backOut((frame - 3) / 14), cta = content.cta ?? brand?.cta?.text, url = content.url ?? brand?.cta?.url, ctaIn = backOut((frame - 20) / 12);
      // The call to action lands, then sends out two slow pulses, so the last thing that moves is the thing to do.
      const pulse = (at: number) => { const q = clamp01((frame - at) / 30); return q > 0 && q < 1 ? <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: 8 * u, border: `${.5 * u}px solid ${fill}`, opacity: (1 - q) * .7, transform: `scale(${1 + q * .35}, ${1 + q * .9})` }} /> : null; };
      body = <div style={{ ...pad, alignItems: "center", textAlign: "center", gap: 3.6 * u }}>
        <div style={{ opacity: clamp01((frame - 3) / 6), transform: `scale(${.8 + .2 * t})`, filter: t < 1 ? `blur(${(1 - clamp01(t)) * 1.6 * u}px)` : undefined }}>
          {brand?.mark ? <img src={brand.mark.src} alt={brand.mark.alt || brand.name} style={{ height: 18 * u, width: "auto", objectFit: "contain" }} />
            : <div style={{ ...TITLE, font: `850 ${15 * u}px/1 ${DISPLAY}`, color: ink }}>{brand?.name}</div>}
        </div>
        {content.line && <div style={{ font: `620 ${4.8 * u}px/1.3 ${BODY}`, color: soft, opacity: span(frame, 14, 10), maxWidth: "90%", textWrap: "balance" } as CSSProperties}>{content.line}</div>}
        {cta && <div style={{ position: "relative", marginTop: 1.6 * u, opacity: clamp01((frame - 20) / 5), transform: `scale(${ctaIn})` }}>
          {pulse(40)}{pulse(78)}
          <div style={{ position: "relative", padding: `${2.6 * u}px ${7 * u}px`, borderRadius: 8 * u, background: fill, color: onFill, font: `800 ${6 * u}px/1 ${DISPLAY}`, boxShadow: `0 ${u}px ${4 * u}px rgba(0,0,0,.22)` }}>{cta}</div>
        </div>}
        {url && <div style={{ font: `650 ${4.2 * u}px/1.2 ${BODY}`, color: soft, opacity: span(frame, 30, 10) }}>{url}</div>}
      </div>;
      break;
    }
  }
  return <div data-km-film-card={content.card} data-km-card-ground={p.ground} style={{ position: "absolute", inset: 0, overflow: "hidden", background: p.base, color: ink }}>
    {decor && <Decor seed={seed} frame={frame} fps={fps} palette={p} width={width} height={height} u={u} />}
    {/* Film grain over the ground, so the colour fields read as printed, not as flat fills. */}
    <svg aria-hidden="true" data-km-illustration-region="art" width={width} height={height} style={{ position: "absolute", inset: 0, mixBlendMode: p.light ? "multiply" : "screen", opacity: p.light ? .5 : .35 }}>
      <filter id={`${uid}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} seed={seed % 97} /><feColorMatrix values={p.light ? "0 0 0 0 .2  0 0 0 0 .18  0 0 0 0 .15  0 0 0 .22 0" : "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .1 0"} /></filter>
      <rect width={width} height={height} filter={`url(#${uid}-grain)`} />
    </svg>
    {body}
  </div>;
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
