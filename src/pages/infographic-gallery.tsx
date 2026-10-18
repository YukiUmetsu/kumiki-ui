import type { ReactNode } from "react";
import { useMemo } from "react";
import { MotionConfig } from "motion/react";

import { InfographicView } from "../infographic/react";
import { buildInfographic, buildInfographicPages } from "../infographic/layout";
import { layoutToDataUri } from "../infographic/svg";
import type {
  ArtDirectionId,
  InfographicDiagnostic,
  OutputProfileId,
  TemplateId,
} from "../infographic";
import { ART_DIRECTIONS, OUTPUT_PROFILES, TEMPLATE_INFO } from "../infographic";
import {
  CHEAT_SHEET,
  FIXTURE_SOURCES,
  GALLERY_ART_DIRECTIONS,
  GALLERY_PROFILES,
  LINKEDIN_CAROUSEL,
  PHASE2_EXAMPLES,
} from "../infographic/fixtures";
import { Alert } from "../ui/alert";
import { Surface } from "../ui/surface-card";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Section shell header: serif heading + muted description. */
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
    <section data-pattern-section={id} className="flex min-w-0 flex-col">
      <header className="mb-10 flex min-w-0 flex-col gap-2">
        <h2 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
          {title}
        </h2>
        <p className="max-w-prose font-sans text-body text-muted-foreground">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

/** A small, neutral metadata chip. */
function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-control border border-border bg-surface px-2 py-1 text-body-sm text-foreground">
      {children}
    </span>
  );
}

/** Consistent figure wrapper for every infographic preview. */
function Figure({
  caption,
  children,
  className,
}: {
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={["flex min-w-0 flex-col gap-2", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="overflow-hidden rounded-control border border-border bg-surface-subtle p-2">
        {children}
      </div>
      {caption ? (
        <figcaption className="text-body-sm text-muted-foreground break-words">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Unique section ids named by a set of diagnostics, in reporting order. */
function sectionIdsOf(
  diagnostics: readonly InfographicDiagnostic[]
): string[] {
  return [
    ...new Set(
      diagnostics
        .map((diagnostic) => diagnostic.sectionId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
}

/** Readable, bounded list of section ids so the note stays scannable. */
function listIds(ids: readonly string[]): string {
  const shown = ids.slice(0, 4);
  const rest = ids.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
}

/**
 * Surface diagnostics as a real message, never as helper copy: a layout that
 * reports errors is not a usable render, so the counts are stated, the sections
 * that overran their frame are named, and severity uses the shared alert
 * treatment (shape-distinct icon, accent rule and text) rather than colour alone.
 */
function DiagnosticsNote({
  diagnostics,
}: {
  diagnostics: readonly InfographicDiagnostic[];
}) {
  if (diagnostics.length === 0) return null;

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const counts = [
    errors.length > 0
      ? `${errors.length} error${errors.length === 1 ? "" : "s"}`
      : null,
    warnings.length > 0
      ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const failed = sectionIdsOf(errors);

  return (
    <Alert
      variant={errors.length > 0 ? "danger" : "warning"}
      title={`Layout diagnostics: ${counts}.`}
    >
      {failed.length > 0
        ? `Sections over budget: ${listIds(failed)}.`
        : null}
    </Alert>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Overview                                                                */
/* -------------------------------------------------------------------------- */

const OVERVIEW_TEMPLATES: readonly TemplateId[] = [
  "educational-carousel",
  "editorial-overview",
  "visual-cheat-sheet",
  "layered-architecture",
];

function OverviewSection() {
  return (
    <PatternSection
      id="overview"
      title="Overview"
      description="Semantic source → layout → preview. The same facts become different compositions depending on the template, art direction and output profile."
    >
      <div className="flex min-w-0 flex-col gap-6">
        <p className="max-w-prose text-body text-foreground">
          The infographic pipeline starts with a validated semantic document,
          chooses a template that matches its content shape, resolves the art
          direction and output profile, and only then produces geometry. The
          preview below is the exact same data structure the static exporter
          writes to SVG, so the screen and the file cannot drift.
        </p>

        <div className="flex flex-wrap gap-2">
          {OVERVIEW_TEMPLATES.map((template) => (
            <MetaChip key={template}>
              {TEMPLATE_INFO[template].label}
            </MetaChip>
          ))}
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Examples                                                                */
/* -------------------------------------------------------------------------- */

function ExamplesSection() {
  const examples = useMemo(
    () =>
      PHASE2_EXAMPLES.map((example) => ({
        ...example,
        pages: buildInfographicPages(example.source, {
          template: example.template,
          artDirection: example.artDirection,
          profile: example.output,
        }),
      })),
    []
  );

  return (
    <PatternSection
      id="examples"
      title="Examples"
      description="Four complete phase-two specimens, each built from its semantic source through a chosen template, art direction and output profile."
    >
      <div className="flex min-w-0 flex-col gap-8">
        {examples.map((example) => (
          <Surface
            key={example.id}
            header={
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
                  {example.label}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <MetaChip>{TEMPLATE_INFO[example.template].label}</MetaChip>
                  <MetaChip>{ART_DIRECTIONS[example.artDirection].name}</MetaChip>
                  <MetaChip>{OUTPUT_PROFILES[example.output].label}</MetaChip>
                  <MetaChip>
                    {example.pages.length} page
                    {example.pages.length === 1 ? "" : "s"}
                  </MetaChip>
                </div>
              </div>
            }
            className="min-w-0"
          >
            <div className="flex min-w-0 flex-col gap-5">
              {example.note ? (
                <p className="text-body text-muted-foreground">
                  {example.note}
                </p>
              ) : null}

              <DiagnosticsNote
                diagnostics={example.pages.flatMap((page) => page.diagnostics)}
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {example.pages.map((layout, index) => (
                  <Figure
                    key={`${example.id}-page-${index + 1}`}
                    caption={
                      example.pages.length > 1
                        ? `Page ${index + 1} of ${example.pages.length}`
                        : undefined
                    }
                  >
                    <InfographicView layout={layout} fit="contain" />
                  </Figure>
                ))}
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Art directions                                                          */
/* -------------------------------------------------------------------------- */

function ArtDirectionsSection() {
  const source = LINKEDIN_CAROUSEL;
  const profile: OutputProfileId = "social-portrait";

  const layouts = useMemo(
    () =>
      GALLERY_ART_DIRECTIONS.map((artDirection) => ({
        artDirection,
        layout: buildInfographic(source, { artDirection, profile }),
      })),
    [source, profile]
  );

  return (
    <PatternSection
      id="art-directions"
      title="Art directions"
      description="The same source and output profile rendered through every art direction. Only the visual recipe changes; the facts and their structure stay the same."
    >
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {layouts.map(({ artDirection, layout }) => (
          <Surface
            key={artDirection}
            header={
              <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
                {ART_DIRECTIONS[artDirection].name}
              </h3>
            }
            className="min-w-0"
          >
            <div className="flex min-w-0 flex-col gap-4">
              <p className="text-body-sm text-muted-foreground">
                {OUTPUT_PROFILES[profile].label}
              </p>
              <Figure>
                <InfographicView layout={layout} fit="contain" />
              </Figure>
              <DiagnosticsNote diagnostics={layout.diagnostics} />
            </div>
          </Surface>
        ))}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Output profiles                                                         */
/* -------------------------------------------------------------------------- */

function OutputProfilesSection() {
  const source = CHEAT_SHEET;
  const artDirection: ArtDirectionId = "editorial";
  const template: TemplateId = "visual-cheat-sheet";

  const layouts = useMemo(
    () =>
      GALLERY_PROFILES.map((profile) => ({
        profile,
        pages: buildInfographicPages(source, {
          template,
          artDirection,
          profile,
        }),
      })).filter(({ pages }) => pages.length > 0),
    [source]
  );

  return (
    <PatternSection
      id="output-profiles"
      title="Output profiles"
      description="Aspect ratio is resolved, not scaled: the same source is re-laid out for each target canvas instead of being stretched to fit."
    >
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {layouts.map(({ profile, pages }) => {
          const layout = pages[0];
          if (!layout) return null;

          const { width, height } = OUTPUT_PROFILES[profile];
          return (
            <Surface
              key={profile}
              header={
                <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
                  {OUTPUT_PROFILES[profile].label}
                </h3>
              }
              className="min-w-0"
            >
              <div className="flex min-w-0 flex-col gap-4">
                <p className="text-body-sm text-muted-foreground">
                  {width} × {height} px · {pages.length} page
                  {pages.length === 1 ? "" : "s"}
                </p>
                <Figure>
                  <InfographicView layout={layout} fit="contain" />
                </Figure>
                <DiagnosticsNote diagnostics={layout.diagnostics} />
              </div>
            </Surface>
          );
        })}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Export                                                                  */
/* -------------------------------------------------------------------------- */

function ExportSection() {
  const layout = useMemo(
    () =>
      buildInfographic(FIXTURE_SOURCES[0], {
        template: "editorial-overview",
        artDirection: "editorial",
        profile: "youtube-landscape",
      }),
    []
  );
  const dataUri = useMemo(() => layoutToDataUri(layout), [layout]);

  return (
    <PatternSection
      id="export"
      title="Static export"
      description="The preview and the exported SVG share one layout object, so what you see is what you ship."
    >
      <div className="flex min-w-0 flex-col gap-5">
        <Figure
          caption={
            <>
              Exported through{" "}
              <code className="text-caption">layoutToDataUri</code>. The file
              contains the same primitives, IDs and accessible text as the live
              previews above.
            </>
          }
        >
          <img
            src={dataUri}
            alt={`Static SVG export of ${
              layout.metadata?.title ?? layout.sourceId
            }`}
            className="w-full max-w-full"
          />
        </Figure>

        <DiagnosticsNote diagnostics={layout.diagnostics} />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Showcase page that exercises the infographic system end to end: semantic
 * sources, template selection, art directions, output profiles and static SVG
 * export.
 */
export function InfographicGalleryPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-20">
          <header className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
              Infographic gallery
            </h1>
            <p className="max-w-prose text-body text-muted-foreground">
              Showcase of the infographic system: semantic sources, templates,
              art directions, output profiles and static export.
            </p>
          </header>

          <OverviewSection />
          <ExamplesSection />
          <ArtDirectionsSection />
          <OutputProfilesSection />
          <ExportSection />
        </div>
      </div>
    </MotionConfig>
  );
}

export default InfographicGalleryPage;
