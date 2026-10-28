/**
 * Timeline Journey. History as an edited programme:
 *   anchor     the period is established: rail draws on, the first year sets, the title rises
 *   events     each dated plate arrives by a motivated move (a lateral truck along time, a
 *              match cut on the focus, a dissolve or a cut) while the playhead travels the rail
 *              and the year rolls to its date; title, caption and source land in a fixed lane
 *   summary    every plate returns as a contact sheet beside the elapsed span: the change
 *              across the period, not a decorative end card.
 * One frame clock, pure functions of the frame, no timers or state.
 */
import { useContext, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ImageAsset, SceneTemplateFrame, SceneTemplateSpec, TimelineGrade, TimelineJourneyEvent } from "../scene-templates";
import type { AnnotationBeats } from "../subject-annotations";
import { annotationState, coverPoint } from "../subject-annotations";
import { SubjectAnnotationLayer } from "../subject-annotations-react";
import { digitGlyphs, elapsedYears, fitTextSize, formatTimelineDate, formatTimelineRange, odometerColumns, resolveTimelineDate,
  spanParts, textWidthEm, timelineGraduations, timelineJourneySchedule, timelineRailPositions, yearParts } from "../timeline-journey";
import type { ReadoutPart, ResolvedTimelineDate } from "../timeline-journey";
import { Asset, FilmFinish, KineticWords, OverlayRendererContext, clamp01, cinematicEase, easeInOut, expoOut, span01, srOnly } from "./stage-kit";

type Rect = { x: number; y: number; w: number; h: number };
type Kb = { s: number; tx: number; ty: number };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeIn = (n: number) => { const t = clamp01(n); return t * t * t; };

/** Composition-pixel layout. Landscape keeps a copy lane left of a plate window; portrait stacks them. */
export function timelineJourneyLayout(W: number, H: number) {
  const wide = W / H >= 1.2;
  return wide
    ? { wide, plate: { x: W * .405, y: H * .075, w: W * .555, h: H * .64 }, windowX: W * .372,
        copy: { x: W * .055, y: H * .085, w: W * .305, bottom: H * .715 }, rail: { x0: W * .055, x1: W * .945, y: H * .825 } }
    : { wide, plate: { x: W * .06, y: H * .04, w: W * .88, h: H * .4 }, windowX: 0,
        copy: { x: W * .07, y: H * .475, w: W * .86, bottom: H * .862 }, rail: { x0: W * .07, x1: W * .93, y: H * .905 } };
}

/** Ken Burns with intent: the view centre travels from the plate centre to the subject's focus. */
function kenBurns(e: TimelineJourneyEvent, pw: number, ph: number, k: number, extra = 1): Kb {
  const img = e.image ?? {}, f = e.focus;
  const F = f ? coverPoint({ x: f.x + (f.width ?? 0) / 2, y: f.y + (f.height ?? 0) / 2 }, img, pw, ph) : { x: pw / 2, y: ph / 2 };
  let end = 1.16;
  if (f?.width && f.height) {
    const a = coverPoint({ x: f.x, y: f.y }, img, pw, ph), b = coverPoint({ x: f.x + f.width, y: f.y + f.height }, img, pw, ph);
    end = Math.max(1.06, Math.min(1.45, Math.min(pw / ((b.x - a.x) * 1.35), ph / ((b.y - a.y) * 1.35))));
  }
  const C = { x: pw / 2, y: ph / 2 }, dir = e.kenBurns ?? "in";
  const [s0, s1, c0, c1] = dir === "out" ? [end, 1.03, F, C] : dir === "none" ? [1.05, 1.05, C, C] : [1.03, end, C, F];
  const s = lerp(s0, s1, k) * extra, cx = lerp(c0.x, c1.x, k), cy = lerp(c0.y, c1.y, k);
  return clampKb({ s, tx: pw / 2 - s * cx, ty: ph / 2 - s * cy }, pw, ph);
}
/** No blank edges: the scaled image always covers the plate. */
const clampKb = (k: Kb, pw: number, ph: number): Kb => ({ s: k.s,
  tx: Math.max(pw - k.s * pw, Math.min(0, k.tx)), ty: Math.max(ph - k.s * ph, Math.min(0, k.ty)) });

function gradeFilter(g: TimelineGrade): string {
  const i = g.intensity ?? .5;
  if (g.mode === "mono") return `grayscale(1) contrast(${1 + .16 * i}) brightness(${1 - .05 * i})`;
  if (g.mode === "sepia") return `grayscale(1) sepia(${.42 * i}) contrast(${1 + .12 * i}) brightness(${1 - .04 * i})`;
  return `saturate(${1 - .3 * i}) sepia(${.16 * i}) contrast(${1 + .07 * i})`;
}

/** One rolling digit column: a strip 0–9 plus a wrap 0, clipped to one line. */
function DigitColumn({ pos, glyphs, blur }: { pos: number; glyphs: string[]; blur: number }) {
  const p = ((pos % 10) + 10) % 10;
  return <span aria-hidden="true" style={{ display: "inline-block", height: "1.08em", overflow: "hidden", verticalAlign: "top", width: "1ch", textAlign: "center",
    maskImage: "linear-gradient(transparent,#000 9%,#000 91%,transparent)", WebkitMaskImage: "linear-gradient(transparent,#000 9%,#000 91%,transparent)" }}>
    <span style={{ display: "block", transform: `translate3d(0,${(-p * 1.08).toFixed(4)}em,0)`, filter: blur > .002 ? `blur(${blur.toFixed(3)}em)` : undefined }}>
      {[...glyphs, glyphs[0]].map((g, i) => <span key={i} style={{ display: "block", height: "1.08em", lineHeight: "1.08em" }}>{g}</span>)}
    </span>
  </span>;
}
/** Readout parts with the digits as an odometer. `columns` are odometer positions per digit. */
function OdometerParts({ parts, columns, glyphs, blur }: { parts: ReadoutPart[]; columns: number[]; glyphs: string[]; blur: number[] }) {
  let col = 0;
  return <>{parts.map((part, i) => part.type === "text"
    ? <span key={i} data-km-tj-readout-text="" style={{ fontSize: ".42em", fontWeight: 600, letterSpacing: ".02em", verticalAlign: "top", lineHeight: "2.57em", whiteSpace: "pre" }}>{part.value}</span>
    : <span key={i} style={{ whiteSpace: "nowrap" }}>{[...part.value].map((_, j) => { const k = col++; return <DigitColumn key={j} pos={columns[k]} glyphs={glyphs} blur={blur[k] ?? 0}/>; })}</span>)}</>;
}
const digitsOf = (parts: ReadoutPart[], glyphs: string[]) => {
  const s = parts.filter(p => p.type === "digits").map(p => p.value).join("");
  return { count: [...s].length, value: Number([...s].map(ch => Math.max(0, glyphs.indexOf(ch))).join("") || 0) };
};
const sameShape = (a: ReadoutPart[], b: ReadoutPart[], glyphs: string[]) => digitsOf(a, glyphs).count === digitsOf(b, glyphs).count &&
  a.length === b.length && a.every((p, i) => p.type === b[i].type && (p.type === "digits" || p.value === b[i].value));

export function TimelineJourneyStage({ spec, f }: { spec: SceneTemplateSpec<"timeline-journey">; f: SceneTemplateFrame }) {
  const c = spec.content, W = spec.width, H = spec.height, t = f.frame, reduced = f.reducedMotion;
  const events = c.events as TimelineJourneyEvent[], n = events.length, locale = c.locale ?? "en";
  const L = timelineJourneyLayout(W, H), u = Math.min(W, H) / 100;
  /** Composition px → stage-relative length, so preview and export agree at any display size. */
  const q = (px: number) => `${(px * 100 / W).toFixed(3)}cqw`;
  const dates = useMemo(() => events.map(e => resolveTimelineDate(e) as ResolvedTimelineDate), [events]);
  const sched = useMemo(() => timelineJourneySchedule(spec), [spec]);
  const rail = useMemo(() => timelineRailPositions(dates, c.spacing), [dates, c.spacing]);
  const glyphs = useMemo(() => digitGlyphs(locale), [locale]);
  const chrono = useMemo(() => dates.map((d, i) => ({ d, i })).sort((a, b) => a.d.t - b.d.t), [dates]);
  const first = chrono[0].d, last = chrono[chrono.length - 1].d;
  const range = useMemo(() => formatTimelineRange(first, last, locale), [first, last, locale]);
  const overlay = useContext(OverlayRendererContext);
  const pal = c.palette ?? {}, look = c.look ?? {};
  const ink = `var(--km-tj-ink, ${pal.ink ?? "#f4efe4"})`, muted = `var(--km-tj-muted, ${pal.muted ?? "rgba(244,239,228,.74)"})`;
  const railInk = `var(--km-tj-rail, ${pal.rail ?? "rgba(244,239,228,.3)"})`, accent = "var(--km-accent, #e3b46a)";
  const fonts = { display: c.typography?.display ?? "var(--km-font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif)",
    text: c.typography?.text ?? "var(--km-font-sans, system-ui, -apple-system, 'Segoe UI', sans-serif)",
    numerals: c.typography?.numerals ?? "var(--km-font-sans, system-ui, -apple-system, 'Segoe UI', sans-serif)" };

  // ── Where are we in the programme ──────────────────────────────────────────
  const { anchorEnd, summaryStart, summaryArrive } = sched;
  const inSummary = t >= summaryStart, inAnchor = t < anchorEnd;
  const cur = inAnchor ? -1 : inSummary ? n - 1 : sched.events.reduce((k, b, i) => t >= b.start ? i : k, 0);
  const beat = cur >= 0 ? sched.events[cur] : undefined;
  const p = beat ? (beat.arrive > beat.start ? span01(t, beat.start, beat.arrive) : 1) : 0;
  const move = reduced ? (beat && t >= beat.cut ? 1 : 0) : easeInOut(p);
  /** The event whose copy is on screen: the handover happens at the cut. */
  const copyIndex = inSummary ? n : inAnchor ? -1 : beat && t < beat.cut ? cur - 1 : cur;
  const summaryMove = reduced ? (inSummary ? 1 : 0) : easeInOut(span01(t, summaryStart, summaryArrive));

  // ── Plates ─────────────────────────────────────────────────────────────────
  const R = L.plate, gap = 4 * u, D = R.w + gap;
  const life = (i: number) => {
    const b = sched.events[i], next = sched.events[i + 1];
    return reduced ? .5 : span01(t, b.start, next ? next.arrive : summaryStart);
  };
  const extraOut = (i: number) => { // match cut: the outgoing plate punches in on its focus before the cut
    const next = sched.events[i + 1];
    return !reduced && next?.transition === "match-cut" && t < next.cut ? 1 + .24 * easeIn(span01(t, next.start, next.cut)) : 1;
  };
  type Plate = { i: number; rect: Rect; opacity: number; kb: Kb; dim: number; clip?: number; thumb?: boolean };
  const plates: Plate[] = [];
  const plateAt = (i: number, rect: Rect, opacity = 1, dim = 0, clip?: number, kbOverride?: Kb): Plate =>
    ({ i, rect, opacity, dim, clip, kb: kbOverride ?? kenBurns(events[i], R.w, R.h, life(i), extraOut(i)) });
  if (!inAnchor && !inSummary && beat) {
    const i = cur, kind = i === 0 ? "reveal" : beat.transition;
    if (kind === "reveal") plates.push(plateAt(0, R, 1, 0, reduced ? (t >= beat.cut ? 1 : 0) : easeInOut(p)));
    else if (kind === "truck") {
      if (move < 1) plates.push(plateAt(i - 1, { ...R, x: R.x - D * move }, 1, .45 * move));
      plates.push(plateAt(i, { ...R, x: R.x + D * (1 - move) }, 1, .3 * (1 - move)));
    } else if (kind === "dissolve") {
      if (move < 1) plates.push(plateAt(i - 1, R));
      plates.push(plateAt(i, R, move));
    } else if (t < beat.cut) plates.push(plateAt(i - 1, R));
    else if (kind === "match-cut" && !reduced) {
      // Land the incoming focus exactly where the outgoing focus was at the cut, then settle.
      const outKb = kenBurns(events[i - 1], R.w, R.h, span01(beat.cut, sched.events[i - 1].start, beat.arrive), 1.24);
      const fo = events[i - 1].focus ?? { x: .5, y: .5 }, fi = events[i].focus ?? { x: .5, y: .5 };
      const po = coverPoint({ x: fo.x + (fo.width ?? 0) / 2, y: fo.y + (fo.height ?? 0) / 2 }, events[i - 1].image ?? {}, R.w, R.h);
      const pi = coverPoint({ x: fi.x + (fi.width ?? 0) / 2, y: fi.y + (fi.height ?? 0) / 2 }, events[i].image ?? {}, R.w, R.h);
      const screen = { x: outKb.tx + outKb.s * po.x, y: outKb.ty + outKb.s * po.y };
      const own = kenBurns(events[i], R.w, R.h, life(i));
      const s = own.s * 1.24, matched = clampKb({ s, tx: screen.x - s * pi.x, ty: screen.y - s * pi.y }, R.w, R.h);
      const k = easeInOut(span01(t, beat.cut, beat.arrive + 12));
      plates.push(plateAt(i, R, 1, 0, undefined, { s: lerp(matched.s, own.s, k), tx: lerp(matched.tx, own.tx, k), ty: lerp(matched.ty, own.ty, k) }));
    } else plates.push(plateAt(i, R));
  }
  // Summary: a contact sheet in the plate rect; the last plate shrinks into its cell.
  const grid = useMemo(() => {
    let best = { cols: 1, rows: n, score: Infinity };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols), cw = (R.w - gap * .6 * (cols - 1)) / cols, ch = (R.h - gap * .6 * (rows - 1)) / rows;
      const score = Math.abs(Math.log(cw / ch / 1.3)) + (rows * cols - n) * .08;
      if (score < best.score) best = { cols, rows, score };
    }
    const cw = (R.w - gap * .6 * (best.cols - 1)) / best.cols, ch = (R.h - gap * .6 * (best.rows - 1)) / best.rows;
    return chrono.map(({ i }, k) => ({ i, rect: { x: R.x + (k % best.cols) * (cw + gap * .6), y: R.y + Math.floor(k / best.cols) * (ch + gap * .6), w: cw, h: ch } }));
  }, [chrono, n, R.w, R.h, R.x, R.y, gap]);
  const thumbStart = (k: number) => summaryStart + 10 + k * Math.min(7, 42 / n);
  if (inSummary) grid.forEach((g, k) => {
    if (g.i === n - 1) {
      const r = { x: lerp(R.x, g.rect.x, summaryMove), y: lerp(R.y, g.rect.y, summaryMove), w: lerp(R.w, g.rect.w, summaryMove), h: lerp(R.h, g.rect.h, summaryMove) };
      const kb = kenBurns(events[g.i], R.w, R.h, life(g.i));
      plates.push({ ...plateAt(g.i, r, 1, 0, undefined, { s: lerp(kb.s, 1, summaryMove), tx: lerp(kb.tx, 0, summaryMove), ty: lerp(kb.ty, 0, summaryMove) }), thumb: true });
    } else {
      const a = reduced ? 1 : expoOut(span01(t, thumbStart(k), thumbStart(k) + 16));
      if (a > 0) plates.push({ ...plateAt(g.i, { ...g.rect, y: g.rect.y + (1 - a) * 3 * u }, a, 0, undefined, { s: 1, tx: 0, ty: 0 }), thumb: true });
    }
  });

  // ── Readout and date line ──────────────────────────────────────────────────
  const span = elapsedYears(first, last);
  const readout = (() => {
    const set = (parts: ReadoutPart[], start: number) => { // digits settle column by column into place
      const { count, value } = digitsOf(parts, glyphs), target = odometerColumns(value, count);
      return { parts, columns: target.map((d, k) => reduced ? d : d - (1 - expoOut(span01(t, start + k * 3, start + k * 3 + 22))) * 6), blur: target.map(() => 0) };
    };
    if (inSummary && c.summary?.span !== false) {
      const parts: ReadoutPart[] = typeof c.summary?.span === "string" ? [{ type: "text", value: c.summary.span }] : spanParts(span, locale);
      return { now: set(parts, summaryStart + 4), out: t < summaryStart + 12 ? { parts: yearParts(dates[n - 1].year, locale), fade: span01(t, summaryStart, summaryStart + 10) } : undefined };
    }
    if (inSummary || inAnchor || cur === 0 || !beat) return { now: set(yearParts(dates[Math.max(0, cur)].year, locale), 1) };
    const a = dates[cur - 1], b = dates[cur], pa = yearParts(a.year, locale), pb = yearParts(b.year, locale);
    if (!sameShape(pa, pb, glyphs) || a.year < 0 !== b.year < 0) {
      // Different digit count or era: a vertical crossfade instead of a roll.
      return t < beat.cut ? { now: { parts: pa, columns: odometerColumns(digitsOf(pa, glyphs).value, digitsOf(pa, glyphs).count), blur: [] }, fadeOut: move }
        : { now: set(pb, beat.cut), fadeIn: true };
    }
    const va = Math.abs(a.year), vb = Math.abs(b.year), count = digitsOf(pb, glyphs).count;
    const at = (x: number) => odometerColumns(lerp(va, vb, reduced ? (x >= beat.cut ? 1 : 0) : easeInOut(span01(x, beat.start, beat.arrive))), count);
    const now = at(t), ahead = at(t + .5), behind = at(t - .5);
    return { now: { parts: pb, columns: now, blur: reduced ? [] : now.map((_, k) => Math.min(.07, Math.abs(ahead[k] - behind[k]) * .035)) } };
  })();
  const dateLineFor = (i: number) => i < 0 || i >= n ? range : events[i].dateLabel ?? formatTimelineDate(dates[i], locale, c.dateFormat ?? "auto");
  const counterFor = (i: number) => {
    if (i < 0) return c.eyebrow ?? "";
    if (i >= n) return c.summary?.eyebrow ?? c.eyebrow ?? "";
    if (events[i].eyebrow !== undefined) return events[i].eyebrow!;
    const tpl = c.counter ?? "{index} / {count}", nf = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
    return tpl.replace("{index}", nf.format(i + 1)).replace("{count}", nf.format(n));
  };

  // ── Copy lane: one body at a time, handed over at the cut ───────────────────
  const CL = L.copy, wide = L.wide;
  const readoutPx = (wide ? 12.5 : 13.5) * u;
  const copyOut = beat && copyIndex === cur - 1 ? (reduced ? 0 : span01(t, beat.start, beat.start + Math.max(6, (beat.cut - beat.start) * .8))) : 0;
  const summaryOut = inSummary && t < summaryStart + 12 ? span01(t, summaryStart, summaryStart + 10) : 0;
  const leaving = inAnchor ? 0 : copyIndex === -1 ? (reduced ? 1 : span01(t, anchorEnd, anchorEnd + 12)) : Math.max(copyOut, copyIndex === n - 1 ? summaryOut : 0);
  const body = (() => {
    const i = copyIndex;
    if (i === n - 1 && inSummary && t >= summaryStart + 12) return null;
    const isAnchor = i < 0, isSummary = i >= n;
    const title = isAnchor ? c.narrative : isSummary ? c.summary?.statement ?? c.narrative : events[i].label;
    const caption = isAnchor ? undefined : isSummary ? c.summary?.detail : events[i].caption ?? events[i].description;
    const titleStart = isAnchor ? 4 : isSummary ? summaryStart + 14 : sched.events[i].cues.title;
    const captionStart = isSummary ? summaryStart + 26 : isAnchor ? 0 : sched.events[i].cues.caption;
    const base = isAnchor ? (wide ? 6.4 : 7) : (wide ? 5.2 : 5.6);
    const titlePx = fitTextSize(title, base * u, 3.6 * u, CL.w, isAnchor ? 4 : 3);
    const capPx = caption ? fitTextSize(caption, 3.1 * u, 2.45 * u, CL.w, wide ? 6 : 4) : 0;
    const units = caption ? Math.max(1, caption.split(/\s+/).length + [...caption].filter(ch => /[⺀-鿿]/.test(ch)).length) : 1;
    return <div data-km-tj-body={isAnchor ? "anchor" : isSummary ? "summary" : events[i].id} style={{ opacity: 1 - leaving, transform: `translate3d(0,${(-leaving * .6).toFixed(3)}em,0)` }}>
      <div aria-hidden="true" style={{ width: q(6 * u), height: q(.7 * u), background: accent, marginBottom: q(2.2 * u),
        transformOrigin: "0 50%", transform: `scaleX(${reduced ? 1 : cinematicEase(span01(t, titleStart - 2, titleStart + 16))})` }}/>
      <h2 data-km-tj-title="" style={{ margin: 0, fontFamily: fonts.display, fontSize: q(titlePx), fontWeight: 600, lineHeight: 1.08,
        letterSpacing: "-.012em", textWrap: "balance", color: ink, overflowWrap: "normal" }}>
        <KineticWords text={title} start={titleStart} stagger={2} length={16} frame={t} reduced={reduced} marker="tj-title"/>
      </h2>
      {caption && <p data-km-tj-caption="" style={{ margin: `${q(1.7 * u)} 0 0`, fontFamily: fonts.text, fontSize: q(capPx), lineHeight: 1.38,
        fontWeight: 450, color: muted, textWrap: "pretty", overflowWrap: "break-word" }}>
        <KineticWords text={caption} start={captionStart} stagger={Math.min(1.4, 26 / units)} length={14} frame={t} reduced={reduced} marker="tj-caption"/>
      </p>}
    </div>;
  })();
  const eyebrowText = counterFor(copyIndex);
  const dateLine = dateLineFor(copyIndex);
  const lineSwap = beat && cur > 0 && !inSummary ? (t < beat.cut ? 1 - copyOut : reduced ? 1 : span01(t, beat.cut, beat.cut + 10))
    : inSummary ? (t < summaryStart + 12 ? 1 - summaryOut : reduced ? 1 : span01(t, summaryStart + 12, summaryStart + 22))
    : copyIndex === 0 && beat ? (reduced ? 1 : span01(t, beat.cut, beat.cut + 10)) : copyIndex === -1 && beat ? 1 - span01(t, anchorEnd, beat.cut) : 1;
  const intro = reduced ? 1 : cinematicEase(span01(t, 0, 14));

  // ── Rail ───────────────────────────────────────────────────────────────────
  const RL = L.rail, rx = (pos: number) => lerp(RL.x0, RL.x1, pos);
  const draw = reduced ? 1 : easeInOut(span01(t, 0, 30));
  const head = inAnchor ? rail[0] : beat && cur > 0 && !inSummary ? lerp(rail[cur - 1], rail[cur], move) : rail[Math.max(0, cur)];
  const grads = c.spacing === "elapsed" && c.rail?.graduations !== false ? timelineGraduations(dates).marks : [];
  const labelPx = 2.45 * u, labelY = RL.y + 2.6 * u;
  const yearLabel = (i: number) => yearParts(dates[i].year, locale).map(p => p.value).join("");
  const labelBox = (i: number, align: "start" | "center" | "end") => {
    const w = textWidthEm(yearLabel(i)) * labelPx * 1.08, x = rx(rail[i]);
    return align === "start" ? [x, x + w] : align === "end" ? [x - w, x] : [x - w / 2, x + w / 2];
  };
  const firstI = chrono[0].i, lastI = chrono[chrono.length - 1].i;
  const boundsShown = (active: number) => [firstI, lastI].map(b => {
    if (c.rail?.labels === "none") return false;
    if (active < 0 || active >= n) return true;
    if (b === active) return false;
    const [a0, a1] = labelBox(active, "center"), [b0, b1] = labelBox(b, b === firstI ? "start" : "end");
    return a1 + 1.5 * u < b0 || b1 + 1.5 * u < a0;
  });
  const activeLabel = inSummary ? -1 : copyIndex;
  const prevBounds = boundsShown(beat && cur > 0 ? cur - 1 : -1), nowBounds = boundsShown(activeLabel);
  const labelMix = beat && cur > 0 && !inSummary ? lineSwap : 1;
  const tickFill = (i: number) => (inSummary || (!inAnchor && (i < cur || (i === cur && (move >= .5 || cur === 0))))) ;

  // ── Annotation beats and accessible state ──────────────────────────────────
  const beats: AnnotationBeats = { dock: anchorEnd, reveal: sched.events[0].arrive, resolve: summaryStart, durationFrames: f.durationFrames,
    steps: Object.fromEntries(sched.events.map(b => [events[b.index].id, b.arrive])) };
  const announce = copyIndex < 0 ? `${c.narrative}. ${range}.` : copyIndex >= n ? `${c.summary?.statement ?? c.narrative}. ${range}.`
    : [dateLineFor(copyIndex), events[copyIndex].label, events[copyIndex].caption ?? events[copyIndex].description, events[copyIndex].source].filter(Boolean).join(". ");
  const backdropOf = (i: number) => events[i]?.image;
  const backdrops: { i: number; o: number }[] = c.backdrop === "none" ? [] : inAnchor ? [] : inSummary
    ? [{ i: n - 1, o: 1 - summaryMove * .5 }]
    : beat && cur > 0 ? [{ i: cur - 1, o: 1 }, { i: cur, o: move }] : [{ i: 0, o: beat ? move : 0 }];

  return <div data-km-tj-stage="" data-km-tj-active={copyIndex} style={{ position: "absolute", inset: 0, overflow: "hidden", color: ink,
    background: `var(--km-tj-bg, ${pal.background ?? "radial-gradient(ellipse 90% 80% at 62% 40%,#1b1712 0%,#0d0b09 62%,#070605 100%)"})`, fontFamily: fonts.text }}>
    {/* Backdrop: the current plate, defocused and dark, gives the editorial space depth and colour. */}
    {backdrops.map(({ i, o }) => backdropOf(i) && o > 0 && <div key={"bg" + i} aria-hidden="true" style={{ position: "absolute", inset: "-8%", opacity: o * .55 }}>
      <Asset asset={backdropOf(i)} style={{ borderRadius: 0, filter: `blur(${q(3.4 * u)}) brightness(.42) saturate(.55)` }}/>
    </div>)}
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(7,6,5,.82) 0%,rgba(7,6,5,.5) 34%,rgba(7,6,5,.18) 70%),linear-gradient(0deg,rgba(7,6,5,.7) 0%,transparent 34%)" }}/>

    {/* Plate window: plates travel through it; in landscape its left edge feathers before the copy lane. */}
    <div data-km-tj-window="" style={{ position: "absolute", left: q(L.windowX), top: 0, right: 0, bottom: 0, overflow: "hidden",
      ...(L.windowX > 0 ? { maskImage: `linear-gradient(90deg,transparent 0,#000 ${q(2.6 * u)})`, WebkitMaskImage: `linear-gradient(90deg,transparent 0,#000 ${q(2.6 * u)})` } : {}) } as CSSProperties}>
      {plates.map(pl => <PlateView key={pl.i} plate={pl} refSize={pl.thumb && pl.i !== n - 1 ? pl.rect : R} event={events[pl.i]} q={q} offsetX={L.windowX} u={u} t={t} reduced={reduced}
        grade={events[pl.i].grade ?? c.grade ?? { mode: "color", intensity: .3 }} beats={beats} ink={ink} fonts={fonts}
        sourceOpacity={pl.thumb ? 0 : sourceOpacity(pl.i)} yearChip={pl.thumb ? yearLabel(pl.i) : undefined} accent={accent}/>)}
    </div>

    {/* Copy lane */}
    <div data-km-tj-copy="" style={{ position: "absolute", left: q(CL.x), top: q(CL.y), width: q(CL.w), textShadow: "0 .04em .5em rgba(0,0,0,.45)" }}>
      <div data-km-tj-eyebrow="" style={{ minHeight: "1.3em", fontSize: q(2.5 * u), fontWeight: 720, letterSpacing: ".16em", textTransform: "uppercase",
        color: accent, opacity: (copyIndex < 0 ? intro : lineSwap), transform: `translate3d(0,${((1 - (copyIndex < 0 ? intro : lineSwap)) * .4).toFixed(3)}em,0)` }}>{eyebrowText}</div>
      <div data-km-tj-readout="" aria-hidden="true" style={{ position: "relative", marginTop: q(1.1 * u), height: q(readoutPx * 1.08), fontFamily: fonts.numerals,
        fontSize: q(readoutPx), fontWeight: 300, lineHeight: 1.08, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap", color: ink }}>
        {readout.out && <span style={{ position: "absolute", left: 0, top: 0, opacity: 1 - readout.out.fade, transform: `translate3d(0,${(-readout.out.fade * .3).toFixed(3)}em,0)` }}>
          <OdometerParts parts={readout.out.parts} columns={odometerColumns(digitsOf(readout.out.parts, glyphs).value, digitsOf(readout.out.parts, glyphs).count)} glyphs={glyphs} blur={[]}/></span>}
        <span style={{ position: "absolute", left: 0, top: 0, opacity: readout.out ? readout.out.fade : "fadeOut" in readout ? 1 - (readout.fadeOut ?? 0) : 1 }}>
          <OdometerParts parts={readout.now.parts} columns={readout.now.columns} glyphs={glyphs} blur={readout.now.blur}/></span>
      </div>
      <div data-km-tj-dateline="" style={{ marginTop: q(.6 * u), minHeight: "1.3em", fontSize: q(3 * u), fontWeight: 620, letterSpacing: ".01em", color: ink,
        opacity: copyIndex < 0 ? intro * (beat ? lineSwap : 1) : lineSwap, transform: `translate3d(0,${((1 - lineSwap) * .35).toFixed(3)}em,0)` }}>{dateLine}</div>
      <div style={{ marginTop: q(3 * u), maxHeight: q(CL.bottom - CL.y), }}>{body}</div>
    </div>

    {/* Rail: the period at true scale (elapsed) or in even steps (equal); the playhead is the programme clock. */}
    <svg data-km-tj-rail={c.spacing} aria-hidden="true" viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
      <g style={{ clipPath: `inset(0 ${((1 - draw) * 100).toFixed(2)}% 0 0)` }}>
        {c.spacing === "elapsed"
          ? <line x1={RL.x0} x2={RL.x1} y1={RL.y} y2={RL.y} stroke={railInk} strokeWidth={.55 * u} strokeLinecap="round"/>
          : chrono.slice(1).map(({ i }, k) => { const a = rx(rail[chrono[k].i]) + 1.7 * u, b = rx(rail[i]) - 1.7 * u;
            return b > a ? <line key={i} x1={a} x2={b} y1={RL.y} y2={RL.y} stroke={railInk} strokeWidth={.55 * u} strokeLinecap="round"/> : null; })}
        {grads.map((g, k) => <rect key={k} x={rx(g) - .2 * u} y={RL.y + 1.1 * u} width={.4 * u} height={1.1 * u} fill={railInk}/>)}
        <line data-km-tj-progress="" x1={RL.x0} x2={Math.max(RL.x0, rx(head))} y1={RL.y} y2={RL.y} stroke={accent} strokeWidth={.75 * u} strokeLinecap="round"
          opacity={inAnchor ? 0 : 1}/>
        {events.map((_, i) => {
          const pulse = inSummary && !reduced ? Math.sin(Math.PI * span01(t, thumbStart(chrono.findIndex(o => o.i === i)), thumbStart(chrono.findIndex(o => o.i === i)) + 14)) : 0;
          const active = !inSummary && i === copyIndex, r = (active ? 1.3 : .95) * u * (1 + .5 * pulse);
          return <circle key={i} data-km-tj-tick={i} cx={rx(rail[i])} cy={RL.y} r={r} fill={tickFill(i) || active ? accent : "#2a2620"}
            stroke={tickFill(i) || active ? "rgba(10,8,6,.9)" : railInk} strokeWidth={.5 * u}/>;
        })}
      </g>
      {!inAnchor || draw >= 1 ? <g data-km-tj-playhead={rx(head).toFixed(2)} opacity={inAnchor ? cinematicEase(span01(t, 18, 30)) : 1}>
        <rect x={rx(head) - .3 * u} y={RL.y - 4.2 * u} width={.6 * u} height={3.4 * u} rx={.3 * u} fill={accent}/>
        <circle cx={rx(head)} cy={RL.y} r={1.75 * u} fill={accent} stroke="rgba(10,8,6,.92)" strokeWidth={.6 * u}/>
      </g> : null}
    </svg>
    {/* Year labels: period bounds plus the active year, never colliding. */}
    {c.rail?.labels !== "none" && <div data-km-tj-rail-labels="" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: fonts.numerals,
      fontSize: q(labelPx), fontWeight: 650, fontVariantNumeric: "tabular-nums", letterSpacing: ".02em", lineHeight: 1 }}>
      {[firstI, lastI].map((b, k) => { const o = lerp(prevBounds[k] ? 1 : 0, nowBounds[k] ? 1 : 0, labelMix) * draw;
        return o > 0 ? <span key={"b" + k} data-km-tj-rail-label={b} style={{ position: "absolute", top: q(labelY), color: muted, opacity: o, whiteSpace: "nowrap",
          ...(k === 0 ? { left: q(rx(rail[b])) } : { right: q(W - rx(rail[b])) }) }}>{yearLabel(b)}</span> : null; })}
      {activeLabel >= 0 && activeLabel < n && <span data-km-tj-rail-label={activeLabel} data-km-tj-rail-active="" style={{ position: "absolute", top: q(labelY), left: q(rx(rail[activeLabel])),
        transform: "translateX(-50%)", color: accent, whiteSpace: "nowrap", opacity: beat && cur > 0 ? lineSwap : copyIndex === 0 && beat ? lineSwap : 1 }}>{yearLabel(activeLabel)}</span>}
    </div>}

    <FilmFinish frame={t} reduced={reduced} grain={look.grain ?? .8} vignette={look.vignette ?? 1} vignetteStrength={.5}/>
    {overlay && <div data-km-stage-overlay="" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {overlay({ frame: f, width: W, height: H, beats, space: "stage", toStage: pt => ({ x: pt.x * W, y: pt.y * H }), state: timing => annotationState(timing, beats, t, reduced) })}
    </div>}
    <p data-km-tj-announce="" style={srOnly}>{announce}</p>
  </div>;

  function sourceOpacity(i: number) {
    const b = sched.events[i], next = sched.events[i + 1];
    const enter = reduced ? (t >= b.cues.source ? 1 : 0) : cinematicEase(span01(t, b.cues.source, b.cues.source + 14));
    const exit = inSummary ? 1 - span01(t, summaryStart, summaryStart + 8) : next ? 1 - span01(t, next.start, next.start + 8) : 1;
    return Math.min(enter, exit);
  }
}

function PlateView({ plate, refSize, event, q, offsetX, u, t, reduced, grade, beats, ink, fonts, sourceOpacity, yearChip, accent }: {
  plate: { i: number; rect: Rect; opacity: number; kb: Kb; dim: number; clip?: number; thumb?: boolean }; refSize: { w: number; h: number };
  event: TimelineJourneyEvent; q: (px: number) => string; offsetX: number; u: number; t: number; reduced: boolean;
  grade: TimelineGrade; beats: AnnotationBeats; ink: string; fonts: { text: string; numerals: string }; sourceOpacity: number; yearChip?: string; accent: string;
}) {
  const { rect: r, kb } = plate, img: ImageAsset | undefined = event.image;
  const credit = [event.source, event.credit].filter(Boolean).join(" · ");
  const fx = event.focus ? event.focus.x + (event.focus.width ?? 0) / 2 : .5, fy = event.focus ? event.focus.y + (event.focus.height ?? 0) / 2 : .5;
  const content: ReactNode = img
    ? <Asset asset={img} style={{ borderRadius: 0, filter: gradeFilter(grade), ...(plate.thumb && kb.s === 1 ? { objectPosition: `${fx * 100}% ${fy * 100}%` } : {}) }}/>
    : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "linear-gradient(160deg,#2b251d,#14110d)",
        fontFamily: "inherit", color: ink, fontSize: q(4 * u), padding: q(4 * u), textAlign: "center" }}>{event.label}</div>;
  return <div data-km-tj-plate={event.id} data-km-tj-kb={kb.s.toFixed(4)} style={{ position: "absolute", left: q(r.x - offsetX), top: q(r.y), width: q(r.w), height: q(r.h),
    opacity: plate.opacity, overflow: "hidden", borderRadius: q(.5 * u), background: "#0b0a08",
    boxShadow: `0 ${q(1.6 * u)} ${q(4.5 * u)} rgba(0,0,0,.55), 0 0 0 ${q(.35 * u)} rgba(255,246,228,.07)`,
    clipPath: plate.clip !== undefined && plate.clip < 1 ? `inset(0 ${((1 - plate.clip) * 100).toFixed(2)}% 0 0)` : undefined }}>
    <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", willChange: "transform",
      // Ken Burns is authored in full-plate pixels; percentages keep it exact while a plate shrinks into the contact sheet.
      transform: `translate3d(${(kb.tx / refSize.w * 100).toFixed(3)}%,${(kb.ty / refSize.h * 100).toFixed(3)}%,0) scale(${kb.s.toFixed(5)})` }}>
      {content}
      {img && event.annotations && !plate.thumb && <SubjectAnnotationLayer annotations={event.annotations} beats={beats} subject={img}
        width={r.w} height={r.h} frame={t} reducedMotion={reduced} space="subject"/>}
    </div>
    {/* Plate finish: soft inner falloff, the outgoing dim, and a scrim only where the source sits. */}
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none",
      background: `radial-gradient(ellipse 80% 80% at 50% 45%,transparent 58%,rgba(4,3,2,.42) 100%),rgba(5,4,3,${plate.dim.toFixed(3)})` }}/>
    {credit && sourceOpacity > 0 && <div data-km-tj-source="" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `${q(5 * u)} ${q(2.2 * u)} ${q(1.7 * u)}`,
      background: "linear-gradient(0deg,rgba(6,5,4,.78) 0%,rgba(6,5,4,.5) 55%,transparent 100%)", opacity: sourceOpacity,
      fontFamily: fonts.text, fontSize: q(2.35 * u), fontWeight: 520, lineHeight: 1.3, letterSpacing: ".01em", color: "rgba(250,245,234,.9)", textWrap: "pretty" }}>{credit}</div>}
    {yearChip && <div data-km-tj-chip="" style={{ position: "absolute", left: q(1.2 * u), bottom: q(1.2 * u), padding: `${q(.7 * u)} ${q(1.4 * u)}`, borderRadius: q(.5 * u),
      background: "rgba(8,7,5,.82)", color: accent, fontFamily: fonts.numerals, fontWeight: 700, fontSize: q(2.4 * u), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{yearChip}</div>}
  </div>;
}
