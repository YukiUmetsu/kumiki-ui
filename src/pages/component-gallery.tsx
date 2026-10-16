import { useState } from "react";
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
import { IconCheck, IconPlus } from "./shared/icons";

const buttonVariants = ["primary", "secondary", "subtle", "outline", "destructive"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;
const iconButtonSizes = ["sm", "md", "lg"] as const;

function ActionsPanel() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Surface>

      <Surface header="Button sizes">
        <div className="flex flex-wrap items-center gap-3">
          {buttonSizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
        </div>
      </Surface>

      <Surface header="Icon buttons">
        <div className="flex flex-wrap items-center gap-3">
          {buttonVariants.map((variant) => (
            <IconButton key={variant} variant={variant} aria-label={`${variant} action`}>
              <IconCheck />
            </IconButton>
          ))}
          {iconButtonSizes.map((size) => (
            <IconButton key={size} variant="outline" size={size} aria-label={`${size} action`}>
              <IconPlus
                className={size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5"}
              />
            </IconButton>
          ))}
          <Tooltip content="Create new item">
            <IconButton variant="outline" aria-label="Create new item">
              <IconPlus />
            </IconButton>
          </Tooltip>
        </div>
      </Surface>

      <Surface header="Loading state">
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
      <Surface header="Field + Input">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Name"
            value={name}
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

      <Surface header="Textarea">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextareaField
            label="Bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            hint="Auto-resizing textarea."
            autoResize
            maxLength={200}
          />
          <TextareaField
            label="Feedback"
            error="This field is required."
            placeholder="Write something..."
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
      <Surface header="Select">
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

      <Surface header="Checkbox">
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

      <Surface header="Switch">
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
      <Surface header="Dialog">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Confirm action"
          description="This action cannot be undone."
        >
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDialogOpen(false)}>
              Delete
            </Button>
          </div>
        </Dialog>
      </Surface>

      <Surface header="Dropdown menu">
        <DropdownMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          label="Options"
          items={menuItems}
        >
          <Button variant="outline">Open menu</Button>
        </DropdownMenu>
      </Surface>

      <Surface header="Popover">
        <Popover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          label="More details"
          content={
            <p className="max-w-xs">
              Extra details about this item, with enough text to show wrapping.
            </p>
          }
        >
          <Button variant="outline">Show details</Button>
        </Popover>
      </Surface>

      <Surface header="Tooltip">
        <Tooltip content="This is a helpful hint.">
          <Button variant="outline">Hover or focus me</Button>
        </Tooltip>
      </Surface>
    </div>
  );
}

function FeedbackPanel() {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header="Progress">
        <div className="flex flex-col gap-4">
          <Progress label="Uploading file" progress={0.45} />
          <Progress label="Syncing" mode="indeterminate" />
          <Progress label="Archived" progress={0.8} disabled />
        </div>
      </Surface>

      <Surface header="Toast">
        <div className="flex flex-wrap gap-3">
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
      </Surface>
    </div>
  );
}

function LayoutPanel() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <Surface header="Surface variants">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Surface variant="solid">
            <p className="font-medium">Solid</p>
            <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
              Default panel surface.
            </p>
          </Surface>
          <Surface variant="outline">
            <p className="font-medium">Outline</p>
            <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
              Border only.
            </p>
          </Surface>
          <Surface variant="ghost">
            <p className="font-medium">Ghost</p>
            <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
              Transparent.
            </p>
          </Surface>
        </div>
      </Surface>

      <Surface
        header="Surface with header and footer"
        footer={
          <>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Save</Button>
          </>
        }
      >
        <p>Body content sits between the header and footer regions.</p>
      </Surface>

      <Surface header="Interactive surface" interactive>
        Press or click this whole surface.
      </Surface>

      <Surface header="Tabs">
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

export function ComponentGalleryPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-canvas p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Component gallery</h1>
            <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
              Every component in context, with its common variants and states.
            </p>
          </header>

          <Tabs defaultActiveIndex={0} label="Component categories">
            <Tabs.List>
              <Tabs.Tab value={0}>Actions</Tabs.Tab>
              <Tabs.Tab value={1}>Forms</Tabs.Tab>
              <Tabs.Tab value={2}>Selection</Tabs.Tab>
              <Tabs.Tab value={3}>Overlays</Tabs.Tab>
              <Tabs.Tab value={4}>Feedback</Tabs.Tab>
              <Tabs.Tab value={5}>Layout</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={0}>
              <ActionsPanel />
            </Tabs.Panel>
            <Tabs.Panel value={1}>
              <FormsPanel />
            </Tabs.Panel>
            <Tabs.Panel value={2}>
              <SelectionPanel />
            </Tabs.Panel>
            <Tabs.Panel value={3}>
              <OverlaysPanel />
            </Tabs.Panel>
            <Tabs.Panel value={4}>
              <FeedbackPanel />
            </Tabs.Panel>
            <Tabs.Panel value={5}>
              <LayoutPanel />
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
