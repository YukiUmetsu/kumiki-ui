import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BUG_SPECIES } from "../../registry/anatomy/bug-data";
import { BugFigure, BugMotion, BugSheet } from "../../registry/anatomy/bug-react";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };

/** Every species at life size relative to the others (a 10 mm grid). */
function ToScale() {
  const px = 4.2;
  return (
    <div style={page}>
      <h2 style={h2}>To scale — every species against a 10 mm grid</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Each drawn at the same scale (about 4 px a millimetre), so a ladybird is a tenth of a mantis. The Jorō spider's span is its legs; a swallowtail's is its wings.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end", padding: 12, borderRadius: 8, backgroundColor: "#ece6da", backgroundImage: "linear-gradient(#0001 1px, transparent 1px), linear-gradient(90deg, #0001 1px, transparent 1px)", backgroundSize: `${10 * px}px ${10 * px}px` }}>
        {BUG_SPECIES.map(s => { const size = Math.max(40, (s.wingspan?.typical ?? s.length.typical * (1 + 1.3 * s.legs)) * 1.24 * px); return <figure key={s.id} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 2 }}><BugFigure species={s.id} size={size} /><figcaption style={{ ...muted, fontSize: 12 }}>{s.label}</figcaption></figure>; })}
      </div>
    </div>
  );
}

function Motion() {
  return (
    <div style={page}>
      <h2 style={h2}>In motion — gaits, wingbeats, flashes at their real rates</h2>
      <p style={{ ...muted, maxWidth: 900 }}>An ant walks in the alternating tripod gait. A swallowtail beats about 8 times a second, slow enough for a 24 fps camera to see each pose; a dragonfly's 30 and a bee's 230 beats are a blur. A Genji firefly flashes about every 2 seconds in western Japan (about 4 in the east), all of a stream's males in step.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        <BugMotion species="ant" mode="walk" />
        <BugMotion species="ladybird" mode="walk" />
        <BugMotion species="swallowtail" mode="fly" />
        <BugMotion species="honeybee" mode="fly" />
        <BugMotion species="firefly" mode="glow" />
        <BugMotion species="orb-spider" mode="walk" />
      </div>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Insects and Small Creatures", id: "video-bugs", component: BugSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof BugSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Insects and small creatures (BUG1)</h2><BugSheet /></div> };
export const ToScaleStory: Story = { name: "To scale", render: () => <ToScale /> };
export const MotionStory: Story = { name: "In motion", render: () => <Motion /> };
