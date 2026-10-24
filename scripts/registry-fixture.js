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
  "process-journey": (specifier) => ({
    imports: [`import { createProcessJourney, evaluateProcessJourney } from "${specifier}";`],
    componentName: "ProcessJourneyExample",
    component: `const processJourneyPlan = createProcessJourney({
  id: "simple-journey", subjectId: "object", fps: { num: 30, den: 1 },
  durationFrames: 60,
  graph: { direction: "horizontal",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    edges: [{ id: "a-b", from: "a", to: "b" }] },
  layouts: [{ frame: 0, bounds: {
    a: { x: 10, y: 80, width: 80, height: 60 },
    b: { x: 240, y: 80, width: 80, height: 60 },
  } }],
  route: [{ edgeId: "a-b", startFrame: 4, endFrame: 48 }],
});
export function ProcessJourneyExample() {
  const frame = evaluateProcessJourney(processJourneyPlan, 25);
  return <svg role="img" aria-label="Visual journey" viewBox="0 0 360 200">
    <circle cx={frame.position.x} cy={frame.position.y} r={8}/>
  </svg>;
}`,
  }),
  "explainer-stage": (specifier) => ({
    imports: [`import { ExplainerStage, ExplainerVisual, ExplainerText } from "${specifier}";`],
    componentName: "ExplainerStageExample",
    component: `export function ExplainerStageExample() {
  return <ExplainerStage aspect="auto" subjects={[{ id: "primary", region: { x: .1, y: .1, width: .4, height: .6 } }]} protect={["primary"]}>
    <ExplainerVisual>{({ subjects }) => <div data-subject={subjects[0].id} />}</ExplainerVisual>
    <ExplainerText maxLines={4}>An essential measured explanation.</ExplainerText>
  </ExplainerStage>;
}`,
  }),
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
  "search-field": (specifier) => ({
    imports: [`import { SearchField } from "${specifier}";`],
    componentName: "SearchFieldExample",
    component: `export function SearchFieldExample() {
  const [query, setQuery] = useState("roof insulation");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <SearchField
      ref={ref}
      label="Search references"
      query={query}
      onQueryChange={setQuery}
      onSearch={(next) => ref.current?.setAttribute("data-searched", next)}
      showSubmit
      submitLabel="Find"
      hint="Search by topic"
      filterAction={<button type="button">Filters</button>}
    />
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
  // --- Infographic (docs/12) items -------------------------------------
  // The data path ships as individual modules (no barrel), so the examples
  // derive sibling specifiers from the requested item's own directory the way
  // the media items do. Names are aliased where the two sections would
  // otherwise declare the same import in the single generated consumer module.
  "infographic-system": (specifier) => {
    const infographicDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { buildInfographicPages, chooseTemplate } from "${infographicDir}/layout";`,
        `import { validateSource } from "${infographicDir}/validate";`,
        `import { layoutToSvg } from "${infographicDir}/svg";`,
        `import type { InfographicSource } from "${infographicDir}/types";`,
      ],
      componentName: "InfographicSystemExample",
      component: `export function InfographicSystemExample() {
  const source: InfographicSource = {
    kind: "infographic-source",
    version: 1,
    id: "system-example",
    title: "Infographic system example",
    subtitle: "Data path first, DOM second",
    thesis: "One validated source becomes a renderer-neutral layout that any backend can draw.",
    language: "en",
    evidence: [{ id: "ev-note", label: "Illustrative fixture, not measured production data." }],
    sections: [
      {
        id: "intro",
        kind: "text",
        heading: "The question",
        importance: "hero",
        evidenceRefs: ["ev-note"],
        summary: "The source captures meaning; the engine decides composition.",
        paragraphs: [
          "The semantic source records facts, order, units and intended emphasis; it never stores pixel positions.",
        ],
      },
      {
        id: "pipeline",
        kind: "process",
        heading: "Pipeline",
        evidenceRefs: ["ev-note"],
        summary: "Validate, resolve tokens, plan a template, render, then annotate.",
        steps: [
          { id: "validate", title: "Validate", description: "Structural findings, never a crash." },
          { id: "plan", title: "Plan", description: "Score templates and allocate frames." },
          { id: "render", title: "Render", description: "Emit IR primitives for preview and export." },
        ],
      },
      {
        id: "capacity",
        kind: "statistic",
        heading: "Sections per page",
        evidenceRefs: ["ev-note"],
        summary: "The editorial overview keeps up to six sections on one page.",
        value: 6,
        unit: "sections",
        measureLabel: "maximum before pagination",
      },
    ],
  };

  const validation = validateSource(source);
  const template = chooseTemplate(source).template;
  const pages = buildInfographicPages(source, {
    artDirection: "minimal-technical",
    profile: "youtube-landscape",
  });
  const svg = layoutToSvg(pages[0]).svg;

  // Dense, categorized facts: authored as the "visual-cheat-sheet" family below.
  const cheatSheetSource: InfographicSource = {
    kind: "infographic-source",
    version: 1,
    id: "cheat-sheet-example",
    title: "Cheat sheet example",
    language: "en",
    evidence: [{ id: "ev-cheat-sheet", label: "Illustrative facts, not measured data." }],
    sections: [
      {
        id: "cs-group-one",
        kind: "text",
        heading: "Group one",
        evidenceRefs: ["ev-cheat-sheet"],
        summary: "Dense scan-ready facts in the first category.",
        paragraphs: ["A short definitional paragraph that a reader scans rather than reads."],
      },
      {
        id: "cs-group-two",
        kind: "comparison",
        heading: "Group two",
        evidenceRefs: ["ev-cheat-sheet"],
        summary: "Categorized options compared across shared criteria.",
        criteria: ["Cost", "Speed"],
        cases: [
          { id: "cs-option-a", label: "Option A", values: { Cost: "low", Speed: "fast" } },
          { id: "cs-option-b", label: "Option B", values: { Cost: "high", Speed: "slow" } },
        ],
      },
      {
        id: "cs-group-three",
        kind: "statistic",
        heading: "Group three",
        evidenceRefs: ["ev-cheat-sheet"],
        summary: "A single figure a reader can pick out at a glance.",
        value: 42,
        unit: "%",
        measureLabel: "share of lookups",
      },
      {
        id: "cs-group-four",
        kind: "text",
        heading: "Group four",
        evidenceRefs: ["ev-cheat-sheet"],
        summary: "Another dense category of facts.",
        paragraphs: ["Enough copy to require a real scanning hierarchy instead of one hero claim."],
      },
    ],
  };

  // Components with dependencies and grouping: authored as the
  // "layered-architecture" family below.
  const layeredSource: InfographicSource = {
    kind: "infographic-source",
    version: 1,
    id: "layered-example",
    title: "Layered architecture example",
    language: "en",
    evidence: [{ id: "ev-layered", label: "Illustrative components, not a real system." }],
    sections: [
      {
        id: "la-stack",
        kind: "hierarchy",
        heading: "Components",
        evidenceRefs: ["ev-layered"],
        summary: "Components grouped into layers.",
        root: {
          id: "la-root",
          label: "Application",
          children: [
            { id: "la-ui", label: "UI layer", children: [{ id: "la-view", label: "View" }] },
            { id: "la-core", label: "Core layer", children: [{ id: "la-domain", label: "Domain" }] },
          ],
        },
      },
      {
        id: "la-deps",
        kind: "diagram",
        heading: "Dependencies",
        evidenceRefs: ["ev-layered"],
        summary: "The allowed dependencies between layers.",
        diagram: {
          direction: "vertical",
          nodes: [
            { id: "la-node-ui", label: "UI" },
            { id: "la-node-core", label: "Core" },
            { id: "la-node-data", label: "Data" },
          ],
          edges: [
            { id: "la-edge-1", from: "la-node-ui", to: "la-node-core" },
            { id: "la-edge-2", from: "la-node-core", to: "la-node-data" },
          ],
        },
      },
    ],
  };

  // Author these two P1 families explicitly so the check exercises their builders
  // and slot allocation deterministically (authoring bypasses the scorer). The
  // built layout echoes back the template it used, so the value is provable
  // rather than merely declared.
  const cheatSheetTemplate = buildInfographicPages(cheatSheetSource, {
    template: "visual-cheat-sheet",
  })[0].template;
  const layeredTemplate = buildInfographicPages(layeredSource, {
    template: "layered-architecture",
  })[0].template;

  return (
    <div>
      <span data-testid="infographic-system-ok">{String(validation.ok)}</span>
      <span data-testid="infographic-system-diagnostics">
        {validation.diagnostics.map((entry) => entry.code).join(",")}
      </span>
      <span data-testid="infographic-system-template">{template}</span>
      <span data-testid="infographic-system-pages">{String(pages.length)}</span>
      <span data-testid="infographic-system-svg">{svg.slice(0, 24)}</span>
      <span data-testid="infographic-system-cheat-sheet">{cheatSheetTemplate}</span>
      <span data-testid="infographic-system-layered">{layeredTemplate}</span>
    </div>
  );
}`,
    };
  },
  "infographic-view": (specifier) => {
    const infographicDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { InfographicView } from "${specifier}";`,
        `import { buildInfographicPages as buildViewPages } from "${infographicDir}/layout";`,
        `import type { InfographicSource as InfographicViewSource } from "${infographicDir}/types";`,
      ],
      componentName: "InfographicViewExample",
      component: `export function InfographicViewExample() {
  const [fit, setFit] = useState<"none" | "contain" | "width">("contain");
  const [zoom, setZoom] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  const source: InfographicViewSource = {
    kind: "infographic-source",
    version: 1,
    id: "view-example",
    title: "Infographic preview",
    language: "en",
    evidence: [{ id: "ev-view", label: "Illustrative fixture, not measured production data." }],
    sections: [
      {
        id: "view-text",
        kind: "text",
        heading: "Rendered, not re-solved",
        evidenceRefs: ["ev-view"],
        summary: "The preview draws an already-resolved layout and owns no layout logic.",
        paragraphs: [
          "InfographicView takes an InfographicLayout, so authors can inspect exactly what the engine laid out.",
        ],
      },
      {
        id: "view-metric",
        kind: "statistic",
        heading: "Primitive kinds",
        evidenceRefs: ["ev-view"],
        summary: "The preview renders five primitive kinds plus text.",
        value: 6,
        unit: "kinds",
        measureLabel: "rect, ellipse, line, polyline, path, text",
      },
    ],
  };

  const layout = buildViewPages(source, { template: "editorial-overview" })[0];

  return (
    <div>
      <InfographicView
        ref={ref}
        layout={layout}
        fit={fit}
        zoom={zoom}
        accessible
        includeBackground
        className="rounded-lg"
        onClick={() => ref.current?.focus()}
      />
      <InfographicView layout={layout} fit="none" zoom={2} accessible={false} includeBackground={false} />
      <button
        type="button"
        onClick={() => {
          setFit("none");
          setZoom((value) => value + 0.5);
        }}
      >
        Zoom
      </button>
    </div>
  );
}`,
    };
  },
  // --- Motion (docs/08, docs/06 M1-A) items ----------------------------
  // Like the infographic data path, the motion primitives ship as individual
  // modules with no barrel, so each example derives sibling specifiers from the
  // requested item's own directory. Identifiers are aliased wherever two
  // sections would otherwise declare the same binding in the single generated
  // consumer module (`src/app.tsx` concatenates every section).
  "motion-track": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { evaluateTimeline } from "${motionDir}/timeline";`,
        `import { parseTimeline, serializeTimeline } from "${motionDir}/serialize";`,
        `import { validateTimeline } from "${motionDir}/validate";`,
        `import type { MotionTimeline } from "${motionDir}/types";`,
      ],
      componentName: "MotionTrackExample",
      component: `export function MotionTrackExample() {
  const timeline: MotionTimeline = {
    schemaVersion: 1,
    id: "track-example",
    fps: { num: 30, den: 1 },
    durationFrames: 30,
    cues: [{ id: "mid", frame: 15 }],
    nodes: [
      {
        kind: "track",
        id: "track-opacity",
        track: {
          id: "track-opacity",
          targetId: "box",
          property: "opacity",
          valueType: "opacity",
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 15, value: 1, easing: "ease-out-cubic" },
            { frame: 30, value: 1 },
          ],
        },
      },
      {
        kind: "track",
        id: "track-position",
        offset: { cue: "mid" },
        track: {
          id: "track-position",
          targetId: "box",
          property: "position",
          valueType: "vec2",
          keyframes: [
            { frame: 0, value: { x: 0, y: 0 } },
            { frame: 10, value: { x: 40, y: 20 }, easing: "ease-in-out" },
          ],
        },
      },
    ],
  };

  const diagnostics = validateTimeline(timeline);
  const atStart = evaluateTimeline(timeline, 0);
  const atMid = evaluateTimeline(timeline, 15);
  const parsed = parseTimeline(serializeTimeline(timeline));

  return (
    <div>
      <span data-testid="motion-track-diagnostics">{String(diagnostics.length)}</span>
      <span data-testid="motion-track-start">{String(atStart.samples["box.opacity"]?.value ?? "none")}</span>
      <span data-testid="motion-track-mid">{String(atMid.samples["box.opacity"]?.value ?? "none")}</span>
      <span data-testid="motion-track-roundtrip">{parsed.timeline?.id ?? "none"}</span>
    </div>
  );
}`,
    };
  },
  "motion-path": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { createMotionPath, pathToSvgD, pointOnPath } from "${motionDir}/paths";`,
        `import { pathLength, trimPath } from "${motionDir}/trim";`,
      ],
      componentName: "MotionPathExample",
      component: `export function MotionPathExample() {
  const path = createMotionPath({
    id: "path-example",
    kind: "cubic",
    anchors: [
      { x: 0, y: 0, out: { x: 20, y: 0 } },
      { x: 100, y: 60, in: { x: 60, y: 60 } },
    ],
  });
  const start = pointOnPath(path, 0);
  const end = pointOnPath(path, 1);
  const length = pathLength(path);
  const trimmed = trimPath(path, { start: 0, end: 0.5 });
  const d = pathToSvgD(path);

  return (
    <div>
      <span data-testid="motion-path-start">{start.x.toFixed(1) + "," + start.y.toFixed(1)}</span>
      <span data-testid="motion-path-end">{end.x.toFixed(1) + "," + end.y.toFixed(1)}</span>
      <span data-testid="motion-path-length">{length.toFixed(1)}</span>
      <span data-testid="motion-path-trim">{trimmed.svg.slice(0, 24)}</span>
      <span data-testid="motion-path-d">{d.slice(0, 24)}</span>
    </div>
  );
}`,
    };
  },
  "mask-reveal": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { evaluateMask, maskCapability, resolveMaskOrder } from "${motionDir}/masks";`,
        `import type { MaskSpecLocal } from "${motionDir}/masks";`,
      ],
      componentName: "MaskRevealExample",
      component: `export function MaskRevealExample() {
  const spec: MaskSpecLocal = {
    id: "mask-example",
    kind: "alpha",
    rect: { x: 0, y: 0, width: 100, height: 80 },
    feather: 4,
    order: 0,
    axis: "left-to-right",
  };
  const sample = evaluateMask(spec, 0.5);
  const ordered = resolveMaskOrder([sample]);
  const capability = maskCapability(spec);

  return (
    <div>
      <span data-testid="mask-reveal-kind">{sample.kind}</span>
      <span data-testid="mask-reveal-opacity">{sample.opacity.toFixed(2)}</span>
      <span data-testid="mask-reveal-width">{sample.rect.width.toFixed(1)}</span>
      <span data-testid="mask-reveal-order">{String(ordered.length)}</span>
      <span data-testid="mask-reveal-capability">{capability.capability + "->" + capability.fallback}</span>
    </div>
  );
}`,
    };
  },
  "shape-morph": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { morphShapes, validateMorph } from "${motionDir}/morph";`,
        `import type { ContourShape } from "${motionDir}/morph";`,
      ],
      componentName: "ShapeMorphExample",
      component: `export function ShapeMorphExample() {
  const from: ContourShape = {
    contours: [
      { closed: true, points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }] },
    ],
  };
  const to: ContourShape = {
    contours: [
      { closed: true, points: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }, { x: 0, y: 60 }] },
    ],
  };
  const diagnostics = validateMorph(from, to);
  const result = morphShapes(from, to, 0.5);

  return (
    <div>
      <span data-testid="shape-morph-diagnostics">{String(diagnostics.length)}</span>
      <span data-testid="shape-morph-mode">{result.mode}</span>
      <span data-testid="shape-morph-contours">{String(result.contours.length)}</span>
    </div>
  );
}`,
    };
  },
  "shared-element": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { createSharedElement, evaluateSharedElement, validateSharedElement } from "${motionDir}/shared-element";`,
      ],
      componentName: "SharedElementExample",
      component: `export function SharedElementExample() {
  const spec = createSharedElement({
    semanticId: "card",
    from: {
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      opacity: 1,
      range: { startFrame: 0, endFrame: 30 },
    },
    to: {
      transform: { a: 1, b: 0, c: 0, d: 1, e: 200, f: 100 },
      opacity: 0.5,
      range: { startFrame: 0, endFrame: 30 },
    },
    handoff: { startFrame: 10, endFrame: 20 },
  });
  const diagnostics = validateSharedElement(spec);
  const before = evaluateSharedElement(spec, 0);
  const during = evaluateSharedElement(spec, 15);
  const after = evaluateSharedElement(spec, 25);

  return (
    <div>
      <span data-testid="shared-element-diagnostics">{String(diagnostics.length)}</span>
      <span data-testid="shared-element-before">{before.phase + ":" + before.owner}</span>
      <span data-testid="shared-element-during">{during.phase + ":" + during.owner + ":" + during.transform.e.toFixed(1)}</span>
      <span data-testid="shared-element-after">{after.phase + ":" + after.owner}</span>
    </div>
  );
}`,
    };
  },
  "motion-preset": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { getPreset, listPresets, materializePreset } from "${motionDir}/presets";`,
        `import type { PresetInstance } from "${motionDir}/presets";`,
      ],
      componentName: "MotionPresetExample",
      component: `export function MotionPresetExample() {
  const instance: PresetInstance = {
    preset: "rise-reveal",
    targetId: "hero",
    startFrame: 0,
    timing: 12,
    intensity: 1,
    params: { distance: 32 },
  };
  const materialized = materializePreset(instance);
  const names = listPresets().map((preset) => preset.name);
  const fade = getPreset("fade-reveal");

  return (
    <div>
      <span data-testid="motion-preset-nodes">{String(materialized.nodes.length)}</span>
      <span data-testid="motion-preset-diagnostics">{String(materialized.diagnostics.length)}</span>
      <span data-testid="motion-preset-count">{String(names.length)}</span>
      <span data-testid="motion-preset-fade">{fade ? fade.role : "none"}</span>
    </div>
  );
}`,
    };
  },
  "animated-text": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { buildKineticTextTimeline } from "${motionDir}/kinetic-text";`,
        `import type { KineticTextSpec } from "${motionDir}/kinetic-text";`,
      ],
      componentName: "AnimatedTextExample",
      component: `export function AnimatedTextExample() {
  const spec: KineticTextSpec = {
    id: "title",
    text: "Hello motion",
    granularity: "word",
    preset: "rise-reveal",
    startFrame: 0,
    durationFrames: 60,
    stagger: 2,
  };
  const built = buildKineticTextTimeline(spec);

  return (
    <div>
      <span data-testid="animated-text-tokens">{String(built.tokens.length)}</span>
      <span data-testid="animated-text-glyphs">{String(built.glyphIds.length)}</span>
      <span data-testid="animated-text-duration">{String(built.timeline.durationFrames)}</span>
      <span data-testid="animated-text-diagnostics">{String(built.diagnostics.length)}</span>
    </div>
  );
}`,
    };
  },
  "scene-storyboard": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { createStoryboard, shotAt, toStoryboardClips, validateStoryboard } from "${motionDir}/storyboard";`,
        `import type { StoryboardShot } from "${motionDir}/storyboard";`,
      ],
      componentName: "SceneStoryboardExample",
      component: `export function SceneStoryboardExample() {
  const shots: StoryboardShot[] = [
    {
      id: "shot-1",
      sceneRef: "scene-intro",
      startFrame: 0,
      durationFrames: 30,
      claim: "The problem is stated plainly.",
      visualObjective: "Make the shared constraint visible.",
      focusTarget: "intro-figure",
      onScreenLabels: ["Problem"],
      staticFallback: "A labelled still of the shared constraint.",
    },
    {
      id: "shot-2",
      sceneRef: "scene-method",
      startFrame: 30,
      durationFrames: 30,
      claim: "The method resolves the constraint.",
      visualObjective: "Show the method closing the gap.",
      focusTarget: "method-diagram",
      onScreenLabels: ["Method"],
      staticFallback: "A labelled still of the method diagram.",
    },
  ];
  const board = createStoryboard({ id: "board-example", title: "Storyboard example", shots });
  const diagnostics = validateStoryboard(board);
  const clips = toStoryboardClips(board);
  const first = shotAt(board, 0);

  return (
    <div>
      <span data-testid="scene-storyboard-diagnostics">{String(diagnostics.length)}</span>
      <span data-testid="scene-storyboard-duration">{String(board.durationFrames)}</span>
      <span data-testid="scene-storyboard-clips">{String(clips.length)}</span>
      <span data-testid="scene-storyboard-first">{first ? first.id : "none"}</span>
    </div>
  );
}`,
    };
  },
  "motion-director": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import * as DirectorCompiler from "${specifier}";`,
        `import { AnimationGroup as DirectorAnimationGroup, MotionRecipe as DirectorRecipe, ScenePreset as DirectorPreset, EffectSequence as DirectorEffects, CinematicShot as DirectorShot } from "${motionDir}/director-authoring";`,
        `import { cinematicRevealRecipe as directorReveal } from "${motionDir}/director-recipes";`,
      ],
      componentName: "DirectorCompilerExample",
      component: `export function DirectorCompilerExample() {
  const recipe = DirectorRecipe<{ target: string }>({ id: "example", version: 1, build: ({ target }) => directorReveal.create({ id: "reveal", targets: [target], durationFrames: 30 }) });
  const direction: DirectorCompiler.MotionDirection = { schemaVersion: 1, id: "consumer-director", title: "Consumer choreography", fps: { num: 30, den: 1 }, durationFrames: 90, targets: ["subject"], children: [DirectorAnimationGroup({ id: "group", mode: "parallel", children: [recipe.create({ target: "subject" })] })] };
  const preset = DirectorPreset({ id: "consumer", variants: { wide: { width: 1280, height: 720, direction } } });
  const compilation = DirectorCompiler.compileMotionDirector(preset.create("wide").direction);
  const restored = DirectorCompiler.parseMotionDirection(DirectorCompiler.serializeMotionDirection(direction));
  const effects = DirectorEffects({ id: "effects", children: [{ kind: "hold", id: "read", durationFrames: 10 }] });
  const shot = DirectorShot({ id: "shot", durationFrames: 90, sceneRef: "scene", focusTarget: "subject", claim: "A subject appears", visualObjective: "Reveal the subject", onScreenLabels: ["Subject"], staticFallback: "Subject", children: [] });
  return <div data-director-valid={restored.ok} data-shot={shot.id} data-effects={effects.id}>{compilation.ok ? DirectorCompiler.evaluateMotionDirector(compilation.director, 15).evaluation.frame : "Invalid"}</div>;
}`,
    };
  },
  "camera-pose-3d": (specifier) => ({
    imports: [`import { compileCameraPoses as consumerPoses, evaluateCameraPose3D as consumerPose } from "${specifier}";`],
    componentName: "CameraPoseExample",
    component: `export function CameraPoseExample() {
  const pose = { position: [0, 0, 10] as const, orientation: [0, 0, 0, 1] as const, focus: [0, 0, 0] as const, projection: { kind: "perspective" as const, fov: 40 }, near: .1, far: 100, focusDistance: 10 };
  const timeline = consumerPoses({ id: "consumer-pose", fps: { num: 30, den: 1 }, poses: [pose, pose] });
  return <output>{consumerPose(timeline, 1).focusDistance}</output>;
}`,
  }),
  "cinematic-camera-director": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return { imports: [
      `import { compileCinematicCamera as consumerCamera, serializeCameraSequence as consumerSaveCamera, parseCameraSequence as consumerReadCamera, cameraSequenceGroup as consumerCameraGroup } from "${specifier}";`,
      `import { createCameraTargetRegistry as consumerTargets } from "${motionDir}/camera-targets";`,
      `import { CameraSequence as ConsumerSequence, CameraShotRecipe as ConsumerShot } from "${motionDir}/camera-shot-recipes";`,
      `import { CinematicCameraDirector as ConsumerCameraPreview } from "${motionDir}/cinematic-camera-react";`,
      `import { Scene as ConsumerScene } from "three";`,
    ], componentName: "CinematicCameraExample", component: `const consumerScene = () => ({ scene: new ConsumerScene(), dispose() {} });
export function CinematicCameraExample() {
  const targets = consumerTargets({ revision: "v1", targets: [{ id: "subject", frames: [{ frame: 0, bounds: { min: [-1,-1,-1], max: [1,1,1] } }] }] });
  const sequence = ConsumerSequence({ id: "consumer-camera", title: "A subject", fps: { num: 30, den: 1 }, durationFrames: 60, output: { width: 1280, height: 720 }, shots: [ConsumerShot("inspect", { id: "inspect", target: "subject", durationFrames: 60 })] });
  const restored = consumerReadCamera(consumerSaveCamera(sequence));
  const contract = { criticalSubjects: [{ id: "visible", targetIds: ["subject"], startFrame: 0, endFrame: 60 }] };
  const result = consumerCamera(sequence, targets, contract);
  if (!result.ok) return <p>{result.diagnostics[0].message}</p>;
  return <div data-restored={restored.ok} data-group={consumerCameraGroup(result.plan).id}><ConsumerCameraPreview plan={result.plan} contract={contract} targetRegistry={targets} frame={15} createScene={consumerScene} ariaLabel="A subject" /></div>;
}` };
  },
  "motion-director-react": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { MotionDirector as ConsumerMotionDirector, useDirectorCues as useConsumerDirectorCues } from "${specifier}";`,
        `import { compileMotionDirector as compileConsumerDirector } from "${motionDir}/motion-director";`,
      ],
      componentName: "DirectorReactExample",
      component: `function ConsumerNarration() {
  const cues = useConsumerDirectorCues("narration");
  return <span>{cues.map(cue => cue.payload.text).join(" ")}</span>;
}
export function DirectorReactExample() {
  const result = compileConsumerDirector({ schemaVersion: 1, id: "consumer", title: "Consumer scene", fps: { num: 30, den: 1 }, durationFrames: 60, targets: [], children: [{ kind: "cue", id: "voice", durationFrames: 45, payload: { kind: "narration", language: "en", text: "One scene" } }] });
  if (!result.ok) return <p>{result.diagnostics[0].message}</p>;
  return <ConsumerMotionDirector director={result.director} frame={20}>{({ evaluation }) => <div data-frame={evaluation.frame}><ConsumerNarration /></div>}</ConsumerMotionDirector>;
}`,
    };
  },
  "visual-transformation": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { compileVisualTransformation, evaluateVisualTransformation, createVisualTransformationProgram, retargetVisualTransformation } from "${specifier}";`,
        `import { VisualTransformation } from "${motionDir}/visual-transformation-react";`,
        `import { createSharedSceneTransformation } from "${motionDir}/transformation-recipes";`,
        `import type { VisualScene } from "${motionDir}/visual-transformation-types";`,
      ],
      componentName: "VisualTransformationExample",
      component: `export function VisualTransformationExample() {
  const from: VisualScene = { id: "a", elements: [{ id: "label", semanticId: "idea", content: { kind: "text", text: "One idea", bounds: { x: 20, y: 20, width: 220, height: 60 } } }] };
  const to: VisualScene = { id: "b", elements: [{ ...from.elements[0], transform: { a: 1, b: 0, c: 0, d: 1, e: 100, f: 0 } }] };
  const spec = createSharedSceneTransformation({ id: "handoff", fps: { num: 30, den: 1 }, durationFrames: 91, range: { startFrame: 0, endFrame: 90 }, from, to, shared: [{ from: "label", to: "label", semanticId: "idea" }] });
  const compiled = compileVisualTransformation(spec);
  const sample = evaluateVisualTransformation(compiled, 30);
  const retargeted = retargetVisualTransformation(createVisualTransformationProgram([spec]), { frame: 30, to: from, durationFrames: 30 });
  return <div data-sample-count={sample.layers.length}><VisualTransformation transformation={retargeted} frame={40} width={400} height={200} label="An idea changes position" /></div>;
}`,
    };
  },
  "motion-react": (specifier) => {
    const motionDir = specifier.replace(/\/[^/]+$/, "");
    return {
      imports: [
        `import { KineticText, MaskRevealView, MotionScrubber, MotionStage, ShapeMorphView, VectorDraw, useMotionSample } from "${specifier}";`,
        `import { GraphicComposition } from "${motionDir}/graphic-composition";`,
        `import { createMotionPath as createReactPath } from "${motionDir}/paths";`,
        `import type { ContourShape as ReactContourShape } from "${motionDir}/morph";`,
        `import type { MotionTimeline as ReactMotionTimeline } from "${motionDir}/types";`,
      ],
      componentName: "MotionReactExample",
      component: `function MotionReactReadout() {
  const sample = useMotionSample("hero", "opacity");
  return <span data-testid="motion-react-sample">{String(sample?.value ?? "none")}</span>;
}

export function MotionReactExample() {
  const [frame, setFrame] = useState(12);

  const timeline: ReactMotionTimeline = {
    schemaVersion: 1,
    id: "react-example",
    fps: { num: 30, den: 1 },
    durationFrames: 30,
    nodes: [
      {
        kind: "track",
        id: "hero-opacity",
        track: {
          id: "hero-opacity",
          targetId: "hero",
          property: "opacity",
          valueType: "opacity",
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 20, value: 1, easing: "ease-out-cubic" },
          ],
        },
      },
    ],
  };

  const path = createReactPath({
    id: "react-path",
    anchors: [
      { x: 0, y: 0 },
      { x: 80, y: 40 },
    ],
  });
  const from: ReactContourShape = {
    contours: [
      { closed: true, points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }] },
    ],
  };
  const to: ReactContourShape = {
    contours: [
      { closed: true, points: [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }, { x: 0, y: 60 }] },
    ],
  };

  return (
    <div>
      <MotionStage timeline={timeline} frame={frame} width={240} height={160} ariaLabel="Motion react example">
        <MotionReactReadout />
      </MotionStage>
      <KineticText
        spec={{ id: "react-title", text: "Motion", granularity: "word", startFrame: 0, durationFrames: 30 }}
        frame={frame}
      />
      <VectorDraw path={path} frame={frame} range={{ startFrame: 0, endFrame: 20 }} stroke="#000000" />
      <ShapeMorphView from={from} to={to} frame={frame} range={{ startFrame: 0, endFrame: 20 }} />
      <MaskRevealView
        spec={{ id: "react-mask", kind: "clip", rect: { x: 0, y: 0, width: 100, height: 80 } }}
        progress={0.5}
      >
        <span>Revealed</span>
      </MaskRevealView>
      <MotionScrubber timeline={timeline} frame={frame} onFrame={setFrame} />
      <GraphicComposition timeline={timeline} frame={frame} ariaLabel="Installed composition" />
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
