import { useEffect, useMemo, useRef, useState } from "react";
import type { MeshPhysicalMaterial } from "three";

import { planSculpturalText } from "../../registry/motion/sculptural-type";
import type { ReliefProfile, SculptEnter, SculptIdle, SculpturalTextPlan } from "../../registry/motion/sculptural-type";
import { SCULPT_MATERIAL_PRESETS, SculpturalTextObject, disposeSculptMaterial, sculptMaterial } from "../../registry/motion/sculptural-type-three";
import { findMaterial } from "../../registry/materials/materials-physics";
import { materialTexture } from "../../registry/materials/materials-texture";
import type { MotionTimeline } from "../../registry/motion/types";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { STUDIO_FLOOR_Y, createStudioStage } from "./three-studio-stage";
import type { StudioStage } from "./three-studio-stage";

const FPS = 30;
const selectClass = "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-body-sm text-foreground";

const PROFILES: { id: string; label: string; profile: ReliefProfile }[] = [
  { id: "round", label: "Round bevel", profile: { kind: "round", width: 0.05, height: 0.035 } },
  { id: "chamfer", label: "Chamfer", profile: { kind: "chamfer", width: 0.045, height: 0.03 } },
  { id: "pillow", label: "Pillow (inflated)", profile: { kind: "pillow", height: 0.09 } },
  { id: "chisel", label: "Chisel (V-cut prism)", profile: { kind: "chisel", angle: 38 } },
  { id: "flat", label: "Flat (plain extrusion)", profile: { kind: "flat" } },
];

const ENTERS: { id: SculptEnter; label: string }[] = [
  { id: "drop", label: "Drop" }, { id: "unfold", label: "Unfold" }, { id: "twist", label: "Twist" },
  { id: "inflate", label: "Inflate" }, { id: "swing", label: "Swing" }, { id: "rise", label: "Rise" },
];

const FONTS = [
  { id: "sans", label: "Sans (Geist)", family: '"Geist Variable", "Hiragino Sans", "Noto Sans JP", sans-serif', weight: 800 },
  { id: "serif", label: "Serif (Newsreader)", family: '"Newsreader Variable", "Hiragino Mincho ProN", "Noto Serif JP", serif', weight: 700 },
];

export interface SculpturalTypeLabProps {
  initialText?: string;
  initialMaterial?: string;
  initialProfile?: string;
  initialEnter?: SculptEnter;
  /** Progress through the timeline, 0–1. */
  initialProgress?: number;
}

/** Letters as dimensional, deformable, material-bearing objects: relief profile, MATL1 material, entrance and idle. */
export function SculpturalTypeLab({ initialText = "Kumiki", initialMaterial = "gold", initialProfile = "round", initialEnter = "drop", initialProgress = 0.35 }: SculpturalTypeLabProps) {
  const [text, setText] = useState(initialText);
  const [fontId, setFontId] = useState("sans");
  const [profileId, setProfileId] = useState(initialProfile);
  const [materialId, setMaterialId] = useState(initialMaterial);
  const [enter, setEnter] = useState<SculptEnter>(initialEnter);
  const [idle, setIdle] = useState<SculptIdle>("none");
  const [depth, setDepth] = useState(0.16);
  const [intensity, setIntensity] = useState(1);
  const [stagger, setStagger] = useState(3);
  const [plan, setPlan] = useState<SculpturalTextPlan | null>(null);
  const [status, setStatus] = useState("Building letters…");
  const [webglError, setWebglError] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<StudioStage | null>(null);
  const objectRef = useRef<SculpturalTextObject | null>(null);
  const duration = plan ? plan.frames.settled + 2 * FPS : 4 * FPS;
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const font = FONTS.find((candidate) => candidate.id === fontId) ?? FONTS[0];
  const profile = (PROFILES.find((candidate) => candidate.id === profileId) ?? PROFILES[0]).profile;

  // Build the plan after the font loads; geometry depends on text, font, profile and depth, timing on the rest.
  useEffect(() => {
    let cancelled = false;
    const fontSpec = `${font.weight} 160px ${font.family}`;
    setStatus("Building letters…");
    const run = async () => {
      try { await document.fonts.load(fontSpec, text); } catch { /* the browser falls back to another face */ }
      if (cancelled) return;
      const started = performance.now();
      const next = planSculpturalText({
        id: "lab", text: text || " ", font: fontSpec, profile, depth, stagger, motion: { enter, idle, intensity }, fps: { num: FPS, den: 1 },
      });
      if (cancelled) return;
      const vertices = next.glyphs.reduce((sum, glyph) => sum + glyph.solid.positions.length / 3, 0);
      setStatus(`${next.glyphs.length} solids · ${vertices.toLocaleString()} vertices · built in ${Math.round(performance.now() - started)} ms`);
      setPlan(next);
      setFrame((current) => (current === 0 ? Math.round(initialProgress * (next.frames.settled + 2 * FPS - 1)) : Math.min(current, next.frames.settled + 2 * FPS - 1)));
    };
    void run();
    return () => { cancelled = true; };
  }, [text, font.family, font.weight, profile, depth, stagger, enter, idle, intensity, initialProgress]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    try {
      const stage = createStudioStage(host, canvas);
      // A camera framed on letters standing on the floor.
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

  const materialRef = useRef(new Map<string, MeshPhysicalMaterial>());
  useEffect(() => () => {
    for (const material of materialRef.current.values()) disposeSculptMaterial(material);
    materialRef.current.clear();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !plan) return;
    let material = materialRef.current.get(materialId);
    if (!material) {
      // Polished metals stay clean; stone, wood, clay and paper keep their measured grain.
      const metal = findMaterial(materialId)?.metal === 1;
      const record = findMaterial(materialId);
      if (!record) return;
      material = sculptMaterial(record, materialTexture(materialId), { emMm: 140, relief: 0.6, detail: metal ? 0.35 : 1 });
      materialRef.current.set(materialId, material);
    }
    // Metals show only what they reflect, so they get a brighter room; diffuse whites would blow out in it.
    const metal = findMaterial(materialId)?.metal === 1;
    stage.scene.environmentIntensity = metal ? 1.05 : 0.5;
    stage.renderer.toneMappingExposure = metal ? 1 : 0.88;
    const object = new SculpturalTextObject(plan, { material });
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
      if (objectRef.current === object) objectRef.current = null;
    };
  }, [plan, materialId, prefersReducedMotion]);

  useEffect(() => {
    objectRef.current?.update(frame, prefersReducedMotion);
    stageRef.current?.render();
  }, [frame, prefersReducedMotion]);

  const timeline = useMemo<MotionTimeline>(() => ({ schemaVersion: 1, id: "sculptural-type", fps: { num: FPS, den: 1 }, durationFrames: duration, nodes: [] }), [duration]);
  const materialName = (id: string) => findMaterial(id)?.name ?? id;

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Sculptural type</h2>
        <p className="text-body-sm text-muted-foreground">
          Each letter is a solid built from its signed distance field, carrying a measured MATL1 material and moving with weight:
          it falls, squashes, unfolds and settles. Drag the stage to orbit.
        </p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Sculptural type stage" className="flex min-w-0 flex-col gap-4">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-body font-medium text-foreground">{materialName(materialId)} · {ENTERS.find((option) => option.id === enter)?.label}</p>
              <p className="font-mono text-caption tabular-nums text-muted-foreground" aria-live="polite">{status}</p>
            </div>
            <div ref={hostRef} className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-surface-inset">
              <canvas ref={canvasRef} role="img" className="block h-full w-full touch-none"
                aria-label={`The word ${text} as ${materialName(materialId)} letters, entering with ${enter}, frame ${frame}`} />
              {webglError ? <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-body-sm text-muted-foreground">WebGL is not available in this browser, so the 3D stage cannot draw. ({webglError})</p> : null}
            </div>
          </figure>
          <MotionScrubber timeline={timeline} frame={Math.min(frame, duration - 1)} onFrame={setFrame} label="Frame" />
        </section>
        <aside aria-label="Sculptural type configuration" className="flex min-w-0 flex-col gap-5 rounded-surface border border-border bg-surface p-4">
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Text
            <input className={selectClass} value={text} maxLength={18} onChange={(event) => setText(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Font
            <select className={selectClass} value={fontId} onChange={(event) => setFontId(event.target.value)}>
              {FONTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Face profile
            <select className={selectClass} value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              {PROFILES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Material (MATL1)
            <select className={selectClass} value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
              {SCULPT_MATERIAL_PRESETS.map((id) => <option key={id} value={id}>{materialName(id)}</option>)}
            </select>
          </label>
          <fieldset className="min-w-0 space-y-2">
            <legend className="text-body-sm font-medium text-foreground">Entrance</legend>
            <div className="grid grid-cols-3 gap-2">
              {ENTERS.map((option) => (
                <Button key={option.id} size="sm" variant={option.id === enter ? "primary" : "outline"} aria-pressed={option.id === enter} onClick={() => setEnter(option.id)}>
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">After arriving
            <select className={selectClass} value={idle} onChange={(event) => setIdle(event.target.value as SculptIdle)}>
              <option value="none">Rest</option>
              <option value="wave">Wave along the line</option>
              <option value="breathe">Breathe (relief swells)</option>
            </select>
          </label>
          <Slider label="Depth" min={0.04} max={0.5} step={0.02} value={depth} showValue formatValue={(value) => `${value.toFixed(2)} em`}
            onValueChange={(value) => setDepth(Array.isArray(value) ? value[0] ?? 0.16 : value)} />
          <Slider label="Intensity" min={0} max={2} step={0.1} value={intensity} showValue formatValue={(value) => value.toFixed(1)}
            onValueChange={(value) => setIntensity(Array.isArray(value) ? value[0] ?? 1 : value)} />
          <Slider label="Stagger" min={0} max={10} step={1} value={stagger} showValue formatValue={(value) => `${value} frames`}
            onValueChange={(value) => setStagger(Array.isArray(value) ? value[0] ?? 3 : value)} />
        </aside>
      </div>
    </div>
  );
}
