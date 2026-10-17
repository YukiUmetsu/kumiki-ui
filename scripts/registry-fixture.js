// Prove that items installed from this registry actually compile inside an
// isolated consumer app. Unlike registry-smoke.js (which only stages files),
// this creates a fresh fixture in the OS temp dir, installs the declared
// dependencies, copies the registry sources to their declared targets and runs
// `tsc --noEmit` over a consumer file that exercises the public APIs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadManifest,
  loadPackageJson,
  validateManifest,
  itemFiles,
  resolveRegistryDependencies,
  repoRoot,
} from "./registry-lib.js";

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const itemArg = args.find((arg) => arg.startsWith("--item="));
const itemName = itemArg ? itemArg.slice("--item=".length) : null;

const INSTALL_TIMEOUT_MS = 300_000;
const TSC_TIMEOUT_MS = 180_000;

/**
 * Exact versions resolved by the repo's lockfile, falling back to the semver
 * ranges declared in package.json so the fixture never invents a version.
 */
function resolvedVersions() {
  const pkg = loadPackageJson();
  const ranges = { ...pkg.dependencies, ...pkg.devDependencies };
  const lockPath = path.join(repoRoot, "package-lock.json");
  const versions = { ...ranges };
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      if (key.startsWith("node_modules/") && entry?.version) {
        versions[key.slice("node_modules/".length)] = entry.version;
      }
    }
  }
  return versions;
}

function pin(versions, name) {
  const version = versions[name];
  if (!version) throw new Error(`no version for dependency "${name}" in package.json/lockfile`);
  return version;
}

/** Run a command in the fixture, capturing output; throw with output on failure. */
function run(command, commandArgs, cwd, timeout) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`${command} failed to start in ${cwd}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${commandArgs.join(" ")} exited with code ${result.status}\n${output}`);
  }
  return result;
}

/** Resolve a manifest target inside the fixture, rejecting absolute/escaping paths. */
function safeTarget(fixtureDir, target) {
  if (path.isAbsolute(target) || target.split(/[\\/]+/).includes("..")) {
    throw new Error(`unsafe registry target "${target}" (absolute or contains "..")`);
  }
  const root = path.resolve(fixtureDir);
  const destination = path.resolve(root, target);
  if (destination !== root && !destination.startsWith(root + path.sep)) {
    throw new Error(`registry target "${target}" escapes the fixture directory`);
  }
  return destination;
}

/** Import specifier from the fixture's `src/` to an installed target file. */
function importSpecifier(fixtureDir, target) {
  const absolute = path.resolve(fixtureDir, target);
  let relative = path.relative(path.join(fixtureDir, "src"), absolute);
  relative = relative.replace(/\.(tsx?|jsx?)$/, "");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative.split(path.sep).join("/");
}

// Consumer usage templates keyed by registry item name. Each exercises the
// public API surface so a broken or missing export fails the typecheck.
const USAGE = {
  button: (specifier) => ({
    imports: [`import { Button } from "${specifier}";`],
    componentName: "ButtonExample",
    component: `export function ButtonExample() {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <Button
        ref={ref}
        variant="destructive"
        size="sm"
        isLoading={busy}
        loadingLabel="Deleting…"
        icon={<span aria-hidden="true">+</span>}
        onClick={() => setBusy((value) => !value)}
      >
        Delete
      </Button>
      <Button variant="outline" size="icon" aria-label="More" onClick={() => ref.current?.focus()}>
        …
      </Button>
    </div>
  );
}`,
  }),
  input: (specifier) => ({
    imports: [`import { Field, Input } from "${specifier}";`],
    componentName: "InputExample",
    component: `export function InputExample() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Field
        ref={ref}
        label="Email"
        hint="We never share your address."
        error="That email is already registered."
        type="email"
        placeholder="you@example.com"
      />
      <Input aria-label="Search" placeholder="Search" defaultValue="" />
    </div>
  );
}`,
  }),
  // Aliased so this item can coexist with `input` (both re-export Field/Input)
  // in the fixture's single generated consumer module without clashing names.
  "field-input": (specifier) => ({
    imports: [`import { Field as FieldWithInput, Input as InputVariant } from "${specifier}";`],
    componentName: "FieldInputExample",
    component: `export function FieldInputExample() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <FieldWithInput
        ref={ref}
        label="Email"
        hint="We never share your address."
        description="Use a work address."
        error="That email is already registered."
        autoResize
        maxLength={80}
        type="email"
        placeholder="you@example.com"
      />
      <InputVariant aria-label="Search" placeholder="Search" defaultValue="" />
    </div>
  );
}`,
  }),
  dialog: (specifier) => ({
    imports: [`import { Dialog } from "${specifier}";`],
    componentName: "DialogExample",
    component: `export function DialogExample() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onClose={() => setOpen(false)}
      title="Confirm changes"
      description="This updates every linked record."
      size="lg"
      placement="center"
      modal
      closeLabel="Close dialog"
    >
      <p>Dialog body content.</p>
    </Dialog>
  );
}`,
  }),
  separator: (specifier) => ({
    imports: [`import { Separator } from "${specifier}";`],
    componentName: "SeparatorExample",
    component: `export function SeparatorExample() {
  return (
    <div>
      <Separator />
      <Separator orientation="vertical" />
      <Separator decorative={false} aria-label="Section break" />
    </div>
  );
}`,
  }),
  skeleton: (specifier) => ({
    imports: [`import { Skeleton } from "${specifier}";`],
    componentName: "SkeletonExample",
    component: `export function SkeletonExample() {
  return (
    <div>
      <Skeleton shape="text" lines={3} />
      <Skeleton shape="rect" width={240} height={96} />
      <Skeleton shape="circle" width={48} />
    </div>
  );
}`,
  }),
  badge: (specifier) => ({
    imports: [`import { Badge } from "${specifier}";`],
    componentName: "BadgeExample",
    component: `export function BadgeExample() {
  return (
    <div>
      <Badge variant="success">Active</Badge>
      <Badge variant="danger" dot>
        Offline
      </Badge>
      <Badge size="sm" variant="neutral">
        Draft
      </Badge>
    </div>
  );
}`,
  }),
  alert: (specifier) => ({
    imports: [`import { Alert } from "${specifier}";`],
    componentName: "AlertExample",
    component: `export function AlertExample() {
  return (
    <div>
      <Alert variant="warning" title="Review required" live="polite">
        This change affects shared tokens.
      </Alert>
      <Alert
        variant="danger"
        title="Sync failed"
        dismissible
        onDismiss={() => {}}
        action={<button type="button">Retry</button>}
      >
        We could not reach the registry.
      </Alert>
    </div>
  );
}`,
  }),
  accordion: (specifier) => ({
    imports: [`import { Accordion } from "${specifier}";`],
    componentName: "AccordionExample",
    component: `export function AccordionExample() {
  return (
    <Accordion defaultValue={["one"]} openMultiple>
      <Accordion.Item value="one">
        <Accordion.Header>
          <Accordion.Trigger>First section</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>First section content.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="two">
        <Accordion.Header>
          <Accordion.Trigger>Second section</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Second section content.</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}`,
  }),
  "radio-group": (specifier) => ({
    imports: [`import { RadioGroup } from "${specifier}";`],
    componentName: "RadioGroupExample",
    component: `export function RadioGroupExample() {
  return (
    <RadioGroup label="Delivery speed" defaultValue="standard">
      <RadioGroup.Item
        value="standard"
        label="Standard"
        description="Arrives in three to five business days."
      />
      <RadioGroup.Item value="express" label="Express" />
      <RadioGroup.Item value="pickup" label="Collect in store" disabled />
    </RadioGroup>
  );
}`,
  }),
  slider: (specifier) => ({
    imports: [`import { Slider } from "${specifier}";`],
    componentName: "SliderExample",
    component: `export function SliderExample() {
  return (
    <div>
      <Slider label="Volume" defaultValue={40} showValue />
      <Slider
        label="Price range"
        defaultValue={[25, 75]}
        showValue
        formatValue={(value) => \`$\${value}\`}
      />
    </div>
  );
}`,
  }),
  breadcrumbs: (specifier) => ({
    imports: [`import { Breadcrumbs } from "${specifier}";`],
    componentName: "BreadcrumbsExample",
    component: `export function BreadcrumbsExample() {
  return (
    <Breadcrumbs
      items={[
        { label: "Home", href: "/" },
        { label: "Components", href: "/components" },
        { label: "Layout" },
      ]}
    />
  );
}`,
  }),
  listbox: (specifier) => ({
    imports: [`import { Listbox } from "${specifier}";`],
    componentName: "ListboxExample",
    component: `export function ListboxExample() {
  return (
    <Listbox
      label="Fruit"
      selectionMode="multiple"
      defaultValue={["apple"]}
      options={[
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana", disabled: true },
        { value: "cherry", label: "Cherry", description: "Stone fruit" },
      ]}
    />
  );
}`,
  }),
  table: (specifier) => ({
    imports: [`import { Table } from "${specifier}";`],
    componentName: "TableExample",
    component: `export function TableExample() {
  const [direction, setDirection] = useState<"ascending" | "descending">("ascending");
  return (
    <Table aria-label="Invoices">
      <Table.Caption>Recent invoices</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head
            sortDirection={direction}
            onSortChange={() =>
              setDirection((current) => (current === "ascending" ? "descending" : "ascending"))
            }
          >
            Account
          </Table.Head>
          <Table.Head>Total</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row selected>
          <Table.Head scope="row">Northwind Studio</Table.Head>
          <Table.Cell>$1,240.00</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}`,
  }),
  "form-summary": (specifier) => ({
    imports: [`import { FormSummary } from "${specifier}";`],
    componentName: "FormSummaryExample",
    component: `export function FormSummaryExample() {
  return (
    <FormSummary
      errors={[
        { fieldId: "email", label: "Email", message: "Enter a valid email address." },
        { fieldId: "name", label: "Name", message: "This field is required." },
      ]}
      live="assertive"
      onNavigate={(fieldId) => {
        document.getElementById(fieldId)?.focus();
      }}
    />
  );
}`,
  }),
  sidebar: (specifier) => ({
    imports: [`import { Sidebar } from "${specifier}";`],
    componentName: "SidebarExample",
    component: `export function SidebarExample() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} aria-label="Workspace">
      <Sidebar.Header>
        <Sidebar.Toggle />
      </Sidebar.Header>
      <Sidebar.Nav>
        <Sidebar.Item href="/overview" active>
          Overview
        </Sidebar.Item>
        <Sidebar.Item href="/reports">Reports</Sidebar.Item>
      </Sidebar.Nav>
      <Sidebar.Footer>
        <Sidebar.Item href="/settings" disabled>
          Settings
        </Sidebar.Item>
      </Sidebar.Footer>
    </Sidebar>
  );
}`,
  }),
  combobox: (specifier) => ({
    imports: [`import { Combobox } from "${specifier}";`],
    componentName: "ComboboxExample",
    component: `export function ComboboxExample() {
  const [value, setValue] = useState<string | null>("apple");
  return (
    <Combobox
      label="Fruit"
      placeholder="Search fruit"
      options={[
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana", disabled: true },
        { value: "cherry", label: "Cherry" },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
}`,
  }),
  "command-palette": (specifier) => ({
    imports: [`import { CommandPalette } from "${specifier}";`],
    componentName: "CommandPaletteExample",
    component: `export function CommandPaletteExample() {
  const [open, setOpen] = useState(true);
  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      commands={[
        { id: "new", label: "New file", shortcut: "⌘N", onSelect: () => {} },
        { id: "open", label: "Open file", keywords: ["browse"], onSelect: () => {} },
        { id: "sign-out", label: "Sign out", disabled: true, onSelect: () => {} },
      ]}
    />
  );
}`,
  }),
  "searchable-results": (specifier) => ({
    imports: [`import { SearchableResults } from "${specifier}";`],
    componentName: "SearchableResultsExample",
    component: `export function SearchableResultsExample() {
  const [query, setQuery] = useState("");
  return (
    <SearchableResults
      label="Search the documentation"
      query={query}
      onQueryChange={setQuery}
      results={[
        {
          id: "overview",
          title: "Product overview",
          subtitle: "What the platform does.",
          href: "/docs/overview",
        },
        { id: "changelog", title: "Changelog", disabled: true },
      ]}
    />
  );
}`,
  }),
  "split-pane": (specifier) => ({
    imports: [`import { SplitPane } from "${specifier}";`],
    componentName: "SplitPaneExample",
    component: `export function SplitPaneExample() {
  const [size, setSize] = useState(50);
  return (
    <SplitPane
      primarySize={size}
      onPrimarySizeChange={setSize}
      minPrimarySize={20}
      maxPrimarySize={80}
      aria-label="Resize panels"
      primary={<div>Primary panel</div>}
      secondary={<div>Secondary panel</div>}
    />
  );
}`,
  }),
  "search-and-results": (specifier) => ({
    imports: [`import { SearchAndResults } from "${specifier}";`],
    componentName: "SearchAndResultsExample",
    component: `export function SearchAndResultsExample() {
  const [query, setQuery] = useState("report");
  return (
    <SearchAndResults
      query={query}
      onQueryChange={setQuery}
      results={[
        { id: "quarterly", title: "Quarterly report", subtitle: "Finance", href: "/reports/quarterly" },
        { id: "usage", title: "Usage summary", group: "Metrics" },
        { id: "archive", title: "Archived export", disabled: true },
      ]}
      filters={[
        { id: "kind", label: "Kind", type: "select", options: [{ value: "doc", label: "Document" }] },
        { id: "tags", label: "Tags", type: "checkbox", options: [{ value: "draft", label: "Draft" }] },
      ]}
      activeFilters={{ kind: ["doc"], tags: ["draft"] }}
      onFiltersChange={() => {}}
      onLoadMore={() => {}}
      hasMore
    />
  );
}`,
  }),
  "settings-section": (specifier) => ({
    imports: [`import { SettingsSection } from "${specifier}";`],
    componentName: "SettingsSectionExample",
    component: `export function SettingsSectionExample() {
  const [values, setValues] = useState<Record<string, unknown>>({
    displayName: "Sample workspace",
    theme: "light",
    notifications: true,
  });
  return (
    <SettingsSection
      title="Workspace settings"
      description="Applies to everyone in this workspace."
      fields={[
        { id: "displayName", label: "Display name", type: "text", hint: "Shown on shared pages." },
        { id: "bio", label: "Bio", type: "textarea", placeholder: "A short introduction" },
        { id: "theme", label: "Theme", type: "select", options: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }] },
        { id: "notifications", label: "Email notifications", type: "switch" },
        { id: "beta", label: "Join the beta", type: "checkbox" },
      ]}
      values={values}
      onChange={(next) => setValues(next)}
      onSave={() => {}}
      onReset={() => setValues({ displayName: "Sample workspace", theme: "light", notifications: true })}
    />
  );
}`,
  }),
  "process-monitor": (specifier) => ({
    imports: [`import { ProcessMonitor } from "${specifier}";`],
    componentName: "ProcessMonitorExample",
    component: `export function ProcessMonitorExample() {
  return (
    <ProcessMonitor
      stages={[
        { id: "fetch", label: "Fetch sources" },
        { id: "build", label: "Build artifacts", description: "Compiles every entry point." },
        { id: "publish", label: "Publish" },
      ]}
      stageStatus={{ fetch: "done", build: "active", publish: "pending" }}
      status="running"
      progress={0.45}
      logLines={["Fetched 12 sources", "Building entry points…"]}
      onCancel={() => {}}
    />
  );
}`,
  }),
  "resource-explorer": (specifier) => ({
    imports: [`import { ResourceExplorer } from "${specifier}";`],
    componentName: "ResourceExplorerExample",
    component: `export function ResourceExplorerExample() {
  return (
    <ResourceExplorer
      items={[
        {
          id: "documents",
          label: "Documents",
          children: [{ id: "draft", label: "Draft.txt" }],
        },
        { id: "archive", label: "Archive", disabled: true },
      ]}
      selectedId="draft"
      expandedIds={["documents"]}
      onSelect={() => {}}
      onToggle={() => {}}
      onRename={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      onCreate={() => {}}
    />
  );
}`,
  }),
  "data-details-workspace": (specifier) => ({
    imports: [`import { DataDetailsWorkspace } from "${specifier}";`],
    componentName: "DataDetailsWorkspaceExample",
    component: `export function DataDetailsWorkspaceExample() {
  const [selectedId, setSelectedId] = useState("one");
  return (
    <DataDetailsWorkspace
      title="Records"
      description="Select a row to inspect it."
      columns={[
        { key: "name", header: "Name", sortable: true },
        { key: "owner", header: "Owner" },
      ]}
      rows={[
        { id: "one", name: "Alpha", owner: "Rin" },
        { id: "two", name: "Beta", owner: "Sam" },
      ]}
      sort={{ key: "name", direction: "ascending" }}
      onSortChange={() => {}}
      selectedId={selectedId}
      onSelect={(row) => setSelectedId(row.id)}
      renderDetail={(row) => <p data-part="detail-value">{String(row.name)}</p>}
    />
  );
}`,
  }),
  "guided-form": (specifier) => ({
    imports: [`import { GuidedForm } from "${specifier}";`],
    componentName: "GuidedFormExample",
    component: `export function GuidedFormExample() {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({ email: "" });
  return (
    <GuidedForm
      steps={[
        { id: "account", label: "Account" },
        { id: "profile", label: "Profile", description: "Tell us about yourself." },
      ]}
      activeStep={activeStep}
      onStepChange={setActiveStep}
      values={values}
      onChange={setValues}
      renderStep={(step) => <p data-part="step-content">{step.label}</p>}
      validate={() => []}
      onSubmit={() => {}}
    />
  );
}`,
  }),
  // --- Media (M0) items ------------------------------------------------
  // These items split their public surface across sibling modules inside the
  // same install folder, so cross-imports derive their specifier from the
  // requested item's own specifier (`../components/media/<file>`) instead of
  // hardcoding the alias mechanism the harness does not provide.
  "media-document": (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { createDocument, parseDocument, serializeDocument, validateDocument } from "${specifier}";`,
        `import { documentToSvg } from "${mediaDir}/svg-export";`,
      ],
      componentName: "MediaDocumentExample",
      component: `export function MediaDocumentExample() {
  const document = createDocument({
    id: "sample-composition",
    artboard: { preset: "16:9", background: "#ffffff", safeRegion: 0.05 },
    fonts: {
      sans: {
        id: "sans",
        family: "Inter",
        weight: 400,
        style: "normal",
        fallback: ["system-ui", "sans-serif"],
        availability: "system",
      },
    },
    assets: {
      swatch: {
        id: "swatch",
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mediaType: "image/png",
        width: 1,
        height: 1,
        alt: "A single opaque pixel",
      },
    },
    guides: [{ id: "centre", axis: "x", position: 640 }],
    layers: [
      {
        id: "headline",
        name: "Headline",
        kind: "text",
        transform: { x: 64, y: 64, width: 720, height: 160 },
        z: 0,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Headline text",
        text: {
          spans: [{ text: "Media document" }],
          fontId: "sans",
          size: 72,
          lineHeight: 1.2,
          letterSpacing: 0,
          align: "start",
          direction: "ltr",
          language: "en",
          fit: "wrap",
          as: "h1",
        },
      },
      {
        id: "cover",
        name: "Cover",
        kind: "media",
        transform: { x: 64, y: 320, width: 480, height: 270 },
        z: 1,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Cover image",
        media: {
          assetId: "swatch",
          fit: "cover",
          focalPoint: { x: 0.5, y: 0.5 },
          mask: { kind: "rounded", radius: 12 },
          alt: "A single opaque pixel",
        },
      },
    ],
  });

  const validDiagnostics = validateDocument(document);

  const invalidDiagnostics = validateDocument(
    createDocument({
      id: "broken-composition",
      artboard: { preset: "1:1" },
      layers: [
        {
          id: "orphan",
          name: "Orphan",
          kind: "text",
          transform: { x: 0, y: 0, width: 200, height: 80 },
          z: 0,
          visible: true,
          locked: false,
          opacity: 2,
          blend: "normal",
          clip: false,
          text: {
            spans: [{ text: "Missing font" }],
            fontId: "absent",
            size: 24,
            lineHeight: 1.4,
            letterSpacing: 0,
            align: "start",
            direction: "ltr",
            fit: "wrap",
            as: "p",
          },
        },
      ],
    })
  );

  const roundTripped = parseDocument(serializeDocument(document));
  const exported = documentToSvg(document, { scale: 2 });
  const firstCode =
    invalidDiagnostics[0]?.code ?? validDiagnostics[0]?.code ?? exported.diagnostics[0]?.code ?? "none";

  return (
    <div>
      <span data-testid="media-document-valid">{String(validDiagnostics.length)}</span>
      <span data-testid="media-document-invalid">{String(invalidDiagnostics.length)}</span>
      <span data-testid="media-document-code">{firstCode}</span>
      <span data-testid="media-document-roundtrip">{roundTripped.document ? "parsed" : "rejected"}</span>
      <span data-testid="media-document-size">{exported.size.width + "x" + exported.size.height}</span>
      <div data-testid="media-document-svg" dangerouslySetInnerHTML={{ __html: exported.svg }} />
    </div>
  );
}`,
    };
  },
  artboard: (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { Artboard, useArtboardContext } from "${specifier}";`,
        `import * as artboardDocument from "${mediaDir}/document";`,
      ],
      componentName: "ArtboardExample",
      component: `function ArtboardContextProbe() {
  const canvas = useArtboardContext();
  return (
    <div data-testid="artboard-probe">{canvas.artboard.id + " " + String(canvas.scale)}</div>
  );
}

export function ArtboardExample() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);

  const artboard = artboardDocument.createArtboard({
    id: "design-surface",
    preset: "16:9",
    background: "#f8fafc",
    bleed: 0.02,
    crop: { top: 6, right: 6, bottom: 6, left: 6 },
  });

  return (
    <Artboard
      artboard={artboard}
      fit="contain"
      zoom={zoom}
      pan={pan}
      showSafeRegion
      showBleed
      showCrop
      selectedIds={selected ? [selected] : []}
      onSelect={setSelected}
      onZoomChange={setZoom}
      onPanChange={setPan}
      guides={[{ id: "third", axis: "x", position: 426 }]}
      grid={{ visible: true, size: 40, subdivisions: 4 }}
      aria-label="Design surface"
    >
      <ArtboardContextProbe />
    </Artboard>
  );
}`,
    };
  },
  "editable-text": (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { EditableText } from "${specifier}";`,
        `import * as editableTextDocument from "${mediaDir}/document";`,
      ],
      componentName: "EditableTextExample",
      component: `export function EditableTextExample() {
  const fonts: Record<string, editableTextDocument.FontAsset> = {
    sans: {
      id: "sans",
      family: "Inter",
      weight: 400,
      style: "normal",
      fallback: ["system-ui"],
      availability: "system",
    },
    display: {
      id: "display",
      family: "Newsreader",
      weight: 600,
      style: "italic",
      fallback: ["Georgia", "serif"],
      availability: "pinned",
      licenseId: "OFL-1.1",
    },
  };

  const [spec, setSpec] = useState<editableTextDocument.TextSpec>({
    spans: [
      { text: "Editable " },
      { text: "rich", fontId: "display", weight: 600, italic: true, underline: true, color: "#b45309" },
      { text: " text" },
    ],
    fontId: "sans",
    size: 32,
    lineHeight: 1.3,
    letterSpacing: 0.5,
    align: "start",
    direction: "ltr",
    language: "en",
    fit: "wrap",
    maxLines: 4,
    as: "h2",
  });

  const shrink: editableTextDocument.TextSpec = {
    spans: [{ text: "Shrink to fit its box" }],
    fontId: "sans",
    size: 96,
    lineHeight: 1.1,
    letterSpacing: 0,
    align: "center",
    direction: "ltr",
    fit: "shrink",
    minSize: 16,
    maxSize: 96,
    as: "div",
  };

  const missingFont: editableTextDocument.TextSpec = {
    spans: [{ text: "Missing font run", fontId: "unregistered" }],
    fontId: "also-missing",
    size: 24,
    lineHeight: 1.4,
    letterSpacing: 0,
    align: "end",
    direction: "rtl",
    fit: "clip",
    as: "p",
  };

  return (
    <div>
      <EditableText
        text={spec}
        fonts={fonts}
        box={{ width: 480, height: 160 }}
        onLayoutChange={(result) => {
          void result.lineCount;
        }}
      />
      <EditableText
        text={spec}
        fonts={fonts}
        editable
        placeholder="Type here"
        onChange={setSpec}
        showDiagnostics={false}
      />
      <EditableText text={shrink} fonts={fonts} box={{ width: 320, height: 120 }} />
      <EditableText text={missingFont} fonts={fonts} />
    </div>
  );
}`,
    };
  },
  "media-frame": (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { MediaFrame, type MediaLoadState } from "${specifier}";`,
        `import * as mediaFrameDocument from "${mediaDir}/document";`,
      ],
      componentName: "MediaFrameExample",
      component: `export function MediaFrameExample() {
  const [coverState, setCoverState] = useState<MediaLoadState>("idle");
  const [containState, setContainState] = useState<MediaLoadState>("idle");

  const asset: mediaFrameDocument.ImageAsset = {
    id: "sample",
    uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    mediaType: "image/png",
    width: 1,
    height: 1,
    alt: "A sample pixel",
    licenseId: "CC0-1.0",
    attribution: "Fixture",
  };

  const cover: mediaFrameDocument.MediaSpec = {
    assetId: "sample",
    fit: "cover",
    focalPoint: { x: 0.2, y: 0.8 },
    mask: { kind: "rounded", radius: 16 },
    alt: "Cover crop focused low-left",
  };

  const contain: mediaFrameDocument.MediaSpec = {
    assetId: "sample",
    fit: "contain",
    focalPoint: { x: 0.5, y: 0.5 },
    mask: { kind: "circle" },
    crop: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
  };

  const decorative: mediaFrameDocument.MediaSpec = {
    assetId: "sample",
    fit: "fill",
    focalPoint: { x: 0.5, y: 0.5 },
    mask: { kind: "inset", inset: { top: 8, right: 8, bottom: 8, left: 8 } },
    decorative: true,
  };

  return (
    <div>
      <div style={{ width: 240, height: 160 }}>
        <MediaFrame
          media={cover}
          asset={asset}
          alt="Overridden alt text"
          loading="eager"
          crossOrigin="anonymous"
          showPlaceholder
          onLoadStateChange={setCoverState}
        />
      </div>
      <div style={{ width: 240, height: 160 }}>
        <MediaFrame
          media={contain}
          asset={asset}
          fallback={<span>No image</span>}
          onLoadStateChange={setContainState}
        />
      </div>
      <div style={{ width: 240, height: 160 }}>
        <MediaFrame media={decorative} asset={asset} showPlaceholder={false} />
      </div>
      <span data-testid="media-frame-state">{coverState + "-" + containState}</span>
    </div>
  );
}`,
    };
  },
  "layer-stack": (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { LayerList, LayerStack } from "${specifier}";`,
        `import * as layerStackDocument from "${mediaDir}/document";`,
      ],
      componentName: "LayerStackExample",
      component: `export function LayerStackExample() {
  const [selected, setSelected] = useState<string | null>("caption");
  const [selection, setSelection] = useState<string[]>(["caption"]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [locked, setLocked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  const document = layerStackDocument.createDocument({
    id: "layer-demo",
    artboard: { preset: "1:1", background: "#f1f5f9" },
    fonts: {
      sans: {
        id: "sans",
        family: "Inter",
        weight: 400,
        style: "normal",
        fallback: ["system-ui"],
        availability: "system",
      },
    },
    assets: {
      tile: {
        id: "tile",
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mediaType: "image/png",
        width: 1,
        height: 1,
        alt: "Tile",
      },
    },
    layers: [
      {
        id: "background",
        name: "Background",
        kind: "shape",
        transform: { x: 0, y: 0, width: 600, height: 600 },
        z: 0,
        visible: true,
        locked: true,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Background",
        shape: { kind: "rect", fill: "#e2e8f0" },
      },
      {
        id: "frame-group",
        name: "Media group",
        kind: "group",
        transform: { x: 40, y: 40, width: 400, height: 320 },
        z: 1,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: true,
        summary: "Media group",
      },
      {
        id: "photo",
        name: "Photo",
        kind: "media",
        parentId: "frame-group",
        transform: { x: 0, y: 0, width: 400, height: 320 },
        z: 0,
        visible: true,
        locked: false,
        opacity: 0.9,
        blend: "multiply",
        clip: false,
        summary: "Photo",
        media: {
          assetId: "tile",
          fit: "cover",
          focalPoint: { x: 0.5, y: 0.5 },
          mask: { kind: "none" },
          alt: "Tile",
        },
      },
      {
        id: "caption",
        name: "Caption",
        kind: "text",
        parentId: "frame-group",
        transform: { x: 16, y: 240, width: 368, height: 64 },
        z: 1,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Caption",
        text: {
          spans: [{ text: "A grouped caption" }],
          fontId: "sans",
          size: 20,
          lineHeight: 1.25,
          letterSpacing: 0,
          align: "start",
          direction: "ltr",
          fit: "wrap",
          as: "p",
        },
      },
    ],
  });

  const layers: layerStackDocument.Layer[] = document.layers;

  return (
    <div style={{ width: 600, height: 600, position: "relative" }}>
      <LayerStack
        layers={layers}
        fonts={document.fonts}
        assets={document.assets}
        selectedIds={selection}
        multiSelect
        onSelect={setSelected}
        onSelectionChange={setSelection}
        clipGroups
      />
      <LayerList
        layers={layers}
        selectedIds={selection}
        onSelect={setSelected}
        onVisibilityChange={(id, visible) =>
          setHidden((current) =>
            visible ? current.filter((entry) => entry !== id) : [...current, id]
          )
        }
        onLockChange={(id, isLocked) =>
          setLocked((current) =>
            isLocked ? [...current, id] : current.filter((entry) => entry !== id)
          )
        }
        onReorder={(id, direction) => setOrder((current) => [...current, id + ":" + direction])}
        aria-label="Layers"
      />
      <span data-testid="layer-stack-selected">{selected ?? "none"}</span>
      <span data-testid="layer-stack-hidden">{String(hidden.length)}</span>
      <span data-testid="layer-stack-locked">{String(locked.length)}</span>
      <span data-testid="layer-stack-order">{order.join(",")}</span>
    </div>
  );
}`,
    };
  },
  "alignment-guides": (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { ALIGNMENT_GUIDES_EXPORTABLE, AlignmentGuides, useAlignmentGuides } from "${specifier}";`,
        `import { Artboard as GuidesArtboard } from "${mediaDir}/artboard";`,
        `import { LayerStack as GuidesLayerStack } from "${mediaDir}/layer-stack";`,
        `import * as guidesDocument from "${mediaDir}/document";`,
      ],
      componentName: "AlignmentGuidesExample",
      component: `export function AlignmentGuidesExample() {
  const [selected, setSelected] = useState<string | null>("headline");

  const document = guidesDocument.createDocument({
    id: "guides-demo",
    artboard: { preset: "16:9", background: "#ffffff" },
    fonts: {
      sans: {
        id: "sans",
        family: "Inter",
        weight: 400,
        style: "normal",
        fallback: ["system-ui"],
        availability: "system",
      },
    },
    guides: [
      { id: "guide-x", axis: "x", position: 426 },
      { id: "guide-y", axis: "y", position: 240 },
    ],
    grid: { visible: true, size: 60, subdivisions: 4 },
    layers: [
      {
        id: "headline",
        name: "Headline",
        kind: "text",
        transform: { x: 64, y: 64, width: 600, height: 120 },
        z: 0,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Headline",
        text: {
          spans: [{ text: "Align to the grid" }],
          fontId: "sans",
          size: 56,
          lineHeight: 1.2,
          letterSpacing: 0,
          align: "start",
          direction: "ltr",
          fit: "wrap",
          as: "h1",
        },
      },
    ],
  });

  const { targets, snap } = useAlignmentGuides(document.layers, {
    threshold: 8,
    includeGrid: true,
    gridSize: 60,
    includeCenters: true,
  });

  const snapResult = snap({ x: 58, y: 70, width: 600, height: 120 });
  const diagnostics = guidesDocument.validateDocument(document);

  return (
    <GuidesArtboard
      artboard={document.artboard}
      selectedIds={selected ? [selected] : []}
      onSelect={setSelected}
      guides={document.guides}
      grid={document.grid}
      diagnostics={diagnostics}
    >
      <GuidesLayerStack
        layers={document.layers}
        fonts={document.fonts}
        assets={document.assets}
        selectedIds={selected ? [selected] : []}
        onSelect={setSelected}
      />
      <AlignmentGuides
        visible
        showGuides
        showGrid
        showSafeRegion
        showCenterAxes
        showMeasurements
        measurements={[
          { id: "headline-box", rect: { x: 64, y: 64, width: 600, height: 120 }, label: "Headline" },
        ]}
        activeSnaps={snapResult.hits}
        minimumScale={0}
      />
      <span data-testid="guides-exportable">{String(ALIGNMENT_GUIDES_EXPORTABLE)}</span>
      <span data-testid="guides-targets">{String(targets.length)}</span>
      <span data-testid="guides-snaps">{String(snapResult.hits.length)}</span>
    </GuidesArtboard>
  );
}`,
    };
  },
  "export-preview": (specifier) => {
    const mediaDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { ExportPreview, useExportPreview } from "${specifier}";`,
        `import * as exportPreviewDocument from "${mediaDir}/document";`,
      ],
      componentName: "ExportPreviewExample",
      component: `export function ExportPreviewExample() {
  const [profile, setProfile] = useState<exportPreviewDocument.ExportProfile>("still-svg");

  const document = exportPreviewDocument.createDocument({
    id: "export-demo",
    artboard: {
      preset: "16:9",
      background: "#ffffff",
      bleed: 0.02,
      crop: { top: 8, right: 8, bottom: 8, left: 8 },
    },
    fonts: {
      sans: {
        id: "sans",
        family: "Inter",
        weight: 400,
        style: "normal",
        fallback: ["system-ui"],
        availability: "system",
      },
    },
    assets: {
      swatch: {
        id: "swatch",
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mediaType: "image/png",
        width: 1,
        height: 1,
        alt: "A single opaque pixel",
      },
    },
    guides: [{ id: "centre", axis: "x", position: 640 }],
    grid: { visible: true, size: 60, subdivisions: 4 },
    metadata: { title: "Export demo", authoringTool: "fixture", locale: "en" },
    layers: [
      {
        id: "headline",
        name: "Headline",
        kind: "text",
        transform: { x: 64, y: 64, width: 720, height: 160 },
        z: 0,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Headline",
        text: {
          spans: [{ text: "Check before you ship" }],
          fontId: "sans",
          size: 72,
          lineHeight: 1.2,
          letterSpacing: 0,
          align: "start",
          direction: "ltr",
          fit: "wrap",
          as: "h1",
        },
      },
      {
        id: "cover",
        name: "Cover",
        kind: "media",
        transform: { x: 64, y: 320, width: 480, height: 270 },
        z: 1,
        visible: true,
        locked: false,
        opacity: 1,
        blend: "normal",
        clip: false,
        summary: "Cover image",
        media: {
          assetId: "swatch",
          fit: "cover",
          focalPoint: { x: 0.5, y: 0.5 },
          mask: { kind: "rounded", radius: 12 },
          alt: "A single opaque pixel",
        },
      },
    ],
  });

  const preview = useExportPreview(document, {
    outputSize: { width: 640, height: 360 },
    availableFontFamilies: ["Inter"],
    scale: 0.5,
    resolveAssetHref: (assetId, uri) => (assetId === "swatch" ? uri : null),
  });

  const { svg, diagnostics, canExport } = preview;

  return (
    <div>
      <span data-testid="export-preview-profile">{profile}</span>
      <span data-testid="export-preview-svg">{svg.slice(0, 24)}</span>
      <span data-testid="export-preview-diagnostics">
        {diagnostics.map((entry) => entry.code).join(",")}
      </span>
      <span data-testid="export-preview-can-export">{String(canExport)}</span>
      <span data-testid="export-preview-size">{preview.size.width + "x" + preview.size.height}</span>
      <ExportPreview
        document={document}
        scale={0.5}
        outputSize={{ width: 640, height: 360 }}
        showBleed
        showCrop
        showSafeRegion
        inspectionSizes={[320, 160]}
        availableFontFamilies={["Inter"]}
        resolveAssetHref={(assetId, uri) => (assetId === "swatch" ? uri : null)}
        fontCss="@font-face { font-family: Inter; }"
        onExport={(payload) => {
          setProfile(payload.profile);
        }}
        scopedPreviewHeadings
      />
    </div>
  );
}`,
    };
  },
};

function buildConsumerSource(sections) {
  const importLines = [
    'import { useRef, useState } from "react";',
    ...sections.flatMap((section) => section.imports),
  ];
  const bodies = sections.map((section) => section.component).join("\n\n");
  const rendered = sections.map((section) => `      <${section.componentName} />`).join("\n");
  return `${importLines.join("\n")}\n\n${bodies}\n\nexport function FixtureApp() {\n  return (\n    <main>\n${rendered}\n    </main>\n  );\n}\n`;
}

let fixtureDir = null;

try {
  const manifest = loadManifest();
  const { errors, warnings } = validateManifest(manifest);
  for (const warning of warnings) console.warn(`registry:fixture warning — ${warning}`);
  if (errors.length) {
    console.error(`registry:fixture FAILED — manifest invalid:\n  - ${errors.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    const allItems = manifest.items;
    const items = itemName ? allItems.filter((item) => item.name === itemName) : allItems;
    if (itemName && items.length === 0) {
      const available = allItems.map((item) => item.name).join(", ");
      throw new Error(`unknown item "${itemName}" (available: ${available})`);
    }
    // Copy the requested items plus every sibling they depend on, transitively.
    const staged = resolveRegistryDependencies(
      manifest,
      items.map((item) => item.name)
    );

    const versions = resolvedVersions();
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "kumiki-fixture-"));
    const srcDir = path.join(fixtureDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    // Fixture manifests: dependency union + React, pinned to resolved versions.
    const dependencyNames = new Set(["react", "react-dom"]);
    for (const item of staged) {
      for (const dep of item.dependencies ?? []) dependencyNames.add(dep);
    }
    const dependencies = {};
    for (const name of [...dependencyNames].sort()) dependencies[name] = pin(versions, name);
    const devDependencies = {};
    for (const name of ["@types/react", "@types/react-dom", "typescript"]) {
      devDependencies[name] = pin(versions, name);
    }
    fs.writeFileSync(
      path.join(fixtureDir, "package.json"),
      `${JSON.stringify(
        {
          name: "kumiki-fixture",
          version: "0.0.0",
          private: true,
          type: "module",
          dependencies,
          devDependencies,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(fixtureDir, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            types: [],
          },
          include: ["src", "components"],
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    // Copy every requested item and its transitive siblings to their declared
    // targets and verify each file is self-contained.
    let fileCount = 0;
    for (const item of staged) {
      for (const file of itemFiles(item)) {
        if (!fs.existsSync(file.absolute)) {
          throw new Error(`item "${item.name}" references missing file "${file.path}"`);
        }
        const contents = fs.readFileSync(file.absolute, "utf8");
        if (!contents.trim()) throw new Error(`item "${item.name}" file "${file.path}" is empty`);
        if (/\.\.\/src|@\/lib/.test(contents)) {
          throw new Error(`item "${item.name}" file "${file.path}" references the private workspace`);
        }
        const destination = safeTarget(fixtureDir, file.target);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, contents, "utf8");
        fileCount += 1;
      }
    }

    // Consumer usage sections are generated only for explicitly requested items
    // (sibling dependencies are staged as sources, not exercised directly).
    const sections = [];
    for (const item of items) {
      const template = USAGE[item.name];
      if (template) {
        sections.push(template(importSpecifier(fixtureDir, item.files[0].target)));
      } else {
        console.warn(`registry:fixture warning — no consumer usage template for item "${item.name}"`);
      }
    }

    fs.writeFileSync(path.join(srcDir, "app.tsx"), buildConsumerSource(sections), "utf8");

    run("npm", ["install", "--no-audit", "--no-fund", "--progress=false"], fixtureDir, INSTALL_TIMEOUT_MS);
    run("npx", ["--no-install", "tsc", "--noEmit"], fixtureDir, TSC_TIMEOUT_MS);

    // Registry sources plus the generated consumer file are what tsc compiled.
    const compiledFiles = fileCount + 1;
    const location = keep ? `at ${fixtureDir}` : "in a temporary fixture (removed)";
    console.log(
      `registry:fixture OK — ${staged.length} item(s), ${compiledFiles} file(s) compiled ${location}`
    );
  }
} catch (error) {
  console.error(`registry:fixture FAILED — ${error.message}`);
  process.exitCode = 1;
} finally {
  if (fixtureDir) {
    if (keep) {
      console.log(`registry:fixture kept fixture at ${fixtureDir}`);
    } else {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  }
}
