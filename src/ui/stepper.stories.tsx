import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Stepper, createCompletionChime } from "./stepper";
import type { StepperProps, StepperStatus, StepperStatusEvent, StepperStep } from "./stepper";

const meta = {
  title: "Components/Stepper",
  component: Stepper,
  parameters: { layout: "padded" },
  args: {
    steps: [
      { id: "setup", label: "Setup", status: "complete" },
      { id: "discover", label: "Discover", status: "complete" },
      { id: "select", label: "Select Idea", status: "complete" },
      { id: "script", label: "Script", status: "stale" },
      { id: "plan", label: "Plan Scenes", status: "stale" },
      { id: "create", label: "Create Video", status: "not-started" },
      { id: "publish", label: "Publish Kit", status: "not-started" },
      { id: "export", label: "Export", status: "not-started" },
    ],
    currentStepId: "script",
    states: {
      stale: { label: "Stale", tone: "neutral" },
    },
  },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
    connectors: { control: "boolean" },
    animate: { control: "boolean" },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Matches the reference bar: completed steps, one highlighted step and a stale status. */
export const Default: Story = {
  render: args => (
    <div className="w-full">
      <Stepper {...args} />
    </div>
  ),
};

/** State labels are opt-in. Turn them on when the state needs to be read at a glance. */
export const WithStateText: Story = {
  name: "With state text",
  args: { showStateText: true },
  render: args => (
    <div className="w-full">
      <Stepper {...args} />
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: args => (
    <div className="w-72">
      <Stepper {...args} />
    </div>
  ),
};

export const HorizontalWithConnectors: Story = {
  name: "Horizontal with connectors",
  args: { connectors: true },
  render: args => (
    <div className="w-full">
      <Stepper {...args} />
    </div>
  ),
};

export const Small: Story = {
  args: { size: "sm" },
  render: args => (
    <div className="w-full">
      <Stepper {...args} />
    </div>
  ),
};

const longSteps: StepperStep[] = [
  { id: "brief", label: "Brief", status: "complete" },
  { id: "research", label: "Research", status: "complete" },
  { id: "outline", label: "Outline", status: "complete" },
  { id: "draft", label: "First draft", status: "complete" },
  { id: "review", label: "Editorial review", status: "started" },
  { id: "facts", label: "Fact check", status: "not-started" },
  { id: "design", label: "Layout and art direction", status: "not-started" },
  { id: "captions", label: "Captions", status: "not-started" },
  { id: "legal", label: "Rights and licensing", status: "not-started" },
  { id: "translate", label: "Translation", status: "not-started" },
  { id: "approve", label: "Client approval", status: "not-started" },
  { id: "publish", label: "Publish", status: "not-started" },
  { id: "measure", label: "Measure results", status: "not-started" },
];

/** Long workflows scroll inside the width the container gives them, and the current step stays in view. */
export const LongHorizontalScrolls: Story = {
  args: { steps: longSteps, currentStepId: "review", states: undefined },
  render: args => (
    <div className="w-[min(100%,28rem)] rounded-xl border border-border p-2">
      <Stepper {...args} aria-label="Content workflow" />
    </div>
  ),
};

/** A vertical bar scrolls only when its container limits the height. */
export const VerticalScrolls: Story = {
  args: { steps: longSteps, currentStepId: "review", orientation: "vertical", states: undefined },
  render: args => (
    <div className="h-72 w-64 rounded-xl border border-border p-2">
      <Stepper {...args} aria-label="Content workflow" />
    </div>
  ),
};

export const WithoutConnectors: Story = {
  args: { connectors: false, orientation: "vertical" },
  render: args => (
    <div className="w-72">
      <Stepper {...args} />
    </div>
  ),
};

export const CustomStatesAndMarks: Story = {
  name: "Custom states and marks",
  args: {
    steps: [
      { id: "upload", label: "Upload", status: "complete" },
      { id: "scan", label: "Scan for PII", status: "blocked" },
      { id: "redact", label: "Redact", status: "review" },
      { id: "publish", label: "Publish", status: "not-started" },
    ],
    currentStepId: "scan",
    states: {
      blocked: { label: "Blocked", tone: "danger" },
      review: { label: "Needs review", tone: "warning", mark: false },
    },
  },
  render: args => (
    <div className="w-full max-w-4xl">
      <Stepper {...args} />
    </div>
  ),
};

/** Labels and state text are plain props, so they can be translated. */
export const LocalizedAndLongText: Story = {
  name: "Localized and long text",
  args: {
    currentStepId: "source",
    steps: [
      { id: "setup", label: "セットアップ", status: "complete" },
      { id: "source", label: "ソース素材の確認と権利情報の整理", status: "active" },
      { id: "script", label: "Scripting with a very long title that must wrap", status: "not-started" },
      { id: "export", label: "書き出し", status: "not-started" },
    ],
    states: {
      complete: { label: "完了" },
      active: { label: "作業中" },
      "not-started": { label: "未着手" },
    },
  },
  render: args => (
    <div className="w-full max-w-md" lang="ja">
      <Stepper {...args} orientation="vertical" aria-label="作業の流れ" />
    </div>
  ),
};

type Log = { id: number; text: string };

/**
 * Live workflow: clicking a step activates it, and the advance button completes
 * the current step. Transition hooks log each change, which is where a sound or
 * analytics call would go.
 */
function InteractiveWorkflow() {
  const [steps, setSteps] = useState<StepperStep[]>([
    { id: "brief", label: "Brief", status: "complete" },
    { id: "draft", label: "Draft", status: "active" },
    { id: "review", label: "Review", status: "not-started" },
    { id: "publish", label: "Publish", status: "not-started" },
  ]);
  const [logs, setLogs] = useState<Log[]>([]);
  const currentId = steps.find(step => step.status === "active")?.id ?? steps[0]!.id;

  const setStatus = (id: string, status: StepperStatus) =>
    setSteps(current => current.map(step => (step.id === id ? { ...step, status } : step)));

  const advance = () => {
    const index = steps.findIndex(step => step.id === currentId);
    const next = steps[index + 1];
    setStatus(currentId, "complete");
    if (next) setStatus(next.id, "active");
  };

  const record = (event: StepperStatusEvent) =>
    setLogs(current => [
      { id: current.length + 1, text: `${event.step.id}: ${String(event.previousStatus)} → ${event.status}` },
      ...current,
    ].slice(0, 5));

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <Stepper
        steps={steps}
        onStatusChange={record}
        onStepSelect={(step, index) => {
          if (index === 0) return;
          setStatus(currentId, "started");
          setStatus(step.id, "active");
        }}
        currentStepId={currentId}
      />
      <div className="flex items-center gap-3">
        <Button onClick={advance} disabled={currentId === steps[steps.length - 1]?.id}>
          Complete current step
        </Button>
      </div>
      <ol aria-label="Transition log" className="m-0 list-none p-0 text-body-sm text-muted-foreground">
        {logs.map(log => (
          <li key={log.id}>{log.text}</li>
        ))}
      </ol>
    </div>
  );
}

export const InteractiveWithHooks: Story = {
  name: "Interactive with transition hooks",
  render: () => <InteractiveWorkflow />,
};

const PANEL_CONTENT: Record<string, { title: string; body: string }> = {
  brief: { title: "Write the brief", body: "Describe the audience, the one claim the piece must make, and the length." },
  draft: { title: "Draft the script", body: "Turn the brief into scenes. Keep one idea per scene and mark every number that needs a source." },
  review: { title: "Review with the team", body: "Check facts, tone and captions. Each comment is resolved before the next step opens." },
  publish: { title: "Publish and measure", body: "Schedule the export, upload it to each channel and record the first-week results." },
};

/**
 * Navigation drives content: choosing a step, or using Back and Next, changes
 * the panel below the bar. The current step is controlled from outside, which is
 * how a real page would connect the stepper to its routes or forms.
 */
function LinkedContentWorkflow() {
  const steps: StepperStep[] = [
    { id: "brief", label: "Brief" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "publish", label: "Publish" },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastIndex = steps.length - 1;
  const statused = steps.map((step, index) => ({
    ...step,
    status: (index < currentIndex ? "complete" : index === currentIndex ? "active" : "not-started") as StepperStatus,
  }));
  const current = steps[currentIndex]!;
  const panel = PANEL_CONTENT[current.id]!;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Stepper
        steps={statused}
        currentStepId={current.id}
        onStepSelect={(_step, index) => setCurrentIndex(index)}
        aria-label="Publishing workflow"
      />
      <section aria-labelledby="linked-panel-title" className="rounded-xl border border-border bg-surface-elevated p-6">
        <p className="text-body-sm text-muted-foreground">{`Step ${currentIndex + 1} of ${steps.length}`}</p>
        <h3 id="linked-panel-title" className="mt-1 text-heading-sm text-foreground">
          {panel.title}
        </h3>
        <p className="mt-2 text-body text-muted-foreground">{panel.body}</p>
      </section>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setCurrentIndex(index => Math.max(0, index - 1))} disabled={currentIndex === 0}>
          Back
        </Button>
        <Button onClick={() => setCurrentIndex(index => Math.min(lastIndex, index + 1))} disabled={currentIndex === lastIndex}>
          Next
        </Button>
      </div>
    </div>
  );
}

/** Stepper and content stay in sync: clicking a step, or Back and Next, changes the panel below. */
export const LinkedContentPanel: Story = {
  name: "Linked content panel",
  render: () => <LinkedContentWorkflow />,
};

const ENHANCED_STEPS: StepperStep[] = [
  { id: "brief", label: "Brief", hint: "About 10 minutes" },
  { id: "draft", label: "Draft", hint: "Scene by scene" },
  { id: "review", label: "Review", hint: "Facts and tone" },
  { id: "publish", label: "Publish", hint: "Schedule and share" },
];

/**
 * Drives the optional motion and summary props from one place. Next completes the
 * current step, Back reopens the previous one, and clicking a step jumps to it.
 * Statuses come from the current index, so every change is a real transition.
 */
function EnhancedWorkflow({
  glideCurrent,
  fillConnectors,
  arrowKeys,
  showSummary,
  summaryPosition,
  summaryAlign,
  calmFinish,
  chime,
}: Pick<
  StepperProps,
  "glideCurrent" | "fillConnectors" | "arrowKeys" | "showSummary" | "summaryPosition" | "summaryAlign" | "calmFinish"
> & {
  chime?: boolean;
}) {
  const [position, setPosition] = useState(1);
  const total = ENHANCED_STEPS.length;
  const steps: StepperStep[] = ENHANCED_STEPS.map((step, index) => ({
    ...step,
    status: (index < position - 1 ? "complete" : index === position - 1 ? "active" : "not-started") as StepperStatus,
  }));
  const playChime = createCompletionChime();
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Stepper
        steps={steps}
        states={chime ? { complete: { onEnter: playChime } } : undefined}
        glideCurrent={glideCurrent}
        fillConnectors={fillConnectors}
        arrowKeys={arrowKeys}
        showSummary={showSummary}
        summaryPosition={summaryPosition}
        summaryAlign={summaryAlign}
        calmFinish={calmFinish}
        connectors
        onStepSelect={(_step, index) => setPosition(index + 1)}
        aria-label="Publishing workflow"
      />
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setPosition(value => Math.max(1, value - 1))} disabled={position === 1}>
          Back
        </Button>
        <Button onClick={() => setPosition(value => Math.min(total + 1, value + 1))} disabled={position > total}>
          Complete current step
        </Button>
      </div>
    </div>
  );
}

/**
 * Optional motion and navigation, all off by default. Here each one is on:
 * the highlight glides, connectors fill as steps complete, arrow keys move
 * focus, the progress readout tracks completion, and the bar settles when done.
 */
export const OptionalEnhancements: Story = {
  name: "Optional enhancements",
  args: {
    glideCurrent: true,
    fillConnectors: true,
    arrowKeys: true,
    showSummary: true,
    summaryPosition: "bottom",
    summaryAlign: "center",
    calmFinish: true,
  },
  argTypes: {
    glideCurrent: { control: "boolean" },
    fillConnectors: { control: "boolean" },
    arrowKeys: { control: "boolean" },
    showSummary: { control: "boolean" },
    summaryPosition: { control: "inline-radio", options: ["top", "bottom", "start", "end"] },
    summaryAlign: { control: "inline-radio", options: ["start", "center", "end"] },
    calmFinish: { control: "boolean" },
  },
  render: args => <EnhancedWorkflow {...args} />,
};

/** The completion sound is opt-in and never plays by default. It plays on the first click that completes a step. */
export const WithCompletionChime: Story = {
  name: "With completion chime (opt-in)",
  render: () => <EnhancedWorkflow glideCurrent fillConnectors showSummary chime />,
};

/** Reduced motion or `animate={false}` gives the final state with no pop or draw. */
export const WithoutAnimation: Story = {
  args: { animate: false },
  render: args => (
    <div className="w-full">
      <Stepper {...args} />
    </div>
  ),
};
