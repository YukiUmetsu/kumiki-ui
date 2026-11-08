import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileScreenDemo } from "../../registry/video/screen-demo";
import type { ScreenDemoContent } from "../../registry/video/screen-demo";
import { measureScreenTargets, ScreenDemo } from "../../registry/video/screen-demo-react";
import type { ScreenUiContext } from "../../registry/video/screen-demo-react";
import { TASKS_LIVE_DEMO, TasksScreen, tasksImageDemo } from "../../registry/video/screen-demo-examples";
import { ParticlePlayer } from "./particle-story-player";
import start from "../../examples/film/assets/screens/tasks/start.png?url";
import composer from "../../examples/film/assets/screens/tasks/composer.png?url";
import added from "../../examples/film/assets/screens/tasks/added.png?url";
import done from "../../examples/film/assets/screens/tasks/done.png?url";

const FPS = 30;
/** Long enough for every step, a look at the result close up, and the step back to the whole screen. */
const DURATION = (() => { const steps = compileScreenDemo(TASKS_LIVE_DEMO, 9999, FPS).plan.steps; return steps[steps.length - 1].end + 96; })();
const renderScreen = (ui: string, context: ScreenUiContext) => ui === "tasks" ? <TasksScreen {...context} /> : null;
const SHORTS = { left: .08, right: .12, top: .09, bottom: .19 };
const planOf = (content: ScreenDemoContent, output = { width: 960, height: 540 } as { width: number; height: number; safe?: typeof SHORTS }) => compileScreenDemo(content, DURATION, FPS, output);
const live = planOf(TASKS_LIVE_DEMO), images = planOf(tasksImageDemo({ start, composer, added, done }));
const vertical = planOf(TASKS_LIVE_DEMO, { width: 1080, height: 1920, safe: SHORTS });
const Problems = ({ problems }: { problems: ReturnType<typeof planOf>["problems"] }) => problems.length
  ? <ul>{problems.map((p, i) => <li key={i}><b>{p.code}</b> {p.path}: {p.message}</li>)}</ul> : <p>No problems.</p>;

const meta: Meta = { title: "Video production/Screen Demo", parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj;

/** Live React UI, operated by a choreographed cursor: Kumiki's own Button, Input, Checkbox and Badge, laid out at 1280 × 800. */
export const LiveUi: Story = {
  name: "Live UI",
  render: () => <ParticlePlayer title="Screen Demo, live UI: the cursor clicks, types and finishes a task; the camera follows the work" cues={[]} durationFrames={DURATION} posterFrame={150}
    good={{ label: "Travel times follow Fitts' law, slowed for watching; the camera lands on each control a moment before the click and steps back at the end.",
      render: f => <ScreenDemo plan={live.plan} frame={f} width={960} height={540} renderScreen={renderScreen} /> }}
    notes={<Problems problems={live.problems} />} />,
};

/** The same flow from four screenshots, with the typing drawn over the field. */
export const Screenshots: Story = {
  render: () => <ParticlePlayer title="Screen Demo, screenshots: the same flow from four captures" cues={[]} durationFrames={DURATION} posterFrame={150}
    good={{ label: "Each click shows the next capture; the name is typed over the field in the field's own type.", render: f => <ScreenDemo plan={images.plan} frame={f} width={960} height={540} /> }}
    notes={<Problems problems={images.problems} />} />,
};

/** A landscape screen in a vertical frame: the safe area keeps the screen and callouts clear of the player's controls, and the camera
 * zoom does the work a wide frame does not need. */
export const Vertical: StoryObj<{ frame: number }> = {
  args: { frame: 160 },
  argTypes: { frame: { control: { type: "range", min: 0, max: DURATION - 1 } } },
  render: ({ frame }) => <div style={{ display: "flex", gap: 16, padding: 16, background: "#0b0d10" }}>
    {[frame - 60, frame, frame + 60].map(f => <div key={f} style={{ width: 270, height: 480, overflow: "hidden", borderRadius: 8 }}>
      <div style={{ width: 1080, height: 1920, transform: "scale(.25)", transformOrigin: "0 0" }}>
        <ScreenDemo plan={vertical.plan} frame={Math.max(0, Math.min(DURATION - 1, f))} width={1080} height={1920} safeInset={SHORTS} renderScreen={renderScreen} />
      </div>
    </div>)}
  </div>,
};

/** Frames across the whole flow, for review: the opening, each action as it lands, and the end. */
export const Sheet: StoryObj<{ source: "live" | "images" }> = {
  args: { source: "live" },
  argTypes: { source: { control: "inline-radio", options: ["live", "images"] } },
  render: ({ source }) => {
    const { plan } = source === "live" ? live : images;
    const frames = [0, ...plan.steps.flatMap(step => [step.arrive, step.end + 8]), DURATION - 1].filter((f, i, all) => all.indexOf(f) === i && f < DURATION).sort((a, b) => a - b);
    return <div data-km-sheet="" style={{ display: "grid", gridTemplateColumns: "repeat(3, 640px)", gap: 10, padding: 10, background: "#0b0d10" }}>
      {frames.map(f => <figure key={f} style={{ margin: 0 }}>
        <ScreenDemo plan={plan} frame={f} width={640} height={360} renderScreen={renderScreen} />
        <figcaption style={{ color: "#c9ced6", font: "600 12px system-ui", padding: "4px 2px" }}>frame {f}</figcaption>
      </figure>)}
    </div>;
  },
};

/** The example screen in a state that shows every target, with the rects `measureScreenTargets` reads from it. */
export const MeasureTargets: Story = {
  render: function Measure() {
    const ref = useRef<HTMLDivElement>(null), [rects, setRects] = useState("");
    useLayoutEffect(() => { if (ref.current) setRects(JSON.stringify(measureScreenTargets(ref.current), null, 1)); }, []);
    return <div style={{ padding: 16, background: "#0b0d10", color: "#e5e7eb" }}>
      <div ref={ref} style={{ width: 1280, height: 800, position: "relative" }}>
        <TasksScreen state={{ composer: true, title: "Send the quarterly summary", added: true, addedTitle: "Send the quarterly summary", toast: true }} since={{}} frame={0} width={1280} height={800} />
      </div>
      <pre data-km-measured-targets="" style={{ font: "12px/1.4 ui-monospace, monospace" }}>{rects}</pre>
    </div>;
  },
};

/** One screen state, full size, for capturing the screenshot examples. `state` picks the capture. */
export const Capture: StoryObj<{ state: "start" | "composer" | "added" | "done" }> = {
  args: { state: "start" },
  argTypes: { state: { control: "inline-radio", options: ["start", "composer", "added", "done"] } },
  parameters: { layout: "fullscreen" },
  render: ({ state }) => {
    const title = "Send the quarterly summary";
    const states = { start: {}, composer: { composer: true }, added: { added: true, addedTitle: title, toast: true }, done: { added: true, addedTitle: title, toast: true, "done-retro": true } };
    return <div data-km-capture-screen="" style={{ width: 1280, height: 800 }}><TasksScreen state={states[state]} since={{}} frame={0} width={1280} height={800} /></div>;
  },
};
