import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Sheet } from "./sheet";
import type { SheetRootProps } from "./sheet";

const meta = {
  title: "Overlays and notifications/Sheet", id: "components-sheet",
  component: Sheet.Root,
  parameters: { layout: "fullscreen" },
  args: { children: null, side: "right", motion: "smooth", modal: true },
  argTypes: {
    side: { control: "select", options: ["left", "right", "top", "bottom"] },
    motion: { control: "select", options: ["subtle", "smooth", "spring", "snappy", "none"] },
    modal: { control: "boolean" },
  },
} satisfies Meta<typeof Sheet.Root>;
export default meta;
type Story = StoryObj<typeof meta>;

function Preview({ resizable = false, long = false, ...props }: Omit<SheetRootProps, "children"> & { resizable?: boolean; long?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="flex min-h-[68vh] flex-col items-center justify-center gap-5 bg-surface-subtle p-8 text-foreground">
    <div className="max-w-sm space-y-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace preview</p>
      <h2 className="text-2xl font-semibold tracking-tight">Context stays visible</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">Edit supporting information in a focused side sheet. Try Escape, the close button, or a different edge and motion preset.</p>
    </div>
    <Sheet.Root {...props} open={open} onOpenChange={setOpen}>
      <Sheet.Trigger render={<Button variant="primary" />}>Open properties</Sheet.Trigger>
      <Sheet.Content resizable={resizable}>
        <Sheet.Header>
          <div className="min-w-0"><Sheet.Title>Appearance</Sheet.Title><Sheet.Description>Fine-tune the selected element.</Sheet.Description></div>
          <Sheet.Close />
        </Sheet.Header>
        <Sheet.Body className="space-y-6">
          <div className="space-y-2"><label htmlFor="sheet-name" className="text-sm font-medium">Display name</label><input id="sheet-name" defaultValue="Hero heading" className="w-full rounded-control border border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          <div className="space-y-2"><p className="text-sm font-medium">Emphasis</p><div className="flex gap-2"><Button variant="outline" size="sm">Subtle</Button><Button variant="outline" size="sm">Balanced</Button><Button variant="outline" size="sm">Strong</Button></div></div>
          {long && Array.from({ length: 16 }, (_, i) => <div key={i} className="rounded-control border border-border p-3"><p className="font-medium">セクション {i + 1} · Typography detail</p><p className="mt-1 text-muted-foreground">長い内容でも、下の操作ボタンは画面内に残ります。</p></div>)}
        </Sheet.Body>
        <Sheet.Footer><Sheet.Close render={<Button variant="outline" />}>Cancel</Sheet.Close><Button onClick={() => setOpen(false)}>Save changes</Button></Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  </div>;
}

export const Default: Story = { render: (args) => <Preview {...args} /> };
export const Resizable: Story = { render: (args) => <Preview {...args} resizable /> };
export const Top: Story = { args: { side: "top", motion: "snappy" }, render: (args) => <Preview {...args} /> };
export const Bottom: Story = { args: { side: "bottom", motion: "spring" }, render: (args) => <Preview {...args} /> };
export const LongAndLocalizedText: Story = { render: (args) => <Preview {...args} long /> };
export const NonModal: Story = { args: { modal: false, motion: "subtle" }, render: (args) => <Preview {...args} /> };
export const ReducedMotion: Story = { args: { motion: "none" }, render: (args) => <Preview {...args} /> };
