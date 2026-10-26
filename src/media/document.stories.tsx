import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Diagnostic } from "./document";
import {
  countBySeverity,
  documentHash,
  parseDocument,
  serializeDocument,
  validateDocument,
} from "./document";
import { NEGATIVE_FIXTURES, wideHeroDocument } from "./fixtures";

/**
 * The document model is data, not a component, so these stories render *the
 * model*: the stable JSON that backs every preview/export, and the diagnostics
 * `validateDocument` produces. That is how the "serializable, validated
 * document" claim becomes visible in Storybook instead of being asserted only in
 * a unit test.
 */
const meta = {
  title: "Media design surfaces/Document", id: "media-document",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-surface border border-border bg-surface px-3 py-2">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="font-mono text-body-sm text-foreground">{value}</dd>
    </div>
  );
}

function DiagnosticList({ diagnostics }: { diagnostics: readonly Diagnostic[] }) {
  if (diagnostics.length === 0) {
    return (
      <p data-km-doc="valid" className="text-body-sm text-muted-foreground">
        No diagnostics — this document passes every validator.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {diagnostics.map((diagnostic, index) => (
        <li
          key={`${index}-${diagnostic.code}`}
          data-severity={diagnostic.severity}
          className="rounded-r-surface border-l-2 border-border bg-surface px-3 py-2 text-body-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{diagnostic.severity}</span>
            <code className="font-mono text-caption text-muted-foreground">{diagnostic.code}</code>
          </div>
          <p className="text-muted-foreground">{diagnostic.message}</p>
        </li>
      ))}
    </ul>
  );
}

export const Serialized: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-heading-sm font-medium">Serializable document</h1>
          <p className="text-body-sm text-muted-foreground">
            Every composition is plain, versioned data.{" "}
            <code className="font-mono">serializeDocument</code> writes stable JSON: the same bytes back
            the live preview, the export and the saved file, so they cannot drift.
          </p>
        </header>
        <p className="text-caption text-muted-foreground">
          wide-hero · fingerprint <span className="font-mono">{documentHash(wideHeroDocument)}</span>
        </p>
        <pre
          data-km-doc="json"
          className="max-h-[70vh] overflow-auto rounded-surface border border-border bg-surface p-4 font-mono text-caption text-foreground"
        >
          {serializeDocument(wideHeroDocument, 2)}
        </pre>
      </div>
    </div>
  ),
};

export const RoundTrip: Story = {
  render: () => {
    const json = serializeDocument(wideHeroDocument, 0);
    const parsed = parseDocument(json);

    return (
      <div className="min-h-screen bg-canvas p-6 text-foreground">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-heading-sm font-medium">Round-trip</h1>
            <p className="text-body-sm text-muted-foreground">
              The serialized bytes parse back into a validated document, so save/reload cannot diverge
              from the composition on screen.
            </p>
          </header>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Serialized bytes" value={String(json.length)} />
            <Stat label="Parsed id" value={parsed.document?.id ?? "—"} />
            <Stat label="Parse diagnostics" value={String(parsed.diagnostics.length)} />
            <Stat label="Fingerprint" value={documentHash(wideHeroDocument)} />
          </dl>
          <pre
            data-km-doc="round-trip"
            className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-surface border border-border bg-surface p-4 font-mono text-caption text-foreground"
          >
            {json}
          </pre>
        </div>
      </div>
    );
  },
};

export const ValidationReport: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-heading-sm font-medium">validateDocument</h1>
          <p className="text-body-sm text-muted-foreground">
            Validation is a pure function of the data. Each fixture below names the diagnostics it must
            produce, so a detector can never silently stop working.
          </p>
        </header>
        <section className="flex flex-col gap-2">
          <h2 className="text-body-sm font-medium">wide-hero — valid</h2>
          <DiagnosticList diagnostics={validateDocument(wideHeroDocument)} />
        </section>
        {NEGATIVE_FIXTURES.map((fixture) => {
          const diagnostics = validateDocument(fixture.document);
          const { errors, warnings } = countBySeverity(diagnostics);
          return (
            <section key={fixture.id} className="flex flex-col gap-2">
              <h2 className="text-body-sm font-medium">{fixture.label}</h2>
              <p className="text-caption text-muted-foreground">
                {errors} error{errors === 1 ? "" : "s"} · {warnings} warning
                {warnings === 1 ? "" : "s"} · expected codes: {fixture.expectedCodes.join(", ")}
              </p>
              <DiagnosticList diagnostics={diagnostics} />
            </section>
          );
        })}
      </div>
    </div>
  ),
};
