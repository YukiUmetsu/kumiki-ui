import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { SHODO_GLYPHS } from "../../registry/video/shodo/shodo-glyphs";
import type { ShodoFormOptions } from "../../registry/video/shodo/shodo-glyphs";
import { SHODO_KANJIVG_CREDIT, loadShodoGlyph } from "../../registry/video/shodo/shodo-glyph-source";
import { shodoTeacherFor, type ShodoTeacher } from "../../registry/video/shodo/shodo-glyph-source";
import type { ShodoGlyph } from "../../registry/video/shodo/shodo-glyphs";
import { planShodoWriting, shodoBrushPose } from "../../registry/video/shodo/shodo-hand";
import { kenteiSheet } from "../../registry/video/shodo/shodo-paper";
import { ShodoCanvas } from "../../registry/video/shodo/shodo-react";
import {
  DEFAULT_SHODO_STYLE, SHODO_BRUSHES, SHODO_HANDS, SHODO_INKS, SHODO_PAPERS, inspectShodoStyle,
} from "../../registry/video/shodo/shodo-style";
import type { ShodoScript, ShodoStyle, ShodoTechniqueParams } from "../../registry/video/shodo/shodo-style";
import { SHODO_TECHNIQUE_RANGES } from "../../registry/video/shodo/shodo-style";
import { SHODO_BASICS, shodoStepLabel } from "../../registry/video/shodo/shodo-techniques";

const FPS = 30;
const W = 1280, H = 720;
export type ShodoGlyphMode = "teacher" | "kanjivg" | "bundled";

/**
 * The teachers' fitted forms, when the owner keeps them in `local-assets/shodo-teachers/`
 * (served by Storybook only when the folder exists; never committed): the files listed in
 * `teachers.json`, in order of preference, or `teacher.json` alone. Empty otherwise.
 */
export function useShodoTeachers(): readonly ShodoTeacher[] {
  const [teachers, setTeachers] = useState<readonly ShodoTeacher[]>([]);
  useEffect(() => {
    let live = true;
    const get = (name: string) => fetch("/shodo-teachers/" + name).then(res => res.ok ? res.json() : null).catch(() => null);
    get("teachers.json")
      .then((list: unknown) => Promise.all((Array.isArray(list) ? list.filter((n): n is string => typeof n === "string") : ["teacher.json"]).map(get)))
      .then((found: (ShodoTeacher | null)[]) => {
        if (live) setTeachers(found.filter((t): t is ShodoTeacher => !!t && typeof t.label === "string" && !!t.glyphs));
      });
    return () => { live = false; };
  }, []);
  return teachers;
}

type KanjiLevel = "N5" | "N4" | "N3" | "N2" | "N1";
const KANJI_LEVELS: readonly KanjiLevel[] = ["N5", "N4", "N3", "N2", "N1"];

/** One kanji of the owner's study-card data: its level and the props of its card. */
export interface ShodoKanjiDatasetEntry {
  char: string;
  level?: KanjiLevel;
  card: {
    meanings?: string; onyomi?: string; kunyomi?: string; jlpt?: KanjiLevel;
    words?: { word: string; ruby: string; romaji: string; meaning: string }[];
  };
}

/** Where Storybook serves the owner's study-card data (from `local-assets/shodo-teachers/kanji-cards/`). */
export const KANJI_DATASET_URL = "/shodo-teachers/kanji-cards/jlpt-n5-n3.json";
/** Credit for the study-card data; show it when a card uses the data. */
export const KANJI_DATASET_CREDIT = "Kanji data: KANJIDIC2 and JMdict, © EDRDG, CC BY-SA 4.0. JLPT levels and vocabulary: Jonathan Waller's JLPT resources, CC BY.";

/**
 * Reads the study-card file `{ about, kanji: [{ char, jlpt, card: { meanings, onyomi, kunyomi,
 * jlpt, words } }] }` into a map by character. Entries and fields of the wrong type are left out.
 * Null when nothing usable is in the file.
 */
export function readKanjiCardDataset(json: unknown): ReadonlyMap<string, ShodoKanjiDatasetEntry> | null {
  const list = json && typeof json === "object" ? (json as { kanji?: unknown }).kanji : undefined;
  if (!Array.isArray(list)) return null;
  const text = (v: unknown) => typeof v === "string" && v.trim() ? v : undefined;
  const level = (v: unknown) => KANJI_LEVELS.find(l => l === v);
  const out = new Map<string, ShodoKanjiDatasetEntry>();
  for (const item of list as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const e = item as { char?: unknown; jlpt?: unknown; card?: unknown };
    if (typeof e.char !== "string" || !e.char || !e.card || typeof e.card !== "object") continue;
    const c = e.card as Record<string, unknown>;
    const words = Array.isArray(c.words) ? (c.words as unknown[]).flatMap(w => {
      const x = w as Record<string, unknown> | null;
      return x && ["word", "ruby", "romaji", "meaning"].every(k => typeof x[k] === "string")
        ? [{ word: x.word as string, ruby: x.ruby as string, romaji: x.romaji as string, meaning: x.meaning as string }] : [];
    }) : undefined;
    out.set(e.char, {
      char: e.char, level: level(e.jlpt),
      card: { meanings: text(c.meanings), onyomi: text(c.onyomi), kunyomi: text(c.kunyomi), jlpt: level(c.jlpt), words: words?.length ? words : undefined },
    });
  }
  return out.size ? out : null;
}

let kanjiDatasetLoad: Promise<ReadonlyMap<string, ShodoKanjiDatasetEntry> | null> | null = null;

/**
 * The owner's study-card data for the JLPT N5–N3 kanji, when it is kept in
 * `local-assets/shodo-teachers/kanji-cards/jlpt-n5-n3.json` (served by Storybook only when the
 * folder exists; never committed). Loaded once per page. Null while it loads, and on every
 * other machine.
 */
export function useKanjiCardDataset(): ReadonlyMap<string, ShodoKanjiDatasetEntry> | null {
  const [data, setData] = useState<ReadonlyMap<string, ShodoKanjiDatasetEntry> | null>(null);
  useEffect(() => {
    let live = true;
    kanjiDatasetLoad ??= fetch(KANJI_DATASET_URL).then(res => res.ok ? res.json() : null).then(readKanjiCardDataset).catch(() => null);
    kanjiDatasetLoad.then(d => { if (live) setData(d); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return data;
}

/** The labels of the teachers whose forms write these characters, for the credit line. */
export function shodoTeacherLabels(chars: readonly string[], teachers: readonly ShodoTeacher[]): string[] {
  const used = new Set(chars.map(c => shodoTeacherFor(c, teachers)).filter((t): t is ShodoTeacher => !!t));
  return teachers.filter(t => used.has(t)).map(t => t.label);
}

/**
 * Glyphs for the demos. "teacher": the teacher's own forms where the teacher has the
 * character, KanjiVG with the rules elsewhere; "kanjivg": KanjiVG strokes with brush form
 * rules (any character); "bundled": the original offline set first. Falls back to a bundled
 * glyph when stroke data cannot be loaded.
 */
export function useShodoGlyphs(chars: readonly string[], mode: ShodoGlyphMode, form: ShodoFormOptions = {}, teachers: readonly ShodoTeacher[] = []) {
  const [state, setState] = useState<{ key: string; glyphs: ShodoGlyph[]; error: string | null } | null>(null);
  const taught = mode === "teacher" ? teachers : [];
  const key = chars.join("") + "|" + mode + "|" + JSON.stringify(form) + "|" + taught.map(t => t.id).join(",");
  useEffect(() => {
    let live = true;
    Promise.all(chars.map(c => loadShodoGlyph(c, { ...form, preferBundled: mode === "bundled", teacher: taught }).catch((e: unknown) => {
      if (SHODO_GLYPHS[c]) return SHODO_GLYPHS[c];
      throw e;
    }))).then(glyphs => { if (live) setState({ key, glyphs, error: null }); })
      .catch((e: unknown) => { if (live) setState({ key, glyphs: [], error: e instanceof Error ? e.message : String(e) }); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state?.key === key ? state : null;
}

/** Japanese labels for the live technique readout. */
const PHASE_LABEL: Record<string, string> = {
  kihitsu: "起筆 · start", sohitsu: "送筆 · move", tensetsu: "転折 · turn", shuhitsu: "終筆 · end", renmen: "連綿 · link",
  air: "空中 · in the air", dip: "墨継ぎ · re-ink", rest: "構え · ready",
};
const TECH_LABEL: Record<string, string> = {
  uchikomi: "打ち込み uchikomi — 45° press", zoho: "蔵鋒 zōhō — hidden tip", roho: "露鋒 rohō — exposed tip",
  okuri: "送り — even travel", orehi: "折れ — stop and re-press", magari: "曲がり — curve",
  tome: "止め tome — stop, press, gather", hane: "撥ね hane — pause and flick", harai: "払い harai — lift while moving",
  nuki: "懸針 nuki — needle point", ten: "点 ten — dot", itohiki: "糸引き — hairline link",
};

const PARAM_LABEL: Record<keyof ShodoTechniqueParams, string> = {
  uchikomiDepth: "press", uchikomiReach: "reach", uchikomiHold: "hold (s)", easeBack: "ease back",
  zohoReverse: "reverse", rohoBuild: "build",
  tensetsuShoulder: "shoulder", tensetsuPress: "press", tensetsuHold: "hold (s)",
  tomePress: "press", tomeReach: "reach", tomeHold: "hold (s)", suiro: "垂露 scale",
  haneHold: "pause (s)", haneLength: "length", haneSpeed: "flick (s)",
  haraiLift: "lift starts", kenshinLift: "lift starts",
  footPress: "foot press", footHold: "foot hold (s)", pullOut: "pull-out",
  tenPress: "press", tenHold: "hold (s)",
  musubiLift: "lift in loops",
};

const page: CSSProperties = {
  minHeight: "100vh", background: "#F3F1EC", color: "#25211D", padding: 20, boxSizing: "border-box",
  font: "14px/1.45 system-ui, sans-serif", display: "grid", gap: 14,
};
const panel: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "10px 16px" };
const label: CSSProperties = { display: "grid", gap: 3, fontWeight: 600, fontSize: 12.5 };
const button: CSSProperties = {
  minHeight: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #B9B2A6", background: "#FFFFFF",
  font: "600 13px system-ui", cursor: "pointer", color: "#25211D",
};

function Slider({ name, value, min, max, step, onChange, format }: {
  name: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return <label style={label}>
    <span>{name} · <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{format ? format(value) : value.toFixed(2)}</span></span>
    <input type="range" aria-label={name} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>;
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} style={{ display: "grid", gap: 8 }}>
    <h2 style={{ margin: 0, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: "#7A5A3A" }}>{title}</h2>
    <div style={panel}>{children}</div>
  </section>;
}

/** Frame clock for the demos: autoplays from 0 whenever `resetKey` changes, pauses at the end. */
export function useShodoPlayback(last: number, resetKey: unknown) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const lastRef = useRef(last);
  lastRef.current = last;
  useEffect(() => { setFrame(0); setPlaying(true); }, [resetKey]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, base = 0;
    setFrame(f => { base = f >= lastRef.current ? 0 : f; return base; });
    const start = performance.now();
    const tick = (now: number) => {
      const f = base + Math.floor((now - start) * FPS / 1000);
      if (f >= lastRef.current) { setFrame(lastRef.current); setPlaying(false); return; }
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return { frame, setFrame, playing, setPlaying };
}

/** Play/pause and frame scrubber shared by the SHO1 demos. */
export function ShodoTransport({ frame, last, playing, onPlaying, onFrame }: {
  frame: number; last: number; playing: boolean; onPlaying: (p: boolean) => void; onFrame: (f: number) => void;
}) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
    <button type="button" style={button} onClick={() => onPlaying(!playing)}>{playing ? "Pause" : frame >= last ? "Replay" : "Play"}</button>
    <label style={{ ...label, flex: "1 1 320px" }}>Frame · {frame} / {last} ({(frame / FPS).toFixed(2)} s)
      <input type="range" aria-label="Frame" min={0} max={last} value={frame} onChange={e => { onPlaying(false); onFrame(Number(e.target.value)); }} />
    </label>
  </div>;
}

export const SHODO_PHASE_LABEL = PHASE_LABEL;
export const SHODO_TECH_LABEL = TECH_LABEL;
export const SHODO_FPS = FPS;

export interface ShodoStudioProps {
  initialText?: string;
  initialStyle?: ShodoStyle;
}

/** Interactive SHO1 studio: every hand, brush, ink and paper parameter drives the real renderer. */
export function ShodoStudio({ initialText = "永", initialStyle = DEFAULT_SHODO_STYLE }: ShodoStudioProps) {
  const [text, setText] = useState(initialText);
  const [style, setStyle] = useState<ShodoStyle>(initialStyle);
  const [grid, setGrid] = useState(true);
  const [guide, setGuide] = useState<"none" | "current" | "all">("current");
  const [showBrush, setShowBrush] = useState(true);
  const teachers = useShodoTeachers();
  const [chosenMode, setGlyphMode] = useState<ShodoGlyphMode | null>(null);
  // A teacher's forms are the default whenever they are available.
  const glyphMode = chosenMode ?? (teachers.length ? "teacher" : "kanjivg");
  const set = <K extends keyof ShodoStyle>(group: K, patch: Partial<ShodoStyle[K]>) =>
    setStyle(s => ({ ...s, [group]: { ...(s[group] as object), ...patch } }));

  const chars = [...text].filter(c => c.trim()).slice(0, 4);
  const loaded = useShodoGlyphs(chars, glyphMode, {}, teachers);
  const glyphs = loaded?.glyphs ?? [];
  const loadError = loaded?.error ?? null;
  const paper = useMemo(() => {
    const ph = 660, pw = Math.round(ph * 242 / 333);
    return { x: Math.round((W - pw) / 2), y: 30, width: pw, height: ph };
  }, []);
  const issues = inspectShodoStyle(style);
  const plan = useMemo(() => {
    if (issues.length || !glyphs.length) return null;
    const n = glyphs.length;
    const size = Math.min(paper.width * .86, (paper.height - 60) / n);
    const items = glyphs.map((glyph, i) => ({
      glyph, size, x: paper.x + (paper.width - size) / 2, y: paper.y + (paper.height - size * n) / 2 + i * size,
    }));
    return planShodoWriting({ items, style, rest: [paper.x + paper.width + 90, paper.y + paper.height * .62], inkstone: [W - 60, paper.y + 120] });
  }, [loaded, style]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheet = useMemo(() => grid ? kenteiSheet(paper.width, paper.height, 1, Math.max(1, glyphs.length)) : null, [grid, paper, glyphs.length]);
  const last = plan ? Math.ceil(plan.duration * FPS) : 0;
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);

  const pose = plan ? shodoBrushPose(plan, frame / FPS) : null;
  const step = plan && pose?.contact ? plan.strokes[pose.stroke]?.samples.find(s => s.t >= frame / FPS) : undefined;
  // Teacher forms keep KanjiVG's stroke order, so they carry its credit too.
  const usesKanjiVg = glyphs.some(g => g.source === "kanjivg" || g.source === "teacher");

  return <div style={page}>
    <header style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 書道</div>
        <h1 style={{ margin: "2px 0 0", font: "600 26px/1.15 Georgia, serif" }}>Shodō brush calligraphy studio</h1>
      </div>
      <div aria-live="polite" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, minWidth: 320, textAlign: "right" }}>
        {pose ? <>{PHASE_LABEL[pose.phase] ?? pose.phase}{pose.technique ? <> — {TECH_LABEL[pose.technique] ?? pose.technique}</> : null}
          {step ? <div style={{ fontWeight: 500, fontSize: 12.5 }}>{shodoStepLabel(step)}</div> : null}</> : "—"}
      </div>
    </header>
    <div style={{ maxWidth: 1280, width: "100%", borderRadius: 6, overflow: "hidden", boxShadow: "0 14px 40px rgba(40,30,20,.18)" }}>
      {plan ? <ShodoCanvas plan={plan} frame={frame} fps={FPS} width={W} height={H} paper={paper} sheet={sheet}
        orderGuide={guide} showBrush={showBrush} label={`Brush calligraphy of ${chars.join("")}`} />
        : <div role="alert" style={{ padding: 24, background: "#fff" }}>
          {issues.length ? issues.map(i => i.path + ": " + i.message).join("; ") : loadError ?? "Loading strokes…"}
        </div>}
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
      <label style={label}>Text (1–4 characters)
        <input value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 34, font: "18px serif", width: 150 }} aria-label="Text" />
      </label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.keys(SHODO_GLYPHS).map(c => <button type="button" key={c} style={{ ...button, font: "20px serif", minWidth: 44 }} onClick={() => setText(c)}>{c}</button>)}
      </div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", fontSize: 12.5 }}>
      <label style={label}>Character shapes
        <select aria-label="Character shapes" value={glyphMode} onChange={e => setGlyphMode(e.target.value as ShodoGlyphMode)}>
          {teachers.length ? <option value="teacher">Teacher's own forms (local)</option> : null}
          <option value="kanjivg">KanjiVG strokes and layout rules (any character)</option>
          <option value="bundled">Bundled originals (offline)</option>
        </select>
      </label>
      <span>
        {glyphMode === "teacher" ? shodoTeacherLabels(chars, teachers).map(l => <span key={l}>{l}. </span>) : null}
        {usesKanjiVg ? <>{SHODO_KANJIVG_CREDIT}. Credit KanjiVG in any film made from it.</> : null}
      </span>
    </div>
    <Group title="Hand · 運筆">
      <label style={label}>Script
        <select value={style.hand.script} aria-label="Script" onChange={e => setStyle(s => ({ ...s, hand: { ...SHODO_HANDS[e.target.value as ShodoScript] } }))}>
          <option value="kaisho">楷書 kaisho (block)</option><option value="gyosho">行書 gyōsho (running)</option><option value="sosho">草書 sōsho (cursive)</option>
        </select>
      </label>
      <Slider name="Writing speed" value={style.hand.speed} min={.25} max={4} step={.05} onChange={v => set("hand", { speed: v })} format={v => v.toFixed(2) + "×"} />
      <Slider name="Strength (pressure)" value={style.hand.pressure} min={.3} max={1.8} step={.02} onChange={v => set("hand", { pressure: v })} />
      <Slider name="Width" value={style.hand.width} min={.4} max={2} step={.02} onChange={v => set("hand", { width: v })} />
      <Slider name="Width decay along stroke" value={style.hand.widthDecay} min={0} max={.8} step={.01} onChange={v => set("hand", { widthDecay: v })} />
      <Slider name="Entry angle (打ち込み)" value={style.hand.entryAngle} min={0} max={80} step={1} onChange={v => set("hand", { entryAngle: v })} format={v => v.toFixed(0) + "°"} />
      <Slider name="Tip follows motion" value={style.hand.tipFollow} min={0} max={1} step={.01} onChange={v => set("hand", { tipFollow: v })} />
      <Slider name="Pauses (溜め)" value={style.hand.pause} min={0} max={3} step={.05} onChange={v => set("hand", { pause: v })} />
      <Slider name="Hand tremor" value={style.hand.tremor} min={0} max={1} step={.01} onChange={v => set("hand", { tremor: v })} />
      <Slider name="Hairline links (連綿)" value={style.hand.ligature} min={0} max={1} step={.01} onChange={v => set("hand", { ligature: v })} />
    </Group>
    <Group title="Basics · 筆法 (start, turn, stop, end)">
      {SHODO_BASICS.flatMap(basic => basic.params.map(key => {
        const [min, max] = SHODO_TECHNIQUE_RANGES[key];
        return <Slider key={key} name={`${basic.term} ${PARAM_LABEL[key]}`} value={style.technique[key]} min={min} max={max}
          step={(max - min) / 100} onChange={v => set("technique", { [key]: v } as Partial<ShodoTechniqueParams>)} />;
      }))}
      <Slider name={`結び (かな) ${PARAM_LABEL.musubiLift}`} value={style.technique.musubiLift} min={SHODO_TECHNIQUE_RANGES.musubiLift[0]}
        max={SHODO_TECHNIQUE_RANGES.musubiLift[1]} step={.01} onChange={v => set("technique", { musubiLift: v })} />
    </Group>
    <Group title="Ink · 墨">
      <label style={label}>Ink
        <select aria-label="Ink" onChange={e => setStyle(s => ({ ...s, ink: { ...SHODO_INKS[e.target.value as keyof typeof SHODO_INKS] } }))} defaultValue="sumi">
          <option value="sumi">濃墨 dense sumi</option><option value="seiboku">青墨 blue-black</option><option value="chaboku">茶墨 brown-black</option>
          <option value="tanboku">淡墨 diluted</option><option value="shuboku">朱墨 vermilion</option>
        </select>
      </label>
      <label style={label}>Colour<input type="color" aria-label="Ink colour" value={style.ink.color} onChange={e => set("ink", { color: e.target.value.toUpperCase() })} /></label>
      <Slider name="Colour strength" value={style.ink.strength} min={.08} max={1} step={.01} onChange={v => set("ink", { strength: v })} />
      <Slider name="Colour strength decay" value={style.ink.decay} min={0} max={1.5} step={.01} onChange={v => set("ink", { decay: v })} />
      <Slider name="Fade as brush empties" value={style.ink.fade} min={0} max={1} step={.01} onChange={v => set("ink", { fade: v })} />
      <Slider name="Ink load" value={style.ink.load} min={.1} max={1} step={.01} onChange={v => set("ink", { load: v })} />
      <Slider name="Water" value={style.ink.water} min={0} max={1} step={.01} onChange={v => set("ink", { water: v })} />
      <Slider name="Re-dip below" value={style.ink.redipBelow} min={0} max={.9} step={.01} onChange={v => set("ink", { redipBelow: v })} />
    </Group>
    <Group title="Brush · 筆">
      <label style={label}>Brush
        <select aria-label="Brush" defaultValue="goat-large" onChange={e => setStyle(s => ({ ...s, brush: { ...SHODO_BRUSHES[e.target.value as keyof typeof SHODO_BRUSHES] } }))}>
          <option value="goat-large">羊毛 large goat hair</option><option value="weasel-firm">イタチ firm weasel</option>
          <option value="mixed-practice">兼毫 mixed hair</option><option value="kofude-small">小筆 small brush</option>
        </select>
      </label>
      <Slider name="Brush size (tuft diameter)" value={style.brush.diameter} min={20} max={220} step={1} onChange={v => set("brush", { diameter: v })} format={v => v.toFixed(0)} />
      <Slider name="Tuft length" value={style.brush.length} min={2.2} max={6} step={.05} onChange={v => set("brush", { length: v })} />
      <Slider name="Spring (コシ)" value={style.brush.stiffness} min={0} max={1} step={.01} onChange={v => set("brush", { stiffness: v })} />
      <Slider name="Bristle lanes" value={style.brush.bristles} min={16} max={96} step={1} onChange={v => set("brush", { bristles: v })} format={v => v.toFixed(0)} />
      <Slider name="Handle lean at rest" value={style.hand.lean} min={0} max={60} step={1} onChange={v => set("hand", { lean: v })} format={v => v.toFixed(0) + "°"} />
      <Slider name="直筆 ↔ 側筆 (tilt into travel)" value={style.hand.sideBrush} min={0} max={1} step={.01} onChange={v => set("hand", { sideBrush: v })} />
      <label style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={showBrush} onChange={e => setShowBrush(e.target.checked)} />Show brush</label>
    </Group>
    <Group title="Paper · 紙">
      <label style={label}>Paper
        <select aria-label="Paper" defaultValue="hanshi" onChange={e => setStyle(s => ({ ...s, paper: { ...SHODO_PAPERS[e.target.value as keyof typeof SHODO_PAPERS] } }))}>
          <option value="hanshi">半紙 hanshi</option><option value="gasenshi">画仙紙 gasenshi</option><option value="sized">礬水紙 sized</option><option value="practice">練習紙 practice</option>
        </select>
      </label>
      <Slider name="Absorbency (にじみ)" value={style.paper.absorbency} min={0} max={1} step={.01} onChange={v => set("paper", { absorbency: v })} />
      <Slider name="Fibre" value={style.paper.fibre} min={0} max={1} step={.01} onChange={v => set("paper", { fibre: v })} />
      <Slider name="Tooth (かすれ catch)" value={style.paper.tooth} min={0} max={1} step={.01} onChange={v => set("paper", { tooth: v })} />
      <Slider name="Drying time" value={style.paper.dryingSeconds} min={.5} max={12} step={.1} onChange={v => set("paper", { dryingSeconds: v })} format={v => v.toFixed(1) + " s"} />
      <label style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} />Kentei grid (朱罫)</label>
      <label style={label}>Stroke-order guide
        <select aria-label="Stroke-order guide" value={guide} onChange={e => setGuide(e.target.value as "none" | "current" | "all")}>
          <option value="none">None</option><option value="current">Current stroke</option><option value="all">All strokes</option>
        </select>
      </label>
      <Slider name="Seed" value={style.seed} min={0} max={9999} step={1} onChange={v => setStyle(s => ({ ...s, seed: v }))} format={v => v.toFixed(0)} />
    </Group>
  </div>;
}
