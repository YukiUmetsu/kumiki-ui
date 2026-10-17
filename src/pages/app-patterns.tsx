import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Field } from "../ui/field-input";
import { Select } from "../ui/select";
import type { SearchableResult } from "../ui/searchable-results";
import { SearchAndResults } from "../patterns/search-and-results";
import type { SearchFilter } from "../patterns/search-and-results";
import { SettingsSection } from "../patterns/settings-section";
import type { SettingsField } from "../patterns/settings-section";
import { ProcessMonitor } from "../patterns/process-monitor";
import type {
  ProcessMonitorStage,
  ProcessMonitorStageStatus,
  ProcessMonitorStatus,
} from "../patterns/process-monitor";
import { ResourceExplorer } from "../patterns/resource-explorer";
import type { ResourceItem, ResourceMoveDirection } from "../patterns/resource-explorer";
import { DataDetailsWorkspace } from "../patterns/data-details-workspace";
import type {
  DataDetailsColumn,
  DataDetailsRow,
  DataDetailsSort,
} from "../patterns/data-details-workspace";
import { GuidedForm } from "../patterns/guided-form";
import type { GuidedFormError, GuidedFormStep } from "../patterns/guided-form";

/* -------------------------------------------------------------------------- */
/* Shared page shell                                                          */
/* -------------------------------------------------------------------------- */

/** Section shell header: serif heading (weight 400) + muted description. */
function PatternSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section data-pattern-section={id} className="flex flex-col">
      <header className="mb-8 flex flex-col gap-1">
        <h2 className="font-serif text-heading font-normal tracking-heading text-foreground">
          {title}
        </h2>
        <p className="max-w-prose font-sans text-body text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Search + results                                                        */
/* -------------------------------------------------------------------------- */

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  status: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  { id: "item-01", title: "Item 01", subtitle: "Active document.", type: "document", status: "active" },
  { id: "item-02", title: "Item 02", subtitle: "Active document.", type: "document", status: "active" },
  { id: "item-03", title: "Item 03", subtitle: "Archived document.", type: "document", status: "archived" },
  { id: "item-04", title: "Note 01", subtitle: "Active note.", type: "note", status: "active" },
  { id: "item-05", title: "Note 02", subtitle: "Active note.", type: "note", status: "active" },
  { id: "item-06", title: "Note 03", subtitle: "Archived note.", type: "note", status: "archived" },
  { id: "item-07", title: "Folder 01", subtitle: "Collection.", type: "folder", status: "active" },
  { id: "item-08", title: "Folder 02", subtitle: "Collection.", type: "folder", status: "active" },
  { id: "item-09", title: "Item 04", subtitle: "Active document.", type: "document", status: "active" },
  { id: "item-10", title: "Item 05", subtitle: "Archived document.", type: "document", status: "archived" },
  { id: "item-11", title: "Note 04", subtitle: "Active note.", type: "note", status: "active" },
  { id: "item-12", title: "Folder 03", subtitle: "Collection.", type: "folder", status: "active" },
];

const SEARCH_FILTERS: SearchFilter[] = [
  {
    id: "type",
    label: "Type",
    type: "select",
    placeholder: "All",
    options: [
      { value: "document", label: "Document" },
      { value: "note", label: "Note" },
      { value: "folder", label: "Folder" },
    ],
  },
  {
    id: "status",
    label: "Status",
    type: "checkbox",
    options: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
  },
];

const SEARCH_PAGE_SIZE = 5;

function SearchPatternSection() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(SEARCH_PAGE_SIZE);
  }, [query, activeFilters]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SEARCH_ITEMS.filter((item) => {
      if (needle !== "" && !`${item.title} ${item.subtitle}`.toLowerCase().includes(needle)) {
        return false;
      }
      const types = activeFilters.type ?? [];
      if (types.length > 0 && !types.includes(item.type)) return false;
      const statuses = activeFilters.status ?? [];
      if (statuses.length > 0 && !statuses.includes(item.status)) return false;
      return true;
    });
  }, [query, activeFilters]);

  const results: SearchableResult[] = filtered.slice(0, visibleCount).map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
  }));
  const hasMore = filtered.length > results.length;

  return (
    <PatternSection
      id="search"
      title="Search and results"
      description="Find an item by typing a query and narrowing it with a single-choice and a multi-choice filter."
    >
      <SearchAndResults
        label="Search items"
        query={query}
        onQueryChange={setQuery}
        results={results}
        filters={SEARCH_FILTERS}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((count) => count + SEARCH_PAGE_SIZE)}
      />
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Settings section                                                        */
/* -------------------------------------------------------------------------- */

const SETTINGS_FIELDS: SettingsField[] = [
  { id: "displayName", label: "Display name", type: "text", placeholder: "Task runner" },
  {
    id: "language",
    label: "Language",
    type: "select",
    options: [
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
      { value: "fr", label: "Français" },
    ],
  },
  {
    id: "timezone",
    label: "Timezone",
    type: "select",
    options: [
      { value: "utc", label: "UTC" },
      { value: "gmt", label: "GMT" },
      { value: "jst", label: "JST" },
    ],
  },
  {
    id: "emailDigest",
    label: "Email digest",
    type: "switch",
    description: "Receive a summary of activity.",
  },
];

const INITIAL_SETTINGS: Record<string, unknown> = {
  displayName: "Task runner",
  language: "en",
  timezone: "utc",
  emailDigest: true,
};

function SettingsPatternSection() {
  const [values, setValues] = useState<Record<string, unknown>>(INITIAL_SETTINGS);
  const [savedValues, setSavedValues] = useState<Record<string, unknown>>(INITIAL_SETTINGS);

  return (
    <section data-pattern-section="settings" className="flex flex-col">
      {/* This pattern renders the shared shell header itself (identical classes),
          so the page does not add a second, duplicate heading here. */}
      <SettingsSection
        title="Workspace settings"
        description="Review and edit related preferences with a clear saved state."
        fields={SETTINGS_FIELDS}
        values={values}
        onChange={(next) => setValues(next)}
        onSave={async (next) => {
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          setSavedValues(next);
        }}
        onReset={() => setValues(savedValues)}
        savedMessage="Settings saved."
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Process monitor                                                         */
/* -------------------------------------------------------------------------- */

const PROCESS_STAGES: ProcessMonitorStage[] = [
  { id: "prepare", label: "Prepare" },
  { id: "upload", label: "Upload" },
  { id: "process", label: "Process" },
  { id: "verify", label: "Verify" },
];

const TICKS_PER_STAGE = 4;
const TOTAL_TICKS = PROCESS_STAGES.length * TICKS_PER_STAGE;
const FAIL_TICK = 2 * TICKS_PER_STAGE;
const TICK_MS = 220;

function deriveStageStatus(
  status: ProcessMonitorStatus,
  activeIndex: number
): Record<string, ProcessMonitorStageStatus> {
  const map: Record<string, ProcessMonitorStageStatus> = {};
  PROCESS_STAGES.forEach((stage, index) => {
    if (status === "idle") {
      map[stage.id] = "pending";
    } else if (status === "completed") {
      map[stage.id] = "done";
    } else if (status === "cancelled") {
      map[stage.id] = index < activeIndex ? "done" : "skipped";
    } else if (status === "failed") {
      map[stage.id] = index < activeIndex ? "done" : index === activeIndex ? "failed" : "pending";
    } else {
      map[stage.id] = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
    }
  });
  return map;
}

function ProcessPatternSection() {
  const [status, setStatus] = useState<ProcessMonitorStatus>("idle");
  const [tick, setTick] = useState(0);
  const [failArmed, setFailArmed] = useState(false);

  const activeIndex = Math.min(
    Math.floor(tick / TICKS_PER_STAGE),
    PROCESS_STAGES.length - 1
  );

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      setTick((current) => Math.min(current + 1, TOTAL_TICKS));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "running") return;
    if (failArmed && tick >= FAIL_TICK) {
      setStatus("failed");
      return;
    }
    if (tick >= TOTAL_TICKS) {
      setStatus("completed");
    }
  }, [status, tick, failArmed]);

  const stageStatus = deriveStageStatus(status, activeIndex);
  const progress = status === "idle" ? 0 : Math.min(tick / TOTAL_TICKS, 1);

  const logLines = useMemo(() => {
    if (status === "idle") return [];
    const lines = ["Task started."];
    const startedCount = Math.min(
      Math.floor(tick / TICKS_PER_STAGE) + 1,
      PROCESS_STAGES.length
    );
    for (let index = 0; index < startedCount; index += 1) {
      lines.push(`Stage "${PROCESS_STAGES[index].label}" started.`);
    }
    if (status === "failed") lines.push(`Stage "${PROCESS_STAGES[activeIndex].label}" failed.`);
    if (status === "cancelled") lines.push("Task stopped by user.");
    if (status === "completed") lines.push("Task completed.");
    return lines;
  }, [status, tick, activeIndex]);

  function start() {
    setTick(0);
    setStatus("running");
  }

  return (
    <PatternSection
      id="process"
      title="Process monitor"
      description="Watch a multi-stage task advance, then cancel, fail, retry, or finish it."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {status === "idle" ? <Button onClick={start}>Start task</Button> : null}
          <Checkbox
            label="Simulate failure on the Process stage"
            checked={failArmed}
            onCheckedChange={setFailArmed}
            disabled={status === "running"}
          />
        </div>
        <ProcessMonitor
          title=""
          stages={PROCESS_STAGES}
          stageStatus={stageStatus}
          status={status}
          progress={progress}
          logLines={logLines}
          onCancel={() => setStatus("cancelled")}
          onRetry={() => {
            setFailArmed(false);
            setTick(0);
            setStatus("running");
          }}
          onDismiss={() => {
            setStatus("idle");
            setTick(0);
            setFailArmed(false);
          }}
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Resource explorer                                                       */
/* -------------------------------------------------------------------------- */

const INITIAL_RESOURCES: ResourceItem[] = [
  {
    id: "documents",
    label: "Documents",
    children: [
      { id: "drafts", label: "Drafts" },
      { id: "archive", label: "Archive" },
    ],
  },
  {
    id: "items",
    label: "Items",
    children: [
      { id: "item-01", label: "Item 01" },
      { id: "item-02", label: "Item 02" },
      { id: "item-03", label: "Item 03" },
    ],
  },
];

function renameNode(items: ResourceItem[], id: string, label: string): ResourceItem[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, label };
    if (item.children) return { ...item, children: renameNode(item.children, id, label) };
    return item;
  });
}

function removeNode(items: ResourceItem[], id: string): ResourceItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => (item.children ? { ...item, children: removeNode(item.children, id) } : item));
}

function insertNode(items: ResourceItem[], parentId: string | null, node: ResourceItem): ResourceItem[] {
  if (parentId === null) return [...items, node];
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children ?? []), node] };
    }
    if (item.children) return { ...item, children: insertNode(item.children, parentId, node) };
    return item;
  });
}

function reorderNode(
  items: ResourceItem[],
  id: string,
  direction: ResourceMoveDirection
): ResourceItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    const target =
      direction === "up"
        ? Math.max(0, index - 1)
        : direction === "down"
          ? Math.min(next.length, index + 1)
          : direction === "top"
            ? 0
            : next.length;
    next.splice(target, 0, moved);
    return next;
  }
  return items.map((item) =>
    item.children ? { ...item, children: reorderNode(item.children, id, direction) } : item
  );
}

function ResourcePatternSection() {
  const [items, setItems] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ResourceItem[][]>([]);
  const nextId = useRef(1);

  function commit(next: ResourceItem[]) {
    setHistory((stack) => [...stack, items]);
    setItems(next);
  }

  function handleUndo() {
    if (history.length === 0) return;
    setItems(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }

  return (
    <PatternSection
      id="resource"
      title="Resource explorer"
      description="Browse a small tree, rename items, reorder them without dragging, delete, and undo."
    >
      <ResourceExplorer
        aria-label="Items"
        items={items}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        onRename={(item, label) => setItems((current) => renameNode(current, item.id, label))}
        onMove={(item, direction) => commit(reorderNode(items, item.id, direction))}
        onDelete={(item) => {
          commit(removeNode(items, item.id));
          if (selectedId === item.id) setSelectedId(null);
        }}
        onCreate={(parentId) => {
          const count = nextId.current;
          nextId.current += 1;
          setItems((current) =>
            insertNode(current, parentId, { id: `new-${count}`, label: `New item ${count}` })
          );
        }}
        onUndo={handleUndo}
      />
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Data + details workspace                                                */
/* -------------------------------------------------------------------------- */

const WORKSPACE_COLUMNS: DataDetailsColumn[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "updated", header: "Updated", sortable: true },
];

const WORKSPACE_ROWS: DataDetailsRow[] = [
  { id: "item-01", name: "Item 01", status: "Active", updated: "2026-10-01" },
  { id: "item-02", name: "Item 02", status: "Archived", updated: "2026-09-18" },
  { id: "item-03", name: "Item 03", status: "Active", updated: "2026-10-12" },
  { id: "item-04", name: "Item 04", status: "Draft", updated: "2026-08-30" },
  { id: "item-05", name: "Item 05", status: "Active", updated: "2026-09-05" },
];

function WorkspacePatternSection() {
  const [sort, setSort] = useState<DataDetailsSort>({ key: "name", direction: "ascending" });
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const sortedRows = useMemo(() => {
    if (sort.direction === "none") return WORKSPACE_ROWS;
    const next = [...WORKSPACE_ROWS];
    next.sort((a, b) => {
      const comparison = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""));
      return sort.direction === "descending" ? -comparison : comparison;
    });
    return next;
  }, [sort]);

  return (
    <PatternSection
      id="workspace"
      title="Data and details workspace"
      description="Scan a sortable table, select a row, and inspect its details without losing context."
    >
      <div className="flex min-h-96 flex-col">
        <DataDetailsWorkspace
          className="flex-1"
          columns={WORKSPACE_COLUMNS}
          rows={sortedRows}
          sort={sort}
          onSortChange={(key) =>
            setSort((current) =>
              current.key === key && current.direction === "ascending"
                ? { key, direction: "descending" }
                : { key, direction: "ascending" }
            )
          }
          selectedId={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
          renderDetail={(row) => (
            <div className="flex flex-col gap-4">
              <h3 className="font-serif text-subheading font-normal tracking-heading text-foreground">
                {String(row.name)}
              </h3>
              <dl className="flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-foreground">{String(row.status)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="text-foreground">{String(row.updated)}</dd>
                </div>
              </dl>
              <div>
                <Button variant="outline" size="sm">
                  Open item
                </Button>
              </div>
            </div>
          )}
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Guided form                                                             */
/* -------------------------------------------------------------------------- */

const GUIDED_STEPS: GuidedFormStep[] = [
  { id: "details", label: "Details", description: "Name the item and choose a category." },
  { id: "preferences", label: "Preferences", description: "Choose a language and digest option." },
  { id: "review", label: "Review", description: "Confirm the values before submitting." },
];

const INITIAL_GUIDED_VALUES: Record<string, unknown> = {
  name: "",
  category: "",
  language: "",
  digest: true,
};

const GUIDED_CATEGORY_OPTIONS = [
  { value: "items", label: "Items" },
  { value: "documents", label: "Documents" },
  { value: "notes", label: "Notes" },
];

const GUIDED_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

/** Human-readable label for a stored option value (falls back to the raw value). */
function optionLabel(
  options: Array<{ value: string; label: string }>,
  value: string
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function validateGuided(stepId: string, values: Record<string, unknown>): GuidedFormError[] {
  const errors: GuidedFormError[] = [];
  if (stepId === "details") {
    if (asString(values.name).trim() === "") {
      errors.push({ fieldId: "guided-name", label: "Name", message: "Enter a name." });
    }
    if (asString(values.category) === "") {
      errors.push({ fieldId: "guided-category", label: "Category", message: "Choose a category." });
    }
  }
  if (stepId === "preferences") {
    if (asString(values.language) === "") {
      errors.push({ fieldId: "guided-language", label: "Language", message: "Choose a language." });
    }
  }
  return errors;
}

function GuidedFormPatternSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>(INITIAL_GUIDED_VALUES);

  return (
    <PatternSection
      id="guided"
      title="Guided form"
      description="Complete a three-step process with per-step validation and a resolvable submit."
    >
      <GuidedForm
        steps={GUIDED_STEPS}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        values={values}
        onChange={setValues}
        validate={validateGuided}
        onSubmit={async () => {
          await new Promise((resolve) => window.setTimeout(resolve, 300));
        }}
        renderStep={(step, api) => {
          if (step.id === "details") {
            return (
              <div className="flex flex-col gap-4">
                <Field
                  id="guided-name"
                  label="Name"
                  placeholder="Item name"
                  value={asString(api.values.name)}
                  onChange={(event) => api.setValue("name", event.target.value)}
                  error={api.errorFor("guided-name")}
                />
                <Select
                  id="guided-category"
                  label="Category"
                  placeholder="Choose a category"
                  options={GUIDED_CATEGORY_OPTIONS}
                  value={asString(api.values.category) === "" ? null : asString(api.values.category)}
                  onValueChange={(next) => api.setValue("category", next ?? "")}
                />
              </div>
            );
          }
          if (step.id === "preferences") {
            return (
              <div className="flex flex-col gap-4">
                <Select
                  id="guided-language"
                  label="Language"
                  placeholder="Choose a language"
                  options={GUIDED_LANGUAGE_OPTIONS}
                  value={asString(api.values.language) === "" ? null : asString(api.values.language)}
                  onValueChange={(next) => api.setValue("language", next ?? "")}
                />
                <Checkbox
                  label="Email digest"
                  description="Receive a summary of activity."
                  checked={Boolean(api.values.digest)}
                  onCheckedChange={(checked) => api.setValue("digest", checked)}
                />
              </div>
            );
          }
          return (
            <dl className="flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground">{asString(api.values.name) || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-foreground">
                  {asString(api.values.category) === ""
                    ? "—"
                    : optionLabel(GUIDED_CATEGORY_OPTIONS, asString(api.values.category))}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Language</dt>
                <dd className="text-foreground">
                  {asString(api.values.language) === ""
                    ? "—"
                    : optionLabel(GUIDED_LANGUAGE_OPTIONS, asString(api.values.language))}
                </dd>
              </div>
            </dl>
          );
        }}
      />
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Showcase page that renders the six reusable application patterns against
 * neutral, self-contained local state so each pattern's real user task can be
 * exercised end to end (including by keyboard-only users).
 *
 * Served from the built app at the `#/patterns` hash route.
 */
export function AppPatternsPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-16">
          <header className="flex flex-col gap-1">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground">
              Application patterns
            </h1>
            <p className="text-body text-muted-foreground">
              Six reusable patterns, each driven by neutral local data.
            </p>
          </header>

          <SearchPatternSection />
          <SettingsPatternSection />
          <ProcessPatternSection />
          <ResourcePatternSection />
          <WorkspacePatternSection />
          <GuidedFormPatternSection />
        </div>
      </div>
    </MotionConfig>
  );
}

export default AppPatternsPage;
