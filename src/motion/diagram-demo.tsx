import { useMemo, useState } from "react";
import type { DiagramSpec } from "../../registry/infographic/types";
import type { Rect } from "../../registry/motion/types";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramPacket } from "../../registry/motion/diagram-stage";
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import type { DiagramStageTheme } from "../../registry/motion/diagram-stage-react";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import type { Storyboard } from "../../registry/motion/storyboard";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { Button } from "../ui/button";

const NODES = [
  { id: "input", label: "Input", description: "Introduce the item to process." },
  { id: "split", label: "Branch", description: "Send illustrative work to two independent paths." },
  { id: "upper", label: "Path A", description: "The first processing path." },
  { id: "lower", label: "Path B", description: "The second processing path." },
  { id: "merge", label: "Join", description: "Bring the paths back together." },
  { id: "output", label: "Output", description: "Present the completed result." },
];
const EDGES = [
  { id: "input-split", from: "input", to: "split" },
  { id: "split-upper", from: "split", to: "upper" },
  { id: "split-lower", from: "split", to: "lower" },
  { id: "upper-merge", from: "upper", to: "merge" },
  { id: "lower-merge", from: "lower", to: "merge" },
  { id: "merge-output", from: "merge", to: "output" },
];

const PACKETS: DiagramPacket[] = [0, 1, 2].flatMap((wave) => {
  const start = 35 + wave * 140;
  return [
    ["input-split", 0, 40], ["split-upper", 50, 45], ["split-lower", 50, 65],
    ["upper-merge", 105, 40], ["lower-merge", 125, 40], ["merge-output", 175, 45],
  ].map(([edge, delay, duration], index) => ({
    id: `wave-${wave}-${index}`, edgeId: String(edge),
    range: { startFrame: start + Number(delay), endFrame: start + Number(delay) + Number(duration) },
  }));
});
PACKETS.push({ id: "return", edgeId: "input-split", direction: "reverse", range: { startFrame: 550, endFrame: 600 } });

const THEMES: Record<string, Partial<DiagramStageTheme>> = {
  "theme-a": { surface: "#f4f6f9", node: "#ffffff", ink: "#243347", mutedInk: "#526174", edge: "#8a9caf", accent: "#345eb5", packet: "#345eb5", reversePacket: "#b45b27" },
  "theme-b": { surface: "#182332", node: "#253448", ink: "#edf3fc", mutedInk: "#b2c4dc", edge: "#7389a7", accent: "#8dc6f3", packet: "#a7d9ff", reversePacket: "#efb389" },
};

const BEATS = [
  [0, 120, "Establish the flow", "Read the branching structure before the layout changes. Packet movement is illustrative, not a throughput measurement."],
  [120, 180, "Parallel paths", "The two branches can carry independent packets and different arrival times."],
  [180, 300, "Reflow in motion", "Nodes move to a second authored layout. Ports stay on their original sides, curves follow, and packets stay on those curves."],
  [300, 420, "Hold the new layout", "The same semantic nodes and edges retain their identity in the expanded composition."],
  [420, 540, "Restore the overview", "Return to the original layout without replacing the graph or resetting the animation clock."],
  [540, 600, "Reverse direction", "A returning packet traverses the same connector in reverse, with its own color role."],
] as const;

const BOARD: Storyboard = {
  schemaVersion: 1, id: "diagram-direction", title: "Branching flow", fps: { num: 30, den: 1 }, durationFrames: 600,
  shots: BEATS.map(([start, end, title, objective], index) => ({
    id: `diagram-shot-${index}`, sceneRef: "branching-flow", startFrame: start, durationFrames: end - start,
    claim: title, visualObjective: objective, focusTarget: "branching-flow", onScreenLabels: [title], staticFallback: objective,
  })),
};

export function DiagramDemo() {
  const [frame, setFrame] = useState(0);
  const [aspect, setAspect] = useState<"landscape" | "portrait">("landscape");
  const [theme, setTheme] = useState("theme-a");
  const reducedMotion = usePrefersReducedMotion();
  const graph = useMemo<DiagramSpec>(() => ({ nodes: NODES, edges: EDGES, direction: aspect === "landscape" ? "horizontal" : "vertical" }), [aspect]);
  const timeline = useMemo(() => {
    const box = (x: number, y: number, width = 150, height = 92): Rect => ({ x, y, width, height });
    const initial = aspect === "landscape" ? {
      input: box(60, 325), split: box(300, 325), upper: box(560, 175, 180), lower: box(560, 475, 180), merge: box(850, 325), output: box(1080, 325, 140),
    } : {
      input: box(270, 80, 180), split: box(270, 285, 180), upper: box(55, 520, 180), lower: box(485, 520, 180), merge: box(270, 755, 180), output: box(270, 1000, 180),
    };
    const expanded = aspect === "landscape" ? {
      input: box(60, 325), split: box(300, 325), upper: box(560, 95, 180), lower: box(560, 555, 180), merge: box(850, 325), output: box(1080, 325, 140),
    } : {
      input: box(270, 80, 180), split: box(270, 250, 180), upper: box(25, 500, 180), lower: box(515, 580, 180), merge: box(270, 820, 180), output: box(270, 1050, 180),
    };
    return createDiagramTimeline({ id: `branching-${aspect}`, graph, fps: BOARD.fps, durationFrames: BOARD.durationFrames,
      layouts: [{ frame: 0, bounds: initial }, { frame: 179, bounds: initial }, { frame: 299, bounds: expanded }, { frame: 419, bounds: expanded }, { frame: 539, bounds: initial }, { frame: 599, bounds: initial }],
    });
  }, [aspect, graph]);
  const resolvedFrame = reducedMotion ? 599 : frame;
  const focus = resolvedFrame < 120 ? ["input", "split"] : resolvedFrame < 300 ? ["upper", "lower"] : resolvedFrame < 540 ? ["merge", "output"] : ["input"];
  return <div className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label="Diagram output layout">
        <Button size="sm" variant={aspect === "landscape" ? "primary" : "outline"} aria-pressed={aspect === "landscape"} onClick={() => setAspect("landscape")}>Landscape</Button>
        <Button size="sm" variant={aspect === "portrait" ? "primary" : "outline"} aria-pressed={aspect === "portrait"} onClick={() => setAspect("portrait")}>Portrait</Button>
      </div>
      <div className="flex gap-2" role="group" aria-label="Diagram theme">
        {Object.keys(THEMES).map((value, index) => <Button key={value} size="sm" variant={theme === value ? "primary" : "outline"} aria-pressed={theme === value} onClick={() => setTheme(value)}>Theme {index === 0 ? "A" : "B"}</Button>)}
      </div>
    </div>
    <div className="mx-auto w-full overflow-hidden rounded-surface border border-border" style={{ maxWidth: aspect === "portrait" ? 520 : undefined }}>
      <DiagramStage graph={graph} timeline={timeline} frame={frame} width={aspect === "portrait" ? 720 : 1280} height={aspect === "portrait" ? 1240 : 760}
        packets={PACKETS} focusedNodeIds={focus} theme={THEMES[theme]} ariaLabel="Illustrative branching flow with six nodes, attached animated connectors, and forward and returning packets"
        overlay={<text x={aspect === "portrait" ? 360 : 640} y={aspect === "portrait" ? 1210 : 725} textAnchor="middle" fontSize="19" fill={THEMES[theme].mutedInk}>Same identities. Different composition.</text>} />
    </div>
    <MotionScrubber timeline={timeline} frame={frame} onFrame={setFrame} label="Diagram frame" />
    <StoryboardShots storyboard={BOARD} frame={resolvedFrame} onFrameChange={setFrame} label="Diagram storyboard beats" />
  </div>;
}
