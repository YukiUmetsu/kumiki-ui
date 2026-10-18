import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

import {
  buildInfographic,
  InfographicView,
  type InfographicSource,
} from "../infographic";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographic/Illustration",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const EVIDENCE = [{ id: "ev", label: "Illustrative fixture" }] as const;

const DIAGRAM_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "illustrated-diagram",
  language: "en",
  title: "Request layers",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "layers",
      kind: "diagram",
      heading: "Layered dependencies",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "A request crosses entry, boundary, service and store layers.",
      diagram: {
        direction: "horizontal",
        nodes: [
          { id: "client", label: "Client", group: "entry", importance: "hero" },
          { id: "boundary", label: "Request boundary", group: "boundary", importance: "hero" },
          { id: "service", label: "Service", group: "service" },
          { id: "store", label: "Store", group: "store" },
        ],
        edges: [
          { id: "e1", from: "client", to: "boundary" },
          { id: "e2", from: "boundary", to: "service" },
          { id: "e3", from: "service", to: "store" },
        ],
      },
    },
  ],
};

const STATISTIC_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "illustrated-statistic",
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

const COMPARISON_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "illustrated-comparison",
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
  id: "illustrated-quote",
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

function DiagnosticsNote({
  diagnostics,
}: {
  diagnostics: readonly { severity: string; message: string }[];
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

function ShowcaseCard({
  title,
  description,
  why,
  layout,
}: {
  title: string;
  description: string;
  why: string;
  layout: ReturnType<typeof buildInfographic>;
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
        <p className="max-w-prose text-body-sm text-muted-foreground">{why}</p>
      </div>
      <Surface>
        <div className="flex min-w-0 flex-col gap-3">
          <Preview>
            <InfographicView layout={layout} fit="contain" />
          </Preview>
          <DiagnosticsNote diagnostics={layout.diagnostics} />
        </div>
      </Surface>
    </section>
  );
}

export const IllustratedRecipe: Story = {
  render: () => {
    const diagramLayout = useMemo(
      () =>
        buildInfographic(DIAGRAM_SOURCE, {
          template: "layered-architecture",
          artDirection: "illustrated",
          profile: "youtube-landscape",
          orientation: "horizontal",
        }),
      []
    );

    const statisticLayout = useMemo(
      () =>
        buildInfographic(STATISTIC_SOURCE, {
          template: "editorial-overview",
          artDirection: "illustrated",
          profile: "social-square",
        }),
      []
    );

    const comparisonLayout = useMemo(
      () =>
        buildInfographic(COMPARISON_SOURCE, {
          template: "editorial-overview",
          artDirection: "illustrated",
          profile: "social-square",
        }),
      []
    );

    const quoteLayout = useMemo(
      () =>
        buildInfographic(QUOTE_SOURCE, {
          template: "editorial-overview",
          artDirection: "illustrated",
          profile: "social-square",
        }),
      []
    );

    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <header className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
              Illustrated art direction
            </h1>
            <p className="max-w-prose text-body text-muted-foreground">
              “Illustration” here is not a proprietary asset bundle. It is a
              tokenized art-direction recipe — color, type, spacing, rounded
              panels and connector curves — that the engine applies to the same
              semantic source.
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 auto-rows-min">
            <ShowcaseCard
              title="Layered diagram"
              description="The same directed graph drawn with the illustrated recipe's warm palette and curved connectors."
              why="Rounded panels and a green accent make the dependency layers feel friendly without changing the structure."
              layout={diagramLayout}
            />
            <ShowcaseCard
              title="Hero statistic"
              description="A single number rendered as the lead element on a compact square canvas."
              why="The illustrated direction uses filled accent blocks and generous rounding so the figure stays approachable without wasting space."
              layout={statisticLayout}
            />
            <ShowcaseCard
              title="Comparison"
              description="Side-by-side cases with synchronized rows on a square canvas."
              why="Consistent panel shapes keep the two cases comparable; emphasis is added through the recipe, not by changing data."
              layout={comparisonLayout}
            />
            <ShowcaseCard
              title="Pull quote"
              description="A governing rule rendered as a prose block with attribution on a square canvas."
              why="The recipe treats the quote as a focal panel, giving the words room while keeping attribution subordinate."
              layout={quoteLayout}
            />
          </div>
        </div>
      </div>
    );
  },
};
