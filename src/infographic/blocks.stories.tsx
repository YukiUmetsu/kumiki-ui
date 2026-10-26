import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

import {
  buildInfographic,
  InfographicView,
  type InfographicDiagnostic,
  type InfographicSource,
} from "../infographic";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographics and charts/Blocks", id: "infographic-blocks",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const EVIDENCE = [{ id: "ev", label: "Illustrative fixture" }] as const;

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
        ? " Missing values are rendered as unknown, not zero, by design."
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

const METRIC_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "metric-sample",
  language: "en",
  title: "Cache hit rate",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "stat",
      kind: "statistic",
      heading: "Cache hit rate",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "78% of lookups served from cache.",
      value: 78,
      unit: "%",
      measureLabel: "of lookups served from cache",
      denominator: 4_180_000,
      period: "Q1 2026",
      baseline: 62,
      precision: 0,
    },
  ],
};

const PROCESS_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "process-sample",
  language: "en",
  title: "RAG pipeline",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "pipeline",
      kind: "process",
      heading: "The pipeline",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "Five steps from question to grounded answer.",
      layout: "linear",
      steps: [
        {
          id: "s1",
          title: "Receive",
          description: "Keep the question verbatim for the answer.",
          nextIds: ["s2"],
        },
        {
          id: "s2",
          title: "Embed",
          description: "Match the question against an index.",
          nextIds: ["s3"],
        },
        {
          id: "s3",
          title: "Retrieve",
          description: "Rank and deduplicate candidate passages.",
          nextIds: ["s4"],
        },
        {
          id: "s4",
          title: "Construct",
          description: "Pack passages into a bounded context window.",
          nextIds: ["s5"],
        },
        {
          id: "s5",
          title: "Generate",
          description: "Answer from the supplied passages.",
        },
      ],
    },
  ],
};

const COMPARISON_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "comparison-sample",
  language: "en",
  title: "Two ways to answer",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "compare",
      kind: "comparison",
      heading: "Two ways to answer",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "Retrieval changes where the words come from.",
      criteria: ["Grounding", "Citations", "Freshness"],
      cases: [
        {
          id: "rag",
          label: "Retrieval",
          emphasis: true,
          values: {
            Grounding: "Passages",
            Citations: "Passage-level",
            Freshness: "Index dependent",
          },
        },
        {
          id: "memory",
          label: "Memory only",
          values: {
            Grounding: "Parametric",
            Citations: null,
            Freshness: "Training cutoff",
          },
        },
      ],
    },
  ],
};

const QUOTE_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "quote-sample",
  language: "en",
  title: "Governing rule",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "quote",
      kind: "quote",
      heading: "Governing rule",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "A layer may call the layer below it.",
      data: {
        quote:
          "A layer may call the layer below it, never the one beside it.",
        attribution: "Architecture decision record",
        attributionPlacement: "below",
      },
    },
  ],
};

function BlockCard({
  title,
  description,
  diagnostics,
  children,
}: {
  title: string;
  description: string;
  diagnostics?: readonly InfographicDiagnostic[];
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-serif text-subheading font-normal tracking-subheading text-foreground break-words">
          {title}
        </h2>
        <p className="max-w-prose text-body text-muted-foreground">
          {description}
        </p>
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

function useLayout(
  source: InfographicSource,
  options: Parameters<typeof buildInfographic>[1]
) {
  return useMemo(() => buildInfographic(source, options), [source, options]);
}

function PageHeader() {
  return (
    <header className="flex min-w-0 flex-col gap-1">
      <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
        Information blocks
      </h1>
      <p className="max-w-prose text-body text-muted-foreground">
        Reusable content blocks that templates compose into different layouts
        without changing their reading order.
      </p>
    </header>
  );
}

export const MetricCard: Story = {
  render: () => {
    const layout = useLayout(METRIC_SOURCE, {
      template: "editorial-overview",
      artDirection: "editorial",
      profile: "social-square",
    });
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <BlockCard
            title="Metric card"
            description="A single measurement with its unit, denominator, period and change against a baseline."
            diagnostics={layout.diagnostics}
          >
            <Preview>
              <InfographicView layout={layout} fit="contain" />
            </Preview>
          </BlockCard>
        </div>
      </div>
    );
  },
};

export const NumberedStep: Story = {
  render: () => {
    const layout = useLayout(PROCESS_SOURCE, {
      template: "process-journey",
      artDirection: "editorial",
      profile: "youtube-landscape",
    });
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <BlockCard
            title="Numbered step"
            description="A step with an explicit index, total and state, used by process flows and ordered sequences."
            diagnostics={layout.diagnostics}
          >
            <Preview>
              <InfographicView layout={layout} fit="contain" />
            </Preview>
          </BlockCard>
        </div>
      </div>
    );
  },
};

export const ComparisonColumn: Story = {
  render: () => {
    const layout = useLayout(COMPARISON_SOURCE, {
      template: "editorial-overview",
      artDirection: "editorial",
      profile: "social-square",
    });
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <BlockCard
            title="Comparison column"
            description="Side-by-side cases with synchronized rows, so each dimension reads horizontally."
            diagnostics={layout.diagnostics}
          >
            <Preview>
              <InfographicView layout={layout} fit="contain" />
            </Preview>
          </BlockCard>
        </div>
      </div>
    );
  },
};

export const Quote: Story = {
  render: () => {
    const layout = useLayout(QUOTE_SOURCE, {
      template: "editorial-overview",
      artDirection: "editorial",
      profile: "pinterest-vertical",
    });
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <PageHeader />
          <BlockCard
            title="Quote"
            description="A pull quote with configurable attribution placement, rendered as a prose block."
            diagnostics={layout.diagnostics}
          >
            <Preview>
              <InfographicView layout={layout} fit="contain" />
            </Preview>
          </BlockCard>
        </div>
      </div>
    );
  },
};
