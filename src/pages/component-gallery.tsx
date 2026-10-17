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
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { Alert } from "../ui/alert";
import { Accordion } from "../ui/accordion";
import { RadioGroup } from "../ui/radio-group";
import { Slider } from "../ui/slider";
import { Breadcrumbs } from "../ui/breadcrumbs";
import { Listbox } from "../ui/listbox";
import { Table } from "../ui/table";
import { FormSummary } from "../ui/form-summary";
import { Sidebar } from "../ui/sidebar";
import { Combobox } from "../ui/combobox";
import { CommandPalette } from "../ui/command-palette";
import { SearchableResults } from "../ui/searchable-results";
import { SplitPane } from "../ui/split-pane";
import { IconEdit, IconPlus, IconTrash, IconChevronRight } from "./shared/icons";

const buttonVariants = ["primary", "secondary", "subtle", "outline", "destructive"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;
const iconButtonSizes = ["sm", "md", "lg"] as const;
const badgeVariants = ["neutral", "info", "success", "warning", "danger"] as const;

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
  const [bare, setBare] = useState("");
  const [assignee, setAssignee] = useState<string | null>("ada");
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
          <Field
            label="Search"
            value={search}
            placeholder="Search components"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Field label="Disabled" disabled value="Read-only value" />
        </div>
        <div className="mt-4">
          <Input
            placeholder="Bare input, no Field wrapper"
            aria-label="Bare input example"
            value={bare}
            onChange={(event) => setBare(event.target.value)}
          />
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

      <Surface header={<SectionTitle>Combobox</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Combobox
            label="Assignee"
            placeholder="Search people"
            options={[
              { value: "ada", label: "Ada Lovelace" },
              { value: "grace", label: "Grace Hopper" },
              { value: "linus", label: "Linus Torvalds", disabled: true },
            ]}
            value={assignee}
            onValueChange={setAssignee}
          />
          <Combobox
            label="Labels"
            multiple
            placeholder="Add a label"
            defaultValue={["design"]}
            options={[
              { value: "design", label: "Design" },
              { value: "engineering", label: "Engineering" },
              { value: "research", label: "Research" },
            ]}
          />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Form summary</SectionTitle>}>
        <FormSummary
          errors={[
            { fieldId: "name", label: "Name", message: "Enter your full name." },
            { fieldId: "email", label: "Email", message: "Enter a valid email address." },
          ]}
          onNavigate={() => {}}
        />
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

      <Surface header={<SectionTitle>Radio group</SectionTitle>}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RadioGroup label="Delivery speed" defaultValue="standard">
            <RadioGroup.Item
              value="standard"
              label="Standard"
              description="Arrives in three to five business days."
            />
            <RadioGroup.Item value="express" label="Express" />
            <RadioGroup.Item value="pickup" label="Collect in store" disabled />
          </RadioGroup>
          <RadioGroup label="Alignment" orientation="horizontal" defaultValue="left">
            <RadioGroup.Item value="left" label="Left" />
            <RadioGroup.Item value="center" label="Center" />
            <RadioGroup.Item value="right" label="Right" />
          </RadioGroup>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Slider</SectionTitle>}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Slider label="Volume" defaultValue={40} showValue />
          <Slider
            label="Price range"
            defaultValue={[25, 75]}
            showValue
            formatValue={(value) => `$${value}`}
          />
          <Slider label="Disabled" defaultValue={60} disabled showValue />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Listbox</SectionTitle>}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Listbox
            label="Delivery speed"
            defaultValue="express"
            options={[
              { value: "standard", label: "Standard", description: "Three to five business days." },
              { value: "express", label: "Express", description: "Arrives next business day." },
              { value: "pickup", label: "Collect in store" },
            ]}
          />
          <Listbox
            label="Fruit for the basket"
            selectionMode="multiple"
            defaultValue={["apple", "cherry"]}
            options={[
              { value: "apple", label: "Apple" },
              { value: "banana", label: "Banana", disabled: true },
              { value: "cherry", label: "Cherry" },
              { value: "dragonfruit", label: "Dragon fruit" },
            ]}
          />
        </div>
      </Surface>
    </div>
  );
}

function OverlaysPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const toast = useToast();

  const menuItems: DropdownMenuEntry[] = [
    { label: "Edit", onSelect: () => {} },
    { label: "Duplicate", shortcut: "⌘D", onSelect: () => {} },
    { separator: true },
    { label: "Archive", onSelect: () => {} },
    { label: "Delete", destructive: true, onSelect: () => {} },
  ];

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Tooltip</SectionTitle>}>
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content="Top placement" side="top">
            <Button variant="outline" size="sm">
              Top
            </Button>
          </Tooltip>
          <Tooltip content="Bottom placement" side="bottom">
            <Button variant="outline" size="sm">
              Bottom
            </Button>
          </Tooltip>
          <Tooltip content="Left placement" side="left">
            <Button variant="outline" size="sm">
              Left
            </Button>
          </Tooltip>
          <Tooltip content="Right placement" side="right">
            <Button variant="outline" size="sm">
              Right
            </Button>
          </Tooltip>
        </div>
        <p className="mt-3 text-body-sm text-muted-foreground">
          Appears on hover or keyboard focus.
        </p>
      </Surface>

      <Surface header={<SectionTitle>Popover</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Popover
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              label="Member details"
              side="bottom"
              align="start"
              content={
                <div className="max-w-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-surface-subtle" />
                    <div>
                      <p className="text-body-sm font-medium text-foreground">Alex Rivera</p>
                      <p className="text-caption text-muted-foreground">Product designer</p>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-body-sm text-muted-foreground">
                    Anchored panel for richer content and secondary actions.
                  </p>
                </div>
              }
            >
              <Button variant="outline" size="sm">
                Open popover
              </Button>
            </Popover>
            <p className="text-body-sm text-muted-foreground">
              Opens on click or press and closes on Escape or an outside click.
            </p>
          </div>

          <div className="rounded-surface border border-border bg-surface-floating p-3 text-sm text-foreground shadow-lg">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-surface-subtle" />
              <div>
                <p className="text-body-sm font-medium text-foreground">Alex Rivera</p>
                <p className="text-caption text-muted-foreground">Product designer</p>
              </div>
            </div>
            <Separator className="my-3" />
            <p className="text-body-sm text-muted-foreground">
              Anchored panel for richer content and secondary actions.
            </p>
          </div>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Dropdown menu</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <DropdownMenu label="Actions" align="start" items={menuItems}>
              <Button variant="outline" size="sm">
                Open menu
              </Button>
            </DropdownMenu>
            <p className="text-body-sm text-muted-foreground">
              Navigate with arrow keys; Enter selects, Escape closes.
            </p>
          </div>

          <div className="min-w-48 rounded-surface border border-border bg-surface-floating p-1 text-foreground shadow-lg">
            <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              Actions
            </div>
            <div className="h-px bg-border/70" />
            <div className="relative flex select-none items-center gap-2 rounded-control px-2 py-2 text-sm text-foreground">
              Edit
            </div>
            <div className="relative flex select-none items-center gap-2 rounded-control px-2 py-2 text-sm text-foreground">
              <span className="flex-1">Duplicate</span>
              <span aria-hidden="true" className="text-muted-foreground">
                ⌘D
              </span>
            </div>
            <div className="h-px bg-border/70" />
            <div className="relative flex select-none items-center gap-2 rounded-control px-2 py-2 text-sm text-foreground">
              Archive
            </div>
            <div className="relative flex select-none items-center gap-2 rounded-control px-2 py-2 text-sm text-destructive">
              Delete
            </div>
          </div>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Dialog</SectionTitle>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Dialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              title="Confirm action"
              description="This action cannot be undone."
              size="sm"
            >
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDialogOpen(false)}>
                  Delete
                </Button>
              </div>
            </Dialog>
            <p className="text-body-sm text-muted-foreground">
              Modal dialog traps focus, locks scroll, and dims the page behind it.
            </p>
          </div>

          <div className="rounded-surface border border-border bg-surface-elevated p-5 text-foreground shadow-lg">
            <h3 className="font-serif text-2xl font-normal tracking-subheading text-foreground">
              Confirm action
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" disabled>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Toast</SectionTitle>}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.show({ type: "success", title: "Saved", message: "Changes were stored." })
              }
            >
              Success
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.show({ type: "error", title: "Failed", message: "Something went wrong." })
              }
            >
              Error
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.show({ type: "info", title: "Notice", message: "Here is some information." })
              }
            >
              Info
            </Button>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Imperative notifications that slide in and dismiss automatically.
          </p>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Command palette</SectionTitle>}>
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => setCommandOpen(true)}>
            Open command palette
          </Button>
          <CommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
            commands={[
              { id: "new", label: "New file", shortcut: "⌘N", onSelect: () => {} },
              { id: "open", label: "Open file", shortcut: "⌘O", onSelect: () => {} },
              {
                id: "theme",
                label: "Change appearance",
                keywords: ["theme", "dark"],
                onSelect: () => {},
              },
              { id: "sign-out", label: "Sign out", disabled: true, onSelect: () => {} },
            ]}
          />
          <p className="text-body-sm text-muted-foreground">
            Searchable, keyboard-driven command surface.
          </p>
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
                icon={<span aria-hidden="true" className="size-2 rounded-full bg-status-success" />}
                onClick={() =>
                  toast.show({ type: "success", title: "Saved", message: "Changes were stored." })
                }
              >
                Success
              </Button>
              <Button
                variant="outline"
                icon={<span aria-hidden="true" className="size-2 rounded-full bg-status-danger" />}
                onClick={() =>
                  toast.show({ type: "error", title: "Failed", message: "Something went wrong." })
                }
              >
                Error
              </Button>
              <Button
                variant="outline"
                icon={<span aria-hidden="true" className="size-2 rounded-full bg-status-warning" />}
                onClick={() =>
                  toast.show({ type: "warning", title: "Check this", message: "Review before continuing." })
                }
              >
                Warning
              </Button>
              <Button
                variant="outline"
                icon={<span aria-hidden="true" className="size-2 rounded-full bg-status-info" />}
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

      <Surface header={<SectionTitle>Alert</SectionTitle>}>
        <div className="flex flex-col gap-3">
          <Alert variant="info" title="New version available">
            Reload to get the latest components.
          </Alert>
          <Alert variant="success" title="Saved">
            Your changes were stored.
          </Alert>
          <Alert variant="warning" title="Review required">
            This change affects shared tokens.
          </Alert>
          <Alert
            variant="danger"
            title="Sync failed"
            live="polite"
            dismissible
            onDismiss={() => {}}
            action={
              <Button variant="outline" size="sm">
                Retry
              </Button>
            }
          >
            We could not reach the registry.
          </Alert>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Badge</SectionTitle>}>
        <div className="flex flex-wrap items-center gap-3">
          {badgeVariants.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
          <Badge variant="success" dot>
            With dot
          </Badge>
          <Badge size="sm">Small</Badge>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Skeleton</SectionTitle>}>
        <div className="flex flex-col gap-4">
          <Skeleton shape="text" lines={3} />
          <Skeleton shape="rect" height={96} />
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" width={48} />
            <Skeleton shape="text" lines={2} width="60%" />
          </div>
        </div>
      </Surface>
    </div>
  );
}

function LayoutPanel() {
  const [pressed, setPressed] = useState(false);
  const [docQuery, setDocQuery] = useState("");

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header={<SectionTitle>Surface variants</SectionTitle>}>
        <div className="rounded-md bg-surface-subtle p-4">
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

      <Surface header={<SectionTitle>Separator</SectionTitle>}>
        <div className="flex flex-col gap-4">
          <p className="text-body">Content above the rule.</p>
          <Separator />
          <div className="flex h-12 items-stretch gap-4">
            <span className="text-body self-center">Left</span>
            <Separator orientation="vertical" />
            <span className="text-body self-center">Right</span>
          </div>
        </div>
      </Surface>

      <Surface header={<SectionTitle>Accordion</SectionTitle>}>
        <Accordion defaultValue={["shipping"]}>
          <Accordion.Item value="shipping">
            <Accordion.Header>
              <Accordion.Trigger>Shipping and delivery</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>Orders ship within two business days.</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="returns">
            <Accordion.Header>
              <Accordion.Trigger>Returns</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>Returns are accepted within 30 days of delivery.</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Surface>

      <Surface header={<SectionTitle>Breadcrumbs</SectionTitle>}>
        <div className="flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Components", href: "/components" },
              { label: "Layout" },
            ]}
          />
          <Breadcrumbs
            maxItems={3}
            items={[
              { label: "Home", href: "/" },
              { label: "Library", href: "/library" },
              { label: "Components", href: "/components" },
              { label: "Layout", href: "/layout" },
              { label: "Separator" },
            ]}
          />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Table</SectionTitle>}>
        <Table aria-label="Recent invoices">
          <Table.Caption>Recent invoices, newest first</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head>Invoice</Table.Head>
              <Table.Head>Account</Table.Head>
              <Table.Head className="text-end">Total</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Head scope="row" className="font-medium text-foreground">
                INV-2041
              </Table.Head>
              <Table.Cell>Northwind Studio</Table.Cell>
              <Table.Cell className="text-end tabular-nums">$1,240.00</Table.Cell>
            </Table.Row>
            <Table.Row selected>
              <Table.Head scope="row" className="font-medium text-foreground">
                INV-2042
              </Table.Head>
              <Table.Cell>Lumen Works</Table.Cell>
              <Table.Cell className="text-end tabular-nums">$320.00</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Surface>

      <Surface header={<SectionTitle>Searchable results</SectionTitle>}>
        <SearchableResults
          label="Search the documentation"
          query={docQuery}
          onQueryChange={setDocQuery}
          results={[
            {
              id: "overview",
              title: "Product overview",
              subtitle: "What the platform does in two minutes.",
              href: "/docs/overview",
            },
            {
              id: "install",
              title: "Installation",
              subtitle: "Add the registry and pull components.",
              href: "/docs/install",
            },
            { id: "changelog", title: "Changelog", subtitle: "Not yet available.", disabled: true },
          ]}
        />
      </Surface>

      <Surface header={<SectionTitle>Split pane</SectionTitle>}>
        <div className="h-56">
          <SplitPane
            aria-label="Resize panels"
            defaultPrimarySize={40}
            className="h-full"
            primary={<div className="p-4 text-body">Primary panel</div>}
            secondary={<div className="p-4 text-body">Secondary panel</div>}
          />
        </div>
      </Surface>

      <Surface header={<SectionTitle>Sidebar</SectionTitle>}>
        <div className="h-80 overflow-hidden rounded-surface border border-border">
          <Sidebar>
            <Sidebar.Header>
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-medium">Workspace</span>
                <Sidebar.Toggle />
              </div>
            </Sidebar.Header>
            <Sidebar.Nav>
              <Sidebar.Item href="#" active>
                Overview
              </Sidebar.Item>
              <Sidebar.Item href="#">Reports</Sidebar.Item>
              <Sidebar.Item href="#" disabled>
                Archived
              </Sidebar.Item>
            </Sidebar.Nav>
            <Sidebar.Footer>
              <Sidebar.Item href="#">Settings</Sidebar.Item>
            </Sidebar.Footer>
          </Sidebar>
        </div>
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
