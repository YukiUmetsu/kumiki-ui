// Demo fonts (OFL-1.1, pinned @fontsource packages). They load only when this lab opens; the library itself takes any CSS font.
import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/rubik";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource-variable/noto-serif-jp";
import "@fontsource/bebas-neue";
import "@fontsource/pacifico";
import "../styles/collage-fonts.css";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Material, MeshPhysicalMaterial } from "three";

import { planSculpturalText } from "../../registry/motion/sculptural-type";
import type { ReliefProfile, SculptEnter, SculptGradient, SculptIdle, SculptKey, SculptLook, SculpturalTextPlan } from "../../registry/motion/sculptural-type";
import { SCULPT_MATERIAL_PRESETS, SculpturalTextObject, disposeSculptMaterial, finishMaterial, sculptMaterial } from "../../registry/motion/sculptural-type-three";
import type { SculptFinishKind } from "../../registry/motion/sculptural-type-three";
import { findMaterial } from "../../registry/materials/materials-physics";
import { materialTexture } from "../../registry/materials/materials-texture";
import type { EasingSpec, MotionTimeline } from "../../registry/motion/types";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { STUDIO_FLOOR_Y, createStudioStage } from "./three-studio-stage";
import type { StudioStage } from "./three-studio-stage";

const FPS = 30;
const RESOLUTION = 160;
const inputClass = "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-body-sm text-foreground";
const colourClass = "h-11 w-full cursor-pointer rounded-control border border-border bg-surface p-1";

/** Bundled faces first (they render the same everywhere), then system faces. `weights` is the weight range a face has. */
const FONTS: readonly { id: string; label: string; group: string; family: string; weights: readonly [number, number] }[] = [
  { id: "geist", label: "Geist", group: "Sans", family: '"Geist Variable", "Noto Sans JP Variable", sans-serif', weights: [100, 900] },
  { id: "inter", label: "Inter", group: "Sans", family: '"Inter Variable", "Noto Sans JP Variable", sans-serif', weights: [100, 900] },
  { id: "space-grotesk", label: "Space Grotesk", group: "Sans", family: '"Space Grotesk Variable", "Noto Sans JP Variable", sans-serif', weights: [300, 700] },
  { id: "bricolage", label: "Bricolage Grotesque", group: "Sans", family: '"Bricolage Grotesque Variable", "Noto Sans JP Variable", sans-serif', weights: [200, 800] },
  { id: "rubik", label: "Rubik (rounded)", group: "Sans", family: '"Rubik Variable", "Noto Sans JP Variable", sans-serif', weights: [300, 900] },
  { id: "newsreader", label: "Newsreader", group: "Serif", family: '"Newsreader Variable", "Noto Serif JP Variable", serif', weights: [200, 800] },
  { id: "playfair", label: "Playfair Display", group: "Serif", family: '"Playfair Display Variable", "Noto Serif JP Variable", serif', weights: [400, 900] },
  { id: "fraunces", label: "Fraunces (soft)", group: "Serif", family: '"Fraunces Variable", "Noto Serif JP Variable", serif', weights: [100, 900] },
  { id: "unbounded", label: "Unbounded (wide)", group: "Display", family: '"Unbounded Variable", "Noto Sans JP Variable", sans-serif', weights: [200, 900] },
  { id: "bebas", label: "Bebas Neue (condensed)", group: "Display", family: '"Bebas Neue", "Noto Sans JP Variable", sans-serif', weights: [400, 400] },
  { id: "anton", label: "Anton (condensed)", group: "Display", family: 'Anton, "Noto Sans JP Variable", sans-serif', weights: [400, 400] },
  { id: "pacifico", label: "Pacifico (script; sculpt words)", group: "Display", family: 'Pacifico, "Noto Sans JP Variable", cursive', weights: [400, 400] },
  { id: "jetbrains", label: "JetBrains Mono", group: "Mono", family: '"JetBrains Mono Variable", "Noto Sans JP Variable", monospace', weights: [100, 800] },
  { id: "noto-serif-jp", label: "Noto Serif JP (Mincho)", group: "Japanese", family: '"Noto Serif JP Variable", serif', weights: [200, 900] },
  { id: "noto-sans-jp", label: "Noto Sans JP (Gothic)", group: "Japanese", family: '"Noto Sans JP Variable", sans-serif', weights: [100, 900] },
  { id: "georgia", label: "Georgia", group: "System", family: 'Georgia, "Noto Serif JP Variable", serif', weights: [400, 700] },
  { id: "helvetica", label: "Helvetica / Arial", group: "System", family: '"Helvetica Neue", Helvetica, Arial, "Noto Sans JP Variable", sans-serif', weights: [300, 700] },
  { id: "impact", label: "Impact", group: "System", family: 'Impact, "Arial Narrow Bold", "Noto Sans JP Variable", sans-serif', weights: [400, 400] },
  { id: "courier", label: "Courier", group: "System", family: '"Courier New", Courier, "Noto Sans JP Variable", monospace', weights: [400, 700] },
  { id: "mincho", label: "Hiragino Mincho", group: "System", family: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP Variable", serif', weights: [300, 600] },
  { id: "gothic", label: "Hiragino Sans", group: "System", family: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP Variable", sans-serif', weights: [100, 900] },
];
const FONT_GROUPS = [...new Set(FONTS.map((font) => font.group))];

const PROFILE_KINDS: { id: ReliefProfile["kind"]; label: string }[] = [
  { id: "round", label: "Round bevel" }, { id: "chamfer", label: "Chamfer" }, { id: "pillow", label: "Pillow (inflated)" },
  { id: "chisel", label: "Chisel (V-cut)" }, { id: "flat", label: "Flat extrusion" },
];

const ENTERS: { id: SculptEnter; label: string }[] = [
  { id: "drop", label: "Drop" }, { id: "unfold", label: "Unfold" }, { id: "twist", label: "Twist" },
  { id: "inflate", label: "Inflate" }, { id: "swing", label: "Swing" }, { id: "rise", label: "Rise" }, { id: "none", label: "None" },
];

const FINISHES: { id: SculptFinishKind; label: string }[] = [
  { id: "gloss", label: "Gloss" }, { id: "satin", label: "Satin" }, { id: "matte", label: "Matte" }, { id: "clay", label: "Clay" },
  { id: "metal", label: "Coloured metal" }, { id: "chrome", label: "Chrome" }, { id: "glass", label: "Glass" },
];

const EASINGS: { id: string; label: string; easing: EasingSpec }[] = [
  { id: "ease-in-out-cubic", label: "Ease in-out", easing: "ease-in-out-cubic" },
  { id: "linear", label: "Linear", easing: "linear" },
  { id: "ease-out-back", label: "Overshoot", easing: "ease-out-back" },
  { id: "expressive", label: "Expressive bezier", easing: { cubicBezier: [0.7, 0, 0.2, 1] } },
];

interface LookControls {
  text: string;
  fontId: string;
  weight: number;
  italic: boolean;
  profileKind: ReliefProfile["kind"];
  bevelWidth: number;
  bevelHeight: number;
  chiselAngle: number;
  depth: number;
  width: number;
  height: number;
  tracking: number;
  color: string;
  gradientOn: boolean;
  gradientKind: "linear" | "radial";
  gradientAngle: number;
  gradientSpace: "text" | "letter";
  stops: [string, string, string];
  sideOn: boolean;
  sideColor: string;
}

const LOOK_A: LookControls = {
  text: "Kumiki", fontId: "geist", weight: 800, italic: false, profileKind: "round", bevelWidth: 0.05, bevelHeight: 0.035, chiselAngle: 38,
  depth: 0.18, width: 1, height: 1, tracking: 0, color: "#f2c14e", gradientOn: true, gradientKind: "linear", gradientAngle: 90,
  gradientSpace: "text", stops: ["#e4572e", "#f2a541", "#f6e27f"], sideOn: true, sideColor: "#7a2e1f",
};
const LOOK_B: LookControls = {
  ...LOOK_A, text: "組木", fontId: "noto-serif-jp", weight: 700, profileKind: "chisel", depth: 0.24, width: 1, height: 1,
  color: "#2ec4b6", stops: ["#1b3a4b", "#2ec4b6", "#cbf3f0"], sideColor: "#0b1f29",
};

function fontOf(look: LookControls): string {
  const font = FONTS.find((candidate) => candidate.id === look.fontId) ?? FONTS[0];
  const weight = Math.min(font.weights[1], Math.max(font.weights[0], look.weight));
  return `${look.italic ? "italic " : ""}${weight} ${RESOLUTION}px ${font.family}`;
}

function profileOf(look: LookControls): ReliefProfile {
  switch (look.profileKind) {
    case "flat": return { kind: "flat" };
    case "pillow": return { kind: "pillow", height: look.bevelHeight * 2.5 };
    case "chisel": return { kind: "chisel", angle: look.chiselAngle };
    default: return { kind: look.profileKind, width: look.bevelWidth, height: look.bevelHeight };
  }
}

function lookOf(look: LookControls, tint: boolean): SculptLook {
  const gradient: SculptGradient | undefined = tint && look.gradientOn
    ? { kind: look.gradientKind, angle: look.gradientAngle, space: look.gradientSpace, stops: look.stops.map((color, i) => ({ at: i / 2, color })) }
    : undefined;
  return {
    text: look.text || " ", font: fontOf(look), profile: profileOf(look), depth: look.depth, width: look.width, height: look.height,
    tracking: look.tracking, color: tint ? look.color : "#ffffff", gradient, sideColor: tint && look.sideOn ? look.sideColor : undefined,
  };
}

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group min-w-0 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <summary className="min-h-9 cursor-pointer list-none text-body-sm font-medium text-foreground marker:content-none">
        <span className="inline-block w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">›</span>{title}
      </summary>
      <div className="mt-3 flex min-w-0 flex-col gap-4">{children}</div>
    </details>
  );
}

function NumberSlider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void;
}) {
  return <Slider label={label} min={min} max={max} step={step} value={value} showValue
    formatValue={(v) => `${Number.isInteger(step) ? v : v.toFixed(step < 0.01 ? 3 : 2)}${unit ?? ""}`}
    onValueChange={(v) => onChange(Array.isArray(v) ? v[0] ?? value : v)} />;
}

function WeightControl({ look, label, onChange }: { look: LookControls; label: string; onChange: (value: number) => void }) {
  const [min, max] = (FONTS.find((font) => font.id === look.fontId) ?? FONTS[0]).weights;
  if (min === max) return <p className="text-caption text-muted-foreground">{label}: this face has one weight ({min}).</p>;
  return <NumberSlider label={label} value={Math.min(max, Math.max(min, look.weight))} min={min} max={max} step={100} onChange={onChange} />;
}

/** Controls for one look; `prefix` keeps labels unique when two looks are on screen. */
function LookEditor({ look, onChange, prefix, compact = false }: { look: LookControls; onChange: (look: LookControls) => void; prefix: string; compact?: boolean }) {
  const set = <K extends keyof LookControls>(key: K, value: LookControls[K]) => onChange({ ...look, [key]: value });
  const label = (text: string) => (prefix ? `${prefix} ${text.toLowerCase()}` : text);
  return (
    <>
      <Section title={label("Letters")} open={!compact}>
        <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Text")}
          <input className={inputClass} value={look.text} maxLength={18} onChange={(event) => set("text", event.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Font")}
          <select className={inputClass} value={look.fontId} onChange={(event) => set("fontId", event.target.value)}>
            {FONT_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {FONTS.filter((font) => font.group === group).map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <WeightControl look={look} label={label("Weight")} onChange={(v) => set("weight", v)} />
        <Checkbox label={label("Italic")} checked={look.italic} onCheckedChange={(v) => set("italic", v)} />
      </Section>
      <Section title={label("Colour")}>
        <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Face colour")}
          <input type="color" className={colourClass} value={look.color} onChange={(event) => set("color", event.target.value)} />
        </label>
        <Checkbox label={label("Gradient")} checked={look.gradientOn} onCheckedChange={(v) => set("gradientOn", v)} />
        {look.gradientOn ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {look.stops.map((stop, i) => (
                <label key={i} className="flex flex-col gap-1.5 text-caption text-muted-foreground">{["Start", "Middle", "End"][i]}
                  <input type="color" aria-label={label(`Gradient ${["start", "middle", "end"][i]} colour`)} className={colourClass} value={stop}
                    onChange={(event) => { const stops = [...look.stops] as LookControls["stops"]; stops[i] = event.target.value; set("stops", stops); }} />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Kind")}
                <select className={inputClass} value={look.gradientKind} onChange={(event) => set("gradientKind", event.target.value as LookControls["gradientKind"])}>
                  <option value="linear">Linear</option><option value="radial">Radial</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Spread")}
                <select className={inputClass} value={look.gradientSpace} onChange={(event) => set("gradientSpace", event.target.value as LookControls["gradientSpace"])}>
                  <option value="text">Across text</option><option value="letter">Per letter</option>
                </select>
              </label>
            </div>
            {look.gradientKind === "linear" ? <NumberSlider label={label("Angle")} value={look.gradientAngle} min={0} max={360} step={5} unit="°" onChange={(v) => set("gradientAngle", v)} /> : null}
          </>
        ) : null}
        <Checkbox label={label("Separate side colour")} checked={look.sideOn} onCheckedChange={(v) => set("sideOn", v)} />
        {look.sideOn ? (
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Side colour")}
            <input type="color" className={colourClass} value={look.sideColor} onChange={(event) => set("sideColor", event.target.value)} />
          </label>
        ) : null}
      </Section>
      <Section title={label("Shape")}>
        <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label("Face profile")}
          <select className={inputClass} value={look.profileKind} onChange={(event) => set("profileKind", event.target.value as ReliefProfile["kind"])}>
            {PROFILE_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
          </select>
        </label>
        {look.profileKind === "round" || look.profileKind === "chamfer" ? (
          <NumberSlider label={label("Bevel width")} value={look.bevelWidth} min={0.01} max={0.12} step={0.005} unit=" em" onChange={(v) => set("bevelWidth", v)} />
        ) : null}
        {look.profileKind === "round" || look.profileKind === "chamfer" || look.profileKind === "pillow" ? (
          <NumberSlider label={label("Bevel height")} value={look.bevelHeight} min={0.005} max={0.08} step={0.005} unit=" em" onChange={(v) => set("bevelHeight", v)} />
        ) : null}
        {look.profileKind === "chisel" ? <NumberSlider label={label("Chisel angle")} value={look.chiselAngle} min={15} max={60} step={1} unit="°" onChange={(v) => set("chiselAngle", v)} /> : null}
        <NumberSlider label={label("Depth")} value={look.depth} min={0.02} max={0.6} step={0.02} unit=" em" onChange={(v) => set("depth", v)} />
        <NumberSlider label={label("Width")} value={look.width} min={0.5} max={1.8} step={0.05} unit="×" onChange={(v) => set("width", v)} />
        <NumberSlider label={label("Height")} value={look.height} min={0.5} max={1.8} step={0.05} unit="×" onChange={(v) => set("height", v)} />
        <NumberSlider label={label("Tracking")} value={look.tracking} min={-0.1} max={0.4} step={0.01} unit=" em" onChange={(v) => set("tracking", v)} />
      </Section>
    </>
  );
}

export interface SculpturalTypeLabProps {
  initialMorph?: boolean;
  /** Progress through the timeline, 0–1. */
  initialProgress?: number;
}

/**
 * Letters as dimensional, deformable, material-bearing objects. Every part of the look is configurable, and a second
 * look can be keyed: letters morph between the two, outline, colour and all.
 */
export function SculpturalTypeLab({ initialMorph = true, initialProgress = 0.3 }: SculpturalTypeLabProps) {
  const [lookA, setLookA] = useState<LookControls>(LOOK_A);
  const [lookB, setLookB] = useState<LookControls>(LOOK_B);
  const [morphOn, setMorphOn] = useState(initialMorph);
  const [morphStart, setMorphStart] = useState(60);
  const [morphFrames, setMorphFrames] = useState(60);
  const [morphStagger, setMorphStagger] = useState(3);
  const [easingId, setEasingId] = useState("ease-in-out-cubic");
  const [surface, setSurface] = useState<"finish" | "matl1">("finish");
  const [finish, setFinish] = useState<SculptFinishKind>("gloss");
  const [materialId, setMaterialId] = useState("marble");
  const [tint, setTint] = useState(true);
  const [unit, setUnit] = useState<"grapheme" | "word">("grapheme");
  const [slab, setSlab] = useState(false);
  const [enter, setEnter] = useState<SculptEnter>("drop");
  const [idle, setIdle] = useState<SculptIdle>("none");
  const [intensity, setIntensity] = useState(1);
  const [stagger, setStagger] = useState(3);
  const [plan, setPlan] = useState<SculpturalTextPlan | null>(null);
  const [status, setStatus] = useState("Building letters…");
  const [frameMs, setFrameMs] = useState<number | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<StudioStage | null>(null);
  const objectRef = useRef<SculpturalTextObject | null>(null);
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const duration = plan ? plan.frames.settled + 2 * FPS : 6 * FPS;
  const tinted = surface === "finish" || tint;

  // One stable object per change of any setting; deferring it keeps sliders responsive while the letters rebuild.
  const current = useMemo(() => ({ lookA, lookB, morphOn, morphStart, morphFrames, morphStagger, easingId, enter, idle, intensity, stagger, tinted, unit }),
    [lookA, lookB, morphOn, morphStart, morphFrames, morphStagger, easingId, enter, idle, intensity, stagger, tinted, unit]);
  const settings = useDeferredValue(current);
  useEffect(() => {
    let cancelled = false;
    const a = lookOf(settings.lookA, settings.tinted);
    const b = lookOf(settings.lookB, settings.tinted);
    const easing = EASINGS.find((option) => option.id === settings.easingId)?.easing ?? "ease-in-out-cubic";
    const keys: SculptKey[] = settings.morphOn
      ? [{ frame: settings.morphStart, look: {} }, { frame: settings.morphStart + settings.morphFrames, look: b, easing, stagger: settings.morphStagger }]
      : [];
    setStatus("Building letters…");
    const run = async () => {
      const fonts = settings.morphOn ? [[a.font, a.text], [b.font, b.text]] : [[a.font, a.text]];
      await Promise.all(fonts.map(([font, text]) => document.fonts.load(font, text).catch(() => undefined)));
      if (cancelled) return;
      const started = performance.now();
      const next = planSculpturalText({
        id: "lab", ...a, unit: settings.unit, fps: { num: FPS, den: 1 }, stagger: settings.stagger,
        motion: { enter: settings.enter, idle: settings.idle, intensity: settings.intensity }, keys,
      });
      if (cancelled) return;
      const vertices = next.glyphs.reduce((sum, glyph) => sum + glyph.solid.positions.length / 3, 0);
      setStatus(`${next.glyphs.length} letters · ${vertices.toLocaleString()} vertices · built in ${Math.round(performance.now() - started)} ms`);
      setPlan(next);
      setFrame((current) => (current === 0 ? Math.round(initialProgress * (next.frames.settled + 2 * FPS - 1)) : Math.min(current, next.frames.settled + 2 * FPS - 1)));
    };
    void run();
    return () => { cancelled = true; };
  }, [settings, initialProgress]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    try {
      const stage = createStudioStage(host, canvas);
      stage.camera.position.set(0, STUDIO_FLOOR_Y + 1.35, 4.4);
      stage.controls.target.set(0, STUDIO_FLOOR_Y + 0.5, 0);
      stage.controls.update();
      stageRef.current = stage;
    } catch (error) {
      setWebglError(error instanceof Error ? error.message : String(error));
      return;
    }
    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, []);

  const matl1Cache = useRef(new Map<string, MeshPhysicalMaterial>());
  useEffect(() => () => {
    for (const material of matl1Cache.current.values()) disposeSculptMaterial(material);
    matl1Cache.current.clear();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !plan) return;
    let material: Material;
    let owned: Material | null = null;
    let metal: boolean;
    if (surface === "matl1") {
      const record = findMaterial(materialId);
      if (!record) return;
      metal = record.metal === 1;
      let cached = matl1Cache.current.get(materialId);
      if (!cached) {
        cached = sculptMaterial(record, materialTexture(materialId), { emMm: 140, relief: 0.6, detail: metal ? 0.35 : 1 });
        matl1Cache.current.set(materialId, cached);
      }
      material = cached;
    } else {
      metal = finish === "metal" || finish === "chrome";
      owned = finishMaterial({ kind: finish });
      material = owned;
    }
    // Metals show only what they reflect, so they get a brighter room; diffuse whites would blow out in it.
    stage.scene.environmentIntensity = metal ? 1.05 : 0.55;
    stage.renderer.toneMappingExposure = metal ? 1 : 0.9;
    const object = new SculpturalTextObject(plan, { material, uvSpace: slab ? "text" : "letter" });
    // Fit about 3.4 world units of width; the first line's baseline rests on the studio floor.
    const scale = Math.min(3.4 / Math.max(plan.block.width, 0.5), 1.9 / Math.max(plan.block.height, 0.5));
    object.scale.setScalar(scale);
    const baseline = plan.glyphs.length ? Math.min(...plan.glyphs.map((glyph) => glyph.rest[1])) : 0;
    object.position.set(0, STUDIO_FLOOR_Y - baseline * scale, 0);
    object.update(frameRef.current, prefersReducedMotion);
    stage.scene.add(object);
    objectRef.current = object;
    stage.render();
    return () => {
      stage.scene.remove(object);
      object.dispose();
      owned?.dispose();
      if (objectRef.current === object) objectRef.current = null;
    };
  }, [plan, surface, finish, materialId, slab, prefersReducedMotion]);

  useEffect(() => {
    const object = objectRef.current;
    if (!object) return;
    const started = performance.now();
    object.update(frame, prefersReducedMotion);
    setFrameMs(performance.now() - started);
    stageRef.current?.render();
  }, [frame, prefersReducedMotion]);

  const timeline = useMemo<MotionTimeline>(() => ({ schemaVersion: 1, id: "sculptural-type", fps: { num: FPS, den: 1 }, durationFrames: duration, nodes: [] }), [duration]);
  const phaseLabel = !morphOn ? lookA.text : frame < morphStart ? lookA.text : frame >= morphStart + morphFrames ? lookB.text : `${lookA.text} → ${lookB.text}`;

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Sculptural type</h2>
        <p className="text-body-sm text-muted-foreground">
          Every letter is a solid built from its distance field. Configure the font, colour or gradient, surface, profile, depth, width
          and height; key a second look and the letters morph to it, outline and colour together. Drag the stage to orbit.
        </p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Sculptural type stage" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-body font-medium text-foreground">{phaseLabel}</p>
              <p className="font-mono text-caption tabular-nums text-muted-foreground" aria-live="polite">
                {status}{frameMs !== null ? ` · frame ${frameMs.toFixed(1)} ms` : ""}
              </p>
            </div>
            <div ref={hostRef} className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-surface-inset">
              <canvas ref={canvasRef} role="img" className="block h-full w-full touch-none"
                aria-label={`Sculpted letters: ${phaseLabel}, frame ${frame}`} />
              {webglError ? <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-body-sm text-muted-foreground">WebGL is not available in this browser, so the 3D stage cannot draw. ({webglError})</p> : null}
            </div>
          </figure>
          <MotionScrubber timeline={timeline} frame={Math.min(frame, duration - 1)} onFrame={setFrame} label="Frame" />
        </section>
        <aside aria-label="Sculptural type configuration" className="flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
          <LookEditor look={lookA} onChange={setLookA} prefix="" />
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sculpt each">
            <Button size="sm" variant={unit === "grapheme" ? "primary" : "outline"} aria-pressed={unit === "grapheme"} onClick={() => setUnit("grapheme")}>Each letter</Button>
            <Button size="sm" variant={unit === "word" ? "primary" : "outline"} aria-pressed={unit === "word"} onClick={() => setUnit("word")}>Each word</Button>
          </div>
          <p className="-mt-1 text-caption text-muted-foreground">Sculpt words for script faces and joined scripts, so their letters stay connected.</p>
          <Section title="Surface">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Surface type">
              <Button size="sm" variant={surface === "finish" ? "primary" : "outline"} aria-pressed={surface === "finish"} onClick={() => setSurface("finish")}>Finish</Button>
              <Button size="sm" variant={surface === "matl1" ? "primary" : "outline"} aria-pressed={surface === "matl1"} onClick={() => setSurface("matl1")}>Material</Button>
            </div>
            {surface === "finish" ? (
              <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Finish
                <select className={inputClass} value={finish} onChange={(event) => setFinish(event.target.value as SculptFinishKind)}>
                  {FINISHES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Material (MATL1, measured texture)
                  <select className={inputClass} value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
                    {SCULPT_MATERIAL_PRESETS.map((id) => <option key={id} value={id}>{findMaterial(id)?.name ?? id}</option>)}
                  </select>
                </label>
                <Checkbox label="Tint with the colour or gradient" checked={tint} onCheckedChange={setTint} />
              </>
            )}
            <Checkbox label="Cut every letter from one slab (texture runs across the text)" checked={slab} onCheckedChange={setSlab} />
          </Section>
          <Section title="Entrance">
            <div className="grid grid-cols-4 gap-2">
              {ENTERS.map((option) => (
                <Button key={option.id} size="sm" variant={option.id === enter ? "primary" : "outline"} aria-pressed={option.id === enter} onClick={() => setEnter(option.id)}>
                  {option.label}
                </Button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-body-sm text-foreground">After arriving
              <select className={inputClass} value={idle} onChange={(event) => setIdle(event.target.value as SculptIdle)}>
                <option value="none">Rest</option><option value="wave">Wave along the line</option><option value="breathe">Breathe (relief swells)</option>
              </select>
            </label>
            <NumberSlider label="Intensity" value={intensity} min={0} max={2} step={0.1} onChange={setIntensity} />
            <NumberSlider label="Entrance stagger" value={stagger} min={0} max={10} step={1} unit=" frames" onChange={setStagger} />
          </Section>
          <Section title="Morph to a second look" open>
            <Checkbox label="Animate to a second look" checked={morphOn} onCheckedChange={setMorphOn} />
            {morphOn ? (
              <>
                <NumberSlider label="Morph starts" value={morphStart} min={0} max={180} step={5} unit=" frames" onChange={setMorphStart} />
                <NumberSlider label="Morph length" value={morphFrames} min={10} max={150} step={5} unit=" frames" onChange={setMorphFrames} />
                <NumberSlider label="Morph stagger" value={morphStagger} min={0} max={10} step={1} unit=" frames" onChange={setMorphStagger} />
                <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Morph easing
                  <select className={inputClass} value={easingId} onChange={(event) => setEasingId(event.target.value)}>
                    {EASINGS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <LookEditor look={lookB} onChange={setLookB} prefix="Second" compact />
              </>
            ) : null}
          </Section>
        </aside>
      </div>
    </div>
  );
}
