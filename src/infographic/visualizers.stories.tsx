import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

import {
  buildInfographic,
  InfographicView,
  type InfographicSource,
} from "../infographic";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographic/Visualizers",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const EVIDENCE = [{ id: "ev", label: "Illustrative fixture" }] as const;

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

const TIMELINE_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "timeline-sample",
  language: "en",
  title: "Release milestones",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "milestones",
      kind: "timeline",
      heading: "Milestones",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "Three dated milestones over one quarter.",
      milestones: [
        {
          id: "m1",
          label: "Proposal",
          at: "2026-01-12",
          kind: "instant",
          description: "Problem statement and success measures agreed.",
        },
        {
          id: "m2",
          label: "Review",
          at: "2026-01-26",
          kind: "instant",
          description: "Risks and rollback path reviewed.",
        },
        {
          id: "m3",
          label: "General availability",
          at: "2026-03-30",
          kind: "instant",
        },
      ],
    },
  ],
};

const HIERARCHY_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "hierarchy-sample",
  language: "en",
  title: "Release decision hierarchy",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "tree",
      kind: "hierarchy",
      heading: "Who decides what",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "A rooted tree of approval gates and checks.",
      root: {
        id: "release",
        label: "Release",
        importance: "hero",
        children: [
          {
            id: "quality",
            label: "Quality gate",
            children: [
              { id: "tests", label: "Automated checks" },
              { id: "budget", label: "Error budget review" },
            ],
          },
          {
            id: "risk",
            label: "Risk gate",
            children: [
              { id: "rollback", label: "Rollback plan" },
              { id: "observability", label: "Observability check" },
            ],
          },
        ],
      },
    },
  ],
};

const DIAGRAM_SOURCE: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "diagram-sample",
  language: "en",
  title: "Layered system dependencies",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "layers",
      kind: "diagram",
      heading: "Layered dependencies",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "Horizontal dependency layers with allowed edges.",
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

export const ProcessFlow: Story = {
  render: () => {
    const layout = useMemo(
      () =>
        buildInfographic(PROCESS_SOURCE, {
          template: "process-journey",
          artDirection: "editorial",
          profile: "youtube-landscape",
        }),
      []
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <header className="flex min-w-0 flex-col gap-1">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
              Structure visualizers
            </h1>
            <p className="max-w-prose text-body text-muted-foreground">
              The same semantic relationships become different geometry
              depending on which structure they express.
            </p>
          </header>
          <ShowcaseCard
            title="Process flow"
            description="An ordered sequence with explicit next-step edges."
            why="A RAG pipeline is sequential: receive, embed, retrieve, construct, generate. The process flow makes order and repetition explicit."
            layout={layout}
          />
        </div>
      </div>
    );
  },
};

export const Timeline: Story = {
  render: () => {
    const layout = useMemo(
      () =>
        buildInfographic(TIMELINE_SOURCE, {
          template: "editorial-overview",
          artDirection: "editorial",
          profile: "pinterest-vertical",
        }),
      []
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <header className="flex min-w-0 flex-col gap-1">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
              Structure visualizers
            </h1>
            <p className="max-w-prose text-body text-muted-foreground">
              The same semantic relationships become different geometry
              depending on which structure they express.
            </p>
          </header>
          <ShowcaseCard
            title="Timeline"
            description="Dated milestones placed proportionally to time."
            why="Release planning has instant milestones. A timeline keeps duration honest instead of collapsing it to a single point."
            layout={layout}
          />
        </div>
      </div>
    );
  },
};

export const Hierarchy: Story = {
  render: () => {
    const layout = useMemo(
      () =>
        buildInfographic(HIERARCHY_SOURCE, {
          template: "layered-architecture",
          artDirection: "editorial",
          profile: "youtube-landscape",
          orientation: "vertical",
        }),
      []
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <header className="flex min-w-0 flex-col gap-1">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
              Structure visualizers
            </h1>
            <p className="max-w-prose text-body text-muted-foreground">
              The same semantic relationships become different geometry
              depending on which structure they express.
            </p>
          </header>
          <ShowcaseCard
            title="Hierarchy"
            description="A rooted tree with parent-child relationships and depth."
            why="Release authority is nested. A tree allocates width by leaf count so nothing overlaps, and depth is stated in words."
            layout={layout}
          />
        </div>
      </div>
    );
  },
};

export const Diagram: Story = {
  render: () => {
    const layout = useMemo(
      () =>
        buildInfographic(DIAGRAM_SOURCE, {
          template: "layered-architecture",
          artDirection: "scientific",
          profile: "youtube-landscape",
          orientation: "horizontal",
        }),
      []
    );
    return (
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <header className="flex min-w-0 flex-col gap-1">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
              Structure visualizers
            </h1>
            <p className="max-w-prose text-body text-muted-foreground">
              The same semantic relationships become different geometry
              depending on which structure they express.
            </p>
          </header>
          <ShowcaseCard
            title="Diagram"
            description="A directed graph with layered nodes and labelled edges."
            why="A layered system is a graph of allowed dependencies, not a sequence. The diagram lays nodes by dependency depth."
            layout={layout}
          />
        </div>
      </div>
    );
  },
};
