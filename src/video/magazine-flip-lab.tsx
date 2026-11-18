import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from "three";
import type { Texture } from "three";
import { bakePaperBook, inspectPaperBookContacts } from "../../registry/motion/paper-book";
import type { PaperBookBake, PaperBookSpec, PaperBookTurn } from "../../registry/motion/paper-book";
import { PaperBookObject } from "../../registry/motion/paper-book-three";
import type { PaperStockName } from "../../registry/motion/paper-sheet-stock";
import type { MotionTimeline } from "../../registry/motion/types";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { MotionScrubber } from "../motion/react";
import { STUDIO_FLOOR_Y, createStudioStage } from "../motion/three-studio-stage";
import type { StudioStage } from "../motion/three-studio-stage";
import { PAGE_PX, drawMagazinePage, loadMagazineImages } from "./magazine-issue";
import { paperBookSoundCues } from "../../registry/motion/paper-sound";
import { usePaperCuePlayer } from "./paper-sound-player";
import { Checkbox } from "../ui/checkbox";
import type { MagazineImages } from "./magazine-issue";

export type MagazineMove = "turn" | "turn-top" | "turn-edge" | "riffle" | "flick" | "weak-flick" | "back";

const MOVES: { id: MagazineMove; label: string; note: string; frames: number; turns: PaperBookTurn[] }[] = [
  { id: "turn", label: "Turn", note: "A hand takes the bottom corner and carries the page over. The corner leads, so the page curls into a cone and lets go before it lands.", frames: 96, turns: [{ frame: 6, kind: "grab", grip: "bottom", frames: 28, release: 0.72 }] },
  { id: "turn-top", label: "Top corner", note: "The same turn from the top corner: the curl runs the other way.", frames: 96, turns: [{ frame: 6, kind: "grab", grip: "top", frames: 28, release: 0.72 }] },
  { id: "turn-edge", label: "Edge", note: "Taken in the middle of the edge, the page lifts as a cylinder instead of a cone.", frames: 96, turns: [{ frame: 6, kind: "grab", grip: "middle", frames: 30, release: 0.7 }] },
  { id: "riffle", label: "Riffle", note: "Five pages in quick succession. Each lands on the one before it, touches it and settles: none passes through another.", frames: 150, turns: [{ frame: 6, kind: "grab", frames: 14, release: 0.62, count: 5, interval: 7 }] },
  { id: "flick", label: "Flick", note: "A thumb flicks the edge at 3,000°/s and lets go: air drag bends the page back as it flies over.", frames: 96, turns: [{ frame: 6, kind: "flick", speed: 3000 }] },
  { id: "weak-flick", label: "Weak flick", note: "A flick at 1,250°/s: air drag and gravity stop the page at about 40°, and it falls back onto its own stack.", frames: 96, turns: [{ frame: 6, kind: "flick", speed: 1250 }] },
  { id: "back", label: "Turn back", note: "A page turned back from the left stack to the right.", frames: 96, turns: [{ frame: 6, kind: "grab", direction: "back", grip: "bottom", frames: 28, release: 0.72 }] },
];

const STOCKS: { id: PaperStockName | "magazine"; label: string }[] = [
  { id: "magazine", label: "Coated magazine 90 g/m²" },
  { id: "newsprint", label: "Newsprint 45 g/m²" },
  { id: "copy", label: "Copy paper 80 g/m²" },
  { id: "glossy", label: "Glossy photo 230 g/m²" },
  { id: "tissue", label: "Tissue 17 g/m²" },
];

const inputClass = "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-body-sm text-foreground";
const LEAVES = 12;

function NumberSlider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  return (
    <Slider label={label} min={min} max={max} step={step} value={value} showValue
      formatValue={(v) => `${Number.isInteger(step) ? v : v.toFixed(2)}${unit ?? ""}`}
      onValueChange={(v) => onChange(Array.isArray(v) ? v[0] ?? value : v)} />
  );
}

export interface MagazineFlipLabProps {
  initialMove?: MagazineMove;
  initialFrame?: number;
}

/** A magazine whose pages are simulated sheets of real stock: hand turns, riffles and flicks with contact. */
export function MagazineFlipLab({ initialMove = "turn", initialFrame = 20 }: MagazineFlipLabProps) {
  const [move, setMove] = useState<MagazineMove>(initialMove);
  const [stock, setStock] = useState<PaperStockName | "magazine">("magazine");
  const [quality, setQuality] = useState<"draft" | "fine" | "ultra">("fine");
  const [drag, setDrag] = useState(1);
  const [frame, setFrame] = useState(initialFrame);
  const [bake, setBake] = useState<PaperBookBake | null>(null);
  const [images, setImages] = useState<MagazineImages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<StudioStage | null>(null);
  const bookRef = useRef<PaperBookObject | null>(null);
  const preset = MOVES.find((m) => m.id === move) ?? MOVES[0];
  const spec = useMemo<PaperBookSpec>(() => ({
    leaves: LEAVES, width: 210, height: 280, open: move === "back" ? 4 : 2, durationFrames: preset.frames, quality, drag,
    stock: stock === "magazine" ? undefined : stock, cover: stock === "magazine" ? "glossy" : undefined, turns: preset.turns,
  }), [move, preset, quality, drag, stock]);

  useEffect(() => {
    let live = true;
    loadMagazineImages().then((loaded) => live && setImages(loaded)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  // Bake off the first paint so the page stays responsive; one bake serves every frame.
  useEffect(() => {
    let live = true;
    const id = window.setTimeout(() => {
      try {
        const result = bakePaperBook(spec);
        if (live) setBake(result);
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    }, 20);
    return () => { live = false; window.clearTimeout(id); };
  }, [spec]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let stage: StudioStage;
    try {
      stage = createStudioStage(host, canvas, { logarithmicDepth: true });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    stage.camera.near = 0.3;
    stage.camera.updateProjectionMatrix();
    stage.camera.position.set(0, 2.7, 3.1);
    stage.controls.target.set(0, STUDIO_FLOOR_Y, 0.05);
    stage.controls.maxPolarAngle = Math.PI * 0.45;
    stage.controls.update();
    const table = new Mesh(new PlaneGeometry(14, 14), new MeshStandardMaterial({ color: 0x9c8a74, roughness: 0.82 }));
    table.rotation.x = -Math.PI / 2;
    table.position.y = STUDIO_FLOOR_Y - 0.0005;
    table.receiveShadow = true;
    stage.scene.add(table);
    stageRef.current = stage;
    return () => {
      bookRef.current?.dispose();
      bookRef.current = null;
      table.geometry.dispose();
      (table.material as MeshStandardMaterial).dispose();
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  // Page textures, drawn once per page when first seen.
  const textures = useRef(new Map<number, Texture>());
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !bake || !images) return;
    const pageTexture = (page: number): Texture | null => {
      const cached = textures.current.get(page);
      if (cached) return cached;
      const canvas = document.createElement("canvas");
      canvas.width = PAGE_PX.width;
      canvas.height = PAGE_PX.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      drawMagazinePage(ctx, page, LEAVES * 2, images);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = stage.renderer.capabilities.getMaxAnisotropy();
      textures.current.set(page, texture);
      return texture;
    };
    bookRef.current?.dispose();
    if (bookRef.current) stage.scene.remove(bookRef.current);
    const book = new PaperBookObject(bake, { page: pageTexture, scale: 0.01 });
    book.position.y = STUDIO_FLOOR_Y;
    stage.scene.add(book);
    bookRef.current = book;
    book.update(Math.min(frame, bake.frames.length - 1));
    stage.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bake, images]);

  useEffect(() => () => { for (const t of textures.current.values()) t.dispose(); }, []);

  useEffect(() => {
    if (!bake || !bookRef.current || !stageRef.current) return;
    bookRef.current.update(Math.min(frame, bake.frames.length - 1));
    stageRef.current.render();
  }, [frame, bake]);

  const timeline = useMemo<MotionTimeline>(() => ({ schemaVersion: 1, id: "magazine-flip", fps: { num: 30, den: 1 }, durationFrames: preset.frames, nodes: [] }), [preset.frames]);
  const report = useMemo(() => (bake ? inspectPaperBookContacts(bake) : null), [bake]);
  const [sound, setSound] = useState(true);
  const cues = useMemo(() => (bake ? paperBookSoundCues(bake) : []), [bake]);
  usePaperCuePlayer(cues, frame, 30, sound);
  const events = bake ? bake.events.filter((e) => e.kind === "land" || e.kind === "touch").length : 0;

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Magazine page flip</h2>
        <p className="text-body-sm text-muted-foreground">
          Every page is a simulated sheet of real stock, hinged on the spine, pulled by gravity and slowed by air. Pages
          touch instead of passing through each other: around the spine they keep their order, a paper's thickness apart.
        </p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Magazine stage" className="flex min-w-0 flex-col gap-4">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-body font-medium text-foreground">{preset.label}</p>
              <p className="font-mono text-caption tabular-nums text-muted-foreground" aria-live="polite">
                {bake ? `baked ${bake.frames.length} frames in ${bake.bakeMs.toFixed(0)} ms · ${events} contacts · deepest crossing ${report ? report.maxPenetration.toFixed(2) : "–"} mm` : "baking…"}
              </p>
            </div>
            <div ref={hostRef} className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-surface-inset">
              <canvas ref={canvasRef} role="img" aria-label={`A magazine: ${preset.label.toLowerCase()}`} className="block h-full w-full touch-none" />
              {error ? <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-body-sm text-muted-foreground">{error}</p> : null}
            </div>
            <figcaption className="text-body-sm text-muted-foreground">{preset.note}</figcaption>
          </figure>
          <MotionScrubber timeline={timeline} frame={Math.min(frame, preset.frames - 1)} onFrame={setFrame} label="Frame" />
        </section>
        <aside aria-label="Magazine configuration" className="flex min-w-0 flex-col gap-4 rounded-surface border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Move">
            {MOVES.map((m) => (
              <Button key={m.id} size="sm" variant={m.id === move ? "primary" : "outline"} aria-pressed={m.id === move} onClick={() => { setMove(m.id); setFrame(0); }}>{m.label}</Button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Stock
            <select className={inputClass} value={stock} onChange={(event) => setStock(event.target.value as typeof stock)}>
              {STOCKS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Simulation
            <select className={inputClass} value={quality} onChange={(event) => setQuality(event.target.value as typeof quality)}>
              <option value="draft">Draft (fast)</option>
              <option value="fine">Fine</option>
              <option value="ultra">Ultra (slow to bake)</option>
            </select>
          </label>
          <NumberSlider label="Air drag (× still air)" value={drag} min={0} max={3} step={0.1} unit="×" onChange={setDrag} />
          <Checkbox label={`Sound while playing: ${cues.length} cues from the simulation (turns, landings, brushes)`} checked={sound} onCheckedChange={setSound} />
          <p className="text-caption text-muted-foreground">
            Drag the stage to orbit. Photographs: Library of Congress (public domain) and The Met (CC0).
          </p>
        </aside>
      </div>
    </div>
  );
}
