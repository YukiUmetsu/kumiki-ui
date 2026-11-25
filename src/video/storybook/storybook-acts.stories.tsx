import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ACTS } from "../../../registry/rig/rig-acting";
import { actBench, sequenceBench } from "./story-benches";
import { StoryBench, StoryPage } from "./story-page";

const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Animations", id: "video-storybook-acts", parameters: { layout: "fullscreen" } };
export default meta;
function One({ act, strength }: { act: string; strength: number }) { const film = useMemo(() => actBench(act, strength), [act, strength]); return <StoryPage title={act} about={ACTS[act].about}><StoryBench film={film} /></StoryPage>; }
/** Choose an act. Emma uses the near hand, Riku the far hand. */
export const Act: StoryObj<{ act: string; strength: number }> = { name: "One act", args: { act: "scan", strength: 1 }, argTypes: { act: { control: "select", options: Object.keys(ACTS) }, strength: { control: { type: "range", min: 0.3, max: 1.4, step: 0.1 } } }, render: a => <One {...a} /> };
const sequence = sequenceBench();
/** Acts overlap, blend, and cut one another short. */
export const Sequence: StoryObj = { name: "Acts in a sequence", render: () => <StoryPage title="Acts in a sequence"><StoryBench film={sequence} /></StoryPage> };
/** What the library holds. */
export const Library: StoryObj = { render: () => <StoryPage title="Library"><table style={{ borderCollapse: "collapse", font: "400 16px/1.5 system-ui, sans-serif" }}><thead><tr>{["Act", "Group", "Seconds", "What it does"].map(h => <th key={h} scope="col" align="left" style={{ padding: "4px 18px 4px 0" }}>{h}</th>)}</tr></thead><tbody>{Object.entries(ACTS).map(([id, a]) => <tr key={id}><th scope="row" align="left" style={{ padding: "3px 18px 3px 0" }}>{id}</th><td style={{ padding: "3px 18px 3px 0" }}>{a.group}</td><td style={{ padding: "3px 18px 3px 0" }}>{a.seconds}</td><td>{a.about}</td></tr>)}</tbody></table></StoryPage> };
