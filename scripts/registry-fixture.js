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
