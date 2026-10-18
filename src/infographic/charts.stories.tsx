import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

import {
  buildInfographic,
  InfographicView,
  type ChartRecipe,
  type ChartSpec,
  type InfographicDiagnostic,
  type InfographicSource,
  type MissingPolicy,
} from "../infographic";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographic/Charts",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ILLUSTRATIVE =
  "Illustrative dataset for layout demonstration — not measured production data.";

function DiagnosticsNote({
  diagnostics,
}: {
  diagnostics: readonly InfographicDiagnostic[];
}) {
  if (diagnostics.length === 0) return null;
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const parts = [
    errors > 0 ? `${errors} error${errors === 1 ? "" : "s"}` : null,
    warnings > 0 ? `${warnings} warning${warnings === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <p className="text-caption text-muted-foreground">
      Layout diagnostics: {parts}.
      {warnings > 0 && errors === 0
        ? " Missing values follow the declared policy (gap or unknown), not zero, by design."
        : null}
    </p>
  );
}

function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label="Infographic preview — scroll horizontally to pan"
      className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-[320px]">{children}</div>
    </div>
  );
}

function chartSource(
  recipe: ChartRecipe,
  spec: ChartSpec & { missingPolicy?: MissingPolicy }
): InfographicSource {
  return {
    kind: "infographic-source",
    version: 1,
    id: `chart-recipe-${recipe}`,
    language: "en",
    title: `${recipe} chart`,
    subtitle: "Chart recipe",
    thesis: "A chart recipe turns a table of values into an honest encoding.",
    evidence: [{ id: "ev-chart", label: ILLUSTRATIVE }],
    sections: [
      {
        id: "question",
        kind: "text",
        heading: "The question",
        importance: "supporting",
        evidenceRefs: ["ev-chart"],
        summary: "What does the value distribution look like?",
        paragraphs: ["What does the value distribution look like?"],
      },
      {
        id: "plot",
        kind: "chart",
        heading: spec.axisLabels?.y ?? "Values",
        importance: "hero",
        evidenceRefs: ["ev-chart"],
        summary: `${recipe} chart over ${spec.categories.length} categories.`,
        chart: spec,
      },
      {
        id: "takeaway",
        kind: "text",
        heading: "Takeaway",
        importance: "supporting",
        evidenceRefs: ["ev-chart"],
        summary:
          "The encoding, units and missing-value policy are stated so the reader can decode the marks.",
        paragraphs: [
          "The encoding, units and missing-value policy are stated so the reader can decode the marks.",
        ],
      },
    ],
  };
}

function ChartCard({
  title,
  unit,
  policy,
  diagnostics,
  children,
}: {
  title: string;
  unit: string;
  policy?: string;
  diagnostics?: readonly InfographicDiagnostic[];
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-serif text-subheading font-normal tracking-subheading text-foreground break-words">
          {title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground">
            Unit: {unit}
          </span>
          {policy ? (
            <span className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground">
              {policy}
            </span>
          ) : null}
        </div>
      </div>
      <Surface>
        <div className="flex min-w-0 flex-col gap-3">
          {children}
          {diagnostics ? <DiagnosticsNote diagnostics={diagnostics} /> : null}
        </div>
      </Surface>
    </section>
  );
}

function useLayout(source: InfographicSource) {
  // `data-story` is the template built for exactly this source shape — a
  // question, one chart and a takeaway — and it is the only template that gives
  // the chart the largest region on the page. `editorial-overview` never
  // reserves its focal cell, so it silently drops the chart section.
  return useMemo(
    () =>
      buildInfographic(source, {
        template: "data-story",
        artDirection: "editorial",
        profile: "pinterest-vertical",
      }),
    [source]
  );
}

function PageHeader() {
  return (
    <header className="flex min-w-0 flex-col gap-1">
      <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
        Chart recipes
      </h1>
      <p className="max-w-prose text-body text-muted-foreground">
        Every recipe shares the same scale, axis and missing-value machinery;
        only the marks change.
      </p>
    </header>
  );
}

export const Bar: Story = {
  render: () => {
    const layout = useLayout(
      chartSource("bar", {
        recipe: "bar",
        categories: ["Q1", "Q2", "Q3", "Q4"],
        unit: "items",
        scale: { kind: "linear", zero: true },
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Quarter" },
        series: [
          {
            id: "s-bar",
            label: "Items processed",
            values: [120, 145, 132, 160],
          },
        ],
      })
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <ChartCard title="Bar chart" unit="items" diagnostics={layout.diagnostics}>
            <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          </ChartCard>
        </div>
      </div>
    );
  },
};

export const Line: Story = {
  render: () => {
    const layout = useLayout(
      chartSource("line", {
        recipe: "line",
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        unit: "ms",
        scale: { kind: "linear", zero: true },
        missingPolicy: "gap",
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Month" },
        series: [
          {
            id: "s-line",
            label: "Latency",
            values: [12, null, 19, 14, null, 22],
          },
        ],
      })
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <ChartCard
            title="Line chart"
            unit="ms"
            policy="Missing values: shown as gaps"
            diagnostics={layout.diagnostics}
          >
            <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          </ChartCard>
        </div>
      </div>
    );
  },
};

export const Area: Story = {
  render: () => {
    const layout = useLayout(
      chartSource("area", {
        recipe: "area",
        categories: ["W1", "W2", "W3", "W4"],
        unit: "ms",
        scale: { kind: "linear", zero: true },
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Week" },
        series: [
          {
            id: "s-area",
            label: "Median lookup",
            values: [240, 180, 122, 61],
          },
        ],
      })
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <ChartCard title="Area chart" unit="ms" diagnostics={layout.diagnostics}>
            <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          </ChartCard>
        </div>
      </div>
    );
  },
};

export const Donut: Story = {
  render: () => {
    const layout = useLayout(
      chartSource("donut", {
        recipe: "donut",
        categories: ["Direct", "Search", "Social", "Email"],
        unit: "%",
        scale: { kind: "linear", zero: true },
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Channel" },
        series: [
          {
            id: "s-donut",
            label: "Share",
            values: [35, 40, 15, 10],
          },
        ],
      })
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <ChartCard title="Donut chart" unit="percent" diagnostics={layout.diagnostics}>
            <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          </ChartCard>
        </div>
      </div>
    );
  },
};

export const Scatter: Story = {
  render: () => {
    const layout = useLayout(
      chartSource("scatter", {
        recipe: "scatter",
        categories: ["A", "B", "C", "D", "E"],
        unit: "ms",
        scale: { kind: "linear", zero: false },
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Bucket" },
        series: [
          {
            id: "s-scatter",
            label: "Latency",
            values: [12, 45, 23, 56, 34],
          },
        ],
      })
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <ChartCard title="Scatter plot" unit="ms" diagnostics={layout.diagnostics}>
            <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          </ChartCard>
        </div>
      </div>
    );
  },
};

export const Heatmap: Story = {
  render: () => {
    const layout = useLayout(
      chartSource("heatmap", {
        recipe: "heatmap",
        categories: ["W1", "W2", "W3", "W4"],
        unit: "score",
        scale: { kind: "linear", zero: false },
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Week" },
        series: [
          {
            id: "s-heat-a",
            label: "North",
            values: [0.4, 0.6, 0.55, 0.7],
          },
          {
            id: "s-heat-b",
            label: "South",
            values: [0.2, 0.35, 0.3, 0.5],
          },
        ],
      })
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <ChartCard title="Heatmap" unit="score" diagnostics={layout.diagnostics}>
            <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          </ChartCard>
        </div>
      </div>
    );
  },
};
