import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import { CameraStage } from "../../registry/motion/camera-stage";
import { MotionScrubber } from "../../registry/motion/react";
import { createProcessJourney, evaluateProcessJourney } from "../../registry/motion/process-journey";
import type { ProcessJourneyPlan } from "../../registry/motion/process-journey";
import type { DiagramSpec } from "../../registry/infographic/types";
import type { Rect } from "../../registry/motion/types";

type Scenario = "signal" | "shipment" | "biology";
type Aspect = "landscape" | "portrait";
const scenes: Record<Scenario, { title: string; caption: string; labels: [string, string, string]; subject: string }> = {
  signal: { title: "A message finds its destination", caption: "One signal, two routes, a readable handoff.", labels: ["Origin", "Relay", "Destination"], subject: "signal" },
  shipment: { title: "One item moves between locations", caption: "The same subject persists during every stage.", labels: ["Collection", "Transfer", "Delivery"], subject: "parcel" },
  biology: { title: "A signal passes between cells", caption: "Reusable choreography with different semantics.", labels: ["Receptor", "Mediator", "Response"], subject: "molecule" },
};
const box = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

function makePlan(scenario: Scenario, aspect: Aspect): ProcessJourneyPlan {
  const scene = scenes[scenario];
  const portrait = aspect === "portrait";
  const graph: DiagramSpec = {
    direction: portrait ? "vertical" : "horizontal",
    nodes: scene.labels.map((label, i) => ({ id: ["first", "middle", "last"][i], label })),
    edges: [
      { id: "first-middle", from: "first", to: "middle" },
      { id: "middle-last", from: "middle", to: "last" },
    ],
  };
  const bounds = portrait ? {
    first: box(180, 110, 180, 100),
    middle: box(180, 410, 180, 100),
    last: box(180, 715, 180, 100),
  } : {
    first: box(70, 220, 190, 100),
    middle: box(385, 220, 190, 100),
    last: box(700, 220, 190, 100),
  };
  return createProcessJourney({
    id: "journey-" + scenario + "-" + aspect,
    subjectId: scene.subject, graph,
    fps: { num: 30, den: 1 }, durationFrames: 180,
    layouts: [{ frame: 0, bounds }],
    route: [
      { edgeId: "first-middle", startFrame: 12, endFrame: 78 },
      { edgeId: "middle-last", startFrame: 105, endFrame: 162 },
    ],
    camera: {
      viewport: { width: portrait ? 540 : 960, height: portrait ? 960 : 540 },
      zoom: portrait ? 1.02 : 1.12, sampleEveryFrames: 3, leadFrames: 0,
    },
  });
}

function ProcessJourneyDemo({ initial }: { initial: Scenario }) {
  const [scenario, setScenario] = useState<Scenario>(initial);
  const [aspect, setAspect] = useState<Aspect>("landscape");
  const [frame, setFrame] = useState(0);
  const plan = useMemo(() => makePlan(scenario, aspect), [scenario, aspect]);
  const current = evaluateProcessJourney(plan, frame);
  const { title, caption } = scenes[scenario];
  const portrait = aspect === "portrait";
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  return <main className="min-h-screen bg-canvas p-6 text-foreground">
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground">Reusable visual recipe / PJ1</p>
        <h1 className="font-serif text-heading font-normal">{title}</h1>
        <p className="text-body text-muted-foreground">{caption}</p>
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <div role="group" aria-label="Example subject" className="flex flex-wrap gap-2">
          {(["signal", "shipment", "biology"] as const).map(kind =>
            <button type="button" key={kind} aria-pressed={scenario === kind}
              onClick={() => { setScenario(kind); setFrame(0); }}
              className={"rounded-control border px-4 py-2 text-sm " + (scenario === kind ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground")}>
              {kind === "signal" ? "Signal" : kind === "shipment" ? "Logistics" : "Biology"}
            </button>)}
        </div>
        <div role="group" aria-label="Composition aspect" className="flex gap-2">
          {(["landscape", "portrait"] as const).map(value =>
            <button type="button" key={value} aria-pressed={aspect === value}
              onClick={() => { setAspect(value); setFrame(0); }}
              className={"rounded-control border px-4 py-2 text-sm " + (aspect === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground")}>
              {value === "landscape" ? "16:9" : "9:16"}
            </button>)}
        </div>
      </div>
      <div className="mx-auto w-full overflow-hidden rounded-surface border border-border bg-surface" style={{ maxWidth: portrait ? 440 : 960 }}>
        <CameraStage frame={frame} timeline={plan.cameraTimeline!} width={width} height={height}
          ariaLabel={"Camera-follow process for " + scenario}
          background="var(--km-surface-default, #f5f7fa)" reducedMotion={false}>
          <DiagramStage graph={plan.graph} timeline={plan.diagramTimeline} frame={frame}
            width={width} height={height} ariaLabel={title}
            focusedNodeIds={current.focusedNodeIds} reducedMotion={false}
            style={{ overflow: "visible", background: "transparent" }}
            theme={{ surface: "transparent", node: "#ffffff", ink: "#17283c", mutedInk: "#536983",
              edge: "#93a8c4", accent: "#3562bf", packet: "#3562bf",
              fontSize: portrait ? 25 : 24, radius: 18 }}
            overlay={<g data-process-journey-subject={current.subjectId}
              transform={"translate(" + current.position.x + " " + current.position.y + ")"}>
              <circle r="25" fill="#c5d9ff" opacity=".47"/>
              <circle r="13" fill="#305dc1" stroke="#fff" strokeWidth="3"/>
              <circle r="4" fill="#fff"/>
            </g>} />
        </CameraStage>
      </div>
      <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-2 rounded-surface border border-border bg-surface p-4 text-sm">
        <span><strong>Phase: </strong>{current.phase}</span>
        <span><strong>Stage: </strong>{plan.graph.nodes.find(n => n.id === current.currentNodeId)?.label}</span>
        <span><strong>Subject: </strong>{current.subjectId}</span>
      </div>
      <MotionScrubber timeline={plan.diagramTimeline} frame={frame} onFrame={setFrame}
        label="Process journey frame" />
      <p className="text-caption text-muted-foreground">
        Reuses DiagramStage for geometry, CameraStage for framing, and MG1 tracks for all timeline evaluation. No private playback clock.
      </p>
    </section>
  </main>;
}
const meta = {
  title: "Motion engine/Process Journey", id: "motion-process-journey",
  component: ProcessJourneyDemo,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProcessJourneyDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Signal: Story = { args: { initial: "signal" } };
export const SupplyChain: Story = { args: { initial: "shipment" } };
export const CellSignaling: Story = { args: { initial: "biology" } };
