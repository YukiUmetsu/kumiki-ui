import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShotListEditor } from "../../registry/video/shot-list-editor";
import type { ShotListItem } from "../../registry/video/shot-list-editor";

const kinds = [{ value: "establish", label: "Establish" }, { value: "follow", label: "Follow" }, { value: "push-in", label: "Push in" }, { value: "reveal-hold", label: "Reveal and hold" }];
const initial: ShotListItem[] = [
  { id: "wide", title: "Wide", kind: "establish", purpose: "Locate both people and the table.", detail: "0.0 s to 6.5 s" },
  { id: "reveal", title: "Reveal", kind: "push-in", purpose: "Show that the two figures differ.", detail: "6.5 s to 10.0 s" },
];
function Editable(props: { readOnly?: boolean; withError?: boolean }) {
  const [shots, setShots] = useState(initial);
  return <div className="max-w-xl p-4"><ShotListEditor shots={shots} kinds={kinds} onChange={setShots} readOnly={props.readOnly}
    diagnostics={props.withError ? [{ shotId: "reveal", severity: "error", message: "The subject leaves the safe frame at 7.2 s." }] : []}/></div>;
}
const meta = { title: "Video production / Shot List Editor", component: Editable } satisfies Meta<typeof Editable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithError: Story = { args: { withError: true } };
export const ReadOnly: Story = { args: { readOnly: true } };
