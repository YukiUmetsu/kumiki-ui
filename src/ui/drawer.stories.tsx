import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Drawer } from "./drawer";
import type { DrawerRootProps } from "./drawer";

const meta = {
  title: "Overlays and notifications/Drawer", id: "components-drawer",
  component: Drawer.Root,
  parameters: { layout: "fullscreen" },
  args: { children: null, side: "bottom", motion: "smooth", modal: true },
  argTypes: {
    side: { control: "select", options: ["left", "right", "top", "bottom"] },
    motion: { control: "select", options: ["subtle", "smooth", "spring", "snappy", "none"] },
    modal: { control: "boolean" },
  },
} satisfies Meta<typeof Drawer.Root>;
export default meta;
type Story = StoryObj<typeof meta>;

function Preview({ long = false, ...props }: Omit<DrawerRootProps, "children"> & { long?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="flex min-h-[68vh] flex-col items-center justify-center gap-5 bg-surface-subtle p-8 text-foreground">
    <div className="max-w-sm space-y-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Touch and mouse</p>
      <h2 className="text-2xl font-semibold tracking-tight">A drawer that follows you</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">Drag toward the edge to dismiss. On vertical drawers, choose a snap point or keep scrolling inside the content.</p>
    </div>
    <Drawer.Root {...props} open={open} onOpenChange={setOpen}>
      <Drawer.Trigger render={<Button />}>Choose media</Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header><div className="min-w-0"><Drawer.Title>Media library</Drawer.Title><Drawer.Description>Find the right asset for this scene.</Drawer.Description></div><Drawer.Close /></Drawer.Header>
        <Drawer.Body className="space-y-4">
          <label htmlFor="drawer-search" className="block text-sm font-medium">Search assets</label>
          <input id="drawer-search" data-base-ui-swipe-ignore="" placeholder="Search footage, music, images…" className="w-full rounded-control border border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <div data-base-ui-swipe-ignore="y" className="space-y-2">
            {(long ? Array.from({ length: 20 }, (_, i) => `クリップ ${i + 1}`) : ["Nature footage", "Ambient piano", "Soft transition", "Paper texture"]).map((name) => <button type="button" key={name} className="flex w-full items-center justify-between rounded-control border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{name}</span><span aria-hidden="true">＋</span></button>)}
          </div>
        </Drawer.Body>
        <Drawer.Footer><Drawer.Close render={<Button variant="outline" />}>Cancel</Drawer.Close><Button onClick={() => setOpen(false)}>Add selection</Button></Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  </div>;
}

export const Default: Story = { args: { snapPoints: [0.4, 0.75, 1], defaultSnapPoint: 0.4 }, render: (args) => <Preview {...args} /> };
export const SideDrawer: Story = { args: { side: "right", motion: "snappy" }, render: (args) => <Preview {...args} /> };
export const LeftDrawer: Story = { args: { side: "left", motion: "subtle" }, render: (args) => <Preview {...args} /> };
export const ScrollAndSwipeIgnore: Story = { args: { snapPoints: [0.4, 1], defaultSnapPoint: 0.4 }, render: (args) => <Preview {...args} long /> };
export const SpringMotion: Story = { args: { motion: "spring" }, render: (args) => <Preview {...args} /> };
export const NoMotion: Story = { args: { motion: "none" }, render: (args) => <Preview {...args} /> };
