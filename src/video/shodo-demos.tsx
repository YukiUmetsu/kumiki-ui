import { useMemo, useState } from "react";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { renderShodoSlot, shodoWritingFrames } from "../../registry/video/shodo/shodo-film-slot";
import { SHODO_KANJIVG_CREDIT } from "../../registry/video/shodo/shodo-glyph-source";
import type { CSSProperties } from "react";
import { SHODO_GLYPHS } from "../../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../../registry/video/shodo/shodo-glyphs";
import { planShodoWriting, shodoBrushPose } from "../../registry/video/shodo/shodo-hand";
import { ShodoInkSurface } from "../../registry/video/shodo/shodo-ink";
import { kenteiSheet } from "../../registry/video/shodo/shodo-paper";
import { SHODO_KANKA_RULES, shodoKankaRulesFor } from "../../registry/video/shodo/shodo-structure";
import { ShodoBrushProfile, ShodoCanvas } from "../../registry/video/shodo/shodo-react";
import { shodoFerruleHeight } from "../../registry/video/shodo/shodo-brush";
import { DEFAULT_SHODO_STYLE, SHODO_INKS, resolveShodoStyle } from "../../registry/video/shodo/shodo-style";
import { SHODO_BASICS, auditShodoTechniques, shodoStepLabel } from "../../registry/video/shodo/shodo-techniques";
import { SHODO_FPS, SHODO_PHASE_LABEL, SHODO_TECH_LABEL, ShodoTransport, useShodoGlyphs, useShodoPlayback, useShodoTeachers, shodoTeacherLabels } from "./shodo-studio";

const W = 1280, H = 720;
const page: CSSProperties = {
  minHeight: "100vh", background: "#F3F1EC", color: "#25211D", padding: 20, boxSizing: "border-box",
  font: "14px/1.45 system-ui, sans-serif", display: "grid", gap: 14, alignContent: "start",
};
const frameBox: CSSProperties = {
  position: "relative", maxWidth: 1280, width: "100%", borderRadius: 6, overflow: "hidden",
  boxShadow: "0 14px 40px rgba(40,30,20,.18)", containerType: "inline-size",
};

// ── Techniques: the ten basics, one cell each ─────────────────────────────────────

/** The ten basic techniques (SHODO_BASICS), written one after another with live steps and measured checks. */
export function ShodoTechniquesBoard() {
  const paper = useMemo(() => ({ x: 36, y: 30, width: W - 72, height: H - 60 }), []);
  const cols = 5, rows = 2, cw = paper.width / cols, ch = paper.height / rows, label = 74;
  const size = Math.min(cw, ch - label) * .98;
  const style = useMemo(() => resolveShodoStyle({ brush: { diameter: 118 }, hand: { speed: .9 } }), []);
  const plan = useMemo(() => planShodoWriting({
    style,
    items: SHODO_BASICS.map((basic, i): { glyph: ShodoGlyph; x: number; y: number; size: number } => ({
      glyph: { char: "・", source: "original", strokes: [basic.demo] },
      x: paper.x + (i % cols) * cw + (cw - size) / 2,
      y: paper.y + Math.floor(i / cols) * ch + 6,
      size,
    })),
    rest: [W - 70, H - 90], inkstone: [W + 60, 120],
  }), [paper, cw, ch, size, style]);
  // Measured once per plan: every basic must leave the shape its technique implies.
  const audit = useMemo(() => auditShodoTechniques(new ShodoInkSurface(plan, { ...paper, scale: 1 })), [plan, paper]);
  const last = Math.ceil(plan.duration * SHODO_FPS);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  const activeItem = plan.strokes[pose.stroke]?.item;
  const contact = pose.contact ? plan.strokes[pose.stroke]?.samples.find(s => s.t >= frame / SHODO_FPS) : undefined;
  const sheet = useMemo(() => {
    const s = kenteiSheet(paper.width, paper.height, cols, rows);
    return { ...s, cells: s.cells && { ...s.cells, inset: [0, 0, 0, 0] as const, centreMarks: false } };
  }, [paper]);
  return <div style={page}>
    <header>
      <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 筆法 · 始筆 · 送筆 · 終筆</div>
      <h1 style={{ margin: "2px 0 0", font: "600 24px/1.2 Georgia, serif" }}>The basics: how a stroke starts, turns, stops and ends</h1>
    </header>
    <div style={frameBox}>
      <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={sheet} paperweight="none"
        label="Ten basic brush techniques written one after another" />
      {SHODO_BASICS.map((basic, i) => {
        const x = paper.x + (i % cols) * cw, y = paper.y + Math.floor(i / cols) * ch + ch - label;
        const active = i === activeItem;
        const checks = audit.checks.filter(c => plan.strokes[c.stroke].item === i);
        const ok = checks.every(c => c.check.pass);
        return <div key={basic.id} aria-current={active ? "step" : undefined} style={{
          position: "absolute", left: `${x / W * 100}%`, top: `${y / H * 100}%`, width: `${cw / W * 100}%`, height: `${label / H * 100}%`,
          display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center", padding: "0 1.2cqw", boxSizing: "border-box",
          color: active ? "#B3301A" : "#3A332C", transition: "color .2s",
        }}>
          <div style={{ font: "600 2.1cqw/1.1 'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>{basic.term}</div>
          <div style={{ font: "600 1.05cqw/1.3 system-ui, sans-serif", letterSpacing: ".02em" }}>
            {basic.reading} · {basic.phase === "kihitsu" && basic.id !== "ten" ? "start" : basic.phase === "tensetsu" ? "turn" : basic.id === "ten" ? "dot" : "end"}
            {" "}<span title={checks.map(c => `${c.check.message}: ${c.check.measured} (${c.check.bound})`).join("\n")}
              style={{ color: ok ? "#2F6B3A" : "#B3301A" }}>{ok ? "✓" : "✗"}</span>
          </div>
          <div style={{ font: "400 .98cqw/1.25 system-ui, sans-serif", opacity: .8 }}>{basic.summary}</div>
        </div>;
      })}
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div aria-live="polite" style={{ fontWeight: 600, minHeight: 22 }}>
      {SHODO_PHASE_LABEL[pose.phase] ?? pose.phase}{contact ? <> — {shodoStepLabel(contact)}</> : null}
    </div>
    <p style={{ margin: 0, fontSize: 12.5, maxWidth: 900 }}>✓ means the rendered stroke measures as its technique should
      (for example 懸針 ends under 35 % of its travel width, 止め ends heavier than its travel). Hover a ✓ for the numbers.</p>
  </div>;
}

// ── Kanji study card: written character beside a reading card ──────────────────────

export interface KanjiCardWord { word: string; ruby: string; romaji: string; meaning: string }
export interface ShodoKanjiCardProps {
  char?: string;
  heading?: string;
  meanings?: string;
  onyomi?: string;
  kunyomi?: string;
  words?: readonly KanjiCardWord[];
  /** Stroke numbers (1-based) written by the teacher's vermilion brush. */
  vermilionStrokes?: readonly number[];
}

const MICHI_WORDS: readonly KanjiCardWord[] = [
  { word: "道", ruby: "みち", romaji: "michi", meaning: "street, path" },
  { word: "道路", ruby: "どうろ", romaji: "dōro", meaning: "road, highway" },
  { word: "書道", ruby: "しょどう", romaji: "shodō", meaning: "calligraphy" },
];

const LAST_STROKE: readonly number[] = [12];

/** A study frame: the character written on gridded hanshi, a reading card on the right. */
export function ShodoKanjiCard({
  char = "道", heading = "Kanji study", meanings = "WAY / PATH / ROAD", onyomi = "DŌ (ドウ)", kunyomi = "michi (みち)",
  words = MICHI_WORDS, vermilionStrokes = LAST_STROKE,
}: ShodoKanjiCardProps) {
  const card0 = useMemo(() => [char], [char]);
  const loaded = useShodoGlyphs(card0, "kanjivg");
  const glyph = loaded ? loaded.glyphs[0] ?? SHODO_GLYPHS[char] : undefined;
  const paper = useMemo(() => ({ x: 0, y: 0, width: 880, height: H }), []);
  const card = { x: 880, width: W - 880 };
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: 1.6 } }, DEFAULT_SHODO_STYLE), []);
  const size = 540;
  const plan = useMemo(() => glyph ? planShodoWriting({
    style,
    items: [{
      glyph, x: paper.x + 300, y: (H - size) / 2 - 6, size,
      strokeInk: Object.fromEntries(vermilionStrokes.map(n => [n - 1, SHODO_INKS.shuboku])),
    }],
    rest: [835, 600], inkstone: [W + 80, 360], exit: "hover",
  }) : null, [glyph, style, paper, vermilionStrokes]);
  const last = plan ? Math.ceil(plan.duration * SHODO_FPS) : 0;
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const sheet = useMemo(() => kenteiSheet(paper.width, paper.height, 1, 1), [paper]);
  if (!loaded) return <div style={page}>Loading strokes…</div>;
  if (!glyph || !plan) return <div role="alert" style={page}>No stroke data for {char}.</div>;
  const ink = "#1B1A18";
  return <div style={page}>
    <div style={frameBox}>
      <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={sheet} paperweight="none"
        underlay="none" orderGuide="all" guideStrokes={vermilionStrokes} label={`The kanji ${char} written with a brush`} />
      {/* Text sits in reserved bands: top-left and bottom-left of the sheet, and the card. */}
      <div style={{ position: "absolute", left: "3.4%", top: "5%", font: "700 2.6cqw/1 'Oswald', 'Arial Narrow', system-ui, sans-serif",
        letterSpacing: ".01em", color: ink }}>{heading.toUpperCase()}: {char}</div>
      <div style={{ position: "absolute", left: "3.4%", bottom: "5%", font: "700 2.25cqw/1.12 'Oswald', 'Arial Narrow', system-ui, sans-serif", color: ink }}>
        {heading.toUpperCase()}: {char}<br />STROKE ORDER &amp; WORDS
      </div>
      <aside aria-label={`${char} readings and words`} style={{
        position: "absolute", left: `${card.x / W * 100}%`, top: 0, width: `${card.width / W * 100}%`, height: "100%",
        background: "#FBFAF7", boxShadow: "-6px 0 18px rgba(0,0,0,.12)", padding: "3.2cqw 2.6cqw", boxSizing: "border-box",
        display: "grid", alignContent: "start", gap: "1.6cqw", color: ink,
      }}>
        <div style={{ font: "700 2.55cqw/1.05 'Oswald', 'Arial Narrow', system-ui, sans-serif", whiteSpace: "nowrap", borderBottom: "1px solid #C9C3B8", paddingBottom: "1.2cqw" }}>
          <span style={{ font: "700 2.9cqw/1 'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>{char}</span> | {meanings}
        </div>
        <div style={{ font: "600 1.2cqw/1.3 system-ui, sans-serif" }}>ON&apos;YOMI: {onyomi} | KUN&apos;YOMI: {kunyomi}</div>
        <div style={{ font: "700 2cqw/1 'Oswald', 'Arial Narrow', system-ui, sans-serif", marginTop: "1.4cqw" }}>USEFUL WORDS</div>
        <ol style={{ margin: 0, paddingLeft: "2.2cqw", display: "grid", gap: "1.3cqw", font: "600 1.75cqw/1.15 'Oswald', 'Arial Narrow', system-ui, sans-serif" }}>
          {words.map(w => <li key={w.word}><ruby>{w.word}<rt style={{ fontSize: ".55em", fontWeight: 500 }}>{w.ruby}</rt></ruby> ({w.romaji}) – {w.meaning}</li>)}
        </ol>
      </aside>
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    {glyph.source === "kanjivg" ? <p style={{ margin: 0, fontSize: 12.5 }}>{SHODO_KANJIVG_CREDIT}.</p> : null}
  </div>;
}

// ── Brush close-up: the tuft at macro scale ───────────────────────────────────────

const CLOSE_UP: ShodoGlyph = {
  char: "永", source: "original", strokes: [
    { kind: "horizontal", points: [[60, 330], [420, 300], [760, 280]], weight: 1 },
    { kind: "vertical", end: "hane", hook: [-.86, -.5], points: [[520, 380], [522, 560], [520, 720]], weight: 1 },
  ],
};

/** Macro view: one horizontal and one 撥ね at a scale where single hairs read. */
export function ShodoBrushCloseUp({ ink = "sumi" }: { ink?: keyof typeof SHODO_INKS }) {
  const paper = useMemo(() => ({ x: -40, y: -40, width: W + 80, height: H + 80 }), []);
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: .6 }, ink: { ...SHODO_INKS[ink] } }), [ink]);
  const plan = useMemo(() => planShodoWriting({
    style, items: [{ glyph: CLOSE_UP, x: 150, y: -110, size: 960 }], rest: [W - 160, H - 60], inkstone: [W + 200, 200],
  }), [style]);
  const last = Math.ceil(plan.duration * SHODO_FPS);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  return <div style={page}>
    <div style={frameBox}>
      <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={null} paperweight="none"
        underlay="none" cameraHeight={2600} label="Close-up of a brush writing a horizontal stroke and a hooked vertical" />
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div aria-live="polite" style={{ fontWeight: 600 }}>
      {SHODO_PHASE_LABEL[pose.phase] ?? pose.phase}{pose.technique ? <> — {SHODO_TECH_LABEL[pose.technique] ?? pose.technique}</> : null}
      {" · "}press {(pose.p * 100).toFixed(0)}% · ink {(pose.ink * 100).toFixed(0)}%
    </div>
  </div>;
}

// ── Film shot: the FilmStage slot ─────────────────────────────────────────────────

const FILM_STYLE = { hand: { speed: 1.4 } } as const;

/** A one-shot FilmDocument that writes 永 through `renderShodoSlot`, in 16:9 or 9:16. */
export function ShodoFilmShot() {
  const [aspect, setAspect] = useState<"landscape" | "portrait">("landscape");
  const frames = useMemo(() => shodoWritingFrames("永", FILM_STYLE, 30) + 15, []);
  const film = useMemo(() => {
    const doc: FilmDocument = {
      schemaVersion: 1, id: "shodo-film-shot", fps: { num: 30, den: 1 }, drift: 0,
      outputs: [{ id: "landscape", width: 1280, height: 720 }, { id: "portrait", width: 720, height: 1280 }],
      scenes: [{
        id: "write-ei", recipeId: "slot", durationFrames: frames,
        content: { slot: "shodo-writing", label: "The kanji 永 written with a brush", props: { text: "永", style: FILM_STYLE, orderGuide: "current" } },
      }],
    };
    return compileFilm(doc, { outputId: aspect });
  }, [frames, aspect]);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(frames - 1, film);
  if (!film.ok) return <pre role="alert">{film.diagnostics.map(d => d.path + ": " + d.message).join("\n")}</pre>;
  const scale = aspect === "portrait" ? .5 : 1;
  return <div style={page}>
    <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 12.5, width: 200 }}>Output
      <select value={aspect} onChange={e => setAspect(e.target.value as "landscape" | "portrait")} aria-label="Output">
        <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
      </select>
    </label>
    <div style={{ width: film.film.width * scale, height: film.film.height * scale, maxWidth: "100%", overflow: "hidden", boxShadow: "0 14px 40px rgba(40,30,20,.18)" }}>
      <FilmStage film={film.film} frame={frame} renderObject={() => null}
        renderSlot={(content, context) => {
          const node = renderShodoSlot(content, context);
          if (node === undefined) throw new Error("Unknown slot " + content.slot);
          return node;
        }} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} />
    </div>
    <ShodoTransport frame={frame} last={frames - 1} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
  </div>;
}

// ── Character gallery: any text through the general pipeline ──────────────────────

/** Write any text (kanji and kana) from KanjiVG stroke data. */
const KANKA_TERM = Object.fromEntries(SHODO_KANKA_RULES.map(rule => [rule.id, rule.term]));

export function ShodoCharacterGallery({ initialText = "道永書和夢心東京花風春愛あのふア" }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [bundled, setBundled] = useState(false);
  const [structure, setStructure] = useState(true);
  const teachers = useShodoTeachers();
  const [useTeacher, setUseTeacher] = useState(true);
  const chars = useMemo(() => [...text].filter(c => c.trim()).slice(0, 24), [text]);
  const form = useMemo(() => structure ? {} : { structure: false as const }, [structure]);
  const loaded = useShodoGlyphs(chars, bundled ? "bundled" : teachers.length && useTeacher ? "teacher" : "kanjivg", form, teachers);
  const glyphs = loaded?.glyphs ?? null, error = loaded?.error ?? null;
  const cols = 8, cell = 150, gap = 6;
  const rows = Math.max(1, Math.ceil(chars.length / cols));
  const width = 36 * 2 + cols * cell + (cols - 1) * gap, height = 36 * 2 + rows * cell + (rows - 1) * gap;
  const paper = useMemo(() => ({ x: 0, y: 0, width, height }), [width, height]);
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: 2.4 } }), []);
  const plan = useMemo(() => glyphs && glyphs.length ? planShodoWriting({
    style, items: glyphs.map((glyph, i) => ({ glyph, size: cell, x: 36 + (i % cols) * (cell + gap), y: 36 + Math.floor(i / cols) * (cell + gap) })),
    rest: [width - 40, height - 30],
  }) : null, [glyphs, style, width, height]);
  const last = plan ? Math.ceil(plan.duration * SHODO_FPS) : 0;
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const sheet = useMemo(() => kenteiSheet(width, height, cols, rows), [width, height, rows]);
  const usesKanjiVg = glyphs?.some(g => g.source === "kanjivg" || g.source === "teacher");
  const taughtCount = glyphs?.filter(g => g.source === "teacher").length ?? 0;
  return <div style={page}>
    <header>
      <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 任意の文字</div>
      <h1 style={{ margin: "2px 0 0", font: "600 24px/1.2 Georgia, serif" }}>Any character: kanji and kana from stroke data</h1>
    </header>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "end" }}>
      <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 12.5 }}>Text (up to 24 characters)
        <input value={text} onChange={e => setText(e.target.value)} aria-label="Text" style={{ minHeight: 36, font: "20px serif", width: 420 }} />
      </label>
      {teachers.length ? <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, fontSize: 12.5 }}><input type="checkbox" checked={useTeacher} onChange={e => setUseTeacher(e.target.checked)} />Teacher's own forms (local)</label> : null}
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, fontSize: 12.5 }}><input type="checkbox" checked={structure} onChange={e => setStructure(e.target.checked)} />Teacher layout rules (間架結構法)</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, fontSize: 12.5 }}><input type="checkbox" checked={bundled} onChange={e => setBundled(e.target.checked)} />Prefer bundled originals</label>
    </div>
    {error ? <div role="alert">{error}</div> : null}
    <div style={{ ...frameBox, maxWidth: width }}>
      {plan ? <ShodoCanvas plan={plan} frame={frame} width={width} height={height} paper={paper} sheet={sheet} underlay="none"
        paperweight="none" label={`Brush calligraphy of ${chars.join("")}`} /> : <div style={{ padding: 24 }}>Loading strokes…</div>}
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    {structure && glyphs?.some(g => g.source !== "original") ? <section aria-label="間架結構 rules" style={{ display: "grid", gap: 8, maxWidth: 980 }}>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", margin: 0, padding: 0, listStyle: "none", fontSize: 13 }}>
        {glyphs.filter(g => g.source !== "original").map((g, i) => <li key={i}>
          <span style={{ font: "18px serif", marginRight: 4 }}>{g.char}</span>
          {g.source === "teacher" ? "teacher's form" : shodoKankaRulesFor(g).map(id => KANKA_TERM[id]).join(" · ") || "no rule"}
        </li>)}
      </ul>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "2px 12px", margin: 0, fontSize: 12.5 }}>
        {SHODO_KANKA_RULES.map(rule => <div key={rule.id} style={{ display: "contents" }}>
          <dt style={{ fontWeight: 700 }}>{rule.term} <span style={{ fontWeight: 400, color: "#6b5a4a" }}>{rule.reading}</span></dt>
          <dd style={{ margin: 0 }}>{rule.summary}</dd>
        </div>)}
      </dl>
    </section> : null}
    <p style={{ margin: 0, fontSize: 12.5, maxWidth: 980 }}>
      Kanji and kana are read from KanjiVG stroke data. The 間架結構法 layout rules, measured on 411 teacher
      models, and the kaisho brush rules are applied.
      {taughtCount && teachers.length ? <> {taughtCount} of {glyphs?.length} characters use a teacher's own forms ({shodoTeacherLabels(chars, teachers).join("; ")}).</> : null}
      {usesKanjiVg ? <> {SHODO_KANJIVG_CREDIT}. Credit KanjiVG in any film made from it.</> : null}
    </p>
  </div>;
}

// ── Brush motion: top and side views ─────────────────────────────────────────────

/**
 * The brush's lean and height through a character, from the top (as the film shows it) and
 * from the side (as side-view teaching videos show it), with both traced over time.
 */
export function ShodoBrushMotionStudy({ char = "永" }: { char?: string }) {
  const [side, setSide] = useState(.15);
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: .8, sideBrush: side } }), [side]);
  const paper = useMemo(() => ({ x: 400, y: 30, width: 480, height: 660 }), []);
  const glyph = SHODO_GLYPHS[char] ?? SHODO_GLYPHS["永"];
  const plan = useMemo(() => planShodoWriting({
    style, items: [{ glyph, x: 440, y: 150, size: 400 }], rest: [960, 470], inkstone: [1300, 160],
  }), [style, glyph]);
  const last = Math.ceil(plan.duration * SHODO_FPS);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  // Lean (degrees) and ferrule height (tuft lengths) over the whole writing.
  const trace = useMemo(() => Array.from({ length: last + 1 }, (_, f) => {
    const p = shodoBrushPose(plan, f / SHODO_FPS);
    return { lean: Math.hypot(p.leanX, p.leanY), height: shodoFerruleHeight(p, plan.style.brush, plan.brush.diameter) / plan.brush.tuftLength, contact: p.contact };
  }), [plan, last]);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  const cw = 1200, ch = 150, x = (f: number) => f / Math.max(1, last) * cw;
  const path = (k: "lean" | "height", scale: number, top: number) =>
    trace.map((t, f) => (f ? "L" : "M") + x(f).toFixed(1) + " " + (top - t[k] * scale).toFixed(1)).join(" ");
  const contactBands = trace.reduce<{ from: number; to: number }[]>((bands, t, f) => {
    if (t.contact) { const b = bands[bands.length - 1]; if (b && b.to === f - 1) b.to = f; else bands.push({ from: f, to: f }); }
    return bands;
  }, []);
  return <div style={page}>
    <header>
      <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 運筆 · brush motion</div>
      <h1 style={{ margin: "2px 0 0", font: "600 24px/1.2 Georgia, serif" }}>How the brush leans and rises as it writes</h1>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, maxWidth: 1280 }}>
      <div style={{ ...frameBox }}>
        <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={kenteiSheet(paper.width, paper.height)}
          paperweight="none" label={`Top view: the brush writing ${glyph.char}`} />
      </div>
      <div style={{ ...frameBox }}>
        <ShodoBrushProfile plan={plan} frame={frame} width={W} height={H} paper={paper} label={`Side view: the brush writing ${glyph.char}`} />
      </div>
    </div>
    <svg viewBox={`0 0 ${cw} ${ch}`} role="img" aria-label="Brush lean and ferrule height over time" style={{ width: "100%", maxWidth: 1280, background: "#FFFFFF", borderRadius: 6 }}>
      {contactBands.map((b, i) => <rect key={i} x={x(b.from)} y={0} width={Math.max(1, x(b.to) - x(b.from))} height={ch} fill="#F1E9DD" />)}
      <path d={path("lean", 2.2, 140)} fill="none" stroke="#9A3B24" strokeWidth={2} />
      <path d={path("height", 55, 140)} fill="none" stroke="#2F4F6B" strokeWidth={2} />
      <line x1={x(frame)} x2={x(frame)} y1={0} y2={ch} stroke="#25211D" strokeWidth={1.5} />
    </svg>
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, alignItems: "center" }}>
      <span><span style={{ color: "#9A3B24", fontWeight: 700 }}>━</span> handle lean from vertical</span>
      <span><span style={{ color: "#2F4F6B", fontWeight: 700 }}>━</span> ferrule height (tuft lengths)</span>
      <span style={{ background: "#F1E9DD", padding: "0 6px" }}>brush on the paper</span>
      <span aria-live="polite" style={{ fontWeight: 600 }}>
        {SHODO_PHASE_LABEL[pose.phase] ?? pose.phase}{pose.technique ? <> — {SHODO_TECH_LABEL[pose.technique] ?? pose.technique}</> : null}
        {" · "}lean {Math.hypot(pose.leanX, pose.leanY).toFixed(0)}° · press {(pose.p * 100).toFixed(0)}%
      </span>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>直筆
        <input type="range" min={0} max={1} step={.01} value={side} onChange={e => setSide(Number(e.target.value))} aria-label="Upright to side brush" />側筆</label>
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
  </div>;
}
