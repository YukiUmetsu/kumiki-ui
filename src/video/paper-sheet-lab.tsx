import "@fontsource-variable/fraunces";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { evaluatePaperSheet } from "../../registry/motion/paper-sheet";
import type { PaperSheetSpec } from "../../registry/motion/paper-sheet";
import { PaperSheetSvg } from "../../registry/motion/paper-sheet-svg";
import { PAPER_LIGHTS } from "../../registry/motion/paper-sheet-light";
import type { PaperLightName } from "../../registry/motion/paper-sheet-light";
import { PAPER_STOCKS, PAPER_STOCK_NAMES, paperGravityLength, paperTransmittance } from "../../registry/motion/paper-sheet-stock";
import type { PaperStockName } from "../../registry/motion/paper-sheet-stock";
import type { MotionTimeline } from "../../registry/motion/types";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";
import { MotionScrubber } from "../motion/react";
import { PaperCraftStage } from "../../registry/video/paper-craft-react";
import { paperPhysicalSceneSpec } from "./paper-physical-scene";
import { paperSheetSoundCues } from "../../registry/motion/paper-sound";
import { usePaperCuePlayer } from "./paper-sound-player";

import { DURATION, FPS, MOVES, PX_PER_MM, SHEET, TABLE_EDGE, paperMoveSpec, slideOf } from "./paper-sheet-moves";
import type { PaperMove } from "./paper-sheet-moves";

const W = 1280;
const H = 720;

const inputClass = "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-body-sm text-foreground";
const colourClass = "h-11 w-full cursor-pointer rounded-control border border-border bg-surface p-1";

const STOCK_LABELS: Record<PaperStockName, string> = {
  copy: "Copy paper 80 g/m²",
  newsprint: "Newsprint 45 g/m²",
  tissue: "Tissue 17 g/m²",
  tracing: "Tracing paper 90 g/m²",
  kami: "Origami kami 70 g/m² (white back)",
  washi: "Kozo washi 46 g/m²",
  kraft: "Kraft 90 g/m²",
  construction: "Construction paper 120 g/m²",
  cardstock: "Cardstock 270 g/m²",
  glossy: "Glossy photo 230 g/m²",
  chipboard: "Chipboard 600 g/m²",
};

const LIGHT_LABELS: Record<PaperLightName, string> = {
  table: "Window light on a table",
  lamp: "Small lamp (hard)",
  soft: "Overcast (very soft)",
  raking: "Raking light",
  backlit: "Light from behind",
};

function PostcardPrint({ ink, paper, print }: { ink: string; paper: string; print: boolean }) {
  const { x, y, w, h } = SHEET;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={paper} />
      {print && (
        <g>
          <rect x={x + 22} y={y + 22} width={w - 44} height={h - 44} fill={ink} />
          <circle cx={x + w * 0.68} cy={y + h * 0.42} r={h * 0.2} fill={paper} opacity={0.88} />
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={x + 22} y={y + h * 0.62 + k * 22} width={w - 44} height={9} fill={paper} opacity={0.22 + k * 0.08} />
          ))}
          <text x={x + 44} y={y + 92} fontFamily="'Fraunces Variable', Georgia, serif" fontSize={54} fill={paper} letterSpacing={-1}>Paper</text>
          <text x={x + 46} y={y + 124} fontFamily="'Fraunces Variable', Georgia, serif" fontSize={18} fill={paper} opacity={0.85}>folds, peels and tears</text>
          <rect x={x + 22} y={y + 22} width={w - 44} height={h - 44} fill="none" stroke={paper} strokeWidth={1.5} opacity={0.5} />
        </g>
      )}
    </g>
  );
}

function NumberSlider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  return (
    <Slider label={label} min={min} max={max} step={step} value={value} showValue
      formatValue={(v) => `${Number.isInteger(step) ? v : v.toFixed(step < 0.1 ? 2 : 1)}${unit ?? ""}`}
      onValueChange={(v) => onChange(Array.isArray(v) ? v[0] ?? value : v)} />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-body-sm text-foreground">{label}{children}</label>;
}

export interface PaperSheetLabProps {
  initialMove?: PaperMove;
  initialFrame?: number;
}

/** One sheet of real paper stock, seven moves, every physical control. */
export function PaperSheetLab({ initialMove = "fold", initialFrame = 64 }: PaperSheetLabProps) {
  const [move, setMove] = useState<PaperMove>(initialMove);
  const [frame, setFrame] = useState(initialFrame);
  const [stock, setStock] = useState<PaperStockName>("kami");
  const [paper, setPaper] = useState("#f6f1e4");
  const [ink, setInk] = useState("#b5452f");
  const [print, setPrint] = useState(true);
  const [lightName, setLightName] = useState<PaperLightName>("table");
  const [tilt, setTilt] = useState(32);
  const [turn, setTurn] = useState(0);
  const [shading, setShading] = useState(1);
  const [shadow, setShadow] = useState(1);
  const [thickness, setThickness] = useState(2);
  const [radius, setRadius] = useState(0);
  const [grainAcross, setGrainAcross] = useState(false);
  const diorama = useMemo(() => paperPhysicalSceneSpec(stock), [stock]);
  const [sound, setSound] = useState(true);
  const timeline = useMemo<MotionTimeline>(() => ({ schemaVersion: 1, id: "paper-sheet", fps: { num: FPS, den: 1 }, durationFrames: DURATION, nodes: [] }), []);
  const moveSpec = useMemo(() => paperMoveSpec(move, radius), [move, radius]);
  const cues = useMemo(() => paperSheetSoundCues(moveSpec, DURATION, FPS), [moveSpec]);
  usePaperCuePlayer(cues, frame, FPS, sound);
  const spec: PaperSheetSpec = useMemo(() => ({
    outline: `M${SHEET.x} ${SHEET.y}H${SHEET.x + SHEET.w}V${SHEET.y + SHEET.h}H${SHEET.x}Z`,
    stock,
    pxPerMm: PX_PER_MM,
    thickness,
    grain: grainAcross ? 90 : 0,
    support: moveSpec.support,
    bends: moveSpec.bends,
    tears: moveSpec.tears,
    seed: 11,
  }), [stock, thickness, grainAcross, moveSpec]);
  const { sheet, evalMs } = useMemo(() => {
    const started = performance.now();
    const result = evaluatePaperSheet(spec, frame);
    return { sheet: result, evalMs: performance.now() - started };
  }, [spec, frame]);
  const slide = slideOf(move, frame);
  const view = useMemo(() => ({ tilt, turn, center: [W / 2, H / 2] as const }), [tilt, turn]);
  const facts = PAPER_STOCKS[stock];
  const ell = paperGravityLength(facts, grainAcross ? 0 : 90) * 1000;
  const note = MOVES.find((m) => m.id === move)?.note;
  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Physical paper</h2>
        <p className="text-body-sm text-muted-foreground">
          Real paper stocks fold, peel, roll, tear and hang by their measured weight, thickness, stiffness and opacity.
          The print stays on the paper through every bend, because each flat piece is drawn through one exact matrix.
        </p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Paper stage" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-body font-medium text-foreground">{STOCK_LABELS[stock]}</p>
              <p className="font-mono text-caption tabular-nums text-muted-foreground">
                {sheet.facets.length} facets · {evalMs.toFixed(1)} ms
              </p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`A sheet of ${STOCK_LABELS[stock]}: ${MOVES.find((m) => m.id === move)?.label}`} className="block h-auto w-full rounded-control">
              <defs>
                <linearGradient id="paper-lab-desk" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#c9c2b4" />
                  <stop offset="1" stopColor="#b9b1a2" />
                </linearGradient>
              </defs>
              {move === "drape" ? (
                <>
                  <rect width={W} height={H} fill="#5b544c" />
                  <rect width={TABLE_EDGE} height={H} fill="url(#paper-lab-desk)" />
                  <rect x={TABLE_EDGE - 3} width={3} height={H} fill="#8e8576" />
                </>
              ) : (
                <rect width={W} height={H} fill="url(#paper-lab-desk)" />
              )}
              <g transform={`translate(${slide} 0)`}>
                <PaperSheetSvg sheet={sheet} color={paper} light={lightName} view={view} shading={shading} shadow={shadow}
                  front={<PostcardPrint ink={ink} paper={paper} print={print} />} />
              </g>
            </svg>
            <figcaption className="text-body-sm text-muted-foreground">{note}</figcaption>
          </figure>
          <MotionScrubber timeline={timeline} frame={frame} onFrame={setFrame} label="Frame" />
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <div className="aspect-video w-full overflow-hidden rounded-control">
              <PaperCraftStage spec={diorama} frame={frame} label="Paper-craft diorama with physical layers" />
            </div>
            <figcaption className="text-body-sm text-muted-foreground">
              The same sheets inside a PaperCraft scene: the cover tears and swings open, the banner unrolls, the door turns on its
              hinge and the sun peels back. Each is an ordinary paper layer with a <code>sheet</code>, in the chosen stock.
            </figcaption>
          </figure>
        </section>
        <aside aria-label="Paper configuration" className="flex min-w-0 flex-col gap-4 rounded-surface border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Move">
            {MOVES.map((m) => (
              <Button key={m.id} size="sm" variant={m.id === move ? "primary" : "outline"} aria-pressed={m.id === move} onClick={() => setMove(m.id)}>{m.label}</Button>
            ))}
          </div>
          <Field label="Stock">
            <select className={inputClass} value={stock} onChange={(event) => setStock(event.target.value as PaperStockName)}>
              {PAPER_STOCK_NAMES.map((name) => <option key={name} value={name}>{STOCK_LABELS[name]}</option>)}
            </select>
          </Field>
          <p className="-mt-2 text-caption text-muted-foreground">
            {facts.caliper} µm thick · sags past {ell.toFixed(0)} mm · lets through {(paperTransmittance(facts) * 100).toFixed(0)}% of light · fibres {facts.fibre} mm
          </p>
          <Checkbox label="Grain runs across the sheet (stiffer to fold left and right)" checked={grainAcross} onCheckedChange={setGrainAcross} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Paper colour"><input type="color" className={colourClass} value={paper} onChange={(event) => setPaper(event.target.value)} /></Field>
            <Field label="Print colour"><input type="color" className={colourClass} value={ink} onChange={(event) => setInk(event.target.value)} /></Field>
          </div>
          <Checkbox label="Printed front" checked={print} onCheckedChange={setPrint} />
          <Checkbox label={`Sound while playing (${cues.map((c) => c.cause).join(", ") || "none"})`} checked={sound} onCheckedChange={setSound} />
          <NumberSlider label="Crease or front radius (0 = from the stock)" value={radius} min={0} max={80} step={1} unit=" px" onChange={setRadius} />
          <NumberSlider label="Thickness (× true caliper)" value={thickness} min={0} max={8} step={0.5} unit="×" onChange={setThickness} />
          <Field label="Light">
            <select className={inputClass} value={lightName} onChange={(event) => setLightName(event.target.value as PaperLightName)}>
              {(Object.keys(PAPER_LIGHTS) as PaperLightName[]).map((name) => <option key={name} value={name}>{LIGHT_LABELS[name]}</option>)}
            </select>
          </Field>
          <NumberSlider label="Camera tilt" value={tilt} min={0} max={70} step={1} unit="°" onChange={setTilt} />
          <NumberSlider label="Camera turn" value={turn} min={-45} max={45} step={1} unit="°" onChange={setTurn} />
          <NumberSlider label="Shading" value={shading} min={0} max={1} step={0.05} onChange={setShading} />
          <NumberSlider label="Shadows" value={shadow} min={0} max={1} step={0.05} onChange={setShadow} />
          {sheet.warnings.length > 0 && <p role="status" className="text-caption text-muted-foreground">{sheet.warnings.join(" · ")}</p>}
        </aside>
      </div>
    </div>
  );
}
