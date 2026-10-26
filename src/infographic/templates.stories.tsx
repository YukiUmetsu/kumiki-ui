import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";

import {
  buildInfographic,
  buildInfographicPages,
  InfographicView,
  TEMPLATE_INFO,
  type TemplateId,
} from "../infographic";
import {
  CHEAT_SHEET,
  LINKEDIN_CAROUSEL,
  PINTEREST_INFOGRAPHIC,
} from "../infographic/fixtures";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographics and charts/Templates", id: "infographic-templates",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const EVIDENCE = [{ id: "ev", label: "Illustrative fixture" }] as const;

const PROCESS_SOURCE: Parameters<typeof buildInfographic>[0] = {
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
        { id: "s5", title: "Generate", description: "Answer from the supplied passages." },
      ],
    },
  ],
};

const BENTO_SOURCE: Parameters<typeof buildInfographic>[0] = {
  kind: "infographic-source",
  version: 1,
  id: "bento-sample",
  language: "en",
  title: "Cache summary",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "hit",
      kind: "statistic",
      heading: "Hit rate",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "78% of lookups served from cache.",
      value: 78,
      unit: "%",
      measureLabel: "of lookups served from cache",
      denominator: 4_180_000,
      period: "Q1 2026",
      precision: 0,
    },
    {
      id: "lat",
      kind: "statistic",
      heading: "Median lookup",
      importance: "supporting",
      evidenceRefs: ["ev"],
      summary: "Median lookup latency fell to 61 ms.",
      value: 61,
      unit: "ms",
      measureLabel: "median lookup latency",
      period: "Q1 2026",
      baseline: 240,
      precision: 0,
    },
  ],
};

const DATA_STORY_SOURCE: Parameters<typeof buildInfographic>[0] = {
  kind: "infographic-source",
  version: 1,
  id: "data-story-sample",
  language: "en",
  title: "Channel share",
  evidence: [...EVIDENCE],
  sections: [
    {
      id: "q",
      kind: "text",
      heading: "Question",
      importance: "supporting",
      evidenceRefs: ["ev"],
      summary: "How is traffic distributed?",
      paragraphs: ["How is traffic distributed across channels?"],
    },
    {
      id: "c",
      kind: "chart",
      heading: "Share",
      importance: "hero",
      evidenceRefs: ["ev"],
      summary: "Donut chart of channel share.",
      chart: {
        recipe: "donut",
        categories: ["Direct", "Search", "Social", "Email"],
        unit: "%",
        scale: { kind: "linear", zero: true },
        axisLabels: { x: "Channel" },
        series: [{ id: "s", label: "Share", values: [35, 40, 15, 10] }],
      },
    },
    {
      id: "t",
      kind: "text",
      heading: "Takeaway",
      importance: "supporting",
      evidenceRefs: ["ev"],
      summary: "Search is the largest channel.",
      paragraphs: ["Search is the largest channel, followed by direct traffic."],
    },
  ],
};

const LAYERED_SOURCE: Parameters<typeof buildInfographic>[0] = {
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
          { id: "job", label: "Scheduled job", group: "entry" },
          { id: "boundary", label: "Request boundary", group: "boundary", importance: "hero" },
          { id: "query", label: "Query service", group: "service" },
          { id: "index", label: "Index service", group: "service" },
          { id: "store", label: "Object store", group: "store" },
          { id: "log", label: "Event log", group: "store" },
        ],
        edges: [
          { id: "e1", from: "client", to: "boundary" },
          { id: "e2", from: "job", to: "boundary" },
          { id: "e3", from: "boundary", to: "query" },
          { id: "e4", from: "boundary", to: "index" },
          { id: "e5", from: "query", to: "store" },
          { id: "e6", from: "index", to: "store" },
          { id: "e7", from: "index", to: "log", label: "appends" },
        ],
      },
    },
  ],
};

type BuildOptions = NonNullable<Parameters<typeof buildInfographic>[1]>;

const TEMPLATE_CASES: {
  template: TemplateId;
  label: string;
  source: Parameters<typeof buildInfographic>[0];
  artDirection: BuildOptions["artDirection"];
  profile: BuildOptions["profile"];
  orientation?: BuildOptions["orientation"];
}[] = [
  {
    template: "editorial-overview",
    label: "Cache shift poster",
    source: PINTEREST_INFOGRAPHIC,
    artDirection: "illustrated",
    profile: "pinterest-vertical",
  },
  {
    template: "bento-summary",
    label: "Two-metric summary",
    source: BENTO_SOURCE,
    artDirection: "editorial",
    profile: "pinterest-vertical",
  },
  {
    template: "process-journey",
    label: "RAG pipeline journey",
    source: PROCESS_SOURCE,
    artDirection: "editorial",
    profile: "youtube-landscape",
  },
  {
    template: "data-story",
    label: "Channel share story",
    source: DATA_STORY_SOURCE,
    artDirection: "editorial",
    profile: "pinterest-vertical",
  },
  {
    template: "educational-carousel",
    label: "Checkable answer carousel",
    source: LINKEDIN_CAROUSEL,
    artDirection: "editorial",
    profile: "social-portrait",
  },
  {
    template: "visual-cheat-sheet",
    label: "Grounding quick reference",
    source: CHEAT_SHEET,
    artDirection: "minimal-technical",
    profile: "pinterest-vertical",
  },
  {
    template: "layered-architecture",
    label: "Layered system diagram",
    source: LAYERED_SOURCE,
    artDirection: "scientific",
    profile: "youtube-landscape",
    orientation: "horizontal",
  },
];

function TemplateCard({
  template,
  source,
  artDirection,
  profile,
  orientation,
}: {
  template: TemplateId;
  source: Parameters<typeof buildInfographic>[0];
  artDirection: BuildOptions["artDirection"];
  profile: BuildOptions["profile"];
  orientation?: BuildOptions["orientation"];
}) {
  const info = TEMPLATE_INFO[template];
  const pages = useMemo(
    () =>
      buildInfographicPages(source, {
        template,
        artDirection,
        profile,
        orientation,
      }),
    [source, template, artDirection, profile, orientation]
  );
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-serif text-subheading font-normal tracking-subheading text-foreground break-words">
          {info.label}
        </h2>
        <p className="max-w-prose text-body-sm text-muted-foreground">
          {info.description}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground">
            {profile}
          </span>
          <span className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground">
            {pages.length} page{pages.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <Surface>
        <div className="flex min-w-0 flex-col gap-4">
          {pages.map((layout, index) => (
            <div
              key={`${template}-page-${index + 1}`}
              className="flex min-w-0 flex-col gap-2"
            >
              {pages.length > 1 ? (
                <p className="text-caption text-muted-foreground">
                  Page {index + 1} of {pages.length}
                </p>
              ) : null}
              <div
                role="group"
                tabIndex={0}
                aria-label="Infographic preview — scroll horizontally to pan"
                className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-[320px]">
                  <InfographicView layout={layout} fit="contain" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </section>
  );
}

export const Catalog: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex min-w-0 flex-col gap-1">
          <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
            Template catalog
          </h1>
          <p className="max-w-prose text-body text-muted-foreground">
            Every template matched with a source whose shape suits it. Each card
            shows the resolved page count for the chosen output profile.
          </p>
        </header>
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 auto-rows-min">
          {TEMPLATE_CASES.map((item) => (
            <TemplateCard
              key={item.template}
              template={item.template}
              source={item.source}
              artDirection={item.artDirection}
              profile={item.profile}
              orientation={item.orientation}
            />
          ))}
        </div>
      </div>
    </div>
  ),
};
