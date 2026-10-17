import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { Field, Input } from "../ui/field-input";
import { Textarea, TextareaField } from "../ui/textarea";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { Tabs } from "../ui/tabs";
import { Surface } from "../ui/surface-card";
import { DropdownMenu } from "../ui/dropdown-menu";
import type { DropdownMenuEntry } from "../ui/dropdown-menu";
import { Progress } from "../ui/progress";
import { Dialog } from "../ui/dialog";
import { Popover } from "../ui/popover";
import { Tooltip, TooltipProvider } from "../ui/tooltip";
import { useToast } from "../ui/toast";
import { IconEdit, IconPlus, IconTrash, IconChevronRight } from "./shared/icons";

const buttonVariants = ["primary", "secondary", "subtle", "outline", "destructive"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;
const iconButtonSizes = ["sm", "md", "lg"] as const;

/** Card/section title used identically across both showcase pages. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-body font-medium tracking-body text-foreground">
      {children}
    </h2>
  );
}

function iconSizeForButton(size: string): string {
  return size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
}

function ActionsPanel() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Buttons</SectionTitle>}>
        <div className="flex flex-wrap items-center gap-2">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Button sizes</SectionTitle>}>
        <div className="flex flex-wrap items-center gap-2">
          {buttonSizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
        </div>
      </Surface>

      <Surface header={<SectionTitle>Icon buttons</SectionTitle>}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            {buttonVariants.map((variant) => (
              <div key={variant} className="flex flex-col items-center gap-2">
                <IconButton
                  variant={variant}
                  aria-label={`${variant} action`}
                >
                  {variant === "destructive" ? (
                    <IconTrash className="size-5" />
                  ) : (
                    <IconEdit className="size-5" />
                  )}
                </IconButton>
                <span className="text-caption text-muted-foreground capitalize">
                  {variant}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            {iconButtonSizes.map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <IconButton variant="outline" size={size} aria-label={`${size} action`}>
                  <IconPlus className={iconSizeForButton(size)} />
                </IconButton>
                <span className="text-caption text-muted-foreground capitalize">
                  {size}
                </span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <Tooltip content="Create new item">
                <IconButton variant="outline" aria-label="Create new item">
                  <IconPlus className="size-5" />
                </IconButton>
              </Tooltip>
              <span className="text-caption text-muted-foreground">With tooltip</span>
            </div>
          </div>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Loading state</SectionTitle>}>
        <Button isLoading={loading} loadingLabel="Working" onClick={() => setLoading((v) => !v)}>
          {loading ? "Working" : "Toggle loading"}
        </Button>
      </Surface>
    </div>
  );
}

function FormsPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("hello@example.com");
  const [bio, setBio] = useState("");
  const [search, setSearch] = useState("");
  const emailError = email.includes("@") ? undefined : "Enter a valid email address.";

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Field + Input</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Name"
            value={name}
            placeholder="Jamie Smith"
            onChange={(event) => setName(event.target.value)}
            hint="Your full name."
          />
          <Field
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
          />
          <Input
            placeholder="Search"
            aria-label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Field label="Disabled" disabled value="Read-only value" />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Textarea</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextareaField
            label="Bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Tell us a little about yourself."
            hint={
              <span className="flex justify-between gap-4">
                <span>A short introduction.</span>
                <span className="tabular-nums">{bio.length} / 160</span>
              </span>
            }
            showCount={false}
            autoResize
            maxLength={160}
          />
          <TextareaField
            label="Feedback"
            error="This field is required."
            placeholder="Write something…"
          />
          <Textarea placeholder="Bare textarea" aria-label="Comments" rows={3} />
        </div>
      </Surface>
    </div>
  );
}

const roleOptions = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

function SelectionPanel() {
  const [role, setRole] = useState("editor");
  const [checked, setChecked] = useState(true);
  const [indeterminate, setIndeterminate] = useState(true);
  const [on, setOn] = useState(true);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Select</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Role"
            options={roleOptions}
            value={role}
            onValueChange={(value) => setRole(value ?? "editor")}
          />
          <Select
            label="Searchable role"
            searchable
            options={roleOptions}
            value={role}
            onValueChange={(value) => setRole(value ?? "editor")}
          />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Checkbox</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Checkbox label="Checked" checked={checked} onCheckedChange={setChecked} />
          <Checkbox
            label="Unchecked"
            checked={!checked}
            onCheckedChange={(value) => setChecked(value)}
          />
          <Checkbox
            label="Indeterminate"
            indeterminate={indeterminate}
            onCheckedChange={() => setIndeterminate((v) => !v)}
          />
          <Checkbox
            label="With description"
            description="Extra context for this option."
            checked={true}
            onCheckedChange={() => {}}
          />
          <Checkbox label="Disabled" disabled checked={true} />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Switch</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Switch label="On" checked={on} onCheckedChange={setOn} />
          <Switch label="Off" checked={!on} onCheckedChange={(value) => setOn(value)} />
          <Switch
            label="With description"
            description="A longer explanation of what this toggle does."
            checked={true}
            onCheckedChange={() => {}}
          />
          <Switch label="Disabled" disabled checked={true} />
        </div>
      </Surface>
    </div>
  );
}

function OverlaysPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const menuItems: DropdownMenuEntry[] = [
    { label: "Edit", onSelect: () => {} },
    { label: "Duplicate", shortcut: "⌘D", onSelect: () => {} },
    { separator: true },
    { label: "Archive", onSelect: () => {} },
    { label: "Delete", destructive: true, onSelect: () => {} },
  ];

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Overlays</SectionTitle>}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col items-start gap-2">
            <span className="text-body-sm font-medium text-foreground">Dialog</span>
            <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Dialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              title="Confirm action"
              description="This action cannot be undone."
            >
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => setDialogOpen(false)}>
                  Delete
                </Button>
              </div>
            </Dialog>
          </div>

          <div className="flex flex-col items-start gap-2">
            <span className="text-body-sm font-medium text-foreground">Dropdown menu</span>
            <DropdownMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              label="Options"
              items={menuItems}
            >
              <Button variant="outline">Open menu</Button>
            </DropdownMenu>
          </div>

          <div className="flex flex-col items-start gap-2">
            <span className="text-body-sm font-medium text-foreground">Popover</span>
            <Popover
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              label="More details"
              content={
                <p className="max-w-xs text-body">
                  Extra details about this item, with enough text to show wrapping.
                </p>
              }
            >
              <Button variant="outline">Show details</Button>
            </Popover>
          </div>

          <div className="flex flex-col items-start gap-2">
            <span className="text-body-sm font-medium text-foreground">Tooltip</span>
            <Tooltip content="This is a helpful hint.">
              <Button variant="outline">Hover or focus me</Button>
            </Tooltip>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function FeedbackPanel() {
  const toast = useToast();
  const [syncProgress, setSyncProgress] = useState(0.25);

  useEffect(() => {
    let direction = 1;
    const interval = window.setInterval(() => {
      setSyncProgress((value) => {
        const next = value + direction * 0.04;
        if (next >= 0.75) direction = -1;
        if (next <= 0.25) direction = 1;
        return next;
      });
    }, 140);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Feedback</SectionTitle>}>
        <div className="flex flex-col gap-5">
          <div className="space-y-3">
            <span className="text-body-sm font-medium text-foreground">Progress</span>
            <div className="flex flex-col gap-4">
              <Progress label="Uploading file" progress={0.45} />
              <Progress label="Syncing" progress={syncProgress} />
              <Progress label="Archived" progress={1} disabled />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="mb-3">
              <span className="text-body-sm font-medium text-foreground">Toast</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  toast.show({ type: "success", title: "Saved", message: "Changes were stored." })
                }
              >
                Success
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.show({ type: "error", title: "Failed", message: "Something went wrong." })
                }
              >
                Error
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.show({ type: "info", title: "Notice", message: "Here is some information." })
                }
              >
                Info
              </Button>
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function LayoutPanel() {
  const [pressed, setPressed] = useState(false);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Surface variants</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Surface variant="solid">
            <p className="text-body font-medium">Solid</p>
            <p className="text-body-sm text-muted-foreground">Default panel surface.</p>
          </Surface>
          <Surface variant="outline">
            <p className="text-body font-medium">Outline</p>
            <p className="text-body-sm text-muted-foreground">Border only.</p>
          </Surface>
          <Surface variant="ghost">
            <p className="text-body font-medium">Ghost</p>
            <p className="text-body-sm text-muted-foreground">Transparent.</p>
          </Surface>
        </div>
      </Surface>

      <Surface
        header={<SectionTitle>Surface with header and footer</SectionTitle>}
        footer={
          <>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Save</Button>
          </>
        }
      >
        <p className="text-body">Body content sits between the header and footer regions.</p>
      </Surface>

      <Surface
        header={
          <div className="flex w-full items-center justify-between gap-2">
            <SectionTitle>Interactive surface</SectionTitle>
            <IconChevronRight className="size-5 text-muted-foreground transition-transform duration-[var(--km-duration-short)] ease-continuity group-hover:translate-x-0.5" />
          </div>
        }
        variant="outline"
        interactive
        className="group text-start"
        onClick={() => setPressed((value) => !value)}
        aria-pressed={pressed}
      >
        <p className="text-body">
          {pressed
            ? "Pressed — click the surface again to reset."
            : "Press or click this whole surface."}
        </p>
      </Surface>

      <Surface header={<SectionTitle>Tabs</SectionTitle>}>
        <Tabs defaultActiveIndex={0} label="Example tabs" className="w-full max-w-sm">
          <Tabs.List>
            <Tabs.Tab value={0}>First</Tabs.Tab>
            <Tabs.Tab value={1}>Second</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value={0}>First panel content.</Tabs.Panel>
          <Tabs.Panel value={1}>Second panel content.</Tabs.Panel>
        </Tabs>
      </Surface>
    </div>
  );
}

function AnimatedTabPanel({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Tabs.Panel value={value} className="mt-0">
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </Tabs.Panel>
  );
}

const tabLabels = ["Actions", "Forms", "Selection", "Overlays", "Feedback", "Layout"];

export function ComponentGalleryPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div className="min-h-screen bg-canvas p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8">
              <h1 className="font-serif text-heading font-normal tracking-heading text-foreground">
                Component gallery
              </h1>
              <p className="text-body text-muted-foreground">
                Every component in context, with its common variants and states.
              </p>
            </header>

            <Tabs
              activeIndex={activeIndex}
              onChange={(index) => setActiveIndex(index ?? 0)}
              label="Component categories"
            >
              <Tabs.List>
                {tabLabels.map((label, index) => (
                  <Tabs.Tab key={label} value={index}>
                    {label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <AnimatePresence mode="wait" initial={false}>
                {activeIndex === 0 && (
                  <AnimatedTabPanel key="actions" value={0}>
                    <ActionsPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 1 && (
                  <AnimatedTabPanel key="forms" value={1}>
                    <FormsPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 2 && (
                  <AnimatedTabPanel key="selection" value={2}>
                    <SelectionPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 3 && (
                  <AnimatedTabPanel key="overlays" value={3}>
                    <OverlaysPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 4 && (
                  <AnimatedTabPanel key="feedback" value={4}>
                    <FeedbackPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 5 && (
                  <AnimatedTabPanel key="layout" value={5}>
                    <LayoutPanel />
                  </AnimatedTabPanel>
                )}
              </AnimatePresence>
            </Tabs>
          </div>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
